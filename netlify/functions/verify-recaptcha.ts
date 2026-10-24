/**
 * Netlify Serverless Function: verify-recaptcha
 * 
 * Validação segura do Google reCAPTCHA v3 no servidor.
 * A chave privada RECAPTCHA_SECRET_KEY é lida diretamente do ambiente de execução do Netlify
 * e NUNCA é enviada nem exposta no cliente web (Vite/SPA).
 */

interface RecaptchaVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

export const handler = async (event: {
  httpMethod: string;
  body: string | null;
  headers: Record<string, string | undefined>;
}) => {
  // Configuração de cabeçalhos CORS e formato JSON
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Suporte a preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Método não permitido. Utilize POST.',
      }),
    };
  }

  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      console.warn(
        '[reCAPTCHA] RECAPTCHA_SECRET_KEY não está configurada no ambiente do Netlify.'
      );
      // Se a chave secreta ainda não estiver configurada no Netlify, permitimos aviso claro
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          success: false,
          error:
            'A verificação reCAPTCHA no servidor ainda não foi ativada. Configure a variável RECAPTCHA_SECRET_KEY no painel do Netlify.',
          code: 'SECRET_KEY_MISSING',
        }),
      };
    }

    let payload: { token?: string; action?: string } = {};
    try {
      payload = event.body ? JSON.parse(event.body) : {};
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Corpo da requisição JSON inválido.',
        }),
      };
    }

    const { token, action: expectedAction } = payload;

    if (!token || typeof token !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Token do reCAPTCHA ausente ou inválido.',
        }),
      };
    }

    // Consulta à API oficial do Google reCAPTCHA
    const params = new URLSearchParams();
    params.append('secret', secretKey);
    params.append('response', token);

    const googleRes = await fetch(
      'https://www.google.com/recaptcha/api/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    if (!googleRes.ok) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Falha de comunicação com o serviço de verificação do Google.',
        }),
      };
    }

    const data = (await googleRes.json()) as RecaptchaVerifyResponse;

    if (!data.success) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Token do reCAPTCHA rejeitado pelo Google.',
          errorCodes: data['error-codes'] || [],
        }),
      };
    }

    // Validação da Ação (action: 'login' | 'register' | 'forgot_password')
    if (expectedAction && data.action && data.action !== expectedAction) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: `Ação do reCAPTCHA inválida. Esperada: "${expectedAction}", recebida: "${data.action}".`,
        }),
      };
    }

    // Validação do Score (v3 pontua de 0.0 a 1.0; 0.5 é o padrão recomendado pela Google)
    const score = typeof data.score === 'number' ? data.score : 1.0;
    const MINIMUM_SCORE = 0.5;

    if (score < MINIMUM_SCORE) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          score,
          error:
            'Acesso bloqueado por segurança: pontuação de proteção contra bots insuficiente.',
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        score,
        action: data.action,
        hostname: data.hostname,
      }),
    };
  } catch (err: any) {
    console.error('[reCAPTCHA Function Error]:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Erro interno durante a verificação de segurança.',
      }),
    };
  }
};
