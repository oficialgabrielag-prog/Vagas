import React from 'react';
import { X, Download, Share2, PlusSquare, Smartphone, CheckCircle2, Globe, Monitor } from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt
}) => {
  if (!isOpen) return null;

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isStandalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone);

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 my-8">
        {/* Header */}
        <div className="bg-[#0F4C9C] p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-xl hover:bg-white/10 transition"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-3 border border-white/20">
            <Smartphone className="w-6 h-6 text-[#FFC20E]" />
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#FFC20E]">
            Aplicação PWA
          </span>
          <h2 className="text-xl font-black mt-1">Instalar CuneneVagas</h2>
          <p className="text-xs text-blue-100 mt-1">
            Aceda diretamente a partir do ecrã do seu telemóvel ou computador, sem necessidade de ir à Play Store ou App Store.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-slate-800 text-xs">
          {isStandalone ? (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">A aplicação já se encontra instalada!</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">Está a usar a versão instalada no seu dispositivo.</p>
              </div>
            </div>
          ) : deferredPrompt ? (
            <div className="space-y-4">
              <p className="text-slate-600 leading-relaxed">
                Clique no botão abaixo para instalar a aplicação instantaneamente com 1 clique:
              </p>
              <button
                onClick={handleNativeInstall}
                className="w-full bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-bold py-3.5 px-4 rounded-2xl transition flex items-center justify-center gap-2 shadow-md active:scale-98 text-sm"
              >
                <Download className="w-4 h-4 text-[#FFC20E]" />
                <span>Instalar Aplicativo Agora</span>
              </button>
            </div>
          ) : isIOS ? (
            /* Guia Passo a Passo no iPhone */
            <div className="space-y-4">
              <p className="font-bold text-slate-900 text-sm">
                Como instalar no seu iPhone / iPad (Safari):
              </p>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-[#0F4C9C] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Toque no botão de Partilhar</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Procure o ícone <Share2 className="w-3.5 h-3.5 inline text-[#0F4C9C] mx-0.5" /> (um quadrado com uma seta para cima) na barra inferior do Safari.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-[#0F4C9C] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Selecione &quot;Adicionar ao Ecrã Principal&quot;</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Role para baixo no menu de opções e toque em <PlusSquare className="w-3.5 h-3.5 inline text-[#0F4C9C] mx-0.5" /> <strong>Adicionar ao Ecrã Principal</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-[#0F4C9C] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Confirme em &quot;Adicionar&quot;</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      No canto superior direito, toque em <strong>Adicionar</strong>. O ícone oficial do CuneneVagas aparecerá no seu ecrã!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Guia Geral Android / Chrome */
            <div className="space-y-4">
              <p className="font-bold text-slate-900 text-sm">
                Como instalar no Android / Navegador:
              </p>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-[#0F4C9C] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Abra o menu do navegador</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Toque nos <strong>3 pontinhos</strong> (⋮) no canto superior direito do Chrome.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-[#0F4C9C] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Toque em &quot;Instalar Aplicação&quot;</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Ou em <strong>&quot;Adicionar ao Ecrã Inicial&quot;</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Advantages */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Abre em ecrã total</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Funciona sem gastar dados extras</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Notificações diretas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Acesso rápido e seguro</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-5 py-2.5 rounded-xl text-xs transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
