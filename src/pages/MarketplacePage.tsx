import React, { useState, useMemo } from 'react';
import { 
  Search, 
  MapPin, 
  ShoppingBag, 
  Plus, 
  MessageCircle, 
  Store, 
  Tag, 
  SlidersHorizontal, 
  Smartphone,
  Shirt,
  Sparkles,
  Car,
  Hammer,
  Sprout,
  Wrench,
  Tv,
  Laptop,
  Armchair,
  Utensils,
  Home as HomeIcon,
  Footprints,
  Trash2,
  X,
  ExternalLink
} from 'lucide-react';
import { MarketplaceProduct, CUNENE_MUNICIPALITIES, UserProfile } from '../lib/types';
import { StoreService } from '../lib/store';
import { ProductDetailPage } from './ProductDetailPage';
import { GiantCinematicCarousel } from '../components/GiantCinematicCarousel';

interface MarketplacePageProps {
  products: MarketplaceProduct[];
  companies?: UserProfile[];
  currentUser: UserProfile | null;
  onOpenNewProduct: () => void;
  onSelectCompany?: (company: UserProfile) => void;
  onSelectProduct?: (product: MarketplaceProduct) => void;
  selectedProduct?: MarketplaceProduct | null;
  onOpenAuth: () => void;
  onProductDeleted?: (productId: string) => void;
}

