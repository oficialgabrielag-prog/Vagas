import React, { useRef, useState, useEffect } from 'react';
import { Briefcase, ChevronLeft, ChevronRight, MapPin, DollarSign, ArrowRight } from 'lucide-react';
import { Job } from '../lib/types';

interface JobsHorizontalCarouselProps {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  onViewAll?: () => void;
  title?: string;
  subtitle?: string;
}

export const JobsHorizontalCarousel: React.FC<JobsHorizontalCarouselProps> = ({
  jobs,
  onSelectJob,
  onViewAll,
  title = 'Todas as Vagas Ativas',
  subtitle = 'Oportunidades profissionais e contratações abertas no Cunene'
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

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
  }, [jobs]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || jobs.length <= 2) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const step = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      if (!isPaused && el) {
        const move = (20 * delta) / 1000;
        el.scrollLeft += move;

        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
          el.scrollLeft = 0;
        }
      }
      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused, jobs.length]);

  const scrollByAmount = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -320 : 320;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const activeJobs = jobs.filter(j => !['closed', 'fechada', 'inactive', 'inativa'].includes(String(j.status || '').toLowerCase()));
  const displayJobs = activeJobs.length > 0 ? activeJobs : jobs;

  if (displayJobs.length === 0) return null;

  return (
    <section 
      aria-label="Carrossel de Vagas de Emprego"
      className="max-w-7xl mx-auto px-4 sm:px-6 my-8 space-y-3.5 select-none"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#1C1811] text-[#D4AF37] flex items-center justify-center border border-[#D4AF37]/30 shrink-0">
            <Briefcase className="w-4 h-4" />
          </div>
          <div className="truncate">
            <h2 className="text-sm sm:text-base font-extrabold text-[#F5D77A] tracking-tight truncate flex items-center gap-2">
              <span>{title}</span>
              <span className="text-[11px] font-bold text-[#F5D77A] bg-[#1C1811] px-2 py-0.5 rounded-full border border-[#D4AF37]/30 hidden sm:inline-block">
                {displayJobs.length} vagas
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-[#BDB29F] truncate hidden xs:block">
              {subtitle}
            </p>
          </div>
        </div>

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

      <div
        ref={scrollRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setTimeout(() => setIsPaused(false), 2000)}
        className="flex items-stretch gap-3.5 overflow-x-auto no-scrollbar scroll-smooth py-1.5 px-0.5 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {displayJobs.map(job => (
          <div
            key={job.id}
            onClick={() => onSelectJob(job)}
            className="cv-card-pressable w-[280px] sm:w-[300px] shrink-0 snap-start bg-[#121212] rounded-2xl border border-[#D4AF37]/25 hover:border-[#D4AF37] shadow-lg hover:shadow-[#D4AF37]/15 transition-all duration-150 cursor-pointer group p-4 flex flex-col justify-between active:scale-[0.96]"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="w-11 h-11 rounded-xl bg-[#1C1811] border border-[#D4AF37]/30 flex items-center justify-center font-black text-[#D4AF37] text-sm shrink-0 overflow-hidden">
                  {job.company_logo ? (
                    <img src={job.company_logo} alt={job.company_name} className="w-full h-full object-cover" />
                  ) : (
                    job.company_name?.charAt(0) || 'C'
                  )}
                </div>
                <span className="bg-[#1C1811] text-[#F5D77A] font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-[#D4AF37]/30">
                  {job.category || 'Tempo integral'}
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-sm text-white group-hover:text-[#F5D77A] transition line-clamp-1">
                  {job.title}
                </h3>
                <p className="text-xs font-semibold text-[#BDB29F] line-clamp-1 mt-0.5">
                  {job.company_name}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-3 mt-3 border-t border-[#26241E]">
              <div className="flex items-center justify-between text-xs text-[#BDB29F] font-medium">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                  {job.municipality || 'Ondjiva'}
                </span>
                <span className="font-bold text-[#F5D77A] truncate max-w-[130px]">
                  {job.salary_min && job.salary_max 
                    ? `${job.salary_min.toLocaleString()} ${job.salary_currency || 'AOA'}` 
                    : 'A combinar'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] font-bold text-[#D4AF37] group-hover:text-[#F5D77A]">
                <span>Candidatar-se à vaga</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
