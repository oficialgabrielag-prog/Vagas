import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper para registrar e depurar erros de pagamento persistentes
function logPayPalError(action: string, error: any) {
  const timestamp = new Date().toISOString();
  const errMsg = error.stack || error.message || error;
  const message = `[${timestamp}] [${action}] ${errMsg}\n`;
  try {
    fs.appendFileSync(path.join(__dirname, 'paypal_error.log'), message);
  } catch (err) {
    console.error('Falha ao escrever no log de erros:', err);
  }
  console.error(message);
}

// Initialize Supabase Admin client for backend operations
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gdjyrgufdjboqkusredk.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseAnonKey) {
  console.error("ERRO: VITE_SUPABASE_ANON_KEY não foi configurada.");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// PayPal Configuration
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || ''; 
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_ENVIRONMENT = process.env.PAYPAL_ENVIRONMENT || 'sandbox'; // sandbox or live
const PAYPAL_CURRENCY = process.env.PAYPAL_CURRENCY || 'USD';

const isLive = (PAYPAL_ENVIRONMENT || '').toLowerCase() === 'live';
const PAYPAL_API_URL = isLive 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

// Cache PayPal token to avoid fetching on every request
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getPayPalAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  
  try {
    const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    const debugId = response.headers.get('paypal-debug-id') || response.headers.get('PayPal-Debug-Id') || 'N/A';

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[PAYPAL DIAGNOSTIC] OAuth 2.0 Auth failed. Status: ${response.status}, Debug ID: ${debugId}, Payload: ${errText}`);
      throw new Error(`Falha de autenticação do PayPal (Status: ${response.status}, DebugID: ${debugId})`);
    }

    const data = await response.json();
    // Cache token and set expiration minus 60 seconds buffer
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000) - 60000
    };
    return data.access_token;
  } catch (error: any) {
    logPayPalError('getPayPalAccessToken', error);
    throw error;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Rota de configuração pública do PayPal (Injeta Client ID dinamicamente no frontend)
  app.get('/api/paypal/config', (req, res) => {
    res.json({
      clientId: PAYPAL_CLIENT_ID,
      environment: isLive ? 'live' : 'sandbox'
    });
  });

  // Supabase Auth Middleware to authenticate client JWT tokens
  const authenticateUser = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Acesso negado. Token de autenticação em falta.' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ error: 'Sessão inválida ou expirada. Por favor, inicie sessão novamente.' });
      }

      // Check if user exists and is an employer
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileErr || !profile) {
        return res.status(403).json({ error: 'Erro ao validar perfil do utilizador.' });
      }

      // Permitir que qualquer utilizador autenticado (seja 'employer' ou 'candidato') possa adquirir a licença
      req.user = user;
      next();
    } catch (err: any) {
      return res.status(500).json({ error: 'Erro de autenticação no servidor.' });
    }
  };

  // Endpoints PayPal
  app.post('/api/paypal/create-order', authenticateUser, async (req: any, res: any) => {
    const user = req.user;
    const { resourceType, planType } = req.body;

    if (resourceType !== 'marketplace_unlocked') {
      return res.status(400).json({ error: 'Recurso premium inválido.' });
    }

    // Calcular o preço correto e seguro no servidor
    let AMOUNT_USD = "8.00";
    let planLabel = "Trimestral (3 Meses)";
    if (planType === '6_months') {
      AMOUNT_USD = "15.00";
      planLabel = "Semestral (6 Meses)";
    } else if (planType === '12_months') {
      AMOUNT_USD = "30.00";
      planLabel = "Anual (1 Ano)";
    }

    try {
      // 1. Get employer company ID (or auto-create if missing)
      const { data: companies } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('user_id', user.id);

      let companyId = companies && companies.length > 0 ? companies[0].id : null;

      if (!companyId) {
        const { data: newComp } = await supabaseAdmin
          .from('companies')
          .insert({
            user_id: user.id,
            name: user.user_metadata?.company_name || 'Empresa',
            marketplace_unlocked: false
          })
          .select('id')
          .single();

        if (newComp) companyId = newComp.id;
      }

      // 2. Get PayPal Token
      const accessToken = await getPayPalAccessToken();

      // Idempotency support
      const idempotencyKey = `create-${user.id}-${Date.now()}`;

      // 3. Create PayPal Order
      const paypalRes = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': idempotencyKey
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: resourceType,
              amount: {
                currency_code: PAYPAL_CURRENCY,
                value: AMOUNT_USD
              },
              description: `Ativação de Recurso Premium: ${resourceType} - Plano ${planLabel}`
            }
          ]
        })
      });

      if (!paypalRes.ok) {
        const errText = await paypalRes.text();
        console.error('Erro na criação de Ordem do PayPal:', errText);
        return res.status(500).json({ error: `PayPal Order Creation error: ${errText}` });
      }

      const order = await paypalRes.json();

      // 4. Save transaction in Supabase as PENDING if companyId exists
      if (companyId) {
        const { error: insertErr } = await supabaseAdmin
          .from('payment_transactions')
          .insert({
            user_id: user.id,
            company_id: companyId,
            resource_type: resourceType,
            amount: parseFloat(AMOUNT_USD),
            currency: PAYPAL_CURRENCY,
            paypal_order_id: order.id,
            status: 'pending'
          });

        if (insertErr) {
          console.warn('Alerta: Não foi possível gravar o registo inicial da transação:', insertErr.message);
        }
      }

      return res.status(200).json({ orderId: order.id });
    } catch (error: any) {
      logPayPalError('create-order', error);
      return res.status(500).json({ error: error.message || 'Erro ao iniciar o pagamento com o PayPal.' });
    }
  });

  app.post('/api/paypal/capture-order', authenticateUser, async (req: any, res: any) => {
    const user = req.user;
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'ID do pedido do PayPal em falta.' });
    }

    try {
      // 1. Check if order was already captured/completed to prevent duplications (idempotency)
      const { data: existingTx, error: selectErr } = await supabaseAdmin
        .from('payment_transactions')
        .select('*')
        .eq('paypal_order_id', orderId)
        .maybeSingle();

      if (existingTx && existingTx.status === 'completed') {
        return res.status(200).json({ 
          success: true, 
          message: 'Transação já processada anteriormente.',
          transaction: existingTx
        });
      }

      // 2. Fetch PayPal Token
      const accessToken = await getPayPalAccessToken();

      // Idempotency key for Capture
      const idempotencyKey = `capture-${orderId}`;

      // 3. Request PayPal Capture
      const captureRes = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': idempotencyKey
        }
      });

      if (!captureRes.ok) {
        const errText = await captureRes.text();
        return res.status(500).json({ error: `PayPal Capture error: ${errText}` });
      }

      const captureData = await captureRes.json();

      if (captureData.status !== 'COMPLETED') {
        return res.status(400).json({ error: `O pagamento não foi totalmente aprovado no PayPal. Estado: ${captureData.status}` });
      }

      const captureUnit = captureData.purchase_units?.[0];
      const captureId = captureUnit?.payments?.captures?.[0]?.id || '';
      const amountPaid = captureUnit?.payments?.captures?.[0]?.amount?.value || '1.00';

      // 4. Update Company to have marketplace_unlocked = true
      const { data: updatedComps, error: companyErr } = await supabaseAdmin
        .from('companies')
        .update({ marketplace_unlocked: true })
        .eq('user_id', user.id)
        .select();

      if (companyErr) {
        console.error('Erro ao atualizar licença da empresa:', companyErr.message);
      } else if (!updatedComps || updatedComps.length === 0) {
        await supabaseAdmin
          .from('companies')
          .insert({
            user_id: user.id,
            name: user.user_metadata?.company_name || 'Empresa',
            marketplace_unlocked: true
          });
      }

      // 5. Update Payment Transaction in Supabase
      if (existingTx) {
        const { error: updateErr } = await supabaseAdmin
          .from('payment_transactions')
          .update({
            paypal_capture_id: captureId,
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('paypal_order_id', orderId);

        if (updateErr) console.warn('Erro ao atualizar estado da transação:', updateErr.message);
      } else {
        // Fallback insert if not exists
        const { data: company } = await supabaseAdmin
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .single();

        await supabaseAdmin
          .from('payment_transactions')
          .insert({
            user_id: user.id,
            company_id: company?.id || 'comp-' + user.id,
            resource_type: 'marketplace_unlocked',
            amount: parseFloat(amountPaid),
            currency: PAYPAL_CURRENCY,
            paypal_order_id: orderId,
            paypal_capture_id: captureId,
            status: 'completed'
          });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Pagamento processado com sucesso. Recurso ativado.',
        captureId
      });
    } catch (error: any) {
      console.error('Erro ao capturar transação PayPal:', error.message);
      return res.status(500).json({ error: 'Erro do servidor ao concluir o pagamento.' });
    }
  });

  // Endpoint de Webhook do PayPal
  app.post('/api/paypal/webhook', async (req: any, res: any) => {
    try {
      const event = req.body;
      console.log(`[PAYPAL WEBHOOK RECEBIDO] Evento: ${event?.event_type}`);

      if (event?.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
        const resource = event.resource;
        const orderId = resource.supplementary_data?.related_ids?.order_id;

        if (orderId) {
          console.log(`[PAYPAL WEBHOOK] Processando ativação para Ordem: ${orderId}`);

          // 1. Procurar transação
          const { data: tx } = await supabaseAdmin
            .from('payment_transactions')
            .select('*')
            .eq('paypal_order_id', orderId)
            .maybeSingle();

          if (tx && tx.status !== 'completed') {
            // 2. Atualizar transação
            await supabaseAdmin
              .from('payment_transactions')
              .update({ status: 'completed', paypal_capture_id: resource.id })
              .eq('paypal_order_id', orderId);

            // 3. Atualizar licença da empresa
            await supabaseAdmin
              .from('companies')
              .update({ marketplace_unlocked: true })
              .eq('id', tx.company_id);
            
            console.log(`[PAYPAL WEBHOOK] Ativação concluída com sucesso para empresa ${tx.company_id}`);
          }
        }
      }

      // Responder 200 OK para o PayPal
      return res.status(200).json({ received: true });
    } catch (err: any) {
      console.error('[PAYPAL WEBHOOK ERROR]', err.message);
      return res.status(200).json({ received: true }); // Sempre responder 200
    }
  });

  // Serve static assets and frontend router in production or mount dev Vite middleware
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);
    
    app.use('*', async (req: any, res: any, next: any) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: any, res: any) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`CuneneVagas Server listening on http://localhost:${port}`);
  });
}

startServer();
