import React, { useState, useMemo, useEffect } from 'react';
import { 
  Briefcase, Search, MapPin, Building2, TrendingUp, Sparkles, 
  ArrowRight, Plus, ShoppingBag, ShieldCheck, CheckCircle2, 
  DollarSign, Clock, ChevronRight, Bell, Filter, Star, GraduationCap, Newspaper
} from 'lucide-react';
import { Job, MarketplaceProduct, CommunityPost, UserProfile, PlatformStats, ExamAttempt, CUNENE_MUNICIPALITIES } from '../lib/types';
import { StoreService } from '../lib/store';
import { GiantCinematicCarousel } from '../components/GiantCinematicCarousel';
import { StoriesBar } from '../components/StoriesBar';
import { CompaniesHorizontalCarousel } from '../components/CompaniesHorizontalCarousel';

interface HomeProps {
  jobs: Job[];
  products: MarketplaceProduct[];
  posts?: CommunityPost[];
  companies: UserProfile[];
  setCurrentTab: (tab: string) => void;
  onSelectJob: (job: Job) => void;
  onSelectCompany: (company: UserProfile) => void;
  onSelectPost?: (post: CommunityPost) => void;
  onSelectProduct?: (product: MarketplaceProduct) => void;
  currentUser: UserProfile | null;
  onOpenAuth?: () => void;
}

