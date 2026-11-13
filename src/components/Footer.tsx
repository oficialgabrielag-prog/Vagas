import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Monitor,
  UserRound,
  Clock,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  ShieldCheck
} from 'lucide-react';
import { UserProfile, MarketplaceProduct, CUNENE_MUNICIPALITIES } from '../lib/types';

interface FooterProps {
  products?: MarketplaceProduct[];
  companies?: UserProfile[];
  featuredCandidates?: UserProfile[];
  onSelectCompany?: (company: UserProfile) => void;
  onSelectCandidate?: (candidate: UserProfile) => void;
  onSelectProduct?: (product: MarketplaceProduct) => void;
  onOpenNewProduct?: () => void;
  isPCMode?: boolean;
  onTogglePCMode?: () => void;
  setCurrentTab?: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  featuredCandidates = [],
  onSelectCandidate,
  isPCMode = false,
  onTogglePCMode,
  setCurrentTab
}) => {
  const [activeCandidateIndex, setActiveCandidateIndex] = useState(0);
  const [slideInterval, setSlideInterval] = useState<number>(5000);
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});

  // Apenas perfis reais de candidatos registados na plataforma
  const validCandidates = featuredCandidates.filter(
    (c) => c && c.full_name && c.full_name.trim().length > 1
  );

  const totalCandidates = validCandidates.length;

  const handlePrevCandidate = () => {
    if (totalCandidates === 0) return;
    setActiveCandidateIndex((prev) => (prev === 0 ? totalCandidates - 1 : prev - 1));
  };

  const handleNextCandidate = () => {
    if (totalCandidates === 0) return;
    setActiveCandidateIndex((prev) => (prev + 1) % totalCandidates);
  };

  useEffect(() => {
    if (totalCandidates <= 1) return;
    const timer = setInterval(() => {
      setActiveCandidateIndex((prev) => (prev + 1) % totalCandidates);
    }, slideInterval);
    return () => clearInterval(timer);
  }, [totalCandidates, slideInterval]);

  const handleNavClick = (tab: string) => {
    if (setCurrentTab) {
      setCurrentTab(tab);
    } else {
      window.dispatchEvent(new CustomEvent('navigate-tab', { detail: { tab } }));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const visibleCandidates: UserProfile[] = [];
  if (totalCandidates > 0) {
    const countToShow = Math.min(3, totalCandidates);
    for (let i = 0; i < countToShow; i++) {
      const idx = (activeCandidateIndex + i) % totalCandidates;
      visibleCandidates.push(validCandidates[idx]);
    }
  }

  return (
    <footer className="mt-auto relative w-full bg-[#080808]">
      {/* Silhueta superior em raio com detalhe dourado */}
      <div className="relative w-full overflow-hidden leading-none select-none pointer-events-none -mb-px">
        <svg
          viewBox="0 0 1200 48"
          preserveAspectRatio="none"
          className="w-full h-8 sm:h-12 block"
        >
          <path
            d="M0,48 L0,22 L380,22 L430,44 L465,8 L525,36 L580,0 L1200,0 L1200,48 Z"
            fill="#121212"
          />
          <path
            d="M0,22 L380,22 L430,44 L465,8 L525,36 L580,0 L1200,0"
            stroke="#D4AF37"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>

      {/* Corpo do rodapé preto premium */}
      <div className="bg-[#121212] text-[#F5F1E7] pt-8 pb-10 border-t border-[#D4AF37]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* SECÇÃO 1: CANDIDATOS EM DESTAQUE ROTATIVOS */}
          <div className="bg-[#181510] border border-[#D4AF37]/30 rounded-3xl p-5 sm:p-6 mb-10 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
                <span className="text-xs font-black tracking-widest text-[#F5D77A] uppercase">
                  Talentos Verificados
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                Candidatos em Destaque no Cunene
              </h3>
              <p className="text-xs text-[#BDB29F]">
                Profissionais qualificados prontos para novas oportunidades na província.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto justify-center">
              {totalCandidates > 0 ? (
                <div className="flex items-center gap-2.5 overflow-x-auto py-1 max-w-full">
                  <button
                    type="button"
                    onClick={handlePrevCandidate}
                    className="p-2 rounded-xl bg-[#121212] text-[#F5D77A] border border-[#D4AF37]/30 hover:bg-[#201A12] transition cursor-pointer shrink-0 active:scale-[0.96]"
                    title="Candidato anterior"
                    aria-label="Candidato anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {visibleCandidates.map((cand) => {
                      const avatar = cand.avatar_url && !failedAvatars[cand.id] ? cand.avatar_url : '';
                      const name = cand.full_name || 'Candidato';
                      const roleLabel =
                        cand.profession ||
                        (Array.isArray(cand.skills) && cand.skills[0]) ||
                        cand.municipality ||
                        'Profissional';
                      return (
                        <button
                          key={cand.id}
                          type="button"
                          onClick={() =>
                            onSelectCandidate ? onSelectCandidate(cand) : handleNavClick('candidates')
                          }
                          className="cv-card-pressable bg-[#121212] text-[#F5F1E7] border border-[#D4AF37]/30 hover:border-[#D4AF37] rounded-2xl px-3.5 py-2.5 h-14 flex items-center gap-3 transition-all duration-150 cursor-pointer shrink-0 max-w-[220px] text-left active:scale-[0.96] shadow-md"
                          title={`${name} · ${roleLabel}`}
                        >
                          <div className="w-9 h-9 rounded-full bg-[#1C1811] border border-[#D4AF37]/50 flex items-center justify-center overflow-hidden shrink-0">
                            {avatar ? (
                              <img
                                src={avatar}
                                alt={name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                                onError={() =>
                                  setFailedAvatars((prev) => ({ ...prev, [cand.id]: true }))
                                }
                              />
                            ) : (
                              <span className="text-xs font-black text-[#D4AF37]">
                                {name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-[#F5D77A] truncate block">
                              {name}
                            </span>
                            <span className="text-[10px] text-[#BDB29F] truncate block">
                              {roleLabel}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleNextCandidate}
                    className="p-2 rounded-xl bg-[#121212] text-[#F5D77A] border border-[#D4AF37]/30 hover:bg-[#201A12] transition cursor-pointer shrink-0 active:scale-[0.96]"
                    title="Próximo candidato"
                    aria-label="Próximo candidato"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleNavClick('candidates')}
                  className="cv-card-pressable text-xs text-[#F5D77A] bg-[#121212] border border-[#D4AF37]/30 hover:border-[#D4AF37] rounded-xl px-4 py-3 inline-flex items-center gap-2 cursor-pointer active:scale-[0.96]"
                >
                  <UserRound className="w-4 h-4 text-[#D4AF37]" />
                  <span>Explorar talentos e candidatos</span>
                </button>
              )}
            </div>
          </div>

          {/* SECÇÃO 2: GRID COMPLETA DO RODAPÉ (4 COLUNAS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-8 pb-10 border-b border-[#26241E]">
            
            {/* Coluna 1: Marca & Plataforma Mãe */}
            <div className="lg:col-span-4 space-y-4">
              <button
                type="button"
                className="cv-editorial-btn flex items-center space-x-2.5 cursor-pointer inline-flex active:scale-[0.96] transition-transform"
                onClick={() => handleNavClick('home')}
              >
                <div className="w-10 h-10 bg-[#1C1811] border border-[#D4AF37]/40 rounded-xl flex items-center justify-center shrink-0">
                  <Briefcase className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div className="text-2xl font-black tracking-tight">
                  <span className="text-[#F5F1E7]">Cunene</span>
                  <span className="text-[#D4AF37]">Vagas</span>
                </div>
              </button>

              <p className="text-xs sm:text-sm text-[#BDB29F] leading-relaxed">
                A maior rede de oportunidades profissionais, vagas de emprego, comércio local e exames de mérito na Província do Cunene, Angola.
              </p>

              <div className="pt-2">
                <a
                  href="https://konectaangola.netlify.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Aceder à plataforma mãe Konecta Angola (abre num novo separador)"
                  className="cv-card-pressable inline-flex items-center gap-2 text-xs font-bold text-[#F5D77A] bg-[#18140E] hover:bg-[#231D13] border border-[#D4AF37]/40 hover:border-[#D4AF37] px-4 py-2.5 rounded-xl transition active:scale-[0.96] shadow-xs"
                >
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#D4AF37]">
                    Plataforma mãe
                  </span>
                  <span className="text-[#574322]">•</span>
                  <span className="tracking-tight text-[#F5F1E7]">Konecta Angola</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                </a>
              </div>
            </div>

            {/* Coluna 2: Municípios & Cobertura */}
            <div className="lg:col-span-3 space-y-3 text-xs">
              <h4 className="font-extrabold text-[#F5D77A] tracking-wider uppercase text-[11px]">
                Municípios do Cunene
              </h4>
              <ul className="grid grid-cols-2 gap-2 text-[#BDB29F]">
                {CUNENE_MUNICIPALITIES.map((mun) => (
                  <li key={mun}>
                    <button
                      type="button"
                      onClick={() => handleNavClick('jobs')}
                      className="cv-editorial-btn hover:text-[#F5D77A] transition flex items-center gap-1.5 cursor-pointer text-left"
                    >
                      <MapPin className="w-3 h-3 text-[#D4AF37] shrink-0" />
                      <span>{mun}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Coluna 3: Navegação Principal */}
            <div className="lg:col-span-2 space-y-3 text-xs">
              <h4 className="font-extrabold text-[#F5D77A] tracking-wider uppercase text-[11px]">
                Navegação
              </h4>
              <ul className="space-y-2 text-[#BDB29F]">
                <li>
                  <button
                    type="button"
                    onClick={() => handleNavClick('jobs')}
                    className="cv-editorial-btn hover:text-[#F5D77A] transition cursor-pointer active:scale-[0.96]"
                  >
                    Vagas de Emprego
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleNavClick('marketplace')}
                    className="cv-editorial-btn hover:text-[#F5D77A] transition cursor-pointer active:scale-[0.96]"
                  >
                    Marketplace & Negócios
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleNavClick('companies')}
                    className="cv-editorial-btn hover:text-[#F5D77A] transition cursor-pointer active:scale-[0.96]"
                  >
                    Empresas Parceiras
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleNavClick('candidates')}
                    className="cv-editorial-btn hover:text-[#F5D77A] transition cursor-pointer active:scale-[0.96]"
                  >
                    Candidatos & Talentos
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleNavClick('community')}
                    className="cv-editorial-btn hover:text-[#F5D77A] transition cursor-pointer active:scale-[0.96]"
                  >
                    Feed da Comunidade
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleNavClick('exams')}
                    className="cv-editorial-btn hover:text-[#F5D77A] transition cursor-pointer active:scale-[0.96]"
                  >
                    Centro de Exames
                  </button>
                </li>
              </ul>
            </div>

            {/* Coluna 4: Contacto & Suporte */}
            <div className="lg:col-span-3 space-y-3 text-xs">
              <h4 className="font-extrabold text-[#F5D77A] tracking-wider uppercase text-[11px]">
                Contacto & Suporte
              </h4>
              <ul className="space-y-2.5 text-[#BDB29F]">
                <li>
                  <a
                    href="tel:+244976848444"
                    className="hover:text-[#F5D77A] transition flex items-center gap-2"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                    <span>+244 976 848 444</span>
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:oficialgabrielag@gmail.com"
                    className="hover:text-[#F5D77A] transition flex items-center gap-2"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                    <span>oficialgabrielag@gmail.com</span>
                  </a>
                </li>
                <li>
                  <span className="flex items-center gap-2 text-[#9E9585]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                    <span>Provinha do Cunene, Ondjiva, Angola</span>
                  </span>
                </li>
                <li className="pt-2">
                  <a
                    href="https://konectaangola.netlify.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#F5D77A] transition inline-flex items-center gap-1 font-bold text-[#D4AF37]"
                  >
                    <span>Konecta Angola (Plataforma mãe)</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </li>
              </ul>
            </div>

          </div>

          {/* SECÇÃO 3: COPYRIGHT, TERMOS E MODO PC */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#BDB29F]">
            <div className="flex flex-wrap items-center gap-3">
              <p>&copy; {new Date().getFullYear()} CuneneVagas. Todos os direitos reservados.</p>

              <a
                href="/terms"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick('terms');
                }}
                className="hover:text-[#F5D77A] underline cursor-pointer"
              >
                Termos de Uso
              </a>
              <span>·</span>
              <a
                href="/privacy"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick('privacy');
                }}
                className="hover:text-[#F5D77A] underline cursor-pointer"
              >
                Privacidade
              </a>
            </div>

            <div className="flex items-center gap-3">
              {onTogglePCMode && (
                <button
                  type="button"
                  onClick={onTogglePCMode}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer border active:scale-[0.96] ${
                    isPCMode
                      ? 'bg-[#201A12] border-[#D4AF37]/60 text-[#F5D77A]'
                      : 'bg-[#181611] border-[#D4AF37]/25 text-[#BDB29F] hover:border-[#D4AF37]/50'
                  }`}
                  title={isPCMode ? 'Desativar Modo PC' : 'Ativar Modo PC'}
                >
                  <Monitor className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Modo PC: {isPCMode ? 'Ativado' : 'Desativado'}</span>
                </button>
              )}
            </div>
          </div>

          {/* SECÇÃO 4: ECOSSISTEMA & PARCEIROS */}
          <div className="mt-6 pt-4 border-t border-[#26241E] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-[#EAE4D7] flex-wrap justify-center sm:justify-start">
              <span className="bg-[#D4AF37] text-[#080808] font-black px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
                Plataforma mãe
              </span>
              <a
                href="https://konectaangola.netlify.app"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Konecta Angola — Plataforma mãe (abre num novo separador)"
                className="cv-card-pressable font-bold text-[#F5D77A] hover:text-[#FFF4CC] hover:underline flex items-center gap-1.5 bg-[#1C1811] px-3 py-1 rounded-lg border border-[#D4AF37]/45 transition hover:border-[#D4AF37] active:scale-[0.96]"
              >
                <span>Konecta Angola</span>
                <ExternalLink className="w-3 h-3 text-[#D4AF37]" />
              </a>

              <span className="text-[#8E887B] hidden sm:inline">•</span>

              <span className="text-[#BDB29F]">Desenvolvido por:</span>
              <a
                href="https://freevdn.netlify.app"
                target="_blank"
                rel="noopener noreferrer"
                className="cv-card-pressable font-bold text-[#F5D77A] hover:underline flex items-center gap-1.5 bg-[#1C1811] px-3 py-1 rounded-lg border border-[#D4AF37]/30 transition hover:border-[#D4AF37] active:scale-[0.96]"
              >
                <span>VDN — Vai Dar Namoro</span>
              </a>
            </div>
            <span className="text-[11px] text-[#8E887B] font-medium">
              Ecossistema Konecta Angola
            </span>
          </div>

        </div>
      </div>
    </footer>
  );
};
