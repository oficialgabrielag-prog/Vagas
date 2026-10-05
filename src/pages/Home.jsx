// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Search, MapPin, Briefcase, ShoppingBag, ArrowRight, Building2, Users, ChevronRight, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CUNENE_MUNICIPALITIES } from '../lib/types';
import { MarketplaceCarousel } from '../components/MarketplaceCarousel';

export const Home = ({
  jobs: initialJobs = [],
  products: initialProducts = [],
  posts = [],
  companies = [],
  setCurrentTab,
  onSelectJob,
  onSelectCompany,
  onSelectPost,
  currentUser,
  onOpenAuth
}) => {
  const [selectedMunicipality, setSelectedMunicipality] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [homeProducts, setHomeProducts] = useState(initialProducts);
  const [homeJobs, setHomeJobs] = useState(initialJobs);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gdjyrgufdjboqkusredk.supabase.co';

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);

      try {
        // Busque produtos
        let { data, error } = await supabase
          .from('produtos')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        console.log('HOME PRODUTOS (produtos):', data, error);

        // Se der erro ou vier vazio, tente buscar da tabela real 'marketplace'
        if (error || !data || data.length === 0) {
          const { data: mData, error: mError } = await supabase
            .from('marketplace')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

          console.log('HOME PRODUTOS (marketplace fallback):', mData, mError);

          if (mData && mData.length > 0) {
            data = mData.map(item => {
              const rawDesc = item.descricao || item.description || '';
              let cat = 'Outros';
              let mun = 'Ondjiva';
              let tel = '+244 923 000 000';
              let cleanDesc = rawDesc;

              const metaMatch = rawDesc.match(/<!--META:([\s\S]*?)-->/);
              if (metaMatch) {
                try {
                  const parsed = JSON.parse(metaMatch[1]);
                  if (parsed.cat) cat = parsed.cat;
                  if (parsed.mun) mun = parsed.mun;
                  if (parsed.tel) tel = parsed.tel;
                  cleanDesc = rawDesc.replace(metaMatch[0], '').trim();
                } catch {}
              }

              return {
                id: item.id,
                seller_id: item.company_id || item.seller_id || item.user_id || '',
                title: item.titulo || item.title || 'Produto',
                description: cleanDesc,
                price: Number(item.preco || item.price || 0),
                currency: 'AOA',
                category: cat,
                municipality: item.municipio || mun,
                contact_phone: item.telefone || tel,
                image_url: item.imagem_url || item.image_url || undefined,
                status: 'available',
                is_active: true,
                created_at: item.created_at
              };
            });
          }
        }

        if (isMounted) {
          if (data && data.length > 0) {
            setHomeProducts(data);
            localStorage.setItem('produtos_cache', JSON.stringify(data));
          } else {
            const cache = localStorage.getItem('produtos_cache');
            if (cache) {
              try {
                setHomeProducts(JSON.parse(cache));
              } catch {}
            }
          }
        }
      } catch (err) {
        console.error('Home products error:', err);
        const cache = localStorage.getItem('produtos_cache');
        if (cache && isMounted) {
          try {
            setHomeProducts(JSON.parse(cache));
          } catch {}
        }
      }

      try {
        // Fetch vagas (limit 6)
        const { data: vagasData, error: vagasError } = await supabase
          .from('vagas')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(6);

        if (isMounted && vagasData && vagasData.length > 0) {
          setHomeJobs(vagasData);
        }
      } catch (err) {
        console.error('Home jobs error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => { isMounted = false; };
  }, []);

  const effectiveProducts = homeProducts.length > 0 ? homeProducts : initialProducts;
  const effectiveJobs = homeJobs.length > 0 ? homeJobs : initialJobs;

  const navigateToAuthor = (productId) => {
    const product = effectiveProducts.find(p => p.id === productId);
    if (!product) return;
    
    const seller = companies.find(c => c.id === product.seller_id);
    if (seller) {
      onSelectCompany(seller);
    }
  };

  const filteredJobs = effectiveJobs.filter(j => {
    if (!j) return false;
    const matchMun = selectedMunicipality === 'Todos' || (j.municipality || '').toLowerCase().includes(selectedMunicipality.toLowerCase());
    const matchSearch = !searchTerm || (j.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || (j.company_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchMun && matchSearch && (j.status === 'active' || !j.status);
  });

  const filteredProducts = effectiveProducts.filter(p => {
    if (!p) return false;
    const matchMun = selectedMunicipality === 'Todos' || (p.municipality || '').toLowerCase().includes(selectedMunicipality.toLowerCase());
    const matchSearch = !searchTerm || (p.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || (p.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchMun && matchSearch && (p.is_active !== false && p.status !== 'sold');
  });

  const filteredCompanies = companies.filter(c => {
    if (!c) return false;
    const matchMun = selectedMunicipality === 'Todos' || (c.municipality && c.municipality.toLowerCase().includes(selectedMunicipality.toLowerCase()));
    const matchSearch = !searchTerm || (c.company_name && c.company_name.toLowerCase().includes(searchTerm.toLowerCase())) || (c.full_name && c.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchMun && matchSearch;
  });

  const recentPosts = posts.slice(0, 3);

  if (!supabaseUrl) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-rose-50 border-2 border-rose-200 rounded-3xl text-center space-y-3 shadow-xl">
        <AlertTriangle className="w-12 h-12 text-rose-600 mx-auto animate-bounce" />
        <h2 className="text-xl font-black text-rose-900">Erro: Configure ENV no AI Studio</h2>
        <p className="text-xs text-rose-700">A variável de ambiente VITE_SUPABASE_URL não foi detetada. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas configurações de ambiente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Hero Header */}
      <section className="relative h-[50vh] flex flex-col items-center justify-between overflow-hidden p-4 sm:p-6">
        <div className="absolute inset-0 z-0">
          <MarketplaceCarousel 
            products={effectiveProducts} 
            onNavigate={navigateToAuthor}
            title="Impulsione sua carreira."
          />
        </div>

        {/* Global Search Bar Overlay */}
        <div className="relative z-20 w-full max-w-xl mx-auto mt-2">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Pesquisar empresas, vagas ou produtos..."
              className="w-full pl-11 pr-10 py-3.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/60 focus:outline-none focus:border-[#0F4C9C] text-sm text-slate-800 font-medium placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full w-5 h-5 flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Loading Skeleton fallback */}
      {loading && (
        <div className="max-w-4xl mx-auto px-4 space-y-4 animate-pulse">
          <div className="h-6 bg-slate-200 rounded-lg w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-28 bg-slate-100 rounded-2xl border border-slate-200" />
            <div className="h-28 bg-slate-100 rounded-2xl border border-slate-200" />
          </div>
        </div>
      )}

      {/* Empresas Encontradas na pesquisa */}
      {searchTerm && filteredCompanies.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#0F4C9C]" />
              Empresas Encontradas ({filteredCompanies.length})
            </h2>
            <button
              type="button"
              onClick={() => setCurrentTab('companies')}
              className="text-xs font-bold text-[#0F4C9C] hover:underline"
            >
              Ver todas as empresas
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredCompanies.slice(0, 4).map(comp => {
              const displayLogo = comp.company?.logo_url || comp.company_logo || comp.avatar_url;
              return (
                <div
                  key={comp.id}
                  onClick={() => onSelectCompany(comp)}
                  className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-[#0F4C9C] transition cursor-pointer shadow-2xs flex items-center gap-3.5 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center">
                    {displayLogo ? (
                      <img src={displayLogo} alt={comp.company_name || comp.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#0F4C9C] text-white flex items-center justify-center font-bold text-base">
                        {(comp.company_name || comp.full_name || 'E').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-[#0F4C9C] transition">
                      {comp.company_name || comp.full_name}
                    </h4>
                    <p className="text-xs text-slate-500 truncate">
                      {comp.municipality || 'Ondjiva'} • {comp.industry || 'Empresa'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0F4C9C] group-hover:translate-x-0.5 transition" />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Municípios do Cunene */}
      <section className="max-w-4xl mx-auto px-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-slate-900">Navegar por Município</h2>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedMunicipality('Todos')}
            className={`text-sm font-extrabold whitespace-nowrap transition-all border-b-2 py-1.5 ${
              selectedMunicipality === 'Todos'
                ? 'border-[#0F4C9C] text-[#0F4C9C]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Todo o Cunene
          </button>
          {CUNENE_MUNICIPALITIES.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setSelectedMunicipality(m)}
              className={`text-sm font-extrabold whitespace-nowrap transition-all border-b-2 py-1.5 ${
                selectedMunicipality === m
                  ? 'border-[#0F4C9C] text-[#0F4C9C]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </section>

      {/* Vagas em Destaque */}
      <section className="max-w-4xl mx-auto px-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-slate-900">Vagas em Destaque</h2>
          <button
            type="button"
            onClick={() => setCurrentTab('jobs')}
            className="text-xs font-bold text-[#0F4C9C] hover:underline"
          >
            Ver todas as oportunidades
          </button>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 text-slate-400 text-sm font-medium">
            Nenhuma vaga aberta neste município no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredJobs.slice(0, 4).map(job => {
              const compObj = companies.find(c => c.id === job.employer_id);
              const displayJobLogo = job.company_logo || compObj?.company?.logo_url || compObj?.company_logo || compObj?.avatar_url;

              return (
                <div
                  key={job.id}
                  onClick={() => onSelectJob(job)}
                  className="bg-white p-5 rounded-[2rem] border border-slate-200/60 hover:border-[#0F4C9C]/40 transition-all cursor-pointer shadow-xs hover:shadow-md flex items-start gap-4"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 shrink-0 overflow-hidden flex items-center justify-center p-2">
                    {displayJobLogo ? (
                      <img src={displayJobLogo} alt={job.company_name} className="w-full h-full object-contain" />
                    ) : (
                      <Building2 className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 text-xs font-bold">
                      <span className="text-[#0F4C9C]">{job.company_name}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500">{job.municipality}</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">{job.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3">
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">{job.contract_type || 'Presencial'}</span>
                      {job.has_exam && (
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">Exame Técnico</span>
                      )}
                      {job.salary_min && (
                        <span className="text-xs sm:text-sm font-black text-slate-900 ml-auto">
                          {(Number(job.salary_min) || 0).toLocaleString()} {job.salary_currency || 'AOA'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Empresas em Destaque */}
      <section className="max-w-4xl mx-auto px-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
            <Building2 className="w-5 h-5 text-[#0F4C9C]" />
            <span>Empresas em Destaque</span>
          </div>
          <button
            type="button"
            onClick={() => setCurrentTab('companies')}
            className="text-xs font-bold text-[#0F4C9C] flex items-center hover:underline"
          >
            <span>Ver todas</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {filteredCompanies.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-slate-500 text-sm font-medium">
            Nenhuma empresa cadastrada neste município ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {filteredCompanies.slice(0, 3).map(company => {
              const displayLogo = company.company?.logo_url || company.company_logo || company.avatar_url;
              return (
                <div
                  key={company.id}
                  onClick={() => onSelectCompany(company)}
                  className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:border-[#0F4C9C] transition cursor-pointer shadow-2xs group"
                >
                  <div className="h-20 bg-gradient-to-r from-[#0F4C9C] to-slate-800 relative">
                    {company.cover_url && (
                      <img src={company.cover_url} alt="Capa" className="w-full h-full object-cover opacity-80" />
                    )}
                  </div>
                  <div className="p-4 pt-0 relative">
                    <div className="w-14 h-14 rounded-2xl bg-white p-1 border-2 border-white shadow -mt-7 mb-2 overflow-hidden shrink-0">
                      {displayLogo ? (
                        <img src={displayLogo} alt={company.company_name || company.full_name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <div className="w-full h-full bg-[#0F4C9C] text-white flex items-center justify-center font-bold text-base rounded-xl">
                          {(company.company_name || company.full_name || 'E').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 truncate">{company.company_name || company.full_name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{company.municipality || 'Ondjiva'} • {company.industry || 'Empresa'}</p>
                    <div className="mt-3 flex items-center justify-between text-xs font-bold text-[#0F4C9C]">
                      <span>Ver vitrine</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Marketplace Preview */}
      <section className="max-w-4xl mx-auto px-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-sm sm:text-base">
            <ShoppingBag className="w-4 h-4 text-[#0F4C9C]" />
            <span>Marketplace & Negócios Locais</span>
          </div>
          <button
            type="button"
            onClick={() => setCurrentTab('marketplace')}
            className="text-xs font-bold text-[#0F4C9C] flex items-center hover:underline"
          >
            <span>Ver mercado</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-400 text-xs">
            Nenhum produto publicado no momento neste município.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProducts.slice(0, 3).map(prod => (
              <div
                key={prod.id}
                onClick={() => setCurrentTab('marketplace')}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:border-[#0F4C9C] transition cursor-pointer"
              >
                <div className="h-28 bg-slate-100 overflow-hidden relative">
                  {prod.image_url ? (
                    <img src={prod.image_url} alt={prod.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                  )}
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-md font-medium">
                    {prod.municipality}
                  </span>
                </div>
                <div className="p-3">
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{prod.title}</h4>
                  <span className="text-xs font-black text-[#0F4C9C] mt-1 block">
                    {(Number(prod.price) || 0).toLocaleString()} {prod.currency || 'AOA'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Comunidade Profissional */}
      {recentPosts.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-sm sm:text-base">
              <Users className="w-4 h-4 text-[#0F4C9C]" />
              <span>Comunidade Profissional</span>
            </div>
            <button
              type="button"
              onClick={() => setCurrentTab('community')}
              className="text-xs font-bold text-[#0F4C9C] flex items-center hover:underline"
            >
              <span>Ver feed</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentPosts.map(post => (
              <div
                key={post.id}
                onClick={() => {
                  if (onSelectPost) onSelectPost(post);
                  else setCurrentTab('community');
                }}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-[#0F4C9C] text-white flex items-center justify-center font-bold text-xs overflow-hidden">
                    {post.author_avatar ? (
                      <img src={post.author_avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      (post.author_name || 'U').charAt(0)
                    )}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">{post.author_name || 'Utilizador'}</h5>
                    <span className="text-[10px] text-slate-400">{post.category || 'Comunidade'}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-700 line-clamp-2">{post.content}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
