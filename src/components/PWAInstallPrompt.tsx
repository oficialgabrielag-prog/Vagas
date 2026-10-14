import React, { useState, useEffect } from 'react';
import { Download, X, Share2, PlusSquare, Smartphone } from 'lucide-react';
import { InstallAppModal } from './InstallAppModal';
import { isInsideAPKApp, APK_DOWNLOAD_URL } from '../lib/apkUtils';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isInsideAPK, setIsInsideAPK] = useState(false);

  useEffect(() => {
    // Se o aplicativo já estiver sendo executado dentro do APK nativo / standalone, esconde o banner
    if (isInsideAPKApp()) {
      setIsInsideAPK(true);
      return;
    }

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

    if (isIOS) {
      setShowIOSPrompt(true);
    }

    return () => {
      window.removeEventListener('open-pwa-install', handleOpenInstall);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Se o aplicativo estiver sendo executado dentro do APK (Median / GoNative / Standalone), esconde completamente o link/banner
  if (isInsideAPK) {
    return null;
  }

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
        <div className="bg-[#0F4C9C] text-white px-3 sm:px-4 py-2 text-xs flex items-center justify-between shadow-md border-b border-blue-800 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-[#FFC20E] text-slate-900 flex items-center justify-center shrink-0 font-extrabold shadow-2xs">
              <Smartphone className="w-4 h-4 text-slate-950" />
            </div>
            <div className="truncate">
              <span className="font-extrabold text-[#FFC20E] mr-1">App Oficial:</span>
              <span className="hidden sm:inline">Baixe o aplicativo para Android (.APK) ou instale no seu ecrã!</span>
              <span className="sm:hidden">Baixe a app Android no telemóvel</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Link direto do APK oficial */}
            <a
              href={APK_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#FFC20E] hover:bg-[#e5ae0a] text-slate-950 font-black px-3 py-1 rounded-xl text-xs transition shadow-2xs flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar APK</span>
            </a>

            <button
              type="button"
              onClick={handleInstallClick}
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-2.5 py-1 rounded-xl text-xs transition hidden md:inline-block"
            >
              Opções
            </button>

            <button 
              type="button"
              onClick={handleDismiss} 
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              aria-label="Dispensar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
