import React, { useState, useEffect } from 'react';
import { Download, X, Share2, PlusSquare } from 'lucide-react';
import { InstallAppModal } from './InstallAppModal';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    // Listen for custom trigger to open install modal from Navbar or anywhere
    const handleOpenInstall = () => setModalOpen(true);
    window.addEventListener('open-pwa-install', handleOpenInstall);

    // Android / Desktop Chrome PWA prompt listener
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS Safari detection
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone);

    if (isIOS && !isStandalone) {
      setShowIOSPrompt(true);
    }

    return () => {
      window.removeEventListener('open-pwa-install', handleOpenInstall);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setModalOpen(true);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
  };

  return (
    <>
      <InstallAppModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        deferredPrompt={deferredPrompt}
      />

      {!dismissed && (
        deferredPrompt ? (
          <div 
            onClick={handleInstallClick}
            className="bg-[#0F4C9C] text-white px-4 py-2.5 text-xs flex items-center justify-between shadow-md cursor-pointer hover:bg-[#0c3c7d] transition"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#FFC20E] text-slate-900 flex items-center justify-center shrink-0 font-bold">
                <Download className="w-3.5 h-3.5" />
              </div>
              <span>Instale a app <strong>CuneneVagas</strong> no seu telemóvel para acesso rápido e direto!</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInstallClick}
                className="bg-[#FFC20E] text-slate-900 font-bold px-3 py-1 rounded-lg text-xs hover:bg-[#e5ae0a] transition shadow-xs"
              >
                Instalar
              </button>
              <button 
                onClick={handleDismiss} 
                className="text-white/80 hover:text-white p-1"
                aria-label="Dispensar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : showIOSPrompt ? (
          <div 
            onClick={() => setModalOpen(true)}
            className="bg-[#0F4C9C] text-white px-4 py-2.5 text-xs flex items-center justify-between border-b border-blue-800 cursor-pointer hover:bg-[#0c3c7d] transition"
          >
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#FFC20E] shrink-0" />
              <span>
                Instale no iPhone: toque em <strong>Partilhar</strong> e depois em <strong>Adicionar ao Ecrã Principal</strong> <PlusSquare className="w-3.5 h-3.5 inline text-[#FFC20E] ml-0.5" />
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-md">Ver como</span>
              <button 
                onClick={handleDismiss} 
                className="text-white/80 hover:text-white p-1"
                aria-label="Dispensar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : null
      )}
    </>
  );
};
