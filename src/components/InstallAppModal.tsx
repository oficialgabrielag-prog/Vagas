import React from 'react';
import { X, Download, Share2, PlusSquare, Smartphone, CheckCircle2 } from 'lucide-react';
import { isInsideAPKApp, APK_DOWNLOAD_URL } from '../lib/apkUtils';

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
  const isAPK = isInsideAPKApp();

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
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-xl hover:bg-white/10 transition cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-3 border border-white/20">
            <Smartphone className="w-6 h-6 text-[#FFC20E]" />
          </div>
          <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#FFC20E]">
            Aplicativo Oficial CuneneVagas
          </span>
          <h2 className="text-xl font-black mt-1">Baixar Aplicativo Android (.APK)</h2>
          <p className="text-xs text-blue-100 mt-1">
            Instale o aplicativo direto no seu telemóvel para acesso rápido, seguro e sem depender do navegador.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-slate-800 text-xs">
          {isAPK ? (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">Você já está a usar a aplicação nativa!</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">Esta sessão está a ser executada diretamente dentro do aplicativo oficial do CuneneVagas.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Opção Principal: Download do Ficheiro APK Oficial */}
              <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-200/80 space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                  <Smartphone className="w-5 h-5 text-[#0F4C9C]" />
                  <span>Download Direto do APK Oficial</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Baixe e instale o ficheiro APK para Android e tenha o ícone oficial do CuneneVagas no ecrã do seu telemóvel.
                </p>
                <a
                  href={APK_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#0F4C9C] hover:bg-[#0c3c7d] active:bg-[#092d63] text-white font-extrabold py-3.5 px-4 rounded-2xl transition flex items-center justify-center gap-2 shadow-md active:scale-98 text-xs cursor-pointer block text-center"
                >
                  <Download className="w-4 h-4 text-[#FFC20E]" />
                  <span>Baixar Aplicativo (.APK) Agora</span>
                </a>
              </div>

              {/* Opção Secundária: PWA ou Guia Safari */}
              {deferredPrompt ? (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <p className="text-slate-600 font-medium">
                    Ou adicione como PWA diretamente do navegador:
                  </p>
                  <button
                    type="button"
                    onClick={handleNativeInstall}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-[#0F4C9C]" />
                    <span>Instalar PWA no Navegador</span>
                  </button>
                </div>
              ) : isIOS ? (
                /* Guia Passo a Passo no iPhone */
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <p className="font-bold text-slate-900 text-sm">
                    Como instalar no seu iPhone / iPad (Safari):
                  </p>
                  
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-6 h-6 rounded-full bg-[#0F4C9C] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Toque no botão de Partilhar</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Procure o ícone <Share2 className="w-3.5 h-3.5 inline text-[#0F4C9C] mx-0.5" /> no Safari.
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
                          Toque em <PlusSquare className="w-3.5 h-3.5 inline text-[#0F4C9C] mx-0.5" /> <strong>Adicionar ao Ecrã Principal</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {/* Vantagens */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Abre em ecrã total</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Poupa dados de internet</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Notificações imediatas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Ícone no ecrã inicial</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
