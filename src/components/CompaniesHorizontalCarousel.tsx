import React, { useRef, useState, useEffect } from 'react';
import { Building2, ChevronLeft, ChevronRight, ShieldCheck, MapPin, Briefcase, ExternalLink, ArrowRight, Star } from 'lucide-react';
import { UserProfile } from '../lib/types';
import { StoreService } from '../lib/store';

interface CompaniesHorizontalCarouselProps {
  companies: UserProfile[];
  onSelectCompany: (company: UserProfile) => void;
  onViewAll?: () => void;
  title?: string;
  subtitle?: string;
}

export const CompaniesHorizontalCarousel: React.FC<CompaniesHorizontalCarouselProps> = ({
  companies,
  onSelectCompany,
  onViewAll,
  title = 'Empresas Registadas na Plataforma',
  subtitle = 'Conheça as empresas, produtores e empregadores locais no Cunene'
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Check scroll positions
  const updateScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    updateScrollButtons();
    return () => el.removeEventListener('scroll', updateScrollButtons);
  }, [companies]);

  // Gentle, non-intrusive continuous auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || companies.length <= 2) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const step = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      if (!isPaused && el) {
        // Slow, smooth ambient drift (~24 pixels per second)
        const move = (24 * delta) / 1000;
        el.scrollLeft += move;

        // Loop seamlessly when near end
        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
          el.scrollLeft = 0;
        }
      }
      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused, companies.length]);

  const scrollByAmount = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -320 : 320;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  if (!companies || companies.length === 0) return null;

  return (
    <section 
      aria-label="Carrossel de Empresas Registadas"
      className="max-w-7xl mx-auto px-4 sm:px-6 my-8 space-y-3.5 select-none"
    >
      {/* Header com estilo moderno e discreto */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0F4C9C] flex items-center justify-center border border-blue-100 shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="truncate">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight truncate flex items-center gap-2">
              <span>{title}</span>
              <span className="text-[11px] font-bold text-[#0F4C9C] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 hidden sm:inline-block">
                {companies.length} ativas
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 truncate hidden xs:block">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Controlos de navegação sutis (não invasivos) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="text-xs font-bold text-[#0F4C9C] hover:text-[#0c3c7d] hover:bg-blue-50/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer mr-1"
            >
              Ver todas
            </button>
          )}

          <button
            type="button"
            onClick={() => scrollByAmount('left')}
            disabled={!canScrollLeft}
            aria-label="Rolar para esquerda"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-slate-700 flex items-center justify-center transition shadow-2xs cursor-pointer active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => scrollByAmount('right')}
            disabled={!canScrollRight}
            aria-label="Rolar para direita"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-slate-700 flex items-center justify-center transition shadow-2xs cursor-pointer active:scale-95"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Trilha do Carrossel Horizontal Moderno */}
      <div
        ref={scrollRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setTimeout(() => setIsPaused(false), 2000)}
        className="flex items-stretch gap-3.5 overflow-x-auto no-scrollbar scroll-smooth py-1.5 px-0.5 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {companies.map(company => {
          const compName = company.company_name || company.company?.name || company.full_name || 'Empresa';
          const logo = company.company?.logo_url || company.company_logo || company.avatar_url;
          const cover = company.company?.cover_url || company.cover_url;
          const municipality = company.municipality || company.company?.municipality || 'Cunene';
          const industry = company.industry || company.company?.industry || 'Comércio & Serviços';

          return (
            <div
              key={company.id}
              onClick={() => onSelectCompany(company)}
              className="w-[240px] sm:w-[260px] shrink-0 snap-start bg-white rounded-2xl border border-slate-200/90 hover:border-[#0F4C9C]/40 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between overflow-hidden active:scale-[0.98]"
            >
              {/* Top mini-cover */}
              <div className="h-16 w-full bg-gradient-to-r from-[#0F4C9C] to-slate-800 relative overflow-hidden">
                {cover ? (
                  <img
                    src={cover}
                    alt={compName}
                    className="w-full h-full object-cover opacity-75 group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-blue-900 to-slate-900 opacity-90" />
                )}
                <div className="absolute top-2 right-2 bg-slate-950/70 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/10">
                  <MapPin className="w-2.5 h-2.5 text-[#FFC20E]" />
                  <span>{municipality}</span>
                </div>
              </div>

              {/* Company Info */}
              <div className="p-3.5 pt-0 relative flex-1 flex flex-col justify-between">
                <div>
                  {/* Floating Logo */}
                  <div className="w-11 h-11 rounded-xl bg-white p-0.5 border-2 border-white shadow-xs -mt-5 mb-2 overflow-hidden shrink-0 flex items-center justify-center">
                    {logo ? (
                      <img
                        src={logo}
                        alt={compName}
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-[#0F4C9C] text-white flex items-center justify-center font-black text-xs rounded-lg">
                        {compName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Name and Sector */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate group-hover:text-[#0F4C9C] transition-colors">
                        {compName}
                      </h3>
                      <span title="Empresa Verificada" className="inline-flex shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{industry}</span>
                    </p>

                    {/* Classificação em Estrelas & Selo de Parceiro */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <div className="flex items-center text-amber-500">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-[10px] font-black text-amber-900 ml-1">
                          {StoreService.getCompanyRatingStats(company.id).average.toFixed(1)}
                        </span>
                        <span className="text-[9px] text-slate-400 ml-0.5 font-bold">
                          ({StoreService.getCompanyRatingStats(company.id).count})
                        </span>
                      </div>
                      {StoreService.isUserPartner(company.id).isPartner && (
                        <span className="text-[9px] font-black text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded-md border border-amber-200/70">
                          🤝 Parceiro
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Slogan / Services snippet */}
                  {company.bio && (
                    <p className="text-[10px] text-slate-600 line-clamp-2 mt-1.5 leading-relaxed">
                      {company.bio}
                    </p>
                  )}
                </div>

                {/* Card Action Link */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-[#0F4C9C] group-hover:text-blue-800">
                  <span>Ver vitrine & vagas</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
