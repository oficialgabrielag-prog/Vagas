import React, { useState, useEffect, useRef } from 'react';
import { X, RotateCw, Check, ArrowDown } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { BottomNav } from './components/BottomNav';
import { AuthModal } from './components/AuthModal';

import { JobDetailModal } from './components/JobDetailModal';
import { NewJobModal } from './components/NewJobModal';
import { NewProductModal } from './components/NewProductModal';
import { PayPalPaymentModal } from './components/PayPalPaymentModal';
import { ExamModal } from './components/ExamModal';
import { ExamReviewModal } from './components/ExamReviewModal';
import { ExamCertificateModal } from './components/ExamCertificateModal';
import { CompanyPublicModal } from './components/CompanyPublicModal';
import { CandidatePublicModal } from './components/CandidatePublicModal';
import { FullscreenPostModal } from './components/FullscreenPostModal';
import { CandidateProfileView } from './components/CandidateProfileView';
import { EmployerProfileView } from './components/EmployerProfileView';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { AIAssistantWidget } from './components/AIAssistantWidget';
import { NotificationsModal } from './components/NotificationsModal';
import { ExploreSearchModal } from './components/ExploreSearchModal';
import { NotificationItem } from './lib/types';

import { Home } from './pages/Home';
import { JobsPage } from './pages/JobsPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { CommunityPage } from './pages/CommunityPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { LegalPage } from './pages/LegalPage';

import { StoreService } from './lib/store';
import { Job, UserProfile, Exam, MarketplaceProduct, CommunityPost, ExamAttempt, JobApplication } from './lib/types';
import { onAuthStateChange, getSession, supabase } from './lib/supabase';

interface PageMeta {
  title: string;
  description: string;
  path: string;
  ogTitle: string;
  ogDesc: string;
}

const PAGE_METADATA: Record<string, PageMeta> = {
  home: {
    title: 'CuneneVagas | Empregos, Vagas, Negócios e Marketplace no Cunene, Angola',
    description: 'A principal plataforma de recrutamento, ofertas de emprego, exames técnicos e marketplace profissional na província do Cunene, Angola. Conectando talentos e empresas em Ondjiva e arredores.',
    path: '/',
    ogTitle: 'CuneneVagas | Empregos, Vagas e Marketplace no Cunene',
    ogDesc: 'Encontre oportunidades de trabalho, exames técnicos, produtos locais e conexões profissionais em Ondjiva e em toda a província do Cunene.',
  },
  jobs: {
    title: 'Vagas de Emprego no Cunene e Angola | CuneneVagas',
    description: 'Consulte as mais recentes ofertas de emprego, estágios e vagas de trabalho no Cunene (Ondjiva) e em Angola. Candidate-se diretamente.',
    path: '/jobs',
    ogTitle: 'Vagas de Emprego no Cunene e Angola | CuneneVagas',
    ogDesc: 'Encontre vagas abertas, estágios e testes técnicos de seleção no Cunene. Candidate-se online.',
  },
  marketplace: {
    title: 'Marketplace Local do Cunene | Comércio e Serviços | CuneneVagas',
    description: 'Explore produtos, serviços e comércio local na província do Cunene. Negocie diretamente com vendedores em Ondjiva e arredores.',
    path: '/marketplace',
    ogTitle: 'Marketplace Local do Cunene | Comércio e Serviços | CuneneVagas',
    ogDesc: 'Compre, venda e descubra lojas e produtos locais em Ondjiva e em toda a província do Cunene.',
  },
  community: {
    title: 'Comunidade Profissional do Cunene | Feed & Networking | CuneneVagas',
    description: 'Conecte-se com profissionais, empresas e talentos no Cunene. Partilhe experiências, publicações e oportunidades de negócio.',
    path: '/community',
    ogTitle: 'Comunidade Profissional do Cunene | CuneneVagas',
    ogDesc: 'Espaço de networking, publicações, sondagens e conexões para profissionais e empresas no Cunene.',
  },
  companies: {
    title: 'Empresas e Recrutadores no Cunene | CuneneVagas',
    description: 'Diretório de empresas parceiras, organizações e recrutadores no Cunene e em Angola. Conheça as instituições que contratam talentos.',
    path: '/companies',
    ogTitle: 'Diretório de Empresas e Recrutadores no Cunene | CuneneVagas',
    ogDesc: 'Conheça as principais organizações que operam e recrutam talentos na província do Cunene.',
  },
  dashboard: {
    title: 'Painel de Controlo | CuneneVagas',
    description: 'Gestão da sua conta, candidaturas, vagas, exames técnicos e métricas profissionais no CuneneVagas.',
    path: '/dashboard',
    ogTitle: 'Painel de Controlo | CuneneVagas',
    ogDesc: 'Gestão profissional e empresarial no CuneneVagas.',
  },
  login: {
    title: 'Entrar na Conta | CuneneVagas',
    description: 'Aceda à sua conta de candidato ou empresa no CuneneVagas e acompanhe oportunidades de emprego e negócios.',
    path: '/login',
    ogTitle: 'Entrar na Conta | CuneneVagas',
    ogDesc: 'Aceda à sua conta no CuneneVagas.',
  },
  register: {
    title: 'Criar Conta | CuneneVagas',
    description: 'Registe-se gratuitamente como candidato ou empresa no CuneneVagas. Publique vagas ou candidate-se a empregos no Cunene.',
    path: '/register',
    ogTitle: 'Criar Conta | CuneneVagas',
    ogDesc: 'Registe-se no CuneneVagas.',
  },
  terms: {
    title: 'Termos de Uso | CuneneVagas',
    description: 'Termos e condições de utilização da plataforma CuneneVagas no Cunene, Angola.',
    path: '/terms',
    ogTitle: 'Termos de Uso | CuneneVagas',
    ogDesc: 'Conheça os termos e condições de uso da plataforma CuneneVagas.',
  },
  privacy: {
    title: 'Política de Privacidade | CuneneVagas',
    description: 'Política de privacidade e proteção de dados pessoais do CuneneVagas.',
    path: '/privacy',
    ogTitle: 'Política de Privacidade | CuneneVagas',
    ogDesc: 'Saiba como protegemos os seus dados pessoais e privacidade no CuneneVagas.',
  },
};