export const MarketplacePage: React.FC<MarketplacePageProps> = ({
  products,
  companies = [],
  currentUser,
  onOpenNewProduct,
  onSelectCompany,
  onSelectProduct,
  selectedProduct: propSelectedProduct,
  onOpenAuth,
  onProductDeleted
}) => {
  const isAdmin = StoreService.isAdmin(currentUser);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedMunicipality, setSelectedMunicipality] = useState('Todos');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'price-asc' | 'price-desc'>('recent');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [localSelectedProduct, setLocalSelectedProduct] = useState<MarketplaceProduct | null>(null);

  // Lista canónica de categorias com ícones
  const categoryItems = [
    { label: 'Todas', name: 'Todas', icon: ShoppingBag },
    { label: 'Eletrónicos', name: 'Eletrónicos', icon: Tv },
    { label: 'Telemóveis', name: 'Telemóveis', icon: Smartphone },
    { label: 'Informática', name: 'Informática', icon: Laptop },
    { label: 'Moda', name: 'Moda', icon: Shirt },
    { label: 'Calçados', name: 'Calçados', icon: Footprints },
    { label: 'Casa', name: 'Casa', icon: HomeIcon },
    { label: 'Móveis', name: 'Móveis', icon: Armchair },
    { label: 'Alimentação', name: 'Alimentação', icon: Utensils },
    { label: 'Beleza', name: 'Beleza', icon: Sparkles },
    { label: 'Automóveis', name: 'Automóveis', icon: Car },
    { label: 'Construção', name: 'Construção', icon: Hammer },
    { label: 'Agricultura', name: 'Agricultura', icon: Sprout },
    { label: 'Serviços', name: 'Serviços', icon: Wrench },
  ];

  const handleDeleteProduct = (e: React.MouseEvent, prod: MarketplaceProduct) => {
    e.stopPropagation();
    if (!isAdmin && currentUser?.id !== prod.seller_id) return;

    const confirmDelete = window.confirm(`Tem a certeza que deseja eliminar o produto "${prod.title}"? Esta acção não pode ser desfeita.`);
    if (!confirmDelete) return;

    StoreService.deleteProduct(prod.id);
    if (onProductDeleted) {
      onProductDeleted(prod.id);
    }
    if (localSelectedProduct?.id === prod.id) {
      setLocalSelectedProduct(null);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(prod => {
      // Find seller company name if any
      const company = companies.find(c => c.id === prod.seller_id || c.id === prod.company_id);
      const companyName = company?.company_name || company?.full_name || '';

      const matchSearch = !searchTerm || 
        prod.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (prod.description && prod.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        companyName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory = selectedCategory === 'Todas' || prod.category === selectedCategory;
      const matchMunicipality = selectedMunicipality === 'Todos' || prod.municipality.toLowerCase().includes(selectedMunicipality.toLowerCase());
      const matchStatus = selectedStatus === 'all' || (selectedStatus === 'available' ? (prod.status === 'available' && prod.is_active !== false) : prod.status === 'sold');
      
      const priceVal = prod.price || 0;
      const matchMinPrice = !minPrice || priceVal >= Number(minPrice);
      const matchMaxPrice = !maxPrice || priceVal <= Number(maxPrice);

      return matchSearch && matchCategory && matchMunicipality && matchStatus && matchMinPrice && matchMaxPrice;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price-desc') return (b.price || 0) - (a.price || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [products, companies, searchTerm, selectedCategory, selectedMunicipality, selectedStatus, minPrice, maxPrice, sortBy]);

  const handleWhatsAppContact = (phone: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) return;
    const message = encodeURIComponent(`Olá, vi o produto "${title}" no CuneneVagas e tenho interesse.`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const handleProductClick = (prod: MarketplaceProduct) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(10); } catch {}
    }
    if (onSelectProduct) {
      onSelectProduct(prod);
    } else {
      setLocalSelectedProduct(prod);
    }
  };

  const hasActiveFilters = Boolean(
    searchTerm || 
    selectedCategory !== 'Todas' || 
    selectedMunicipality !== 'Todos' || 
    selectedStatus !== 'all' || 
    minPrice || 
    maxPrice || 
    sortBy !== 'recent'
  );

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('Todas');
    setSelectedMunicipality('Todos');
    setSelectedStatus('all');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('recent');
  };

  const storesWithProducts = useMemo(() => {
    return companies.filter(c => 
      products.some(p => p.seller_id === c.id || p.company_id === c.id)
    );
  }, [companies, products]);

  // Se houver um produto selecionado no estado local (apenas se onSelectProduct não foi fornecido pelo pai)
  if (!onSelectProduct && localSelectedProduct) {
    return (
      <ProductDetailPage
        product={localSelectedProduct}
        onBack={() => setLocalSelectedProduct(null)}
        currentUser={currentUser}
        companies={companies}
        allProducts={products}
        onSelectCompany={onSelectCompany}
        onSelectProduct={(p) => setLocalSelectedProduct(p)}
        onOpenAuth={onOpenAuth}
        onProductDeleted={onProductDeleted}
      />
    );
  }

  return (
    <div className="bg-[#080808] min-h-screen text-[#F5D77A]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 pb-24">
        
        {/* Carrossel Cinemático */}
        <GiantCinematicCarousel 
          jobs={[]}
          products={products}
          companies={companies}
          onSelectJob={() => {}}
          onSelectProduct={prod => onSelectProduct ? onSelectProduct(prod) : setLocalSelectedProduct(prod)}
          onSelectCompany={comp => onSelectCompany && onSelectCompany(comp)}
          onNavigateTab={() => {}}
        />

        {/* 1. Área Principal Editorial */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#D4AF37]/15 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-[#F5D77A] tracking-tight">
              Compra e vende em Angola.
            </h1>
            <p className="text-sm sm:text-base text-[#c4beb0] mt-1.5 font-normal">
              Descobre produtos perto de ti na Província do Cunene.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (!currentUser) {
                  onOpenAuth();
                } else {
                  onOpenNewProduct();
                }
              }}
              className="inline-flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#F5D77A] text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-colors cursor-pointer shrink-0 gold-cta"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Anunciar produto</span>
            </button>
          </div>
        </div>

        {/* 1.5 NEGÓCIOS EM DESTAQUE (Editorial) */}
        {(() => {
          const featuredCampaigns = StoreService.getFeaturedCampaigns().filter(c => c.status === 'active' && c.type === 'product');
          const featuredProdIds = featuredCampaigns.map(c => c.target_id);
          const sponsoredProducts = products.filter(p => featuredProdIds.includes(p.id));
          const displayProducts = sponsoredProducts.length > 0 ? sponsoredProducts : products.slice(0, 4);

          if (displayProducts.length === 0) return null;

          return (
            <div className="space-y-4 border-b border-[#D4AF37]/15 pb-8">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-display font-bold text-[#F5D77A] tracking-tight">
                  Negócios em Destaque
                </h2>
                {sponsoredProducts.length > 0 && (
                  <span className="text-[11px] font-medium text-[#8e887b] uppercase tracking-wider">
                    Patrocinado
                  </span>
                )}
              </div>

              <div className="cv-product-grid grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {displayProducts.map((prod) => {
                  const isSponsored = featuredProdIds.includes(prod.id);
                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleProductClick(prod)}
                      className="cv-product transition cursor-pointer flex flex-col justify-between group"
                    >
                      <div className="aspect-4/3 w-full rounded-[9px] bg-[#14120e] flex items-center justify-center overflow-hidden">
                        {prod.image_url ? (
                          <img
                            src={prod.image_url}
                            alt={prod.title}
                            referrerPolicy="no-referrer"
                            className="cv-product-image h-full w-full object-cover group-hover:opacity-90 transition-opacity duration-200"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-[#D4AF37]/70 gap-1">
                            <ShoppingBag className="w-7 h-7" />
                          </div>
                        )}
                      </div>

                      <div className="cv-product-content space-y-1">
                        <div className="cv-post-meta truncate">
                          {isSponsored ? 'Destaque · ' : ''}
                          {prod.municipality || 'Cunene'}
                        </div>
                        <h3 className="cv-product-title line-clamp-1 group-hover:text-[#D4AF37] transition-colors">
                          {prod.title}
                        </h3>
                        <p className="cv-product-price">
                          {Number(prod.price || 0).toLocaleString('pt-AO')} {prod.currency || 'Kz'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* 2. Barra de Pesquisa Simples e Integrada */}
        <div className="space-y-3">
          <div className="bg-[#0f0e0b] rounded-xl border border-[#D4AF37]/20 p-2.5 flex flex-col md:flex-row items-stretch gap-2">
            
            {/* Nome do Produto */}
            <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 bg-[#1C1811] rounded-2xl border border-[#D4AF37]/30">
              <Search className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Nome do produto..."
                className="w-full text-xs sm:text-sm text-white placeholder:text-[#BDB29F] outline-none bg-transparent font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-xs text-[#BDB29F] hover:text-white font-bold p-1 cursor-pointer"
                  title="Limpar pesquisa"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Município */}
            <div className="w-full md:w-52 flex items-center gap-2 px-3.5 py-2.5 bg-[#1C1811] rounded-2xl border border-[#D4AF37]/30">
              <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <select
                value={selectedMunicipality}
                onChange={e => setSelectedMunicipality(e.target.value)}
                className="w-full text-xs sm:text-sm text-white outline-none bg-transparent font-medium cursor-pointer"
              >
                <option value="Todos" className="bg-[#121212]">Todos os Municípios</option>
                <option value="Ondjiva" className="bg-[#121212]">Ondjiva</option>
                <option value="Namacunde" className="bg-[#121212]">Namacunde</option>
                <option value="Cuanhama" className="bg-[#121212]">Cuanhama</option>
                <option value="Ombadja" className="bg-[#121212]">Ombadja</option>
                <option value="Cahama" className="bg-[#121212]">Cahama</option>
                <option value="Cuvelai" className="bg-[#121212]">Cuvelai</option>
                <option value="Lubango" className="bg-[#121212]">Lubango</option>
                <option value="Luanda" className="bg-[#121212]">Luanda</option>
                <option value="Benguela" className="bg-[#121212]">Benguela</option>
                <option value="Huambo" className="bg-[#121212]">Huambo</option>
              </select>
            </div>

            {/* Categoria */}
            <div className="w-full md:w-52 flex items-center gap-2 px-3.5 py-2.5 bg-[#1C1811] rounded-2xl border border-[#D4AF37]/30">
              <Tag className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full text-xs sm:text-sm text-white outline-none bg-transparent font-medium cursor-pointer"
              >
                <option value="Todas" className="bg-[#121212]">Todas as Categorias</option>
                {categoryItems.filter(c => c.name !== 'Todas').map(c => (
                  <option key={c.name} value={c.name} className="bg-[#121212]">{c.name}</option>
                ))}
              </select>
            </div>

            {/* Botão de Pesquisa */}
            <button
              type="button"
              className="bg-[#D4AF37] hover:bg-[#F5D77A] text-slate-950 font-extrabold px-6 py-2.5 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-95 shrink-0 cursor-pointer shadow-md gold-cta"
            >
              <Search className="w-4 h-4 text-slate-950" />
              <span>Pesquisar</span>
            </button>
          </div>

          {/* Filtros Secundários Rápidos */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
            <div className="flex items-center gap-2 text-[#BDB29F]">
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="inline-flex items-center gap-1.5 font-semibold text-[#F5D77A] hover:underline cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{showAdvancedFilters ? 'Ocultar opções de preço' : 'Filtrar por preço e ordem'}</span>
              </button>

              {hasActiveFilters && (
                <>
                  <span className="text-zinc-600">·</span>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-[#BDB29F] hover:text-white font-medium cursor-pointer underline"
                  >
                    Limpar todos os filtros
                  </button>
                </>
              )}
            </div>

            <span className="text-[#BDB29F] font-medium">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
            </span>
          </div>

          {/* Painel Avançado Discreto */}
          {showAdvancedFilters && (
            <div className="bg-[#121212] p-4 rounded-2xl border border-[#D4AF37]/30 shadow-xl flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#F5D77A]">Preço (Kz):</span>
                <input
                  type="number"
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  placeholder="Mín"
                  className="w-20 sm:w-24 px-2.5 py-1.5 rounded-xl border border-[#D4AF37]/30 bg-[#1C1811] text-xs text-white outline-none"
                />
                <span className="text-[#BDB29F]">-</span>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  placeholder="Máx"
                  className="w-20 sm:w-24 px-2.5 py-1.5 rounded-xl border border-[#D4AF37]/30 bg-[#1C1811] text-xs text-white outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#F5D77A]">Ordenar por:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl border border-[#D4AF37]/30 bg-[#1C1811] text-xs text-white outline-none cursor-pointer"
                >
                  <option value="recent" className="bg-[#121212]">Mais recentes</option>
                  <option value="price-asc" className="bg-[#121212]">Menor preço</option>
                  <option value="price-desc" className="bg-[#121212]">Maior preço</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#F5D77A]">Estado:</span>
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-[#D4AF37]/30 bg-[#1C1811] text-xs text-white outline-none cursor-pointer"
                >
                  <option value="all" className="bg-[#121212]">Todos</option>
                  <option value="available" className="bg-[#121212]">Apenas disponíveis</option>
                  <option value="sold" className="bg-[#121212]">Esgotados</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* 3. Faixa Horizontal de Categorias (Ícones e nomes curtos, deslizamento suave) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none scroll-smooth">
            {categoryItems.map(item => {
              const Icon = item.icon;
              const isActive = selectedCategory === item.name;

              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setSelectedCategory(item.name)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#D4AF37] text-slate-950 font-extrabold shadow-md gold-cta'
                      : 'bg-[#16140F] hover:bg-[#201A12] text-[#F5D77A] border border-[#D4AF37]/30'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-[#D4AF37]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lojas em Destaque */}
        {onSelectCompany && storesWithProducts.length > 0 && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#d6cba9] uppercase tracking-wider flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-[#D4AF37]" /> Lojas Locais
              </span>
            </div>
            <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
              {storesWithProducts.map(emp => {
                const displayLogo = emp.company?.logo_url || emp.company_logo || emp.avatar_url;
                const companyTitle = emp.company_name || emp.full_name || 'Loja Local';
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => onSelectCompany(emp)}
                    className="inline-flex items-center gap-2.5 py-2 px-3 rounded-xl bg-[#121212] border border-[#D4AF37]/20 hover:border-[#D4AF37]/45 transition cursor-pointer shrink-0 group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#18150f] overflow-hidden shrink-0 flex items-center justify-center">
                      {displayLogo ? (
                        <img src={displayLogo} alt={companyTitle} className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-3.5 h-3.5 text-[#D4AF37]" />
                      )}
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-semibold text-[#f5f1e7] group-hover:text-[#e6c34f] block truncate max-w-[130px]">
                        {companyTitle}
                      </span>
                      <span className="text-[10px] text-[#8e887b] block">{emp.municipality || 'Cunene'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Lista Editorial de Produtos (Limpa, sem cartões pesados) */}
        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center space-y-3 border-t border-[#D4AF37]/15">
            <ShoppingBag className="w-10 h-10 text-[#D4AF37]/40 mx-auto" />
            <h3 className="text-base font-bold text-[#F5D77A]">Nenhum produto encontrado</h3>
            <p className="text-xs sm:text-sm text-[#c4beb0] max-w-md mx-auto">
              Não encontramos anúncios com os filtros selecionados. Tenta ajustar a pesquisa ou escolher outra categoria.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="cv-editorial-btn mt-2 text-xs font-semibold text-[#e6c34f] hover:underline cursor-pointer"
              >
                Limpar filtros de pesquisa
              </button>
            )}
          </div>
        ) : (
          <div className="cv-product-grid grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-7 sm:gap-x-6 sm:gap-y-8 pt-2">
            {filteredProducts.map(prod => {
              const seller = companies.find(c => c.id === prod.seller_id || c.id === prod.company_id);
              const sellerName = seller?.company_name || seller?.full_name || 'Vendedor Local';
              const isOwnerOrAdmin = isAdmin || (currentUser && currentUser.id === prod.seller_id);

              return (
                <article
                  key={prod.id}
                  onClick={() => handleProductClick(prod)}
                  className="cv-product group cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Fotografia limpa em estilo editorial */}
                    <div className="relative aspect-4/3 w-full bg-[#14120e] rounded-[9px] overflow-hidden flex items-center justify-center">
                      {prod.image_url ? (
                        <img
                          src={prod.image_url}
                          alt={prod.title}
                          referrerPolicy="no-referrer"
                          className="cv-product-image w-full h-full object-cover group-hover:opacity-90 transition-opacity duration-200"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[#D4AF37]/70 gap-1">
                          <ShoppingBag className="w-7 h-7" />
                          <span className="text-[10px] text-[#8e887b] font-medium">Sem foto</span>
                        </div>
                      )}

                      {/* Estado / Eliminar discreto */}
                      {(prod.status !== 'available' || isOwnerOrAdmin) && (
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                          {prod.status !== 'available' && (
                            <span className="bg-black/75 text-rose-300 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                              Esgotado
                            </span>
                          )}

                          {isOwnerOrAdmin && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteProduct(e, prod)}
                              className="bg-black/75 hover:bg-rose-600 text-[#F5D77A] hover:text-white p-1.5 rounded-full transition-colors cursor-pointer"
                              title="Eliminar produto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Informações Editoriais do Produto */}
                    <div className="cv-product-content space-y-1">
                      <div className="cv-post-meta flex items-center gap-1 truncate">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!onSelectCompany) return;
                            const targetComp = seller || {
                              id: prod.seller_id || prod.company_id || 'comp',
                              company_name: sellerName,
                              full_name: sellerName,
                              role: 'employer',
                              municipality: prod.municipality || 'Ondjiva'
                            };
                            onSelectCompany(targetComp as any);
                          }}
                          className="truncate hover:text-[#e6c34f] hover:underline cursor-pointer"
                          title={sellerName}
                        >
                          {sellerName}
                        </span>
                        {prod.municipality && (
                          <>
                            <span>·</span>
                            <span className="shrink-0">{prod.municipality}</span>
                          </>
                        )}
                      </div>

                      <h3 className="cv-product-title group-hover:text-[#e6c34f] transition-colors line-clamp-2">
                        {prod.title}
                      </h3>

                      <div className="flex items-center justify-between pt-1">
                        <p className="cv-product-price">
                          {(Number(prod.price) || 0).toLocaleString('pt-AO')} Kz
                        </p>

                        {prod.contact_phone && (
                          <button
                            type="button"
                            onClick={(e) => handleWhatsAppContact(prod.contact_phone, prod.title, e)}
                            className="cv-editorial-btn p-1.5 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                            title="Falar pelo WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
