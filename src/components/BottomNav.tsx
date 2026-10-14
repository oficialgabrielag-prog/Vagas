import React from 'react';
import { Home, Briefcase, Users, ShoppingBag, User, Store } from 'lucide-react';
import { UserProfile } from '../lib/types';

interface BottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  onOpenAuth
}) => {
  const isEmployer = currentUser?.role === 'employer';

  const triggerHaptic = (tab: string) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
    setCurrentTab(tab);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-2xl border-t border-[#e4e9ef] shadow-[0_-4px_24px_rgba(0,0,0,0.04)] pb-safe select-none transition-all">
      <div className="flex items-center justify-around h-15 px-2 max-w-lg mx-auto">
        {/* Início */}
        <button
          onClick={() => triggerHaptic('home')}
          className={`flex flex-col items-center justify-center min-h-[44px] flex-1 py-1 transition-all duration-150 active:scale-90 cursor-pointer ${
            currentTab === 'home' ? 'text-[#1759ad] font-black' : 'text-[#617087] hover:text-[#1759ad] font-medium'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all duration-200 ${currentTab === 'home' ? 'bg-[#edf4fc] text-[#1759ad] scale-105 shadow-2xs' : ''}`}>
            <Home className="w-5 h-5" strokeWidth={currentTab === 'home' ? 2.6 : 1.8} />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Início</span>
        </button>

        {/* Vagas */}
        <button
          onClick={() => triggerHaptic('jobs')}
          className={`flex flex-col items-center justify-center min-h-[44px] flex-1 py-1 transition-all duration-150 active:scale-90 cursor-pointer ${
            currentTab === 'jobs' ? 'text-[#1759ad] font-black' : 'text-[#617087] hover:text-[#1759ad] font-medium'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all duration-200 ${currentTab === 'jobs' ? 'bg-[#edf4fc] text-[#1759ad] scale-105 shadow-2xs' : ''}`}>
            <Briefcase className="w-5 h-5" strokeWidth={currentTab === 'jobs' ? 2.6 : 1.8} />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Vagas</span>
        </button>

        {/* Loja (para Empresa) ou Marketplace (para Candidato) */}
        {isEmployer ? (
          <button
            onClick={() => triggerHaptic('store')}
            className={`flex flex-col items-center justify-center min-h-[44px] flex-1 py-1 transition-all duration-150 active:scale-90 cursor-pointer ${
              currentTab === 'store' ? 'text-[#1759ad] font-black' : 'text-[#617087] hover:text-[#1759ad] font-medium'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all duration-200 ${currentTab === 'store' ? 'bg-[#edf4fc] text-[#1759ad] scale-105 shadow-2xs' : ''}`}>
              <Store className="w-5 h-5" strokeWidth={currentTab === 'store' ? 2.6 : 1.8} />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">Loja</span>
          </button>
        ) : (
          <button
            onClick={() => triggerHaptic('marketplace')}
            className={`flex flex-col items-center justify-center min-h-[44px] flex-1 py-1 transition-all duration-150 active:scale-90 cursor-pointer ${
              currentTab === 'marketplace' ? 'text-[#1759ad] font-black' : 'text-[#617087] hover:text-[#1759ad] font-medium'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all duration-200 ${currentTab === 'marketplace' ? 'bg-[#edf4fc] text-[#1759ad] scale-105 shadow-2xs' : ''}`}>
              <ShoppingBag className="w-5 h-5" strokeWidth={currentTab === 'marketplace' ? 2.6 : 1.8} />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">Mercado</span>
          </button>
        )}

        {/* Comunidade */}
        <button
          onClick={() => triggerHaptic('community')}
          className={`flex flex-col items-center justify-center min-h-[44px] flex-1 py-1 transition-all duration-150 active:scale-90 cursor-pointer ${
            currentTab === 'community' ? 'text-[#1759ad] font-black' : 'text-[#617087] hover:text-[#1759ad] font-medium'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all duration-200 ${currentTab === 'community' ? 'bg-[#edf4fc] text-[#1759ad] scale-105 shadow-2xs' : ''}`}>
            <Users className="w-5 h-5" strokeWidth={currentTab === 'community' ? 2.6 : 1.8} />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Feed</span>
        </button>

        {/* Perfil */}
        <button
          onClick={() => {
            if (!currentUser) {
              onOpenAuth();
            } else {
              triggerHaptic(isEmployer ? 'store' : 'profile');
            }
          }}
          className={`flex flex-col items-center justify-center min-h-[44px] flex-1 py-1 transition-all duration-150 active:scale-90 cursor-pointer ${
            currentTab === 'profile' || currentTab === 'store' ? 'text-[#1759ad] font-black' : 'text-[#617087] hover:text-[#1759ad] font-medium'
          }`}
        >
          <div className={`p-1.5 rounded-2xl transition-all duration-200 ${(currentTab === 'profile' || currentTab === 'store') ? 'bg-[#0F4C9C]/10 text-[#0F4C9C] scale-110 shadow-2xs' : ''}`}>
            {isEmployer ? (
              currentUser?.company?.logo_url ? (
                <img
                  src={currentUser.company.logo_url}
                  alt="Logo"
                  className="w-5 h-5 rounded-full object-cover border border-[#0F4C9C]/40"
                />
              ) : (
                <Store className="w-5 h-5" strokeWidth={(currentTab === 'profile' || currentTab === 'store') ? 2.6 : 1.8} />
              )
            ) : (
              currentUser?.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.full_name}
                  className="w-5 h-5 rounded-full object-cover border border-[#0F4C9C]/40"
                />
              ) : (
                <User className="w-5 h-5" strokeWidth={(currentTab === 'profile' || currentTab === 'store') ? 2.6 : 1.8} />
              )
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">{isEmployer ? 'Empresa' : 'Perfil'}</span>
        </button>
      </div>
    </nav>
  );
};
