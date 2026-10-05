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

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-lg safe-bottom">
      <div className="flex items-center justify-around h-14">
        {/* Início */}
        <button
          onClick={() => setCurrentTab('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'home' ? 'text-[#0F4C9C] font-bold scale-105' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Início</span>
        </button>

        {/* Vagas */}
        <button
          onClick={() => setCurrentTab('jobs')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'jobs' ? 'text-[#0F4C9C] font-bold scale-105' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Briefcase className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Vagas</span>
        </button>

        {/* If Employer -> Loja, else -> Comunidade */}
        {isEmployer ? (
          <button
            onClick={() => setCurrentTab('store')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              currentTab === 'store' ? 'text-[#0F4C9C] font-bold scale-105' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Store className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Loja</span>
          </button>
        ) : (
          <button
            onClick={() => setCurrentTab('community')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              currentTab === 'community' ? 'text-[#0F4C9C] font-bold scale-105' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Comunidade</span>
          </button>
        )}

        {/* If Employer -> Comunidade, else -> Marketplace */}
        {isEmployer ? (
          <button
            onClick={() => setCurrentTab('community')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              currentTab === 'community' ? 'text-[#0F4C9C] font-bold scale-105' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Comunidade</span>
          </button>
        ) : (
          <button
            onClick={() => setCurrentTab('marketplace')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              currentTab === 'marketplace' ? 'text-[#0F4C9C] font-bold scale-105' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Marketplace</span>
          </button>
        )}

        {/* Perfil */}
        <button
          onClick={() => {
            if (!currentUser) {
              onOpenAuth();
            } else {
              setCurrentTab('profile');
            }
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'profile' ? 'text-[#0F4C9C] font-bold scale-105' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          {isEmployer ? (
            currentUser?.company?.logo_url ? (
              <img
                src={currentUser.company.logo_url}
                alt="Logo da Empresa"
                className="w-5 h-5 rounded-full object-cover border border-slate-300"
              />
            ) : (
              <Store className="w-5 h-5" />
            )
          ) : (
            currentUser?.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt={currentUser.full_name}
                className="w-5 h-5 rounded-full object-cover border border-slate-300"
              />
            ) : (
              <User className="w-5 h-5" />
            )
          )}
          <span className="text-[10px] mt-0.5">{isEmployer ? 'Empresa' : 'Perfil'}</span>
        </button>
      </div>
    </nav>
  );
};
