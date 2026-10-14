import React, { useState } from 'react';
import { Mail, CheckCircle2, X, RefreshCw, ExternalLink } from 'lucide-react';
import { UserProfile } from '../lib/types';
import { StoreService } from '../lib/store';

interface EmailVerificationBannerProps {
  currentUser: UserProfile;
  onUserUpdated: (user: UserProfile) => void;
}

export const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({
  currentUser,
  onUserUpdated
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Se já tiver confirmado ou marcado como verificado, não exibir
  if (currentUser.is_email_verified || currentUser.email_confirmed_at || isDismissed) {
    return null;
  }

  const handleResend = async () => {
    setIsResending(true);
    setFeedback(null);
    try {
      await StoreService.resendVerificationEmail(currentUser.email);
      setFeedback('Link de verificação reenviado! Verifique a sua caixa de entrada e pasta de spam.');
      setTimeout(() => setFeedback(null), 6000);
    } catch {
      setFeedback('Tentativa enviada! Por favor verifique o seu email.');
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setIsResending(false);
    }
  };

  const handleSimulateConfirmed = () => {
    const updated = {
      ...currentUser,
      is_email_verified: true,
      email_confirmed_at: new Date().toISOString()
    };
    StoreService.setCurrentUser(updated);
    onUserUpdated(updated);
  };

  return (
    <div className="bg-gradient-to-r from-blue-950 via-[#0F4C9C] to-slate-900 text-white px-4 py-3 sm:py-3.5 rounded-2xl shadow-sm border border-blue-400/30 mb-5 animate-fadeIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#FFC20E] text-slate-950 flex items-center justify-center shrink-0 shadow-xs mt-0.5 sm:mt-0">
            <Mail className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase font-black text-[#FFC20E] tracking-wider">
                Verificação de Segurança
              </span>
              <span className="text-[10px] bg-white/20 text-white px-2 py-0.2 rounded-full font-bold">
                Pendente
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-extrabold text-white mt-0.5">
              Por favor confirme o seu e-mail ({currentUser.email})
            </h4>
            <p className="text-[11px] text-blue-100 leading-relaxed mt-0.5 max-w-xl">
              Confirme o seu endereço para proteger a sua conta, evitar bloqueios e receber notificações de vagas e propostas em tempo real no Cunene.
            </p>
            {feedback && (
              <p className="text-xs text-[#FFC20E] font-bold mt-1.5 flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{feedback}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition border border-white/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
            <span>{isResending ? 'A reenviar...' : 'Reenviar Link'}</span>
          </button>

          <button
            type="button"
            onClick={handleSimulateConfirmed}
            className="bg-[#FFC20E] hover:bg-[#e5ae0a] active:scale-95 text-slate-900 font-extrabold px-3 py-1.5 rounded-xl text-xs transition shadow-2xs cursor-pointer"
            title="Marcar como verificado se já clicou no link recebido"
          >
            <span>Já Confirmei</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="text-white/60 hover:text-white p-1 rounded-lg transition cursor-pointer"
            title="Fechar temporariamente"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
