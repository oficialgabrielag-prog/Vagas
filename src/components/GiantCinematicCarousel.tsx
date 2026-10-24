import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowRight, ChevronLeft, ChevronRight, Play, Pause, MapPin, DollarSign, Building2, Briefcase, ShoppingBag
} from 'lucide-react';
import { Job, MarketplaceProduct, UserProfile, CommunityPost } from '../lib/types';

interface GiantCinematicCarouselProps {
  jobs: Job[];
  products: MarketplaceProduct[];
  companies: UserProfile[];
  posts?: CommunityPost[];
  onSelectJob: (job: Job) => void;
  onSelectProduct: (product: MarketplaceProduct) => void;
  onSelectCompany: (company: UserProfile) => void;
  onNavigateTab: (tab: string) => void;
}

export const GiantCinematicCarousel: React.FC<GiantCinematicCarouselProps> = ({
  jobs = [],
  products = [],
  companies = [],
  posts = [],
  onSelectJob,
  onSelectProduct,
  onSelectCompany,
  onNavigateTab
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Touch gesture support for native swipe
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Build slides strictly from records that have REAL registered images
  const slides = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'job' | 'product' | 'company' | 'news';
      badge: string;
      badgeColor: string;
      title: string;
      subtitle: string;
      location?: string;
      price?: string;
      image: string;
      actionText: string;
      onClick: () => void;
    }> = [];

    // 1. Jobs with real registered company_logo
    jobs.filter(j => j.status === 'active' && j.company_logo && j.company_logo.startsWith('http')).slice(0, 4).forEach(j => {
      const salaryDisplay = j.salary_min && j.salary_max 
        ? `${j.salary_min.toLocaleString()} ${j.salary_currency || 'AOA'}` 
        : 'Remuneração Atrativa';

      items.push({
        id: `job-${j.id}`,
        type: 'job',
        badge: 'VAGA DE EMPREGO',
        badgeColor: 'bg-[#FFB900] text-[#0B2854]',
        title: j.title,
        subtitle: j.company_name ? `Contratação por ${j.company_name}` : 'Oportunidade profissional registada no Cunene',
        location: j.municipality || 'Ondjiva - Cunene',
        price: salaryDisplay,
        image: j.company_logo!,
        actionText: 'Candidatar-se',
        onClick: () => onSelectJob(j)
      });
    });

    // 2. Marketplace Products with real registered image_url
    products.filter(p => p.status === 'available' && p.image_url && p.image_url.startsWith('http')).slice(0, 4).forEach(p => {
      items.push({
        id: `prod-${p.id}`,
        type: 'product',
        badge: 'MARKETPLACE LOCAL',
        badgeColor: 'bg-emerald-600 text-white',
        title: p.title,
        subtitle: p.description ? p.description.slice(0, 75) + '...' : 'Produto disponível para entrega imediata em Cunene',
        location: p.municipality || 'Ondjiva - Cunene',
        price: p.price ? `${Number(p.price).toLocaleString('pt-AO')} Kz` : 'Sob Consulta',
        image: p.image_url!,
        actionText: 'Ver Produto',
        onClick: () => onSelectProduct(p)
      });
    });

    // 3. Registered Companies with real registered cover or avatar image
    companies.filter(c => (c.cover_url && c.cover_url.startsWith('http')) || (c.avatar_url && c.avatar_url.startsWith('http'))).slice(0, 12).forEach(c => {
      const compName = typeof c.company === 'string' ? c.company : (c.company_name || c.full_name || 'Empresa Parceira');
      const compImg = (c.cover_url && c.cover_url.startsWith('http')) ? c.cover_url! : c.avatar_url!;
      items.push({
        id: `comp-${c.id}`,
        type: 'company',
        badge: 'EMPRESA PARCEIRA',
        badgeColor: 'bg-[#1455A0] text-white',
        title: compName,
        subtitle: c.profession || 'Empresa registada com operações ativas na Província do Cunene',
        location: c.municipality || 'Ondjiva - Cunene',
        image: compImg,
        actionText: 'Conhecer Empresa',
        onClick: () => onSelectCompany(c)
      });
    });

    // 4. Community Posts with real registered image
    posts.filter(p => p.image_url && p.image_url.startsWith('http')).slice(0, 3).forEach(p => {
      items.push({
        id: `post-${p.id}`,
        type: 'news',
        badge: 'MERCADO & NOTÍCIAS',
        badgeColor: 'bg-slate-700 text-white',
        title: p.content ? p.content.slice(0, 60) + '...' : 'Desenvolvimento Económico no Cunene',
        subtitle: 'Acompanhe as publicações oficiais da nossa comunidade profissional',
        location: 'Província do Cunene',
        image: p.image_url!,
        actionText: 'Aceder ao Feed',
        onClick: () => onNavigateTab('community')
      });
    });

    return items;
  }, [jobs, products, companies, posts, onSelectJob, onSelectProduct, onSelectCompany, onNavigateTab]);

  // Autoplay timer
  useEffect(() => {
    if (!isPlaying || slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % slides.length);
    }, 5500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, slides.length]);

  // Handle touch swipes on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > 45;
    const isRightSwipe = distance < -45;
    if (isLeftSwipe) {
      setCurrentIndex(prev => (prev + 1) % slides.length);
    } else if (isRightSwipe) {
      setCurrentIndex(prev => (prev - 1 + slides.length) % slides.length);
    }
  };

  if (slides.length === 0) {
    return null; // Ocultar carrossel se ainda não houver registos com imagem real
  }

  return (
    <div 
      className="relative w-full h-[420px] sm:h-[520px] md:h-[600px] overflow-hidden select-none bg-slate-950"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 
        O FUNDO SÃO OS CONTEÚDOS REAIS QUE PASSAM:
        Viewport deslizante de ponta a ponta com imagens reais registadas na base de dados.
      */}
      <div 
        className="flex h-full w-full transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {slides.map((slide) => (
          <div 
            key={slide.id}
            onClick={slide.onClick}
            className="relative min-w-full h-full flex-shrink-0 cursor-pointer overflow-hidden group flex flex-col justify-end"
          >
            {/* IMAGEM REAL REGISTADA COMO O PRÓPRIO FUNDO DO SLIDE */}
            <img 
              src={slide.image} 
              alt={slide.title} 
              className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-1000 ease-out group-hover:scale-105" 
            />

            {/* Gradiente Fotográfico Natural para Contraste e Legibilidade */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B2854] via-[#0B2854]/70 via-50% to-black/30 sm:bg-gradient-to-r sm:from-[#0B2854] sm:via-[#0B2854]/80 sm:via-60% sm:to-black/30" />

            {/* CONTEÚDO INTEGRADO DIRETAMENTE NO FUNDO - AMPLIADO E ESTICADO */}
            <div className="relative z-10 p-6 sm:p-9 md:p-12 max-w-3xl text-white space-y-3 sm:space-y-4">
              
              {/* Badge da Categoria */}
              <div className="inline-flex items-center">
                <span className={`text-[11px] sm:text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-sm ${slide.badgeColor}`}>
                  {slide.badge}
                </span>
              </div>

              {/* Título Principal do Conteúdo */}
              <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight line-clamp-2 drop-shadow-md group-hover:text-[#FFB900] transition">
                {slide.title}
              </h2>

              {/* Subtítulo / Descrição Real */}
              <p className="text-xs sm:text-base text-slate-100 font-medium line-clamp-2 drop-shadow-xs max-w-2xl leading-relaxed">
                {slide.subtitle}
              </p>

              {/* Localização e Valor (Preço ou Salário) */}
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm pt-1">
                {slide.location && (
                  <div className="flex items-center gap-1.5 text-slate-200 font-bold bg-black/50 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/10">
                    <MapPin className="w-4 h-4 text-[#FFB900] shrink-0" />
                    <span>{slide.location}</span>
                  </div>
                )}
                {slide.price && (
                  <div className="flex items-center gap-1.5 text-[#FFB900] font-black bg-black/50 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-[#FFB900]/30 shadow-xs">
                    <span>{slide.price}</span>
                  </div>
                )}
              </div>

              {/* Botão de Ação Direta */}
              <div className="pt-3">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    slide.onClick();
                  }}
                  className="bg-[#FFB900] hover:bg-[#e6a700] text-[#0B2854] font-black px-6 py-3 sm:px-8 sm:py-3.5 rounded-2xl text-xs sm:text-sm transition shadow-lg flex items-center gap-2.5 cursor-pointer group-hover:translate-x-1"
                >
                  <span>{slide.actionText}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        ))}
      </div>

      {/* Controlos Superiores: Contador de Slides e Botão Play/Pause */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2.5">
        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-white border border-white/25">
          <span>{currentIndex + 1}</span>
          <span className="text-white/60 mx-1">/</span>
          <span>{slides.length}</span>
        </div>

        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-9 h-9 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/25 transition cursor-pointer"
          title={isPlaying ? 'Pausar carrossel' : 'Iniciar carrossel'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
      </div>

      {/* Setas de Navegação (Discretas nas laterais em ecrãs maiores) */}
      <button 
        onClick={() => setCurrentIndex(prev => (prev - 1 + slides.length) % slides.length)}
        className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 bg-black/50 hover:bg-black/80 backdrop-blur-md rounded-full items-center justify-center text-white border border-white/30 transition cursor-pointer shadow-lg"
        title="Anterior"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button 
        onClick={() => setCurrentIndex(prev => (prev + 1) % slides.length)}
        className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 bg-black/50 hover:bg-black/80 backdrop-blur-md rounded-full items-center justify-center text-white border border-white/30 transition cursor-pointer shadow-lg"
        title="Próximo"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Indicadores de Posição (Barras na parte inferior central) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
              currentIndex === i 
                ? 'w-8 bg-[#FFB900]' 
                : 'w-2.5 bg-white/50 hover:bg-white/80'
            }`}
            title={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
