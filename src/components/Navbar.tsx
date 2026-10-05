import React, { useState } from 'react';
import { Briefcase, ShoppingBag, Users, Building2, User, UserPlus, LogOut, Menu, X, PlusCircle, ArrowLeftRight, Bell, Bookmark, FileText, Settings, Store, Download } from 'lucide-react';
import { UserProfile } from '../lib/types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: UserProfile | null;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onLogout: () => void;
  onOpenNewJob?: () => void;
  onOpenNewProduct?: () => void;
  onSwitchAccountRole: () => void;
  unreadNotificationsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenNewJob,
  onOpenNewProduct,
  onSwitchAccountRole,
  unreadNotificationsCount = 0
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isEmployer = currentUser?.role === 'employer';

  return (
    <>
      <header className="bg-white/95 backdrop-blur-md shadow-2xs sticky top-0 z-40 border-b border-slate-200/80 transition-all pt-safe">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex justify-between h-14 sm:h-16 items-center">
            {/* Brand Logo */}
            <div className="flex items-center space-x-2 cursor-pointer shrink-0" onClick={() => setCurrentTab('home')}>
              <div className="w-9 h-9 bg-[#0F4C9C] rounded-xl flex items-center justify-center text-white shadow-xs shrink-0">
                <Briefcase className="w-5 h-5 text-[#FFC20E]" />
              </div>
              <span className="text-xl font-bold tracking-tight text-[#0F4C9C]">
                Cunene<span className="text-[#FFC20E]">Vagas</span>
              </span>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              <button
                onClick={() => setCurrentTab('home')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  currentTab === 'home' ? 'bg-[#0F4C9C]/10 text-[#0F4C9C]' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Início
              </button>
              <button
                onClick={() => setCurrentTab('jobs')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  currentTab === 'jobs' ? 'bg-[#0F4C9C]/10 text-[#0F4C9C]' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Briefcase className="w-4 h-4" /> Vagas
              </button>
              {isEmployer ? (
                <button
                  onClick={() => setCurrentTab('store')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    currentTab === 'store' ? 'bg-[#0F4C9C]/10 text-[#0F4C9C]' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Store className="w-4 h-4" /> Loja
                </button>
              ) : null}
              <button
                onClick={() => setCurrentTab('marketplace')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  currentTab === 'marketplace' ? 'bg-[#0F4C9C]/10 text-[#0F4C9C]' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingBag className="w-4 h-4" /> Marketplace
              </button>
              <button
                onClick={() => setCurrentTab('community')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  currentTab === 'community' ? 'bg-[#0F4C9C]/10 text-[#0F4C9C]' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" /> Comunidade
              </button>
              <button
                onClick={() => setCurrentTab('companies')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  currentTab === 'companies' ? 'bg-[#0F4C9C]/10 text-[#0F4C9C]' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-4 h-4" /> Empresas
              </button>

              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-install'))}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-[#0F4C9C] hover:bg-[#0F4C9C]/10 transition flex items-center gap-1.5"
                title="Instalar App no telemóvel ou PC"
              >
                <Download className="w-4 h-4 text-[#FFC20E]" />
                <span className="hidden lg:inline">Instalar App</span>
              </button>
            </nav>

            {/* Right Action Buttons */}
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              {/* Account Switcher Button */}
              {currentUser && (
                <button
                  onClick={onSwitchAccountRole}
                  title={isEmployer ? 'Alternar para Candidato' : 'Alternar para Empresa'}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] sm:text-xs font-bold px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 border border-slate-200"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-[#0F4C9C]" />
                  <span className="hidden sm:inline">
                    {isEmployer ? 'Mudar p/ Candidato' : 'Mudar p/ Empresa'}
                  </span>
                </button>
              )}

              {/* Action buttons */}
              {isEmployer && onOpenNewJob && (
                <button
                  onClick={onOpenNewJob}
                  className="hidden sm:flex bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-bold px-3.5 py-2 rounded-xl text-xs transition shadow-xs items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Publicar Vaga</span>
                </button>
              )}

              {/* Profile or Login / Register buttons */}
              {currentUser ? (
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <button
                    onClick={() => setCurrentTab('profile')}
                    className="p-0.5 rounded-full border border-slate-200 hover:ring-2 hover:ring-[#0F4C9C] transition shrink-0"
                    title={isEmployer ? 'Perfil da Empresa' : 'Perfil do Candidato'}
                  >
                    {isEmployer ? (
                      currentUser.company?.logo_url ? (
                        <img
                          src={currentUser.company.logo_url}
                          alt="Logo da Empresa"
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#0F4C9C] text-white flex items-center justify-center font-bold text-xs">
                          {(currentUser.company?.name || currentUser.company_name || 'E').charAt(0)}
                        </div>
                      )
                    ) : (
                      currentUser.avatar_url ? (
                        <img
                          src={currentUser.avatar_url}
                          alt="Fotografia Pessoal"
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#0F4C9C] text-white flex items-center justify-center font-bold text-xs">
                          {currentUser.full_name.charAt(0)}
                        </div>
                      )
                    )}
                  </button>

                  <button
                    onClick={() => setDrawerOpen(true)}
                    className="p-1.5 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
                    title="Menu Secundário"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => onOpenAuth('login')}
                    className="text-[#0F4C9C] hover:bg-[#0F4C9C]/10 border border-[#0F4C9C]/30 font-bold px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs transition flex items-center gap-1"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Entrar</span>
                  </button>
                  <button
                    onClick={() => onOpenAuth('register')}
                    className="bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-bold px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs transition shadow-xs flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-[#FFC20E]" />
                    <span className="hidden xs:inline">Criar Conta</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Secondary Drawer Menu (Section 1 & 4) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white w-full max-w-xs h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b pb-4 border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0F4C9C] text-white flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                    {isEmployer ? (
                      currentUser?.company?.logo_url ? (
                        <img src={currentUser.company.logo_url} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        (currentUser?.company?.name || currentUser?.company_name || 'E').charAt(0)
                      )
                    ) : (
                      currentUser?.avatar_url ? (
                        <img src={currentUser.avatar_url} alt="Foto" className="w-full h-full object-cover" />
                      ) : (
                        currentUser?.full_name.charAt(0)
                      )
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {isEmployer ? (currentUser?.company?.name || currentUser?.company_name || currentUser?.full_name) : currentUser?.full_name}
                    </h3>
                    <span className="text-[11px] text-[#0F4C9C] font-semibold block">
                      {isEmployer ? 'Modo Empresa Oficial' : 'Modo Candidato'}
                    </span>
                  </div>
                </div>
                <button onClick={() => setDrawerOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Menu items tailored to user role */}
              <div className="space-y-1 text-sm font-bold text-slate-700">
                {isEmployer ? (
                  <>
                    <button
                      onClick={() => { setCurrentTab('dashboard'); setDrawerOpen(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 transition flex items-center gap-3"
                    >
                      <Building2 className="w-4 h-4 text-[#0F4C9C]" />
                      <span>Painel da Empresa</span>
                    </button>
                    <button
                      onClick={() => { setCurrentTab('dashboard'); setDrawerOpen(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 transition flex items-center gap-3"
                    >
                      <Briefcase className="w-4 h-4 text-[#0F4C9C]" />
                      <span>Minhas Vagas</span>
                    </button>
                    <button
                      onClick={() => { setCurrentTab('dashboard'); setDrawerOpen(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 transition flex items-center gap-3"
                    >
                      <Users className="w-4 h-4 text-[#0F4C9C]" />
                      <span>Candidatos & Recrutamento</span>
                    </button>
                    <button
                      onClick={() => { setCurrentTab('store'); setDrawerOpen(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 transition flex items-center gap-3"
                    >
                      <Store className="w-4 h-4 text-[#0F4C9C]" />
                      <span>Meus Produtos & Loja</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setCurrentTab('dashboard'); setDrawerOpen(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 transition flex items-center gap-3"
                    >
                      <Briefcase className="w-4 h-4 text-[#0F4C9C]" />
                      <span>Minhas Candidaturas</span>
                    </button>
                    <button
                      onClick={() => { setCurrentTab('dashboard'); setDrawerOpen(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 transition flex items-center gap-3"
                    >
                      <Bookmark className="w-4 h-4 text-[#0F4C9C]" />
                      <span>Vagas Guardadas</span>
                    </button>
                    <button
                      onClick={() => { setCurrentTab('profile'); setDrawerOpen(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 transition flex items-center gap-3"
                    >
                      <FileText className="w-4 h-4 text-[#0F4C9C]" />
                      <span>Meu Currículo & Perfil</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => { setCurrentTab('dashboard'); setDrawerOpen(false); }}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 transition flex items-center gap-3"
                >
                  <Bell className="w-4 h-4 text-[#0F4C9C]" />
                  <span>Notificações</span>
                </button>

                <button
                  onClick={() => { setCurrentTab('dashboard'); setDrawerOpen(false); }}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 transition flex items-center gap-3"
                >
                  <Settings className="w-4 h-4 text-[#0F4C9C]" />
                  <span>Configurações</span>
                </button>

                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    window.dispatchEvent(new CustomEvent('open-pwa-install'));
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-[#0F4C9C] transition flex items-center gap-3 border border-amber-200"
                >
                  <Download className="w-4 h-4 text-[#FFC20E]" />
                  <span className="font-bold text-slate-900">Instalar Aplicação</span>
                </button>
              </div>

              {/* Role switcher toggle */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Tipo de Perfil</span>
                <button
                  onClick={() => {
                    onSwitchAccountRole();
                    setDrawerOpen(false);
                  }}
                  className="w-full bg-white hover:bg-blue-50 border border-slate-200 text-[#0F4C9C] font-bold px-3 py-2 rounded-xl text-xs transition flex items-center justify-center gap-2"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>{isEmployer ? 'Alternar para Candidato' : 'Alternar para Empresa'}</span>
                </button>
              </div>
            </div>

            {/* Logout */}
            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  onLogout();
                  setDrawerOpen(false);
                }}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Terminar Sessão</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
