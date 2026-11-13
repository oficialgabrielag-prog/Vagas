import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
      <div className="bg-[#121212] border border-[#D4AF37]/30 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-4 max-w-sm w-full">
        <div className="w-16 h-16 bg-[#1C1811] rounded-full flex items-center justify-center mx-auto border border-[#D4AF37]/30">
          <WifiOff className="w-8 h-8 text-[#D4AF37]" />
        </div>
        <h2 className="text-xl font-black text-[#F5D77A]">Sem ligação à internet</h2>
        <p className="text-xs sm:text-sm text-[#BDB29F] leading-relaxed">
          A sua ligação foi perdida. A CuneneVagas funciona de forma offline, mas algumas funcionalidades precisam de internet para atualizar os dados. Por favor, verifique a sua ligação.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-[#D4AF37] hover:bg-[#F5D77A] text-slate-950 font-black px-6 py-3 rounded-xl text-xs sm:text-sm w-full transition shadow-md cursor-pointer"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
};