const getInitialTabFromLocation = (): string => {
  if (typeof window === 'undefined') return 'home';
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const hash = window.location.hash.toLowerCase().replace(/^#/, '');

  if (path === '/jobs' || path === '/vagas' || hash === 'jobs') return 'jobs';
  if (path === '/marketplace' || hash === 'marketplace') return 'marketplace';
  if (path === '/community' || path === '/comunidade' || hash === 'community') return 'community';
  if (path === '/companies' || path === '/empresas' || hash === 'companies') return 'companies';
  if (path === '/dashboard') return 'dashboard';
  if (path === '/login') return 'login';
  if (path === '/register') return 'register';
  if (path === '/terms' || hash === 'terms') return 'terms';
  if (path === '/privacy' || hash === 'privacy') return 'privacy';
  return 'home';
};

const updateDocMeta = (meta: PageMeta) => {
  if (typeof document === 'undefined') return;

  // Title
  document.title = meta.title;

  // Helper for meta tags
  const setMeta = (attrName: 'name' | 'property', attrVal: string, content: string) => {
    let el = document.querySelector(`meta[${attrName}="${attrVal}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrVal);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  // Helper for canonical
  let canonicalEl = document.querySelector('link[rel="canonical"]');
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  const canonicalUrl = `https://cunenevagas.online${meta.path === '/' ? '' : meta.path}`;
  canonicalEl.setAttribute('href', canonicalUrl);

  // Meta description & Open Graph & Twitter
  setMeta('name', 'description', meta.description);
  setMeta('property', 'og:title', meta.ogTitle);
  setMeta('property', 'og:description', meta.ogDesc);
  setMeta('property', 'og:url', canonicalUrl);
  setMeta('name', 'twitter:title', meta.title);
  setMeta('name', 'twitter:description', meta.description);
  setMeta('name', 'twitter:url', canonicalUrl);
};

export default function App() {
  const [currentTab, setCurrentTabState] = useState<string>(() => getInitialTabFromLocation());

  const setCurrentTab = (newTab: string) => {
    setCurrentTabState(newTab);
    if (typeof window !== 'undefined') {
      const targetPath = PAGE_METADATA[newTab]?.path || (newTab === 'home' ? '/' : `/${newTab}`);
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ tab: newTab }, '', targetPath);
      }
      const meta = PAGE_METADATA[newTab];
      if (meta) updateDocMeta(meta);
    }
  };

  useEffect(() => {
    // Sync metadata for initial tab
    const meta = PAGE_METADATA[currentTab];
    if (meta) updateDocMeta(meta);

    // Listen to browser navigation (back/forward)
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.tab) {
        setCurrentTabState(e.state.tab);
        const m = PAGE_METADATA[e.state.tab];
        if (m) updateDocMeta(m);
      } else {
        const tab = getInitialTabFromLocation();
        setCurrentTabState(tab);
        const m = PAGE_METADATA[tab];
        if (m) updateDocMeta(m);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(StoreService.getCurrentUser());
  const [verifiedNotice, setVerifiedNotice] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      // Apenas mostrar aviso se for confirmação de e-mail por palavra-passe (signup), excluindo logins OAuth (Facebook/Google)
      if ((hash.includes('type=signup') || hash.includes('type=email_change') || search.includes('type=signup')) && !hash.includes('provider=facebook') && !hash.includes('access_token')) {
        return 'Conta verificada com sucesso! Inicie sessão agora.';
      }
    }
    return null;
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isPCMode, setIsPCMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cunene_pc_mode');
      if (saved !== null) return saved === 'true';
      return window.innerWidth >= 1024;
    }
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cunene_theme_mode');
    }
  }, []);

  const handleTogglePCMode = () => {
    setIsPCMode((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('cunene_pc_mode', String(next));
      }
      return next;
    });
  };

  // Realtime subscriptions moved to startup hook
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleOpenReview = (e: any) => {
      if (e.detail?.attempt) {
        setSelectedAttemptForReview(e.detail.attempt);
      }
    };
    window.addEventListener('open-exam-review', handleOpenReview);
    return () => window.removeEventListener('open-exam-review', handleOpenReview);
  }, []);

  const [jobs, setJobs] = useState<Job[]>(StoreService.getJobs());
  const [products, setProducts] = useState<MarketplaceProduct[]>(StoreService.getProducts());
  const [posts, setPosts] = useState(StoreService.getPosts());
  const [applications, setApplications] = useState<JobApplication[]>(() => StoreService.getApplications());
  const [companies, setCompanies] = useState<UserProfile[]>(() => StoreService.getCompanies());
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    StoreService.getPlatformUserStats().then(stats => {
      const mappedUsers: UserProfile[] = stats.users.map(u => ({
        id: u.id,
        full_name: u.name,
        email: u.email,
        whatsapp: u.whatsapp || '',
        phone: u.whatsapp || '',
        role: (u.role === 'Empresa' || u.role === 'employer' || u.role === 'empresa') ? 'employer' : 'candidate',
        municipality: u.municipality || 'Ondjiva',
        avatar_url: u.avatar_url,
        profession: '', // Placeholder
        created_at: u.created_at || new Date().toISOString(),
      } as any));
      setAllUsers(mappedUsers);
    });
  }, []);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [selectedExam, setSelectedExam] = useState<{ exam: Exam; applicationId?: string; job?: Job } | null>(null);
  const [selectedAttemptForReview, setSelectedAttemptForReview] = useState<ExamAttempt | null>(null);
  const [selectedAttemptForCertificate, setSelectedAttemptForCertificate] = useState<ExamAttempt | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<UserProfile | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<UserProfile | null>(null);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [newJobModalOpen, setNewJobModalOpen] = useState(false);
  const [newProductModalOpen, setNewProductModalOpen] = useState(false);
  const [paypalModalOpen, setPaypalModalOpen] = useState(false);
  const [switchFeedback, setSwitchFeedback] = useState<string>('');
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [exploreModalOpen, setExploreModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => currentUser ? StoreService.getNotifications(currentUser.id) : []);

  useEffect(() => {
    if (currentUser) {
      const freshNotes = StoreService.getNotifications(currentUser.id);
      setNotifications(prev => {
        if (prev.length !== freshNotes.length) return freshNotes;
        return prev;
      });
    } else {
      setNotifications([]);
    }
  }, [currentUser, notificationsModalOpen]);

  useEffect(() => {
    const handleOpenExplore = () => setExploreModalOpen(true);
    window.addEventListener('open-explore-search', handleOpenExplore);
    
    // Ouvinte para navegar para itens específicos (jobs, products, etc)
    const handleNavigateToItem = (e: any) => {
      const link = e.detail?.link;
      if (!link) return;
      
      // Simulação de navegação baseada no link (ex: 'job-123', 'prod-456')
      if (link.startsWith('job-')) {
        const job = jobs.find(j => j.id === link.replace('job-', ''));
        if (job) setSelectedJob(job);
      } else if (link.startsWith('prod-')) {
        const prod = products.find(p => p.id === link.replace('prod-', ''));
        if (prod) setSelectedProduct(prod);
      }
    };
    window.addEventListener('navigate-to-item', handleNavigateToItem);

    // Detetar links diretos partilhados na URL (ex: #community/post/:id ou #marketplace/produto/:id)
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash;
      if (hash.startsWith('#community/post/')) {
        const postId = hash.replace('#community/post/', '');
        const found = posts.find(p => p.id === postId);
        if (found) setSelectedPost(found);
      } else if (hash.startsWith('#marketplace/produto/')) {
        const prodId = hash.replace('#marketplace/produto/', '');
        const found = products.find(p => p.id === prodId);
        if (found) setSelectedProduct(found);
      }
    }
    
    const handleJobDeleted = (e: any) => {
      const jobId = e.detail?.jobId;
      if (jobId) {
        setJobs(prev => prev.filter(j => j.id !== jobId));
      }
    };
    const handleProductDeleted = (e: any) => {
      const prodId = e.detail?.productId;
      if (prodId) {
        setProducts(prev => prev.filter(p => p.id !== prodId));
      }
    };
    const handlePostDeleted = (e: any) => {
      const postId = e.detail?.postId;
      if (postId) {
        setPosts(prev => prev.filter(p => p.id !== postId));
      }
    };

    window.addEventListener('cunene_job_deleted', handleJobDeleted);
    window.addEventListener('cunene_product_deleted', handleProductDeleted);
    window.addEventListener('cunene_post_deleted', handlePostDeleted);
    
    return () => {
      window.removeEventListener('open-explore-search', handleOpenExplore);
      window.removeEventListener('navigate-to-item', handleNavigateToItem);
      window.removeEventListener('cunene_job_deleted', handleJobDeleted);
      window.removeEventListener('cunene_product_deleted', handleProductDeleted);
      window.removeEventListener('cunene_post_deleted', handlePostDeleted);
    };
  }, [jobs, products]);

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // Pull-to-refresh & Gesture navigation state
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshToast, setRefreshToast] = useState('');

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isPullingDown = useRef<boolean>(false);

  const handleTouchStartGlobal = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'BUTTON' ||
      target.closest('.fixed') ||
      target.closest('.overflow-x-auto') ||
      target.closest('.no-swipe')
    ) {
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    const isAtTop = window.scrollY <= 10 || document.documentElement.scrollTop <= 10;
    isPullingDown.current = isAtTop;
  };

  const handleTouchMoveGlobal = (e: React.TouchEvent) => {
    if (touchStartY.current === null || !isPullingDown.current || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diffY = currentY - touchStartY.current;
    const isAtTop = window.scrollY <= 10 || document.documentElement.scrollTop <= 10;

    // Se estiver a puxar para baixo no topo da página
    if (diffY > 0 && isAtTop) {
      const distance = Math.min(80, diffY * 0.45);
      setPullDistance(distance);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEndGlobal = async (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    // Ação de Puxar para Atualizar (Pull to refresh)
    if ((pullDistance >= 45 || (diffY >= 80 && isPullingDown.current)) && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(52);
      const safetyTimeout = setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 7000);
      try {
        await refreshData();
        setRefreshToast('Plataforma atualizada com sucesso!');
        setTimeout(() => setRefreshToast(''), 3000);
      } catch (err) {
        console.warn('Erro ao atualizar dados:', err);
      } finally {
        clearTimeout(safetyTimeout);
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }

    // Detetar deslize horizontal natural (delta X expressivo, delta Y baixo)
    if (Math.abs(diffX) > 60 && Math.abs(diffY) < 60 && !isPullingDown.current) {
      const tabsList = ['home', 'jobs'];
      if (currentUser?.role === 'employer') {
        tabsList.push('store');
      }
      tabsList.push('marketplace', 'community', 'companies');

      const curIndex = tabsList.indexOf(currentTab);
      if (curIndex !== -1) {
        if (diffX < 0 && curIndex < tabsList.length - 1) {
          // Deslizar para a Esquerda -> Avançar para a próxima aba
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(15); } catch {}
          }
          setCurrentTab(tabsList[curIndex + 1]);
        } else if (diffX > 0 && curIndex > 0) {
          // Deslizar para a Direita -> Voltar à aba anterior
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(15); } catch {}
          }
          setCurrentTab(tabsList[curIndex - 1]);
        }
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
    isPullingDown.current = false;
  };

  const handleTouchCancelGlobal = () => {
    touchStartX.current = null;
    touchStartY.current = null;
    isPullingDown.current = false;
    setPullDistance(0);
  };

  const handleOpenNewProduct = () => {
    if (!currentUser) {
      setCurrentTab('login');
      return;
    }
    const isUnlocked = Boolean(currentUser.company?.marketplace_unlocked || currentUser.marketplace_unlocked);
    const allProds = StoreService.getProducts();
    const userProds = allProds.filter(p => p.seller_id === currentUser.id || (currentUser.company?.id && p.company_id === currentUser.company.id));
    
    // A tela do PayPal só deve aparecer DEPOIS do usuário atingir o limite de publicar 10 produtos
    if (userProds.length >= 10 && !isUnlocked) {
      setPaypalModalOpen(true);
      return;
    }
    setNewProductModalOpen(true);
  };

  const refreshData = async () => {
    try {
      const timeoutPromise = new Promise<any>((resolve) => {
        setTimeout(() => {
          resolve({
            jobs: StoreService.getJobs(),
            products: StoreService.getProducts(),
            posts: StoreService.getPosts(),
            applications: StoreService.getApplications()
          });
        }, 6000);
      });

      const { jobs: freshJobs, products: freshProds, posts: freshPosts, applications: freshApps } = await Promise.race([
        StoreService.syncWithSupabase(currentUser || undefined),
        timeoutPromise
      ]);

      if (freshJobs) setJobs(freshJobs);
      if (freshProds) setProducts(freshProds);
      if (freshPosts) setPosts(freshPosts);
      if (freshApps) setApplications(freshApps);

      // Synchronize companies without a short-circuit timeout to prevent "disappearing" items
      const freshCompanies = await StoreService.fetchCompanies();
      if (freshCompanies && freshCompanies.length > 0) {
        setCompanies(freshCompanies);
      }
    } catch (e) {
      console.warn('Sincronização em segundo plano:', e);
    }
  };

  const handlePostUpdate = (updatedPost: CommunityPost) => {
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
    if (selectedPost?.id === updatedPost.id) {
      setSelectedPost(updatedPost);
    }
  };

  const handleProductDeleted = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    if (selectedProduct?.id === productId) {
      setSelectedProduct(null);
    }
  };

  // Restore & sync Supabase Auth session & fresh data on startup (sem travar abertura)
  useEffect(() => {
    // Detect PayPal payment success redirect parameter and upgrade user instantly
    const urlParams = new URLSearchParams(window.location.search);
    const hasPaypalSuccess = urlParams.get('paypal_success') === 'true';

    getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        let restored = await StoreService.restoreUserFromSession(session.user);
        if (restored) {
          if (hasPaypalSuccess) {
            const upgraded = await StoreService.activatePremiumLocally(restored.id);
            if (upgraded) {
              restored = upgraded;
              alert('Parabéns! A sua Licença Marketplace Premium foi ativada com sucesso! Já pode publicar produtos ilimitados.');
            }
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          setCurrentUser(restored);
          if (window.location.hash.includes('access_token')) {
            window.history.replaceState({}, document.title, window.location.pathname);
            if (currentTab === 'login' || currentTab === 'register') {
              setCurrentTab('home');
            }
          }
        }
      }
    }).catch(() => {});

    const { data: authListener } = onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const restored = await StoreService.restoreUserFromSession(session.user);
        if (restored) setCurrentUser(restored);
      } else {
        setCurrentUser(null);
        setPosts(StoreService.getPosts());
        setJobs(StoreService.getJobs());
        setProducts(StoreService.getProducts());
      }
    });

    // Initial background sync sem travar o render inicial
    refreshData();
    
    // Supabase Realtime: Atualiza os dados instantaneamente em todos os clientes
    const uid = Math.random().toString(36).substring(7);
    const channels = {
      jobs: supabase.channel(`public:jobs-${uid}`),
      posts: supabase.channel(`public:community_posts-${uid}`),
      marketplace: supabase.channel(`public:marketplace-${uid}`),
      apps: supabase.channel(`public:applications-${uid}`),
      companies: supabase.channel(`public:companies-${uid}`),
      users: supabase.channel(`public:users_profiles-${uid}`),
    };

    channels.jobs
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
        StoreService.fetchJobs().then(freshJobs => setJobs(freshJobs));
      })
      .subscribe();

    channels.posts
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, () => {
        StoreService.fetchPosts().then(freshPosts => setPosts(freshPosts));
      })
      .subscribe();

    channels.marketplace
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace' }, () => {
        StoreService.fetchProducts().then(freshProds => setProducts(freshProds));
      })
      .subscribe();

    channels.apps
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
        StoreService.fetchApplications().then(freshApps => setApplications(freshApps));
      })
      .subscribe();

    channels.companies
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () => {
        StoreService.fetchCompanies().then(freshCompanies => setCompanies(freshCompanies));
      })
      .subscribe();

    const refreshAllUsersAndCompanies = () => {
      // Refresh general users list
      StoreService.getPlatformUserStats().then(stats => {
        const mappedUsers: UserProfile[] = stats.users.map(u => ({
          id: u.id,
          full_name: u.name,
          email: u.email,
          whatsapp: u.whatsapp || '',
          phone: u.whatsapp || '',
          role: (u.role === 'Empresa' || u.role === 'employer' || u.role === 'empresa') ? 'employer' : 'candidate',
          municipality: u.municipality || 'Ondjiva',
          avatar_url: u.avatar_url,
          profession: '',
          created_at: u.created_at || new Date().toISOString(),
        } as any));
        setAllUsers(mappedUsers);
      });
      
      // CRITICAL: Refresh company list as well to ensure real-time visibility across all devices
      StoreService.fetchCompanies().then(freshCompanies => {
        if (freshCompanies && freshCompanies.length > 0) {
          setCompanies(freshCompanies);
        }
      });
    };

    channels.users
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        refreshAllUsersAndCompanies();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        refreshAllUsersAndCompanies();
      })
      .subscribe();

    // Eventos de foco, visibilidade de separador e recuperação de conexão de rede
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshAllUsersAndCompanies();
      }
    };
    window.addEventListener('focus', refreshAllUsersAndCompanies);
    window.addEventListener('online', refreshAllUsersAndCompanies);
    window.addEventListener('cunene_user_stats_updated', refreshAllUsersAndCompanies);
    document.addEventListener('visibilitychange', handleVisibility);

    // Polling de fallback a cada 30 segundos para sincronização contínua entre navegadores
    const pollTimer = setInterval(refreshAllUsersAndCompanies, 30000);

    return () => {
      authListener?.subscription.unsubscribe();
      window.removeEventListener('focus', refreshAllUsersAndCompanies);
      window.removeEventListener('online', refreshAllUsersAndCompanies);
      window.removeEventListener('cunene_user_stats_updated', refreshAllUsersAndCompanies);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(pollTimer);
      Object.values(channels).forEach(channel => supabase.removeChannel(channel));
    };
  }, []);

  // Escuta exclusão e atualizações reativas instantâneas de posts, produtos e vagas
  useEffect(() => {
    const handlePostDeleted = (e: any) => {
      const deletedId = e.detail?.postId;
      if (deletedId) {
        setPosts(prev => prev.filter(p => p.id !== deletedId));
        if (selectedPost?.id === deletedId) {
          setSelectedPost(null);
        }
      }
    };

    const handleJobDeleted = (e: any) => {
      const deletedId = e.detail?.jobId;
      if (deletedId) {
        setJobs(prev => prev.filter(j => j.id !== deletedId));
        if (selectedJob?.id === deletedId) {
          setSelectedJob(null);
        }
      }
    };

    const handleJobUpdated = (e: any) => {
      const updatedJob = e.detail?.job;
      if (updatedJob) {
        setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
        if (selectedJob?.id === updatedJob.id) {
          setSelectedJob(updatedJob);
        }
      }
    };

    const handleProductDeletedEvent = (e: any) => {
      const deletedId = e.detail?.productId;
      if (deletedId) {
        setProducts(prev => prev.filter(p => p.id !== deletedId));
        if (selectedProduct?.id === deletedId) {
          setSelectedProduct(null);
        }
      }
    };

    window.addEventListener('cunene_post_deleted', handlePostDeleted);
    window.addEventListener('cunene_job_deleted', handleJobDeleted);
    window.addEventListener('cunene_job_updated', handleJobUpdated);
    window.addEventListener('cunene_product_deleted', handleProductDeletedEvent);

    return () => {
      window.removeEventListener('cunene_post_deleted', handlePostDeleted);
      window.removeEventListener('cunene_job_deleted', handleJobDeleted);
      window.removeEventListener('cunene_job_updated', handleJobUpdated);
      window.removeEventListener('cunene_product_deleted', handleProductDeletedEvent);
    };
  }, [selectedPost, selectedJob, selectedProduct]);

  const handleLogout = async () => {
    await StoreService.logout();
    setCurrentUser(null);
    setCurrentTab('login');
    setPosts(StoreService.getPosts());
    setJobs(StoreService.getJobs());
    setProducts(StoreService.getProducts());
  };

  const handleSwitchAccountRole = () => {
    if (!currentUser) {
      setCurrentTab('login');
      return;
    }
    const nextRole = currentUser.role === 'employer' ? 'candidate' : 'employer';
    const updated = StoreService.switchUserRole(currentUser.id, nextRole);
    setCurrentUser(updated);
    setSwitchFeedback(`Modo alterado para ${nextRole === 'employer' ? 'Empresa' : 'Candidato'} com sucesso!`);
    setTimeout(() => setSwitchFeedback(''), 3000);
    refreshData();
  };

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setCurrentTab(mode);
  };

  if (currentTab === 'register') {
    return (
      <RegisterPage
        onRegisterSuccess={(user) => {
          setCurrentUser(user);
          setCurrentTab('home');
          refreshData();
        }}
        onNavigateToLogin={() => setCurrentTab('login')}
        onNavigateToHome={() => setCurrentTab('home')}
      />
    );
  }

  if (currentTab === 'login') {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setCurrentTab('home');
          refreshData();
        }}
        onNavigateToRegister={() => setCurrentTab('register')}
        onNavigateToHome={() => setCurrentTab('home')}
      />
    );
  }

  return (
    <ErrorBoundary>
      <div 
        onTouchStart={handleTouchStartGlobal}
        onTouchMove={handleTouchMoveGlobal}
        onTouchEnd={handleTouchEndGlobal}
        onTouchCancel={handleTouchCancelGlobal}
        className="min-h-screen flex flex-col bg-white font-sans text-[#111827] antialiased selection:bg-[#0F4C9C] selection:text-white"
      >


        {/* Pull-to-Refresh Visual Indicator */}
        {(pullDistance > 0 || isRefreshing) && (
          <div 
            className="fixed top-2 left-1/2 -translate-x-1/2 z-50 transition-all duration-150 pointer-events-none"
            style={{
              transform: `translate(-50%, ${Math.min(pullDistance, 55)}px)`
            }}
          >
            <div className="bg-[#0F4C9C] text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2.5 text-xs font-semibold backdrop-blur-sm border border-white/20">
              {isRefreshing ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-sky-200" />
                  <span>A atualizar a plataforma...</span>
                </>
              ) : pullDistance >= 45 ? (
                <>
                  <RotateCw className="w-4 h-4 text-sky-200 transition-transform duration-200 rotate-180" />
                  <span>Solte para atualizar</span>
                </>
              ) : (
                <>
                  <ArrowDown className="w-4 h-4 text-sky-200 transition-transform duration-150" />
                  <span>Puxe para atualizar</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Refresh Success Toast */}
        {refreshToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0F4C9C] text-white px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 text-xs font-bold animate-fadeIn border border-white/20">
            <Check className="w-4 h-4 text-emerald-300" />
            <span>{refreshToast}</span>
          </div>
        )}

        {/* Role Switch Feedback Toast */}
        {switchFeedback && (
          <div className="bg-[#0F4C9C] text-white px-4 py-2 text-center text-xs font-bold shadow-md transition animate-fadeIn">
            {switchFeedback}
          </div>
        )}


        {/* Navigation Bar */}
        <Navbar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          currentUser={currentUser}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
          onOpenNewJob={() => setNewJobModalOpen(true)}
          onOpenNewProduct={handleOpenNewProduct}
          onSwitchAccountRole={handleSwitchAccountRole}
          unreadNotificationsCount={notifications.filter(n => !n.read).length}
          onOpenNotifications={() => setNotificationsModalOpen(true)}
          isPCMode={isPCMode}
          onTogglePCMode={handleTogglePCMode}
        />

        {/* Main Content Area com Layout Otimizado para Modo PC e Dispositivos Móveis */}
        <main className={`flex-1 pb-24 md:pb-12 mx-auto w-full transition-all duration-300 ${
          currentTab === 'home' ? 'w-full' : (isPCMode ? 'max-w-7xl px-4 sm:px-6 lg:px-8' : 'max-w-5xl px-3 sm:px-6')
        }`}>
          <div key={currentTab} className="animate-fadeIn">
            {currentTab === 'home' && (
              <Home
                jobs={jobs}
                products={products}
                companies={companies}
                setCurrentTab={setCurrentTab}
                onSelectJob={job => setSelectedJob(job)}
                onSelectCompany={company => setSelectedCompany(company)}
                onSelectProduct={(product: MarketplaceProduct) => setSelectedProduct(product)}
                currentUser={currentUser}
                onOpenAuth={() => handleOpenAuth('login')}
              />
            )}

            {currentTab === 'jobs' && (
              <JobsPage
                jobs={jobs}
                companies={companies}
                currentUser={currentUser}
                onSelectJob={job => setSelectedJob(job)}
                onSelectCompany={company => setSelectedCompany(company)}
              />
            )}

            {currentTab === 'marketplace' && (
              <MarketplacePage
                products={products}
                companies={companies}
                currentUser={currentUser}
                onOpenAuth={() => handleOpenAuth('login')}
                onOpenNewProduct={handleOpenNewProduct}
                onSelectCompany={company => setSelectedCompany(company)}
                onSelectProduct={product => setSelectedProduct(product)}
                selectedProduct={selectedProduct}
                onProductDeleted={handleProductDeleted}
              />
            )}

            {currentTab === 'community' && (
              <CommunityPage
                posts={posts}
                currentUser={currentUser}
                onPostCreated={refreshData}
                onPostUpdated={handlePostUpdate}
                onOpenAuth={() => handleOpenAuth('login')}
                onSelectPost={post => setSelectedPost(post)}
                onSelectCompany={company => setSelectedCompany(company)}
                onSelectCandidate={candidate => setSelectedCandidate(candidate)}
              />
            )}

            {currentTab === 'companies' && (
              <CompaniesPage
                jobs={jobs}
                companies={companies}
                onSelectCompany={company => setSelectedCompany(company)}
              />
            )}

            {currentTab === 'dashboard' && currentUser && (
              <DashboardPage
                currentUser={currentUser}
                jobs={jobs}
                posts={posts}
                onOpenNewJob={() => setNewJobModalOpen(true)}
                onSelectJob={job => setSelectedJob(job)}
                onSelectPost={post => setSelectedPost(post)}
                onRefreshData={refreshData}
                onOpenExam={(exam, appId, job) => setSelectedExam({ exam, applicationId: appId, job })}
                onOpenReview={setSelectedAttemptForReview}
                onOpenCertificate={setSelectedAttemptForCertificate}
              />
            )}

            {currentTab === 'profile' && currentUser && (
              currentUser.role === 'employer' ? (
                <div className="px-4 sm:px-6 py-6 w-full">
                  <EmployerProfileView
                    currentUser={currentUser}
                    jobs={jobs}
                    products={products}
                    posts={posts}
                    applications={applications}
                    onOpenNewJob={() => setNewJobModalOpen(true)}
                    onOpenNewProduct={handleOpenNewProduct}
                    onProfileUpdated={updated => {
                      setCurrentUser(updated);
                      refreshData();
                    }}
                    onProductUpdated={refreshData}
                    onPostCreated={refreshData}
                    onSelectJob={job => setSelectedJob(job)}
                  />
                </div>
              ) : (
                <div className="px-4 sm:px-6 py-6 w-full">
                  <CandidateProfileView
                    currentUser={currentUser}
                    posts={posts}
                    onProfileUpdated={updated => {
                      setCurrentUser(updated);
                      refreshData();
                    }}
                    onPostCreated={refreshData}
                    onSwitchToEmployer={handleSwitchAccountRole}
                  />
                </div>
              )
            )}

            {currentTab === 'store' && currentUser && currentUser.role === 'employer' && (
              <div className="px-4 sm:px-6 py-6 w-full">
                <EmployerProfileView
                  currentUser={currentUser}
                  jobs={jobs}
                  products={products}
                  posts={posts}
                  onOpenNewJob={() => setNewJobModalOpen(true)}
                  onOpenNewProduct={handleOpenNewProduct}
                  onProfileUpdated={updated => {
                    setCurrentUser(updated);
                    refreshData();
                  }}
                  onProductUpdated={refreshData}
                  onPostCreated={refreshData}
                  onSelectJob={job => setSelectedJob(job)}
                />
              </div>
            )}

            {currentTab === 'terms' && (
              <LegalPage initialTab="terms" setCurrentTab={setCurrentTab} />
            )}

            {currentTab === 'privacy' && (
              <LegalPage initialTab="privacy" setCurrentTab={setCurrentTab} />
            )}
          </div>
        </main>

        {/* Rodapé Corporativo com Silhueta de Raio, Rotação de Empresas e Links Úteis */}
        <Footer 
          products={products}
          companies={companies}
          onSelectCompany={company => setSelectedCompany(company)}
          onSelectProduct={(product: MarketplaceProduct) => setSelectedProduct(product)}
          onOpenNewProduct={handleOpenNewProduct}
          isPCMode={isPCMode}
          onTogglePCMode={handleTogglePCMode}
          setCurrentTab={setCurrentTab}
        />

        {/* Mobile-first Persistent Bottom Nav */}
        <BottomNav
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          currentUser={currentUser}
          onOpenAuth={() => handleOpenAuth('login')}
        />

        {/* Modals */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onLoginSuccess={user => {
            setCurrentUser(user);
            refreshData();
          }}
        />

        <JobDetailModal
          job={selectedJob}
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          currentUser={currentUser}
          companies={companies}
          onSelectCompany={comp => {
            setSelectedJob(null);
            setSelectedCompany(comp);
          }}
          onOpenAuth={() => {
            setSelectedJob(null);
            handleOpenAuth('login');
          }}
          onSuccessApply={refreshData}
          onOpenExam={(exam, appId, job) => setSelectedExam({ exam, applicationId: appId, job: job || selectedJob || undefined })}
        />

        <ExamModal
          exam={selectedExam?.exam || null}
          job={selectedExam?.job || null}
          applicationId={selectedExam?.applicationId}
          isOpen={!!selectedExam}
          onClose={() => setSelectedExam(null)}
          currentUser={currentUser}
          onExamSubmitted={refreshData}
          onOpenReview={(attempt) => {
            setSelectedExam(null);
            setSelectedAttemptForReview(attempt);
          }}
          onOpenCertificate={(attempt) => {
            setSelectedExam(null);
            setSelectedAttemptForCertificate(attempt);
          }}
        />

        <ExamReviewModal
          isOpen={!!selectedAttemptForReview}
          onClose={() => setSelectedAttemptForReview(null)}
          attempt={selectedAttemptForReview}
          onOpenCertificate={(attempt) => {
            setSelectedAttemptForReview(null);
            setSelectedAttemptForCertificate(attempt);
          }}
        />

        <ExamCertificateModal
          isOpen={!!selectedAttemptForCertificate}
          onClose={() => setSelectedAttemptForCertificate(null)}
          attempt={selectedAttemptForCertificate}
          currentUser={currentUser}
        />

        <CompanyPublicModal
          company={selectedCompany}
          isOpen={!!selectedCompany}
          onClose={() => setSelectedCompany(null)}
          jobs={jobs}
          products={products}
          posts={posts}
          currentUser={currentUser}
          onSelectJob={job => setSelectedJob(job)}
          onSelectPost={post => setSelectedPost(post)}
          onSelectProduct={prod => setSelectedProduct(prod)}
          onOpenAuth={() => {
            setSelectedCompany(null);
            handleOpenAuth('login');
          }}
        />

        <CandidatePublicModal
          candidate={selectedCandidate}
          isOpen={!!selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          posts={posts}
          products={products}
          currentUser={currentUser}
          onSelectPost={post => setSelectedPost(post)}
          onSelectProduct={prod => setSelectedProduct(prod)}
        />

        {selectedProduct && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-white animate-fadeIn">
            <ProductDetailPage
              product={selectedProduct}
              onBack={() => setSelectedProduct(null)}
              companies={companies}
              allProducts={products}
              currentUser={currentUser}
              onOpenAuth={() => handleOpenAuth('login')}
              onSelectCompany={company => {
                setSelectedProduct(null);
                setSelectedCompany(company);
              }}
              onSelectProduct={prod => setSelectedProduct(prod)}
              onProductDeleted={handleProductDeleted}
            />
          </div>
        )}

        <FullscreenPostModal
          posts={posts}
          currentPostId={selectedPost?.id || null}
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          currentUser={currentUser}
          onPostUpdated={handlePostUpdate}
          onOpenAuth={() => {
            setSelectedPost(null);
            handleOpenAuth('login');
          }}
          onSelectCompany={company => setSelectedCompany(company)}
          onSelectCandidate={candidate => setSelectedCandidate(candidate)}
        />

        <NewJobModal
          isOpen={newJobModalOpen}
          onClose={() => setNewJobModalOpen(false)}
          currentUser={currentUser}
          onJobCreated={refreshData}
        />

        <NewProductModal
          isOpen={newProductModalOpen}
          onClose={() => setNewProductModalOpen(false)}
          currentUser={currentUser}
          onProductCreated={refreshData}
        />

        <PayPalPaymentModal
          isOpen={paypalModalOpen}
          onClose={() => setPaypalModalOpen(false)}
          currentUser={currentUser}
          onPaymentSuccess={user => {
            setCurrentUser(user);
            refreshData();
          }}
        />

        <NotificationsModal
          isOpen={notificationsModalOpen}
          onClose={() => setNotificationsModalOpen(false)}
          currentUser={currentUser}
          notifications={notifications}
          onNotificationUpdate={() => {
            if (currentUser) {
              setNotifications(StoreService.getNotifications(currentUser.id));
            }
          }}
          setCurrentTab={setCurrentTab}
        />

        <ExploreSearchModal
          isOpen={exploreModalOpen}
          onClose={() => setExploreModalOpen(false)}
          companies={companies}
          allUsers={allUsers}
          jobs={jobs}
          products={products}
          posts={posts}
          onSelectCompany={company => setSelectedCompany(company)}
          onSelectJob={job => setSelectedJob(job)}
          onSelectProduct={product => setSelectedProduct(product)}
          onSelectPost={post => setSelectedPost(post)}
        />

        {/* Assistente de IA CuneneVagas */}
        <AIAssistantWidget
          currentUser={currentUser}
          jobs={jobs}
          products={products}
          setCurrentTab={setCurrentTab}
          onOpenPayPal={() => {
            if (!currentUser) {
              setCurrentTab('login');
              return;
            }
            const isUnlocked = Boolean(currentUser.company?.marketplace_unlocked || currentUser.marketplace_unlocked);
            const allProds = StoreService.getProducts();
            const userProds = allProds.filter(p => p.seller_id === currentUser.id || (currentUser.company?.id && p.company_id === currentUser.company.id));
            if (userProds.length >= 10 && !isUnlocked) {
              setPaypalModalOpen(true);
            } else {
              handleOpenNewProduct();
            }
          }}
        />

        {/* Verified Notice Modal */}
        {verifiedNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center space-y-5">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
                <Check className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900">Conta Verificada!</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {verifiedNotice}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setVerifiedNotice(null);
                  setCurrentTab('login');
                  window.history.replaceState({}, document.title, window.location.pathname);
                }}
                className="w-full bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-bold py-3.5 rounded-2xl text-sm transition shadow-md cursor-pointer"
              >
                Inicie sessão agora
              </button>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
