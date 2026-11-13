import React, { useState, useMemo, useEffect } from 'react';
import { 
  Briefcase, Search, MapPin, Building2, TrendingUp, Sparkles, 
  ArrowRight, Plus, ShoppingBag, ShieldCheck, CheckCircle2, 
  DollarSign, Clock, ChevronRight, Bell, Filter, Star, GraduationCap, Newspaper, UserRound
} from 'lucide-react';
import { Job, MarketplaceProduct, CommunityPost, UserProfile, PlatformStats, ExamAttempt, CUNENE_MUNICIPALITIES } from '../lib/types';
import { StoreService } from '../lib/store';
import { GiantCinematicCarousel } from '../components/GiantCinematicCarousel';
import { StoriesBar } from '../components/StoriesBar';
import { CompaniesHorizontalCarousel } from '../components/CompaniesHorizontalCarousel';
import { JobsHorizontalCarousel } from '../components/JobsHorizontalCarousel';
import { ProductsHorizontalCarousel } from '../components/ProductsHorizontalCarousel';
import '../components/platform-modules.css';

interface HomeProps {
  jobs: Job[];
  products: MarketplaceProduct[];
  posts?: CommunityPost[];
  companies: UserProfile[];
  featuredCandidates?: UserProfile[];
  isLoading?: boolean;
  setCurrentTab: (tab: string) => void;
  onSelectJob: (job: Job) => void;
  onSelectCompany: (company: UserProfile) => void;
  onSelectCandidate?: (candidate: UserProfile) => void;
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
  featuredCandidates = [],
  isLoading = false,
  setCurrentTab,
  onSelectJob,
  onSelectCompany,
  onSelectCandidate,
  onSelectProduct,
  onSelectPost,
  currentUser,
  onOpenAuth
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState('Todos');
  const [failedProductImages, setFailedProductImages] = useState<Record<string, boolean>>({});
  const [failedCandidateImages, setFailedCandidateImages] = useState<Record<string, boolean>>({});

  const visibleFeaturedCandidates = useMemo(() => {
    return featuredCandidates
      .filter((c) => c && c.full_name && c.full_name.trim().length > 1)
      .slice(0, 6);
  }, [featuredCandidates]);

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
    const active = jobs.filter(j => !['closed', 'fechada', 'inactive', 'inativa'].includes(String(j.status || '').toLowerCase()));
    return (active.length > 0 ? active : jobs).slice(0, 3);
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

  // Featured products (up to 4) - aceita qualquer produto não vendido/inativo
  const featuredProducts = useMemo(() => {
    const isAvailableProd = (p: MarketplaceProduct) => {
      if (p.is_active === false) return false;
      const st = String(p.status || '').toLowerCase().trim();
      return !['sold', 'vendido', 'inactive', 'inativo'].includes(st);
    };
    const sponsoredProdIds = activeCampaigns.filter(c => c.type === 'product').map(c => c.target_id);
    const sponsored = products.filter(p => sponsoredProdIds.includes(p.id) && isAvailableProd(p));
    const others = products.filter(p => !sponsoredProdIds.includes(p.id) && isAvailableProd(p));
    const combined = [...sponsored, ...others];
    return (combined.length > 0 ? combined : products).slice(0, 4);
  }, [products, activeCampaigns]);

  // Featured companies (up to 4)
  const featuredCompanies = useMemo(() => {
    const sponsoredCompIds = activeCampaigns.filter(c => c.type === 'company').map(c => c.target_id);
    const sponsored = companies.filter(c => sponsoredCompIds.includes(c.id));
    const others = companies.filter(c => !sponsoredCompIds.includes(c.id));
    return [...sponsored, ...others].slice(0, 4);
  }, [companies, activeCampaigns]);

