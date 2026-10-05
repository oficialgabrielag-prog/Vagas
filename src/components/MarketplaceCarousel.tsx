import React, { useState, useEffect } from 'react';
import { MarketplaceProduct } from '../lib/types';

interface MarketplaceCarouselProps {
  products: MarketplaceProduct[];
  onNavigate: (productId: string) => void;
  title?: string;
}

export const MarketplaceCarousel: React.FC<MarketplaceCarouselProps> = ({ products, onNavigate, title }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter available products
  const activeProducts = products.filter(p => p.is_active !== false && p.status === 'available' && p.image_url);

  useEffect(() => {
    if (activeProducts.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % activeProducts.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeProducts.length]);

  if (activeProducts.length === 0) return null;

  const current = activeProducts[currentIndex];

  const handleNavigate = () => {
    onNavigate(current.id);
  };

  return (
    <div 
      className="w-full h-full cursor-pointer relative"
      onClick={handleNavigate}
    >
      <img 
        src={current.image_url} 
        alt={current.title} 
        className="w-full h-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-6 text-white">
        {title && <h1 className="text-2xl font-black text-white [text-shadow:_0_2px_4px_rgb(0_0_0_/_0.8)] mb-2">{title}</h1>}
        <span className="bg-[#FFC20E] text-slate-900 font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md w-fit mb-2">
          Destaque Marketplace
        </span>
        <h3 className="text-xl font-black text-white [text-shadow:_0_2px_4px_rgb(0_0_0_/_0.8)]">{current.title}</h3>
        <p className="text-sm font-bold text-[#FFC20E] [text-shadow:_0_1px_2px_rgb(0_0_0_/_0.8)]">{(Number(current.price) || 0).toLocaleString()} Kz • {current.municipality}</p>
      </div>
      
      {/* Indicators */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
        {activeProducts.map((_, i) => (
          <div 
            key={i} 
            className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-white w-4' : 'bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
};
