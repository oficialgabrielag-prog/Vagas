import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  ShoppingBag, 
  MessageCircle, 
  Share2, 
  Heart, 
  Calendar, 
  ShieldCheck, 
  CheckCircle,
  Tag,
  Trash2
} from 'lucide-react';
import { MarketplaceProduct, UserProfile } from '../lib/types';
import { StoreService } from '../lib/store';

interface ProductDetailPageProps {
  product: MarketplaceProduct | null;
  onBack: () => void;
  currentUser: UserProfile | null;
  companies?: UserProfile[];
  allProducts?: MarketplaceProduct[];
  onSelectCompany?: (company: UserProfile) => void;
  onSelectProduct?: (product: MarketplaceProduct) => void;
  onOpenAuth?: () => void;
  onProductDeleted?: (productId: string) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  onBack,
  currentUser,
  companies = [],
  allProducts = [],
  onSelectCompany,
  onSelectProduct,
  onOpenAuth,
  onProductDeleted
}) => {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Instrução temporária de 3 segundos informando que o botão pode ser arrastado
  const [showDragTip, setShowDragTip] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowDragTip(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Ref para obter as dimensões exatas do elemento durante o arraste com o dedo
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const startCoordRef = useRef<{ clientX: number; clientY: number; initX: number; initY: number }>({
    clientX: 0,
    clientY: 0,
    initX: 0,
    initY: 0
  });
  const hasMovedRef = useRef(false);

  // Inicia o toque/arraste diretamente no botão com o dedo de uma extremidade à outra
  const handlePointerDown = (e: React.TouchEvent | React.MouseEvent) => {
    isDraggingRef.current = true;
    hasMovedRef.current = false;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const rect = containerRef.current?.getBoundingClientRect();
    const currentX = pos ? pos.x : (rect ? rect.left : (window.innerWidth > 640 ? window.innerWidth - 360 : 16));
    const currentY = pos ? pos.y : (rect ? rect.top : (window.innerHeight - 80));

    startCoordRef.current = {
      clientX,
      clientY,
      initX: currentX,
      initY: currentY
    };
  };

  useEffect(() => {
    const handlePointerMove = (e: TouchEvent | MouseEvent) => {
      if (!isDraggingRef.current) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      const deltaX = clientX - startCoordRef.current.clientX;
      const deltaY = clientY - startCoordRef.current.clientY;

      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        hasMovedRef.current = true;
      }

      // Permite arrastar o botão livremente de uma extremidade à outra da tela
      const elWidth = containerRef.current?.offsetWidth || 280;
      const elHeight = containerRef.current?.offsetHeight || 60;

      const maxX = Math.max(8, window.innerWidth - elWidth - 8);
      const maxY = Math.max(60, window.innerHeight - elHeight - 8);

      const newX = Math.max(8, Math.min(maxX, startCoordRef.current.initX + deltaX));
      const newY = Math.max(60, Math.min(maxY, startCoordRef.current.initY + deltaY));

      setPos({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    return () => {
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };
  }, [pos]);

  // Escuta tecla Escape e histórico do navegador (botão voltar nativo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };

    window.addEventListener('keydown', handleKeyDown);

    // Push state no histórico para que o botão 'voltar' do celular/navegador volte à lista
    const stateObj = { screen: 'product-detail', id: product?.id };
    window.history.pushState(stateObj, '');

    const handlePopState = () => {
      onBack();
    };
    window.addEventListener('popstate', handlePopState);

    // Scroll to top on enter
    window.scrollTo({ top: 0, behavior: 'instant' as any });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [product?.id, onBack]);

  // Carrega status de produto guardado
  useEffect(() => {
    if (currentUser && product) {
      StoreService.fetchSavedProducts(currentUser.id).then(ids => {
        setSaved(ids.includes(product.id));
      });
    }
  }, [currentUser, product]);

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4 text-slate-500">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Produto não encontrado</h2>
        <p className="text-xs text-slate-500 mb-6 max-w-xs">
          O anúncio pode ter sido removido ou já não se encontra disponível.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-[#0F4C9C] text-white rounded-xl text-xs font-bold shadow-sm"
        >
          Voltar ao Marketplace
        </button>
      </div>
    );
  }

  // Identificação do Vendedor
  const sellerCompany = companies.find(c => c.id === product.seller_id || c.id === product.company_id);
  const sellerName = (product as any).users?.company_name || sellerCompany?.company_name || sellerCompany?.full_name || 'Vendedor Local';

  const handleWhatsAppContact = () => {
    if (hasMovedRef.current) return; // Se arrastou com o dedo, ignora o clique
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(15); } catch {}
    }
    const phone = product.contact_phone;
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) return;
    const message = encodeURIComponent(`Olá! Vi o produto "${product.title}" no CuneneVagas e tenho interesse em negociar.`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const handleShare = async () => {
    const shareUrl = window.location.origin + '#marketplace/produto/' + product.id;
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: `Confira "${product.title}" por ${(Number(product.price) || 0).toLocaleString()} ${product.currency || 'AOA'} no CuneneVagas Marketplace.`,
          url: shareUrl,
        });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const handleToggleSave = async () => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(20); } catch {}
    }
    const updated = await StoreService.toggleSaveProductSupabase(currentUser.id, product.id);
    setSaved(updated.includes(product.id));
  };

  // Produtos relacionados da mesma categoria ou vendedor
  const relatedProducts = allProducts.filter(p => 
    p.id !== product.id && 
    (p.category === product.category || p.seller_id === product.seller_id)
  ).slice(0, 4);

  const isAdmin = StoreService.isAdmin(currentUser);
  const canDelete = isAdmin || (currentUser && currentUser.id === product.seller_id);

  const handleDeleteProduct = () => {
    if (!product) return;
    const confirmDelete = window.confirm(`Tem a certeza que deseja eliminar o produto "${product.title}"? Esta acção não pode ser desfeita.`);
    if (!confirmDelete) return;

    StoreService.deleteProduct(product.id);
    if (onProductDeleted) {
      onProductDeleted(product.id);
    }
    onBack();
  };

  return (
    <div className="min-h-screen bg-white pb-40 select-none">
      {/* Top Bar - Tela Única Nativa */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-slate-800 hover:text-slate-950 font-bold text-xs sm:text-sm py-1.5 px-2.5 -ml-2 rounded-xl hover:bg-slate-100 transition active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
            <span className="hidden sm:inline">Voltar ao Marketplace</span>
            <span className="sm:hidden">Voltar</span>
          </button>

          <span className="text-xs font-bold text-slate-500 truncate max-w-[150px] sm:max-w-xs">
            {product.category || 'Marketplace'}
          </span>

          <div className="flex items-center gap-1.5">
            {canDelete && (
              <button
                type="button"
                onClick={handleDeleteProduct}
                className="p-2 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition cursor-pointer active:scale-90"
                title={isAdmin ? "Eliminar Produto (Admin)" : "Eliminar Produto"}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleSave}
              className={`p-2 rounded-xl transition cursor-pointer active:scale-90 ${
                saved ? 'text-red-600 bg-red-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Guardar nos favoritos"
            >
              <Heart className={`w-5 h-5 ${saved ? 'fill-red-600' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer active:scale-90 relative"
              title="Partilhar"
            >
              <Share2 className="w-5 h-5" />
              {copied && (
                <span className="absolute -bottom-7 right-0 bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap">
                  Link copiado!
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Single Screen Content Container */}
      <main className="max-w-3xl mx-auto bg-white min-h-[calc(100vh-60px)] shadow-xs sm:border-x sm:border-slate-200/70">
        {/* Hero Image Showcase (Edge-to-Edge) */}
        <div className="relative w-full bg-slate-950 overflow-hidden aspect-[4/3] sm:aspect-[16/10] max-h-[460px] flex items-center justify-center">
          {product.image_url && !imgError ? (
            <img
              src={product.image_url}
              alt={product.title}
              onError={() => setImgError(true)}
              className="w-full h-full object-contain sm:object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-900">
              <ShoppingBag className="w-16 h-16 mb-2 opacity-50" />
              <span className="text-xs font-semibold">Sem fotografia do anúncio</span>
            </div>
          )}

          {/* Floating Location Badge */}
          <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 bg-slate-950/75 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold shadow-sm">
            <MapPin className="w-3.5 h-3.5 text-[#FFC20E]" />
            <span>{product.municipality || 'Cunene'}</span>
          </div>

          {/* Floating Status Badge */}
          <div className="absolute top-3.5 right-3.5">
            <span className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm ${
              product.status === 'available' ? 'bg-emerald-600' : 'bg-slate-800'
            }`}>
              {product.status === 'available' ? 'Disponível' : 'Esgotado'}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Price & Title Block */}
          <div className="space-y-2 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#0F4C9C] text-xs font-bold">
                <Tag className="w-3 h-3" />
                {product.category || 'Geral'}
              </span>
              <span className="text-slate-400 text-xs flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {product.created_at ? new Date(product.created_at).toLocaleDateString('pt-AO') : 'Recente'}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 leading-tight">
              {product.title}
            </h1>

            <div className="pt-1">
              <span className="text-2xl sm:text-3xl font-black text-[#0F4C9C] tracking-tight">
                {(Number(product.price) || 0).toLocaleString()} {product.currency || 'AOA'}
              </span>
            </div>
          </div>

          {/* Verified Seller Section */}
          <div 
            onClick={() => {
              if (onSelectCompany) {
                const targetComp = sellerCompany || ({
                  id: product.seller_id || (product as any).company_id || 'comp',
                  company_name: sellerName,
                  full_name: sellerName,
                  municipality: product.municipality || 'Ondjiva',
                  industry: 'Comércio & Serviços',
                  role: 'employer'
                } as any);
                onSelectCompany(targetComp);
              }
            }}
            className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-[#0F4C9C]/40 transition cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-0.5 overflow-hidden shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
                {sellerCompany?.avatar_url ? (
                  <img src={sellerCompany.avatar_url} alt="Logo" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <div className="w-full h-full bg-[#0F4C9C] text-white flex items-center justify-center font-bold text-base rounded-lg">
                    {sellerName.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0F4C9C] group-hover:underline transition truncate">{sellerName}</h3>
                  <CheckCircle className="w-3.5 h-3.5 text-[#0F4C9C] shrink-0" />
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {sellerCompany?.industry || 'Comércio & Serviços'} · {sellerCompany?.municipality || product.municipality}
                </p>
              </div>
            </div>

            {onSelectCompany && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const targetComp = sellerCompany || ({
                    id: product.seller_id || (product as any).company_id || 'comp',
                    company_name: sellerName,
                    full_name: sellerName,
                    municipality: product.municipality || 'Ondjiva',
                    industry: 'Comércio & Serviços',
                    role: 'employer'
                  } as any);
                  onSelectCompany(targetComp);
                }}
                className="bg-white hover:bg-slate-100 text-[#0F4C9C] border border-slate-200/80 font-bold px-3 py-2 rounded-xl text-xs transition active:scale-95 shrink-0 cursor-pointer"
              >
                Ver Loja
              </button>
            )}
          </div>

          {/* Product Description */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Descrição do Produto
            </h2>
            <div className="text-slate-800 text-sm sm:text-base leading-relaxed whitespace-pre-line select-text">
              {product.description || 'O vendedor não adicionou uma descrição detalhada para este produto.'}
            </div>
          </div>

          {/* Cunene Safety Tips Banner */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-amber-900">
              <h4 className="font-bold">Dicas de Negociação Segura no Cunene</h4>
              <p className="leading-relaxed text-amber-800">
                Recomendamos sempre marcar a entrega e pagamento em locais públicos e movimentados de Ondjiva ou do seu município. Verifique o produto antes de concluir qualquer transação.
              </p>
            </div>
          </div>

          {/* Related Products from same Category/Seller */}
          {relatedProducts.length > 0 && onSelectProduct && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Outros Anúncios Relacionados</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {relatedProducts.map(rel => (
                  <div
                    key={rel.id}
                    onClick={() => onSelectProduct(rel)}
                    className="bg-slate-50 hover:bg-slate-100 rounded-2xl overflow-hidden border border-slate-200/70 cursor-pointer transition p-2 space-y-1.5 active:scale-95"
                  >
                    <div className="aspect-square bg-slate-200 rounded-xl overflow-hidden">
                      {rel.image_url ? (
                        <img src={rel.image_url} alt={rel.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <ShoppingBag className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <h5 className="text-xs font-bold text-slate-900 line-clamp-1">{rel.title}</h5>
                    <p className="text-xs font-extrabold text-[#0F4C9C]">
                      {(Number(rel.price) || 0).toLocaleString()} {rel.currency || 'AOA'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Único Botão de Contato Flutuante Arrastável Direta e Livremente pelo Dedo do Usuário */}
      <footer 
        ref={containerRef}
        onTouchStart={handlePointerDown}
        onMouseDown={handlePointerDown}
        className="fixed z-50 transition-shadow select-none touch-none cursor-grab active:cursor-grabbing group"
        style={{
          left: pos ? `${pos.x}px` : 'auto',
          right: pos ? 'auto' : '16px',
          top: pos ? `${pos.y}px` : 'auto',
          bottom: pos ? 'auto' : '16px',
        }}
      >
        {/* Instrução ao utilizador com 3s de duração */}
        {showDragTip && (
          <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg border border-slate-700/80 whitespace-nowrap animate-bounce pointer-events-none transition-all duration-500 flex items-center gap-1.5 z-50">
            <span>💡 Pode arrastar o botão com o dedo</span>
          </div>
        )}

        <div className="bg-white/95 backdrop-blur-md border border-slate-300/90 rounded-2xl p-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.18)] flex items-center gap-2 relative">
          {/* Preço em destaque */}
          <div className="hidden xs:block px-2">
            <span className="text-[10px] text-slate-400 font-bold block leading-none">Preço</span>
            <span className="text-xs font-black text-[#0F4C9C] leading-tight">
              {(Number(product.price) || 0).toLocaleString()} {product.currency || 'AOA'}
            </span>
          </div>

          {/* Botão de Ação WhatsApp */}
          {product.contact_phone ? (
            <button
              type="button"
              onClick={handleWhatsAppContact}
              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold py-3 px-5 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95 shrink-0"
            >
              <MessageCircle className="w-4.5 h-4.5 fill-white/20" />
              <span>Contactar Vendedor (WhatsApp)</span>
            </button>
          ) : (
            <span className="text-xs text-slate-400 font-bold px-3 py-2 bg-slate-100 rounded-xl">
              Sem contacto
            </span>
          )}
        </div>
      </footer>
    </div>
  );
};
