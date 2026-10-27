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
    <div className="min-h-screen bg-[#F6F8FC] font-sans antialiased text-[#14213D] pb-28 space-y-6 sm:space-y-8 pt-0">

      {/* CARROSSEL GIGANTE CINEMATOGRÁFICO E LUMINOSO (Esticado de ponta a ponta sem card) */}
      <div className="w-full overflow-hidden shadow-sm">
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

      {/* 3. ACESSO RÁPIDO (5 cartões compactos) */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          <button 
            onClick={() => setCurrentTab('jobs')}
            className="bg-white hover:bg-blue-50/50 border border-[#E6EBF2] p-3 rounded-2xl flex flex-col items-center text-center gap-2 transition shadow-xs hover:border-[#1455A0] group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1455A0] flex items-center justify-center group-hover:scale-110 transition">
              <Briefcase className="w-5 h-5 text-[#1455A0]" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-bold text-[#14213D] leading-tight">Ver Vagas</div>
              <div className="text-[9px] text-[#73819A] hidden sm:block">de Emprego</div>
            </div>
          </button>

          <button 
            onClick={() => setCurrentTab('marketplace')}
            className="bg-white hover:bg-amber-50/50 border border-[#E6EBF2] p-3 rounded-2xl flex flex-col items-center text-center gap-2 transition shadow-xs hover:border-amber-400 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition">
              <ShoppingBag className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-bold text-[#14213D] leading-tight">Marketplace</div>
              <div className="text-[9px] text-[#73819A] hidden sm:block">Compre e Venda</div>
            </div>
          </button>

          <button 
            onClick={() => setCurrentTab('companies')}
            className="bg-white hover:bg-emerald-50/50 border border-[#E6EBF2] p-3 rounded-2xl flex flex-col items-center text-center gap-2 transition shadow-xs hover:border-emerald-500 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
              <Building2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-bold text-[#14213D] leading-tight">Empresas</div>
              <div className="text-[9px] text-[#73819A] hidden sm:block">Parceiras</div>
            </div>
          </button>

          <button 
            onClick={() => setCurrentTab('dashboard')}
            className="bg-white hover:bg-purple-50/50 border border-[#E6EBF2] p-3 rounded-2xl flex flex-col items-center text-center gap-2 transition shadow-xs hover:border-purple-500 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition">
              <GraduationCap className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-bold text-[#14213D] leading-tight">Cursos</div>
              <div className="text-[9px] text-[#73819A] hidden sm:block">Capacitação</div>
            </div>
          </button>

          <button 
            onClick={() => setCurrentTab('community')}
            className="bg-white hover:bg-rose-50/50 border border-[#E6EBF2] p-3 rounded-2xl flex flex-col items-center text-center gap-2 transition shadow-xs hover:border-rose-500 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition">
              <Newspaper className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-bold text-[#14213D] leading-tight">Novidades</div>
              <div className="text-[9px] text-[#73819A] hidden sm:block">do Mercado</div>
            </div>
          </button>
        </div>
      </div>

      {/* 4. VAGAS EM DESTAQUE */}
      <section className="max-w-5xl mx-auto px-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <h2 className="text-lg sm:text-xl font-black text-[#14213D] tracking-tight">
              Vagas em Destaque
            </h2>
          </div>
          <button 
            onClick={() => setCurrentTab('jobs')}
            className="text-xs sm:text-sm font-bold text-[#1455A0] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Ver todas</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {featuredJobs.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-[#E6EBF2] space-y-2">
            <Briefcase className="w-8 h-8 text-[#73819A] mx-auto" />
            <p className="text-xs text-[#73819A]">Sem vagas ativas no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredJobs.map(job => (
              <div 
                key={job.id}
                onClick={() => onSelectJob(job)}
                className="bg-white rounded-2xl p-4 border border-[#E6EBF2] hover:border-[#1455A0] hover:shadow-md transition flex flex-col justify-between cursor-pointer group space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-[#1455A0] text-sm shrink-0 overflow-hidden">
                      {job.company_logo ? (
                        <img src={job.company_logo} alt={job.company_name} className="w-full h-full object-cover" />
                      ) : (
                        job.company_name?.charAt(0) || 'C'
                      )}
                    </div>
                    <span className="bg-blue-50 text-[#1455A0] font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-blue-100">
                      {job.category || 'Tempo integral'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-sm text-[#14213D] group-hover:text-[#1455A0] transition line-clamp-1">
                      {job.title}
                    </h3>
                    <p className="text-[11px] font-semibold text-[#73819A] line-clamp-1">
                      {job.company_name}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#E6EBF2]">
                  <div className="flex items-center justify-between text-[11px] text-[#73819A] font-medium">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#1455A0]" />
                      {job.municipality || 'Ondjiva'}
                    </span>
                    <span className="font-bold text-[#14213D]">
                      {job.salary_min && job.salary_max 
                        ? `${job.salary_min.toLocaleString()} ${job.salary_currency || 'AOA'}` 
                        : 'A combinar'}
                    </span>
                  </div>

                  <button className="w-full py-1.5 bg-[#F6F8FC] group-hover:bg-[#1455A0] group-hover:text-white text-[#14213D] font-bold text-xs rounded-xl transition flex items-center justify-center gap-1">
                    <span>Ver vaga</span>
                    <ArrowRight className="w-3 h-3" />
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛒</span>
            <h2 className="text-lg sm:text-xl font-black text-[#14213D] tracking-tight">
              Produtos em Destaque
            </h2>
          </div>
          <button 
            onClick={() => setCurrentTab('marketplace')}
            className="text-xs sm:text-sm font-bold text-[#1455A0] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Ver todos</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {featuredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-[#E6EBF2] space-y-2">
            <ShoppingBag className="w-8 h-8 text-[#73819A] mx-auto" />
            <p className="text-xs text-[#73819A]">Sem produtos disponíveis no marketplace.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {featuredProducts.map(prod => (
              <div 
                key={prod.id}
                onClick={() => onSelectProduct && onSelectProduct(prod)}
                className="bg-white rounded-2xl overflow-hidden border border-[#E6EBF2] hover:border-amber-400 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
              >
                <div className="relative h-32 bg-slate-100 overflow-hidden">
                  <img src={prod.image_url || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&q=80&w=400'} alt={prod.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                  <span className="absolute top-2 left-2 bg-rose-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded-md shadow-sm">
                    -20%
                  </span>
                </div>

                <div className="p-3 space-y-1">
                  <h3 className="font-bold text-xs text-[#14213D] group-hover:text-[#1455A0] transition line-clamp-1">
                    {prod.title}
                  </h3>
                  <div className="text-xs font-black text-[#1455A0]">
                    {prod.price ? `${Number(prod.price).toLocaleString('pt-AO')} Kz` : 'Sob consulta'}
                  </div>
                  <div className="text-[10px] text-[#73819A] flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#73819A]" />
                    <span>{prod.municipality || 'Ondjiva'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 7. NOVIDADES NO MERCADO (Bottom Banner) */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="rounded-2xl sm:rounded-3xl bg-[#0B2854] text-white p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md border border-[#1455A0]/30">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-[#FFB900] text-[#0B2854] flex items-center justify-center font-black shrink-0 shadow-sm">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-base sm:text-lg text-white">Novidades no Mercado de Cunene</h3>
              <p className="text-xs text-blue-100/90 font-medium">Acompanhe as últimas oportunidades, produtos e tendências da região.</p>
            </div>
          </div>

          <button 
            onClick={() => setCurrentTab('community')}
            className="bg-[#FFB900] hover:bg-[#e6a700] text-[#0B2854] font-black px-5 py-2.5 rounded-xl text-xs transition shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <span>Aceder ao Feed</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
