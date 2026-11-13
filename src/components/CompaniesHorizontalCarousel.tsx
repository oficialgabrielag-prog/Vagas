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
          <div className="w-8 h-8 rounded-xl bg-[#1C1811] text-[#D4AF37] flex items-center justify-center border border-[#D4AF37]/30 shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="truncate">
            <h2 className="text-sm sm:text-base font-extrabold text-[#F5D77A] tracking-tight truncate flex items-center gap-2">
              <span>{title}</span>
              <span className="text-[11px] font-bold text-[#F5D77A] bg-[#1C1811] px-2 py-0.5 rounded-full border border-[#D4AF37]/30 hidden sm:inline-block">
                {companies.length} ativas
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-[#BDB29F] truncate hidden xs:block">
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
              className="text-xs font-bold text-[#D4AF37] hover:text-[#F5D77A] hover:bg-[#1C1811] px-2.5 py-1 rounded-lg transition-colors cursor-pointer mr-1"
            >
              Ver todas
            </button>
          )}

          <button
            type="button"
            onClick={() => scrollByAmount('left')}
            disabled={!canScrollLeft}
            aria-label="Rolar para esquerda"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#D4AF37]/25 bg-[#121212] hover:bg-[#1C1811] disabled:opacity-30 disabled:pointer-events-none text-[#F5D77A] flex items-center justify-center transition shadow-2xs cursor-pointer active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollByAmount('right')}
            disabled={!canScrollRight}
            aria-label="Rolar para direita"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#D4AF37]/25 bg-[#121212] hover:bg-[#1C1811] disabled:opacity-30 disabled:pointer-events-none text-[#F5D77A] flex items-center justify-center transition shadow-2xs cursor-pointer active:scale-95"
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
              className="cv-card-pressable w-[240px] sm:w-[260px] shrink-0 snap-start bg-[#121212] rounded-2xl border border-[#D4AF37]/25 hover:border-[#D4AF37] shadow-lg hover:shadow-[#D4AF37]/15 transition-all duration-150 cursor-pointer group flex flex-col justify-between overflow-hidden active:scale-[0.96]"
            >
              {/* Top mini-cover */}
              <div className="h-16 w-full bg-gradient-to-r from-[#2A200A] via-[#1A160F] to-[#080808] relative overflow-hidden">
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
                  <div className="w-full h-full bg-gradient-to-r from-[#2A200A] via-[#1A160F] to-[#080808] opacity-90" />
                )}
                <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md text-[#F5D77A] text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-[#D4AF37]/30">
                  <MapPin className="w-2.5 h-2.5 text-[#D4AF37]" />
                  <span>{municipality}</span>
                </div>
              </div>

              {/* Company Info */}
              <div className="p-3.5 pt-0 relative flex-1 flex flex-col justify-between">
                <div>
                  {/* Floating Logo */}
                  <div className="w-11 h-11 rounded-xl bg-[#181818] p-0.5 border border-[#D4AF37]/40 shadow-xs -mt-5 mb-2 overflow-hidden shrink-0 flex items-center justify-center">
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
                      <div className="w-full h-full bg-[#D4AF37] text-slate-950 flex items-center justify-center font-black text-xs rounded-lg">
                        {compName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Name and Sector */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs sm:text-sm font-extrabold text-white truncate group-hover:text-[#F5D77A] transition-colors">
                        {compName}
                      </h3>
                      <span title="Empresa Verificada" className="inline-flex shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                      </span>
                    </div>
                    <p className="text-[11px] text-[#BDB29F] font-medium truncate flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-[#D4AF37]/70 shrink-0" />
                      <span>{industry}</span>
                    </p>

                    {/* Classificação em Estrelas & Selo de Parceiro */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <div className="flex items-center text-[#F5D77A]">
                        <Star className="w-3 h-3 fill-[#F5D77A] text-[#F5D77A]" />
                        <span className="text-[10px] font-black text-[#F5D77A] ml-1">
                          {StoreService.getCompanyRatingStats(company.id).average.toFixed(1)}
                        </span>
                        <span className="text-[9px] text-[#BDB29F] ml-0.5 font-bold">
                          ({StoreService.getCompanyRatingStats(company.id).count})
                        </span>
                      </div>
                      {StoreService.isUserPartner(company.id).isPartner && (
                        <span className="text-[9px] font-black text-[#F5D77A] bg-[#1C1811] px-1.5 py-0.5 rounded-md border border-[#D4AF37]/30">
                          🤝 Parceiro
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Slogan / Services snippet */}
                {company.bio && (
                  <p className="text-[10px] text-[#BDB29F] line-clamp-2 mt-1.5 leading-relaxed">
                    {company.bio}
                  </p>
                )}
              </div>

              {/* Card Action Link */}
              <div className="mt-3 pt-2.5 border-t border-[#26241E] flex items-center justify-between text-[11px] font-bold text-[#D4AF37] group-hover:text-[#F5D77A]">
                <span>Ver vitrine & vagas</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
