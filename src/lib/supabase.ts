import { 
  createClient, 
  FunctionsHttpError, 
  FunctionsRelayError, 
  FunctionsFetchError 
} from '@supabase/supabase-js';

const env = 
  (typeof import.meta !== 'undefined' && (import.meta as any).env) 
    ? (import.meta as any).env 
    : (typeof process !== 'undefined' ? process.env : {});

const rawUrl = 
  (env.VITE_SUPABASE_URL as string) || 
  (env.SUPABASE_URL as string) || 
  'https://gdjyrgufdjboqkusredk.supabase.co';

export const SUPABASE_URL = rawUrl.replace(/\/+$/, '');

// Prioritize VITE_SUPABASE_PUBLISHABLE_KEY as requested, preserving compatibility
export const SUPABASE_PUBLISHABLE_KEY = 
  (env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || 
  (env.VITE_SUPABASE_ANON_KEY as string) || 
  (env.SUPABASE_ANON_KEY as string) || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkanlyZ3VmZGpib3FrdXNyZWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NjMyMzgsImV4cCI6MjEwNjQzOTIzOH0.R5Cyg1oEEvMYDqMgY7vx7AvwzalPWZEmaYOuLrClQgo';

export const SUPABASE_ANON_KEY = SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

export interface AutomationAssistantDetailedError {
  status: number | null;
  statusText?: string;
  name: string;
  message: string;
  serverErrorBody: any;
  serverErrorMessage: string;
  errorType: 'http' | 'relay' | 'fetch' | 'unknown';
  stage: 'auth_check' | 'network' | 'gateway' | 'function_execution';
}

export interface AutomationAssistantResult {
  data: any;
  error: any;
  errorDetails?: AutomationAssistantDetailedError | null;
}

/**
 * Invoca a Edge Function 'automation-assistant' no Supabase.
 * Utiliza o cliente oficial @supabase/supabase-js e a chave pública/publishable.
 * Extrai de forma segura o corpo de erro real da resposta HTTP (evitando mensagens genéricas).
 * LOG_MONITOR_SECRET e chaves de serviço NUNCA são expostas no cliente.
 */
export const invokeAutomationAssistant = async (
  body: any,
  options?: { headers?: Record<string, string> }
): Promise<AutomationAssistantResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('automation-assistant', {
      body,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {})
      }
    });

    if (error) {
      let status: number | null = null;
      let statusText: string | undefined = undefined;
      let serverErrorBody: any = null;
      let serverErrorMessage = '';
      let errorType: 'http' | 'relay' | 'fetch' | 'unknown' = 'unknown';
      let stage: 'auth_check' | 'network' | 'gateway' | 'function_execution' = 'function_execution';

      if (error instanceof FunctionsHttpError || (error?.context && typeof error.context.status === 'number')) {
        errorType = 'http';
        const response = error.context as Response;
        status = response.status;
        statusText = response.statusText;
        stage = status === 401 ? 'auth_check' : 'function_execution';

        // Lê de forma segura o corpo da resposta HTTP (uma única vez)
        if (response && typeof response.text === 'function') {
          try {
            const rawText = await response.text();
            try {
              serverErrorBody = JSON.parse(rawText);
              serverErrorMessage = 
                serverErrorBody?.error || 
                serverErrorBody?.message || 
                serverErrorBody?.msg || 
                serverErrorBody?.detail || 
                rawText;
            } catch {
              serverErrorBody = rawText;
              serverErrorMessage = rawText || `HTTP ${status} ${statusText || 'Sem corpo de erro'}`;
            }
          } catch (readErr: any) {
            serverErrorMessage = `Falha ao ler corpo da resposta HTTP ${status}: ${readErr.message}`;
          }
        } else {
          serverErrorMessage = `HTTP ${status} ${statusText || ''}`.trim();
        }
      } else if (error instanceof FunctionsRelayError || error.name === 'FunctionsRelayError') {
        errorType = 'relay';
        stage = 'gateway';
        serverErrorMessage = error.message || 'Falha de retransmissão no gateway Supabase.';
      } else if (error instanceof FunctionsFetchError || error.name === 'FunctionsFetchError') {
        errorType = 'fetch';
        stage = 'network';
        serverErrorMessage = error.message || 'Falha de rede ao conectar à Edge Function.';
      } else {
        serverErrorMessage = error.message || 'Erro inesperado na chamada da função.';
      }

      return {
        data: null,
        error,
        errorDetails: {
          status,
          statusText,
          name: error.name || 'FunctionsError',
          message: error.message,
          serverErrorBody,
          serverErrorMessage: serverErrorMessage || error.message,
          errorType,
          stage
        }
      };
    }

    return { data, error: null, errorDetails: null };
  } catch (unexpectedErr: any) {
    return {
      data: null,
      error: unexpectedErr,
      errorDetails: {
        status: null,
        name: unexpectedErr.name || 'UnexpectedError',
        message: unexpectedErr.message || 'Exceção não tratada ao chamar a Edge Function',
        serverErrorBody: null,
        serverErrorMessage: unexpectedErr.message,
        errorType: 'unknown',
        stage: 'network'
      }
    };
  }
};

export const signUp = async (email: string, password: string, options?: any) => {
  return await supabase.auth.signUp({ email, password, options });
};

export const signInWithPassword = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export const resetPasswordForEmail = async (email: string) => {
  return await supabase.auth.resetPasswordForEmail(email);
};

export const getSession = async () => {
  return await supabase.auth.getSession();
};

export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};

export const updatePassword = async (newPassword: string) => {
  return await supabase.auth.updateUser({ password: newPassword });
};

