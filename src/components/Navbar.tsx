import React, { useState, useEffect } from "react";
import {
  BriefcaseBusiness,
  Search,
  ArrowLeftRight,
  Bell,
  Menu,
  X,
  UserRound,
  Briefcase,
  ShoppingBag,
  Users,
  Building2,
  LogOut,
  PlusCircle,
  Bookmark,
  FileText,
  Settings,
  Store,
  Download,
  ShieldCheck,
  Smartphone,
  Home,
  Award,
  ExternalLink,
} from "lucide-react";
import { UserProfile } from "../lib/types";
import { StoreService } from "../lib/store";
import { isInsideAPKApp, APK_DOWNLOAD_URL } from "../lib/apkUtils";
import { PWAInstallButton } from "./PWAInstallButton";
import { ProfileAvatar } from "./ProfileAvatar";

export interface NavbarProps {
  user?: UserProfile | null;
  profile?: UserProfile | any;
  onLogin?: () => void;
  onRegister?: () => void;
  onSwitchMode?: () => void;
  onNotifications?: () => void;
  onProfile?: () => void;
  onMenu?: () => void;
  onSearch?: () => void;
  activeMode?: "candidato" | "empresa";
  notificationCount?: number;

  // Compatibilidade com props já existentes no App.tsx
  currentTab?: string;
  setCurrentTab?: (tab: string) => void;
  currentUser?: UserProfile | null;
  onOpenAuth?: (mode?: "login" | "register") => void;
  onLogout?: () => void;
  onOpenNewJob?: () => void;
  onOpenNewProduct?: () => void;
  onSwitchAccountRole?: () => void;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  isPCMode?: boolean;
  onTogglePCMode?: () => void;
}

