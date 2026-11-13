import React, { useRef, useState, useEffect } from 'react';
import { ShoppingBag, ChevronLeft, ChevronRight, MapPin, ArrowRight } from 'lucide-react';
import { MarketplaceProduct } from '../lib/types';

interface ProductsHorizontalCarouselProps {
  products: MarketplaceProduct[];
  onSelectProduct: (product: MarketplaceProduct) => void;
  onViewAll?: () => void;
  title?: string;
  subtitle?: string;
}

export const ProductsHorizontalCarousel: React.FC<ProductsHorizontalCarouselProps> = ({
  products,
  onSelectProduct,
  onViewAll,
  title = 'Produtos & Serviços no Marketplace',
  subtitle = 'Catálogo completo de artigos, equipamentos e serviços no Cunene'
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

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
  }, [products]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || products.length <= 2) return;

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
  }, [isPaused, products.length]);

  const scrollByAmount = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -320 : 320;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const isAvailableProd = (p: MarketplaceProduct) => {
    if (p.is_active === false) return false;
    const st = String(p.status || '').toLowerCase().trim();
    return !['sold', 'vendido', 'inactive', 'inativo'].includes(st);
  };

  const availableProducts = products.filter(isAvailableProd);
  const displayProducts = availableProducts.length > 0 ? availableProducts : products;

  if (displayProducts.length === 0) return null;

  return (
    <section 
      aria-label="Carrossel de Produtos do Marketplace"
      className="max-w-7xl mx-auto px-4 sm:px-6 my-8 space-y-3.5 select-none"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#1C1811] text-[#D4AF37] flex items-center justify-center border border-[#D4AF37]/30 shrink-0">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div className="truncate">
            <h2 className="text-sm sm:text-base font-extrabold text-[#F5D77A] tracking-tight truncate flex items-center gap-2">
              <span>{title}</span>
              <span className="text-[11px] font-bold text-[#F5D77A] bg-[#1C1811] px-2 py-0.5 rounded-full border border-[#D4AF37]/30 hidden sm:inline-block">
                {displayProducts.length} produtos
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
              Ver todos
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
        {displayProducts.map(prod => {
          const hasImg = Boolean(prod.image_url) && !failedImages[prod.id];
          return (
            <div
              key={prod.id}
              onClick={() => onSelectProduct(prod)}
              className="cv-card-pressable w-[240px] sm:w-[260px] shrink-0 snap-start bg-[#121212] rounded-2xl border border-[#D4AF37]/25 hover:border-[#D4AF37] shadow-lg hover:shadow-[#D4AF37]/15 transition-all duration-150 cursor-pointer group p-3 flex flex-col justify-between active:scale-[0.96]"
            >
              <div className="relative aspect-4/3 bg-[#14120e] rounded-xl overflow-hidden flex items-center justify-center">
                {hasImg ? (
                  <img
                    src={prod.image_url}
                    alt={prod.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={() => setFailedImages(prev => ({ ...prev, [prod.id]: true }))}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-[#D4AF37]/70">
                    <ShoppingBag className="w-7 h-7" />
                    <span className="text-[10px] font-medium text-[#8e887b]">Sem foto</span>
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md text-[#F5D77A] text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-[#D4AF37]/30">
                  <MapPin className="w-2.5 h-2.5 text-[#D4AF37]" />
                  <span>{prod.municipality || 'Cunene'}</span>
                </div>
              </div>

              <div className="pt-3 space-y-1">
                <h3 className="text-xs sm:text-sm font-extrabold text-white group-hover:text-[#F5D77A] transition-colors line-clamp-1">
                  {prod.title}
                </h3>
                <div className="text-xs font-black text-[#F5D77A]">
                  {prod.price ? `${Number(prod.price).toLocaleString('pt-AO')} Kz` : 'Sob consulta'}
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#26241E] flex items-center justify-between text-[11px] font-bold text-[#D4AF37] group-hover:text-[#F5D77A]">
                <span>Ver produto</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
