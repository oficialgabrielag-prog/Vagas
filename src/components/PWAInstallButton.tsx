import React, { useState } from 'react';
import { usePWAInstall } from '../lib/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // If not installable and not iOS, we can still show a friendly install guide / trigger if browser supports it
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    const success = await install();
    if (!success) {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] px-4 py-2 text-xs font-bold text-black shadow-lg hover:brightness-110 active:scale-95 transition"
        title="Instalar aplicativo CuneneVagas no dispositivo"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span>Instalar App</span>
      </button>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-[#121212] border border-[#D4AF37]/30 p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#F5D77A] font-['Fraunces']">Instalar CuneneVagas</h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            {isIOS ? (
              <div className="space-y-3 text-sm text-gray-300">
                <p>Para instalar no seu iPhone ou iPad:</p>
                <ol className="list-decimal list-inside space-y-2 text-xs bg-black/40 p-3 rounded-xl border border-white/10">
                  <li>Toque no botão <strong>Partilhar / Share</strong> <span className="inline-block px-1">📤</span> na barra do Safari.</li>
                  <li>Deslize para baixo e toque em <strong>Adicionar ao Ecrã Principal</strong> <span className="inline-block px-1">➕</span>.</li>
                  <li>Toque em <strong>Adicionar</strong> no canto superior direito.</li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-sm text-gray-300">
                <p>Para instalar no seu dispositivo:</p>
                <ol className="list-decimal list-inside space-y-2 text-xs bg-black/40 p-3 rounded-xl border border-white/10">
                  <li>Abra o menu do navegador (três pontos no canto superior).</li>
                  <li>Selecione <strong>Instalar aplicação</strong> ou <strong>Adicionar ao ecrã principal</strong>.</li>
                  <li>Confirme para ter acesso rápido sem abrir o navegador.</li>
                </ol>
              </div>
            )}
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-[#D4AF37] py-2.5 text-sm font-bold text-black hover:bg-[#c29e2f] transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
