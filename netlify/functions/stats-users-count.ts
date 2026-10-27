import { createClient } from '@supabase/supabase-js';

/**
 * Netlify Serverless Function: stats-users-count
 * 
 * Fonte canónica única para contagem oficial de utilizadores registados do CuneneVagas.
 * Consulta exclusivamente a tabela "public.profiles" do Supabase PostgreSQL.
 * Retorna apenas contagens agregadas com cabeçalhos estritos de revalidação HTTP (no-cache).
 * NUNCA expõe chaves secretas (service_role), emails ou dados privados de utilizadores.
 */

export const handler = async (event: {
  httpMethod: string;
  headers: Record<string, string | undefined>;
}) => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: 'Método não permitido. Utilize GET.',
      }),
    };
  }

  try {
    const supabaseUrl =
      process.env.VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      'https://gdjyrgufdjboqkusredk.supabase.co';

    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      '';

    if (!supabaseKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Credencial de conexão Supabase não configurada no servidor.',
        }),
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase
      .from('profiles')
      .select('id, role', { count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000001');

    if (error) {
      console.error('[Netlify Function stats-users-count] Erro Supabase:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Erro ao consultar contagem de perfis no Supabase.',
          details: error.message,
        }),
      };
    }

    const profiles = (data || []).filter(
      (p: any) => p && p.id !== '00000000-0000-0000-0000-000000000001'
    );

    const totalCandidates = profiles.filter((p: any) => {
      const r = (p.role || '').toLowerCase();
      return r !== 'empresa' && r !== 'employer';
    }).length;

    const totalEmployers = profiles.filter((p: any) => {
      const r = (p.role || '').toLowerCase();
      return r === 'empresa' || r === 'employer';
    }).length;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        totalUsers: profiles.length,
        totalCandidates,
        totalEmployers,
        source: 'public.profiles',
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (err: any) {
    console.error('[Netlify Function stats-users-count] Exceção:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erro interno ao processar contagem de utilizadores.',
        message: err.message || 'Erro inesperado',
      }),
    };
  }
};
