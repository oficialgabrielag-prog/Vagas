import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "oficialgabrielag@gmail.com";
const FROM_EMAIL = "CuneneVagas <reply@cunenevagas.online>";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!token) {
    return res.status(401).json({ error: "Sessão não encontrada." });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://gdjyrgufdjboqkusredk.supabase.co";
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  if (!supabaseUrl || !supabaseKey || !resendKey) {
    return res.status(500).json({
      error: "Configuração do serviço de email incompleta."
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: { Authorization: `Bearer ${token}` }
    }
  });

  const { data: authData, error: authError } =
    await supabase.auth.getUser(token);

  const user = authData?.user;

  if (authError || !user || user.email !== ADMIN_EMAIL) {
    return res.status(403).json({
      error: "Apenas o administrador pode enviar campanhas."
    });
  }

  const { subject, content, targetAudience, campaignId } = req.body || {};

  if (
    typeof subject !== "string" ||
    !subject.trim() ||
    typeof content !== "string" ||
    !content.trim()
  ) {
    return res.status(400).json({
      error: "Preenche o assunto e o conteúdo do email."
    });
  }

  const resend = new Resend(resendKey);

  try {
    // Email de teste: enviado exclusivamente ao administrador.
    if (targetAudience === "test") {
      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject: `[TESTE] ${subject}`,
        html: content
      });

      if (result.error) throw new Error(result.error.message);

      return res.status(200).json({
        success: true,
        message: "Email de teste enviado."
      });
    }

    if (
      !["all", "candidates", "employers"].includes(targetAudience) ||
      !campaignId
    ) {
      return res.status(400).json({
        error: "Campanha ou público-alvo inválido."
      });
    }

    // Confirma que a campanha pertence ao administrador autenticado.
    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .select("id, created_by")
      .eq("id", campaignId)
      .single();

    if (
      campaignError ||
      !campaign ||
      campaign.created_by !== user.id
    ) {
      return res.status(403).json({
        error: "Campanha não autorizada."
      });
    }

    // O RPC só devolve utilizadores com marketing_opt_in = true.
    const { data: recipients, error: recipientsError } =
      await supabase.rpc("admin_get_email_campaign_recipients", {
        p_target_audience: targetAudience
      });

    if (recipientsError) throw recipientsError;

    const validRecipients = (recipients || []).filter(
      (r: any) =>
        r.user_id &&
        typeof r.email === "string" &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)
    );

    if (validRecipients.length === 0) {
      await supabase
        .from("email_campaigns")
        .update({ status: "no_recipients" })
        .eq("id", campaignId);

      return res.status(409).json({
        error: "Não existem destinatários com consentimento para marketing."
      });
    }

    const logs: any[] = [];
    let sent = 0;
    let failed = 0;

    // Envio controlado, sem expor os endereços dos destinatários entre si.
    for (const recipient of validRecipients) {
      try {
        const result = await resend.emails.send({
          from: FROM_EMAIL,
          to: [recipient.email],
          subject,
          html: content
        });

        if (result.error) throw new Error(result.error.message);

        sent++;
        logs.push({
          campaign_id: campaignId,
          user_id: recipient.user_id,
          recipient_email: recipient.email,
          status: "sent",
          sent_at: new Date().toISOString()
        });
      } catch (error: any) {
        failed++;
        logs.push({
          campaign_id: campaignId,
          user_id: recipient.user_id,
          recipient_email: recipient.email,
          status: "failed",
          error_message: String(error?.message || "Falha no envio")
        });
      }
    }

    if (logs.length) {
      const { error: logError } = await supabase
        .from("email_campaign_logs")
        .insert(logs);

      if (logError) {
        console.error("Erro ao guardar logs:", logError.message);
      }
    }

    const finalStatus =
      failed === 0 ? "sent" : sent === 0 ? "failed" : "partial";

    await supabase
      .from("email_campaigns")
      .update({
        status: finalStatus,
        sent_at: sent > 0 ? new Date().toISOString() : null
      })
      .eq("id", campaignId);

    return res.status(200).json({
      success: failed === 0,
      sent,
      failed,
      total: validRecipients.length,
      message: `${sent} emails enviados; ${failed} falharam.`
    });
  } catch (error: any) {
    console.error("Resend campaign error:", error);

    return res.status(500).json({
      error: error?.message || "Erro interno ao enviar emails."
    });
  }
}
