import React, { useState } from 'react';
import { Briefcase, ShoppingBag, Users, Building2, User, UserPlus, LogOut, Menu, X, PlusCircle, ArrowLeftRight, Bell, Bookmark, FileText, Settings, Store, Download, ShieldCheck, Smartphone, Search, Monitor, Sun, Moon } from 'lucide-react';
import { UserProfile } from '../lib/types';
import { StoreService } from '../lib/store';
import { AnimatedBrandLogo } from './AnimatedBrandLogo';
import { isInsideAPKApp, APK_DOWNLOAD_URL } from '../lib/apkUtils';

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
  onOpenNotifications?: () => void;
  isPCMode?: boolean;
  onTogglePCMode?: () => void;
  themeMode?: 'system' | 'light' | 'dark';
  onToggleTheme?: () => void;
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
  unreadNotificationsCount = 0,
  onOpenNotifications,
  isPCMode = false,
  onTogglePCMode,
  themeMode = 'system',
  onToggleTheme
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isEmployer = currentUser?.role === 'employer';
  const isAdmin = StoreService.isAdmin(currentUser);

  return (
    <>
      <header className="bg-white sticky top-0 z-40 border-b border-[#e4e9ef] transition-all pt-safe shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex justify-between h-16 sm:h-[72px] items-center gap-4">
            {/* Brand Logo */}
            <div className="flex items-center space-x-2.5 cursor-pointer shrink-0" onClick={() => setCurrentTab('home')}>
              <div className="w-10 h-10 bg-[#123D73] rounded-xl flex items-center justify-center text-white shadow-xs shrink-0">
                <Briefcase className="w-5 h-5 text-[#F5B91B]" />
              </div>
              <AnimatedBrandLogo mode="periodic" size="md" textColor="#123D73" goldColor="#F5B91B" />
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-6 mx-auto">
              <button
                onClick={() => setCurrentTab('home')}
                className={`py-2 text-sm font-bold transition relative cursor-pointer ${
                  currentTab === 'home' 
                    ? 'text-[#123D73] border-b-2 border-[#F5B91B]' 
                    : 'text-[#66758A] hover:text-[#123D73]'
                }`}
              >
                Início
              </button>
              <button
                onClick={() => setCurrentTab('jobs')}
                className={`py-2 text-sm font-bold transition relative cursor-pointer ${
                  currentTab === 'jobs' 
                    ? 'text-[#123D73] border-b-2 border-[#F5B91B]' 
                    : 'text-[#66758A] hover:text-[#123D73]'
                }`}
              >
                Vagas
              </button>
              <button
                onClick={() => setCurrentTab('community')}
                className={`py-2 text-sm font-bold transition relative cursor-pointer ${
                  currentTab === 'community' 
                    ? 'text-[#123D73] border-b-2 border-[#F5B91B]' 
                    : 'text-[#66758A] hover:text-[#123D73]'
                }`}
              >
                Comunidade
              </button>
              <button
                onClick={() => setCurrentTab('marketplace')}
                className={`py-2 text-sm font-bold transition relative cursor-pointer ${
                  currentTab === 'marketplace' 
                    ? 'text-[#123D73] border-b-2 border-[#F5B91B]' 
                    : 'text-[#66758A] hover:text-[#123D73]'
                }`}
              >
                Marketplace
              </button>
              <button
                onClick={() => setCurrentTab('companies')}
                className={`py-2 text-sm font-bold transition relative cursor-pointer ${
                  currentTab === 'companies' 
                    ? 'text-[#123D73] border-b-2 border-[#F5B91B]' 
                    : 'text-[#66758A] hover:text-[#123D73]'
                }`}
              >
                Empresas
              </button>

              {isAdmin && (
                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    currentTab === 'dashboard'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                  }`}
                  title="Painel do Administrador"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Admin</span>
                </button>
              )}
            </nav>

            {/* Right Action Buttons */}
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              {/* Botão de Modo PC */}
              {onTogglePCMode && (
                <button
                  onClick={onTogglePCMode}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    isPCMode
                      ? 'bg-blue-50 border-blue-200 text-[#0F4C9C] shadow-2xs'
                      : 'bg-white border-[#e4e9ef] text-slate-600 hover:bg-slate-50'
                  }`}
                  title={isPCMode ? 'Modo PC Ativo (Clique para Vista Padrão)' : 'Ativar Modo PC (Tela Larga para Computador)'}
                >
                  <Monitor className="w-3.5 h-3.5 text-[#0F4C9C]" />
                  <span className="hidden sm:inline">{isPCMode ? 'Modo PC' : 'Modo PC'}</span>
                  <span className={`w-2 h-2 rounded-full ${isPCMode ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                </button>
              )}

              {/* Botão de Tema (Dark / Light / Sistema) */}
              {onToggleTheme && (
                <button
                  onClick={onToggleTheme}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border border-[#e4e9ef] bg-white text-slate-600 hover:bg-slate-50 cursor-pointer shadow-2xs"
                  title={`Tema atual: ${themeMode === 'system' ? 'Automático (Sistema)' : themeMode === 'dark' ? 'Escuro (Dark)' : 'Claro (Light)'}. Clique para alternar.`}
                >
                  {themeMode === 'dark' ? (
                    <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  ) : themeMode === 'light' ? (
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <Monitor className="w-3.5 h-3.5 text-[#0F4C9C]" />
                  )}
                  <span className="hidden lg:inline capitalize">
                    {themeMode === 'system' ? 'Auto' : themeMode === 'dark' ? 'Escuro' : 'Claro'}
                  </span>
                </button>
              )}

              {/* Pesquisa (Lupa) */}
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-explore-search'))}
                className="p-2 text-[#66758A] hover:text-[#123D73] hover:bg-slate-100 rounded-lg transition cursor-pointer"
                title="Pesquisar na CuneneVagas"
              >
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Botão + Criar Anúncio no Estilo Canva */}
              {onOpenNewProduct && (
                <button
                  onClick={onOpenNewProduct}
                  className="hidden sm:inline-flex items-center gap-1.5 border border-[#e4e9ef] bg-white hover:bg-slate-50 text-[#101b33] font-bold px-3.5 py-2 rounded-xl text-xs transition active:scale-95 shadow-2xs cursor-pointer"
                  title="Publicar anúncio no Mercado"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-[#1759ad]" />
                  <span>+ Criar anúncio</span>
                </button>
              )}
              
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
                  {/* Notification Bell */}
                  <button
                    onClick={onOpenNotifications}
                    className="relative p-2 text-slate-600 hover:text-[#0F4C9C] hover:bg-slate-100 rounded-xl transition"
                    title="Notificações e Avisos do Sistema"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadNotificationsCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white font-extrabold text-[9px] rounded-full flex items-center justify-center shadow-xs animate-pulse">
                        {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                      </span>
                    )}
                  </button>

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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenAuth('login')}
                    className="border border-slate-300 text-[#263449] hover:bg-slate-50 font-semibold px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition cursor-pointer"
                  >
                    <span>Entrar</span>
                  </button>
                  <button
                    onClick={() => onOpenAuth('register')}
                    className="bg-[#F5B91B] hover:bg-[#e2a814] text-[#123D73] font-bold px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition shadow-xs cursor-pointer"
                  >
                    <span>Registar</span>
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
                {isAdmin && (
                  <button
                    onClick={() => { setCurrentTab('dashboard'); setDrawerOpen(false); }}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-950 font-black transition flex items-center justify-between border border-amber-300 shadow-2xs mb-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>Painel de Administração</span>
                    </div>
                    <span className="text-[10px] font-black uppercase bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                      Admin
                    </span>
                  </button>
                )}
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

                {!isInsideAPKApp() && (
                  <a
                    href={APK_DOWNLOAD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setDrawerOpen(false)}
                    className="w-full text-left px-3 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0F4C9C] transition flex items-center justify-between border border-blue-200/80 cursor-pointer shadow-2xs my-1"
                  >
                    <div className="flex items-center gap-2.5">
                      <Smartphone className="w-4 h-4 text-[#0F4C9C]" />
                      <span className="font-extrabold text-slate-900 text-xs">Baixar App Android (.APK)</span>
                    </div>
                    <Download className="w-4 h-4 text-[#FFC20E]" />
                  </a>
                )}
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
