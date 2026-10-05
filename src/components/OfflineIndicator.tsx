import React from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
      <div className="bg-white p-6 rounded-3xl shadow-2xl space-y-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
          <WifiOff className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Sem ligação à internet</h2>
        <p className="text-sm text-slate-500 max-w-xs">
          A sua ligação foi perdida. A CuneneVagas funciona de forma offline, mas algumas funcionalidades precisam de internet para atualizar os dados. Por favor, verifique a sua ligação.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-[#0F4C9C] text-white font-bold px-6 py-2 rounded-xl text-sm w-full hover:bg-[#0c3c7d] transition"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
};
