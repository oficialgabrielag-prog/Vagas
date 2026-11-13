import React, { useState, useEffect } from 'react';
import { Mail, Send, Loader2, AlertCircle, CheckCircle2, History, Eye, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toUserErrorMessage } from '../lib/errorMessages';

export const EmailCampaignAdmin = () => {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'candidates' | 'employers'>('all');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleSend = async (isTest: boolean) => {
    if (!isTest && !window.confirm(
      "Confirmas o envio desta campanha aos utilizadores que aceitaram receber emails?"
    )) return;

    setLoading(true);
    setFeedback(null);

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      const session = sessionData?.session;

      if (sessionError || !session) {
        throw new Error("Inicia sessão novamente.");
      }

      let campaignId: string | undefined;

      if (!isTest) {
        if (!subject.trim() || !content.trim()) {
          throw new Error("Preenche o assunto e o conteúdo.");
        }

        const { data: userData } = await supabase.auth.getUser();

        const { data: campaign, error: campaignError } =
          await supabase
            .from("email_campaigns")
            .insert({
              subject: subject.trim(),
              content,
              target_audience: targetAudience,
              status: "sending",
              created_by: userData.user?.id
            })
            .select("id")
            .single();

        if (campaignError) throw campaignError;
        campaignId = campaign.id;
      }

      const response = await fetch("/api/send-email-campaign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          subject: subject.trim(),
          content,
          targetAudience: isTest ? "test" : targetAudience,
          campaignId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Não foi possível enviar.");
      }

      setFeedback({
        type: "success",
        text: isTest
          ? "Email de teste enviado!"
          : result.message || "Campanha processada."
      });
    } catch (err: any) {
      console.error("Erro Resend:", err);
      setFeedback({
        type: "error",
        text: err.message || "Erro ao enviar email."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-6">
      <h2 className="text-xl font-black text-slate-900">Nova Campanha por Email</h2>
      
      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
          {feedback.text}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Destinatários</label>
        <select value={targetAudience} onChange={e => setTargetAudience(e.target.value as any)} className="w-full p-3 rounded-xl border border-slate-200 text-sm">
          <option value="all">Todos os utilizadores</option>
          <option value="candidates">Apenas candidatos</option>
          <option value="employers">Apenas empresas</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Assunto</label>
        <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 text-sm" placeholder="Assunto do email"/>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Conteúdo (HTML)</label>
        <textarea value={content} onChange={e => setContent(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 text-sm h-40" placeholder="Conteúdo do email em HTML"/>
      </div>

      <div className="flex gap-3">
        <button onClick={() => handleSend(true)} disabled={loading} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer">
          <Eye className="w-4 h-4"/> Enviar Teste
        </button>
        <button onClick={() => handleSend(false)} disabled={loading} className="flex-1 bg-[#D4AF37] hover:bg-blue-900 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer">
          {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>} Enviar Campanha
        </button>
      </div>
    </div>
  );
};
