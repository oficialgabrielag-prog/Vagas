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
    <div className="bg-white min-h-screen text-[#263449]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 pb-24">
        
        {/* 1. Área Principal (Hero & Ação Principal) */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#123D73] tracking-tight">
              Compra e vende em Angola.
            </h1>
            <p className="text-sm sm:text-base text-[#66758A] mt-1.5 font-normal">
              Descobre produtos perto de ti.
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
              className="inline-flex items-center justify-center gap-2 bg-[#F5B91B] hover:bg-[#e2a812] text-[#123D73] font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Anunciar produto</span>
            </button>
          </div>
        </div>

        {/* 2. Barra de Pesquisa Simples e Integrada */}
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-2xs flex flex-col md:flex-row items-stretch gap-2">
            
            {/* Nome do Produto */}
            <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 bg-[#F8FAFC] rounded-xl border border-slate-100">
              <Search className="w-4 h-4 text-[#66758A] shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Nome do produto..."
                className="w-full text-xs sm:text-sm text-[#263449] placeholder:text-[#66758A]/80 outline-none bg-transparent font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-xs text-[#66758A] hover:text-[#263449] font-bold p-1 cursor-pointer"
                  title="Limpar pesquisa"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Município */}
            <div className="w-full md:w-52 flex items-center gap-2 px-3.5 py-2.5 bg-[#F8FAFC] rounded-xl border border-slate-100">
              <MapPin className="w-4 h-4 text-[#66758A] shrink-0" />
              <select
                value={selectedMunicipality}
                onChange={e => setSelectedMunicipality(e.target.value)}
                className="w-full text-xs sm:text-sm text-[#263449] outline-none bg-transparent font-medium cursor-pointer"
              >
                <option value="Todos">Todos os Municípios</option>
                <option value="Ondjiva">Ondjiva</option>
                <option value="Namacunde">Namacunde</option>
                <option value="Cuanhama">Cuanhama</option>
                <option value="Ombadja">Ombadja</option>
                <option value="Cahama">Cahama</option>
                <option value="Cuvelai">Cuvelai</option>
                <option value="Lubango">Lubango</option>
                <option value="Luanda">Luanda</option>
                <option value="Benguela">Benguela</option>
                <option value="Huambo">Huambo</option>
              </select>
            </div>

            {/* Categoria */}
            <div className="w-full md:w-52 flex items-center gap-2 px-3.5 py-2.5 bg-[#F8FAFC] rounded-xl border border-slate-100">
              <Tag className="w-4 h-4 text-[#66758A] shrink-0" />
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full text-xs sm:text-sm text-[#263449] outline-none bg-transparent font-medium cursor-pointer"
              >
                <option value="Todas">Todas as Categorias</option>
                {categoryItems.filter(c => c.name !== 'Todas').map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Botão de Pesquisa */}
            <button
              type="button"
              className="bg-[#123D73] hover:bg-[#0e2f59] text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-95 shrink-0 cursor-pointer"
            >
              <Search className="w-4 h-4 text-[#F5B91B]" />
              <span>Pesquisar</span>
            </button>
          </div>

          {/* Filtros Secundários Rápidos */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
            <div className="flex items-center gap-2 text-[#66758A]">
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="inline-flex items-center gap-1.5 font-semibold text-[#123D73] hover:underline cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{showAdvancedFilters ? 'Ocultar opções de preço' : 'Filtrar por preço e ordem'}</span>
              </button>

              {hasActiveFilters && (
                <>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-[#66758A] hover:text-[#123D73] font-medium cursor-pointer underline"
                  >
                    Limpar todos os filtros
                  </button>
                </>
              )}
            </div>

            <span className="text-[#66758A] font-medium">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
            </span>
          </div>

          {/* Painel Avançado Discreto */}
          {showAdvancedFilters && (
            <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-200/80 flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#66758A]">Preço (Kz):</span>
                <input
                  type="number"
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  placeholder="Mín"
                  className="w-20 sm:w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-[#263449] outline-none"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  placeholder="Máx"
                  className="w-20 sm:w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-[#263449] outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#66758A]">Ordenar por:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-[#263449] outline-none cursor-pointer"
                >
                  <option value="recent">Mais recentes</option>
                  <option value="price-asc">Menor preço</option>
                  <option value="price-desc">Maior preço</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#66758A]">Estado:</span>
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-[#263449] outline-none cursor-pointer"
                >
                  <option value="all">Todos</option>
                  <option value="available">Apenas disponíveis</option>
                  <option value="sold">Esgotados</option>
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
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#123D73] text-white shadow-2xs'
                      : 'bg-white hover:bg-[#F8FAFC] text-[#66758A] hover:text-[#263449] border border-slate-200/90'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#F5B91B]' : 'text-[#66758A]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lojas em Destaque (Integradas sutilmente sobre o fundo, sem caixas pesadas) */}
        {onSelectCompany && storesWithProducts.length > 0 && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#66758A] uppercase tracking-wider flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-[#123D73]" /> Lojas Locais em Destaque
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
                    className="inline-flex items-center gap-2.5 py-1.5 px-3 rounded-xl hover:bg-[#F8FAFC] transition cursor-pointer shrink-0 group border border-slate-100"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {displayLogo ? (
                        <img src={displayLogo} alt={companyTitle} className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold text-[#263449] group-hover:text-[#123D73] block truncate max-w-[130px]">
                        {companyTitle}
                      </span>
                      <span className="text-[10px] text-[#66758A] block">{emp.municipality || 'Cunene'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Lista de Produtos (Apresentação aberta, sem caixotes/cards pesados) */}
        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-[#263449]">Nenhum produto encontrado</h3>
            <p className="text-xs sm:text-sm text-[#66758A] max-w-md mx-auto">
              Não encontramos anúncios com os filtros selecionados. Tenta ajustar a pesquisa ou escolher outra categoria.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-2 text-xs font-bold text-[#123D73] hover:underline cursor-pointer"
              >
                Limpar filtros de pesquisa
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
            {filteredProducts.map(prod => {
              const seller = companies.find(c => c.id === prod.seller_id || c.id === prod.company_id);
              const sellerName = seller?.company_name || seller?.full_name || 'Vendedor Local';
              const isOwnerOrAdmin = isAdmin || (currentUser && currentUser.id === prod.seller_id);

              return (
                <div
                  key={prod.id}
                  onClick={() => handleProductClick(prod)}
                  className="group cursor-pointer flex flex-col transition-all"
                >
                  {/* Fotografia real (proporção consistente, sem distorção) */}
                  <div className="relative aspect-4/3 w-full bg-[#F8FAFC] rounded-2xl overflow-hidden border border-slate-100">
                    {prod.image_url ? (
                      <img
                        src={prod.image_url}
                        alt={prod.title}
                        className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-1">
                        <ShoppingBag className="w-8 h-8" />
                        <span className="text-[10px] text-slate-400 font-medium">Sem imagem</span>
                      </div>
                    )}

                    {/* Badge de Município sutil */}
                    {prod.municipality && (
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-[#123D73]/85 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-white text-[10px] font-medium shadow-2xs">
                        <MapPin className="w-2.5 h-2.5 text-[#F5B91B]" />
                        <span>{prod.municipality}</span>
                      </div>
                    )}

                    {/* Badges de Estado / Botão Excluir */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                      {prod.status !== 'available' && (
                        <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
                          Esgotado
                        </span>
                      )}

                      {isOwnerOrAdmin && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteProduct(e, prod)}
                          className="bg-white/90 hover:bg-rose-600 text-[#263449] hover:text-white p-1.5 rounded-full shadow-xs transition-colors cursor-pointer"
                          title="Eliminar produto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Informações do Produto (Sem caixas, diretamente sobre o fundo) */}
                  <div className="pt-3 space-y-1">
                    
                    {/* Vendedor e Categoria */}
                    <div className="flex items-center gap-1 text-[11px] text-[#66758A] font-medium truncate">
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
                        className="truncate hover:text-[#123D73] hover:underline font-semibold cursor-pointer"
                        title={sellerName}
                      >
                        {sellerName}
                      </span>
                      {prod.category && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-[#66758A] shrink-0">{prod.category}</span>
                        </>
                      )}
                    </div>

                    {/* Nome do Produto */}
                    <h3 className="text-sm font-bold text-[#263449] group-hover:text-[#123D73] transition line-clamp-2 leading-snug">
                      {prod.title}
                    </h3>

                    {/* Preço em Kz */}
                    <div className="flex items-baseline justify-between pt-0.5">
                      <p className="text-base font-extrabold text-[#123D73]">
                        {(Number(prod.price) || 0).toLocaleString('pt-AO')} Kz
                      </p>

                      {/* Botão de WhatsApp rápido e discreto */}
                      {prod.contact_phone && (
                        <button
                          type="button"
                          onClick={(e) => handleWhatsAppContact(prod.contact_phone, prod.title, e)}
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Falar pelo WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
