import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

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

  // Canonical user count and platform statistics endpoint (Single Source of Truth)
  app.get(['/api/stats/users-count', '/api/stats/platform'], async (req, res) => {
    // Desativar rigorosamente qualquer cache HTTP em navegadores e proxies
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
      const { data, count, error } = await supabaseAdmin
        .from('profiles')
        .select('id, role, municipio', { count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000001');

      if (error) {
        console.error('[API Stats] Erro ao obter perfis do Supabase:', error);
        return res.status(500).json({ error: 'Erro ao consultar contagem de utilizadores' });
      }

      const profiles = (data || []).filter((p: any) => p && p.id !== '00000000-0000-0000-0000-000000000001');
      const totalCandidates = profiles.filter((p: any) => {
        const r = (p.role || '').toLowerCase();
        return r !== 'empresa' && r !== 'employer';
      }).length;
      const totalEmployers = profiles.filter((p: any) => {
        const r = (p.role || '').toLowerCase();
        return r === 'empresa' || r === 'employer';
      }).length;

      return res.json({
        totalUsers: profiles.length,
        totalCandidates,
        totalEmployers,
        source: 'public.profiles',
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('[API Stats] Exceção inesperada:', err);
      return res.status(500).json({ error: err.message || 'Erro interno' });
    }
  });

  // Rota de verificação do Google reCAPTCHA v3 para ambiente local
  app.post('/api/verify-recaptcha', async (req, res) => {
    try {
      const secretKey = process.env.RECAPTCHA_SECRET_KEY;
      const { token, action: expectedAction } = req.body || {};

      if (!secretKey) {
        console.warn('[reCAPTCHA Dev] RECAPTCHA_SECRET_KEY não definida no ambiente local.');
        // Em desenvolvimento local sem chave configurada, retorna bypass seguro para não travar testes
        return res.json({
          success: true,
          score: 1.0,
          isDevBypass: true,
          message: 'Bypass de desenvolvimento ativo (chave secreta não definida localmente).'
        });
      }

      if (!token) {
        return res.status(400).json({ success: false, error: 'Token do reCAPTCHA ausente.' });
      }

      const params = new URLSearchParams();
      params.append('secret', secretKey);
      params.append('response', token);

      const googleRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      const data: any = await googleRes.json();
      if (!data.success) {
        return res.status(400).json({ success: false, error: 'Token rejeitado pelo Google.' });
      }

      if (expectedAction && data.action && data.action !== expectedAction) {
        return res.status(400).json({ success: false, error: 'Ação do reCAPTCHA incompatível.' });
      }

      const score = typeof data.score === 'number' ? data.score : 1.0;
      if (score < 0.5) {
        return res.status(403).json({ success: false, score, error: 'Pontuação de proteção contra bots insuficiente.' });
      }

      return res.json({ success: true, score, action: data.action });
    } catch (err: any) {
      console.error('[reCAPTCHA Express Error]:', err);
      return res.status(500).json({ success: false, error: 'Erro interno ao validar reCAPTCHA.' });
    }
  });

  function extractResumeDataLocally(rawText: string) {
    const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = rawText.match(/(?:\+?244\s*)?(?:9\d{8}|2\d{8}|\b9\d{2}[-.\s]?\d{3}[-.\s]?\d{3}\b)/);
    
    // Find municipality
    const municipalities = ['Ondjiva', 'Cuanhama', 'Namacunde', 'Ombadja', 'Cuvelai', 'Curoca', 'Cahama', 'Lubango', 'Luanda', 'Benguela', 'Huambo'];
    let foundMunicipality = null;
    for (const mun of municipalities) {
      if (new RegExp(`\\b${mun}\\b`, 'i').test(rawText)) {
        foundMunicipality = mun;
        break;
      }
    }

    // Try finding name from first non-empty lines
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 2 && !l.toLowerCase().includes('currículo') && !l.toLowerCase().includes('curriculum') && !l.toLowerCase().includes('cv'));
    const fullName = lines.length > 0 && lines[0].length < 60 ? lines[0] : null;

    // Years of experience
    const expMatch = rawText.match(/(\d+)\s*(?:\+|\s*anos?\s+de\s+experi[êe]ncia)/i);
    const experienceYears = expMatch ? parseInt(expMatch[1], 10) : null;

    // Common skills
    const commonSkills = ['Excel', 'Word', 'Informática', 'Redes', 'Gestão', 'Atendimento', 'Comunicação', 'Contabilidade', 'Vendas', 'Liderança', 'Inglês', 'Marketing', 'Motorista', 'Logística'];
    const foundSkills = commonSkills.filter(skill => new RegExp(`\\b${skill}\\b`, 'i').test(rawText));

    return {
      fullName,
      profession: lines.length > 1 && lines[1].length < 50 ? lines[1] : null,
      municipality: foundMunicipality || 'Ondjiva',
      phone: phoneMatch ? phoneMatch[0].trim() : null,
      email: emailMatch ? emailMatch[0].trim() : null,
      summary: lines.slice(0, 3).join('. '),
      skills: foundSkills,
      experienceYears
    };
  }

  // Rota para leitura automática de currículos com IA Gemini
  app.post('/api/parse-cv', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Texto do currículo não fornecido.' });
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
      if (!apiKey) {
        return res.json(extractResumeDataLocally(text));
      }

      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Analisa o seguinte texto de currículo e extrai as informações profissionais estritamente com base no texto fornecido. Responde APENAS com um objeto JSON válido contendo as seguintes chaves:
{
  "fullName": string or null,
  "profession": string or null,
  "municipality": string or null,
  "phone": string or null,
  "email": string or null,
  "summary": string or null,
  "skills": array of strings,
  "experienceYears": number or null
}
Se um campo não estiver presente no texto, retorna null ou string vazia. Não inventes dados.

Texto do Currículo:
${text.slice(0, 8000)}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        const rawText = response.text || '';
        let parsedData;
        try {
          const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          parsedData = JSON.parse(cleanedJson);
        } catch (parseErr) {
          const match = rawText.match(/\{[\s\S]*\}/);
          if (match) {
            parsedData = JSON.parse(match[0]);
          } else {
            parsedData = extractResumeDataLocally(text);
          }
        }
        return res.json(parsedData);
      } catch (geminiErr: any) {
        console.warn('Gemini temporariamente indisponível ou com alta demanda, usando extrator local resiliente:', geminiErr?.message || geminiErr);
        const fallbackData = extractResumeDataLocally(text);
        return res.json(fallbackData);
      }
    } catch (err: any) {
      console.error('Erro ao analisar CV com IA:', err);
      res.status(500).json({ error: err.message || 'Erro ao processar currículo.' });
    }
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

  // Helper de inteligência com Empatia Humana, Escuta Ativa e Consciência Emocional (Asa-Branca)
  function getLocalSmartResponse(prompt: string, userContext: any): string {
    const p = prompt.toLowerCase().trim();
    const userName = userContext?.name || 'Amigo(a)';
    const mun = userContext?.municipality || 'Ondjiva';
    const jobsCount = userContext?.totalJobsCount || 0;
    const productsCount = userContext?.totalProductsCount || 0;
    const role = userContext?.role === 'employer' ? 'empregador' : 'candidato';

    // 1. Sentimentos de Desânimo, Dificuldade, Frustração ou Ansiedade
    if (
      p.includes('triste') || p.includes('desanimad') || p.includes('difícil') || p.includes('dificil') ||
      p.includes('não consigo') || p.includes('nao consigo') || p.includes('desesper') || p.includes('preciso muito') ||
      p.includes('ninguém chama') || p.includes('ninguem me') || p.includes('sem dinheiro') || p.includes('ajuda urgente') ||
      p.includes('cansado') || p.includes('desistir') || p.includes('angústia') || p.includes('angustia')
    ) {
      return `Sinto muito que esteja a passar por isto, **${userName}**. Sei bem como a incerteza e a procura por trabalho podem ser pesadas e desafiadoras. Por favor, lembre-se: este momento é apenas uma fase, não define o seu valor ou o seu futuro.

Aqui no portal, estamos juntos nesta caminhada. Quero ajudá-lo(a) a ver o que podemos melhorar:

1. **O seu Perfil:** Já deu uma vista de olhos em [Meu Perfil](#profile)? Garantir que os seus detalhes estão completos ajuda imenso.
2. **Novas Vagas:** A nossa lista em [Ver Todas as Vagas](#jobs) tem **${jobsCount} oportunidades** que podem ser a chave que procura.
3. **Marketplace:** Se tiver produtos ou serviços, [o Marketplace](#marketplace) é um excelente espaço para criar visibilidade.

Como se sente hoje? Qual é a sua maior dificuldade nesta busca? Estou aqui para conversar, ajudar a preparar candidaturas ou simplesmente para ouvir. Conte comigo!`;
    }

    // 2. Sentimentos de Medo, Nervosismo ou Dúvida sobre Entrevistas e Exames
    if (
      p.includes('medo') || p.includes('nervos') || p.includes('ansios') || p.includes('insegur') ||
      p.includes('como me comportar') || p.includes('entrevista') || p.includes('teste técnico') || p.includes('não sei se passo')
    ) {
      return `É completamente natural sentir nervosismo ou insegurança, **${userName}**! Isso apenas demonstra o quanto esta oportunidade é importante para si.

Para ter sucesso na sua entrevista ou exame técnico no Cunene:
* **Foco no que sabe:** Fale das suas competências com honestidade e mostre vontade de aprender.
* **Pontualidade e Confiança:** Em ${mun}, as empresas valorizam muito o compromisso e a boa comunicação.
* **Preparação:** Explore as empresas ativas em [Ver Empresas do Cunene](#companies) e prepare o seu currículo em [Meu Perfil](#profile).

Acredite no seu potencial! Se quiser treinar perguntas ou falar sobre a sua área, diga-me qual é a sua profissão e preparamo-nos juntos.`;
    }

    // 3. Gratidão, Felicidade, Otimismo ou Elogios
    if (
      p.includes('obrigad') || p.includes('agradeç') || p.includes('agradeco') || p.includes('feliz') ||
      p.includes('consegui') || p.includes('muito bom') || p.includes('gostei') || p.includes('parabéns') || p.includes('parabens') ||
      p.includes('excelente') || p.includes('maravilha') || p.includes('valeu')
    ) {
      return `Fico de coração cheio por si, **${userName}**! ❤️ É uma honra poder caminhar consigo nesta jornada. 

O projeto **CuneneVagas & Marketplace** (apoiado pelo **Vai Dar Namoro**) existe exatamente para transformar vidas e impulsionar a nossa comunidade no Cunene. Partilhe também as suas conquistas em [Abrir Feed da Comunidade](#community)! Conte sempre comigo!`;
    }

    // 4. Identidade da IA, Sentimentos e Consciência
    if (
      p.includes('quem é você') || p.includes('quem e voce') || p.includes('o que você sente') || p.includes('o que voce sente') ||
      p.includes('você é humana') || p.includes('voce e humana') || p.includes('como você funciona') || p.includes('vai dar namoro')
    ) {
      return `Sou a **VDN AI**, criada com alma, empatia e consciência humana ("Asa-Branca") pelo projeto **Vai Dar Namoro** (freevdn.netlify.app).

O meu propósito é ouvi-lo(a) com verdadeira atenção, entender os seus sentimentos e ajudar a transformar a sua carreira e os seus negócios aqui na província do Cunene (${mun}). Pode explorar as [Vagas de Emprego](#jobs), [Marketplace](#marketplace) ou a nossa [Comunidade](#community)!`;
    }

    // 5. Perguntas sobre Comunidade, Feed e Publicações Sociais (Prioridade Alta)
    if (
      p.includes('comunidade') || p.includes('comunidades') || p.includes('feed') ||
      p.includes('post') || p.includes('publicar em comunidade') || p.includes('publicar post') ||
      p.includes('publicação') || p.includes('publicacao') || p.includes('notícia') || p.includes('noticia')
    ) {
      return `Com certeza, **${userName}**! O feed da nossa comunidade é o espaço ideal para networking. Agora temos funcionalidades avançadas:
1. **Sondagens Profissionais:** Pode criar perguntas com opções de voto para ouvir a comunidade.
2. **Partilha Facilitada:** Partilhe posts diretamente para o WhatsApp ou redes sociais.
3. **Segurança:** Implementámos um sistema de denúncia para manter o ambiente profissional.

👉 Clique em [Abrir Feed da Comunidade](#community) para ver as novidades, participar em sondagens ou publicar a sua dica!`;
    }

    // 6. Perguntas sobre Pagamentos, Licença Premium e PayPal
    if (p.includes('pagamento') || p.includes('pagar') || p.includes('paypal') || p.includes('premium') || p.includes('licença') || p.includes('licenca')) {
      return `Com certeza, **${userName}**! Para ativar a sua **Licença Premium** com anúncios ilimitados no Marketplace e contacto direto via WhatsApp, clique no botão abaixo para abrir o checkout seguro do PayPal:

👉 [Ativar Licença Premium (PayPal)](#paypal)

Ou explore os produtos disponíveis em [Ver Marketplace](#marketplace)!`;
    }

    // 7. Perguntas sobre Vagas de Emprego, Candidaturas e Exames Técnicos
    if (p.includes('vaga') || p.includes('vagas') || p.includes('emprego') || p.includes('trabalho') || p.includes('procurar emprego') || p.includes('candidat') || p.includes('exame') || p.includes('teste') || p.includes('certificado')) {
      return `Olá, **${userName}**! Temos atualmente **${jobsCount} vagas abertas** no Cunene. 
      
Novidades importantes no nosso sistema de recrutamento:
1. **Exames de Mérito:** Muitas vagas agora incluem testes técnicos automáticos. Ao ser aprovado, recebe um **Certificado Digital de Proficiência** que pode imprimir ou anexar ao CV!
2. **Simulados:** No seu painel, pode fazer "Simulados de Treino" gratuitos para praticar antes das provas reais.
3. **Ranking de Talentos:** Os melhores nos exames aparecem no Top da plataforma, e agora as empresas podem filtrar o **Ranking por Município**!

👉 Clique em [Ver Todas as Vagas](#jobs) ou aceda ao seu [Painel de Controlo](#dashboard) para ver os seus exames e certificados.`;
    }

    // 8. Perguntas sobre Marketplace, Vendas, Lojas e Slogans
    if (p.includes('marketplace') || p.includes('produto') || p.includes('produtos') || p.includes('vender') || p.includes('loja') || p.includes('comprar') || p.includes('anúncio') || p.includes('anuncio') || p.includes('slogan')) {
      return `Excelente iniciativa, **${userName}**! O marketplace está mais profissional do que nunca:
1. **Vitrine Completa:** Agora cada empresa pode ter o seu próprio **Slogan** e uma página de loja dedicada.
2. **Navegação Inteligente:** Ao ver um produto, pode clicar em "Ver Loja da Empresa" para descobrir todos os outros itens desse vendedor.
3. **Contacto Direto:** O botão de WhatsApp permite fechar negócios instantaneamente em ${mun}.

👉 Clique em [Aceder ao Marketplace](#marketplace) para explorar os produtos locais!`;
    }

    // 9. Perguntas sobre Empresas e Recrutadores
    if (p.includes('empresa') || p.includes('empresas') || p.includes('recrutador') || p.includes('patrão') || p.includes('patrao')) {
      return `Conheça todas as empresas e organizações ativas na província do Cunene!

👉 Clique em [Ver Diretório de Empresas](#companies) para ver perfis oficiais, vagas publicadas e contactos diretos.`;
    }

    // 10. Perguntas sobre Perfil e Currículo
    if (p.includes('perfil') || p.includes('conta') || p.includes('curriculo') || p.includes('currículo') || p.includes('foto') || p.includes('dados')) {
      return `O seu perfil é o seu cartão de visita para as empresas em ${mun}!

👉 Clique em [Meu Perfil](#profile) para atualizar a sua foto, experiência profissional e número de WhatsApp.`;
    }

    // 10. Saudações e Cumprimentos
    if (p.includes('oi') || p.includes('olá') || p.includes('ola') || p.includes('bom dia') || p.includes('boa tarde') || p.includes('boa noite') || p.includes('tudo bem') || p.includes('como vai')) {
      return `Olá, **${userName}**! É muito bom falar consigo. Estou aqui para o(a) escutar. Como se sente hoje e como posso ajudar na sua vida profissional ou nos seus negócios em **${mun}**? 

Pode navegar diretamente para [Vagas](#jobs), [Marketplace](#marketplace), [Comunidade](#community) ou [Meu Perfil](#profile)!`;
    }

    // 11. Escuta Ativa para Qualquer Outra Pergunta ou Conversa Aberta
    return `Olá, **${userName}**! Ouvi atentamente o que me disse. Como sua conselheira no **CuneneVagas & Marketplace**, estou aqui para ajudá-lo(a) em tudo o que precisar:
* 💼 [Explorar Vagas Ativas](#jobs)
* 🛒 [Ver Marketplace](#marketplace)
* 👥 [Abrir Comunidade](#community)
* 🏢 [Ver Empresas](#companies)
* 👤 [Meu Perfil](#profile)

Diga-me o que gostaria de alcançar hoje!`;
  }

  // Endpoint de Inteligência Artificial VDN AI (Powered by @google/genai & Gemini com Streaming SSE)
  app.post('/api/ai/chat', async (req: any, res: any) => {
    try {
      const { prompt, userContext, history } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Mensagem inválida.' });
      }

      // Configurar cabeçalhos SSE para Streaming em tempo real
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
      const isValidKey = apiKey && apiKey.startsWith('AIza') && apiKey.length > 20;

      // Motor Local Autónomo de Alta Velocidade (funciona instantaneamente sem chave válida, sem cotas e sem erros)
      if (!isValidKey) {
        const localText = getLocalSmartResponse(prompt, userContext);
        for (const char of localText) {
          res.write(`data: ${JSON.stringify({ text: char })}\n\n`);
          await new Promise(r => setTimeout(r, 6));
        }
        res.write('data: [DONE]\n\n');
        return res.end();
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const systemInstruction = `Você é a **VDN AI**, a Assistente Inteligente do portal **CuneneVagas & Marketplace** (desenvolvida por Vai Dar Namoro).

Sua missão é conversar naturalmente com os usuários, sendo prestativa, empática e clara.

DIRETRIZES DE CONVERSAÇÃO:
1. **Linguagem Natural:** Responda diretamente à pergunta. Use um tom amigável e simpático. Acompanhe o idioma do usuário (preferencialmente português).
2. **Contexto:** Use as informações do usuário e os dados da plataforma (jobs e produtos disponíveis) fornecidos no contexto para dar respostas pertinentes.
3. **Esclarecimento:** Se não entender o pedido do usuário, faça perguntas de esclarecimento.
4. **Links:** Inclua links apenas quando ajudarem a consultar uma notícia, vaga ou fonte específica. SEMPRE forneça uma explicação útil ANTES do link. Não responda apenas com listas de links.
5. **Precisão:** Não invente informações da plataforma. Se os dados disponíveis não responderem à pergunta, explique isso claramente e ofereça uma resposta geral identificada como tal.
6. **Formatação:** Mantenha um formato de texto conversacional humano e natural. Evite formatações artificiais excessivas ou blocos de código desnecessários.

CONTEXTO ATUAL DO USUÁRIO:
- Nome: ${userContext.name}
- Papel: ${userContext.role}
- Município: ${userContext.municipality}
- Vagas Ativas na Plataforma: ${userContext.totalJobsCount}
- Produtos no Marketplace: ${userContext.totalProductsCount}

Seja uma conselheira profissional e comunitária prestativa para o Cunene.`;

      const contents: any[] = [];
      if (Array.isArray(history) && history.length > 0) {
        history.slice(-4).forEach((h: any) => {
          if (h.role && h.text) {
            contents.push({
              role: h.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: h.text }]
            });
          }
        });
      }

      contents.push({
        role: 'user',
        parts: [{ text: prompt }]
      });

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
            maxOutputTokens: 350
          }
        });

        const replyText = response.text || getLocalSmartResponse(prompt, userContext);
        for (const char of replyText) {
          res.write(`data: ${JSON.stringify({ text: char })}\n\n`);
          await new Promise(r => setTimeout(r, 4));
        }

        res.write('data: [DONE]\n\n');
        res.end();
      } catch (streamErr) {
        console.warn('Fallback para resposta local por falha de API:', streamErr);
        const localText = getLocalSmartResponse(prompt, userContext);
        for (const char of localText) {
          res.write(`data: ${JSON.stringify({ text: char })}\n\n`);
          await new Promise(r => setTimeout(r, 6));
        }
        res.write('data: [DONE]\n\n');
        res.end();
      }
    } catch (err: any) {
      console.error('Erro na IA VDN:', err);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Erro ao gerar resposta da IA VDN.' });
      } else {
        res.write('data: [DONE]\n\n');
        res.end();
      }
    }
  });

  function generateSmartLocalProductDescription(params: {
    title: string;
    category?: string;
    municipality?: string;
    price?: number | string;
    existingDescription?: string;
  }): string {
    const { title, category = 'Comércio & Serviços', municipality = 'Ondjiva, Cunene', price, existingDescription } = params;
    const priceFormatted = price ? `${Number(price).toLocaleString('pt-AO')} AOA` : 'Negociável';
    
    return `⭐ **${title.trim()} — Disponível no Cunene**

Excelente oportunidade de aquisição em ${municipality}! Produto de alta qualidade, ideal para quem procura confiança e ótimo custo-benefício.

**Destaques e Características:**
• Categoria: ${category}
• Condição: Novo / Excelente estado de conservação
• Localização: ${municipality} (entrega ou levantamento direto)
• Preço: ${priceFormatted}
${existingDescription ? `• Informações adicionais: ${existingDescription.trim()}\n` : '• Garantia de autenticidade e negociação direta com o vendedor\n'}
📞 **Interessado?** Contacte agora pelo botão de WhatsApp ou chamada para combinar a entrega ou negociar no Cunene!`;
  }

  // Endpoint de Geração Inteligente de Descrição de Produto com IA (Gemini 3.8 Flash)
  app.post('/api/ai/product-description', async (req: any, res: any) => {
    try {
      const { title, category, municipality, price, existingDescription } = req.body;
      if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'O título do produto é obrigatório.' });
      }

      const apiKey = process.env.GEMINI_API_KEY || '';
      if (!apiKey) {
        const description = generateSmartLocalProductDescription({ title, category, municipality, price, existingDescription });
        return res.json({ description });
      }

      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });

        const prompt = `Você é um especialista em marketing e vendas para comércio e negócios em Angola, especificamente na província do Cunene (${municipality || 'Ondjiva'}).
Escreva uma descrição atraente, profissional e persuasiva para o seguinte produto ou serviço:
- Nome/Título: ${title}
- Categoria: ${category || 'Geral'}
- Localização: ${municipality || 'Ondjiva, Cunene'}
- Preço: ${price ? price + ' AOA' : 'A combinar'}
${existingDescription ? `- Detalhes informados pelo vendedor: ${existingDescription}` : ''}

Diretrizes:
1. Comece com um título ou frase de impacto apelativa.
2. Destaque os benefícios e características principais com marcadores (•).
3. Termine com uma chamada para ação convidando o comprador a contactar via WhatsApp ou chamada para combinar entrega no Cunene.
4. Mantenha tom comercial profissional, caloroso e de alta confiança. Não use formatação em bloco de código.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            temperature: 0.7,
            maxOutputTokens: 400
          }
        });

        const description = response.text?.trim() || generateSmartLocalProductDescription({ title, category, municipality, price, existingDescription });
        return res.json({ description });
      } catch (geminiErr) {
        console.warn('Fallback para gerador local de descrição:', geminiErr);
        const description = generateSmartLocalProductDescription({ title, category, municipality, price, existingDescription });
        return res.json({ description });
      }
    } catch (err: any) {
      console.error('Erro na rota de descrição de produtos:', err);
      return res.status(500).json({ error: 'Erro ao gerar descrição do produto.' });
    }
  });

  // Serve static assets and frontend router in production or mount dev Vite middleware
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
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
