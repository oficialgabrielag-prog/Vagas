import { supabase } from "./supabase";

/**
 * Atualiza o consentimento de marketing por email do utilizador autenticado
 * na tabela `email_preferences` do Supabase.
 */
export async function atualizarConsentimentoMarketing(aceita: boolean): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;

  if (!user) {
    throw new Error("Inicia sessão para alterar esta preferência.");
  }

  const { error } = await supabase
    .from("email_preferences")
    .upsert(
      {
        user_id: user.id,
        marketing_opt_in: aceita,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    );

  if (error) throw error;

  try {
    localStorage.setItem(`cv_marketing_opt_in_${user.id}`, JSON.stringify(aceita));
  } catch {}

  return aceita;
}

/**
 * Obtém o estado atual de consentimento de marketing por email.
 */
export async function obterConsentimentoMarketing(userId?: string): Promise<boolean> {
  try {
    let uid = userId;
    if (!uid) {
      const { data: sessionData } = await supabase.auth.getSession();
      uid = sessionData.session?.user?.id;
    }
    if (!uid) return false;

    // Tentar obter do Supabase
    const { data, error } = await supabase
      .from("email_preferences")
      .select("marketing_opt_in")
      .eq("user_id", uid)
      .maybeSingle();

    if (!error && data && typeof data.marketing_opt_in === "boolean") {
      try {
        localStorage.setItem(`cv_marketing_opt_in_${uid}`, JSON.stringify(data.marketing_opt_in));
      } catch {}
      return data.marketing_opt_in;
    }

    // Fallback para cache local se disponível
    const cached = localStorage.getItem(`cv_marketing_opt_in_${uid}`);
    if (cached !== null) {
      return JSON.parse(cached);
    }

    return false;
  } catch {
    return false;
  }
}
