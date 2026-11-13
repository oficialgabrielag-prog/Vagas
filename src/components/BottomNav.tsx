import React from 'react';
import { Home, Briefcase, Users, ShoppingBag, User, Building2 } from 'lucide-react';
import { UserProfile } from '../lib/types';
import { ProfileAvatar } from './ProfileAvatar';

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
  const triggerHaptic = (tab: string) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(10); } catch {}
    }
    setCurrentTab(tab);
  };

  const navItems = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'jobs', label: 'Vagas', icon: Briefcase },
    { id: 'companies', label: 'Empresas', icon: Building2 },
    { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
    { id: 'community', label: 'Feed', icon: Users },
    { id: 'profile', label: currentUser ? 'Perfil' : 'Entrar', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080808] border-t border-[#121212] pb-safe shadow-2xl">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const isProfile = item.id === 'profile';
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => triggerHaptic(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                isActive ? 'text-[#F5D77A] font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isProfile && currentUser ? (
                <div className={`p-0.5 rounded-full ${isActive ? 'ring-2 ring-[#D4AF37]' : ''}`}>
                  <ProfileAvatar user={currentUser} size="xs" />
                </div>
              ) : (
                <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
              )}
              <span className="text-[10px] font-bold mt-1 truncate max-w-[60px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