export function Navbar({
  user,
  profile,
  onLogin,
  onRegister,
  onSwitchMode,
  onNotifications,
  onProfile,
  onMenu,
  onSearch,
  activeMode,
  notificationCount,
  currentTab,
  setCurrentTab,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenNewJob,
  onOpenNewProduct,
  onSwitchAccountRole,
  unreadNotificationsCount,
  onOpenNotifications,
}: NavbarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const resolvedUser = user ?? currentUser ?? null;
  const resolvedProfile = profile ?? resolvedUser;
  const authenticated = Boolean(resolvedUser);

  const resolvedMode: "candidato" | "empresa" =
    activeMode ?? (resolvedUser?.role === "employer" ? "empresa" : "candidato");
  const isEmployer = resolvedMode === "empresa";
  const isAdmin = StoreService.isAdmin(resolvedUser);
  const resolvedNotificationCount =
    notificationCount ?? unreadNotificationsCount ?? 0;

  // Fotografia real do utilizador (separada por perfil Candidato vs Empresa)
  const avatarUrl = isEmployer
    ? resolvedProfile?.company?.logo_url ||
      resolvedProfile?.company_logo ||
      undefined
    : resolvedProfile?.avatar_url ||
      resolvedProfile?.photo_url ||
      undefined;

  useEffect(() => {
    setAvatarError(false);
  }, [avatarUrl, resolvedMode]);

  const handleBrandClick = () => {
    if (setCurrentTab) {
      setCurrentTab("home");
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSearchClick = () => {
    if (onSearch) {
      onSearch();
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-explore-search"));
    }
  };

  const handleLoginClick = () => {
    if (onLogin) {
      onLogin();
    } else if (onOpenAuth) {
      onOpenAuth("login");
    }
  };

  const handleRegisterClick = () => {
    if (onRegister) {
      onRegister();
    } else if (onOpenAuth) {
      onOpenAuth("register");
    }
  };

  const handleSwitchClick = () => {
    if (onSwitchMode) {
      onSwitchMode();
    } else if (onSwitchAccountRole) {
      onSwitchAccountRole();
    }
  };

  const handleNotificationsClick = () => {
    if (onNotifications) {
      onNotifications();
    } else if (onOpenNotifications) {
      onOpenNotifications();
    }
  };

  const handleProfileClick = () => {
    if (onProfile) {
      onProfile();
    } else if (setCurrentTab) {
      setCurrentTab("profile");
    }
  };

  const handleMenuClick = () => {
    setDrawerOpen(true);
    if (onMenu) {
      onMenu();
    }
  };

  const navigateTo = (tab: string) => {
    if (setCurrentTab) {
      setCurrentTab(tab);
    }
    setDrawerOpen(false);
  };

  const displayName = isEmployer
    ? resolvedUser?.company?.name ||
      resolvedUser?.company_name ||
      resolvedUser?.full_name ||
      "Empresa"
    : resolvedUser?.full_name || "Candidato";

  return (
    <>
      <header className="cv-header pt-safe">
        <div className="cv-header-inner">
          <button
            type="button"
            className="cv-brand"
            onClick={handleBrandClick}
            aria-label="Página inicial"
          >
            <span className="cv-brand-icon">
              <BriefcaseBusiness size={29} />
            </span>

            <span className="cv-brand-name">
              Cunene<span>Vagas</span>
            </span>
          </button>

          <div className="cv-header-actions flex items-center gap-2">
            <PWAInstallButton />
            <button
              type="button"
              className="cv-icon-button"
              onClick={handleSearchClick}
              aria-label="Pesquisar"
              title="Pesquisar na CuneneVagas"
            >
              <Search size={23} />
            </button>

            {!authenticated ? (
              <>
                <button
                  type="button"
                  className="cv-login-button"
                  onClick={handleLoginClick}
                >
                  Entrar
                </button>

                <button
                  type="button"
                  className="cv-register-button"
                  onClick={handleRegisterClick}
                >
                  Registar
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="cv-icon-button"
                  onClick={handleSwitchClick}
                  aria-label="Alternar perfil"
                  title={
                    isEmployer
                      ? "Modo empresa — Mudar para Candidato"
                      : "Modo candidato — Mudar para Empresa"
                  }
                >
                  <ArrowLeftRight size={22} />
                </button>

                <button
                  type="button"
                  className="cv-icon-button cv-notification"
                  onClick={handleNotificationsClick}
                  aria-label="Notificações"
                  title="Notificações"
                >
                  <Bell size={22} />
                  {resolvedNotificationCount > 0 && (
                    <span className="cv-notification-count">
                      {resolvedNotificationCount > 99
                        ? "99+"
                        : resolvedNotificationCount}
                    </span>
                  )}
                </button>

                <div
                  onClick={handleProfileClick}
                  className="cv-avatar-button cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label="Meu perfil"
                  title={isEmployer ? "Perfil da Empresa" : "Perfil do Candidato"}
                >
                  <ProfileAvatar user={resolvedProfile} userId={resolvedProfile?.id} size="md" />
                </div>

                <button
                  type="button"
                  className="cv-icon-button"
                  onClick={handleMenuClick}
                  aria-label="Abrir menu"
                  title="Menu de Navegação"
                >
                  <Menu size={25} />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Menu Secundário Elegante (Black & Gold Drawer) */}
      {drawerOpen && authenticated && (
        <div
          className="fixed inset-0 z-[1100] flex justify-end bg-black/75 backdrop-blur-xs animate-fadeIn"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="bg-[#0d0c09] border-l border-[#e6c34f]/25 w-full max-w-xs h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto text-[#f8f5eb]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              {/* Cabeçalho do Drawer */}
              <div className="flex items-center justify-between border-b pb-4 border-[#e6c34f]/20">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-[#17150f] border-2 border-[#e6c34f] text-[#e6c34f] flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                    {avatarUrl && !avatarError ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-full h-full object-cover"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <span>{displayName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#f5dc85] truncate">
                      {displayName}
                    </h3>
                    <span className="text-[11px] text-[#e6c34f] font-semibold block">
                      {isEmployer ? "Modo Empresa Oficial" : "Modo Candidato"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Fechar menu"
                  className="cv-drawer-btn p-2 rounded-xl text-[#aaa69a] hover:text-[#f5dc85] bg-[#14130f] border border-[#e6c34f]/20 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navegação Principal */}
              <div className="space-y-1.5 text-sm font-bold">
                <span className="text-[10px] font-bold text-[#aaa69a] uppercase tracking-wider px-2 block mb-1">
                  Navegação
                </span>

                {[
                  { id: "home", label: "Início", icon: Home },
                  { id: "jobs", label: "Vagas de Emprego", icon: Briefcase },
                  { id: "companies", label: "Empresas", icon: Building2 },
                  { id: "marketplace", label: "Marketplace", icon: ShoppingBag },
                  { id: "community", label: "Comunidade / Feed", icon: Users },
                  { id: "candidates", label: "Talentos & Candidatos", icon: UserRound },
                  { id: "exams", label: "Centro de Exames", icon: Award },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.id)}
                    className={`cv-drawer-btn w-full text-left px-3.5 py-2.5 rounded-xl transition flex items-center gap-3 border ${
                      currentTab === item.id
                        ? "bg-[#e6c34f]/15 text-[#f5dc85] border-[#e6c34f]/40"
                        : "bg-transparent text-[#f8f5eb] border-transparent hover:bg-[#17150f] hover:border-[#e6c34f]/20"
                    }`}
                  >
                    <item.icon className="w-4 h-4 text-[#e6c34f] shrink-0" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Área da Conta & Ações */}
              <div className="space-y-1.5 text-sm font-bold pt-2 border-t border-[#e6c34f]/15">
                <span className="text-[10px] font-bold text-[#aaa69a] uppercase tracking-wider px-2 block mb-1">
                  Minha Conta
                </span>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => navigateTo("dashboard")}
                    className="cv-drawer-btn w-full text-left px-3.5 py-2.5 rounded-xl bg-[#e6c34f]/15 hover:bg-[#e6c34f]/25 text-[#f5dc85] font-black transition flex items-center justify-between border border-[#e6c34f]/40 mb-1"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-[#e6c34f]" />
                      <span>Painel de Administração</span>
                    </div>
                    <span className="text-[10px] font-black uppercase bg-[#e6c34f] text-[#080808] px-2 py-0.5 rounded-full">
                      Admin
                    </span>
                  </button>
                )}

                {isEmployer ? (
                  <>
                    <button
                      type="button"
                      onClick={() => navigateTo("dashboard")}
                      className="cv-drawer-btn w-full text-left px-3.5 py-2.5 rounded-xl bg-transparent hover:bg-[#17150f] text-[#f8f5eb] border border-transparent hover:border-[#e6c34f]/20 transition flex items-center gap-3"
                    >
                      <Building2 className="w-4 h-4 text-[#e6c34f]" />
                      <span>Painel da Empresa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo("profile")}
                      className="cv-drawer-btn w-full text-left px-3.5 py-2.5 rounded-xl bg-transparent hover:bg-[#17150f] text-[#f8f5eb] border border-transparent hover:border-[#e6c34f]/20 transition flex items-center gap-3"
                    >
                      <Store className="w-4 h-4 text-[#e6c34f]" />
                      <span>Perfil & Loja da Empresa</span>
                    </button>
                    {onOpenNewJob && (
                      <button
                        type="button"
                        onClick={() => {
                          setDrawerOpen(false);
                          onOpenNewJob();
                        }}
                        className="cv-drawer-btn w-full text-left px-3.5 py-2.5 rounded-xl bg-[#e6c34f]/10 hover:bg-[#e6c34f]/20 text-[#f5dc85] border border-[#e6c34f]/30 transition flex items-center gap-3"
                      >
                        <PlusCircle className="w-4 h-4 text-[#e6c34f]" />
                        <span>Publicar Nova Vaga</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => navigateTo("dashboard")}
                      className="cv-drawer-btn w-full text-left px-3.5 py-2.5 rounded-xl bg-transparent hover:bg-[#17150f] text-[#f8f5eb] border border-transparent hover:border-[#e6c34f]/20 transition flex items-center gap-3"
                    >
                      <Bookmark className="w-4 h-4 text-[#e6c34f]" />
                      <span>Minhas Candidaturas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo("profile")}
                      className="cv-drawer-btn w-full text-left px-3.5 py-2.5 rounded-xl bg-transparent hover:bg-[#17150f] text-[#f8f5eb] border border-transparent hover:border-[#e6c34f]/20 transition flex items-center gap-3"
                    >
                      <FileText className="w-4 h-4 text-[#e6c34f]" />
                      <span>Meu Currículo & Perfil</span>
                    </button>
                  </>
                )}

                {onOpenNewProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      onOpenNewProduct();
                    }}
                    className="cv-drawer-btn w-full text-left px-3.5 py-2.5 rounded-xl bg-transparent hover:bg-[#17150f] text-[#f5dc85] border border-transparent hover:border-[#e6c34f]/20 transition flex items-center gap-3"
                  >
                    <PlusCircle className="w-4 h-4 text-[#e6c34f]" />
                    <span>+ Criar Anúncio</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    handleNotificationsClick();
                  }}
                  className="cv-drawer-btn w-full text-left px-3.5 py-2.5 rounded-xl bg-transparent hover:bg-[#17150f] text-[#f8f5eb] border border-transparent hover:border-[#e6c34f]/20 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-[#e6c34f]" />
                    <span>Notificações</span>
                  </div>
                  {resolvedNotificationCount > 0 && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#e6c34f] text-[#080808]">
                      {resolvedNotificationCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo("dashboard")}
                  className="cv-drawer-btn w-full text-left px-3.5 py-2.5 rounded-xl bg-transparent hover:bg-[#17150f] text-[#f8f5eb] border border-transparent hover:border-[#e6c34f]/20 transition flex items-center gap-3"
                >
                  <Settings className="w-4 h-4 text-[#e6c34f]" />
                  <span>Configurações</span>
                </button>

                <a
                  href="https://konectaangola.netlify.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setDrawerOpen(false)}
                  className="cv-drawer-btn w-full text-left px-3.5 py-2.5 rounded-xl bg-[#14130f] hover:bg-[#201d14] text-[#f5dc85] transition flex items-center justify-between border border-[#e6c34f]/30 cursor-pointer my-1"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-xs">Konecta Angola</span>
                    <span className="text-[10px] text-[#aaa69a]">Plataforma mãe</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#e6c34f] shrink-0" />
                </a>

                {!isInsideAPKApp() && (
                  <a
                    href={APK_DOWNLOAD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setDrawerOpen(false)}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl bg-[#14130f] hover:bg-[#201d14] text-[#f5dc85] transition flex items-center justify-between border border-[#e6c34f]/30 cursor-pointer my-1"
                  >
                    <div className="flex items-center gap-2.5">
                      <Smartphone className="w-4 h-4 text-[#e6c34f]" />
                      <span className="font-bold text-xs">
                        Baixar App Android (.APK)
                      </span>
                    </div>
                    <Download className="w-4 h-4 text-[#e6c34f]" />
                  </a>
                )}
              </div>

              {/* Alternar Tipo de Perfil */}
              <div className="p-3.5 bg-[#14130f] rounded-2xl border border-[#e6c34f]/25 space-y-2">
                <span className="text-[11px] font-bold text-[#aaa69a] uppercase tracking-wider block">
                  Tipo de Perfil ({isEmployer ? "Empresa" : "Candidato"})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    handleSwitchClick();
                    setDrawerOpen(false);
                  }}
                  className="cv-drawer-btn w-full bg-[#17150f] hover:bg-[#201d14] border border-[#e6c34f]/30 text-[#f5dc85] font-bold px-3 py-2 rounded-xl text-xs transition flex items-center justify-center gap-2"
                >
                  <ArrowLeftRight className="w-4 h-4 text-[#e6c34f]" />
                  <span>
                    {isEmployer
                      ? "Alternar para Candidato"
                      : "Alternar para Empresa"}
                  </span>
                </button>
              </div>
            </div>

            {/* Terminar Sessão */}
            <div className="pt-4 mt-6 border-t border-[#e6c34f]/20">
              <button
                type="button"
                onClick={() => {
                  onLogout?.();
                  setDrawerOpen(false);
                }}
                className="cv-drawer-btn w-full bg-[#1a1111] hover:bg-[#2a1515] border border-red-500/30 text-red-400 font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2"
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
}

export default Navbar;
