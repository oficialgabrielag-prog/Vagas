import React from 'react';
import { Home, Briefcase, Users, ShoppingBag, User, Store, Building2 } from 'lucide-react';
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
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 pb-safe">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => triggerHaptic(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 ${
              currentTab === item.id ? 'text-[#FFB900]' : 'text-[#073B70]'
            }`}
          >
            <item.icon className="w-6 h-6" strokeWidth={currentTab === item.id ? 2.5 : 2} />
            <span className="text-[10px] font-bold mt-1">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};