export const Home: React.FC<HomeProps> = ({
  jobs = [],
  products = [],
  posts = [],
  companies = [],
  setCurrentTab,
  onSelectJob,
  onSelectCompany,
  onSelectProduct,
  onSelectPost,
  currentUser,
  onOpenAuth
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState('Todos');

  // Attempts for merit ranking
  const [attempts, setAttempts] = useState<ExamAttempt[]>(() => StoreService.getExamAttempts());

  React.useEffect(() => {
    setAttempts(StoreService.getExamAttempts());
  }, []);

  // Real canonical platform statistics from Supabase
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = () => {
      StoreService.getPlatformUserStats().then(stats => {
        if (isMounted) setPlatformStats(stats);
      });
    };
    fetchStats();

    const handleStatsUpdate = (e: any) => {
      if (e.detail?.stats && isMounted) {
        setPlatformStats(e.detail.stats);
      } else {
        fetchStats();
      }
    };

    window.addEventListener('cunene_user_stats_updated', handleStatsUpdate);
    window.addEventListener('focus', fetchStats);
    window.addEventListener('online', fetchStats);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchStats();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      window.removeEventListener('cunene_user_stats_updated', handleStatsUpdate);
      window.removeEventListener('focus', fetchStats);
      window.removeEventListener('online', fetchStats);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Featured active jobs (up to 3)
  const featuredJobs = useMemo(() => {
    return jobs
      .filter(j => j.status === 'active')
      .slice(0, 3);
  }, [jobs]);

  const [activeCampaigns, setActiveCampaigns] = useState<any[]>(() => StoreService.getFeaturedCampaigns().filter(c => c.status === 'active'));

  useEffect(() => {
    const handleCampaignsUpdate = (e: any) => {
      const all = e.detail?.campaigns || StoreService.getFeaturedCampaigns();
      setActiveCampaigns(all.filter((c: any) => c.status === 'active'));
    };
    window.addEventListener('cunene_campaigns_updated', handleCampaignsUpdate);
    return () => window.removeEventListener('cunene_campaigns_updated', handleCampaignsUpdate);
  }, []);

  // Featured products (up to 4)
  const featuredProducts = useMemo(() => {
    const sponsoredProdIds = activeCampaigns.filter(c => c.type === 'product').map(c => c.target_id);
    const sponsored = products.filter(p => sponsoredProdIds.includes(p.id) && p.status === 'available');
    const others = products.filter(p => !sponsoredProdIds.includes(p.id) && p.status === 'available');
    return [...sponsored, ...others].slice(0, 4);
  }, [products, activeCampaigns]);

  // Featured companies (up to 4)
  const featuredCompanies = useMemo(() => {
    const sponsoredCompIds = activeCampaigns.filter(c => c.type === 'company').map(c => c.target_id);
    const sponsored = companies.filter(c => sponsoredCompIds.includes(c.id));
    const others = companies.filter(c => !sponsoredCompIds.includes(c.id));
    return [...sponsored, ...others].slice(0, 4);
  }, [companies, activeCampaigns]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentTab('jobs');
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans antialiased text-[var(--ink)] pb-32 space-y-10 pt-0">

      {/* GOOGLE DESIGN EDITORIAL HEADER BANNER */}
      <div className="bg-[var(--bg)] pt-6 pb-2 px-6 max-w-5xl mx-auto border-b border-[var(--line)]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-[var(--blue)]">Editorial • CuneneVagas</span>
            <h1 className="text-3xl sm:text-5xl font-black text-[var(--ink)] tracking-tight font-display">
              Best of Cunene
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--mute)] max-w-md leading-relaxed">
            Destaques da província, oportunidades profissionais e negócios locais com o selo de qualidade editorial.
          </p>
        </div>
      </div>

      {/* CARROSSEL GIGANTE CINEMATOGRÁFICO EDITORIAL */}
      <div className="w-full overflow-hidden shadow-xs border-y border-[#D1E3F8]">
        <GiantCinematicCarousel 
          jobs={jobs}
          products={products}
          companies={companies}
          posts={posts}
          onSelectJob={onSelectJob}
          onSelectProduct={prod => onSelectProduct && onSelectProduct(prod)}
          onSelectCompany={onSelectCompany}
          onNavigateTab={setCurrentTab}
        />
      </div>

      {/* 3. ACESSO RÁPIDO EDITORIAL (5 cartões) */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-5 gap-2 sm:gap-4">
          <button 
            onClick={() => setCurrentTab('jobs')}
            className="bg-white hover:bg-blue-50/60 border border-[#D1E3F8] p-3 sm:p-4 rounded-2xl flex flex-col items-center text-center gap-2 transition shadow-xs hover:border-[#1A73E8] group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1A73E8] flex items-center justify-center group-hover:scale-110 transition">
              <Briefcase className="w-5 h-5 text-[#1A73E8]" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-bold text-[#111827] leading-tight">Vagas</div>
              <div className="text-[9px] text-[#4B5563] hidden sm:block">Emprego</div>
            </div>
          </button>

          <button 
            onClick={() => setCurrentTab('marketplace')}
            className="bg-white hover:bg-amber-50/60 border border-[#D1E3F8] p-3 sm:p-4 rounded-2xl flex flex-col items-center text-center gap-2 transition shadow-xs hover:border-amber-400 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition">
              <ShoppingBag className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-bold text-[#111827] leading-tight">Market</div>
              <div className="text-[9px] text-[#4B5563] hidden sm:block">Negócios</div>
            </div>
          </button>

          <button 
            onClick={() => setCurrentTab('companies')}
            className="bg-white hover:bg-emerald-50/60 border border-[#D1E3F8] p-3 sm:p-4 rounded-2xl flex flex-col items-center text-center gap-2 transition shadow-xs hover:border-emerald-500 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
              <Building2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-bold text-[#111827] leading-tight">Empresas</div>
              <div className="text-[9px] text-[#4B5563] hidden sm:block">Parceiras</div>
            </div>
          </button>

          <button 
            onClick={() => setCurrentTab('dashboard')}
            className="bg-white hover:bg-purple-50/60 border border-[#D1E3F8] p-3 sm:p-4 rounded-2xl flex flex-col items-center text-center gap-2 transition shadow-xs hover:border-purple-500 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition">
              <GraduationCap className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-bold text-[#111827] leading-tight">Cursos</div>
              <div className="text-[9px] text-[#4B5563] hidden sm:block">Exames</div>
            </div>
          </button>

          <button 
            onClick={() => setCurrentTab('community')}
            className="bg-white hover:bg-rose-50/60 border border-[#D1E3F8] p-3 sm:p-4 rounded-2xl flex flex-col items-center text-center gap-2 transition shadow-xs hover:border-rose-500 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition">
              <Newspaper className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-bold text-[#111827] leading-tight">Feed</div>
              <div className="text-[9px] text-[#4B5563] hidden sm:block">Notícias</div>
            </div>
          </button>
        </div>
      </div>

      {/* 4. VAGAS EM DESTAQUE EDITORIAL */}
      <section className="max-w-5xl mx-auto px-4 space-y-4">
        <div className="flex items-center justify-between border-b border-[#D1E3F8] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <h2 className="text-xl sm:text-2xl font-black text-[#111827] tracking-tight">
              Vagas em Destaque
            </h2>
          </div>
          <button 
            onClick={() => setCurrentTab('jobs')}
            className="text-xs sm:text-sm font-bold text-[#1A73E8] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Ver todas</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {featuredJobs.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-[#D1E3F8] space-y-2">
            <Briefcase className="w-8 h-8 text-[#4B5563] mx-auto" />
            <p className="text-xs text-[#4B5563]">Sem vagas ativas no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredJobs.map(job => (
              <div 
                key={job.id}
                onClick={() => onSelectJob(job)}
                className="bg-white rounded-2xl p-5 border border-[#D1E3F8] hover:border-[#1A73E8] hover:shadow-lg transition flex flex-col justify-between cursor-pointer group space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-[#1A73E8] text-sm shrink-0 overflow-hidden">
                      {job.company_logo ? (
                        <img src={job.company_logo} alt={job.company_name} className="w-full h-full object-cover" />
                      ) : (
                        job.company_name?.charAt(0) || 'C'
                      )}
                    </div>
                    <span className="bg-blue-50 text-[#1A73E8] font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-blue-100">
                      {job.category || 'Tempo integral'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-[#111827] group-hover:text-[#1A73E8] transition line-clamp-1">
                      {job.title}
                    </h3>
                    <p className="text-xs font-semibold text-[#4B5563] line-clamp-1 mt-0.5">
                      {job.company_name}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#D1E3F8]">
                  <div className="flex items-center justify-between text-xs text-[#4B5563] font-medium">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#1A73E8]" />
                      {job.municipality || 'Ondjiva'}
                    </span>
                    <span className="font-bold text-[#111827]">
                      {job.salary_min && job.salary_max 
                        ? `${job.salary_min.toLocaleString()} ${job.salary_currency || 'AOA'}` 
                        : 'A combinar'}
                    </span>
                  </div>

                  <button className="w-full py-2 bg-[#F4F9FD] group-hover:bg-[#1A73E8] group-hover:text-white text-[#111827] font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs">
                    <span>Ver vaga</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. TODAS AS EMPRESAS REGISTADAS (Carrossel Horizontal) */}
      <CompaniesHorizontalCarousel 
        companies={companies}
        onSelectCompany={onSelectCompany}
        onViewAll={() => setCurrentTab('companies')}
        title="Empresas Registadas no Cunene"
        subtitle="Conheça todos os nossos parceiros, lojas e empregadores locais"
      />

      {/* 6. PRODUTOS EM DESTAQUE */}
      <section className="max-w-5xl mx-auto px-4 space-y-4">
        <div className="flex items-center justify-between border-b border-[#D1E3F8] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛒</span>
            <h2 className="text-xl sm:text-2xl font-black text-[#111827] tracking-tight">
              Produtos em Destaque
            </h2>
          </div>
          <button 
            onClick={() => setCurrentTab('marketplace')}
            className="text-xs sm:text-sm font-bold text-[#1A73E8] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Ver todos</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {featuredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-[#D1E3F8] space-y-2">
            <ShoppingBag className="w-8 h-8 text-[#4B5563] mx-auto" />
            <p className="text-xs text-[#4B5563]">Sem produtos disponíveis no marketplace.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {featuredProducts.map(prod => (
              <div 
                key={prod.id}
                onClick={() => onSelectProduct && onSelectProduct(prod)}
                className="bg-white rounded-2xl overflow-hidden border border-[#D1E3F8] hover:border-amber-400 hover:shadow-lg transition cursor-pointer group flex flex-col justify-between"
              >
                <div className="relative h-36 bg-slate-100 overflow-hidden">
                  <img src={prod.image_url || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&q=80&w=400'} alt={prod.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                  <span className="absolute top-2 left-2 bg-emerald-600 text-white font-black text-[9px] px-2 py-0.5 rounded-md shadow-sm">
                    Disponível
                  </span>
                </div>

                <div className="p-3.5 space-y-1.5">
                  <h3 className="font-bold text-xs text-[#111827] group-hover:text-[#1A73E8] transition line-clamp-1">
                    {prod.title}
                  </h3>
                  <div className="text-xs font-black text-[#1A73E8]">
                    {prod.price ? `${Number(prod.price).toLocaleString('pt-AO')} Kz` : 'Sob consulta'}
                  </div>
                  <div className="text-[10px] text-[#4B5563] flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#4B5563]" />
                    <span>{prod.municipality || 'Ondjiva'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 7. NOVIDADES NO MERCADO (Bottom Banner Editorial) */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="rounded-3xl bg-[#111827] text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl border border-slate-800">
          <div className="flex items-center gap-5 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-[#1A73E8] text-white flex items-center justify-center font-black shrink-0 shadow-md">
              <TrendingUp className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-lg sm:text-xl text-white">Novidades no Mercado de Cunene</h3>
              <p className="text-xs text-slate-300 font-medium">Acompanhe as últimas oportunidades, produtos e tendências da província.</p>
            </div>
          </div>

          <button 
            onClick={() => setCurrentTab('community')}
            className="bg-[#1A73E8] hover:bg-blue-600 text-white font-black px-6 py-3 rounded-2xl text-xs transition shadow-md flex items-center gap-2.5 shrink-0 cursor-pointer"
          >
            <span>Aceder ao Feed</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
