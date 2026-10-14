// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  MapPin, 
  Briefcase, 
  ShoppingBag, 
  Building2, 
  Clock, 
  Calendar, 
  ChevronRight, 
  ChevronLeft,
  ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StoreService } from '../lib/store';

export const Home = ({
  jobs: initialJobs = [],
  products: initialProducts = [],
  posts = [],
  companies = [],
  setCurrentTab,
  onSelectJob,
  onSelectCompany,
  onSelectPost,
  onSelectProduct,
  currentUser,
  onOpenAuth
}) => {
  const [selectedMunicipality, setSelectedMunicipality] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [realProducts, setRealProducts] = useState(initialProducts);
  const [realJobs, setRealJobs] = useState(initialJobs);

  const marketplaceScrollRef = useRef(null);

  // Sincronizar produtos reais se a lista inicial vier vazia
  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setRealProducts(initialProducts);
    } else {
      let isMounted = true;
      const fetchMarketplaceProducts = async () => {
        try {
          const { data, error } = await supabase
            .from('marketplace')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(16);

          if (!error && data && data.length > 0 && isMounted) {
            const mapped = data.map(item => {
              let mun = 'Ondjiva';
              const rawDesc = item.descricao || item.description || '';
              const metaMatch = rawDesc.match(/<!--META:([\s\S]*?)-->/);
              if (metaMatch) {
                try {
                  const parsed = JSON.parse(metaMatch[1]);
                  if (parsed.mun) mun = parsed.mun;
                } catch {}
              }
              return {
                id: item.id,
                seller_id: item.company_id || item.seller_id || '',
                title: item.titulo || item.title || 'Produto',
                description: rawDesc,
                price: Number(item.preco || item.price || 0),
                currency: item.moeda || item.currency || 'Kz',
                municipality: item.municipio || mun,
                image_url: item.imagem_url || item.image_url || '',
                created_at: item.created_at || new Date().toISOString()
              };
            });
            setRealProducts(mapped);
          }
        } catch (err) {
          console.warn('Erro ao carregar produtos reais:', err);
        }
      };
      fetchMarketplaceProducts();
      return () => { isMounted = false; };
    }
  }, [initialProducts]);

  // Sincronizar vagas reais se a lista inicial vier vazia
  useEffect(() => {
    if (initialJobs && initialJobs.length > 0) {
      setRealJobs(initialJobs);
    } else {
      let isMounted = true;
      StoreService.fetchJobs().then(fetched => {
        if (isMounted && fetched && fetched.length > 0) {
          setRealJobs(fetched);
        }
      }).catch(err => {
        console.warn('Erro ao carregar vagas reais:', err);
      });
      return () => { isMounted = false; };
    }
  }, [initialJobs]);

  // Formatação de datas relativas reais
  const formatJobDate = (dateStr) => {
    if (!dateStr) return 'Recente';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Recente';
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return 'Agora';
      if (diffHours < 24) return 'Hoje';
      if (diffDays === 1) return 'Ontem';
      if (diffDays < 7) return `Há ${diffDays} dias`;
      if (diffDays < 30) return `Há ${Math.floor(diffDays / 7)} sem.`;
      return date.toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit' });
    } catch {
      return 'Recente';
    }
  };

  // Filtragem estrita dos dados reais existentes
  const effectiveJobs = realJobs.length > 0 ? realJobs : initialJobs;
  const filteredJobs = effectiveJobs.filter(job => {
    const matchMun = selectedMunicipality === 'Todos' || !selectedMunicipality || 
      (job.municipality || '').toLowerCase() === selectedMunicipality.toLowerCase();
    const matchSearch = !searchTerm || 
      (job.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchMun && matchSearch;
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm || selectedMunicipality !== 'Todos') {
      setCurrentTab('jobs');
    }
  };

  const scrollMarketplace = (direction) => {
    if (marketplaceScrollRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      marketplaceScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const effectiveProducts = realProducts.length > 0 ? realProducts : initialProducts;

  return (
    <div className="bg-white text-[#263449] min-h-screen">
      
      {/* =========================================================================
          1. ÁREA PRINCIPAL (HERO)
          Reprodução fiel da composição da imagem de referência:
          - Texto à esquerda
          - Imagem panorâmica de Angola à direita
          - Transição visual suave entre o fundo branco e a fotografia
          - Título grande em azul-marinho (#123D73) com parte em dourado (#F5B91B)
          - Descrição curta e legível (#66758A)
          - Pesquisa por cargo e município + botão azul-marinho
          - Acesso secundário às funcionalidades de empresas
         ========================================================================= */}
      <section className="relative overflow-hidden bg-white border-b border-slate-100">
        
        {/* Fotografia panorâmica de Angola posicionada à direita com transição suave */}
        <div className="absolute right-0 top-0 bottom-0 w-full md:w-3/5 lg:w-1/2 pointer-events-none select-none z-0 overflow-hidden">
          <img
            src="/luanda_skyline_hero.jpg"
            alt="Panorâmica de Angola"
            className="w-full h-full object-cover object-center opacity-85 md:opacity-95"
          />
          {/* Transição suave em gradiente do fundo branco para a fotografia */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 md:via-white/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 sm:py-16 lg:py-20 relative z-10">
          <div className="max-w-2xl space-y-4">
            
            {/* Tagline / Eyebrow institucional */}
            <div className="inline-block">
              <span className="text-xs sm:text-sm font-bold tracking-[0.2em] text-[#123D73] uppercase">
                Oportunidades em Angola
              </span>
            </div>

            {/* Título Principal */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-black tracking-tight leading-[1.15] text-[#123D73]">
              Encontra a oportunidade certa <br className="hidden sm:inline" />
              <span className="text-[#F5B91B]">para o teu futuro.</span>
            </h1>

            {/* Descrição curta e legível */}
            <p className="text-sm sm:text-base text-[#66758A] leading-relaxed max-w-xl font-normal pt-1">
              Descobre oportunidades de emprego em Angola, acompanha candidaturas e aproxima-te das empresas que procuram o teu talento.
            </p>

            {/* Barra de Pesquisa Integrada */}
            <form onSubmit={handleSearchSubmit} className="pt-4">
              <div className="bg-white border border-slate-200 rounded-xl p-2 sm:p-2.5 shadow-[0_2px_12px_rgba(18,61,115,0.06)] flex flex-col md:flex-row items-stretch gap-2">
                
                {/* Input de Cargo / Palavra-chave */}
                <div className="flex-1 flex items-center gap-2.5 px-3 py-2 text-slate-700">
                  <Search className="w-4 h-4 text-[#66758A] shrink-0" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cargo, competência ou palavra-chave"
                    className="w-full text-xs sm:text-sm text-[#263449] placeholder:text-[#66758A]/80 outline-none bg-transparent font-medium"
                  />
                </div>

                <div className="hidden md:block w-px bg-slate-200 self-stretch my-1"></div>

                {/* Dropdown de Município */}
                <div className="md:w-56 flex items-center gap-2 px-3 py-2 text-slate-700">
                  <MapPin className="w-4 h-4 text-[#66758A] shrink-0" />
                  <select
                    value={selectedMunicipality}
                    onChange={(e) => setSelectedMunicipality(e.target.value)}
                    className="w-full text-xs sm:text-sm text-[#263449] outline-none bg-transparent font-medium cursor-pointer"
                  >
                    <option value="Todos">Município (Todos)</option>
                    <option value="Ondjiva">Ondjiva (Cunene)</option>
                    <option value="Namacunde">Namacunde</option>
                    <option value="Ombadja">Ombadja</option>
                    <option value="Cahama">Cahama</option>
                    <option value="Cuvelai">Cuvelai</option>
                    <option value="Curoca">Curoca</option>
                    <option value="Luanda">Luanda</option>
                    <option value="Lubango">Lubango</option>
                    <option value="Benguela">Benguela</option>
                    <option value="Huambo">Huambo</option>
                  </select>
                </div>

                {/* Botão azul-marinho para pesquisar vagas */}
                <button
                  type="submit"
                  className="bg-[#123D73] hover:bg-[#0d2f59] text-white font-bold px-6 py-3 rounded-lg transition text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs cursor-pointer shrink-0"
                >
                  <Search className="w-4 h-4 text-white" />
                  <span>Pesquisar vagas</span>
                </button>
              </div>
            </form>

            {/* Acesso secundário às funcionalidades de empresas */}
            <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-[#123D73]">
              <Building2 className="w-4 h-4 text-[#123D73] shrink-0" />
              <span>Queres publicar uma vaga?</span>
              <button
                type="button"
                onClick={() => {
                  if (currentUser?.role === 'employer') {
                    setCurrentTab('dashboard');
                  } else if (currentUser) {
                    alert('Alterne o seu perfil para Empresa para publicar novas vagas.');
                  } else {
                    onOpenAuth ? onOpenAuth('login') : setCurrentTab('login');
                  }
                }}
                className="font-bold text-[#123D73] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Empresas e recrutadores</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#123D73]" />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          2. VAGAS RECENTES — SEM CARDS
          - Apresentação em lista aberta e horizontalmente organizada
          - Fundo branco com separadores discretos
          - Sem cards, sem bordas pesadas, sem pílulas decorativas
          - Logótipo real da empresa, título, nome, município, modalidade, data, salário (quando existir)
          - Carrega exclusivamente dados reais
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        
        {/* Cabeçalho da Secção */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#263449] tracking-tight">
              Vagas recentes
            </h2>
            <p className="text-xs sm:text-sm text-[#66758A] mt-1 font-normal">
              Oportunidades de emprego nas principais áreas e municípios de Angola.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentTab('jobs')}
            className="text-xs sm:text-sm font-bold text-[#123D73] hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>Ver todas as vagas</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de Vagas — SEM CARDS */}
        {filteredJobs.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredJobs.slice(0, 8).map((job) => (
              <div
                key={job.id}
                onClick={() => onSelectJob && onSelectJob(job)}
                className="py-4 sm:py-5 px-2 sm:px-3 hover:bg-[#F8FAFC] transition cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Esquerda: Logótipo Real + Título + Empresa */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                    {job.company_logo ? (
                      <img 
                        src={job.company_logo} 
                        alt={job.company_name || 'Empresa'} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full bg-[#123D73] text-white flex items-center justify-center font-bold text-sm">
                        {(job.company_name || 'E').charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-[#263449] group-hover:text-[#123D73] transition truncate">
                      {job.title || job.titulo || 'Vaga de Emprego'}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#66758A] font-normal truncate mt-0.5">
                      {job.company_name || 'Empresa Registada'}
                    </p>
                  </div>
                </div>

                {/* Metadados Alinhados Horizontalmente */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-7 text-xs text-[#66758A] pl-15 md:pl-0">
                  
                  {/* Município */}
                  <div className="flex items-center gap-1.5 min-w-[85px]">
                    <MapPin className="w-3.5 h-3.5 text-[#66758A] shrink-0" />
                    <span>{job.municipality || 'Angola'}</span>
                  </div>

                  {/* Modalidade / Regime */}
                  <div className="flex items-center gap-1.5 min-w-[95px]">
                    <Clock className="w-3.5 h-3.5 text-[#66758A] shrink-0" />
                    <span>{job.contract_type || 'Tempo Inteiro'}</span>
                  </div>

                  {/* Data de Publicação */}
                  <div className="flex items-center gap-1.5 min-w-[75px]">
                    <Calendar className="w-3.5 h-3.5 text-[#66758A] shrink-0" />
                    <span>{formatJobDate(job.created_at)}</span>
                  </div>

                  {/* Salário — Apenas quando existir */}
                  {(job.salary_min || job.salary) && (
                    <div className="flex items-center gap-1 text-xs font-semibold text-[#123D73] min-w-[80px]">
                      <span>
                        {job.salary_min 
                          ? `${Number(job.salary_min).toLocaleString()} Kz` 
                          : `${job.salary} Kz`}
                      </span>
                    </div>
                  )}

                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#123D73] group-hover:translate-x-1 transition hidden md:block shrink-0" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-[#66758A] text-sm">
            Nenhuma vaga encontrada com os filtros selecionados.
          </div>
        )}

      </section>

      {/* =========================================================================
          3. MARKETPLACE NO FINAL DA PÁGINA ("Descobre no Marketplace")
          - Título à esquerda e link à direita
          - Produtos alinhados horizontalmente
          - Fotografias reais dos anúncios
          - Nome, preço em Kwanzas e município
          - SEM cards, SEM caixas, SEM fundos individuais, SEM bordas ou sombras
          - As informações aparecem diretamente sobre o fundo branco
          - Carrega exclusivamente produtos reais e publicados
         ========================================================================= */}
      {effectiveProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 border-t border-slate-100">
          
          {/* Cabeçalho da Secção */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#263449] tracking-tight">
                Descobre no Marketplace
              </h2>
              <p className="text-xs sm:text-sm text-[#66758A] mt-1 font-normal">
                Produtos e serviços reais disponíveis na tua região.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentTab('marketplace')}
              className="text-xs sm:text-sm font-bold text-[#123D73] hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>Ver mais produtos</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Expositor Aberto de Produtos — Diretamente sobre o fundo branco, sem caixas/cards */}
          <div className="relative pt-6">
            <div 
              ref={marketplaceScrollRef}
              className="flex items-start gap-8 sm:gap-10 overflow-x-auto scrollbar-none pb-4 scroll-smooth"
            >
              {effectiveProducts.slice(0, 10).map((product) => (
                <div
                  key={product.id}
                  onClick={() => onSelectProduct ? onSelectProduct(product) : setCurrentTab('marketplace')}
                  className="w-44 sm:w-52 shrink-0 group cursor-pointer flex flex-col"
                >
                  {/* Fotografia real do produto sem caixa, borda ou fundo cinzento */}
                  <div className="h-40 sm:h-44 w-full flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.title || 'Produto'}
                        referrerPolicy="no-referrer"
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-16 h-16 flex items-center justify-center text-slate-300">
                        <ShoppingBag className="w-10 h-10" />
                      </div>
                    )}
                  </div>

                  {/* Informações diretamente sobre o fundo branco */}
                  <div className="pt-3 space-y-1">
                    <h4 className="text-xs sm:text-sm font-semibold text-[#263449] group-hover:text-[#123D73] transition truncate">
                      {product.title || product.titulo || 'Produto'}
                    </h4>
                    <p className="text-sm sm:text-base font-bold text-[#123D73]">
                      {Number(product.price || product.preco || 0).toLocaleString()} {product.currency || product.moeda || 'Kz'}
                    </p>
                    {(product.municipality || product.municipio) && (
                      <div className="flex items-center gap-1 text-[11px] text-[#66758A]">
                        <MapPin className="w-3 h-3 text-[#66758A] shrink-0" />
                        <span className="truncate">{product.municipality || product.municipio}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Controles discretos de navegação horizontal */}
              <div className="flex items-center gap-2 self-center shrink-0 pl-2">
                <button
                  type="button"
                  onClick={() => scrollMarketplace('left')}
                  className="w-9 h-9 rounded-full border border-slate-200 text-slate-700 bg-white shadow-2xs flex items-center justify-center hover:bg-slate-50 transition cursor-pointer"
                  title="Recuar produtos"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-700" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollMarketplace('right')}
                  className="w-9 h-9 rounded-full border border-slate-200 text-slate-700 bg-white shadow-2xs flex items-center justify-center hover:bg-slate-50 transition cursor-pointer"
                  title="Avançar produtos"
                >
                  <ChevronRight className="w-4 h-4 text-slate-700" />
                </button>
              </div>
            </div>
          </div>

        </section>
      )}

    </div>
  );
};