  return (
    <div className="min-h-screen bg-[#080808] font-sans antialiased text-[#F5F1E7] pb-32 space-y-10 pt-0">

      {/* HEADER EDITORIAL PRETO E DOURADO */}
      <div className="bg-[#080808] pt-6 pb-4 px-6 max-w-5xl mx-auto border-b border-[#D4AF37]/20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-[#D4AF37]">
              Editorial • CuneneVagas Gold
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-[#F5D77A] tracking-tight font-display">
              Best of Cunene
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#BDB29F] max-w-md leading-relaxed">
            Destaques da província, oportunidades profissionais e negócios locais com o selo de prestígio e qualidade editorial.
          </p>
        </div>
      </div>

      {/* CARROSSEL GIGANTE CINEMATOGRÁFICO EDITORIAL */}
      <div className="w-full overflow-hidden shadow-2xl border-y border-[#D4AF37]/25">
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

      {/* BARRA DE STORIES */}
      <div className="max-w-5xl mx-auto px-4">
        <StoriesBar
          onNavigateTab={setCurrentTab}
          jobs={jobs}
          products={products}
          companies={companies}
          featuredCandidates={featuredCandidates}
          posts={posts}
        />
      </div>

      {/* ACESSO RÁPIDO EDITORIAL PRETO & DOURADO (5 cartões) */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-5 gap-2 sm:gap-4">
          <button 
            onClick={() => setCurrentTab('jobs')}
            className="cv-card-pressable bg-[#121212] hover:bg-[#181611] border border-[#D4AF37]/25 hover:border-[#D4AF37] p-3 sm:p-4 rounded-2xl flex flex-col items-center text-center gap-2 transition-all shadow-md hover:shadow-[#D4AF37]/15 group cursor-pointer active:scale-[0.96]"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1C1811] text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center group-hover:scale-110 transition">
              <Briefcase className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-bold text-[#F5D77A] leading-tight">Vagas</div>
              <div className="text-[9px] text-[#A89D8B] hidden sm:block">Emprego</div>
            </div>
          </button>

          <button 
            onClick={() => setCurrentTab('marketplace')}
            className="cv-card-pressable bg-[#121212] hover:bg-[#181611] border border-[#D4AF37]/25 hover:border-[#D4AF37] p-3 sm:p-4 rounded-2xl flex flex-col items-center text-center gap-2 transition-all shadow-md hover:shadow-[#D4AF37]/15 group cursor-pointer active:scale-[0.96]"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1C1811] text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center group-hover:scale-110 transition">
              <ShoppingBag className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-bold text-[#F5D77A] leading-tight">Market</div>
              <div className="text-[9px] text-[#A89D8B] hidden sm:block">Negócios</div>
            </div>
          </button>

          <button 
            onClick={() => setCurrentTab('companies')}
            className="cv-card-pressable bg-[#121212] hover:bg-[#181611] border border-[#D4AF37]/25 hover:border-[#D4AF37] p-3 sm:p-4 rounded-2xl flex flex-col items-center text-center gap-2 transition-all shadow-md hover:shadow-[#D4AF37]/15 group cursor-pointer active:scale-[0.96]"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1C1811] text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center group-hover:scale-110 transition">
              <Building2 className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-bold text-[#F5D77A] leading-tight">Empresas</div>
              <div className="text-[9px] text-[#A89D8B] hidden sm:block">Parceiras</div>
            </div>
          </button>

          <button 
            onClick={() => setCurrentTab('dashboard')}
            className="cv-card-pressable bg-[#121212] hover:bg-[#181611] border border-[#D4AF37]/25 hover:border-[#D4AF37] p-3 sm:p-4 rounded-2xl flex flex-col items-center text-center gap-2 transition-all shadow-md hover:shadow-[#D4AF37]/15 group cursor-pointer active:scale-[0.96]"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1C1811] text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center group-hover:scale-110 transition">
              <GraduationCap className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-bold text-[#F5D77A] leading-tight">Exames</div>
              <div className="text-[9px] text-[#A89D8B] hidden sm:block">Certificados</div>
            </div>
          </button>

          <button 
            onClick={() => setCurrentTab('community')}
            className="cv-card-pressable bg-[#121212] hover:bg-[#181611] border border-[#D4AF37]/25 hover:border-[#D4AF37] p-3 sm:p-4 rounded-2xl flex flex-col items-center text-center gap-2 transition-all shadow-md hover:shadow-[#D4AF37]/15 group cursor-pointer active:scale-[0.96]"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1C1811] text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center group-hover:scale-110 transition">
              <Newspaper className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-bold text-[#F5D77A] leading-tight">Feed</div>
              <div className="text-[9px] text-[#A89D8B] hidden sm:block">Notícias</div>
            </div>
          </button>
        </div>
      </div>

      {/* CARROSSEL DE TODAS AS VAGAS */}
      <JobsHorizontalCarousel
        jobs={jobs}
        onSelectJob={onSelectJob}
        onViewAll={() => setCurrentTab('jobs')}
        title="Todas as Vagas no Cunene"
        subtitle="Oportunidades profissionais e contratações abertas em toda a província"
      />

      {/* CARROSSEL DE TODAS AS EMPRESAS */}
      <CompaniesHorizontalCarousel 
        companies={companies}
        onSelectCompany={onSelectCompany}
        onViewAll={() => setCurrentTab('companies')}
        title="Todas as Empresas Registadas no Cunene"
        subtitle="Conheça todos os nossos parceiros, lojas e empregadores locais"
      />

      {/* CARROSSEL DE TODOS OS PRODUTOS DO MARKETPLACE */}
      <ProductsHorizontalCarousel
        products={products}
        onSelectProduct={prod => onSelectProduct && onSelectProduct(prod)}
        onViewAll={() => setCurrentTab('marketplace')}
        title="Todos os Produtos no Marketplace"
        subtitle="Catálogo completo de artigos, equipamentos e serviços disponíveis"
      />



      {/* NOVIDADES NO MERCADO (Bottom Banner Editorial Preto e Dourado) */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="rounded-3xl bg-gradient-to-r from-[#14120C] via-[#1A160F] to-[#121212] text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl border border-[#D4AF37]/30">
          <div className="flex items-center gap-5 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-[#D4AF37] text-slate-950 flex items-center justify-center font-black shrink-0 shadow-lg shadow-[#D4AF37]/20">
              <TrendingUp className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-lg sm:text-xl text-[#F5D77A]">Novidades no Mercado de Cunene</h3>
              <p className="text-xs text-[#BDB29F] font-medium">Acompanhe as últimas oportunidades, produtos e tendências da província.</p>
            </div>
          </div>

          <button 
            onClick={() => setCurrentTab('community')}
            className="bg-[#D4AF37] hover:bg-[#F5D77A] text-slate-950 font-black px-6 py-3 rounded-2xl text-xs transition shadow-lg shadow-[#D4AF37]/20 flex items-center gap-2.5 shrink-0 cursor-pointer active:scale-[0.96]"
          >
            <span>Aceder ao Feed</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
