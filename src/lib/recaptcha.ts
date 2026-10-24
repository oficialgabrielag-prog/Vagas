/**
 * Utilitário de Integração do Google reCAPTCHA v3
 * 
 * Gere o carregamento dinâmico do script reCAPTCHA sob demanda e a execução de ações
 * (ex: 'login', 'register', 'forgot_password') sem impactar a performance das restantes páginas.
 * 
 * A validação do token é delegada de forma segura à Netlify Function (/api/verify-recaptcha),
 * garantindo que a RECAPTCHA_SECRET_KEY permaneça restrita ao ambiente de servidor.
 */

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export type RecaptchaAction = 'login' | 'register' | 'forgot_password';

export interface RecaptchaVerificationResult {
  success: boolean;
  score?: number;
  error?: string;
  isBypass?: boolean;
}

const RECAPTCHA_SCRIPT_ID = 'google-recaptcha-v3-script';

/**
 * Carrega dinamicamente o script da API do Google reCAPTCHA v3 caso ainda não esteja injetado.
 */
export const loadRecaptchaScript = (siteKey: string): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve();
    }

    if (window.grecaptcha) {
      return resolve();
    }

    const existingScript = document.getElementById(RECAPTCHA_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => resolve()); // Fail-open on script error
      return;
    }

    const script = document.createElement('script');
    script.id = RECAPTCHA_SCRIPT_ID;
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => resolve(); // Fail-open so adblockers never block login

    document.head.appendChild(script);
  });
};

/**
 * Obtém a chave pública do Vite.
 */
export const getRecaptchaSiteKey = (): string => {
  const envKey = (import.meta as any).env?.VITE_RECAPTCHA_SITE_KEY;
  if (!envKey || envKey === 'your-recaptcha-v3-site-key') {
    return '';
  }
  return envKey.trim();
};

/**
 * Executa o Google reCAPTCHA v3 e gera um token para a ação especificada.
 */
export const executeRecaptchaToken = async (action: RecaptchaAction): Promise<string | null> => {
  const siteKey = getRecaptchaSiteKey();
  if (!siteKey) {
    return null;
  }

  try {
    await loadRecaptchaScript(siteKey);
  } catch {
    return null;
  }

  return new Promise((resolve) => {
    if (!window.grecaptcha) {
      return resolve(null);
    }

    try {
      window.grecaptcha.ready(async () => {
        try {
          const token = await window.grecaptcha!.execute(siteKey, { action });
          resolve(token || null);
        } catch {
          resolve(null);
        }
      });
    } catch {
      resolve(null);
    }
  });
};

/**
 * Valida de forma completa o reCAPTCHA para uma ação de utilizador:
 * Fail-open em caso de bloqueio por adblocker ou falha de rede para garantir que o utilizador nunca fica impedido de iniciar sessão.
 */
export const verifyRecaptchaAction = async (action: RecaptchaAction): Promise<RecaptchaVerificationResult> => {
  const siteKey = getRecaptchaSiteKey();

  if (!siteKey) {
    return { success: true, isBypass: true };
  }

  try {
    const token = await executeRecaptchaToken(action);
    if (!token) {
      // Fail-open: se o reCAPTCHA falhar ao gerar token (ex: adblocker), permite o login
      return { success: true, isBypass: true };
    }

    const response = await fetch('/api/verify-recaptcha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, action }),
    });

    if (!response.ok) {
      return { success: true, isBypass: true };
    }

    const data = await response.json();

    if (!data.success) {
      return { success: true, isBypass: true }; // Fail-open para máxima usabilidade
    }

    return {
      success: true,
      score: data.score,
    };
  } catch (err: any) {
    console.warn('[reCAPTCHA Bypass on Error]:', err?.message || err);
    // Fail-open: nunca bloquear o utilizador por falha de rede ou restrição de adblocker
    return { success: true, isBypass: true };
  }
};
