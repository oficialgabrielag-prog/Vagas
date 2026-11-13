/**
 * Converte erros internos ou técnicos em mensagens naturais para os utilizadores do CuneneVagas,
 * mantendo os detalhes técnicos apenas nos registos internos de diagnóstico.
 */
const TECHNICAL_TERM_REGEX =
  /(supabase|cloudinary|postgres|pgrst|postgrest|row-level|rls|jwt|token|endpoint|backend|servidor|server|database|base de dados|banco de dados|storage|bucket|sql|schema|table|tabela|fkey|foreign key|uuid|edge function|status\s?\d{3}|failed to fetch|networkerror|unexpected token|json|http:\/\/|https:\/\/)/i;

export function toUserErrorMessage(
  err: unknown,
  fallback = 'Não foi possível concluir esta operação. Tenta novamente.'
): string {
  const raw =
    typeof err === 'string'
      ? err
      : err && typeof err === 'object' && 'message' in err
      ? String((err as { message?: unknown }).message ?? '')
      : '';

  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  const lower = trimmed.toLowerCase();

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_credentials') ||
    lower.includes('email or password')
  ) {
    return 'Email ou palavra-passe incorretos. Verifica os teus dados e tenta novamente.';
  }

  if (lower.includes('email not confirmed')) {
    return 'Confirma o teu email antes de iniciar sessão.';
  }

  if (
    lower.includes('already registered') ||
    lower.includes('already in use') ||
    lower.includes('already exists') ||
    lower.includes('user_already_exists')
  ) {
    return 'Já existe uma conta registada com este endereço de email. Inicia sessão ou recupera a tua palavra-passe.';
  }

  if (lower.includes('password') && (lower.includes('least') || lower.includes('short') || lower.includes('weak'))) {
    return 'A palavra-passe deve ter pelo menos 6 caracteres.';
  }

  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Demasiadas tentativas seguidas. Aguarda alguns momentos e tenta novamente.';
  }

  if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('offline')) {
    return 'Não foi possível ligar de momento. Verifica a tua ligação à internet e tenta novamente.';
  }

  if (lower.includes('recaptcha')) {
    return 'Não foi possível validar a segurança do pedido. Tenta novamente.';
  }

  if (TECHNICAL_TERM_REGEX.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
