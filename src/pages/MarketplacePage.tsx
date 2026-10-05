import React, { useState, useMemo } from 'react';
import { 
  Search, 
  MapPin, 
  ShoppingBag, 
  PlusCircle, 
  MessageCircle, 
  Store, 
  Tag, 
  SlidersHorizontal, 
  ArrowUpDown,
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
  Footprints
} from 'lucide-react';
import { MarketplaceProduct, CUNENE_MUNICIPALITIES, UserProfile } from '../lib/types';
import { ProductDetailModal } from '../components/ProductDetailModal';

interface MarketplacePageProps {
  products: MarketplaceProduct[];
  companies?: UserProfile[];
  currentUser: UserProfile | null;
  onOpenNewProduct: () => void;
  onSelectCompany?: (company: UserProfile) => void;
  onOpenAuth: () => void;
}

export const MarketplacePage: React.FC<MarketplacePageProps> = ({
  products,
  companies = [],
  currentUser,
  onOpenNewProduct,
  onSelectCompany,
  onOpenAuth
}) => {
  const [keyword, setKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedMunicipality, setSelectedMunicipality] = useState('Todos');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'price-asc' | 'price-desc'>('recent');

  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);

  const categories = [
    'Eletrónicos', 'Telemóveis', 'Informática', 'Moda', 'Calçados',
    'Casa', 'Móveis', 'Alimentação', 'Beleza', 'Automóveis',
    'Construção', 'Agricultura', 'Serviços', 'Outros'
  ];

  const filteredProducts = useMemo(() => {
    return products.filter(prod => {
      // Find seller company name if any
      const company = companies.find(c => c.id === prod.seller_id || c.id === prod.company_id);
      const companyName = company?.company_name || company?.full_name || '';

      const matchKeyword =
        !keyword ||
        prod.title.toLowerCase().includes(keyword.toLowerCase()) ||
        prod.description.toLowerCase().includes(keyword.toLowerCase()) ||
        prod.category.toLowerCase().includes(keyword.toLowerCase()) ||
        companyName.toLowerCase().includes(keyword.toLowerCase()) ||
        prod.municipality.toLowerCase().includes(keyword.toLowerCase());

      const matchCategory = selectedCategory === 'Todas' || prod.category === selectedCategory;
      const matchMunicipality = selectedMunicipality === 'Todos' || prod.municipality.toLowerCase().includes(selectedMunicipality.toLowerCase());
      const matchStatus = selectedStatus === 'all' || (selectedStatus === 'available' ? (prod.status === 'available' && prod.is_active !== false) : prod.status === 'sold');
      
      const priceVal = prod.price || 0;
      const matchMinPrice = !minPrice || priceVal >= Number(minPrice);
      const matchMaxPrice = !maxPrice || priceVal <= Number(maxPrice);

      return matchKeyword && matchCategory && matchMunicipality && matchStatus && matchMinPrice && matchMaxPrice;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      // Default recent
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [products, companies, keyword, selectedCategory, selectedMunicipality, selectedStatus, minPrice, maxPrice, sortBy]);

  const handleWhatsAppContact = (phone: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) return;
    const message = encodeURIComponent(`Olá, vi o produto "${title}" no CuneneVagas e tenho interesse.`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const storesWithProducts = companies.filter(c => 
    products.some(p => p.seller_id === c.id || p.company_id === c.id)
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-20">
      {/* Header */}
      <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest font-bold text-[#FFC20E] block">
            Comércio & Serviços no Cunene
          </span>
          <h1 className="text-xl sm:text-3xl font-black mt-1 text-white">Marketplace Oficial</h1>
          <p className="text-slate-300 text-xs sm:text-sm font-light mt-0.5">
            Conectando empresas e compradores locais em Ondjiva e toda a província.
          </p>
        </div>

        <button
          onClick={() => {
            if (!currentUser) {
              onOpenAuth();
            } else {
              onOpenNewProduct();
            }
          }}
          className="bg-[#FFC20E] hover:bg-[#e5ae0a] text-slate-900 font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-sm flex items-center gap-2 shrink-0 active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Anunciar Produto</span>
        </button>
      </div>

      {/* Lojas em Destaque (Showcase Bar using real stores) */}
      {onSelectCompany && storesWithProducts.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Store className="w-4 h-4 text-[#0F4C9C]" /> Lojas em Destaque
          </span>
          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
            {storesWithProducts.map(emp => {
              const displayLogo = emp.company?.logo_url || emp.company_logo || emp.avatar_url;
              return (
                <button
                  key={emp.id}
                  onClick={() => onSelectCompany(emp)}
                  className="bg-white p-2.5 rounded-2xl border border-slate-200 hover:border-[#0F4C9C] transition flex items-center gap-2.5 shrink-0 shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                    {displayLogo ? (
                      <img src={displayLogo} alt={emp.company_name || emp.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-4 h-4 text-slate-400 m-2" />
                    )}
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-900 block truncate max-w-[120px]">
                      {emp.company_name || emp.full_name}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{emp.municipality || 'Cunene'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Barra Horizontal Premium de Categorias com Ícones */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Tag className="w-4 h-4 text-[#0F4C9C]" /> Filtrar por Categoria
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('Todas')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-black transition-all whitespace-nowrap border ${
              selectedCategory === 'Todas'
                ? 'bg-[#0F4C9C] text-white border-[#0F4C9C] shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Todas as Categorias</span>
          </button>
          {categories.map(cat => {
            const isActive = selectedCategory === cat;
            
            // Retorna o ícone correto baseado na categoria
            const getIcon = () => {
              switch (cat) {
                case 'Eletrónicos': return <Tv className="w-3.5 h-3.5" />;
                case 'Telemóveis': return <Smartphone className="w-3.5 h-3.5" />;
                case 'Informática': return <Laptop className="w-3.5 h-3.5" />;
                case 'Moda': return <Shirt className="w-3.5 h-3.5" />;
                case 'Calçados': return <Footprints className="w-3.5 h-3.5" />;
                case 'Casa': return <HomeIcon className="w-3.5 h-3.5" />;
                case 'Móveis': return <Armchair className="w-3.5 h-3.5" />;
                case 'Alimentação': return <Utensils className="w-3.5 h-3.5" />;
                case 'Beleza': return <Sparkles className="w-3.5 h-3.5" />;
                case 'Automóveis': return <Car className="w-3.5 h-3.5" />;
                case 'Construção': return <Hammer className="w-3.5 h-3.5" />;
                case 'Agricultura': return <Sprout className="w-3.5 h-3.5" />;
                case 'Serviços': return <Wrench className="w-3.5 h-3.5" />;
                default: return <Tag className="w-3.5 h-3.5" />;
              }
            };

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
                  isActive
                    ? 'bg-[#0F4C9C] text-white border-[#0F4C9C] shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {getIcon()}
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-2xs border border-slate-200 space-y-3">
        <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-200">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="Procurar produtos, lojas ou serviços..."
            className="w-full bg-transparent text-xs sm:text-sm text-slate-800 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full px-2.5 sm:px-3 py-2 rounded-xl border border-slate-200 text-[11px] sm:text-xs bg-slate-50 font-semibold focus:outline-none text-slate-800"
          >
            <option value="Todas">Todas as Categorias</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={selectedMunicipality}
            onChange={e => setSelectedMunicipality(e.target.value)}
            className="w-full px-2.5 sm:px-3 py-2 rounded-xl border border-slate-200 text-[11px] sm:text-xs bg-slate-50 font-semibold focus:outline-none text-slate-800"
          >
            <option value="Todos">Todos os Municípios</option>
            {CUNENE_MUNICIPALITIES.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="w-full px-2.5 sm:px-3 py-2 rounded-xl border border-slate-200 text-[11px] sm:text-xs bg-slate-50 font-semibold focus:outline-none text-slate-800"
          >
            <option value="all">Disponibilidade</option>
            <option value="available">Disponível</option>
            <option value="sold">Esgotado</option>
          </select>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="w-full px-2.5 sm:px-3 py-2 rounded-xl border border-slate-200 text-[11px] sm:text-xs bg-slate-50 font-semibold focus:outline-none text-slate-800"
          >
            <option value="recent">Mais recentes</option>
            <option value="price-asc">Menor preço</option>
            <option value="price-desc">Maior preço</option>
          </select>
        </div>

        {/* Price range inputs */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-bold text-slate-500">Preço (AOA):</span>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              placeholder="Mín"
              className="w-20 sm:w-24 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50"
            />
            <span className="text-slate-400">-</span>
            <input
              type="number"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              placeholder="Máx"
              className="w-20 sm:w-24 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50"
            />
          </div>
          {(minPrice || maxPrice || keyword || selectedCategory !== 'Todas' || selectedMunicipality !== 'Todos') && (
            <button
              onClick={() => {
                setKeyword('');
                setSelectedCategory('Todas');
                setSelectedMunicipality('Todos');
                setSelectedStatus('all');
                setMinPrice('');
                setMaxPrice('');
              }}
              className="text-[11px] text-[#0F4C9C] font-bold hover:underline ml-auto"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Products Grid (Compact, Visual Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-2">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">Ainda não há produtos</h3>
            <p className="text-xs text-slate-500">As empresas do Cunene começarão a publicar produtos aqui.</p>
          </div>
        ) : (
          filteredProducts.map(prod => (
            <div
              key={prod.id}
              onClick={() => setSelectedProduct(prod)}
              className="bg-white rounded-[2rem] border border-slate-200/60 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="h-32 sm:h-44 bg-slate-50 overflow-hidden relative">
                  {prod.image_url ? (
                    <img
                      src={prod.image_url}
                      alt={prod.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                      <ShoppingBag className="w-10 h-10" />
                    </div>
                  )}

                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/20 shadow-sm">
                    <MapPin className="w-2.5 h-2.5 text-[#0F4C9C]" />
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">
                      {prod.municipality}
                    </span>
                  </div>

                  {prod.status !== 'available' && (
                    <span className="absolute top-2 right-2 bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                      Esgotado
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <div className="meta-text">
                    <span className="text-slate-400">{prod.category}</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 line-clamp-2 leading-tight group-hover:text-[#0F4C9C] transition-colors">{prod.title}</h4>
                  <p className="text-sm font-black text-[#0F4C9C] pt-1">
                    {(Number(prod.price) || 0).toLocaleString()} {prod.currency || 'AOA'}
                  </p>
                </div>
              </div>

              <div className="p-4 pt-0">
                {prod.contact_phone ? (
                  <button
                    onClick={(e) => handleWhatsAppContact(prod.contact_phone, prod.title, e)}
                    className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-black py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Contactar Vendedor</span>
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-slate-300 text-center block py-2 italic">Sem contacto</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        currentUser={currentUser}
        companies={companies}
        onSelectCompany={comp => {
          setSelectedProduct(null);
          if (onSelectCompany) onSelectCompany(comp);
        }}
        onOpenAuth={onOpenAuth}
      />
    </div>
  );
};
