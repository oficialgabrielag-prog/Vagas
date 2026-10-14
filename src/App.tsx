import React, { useState, useEffect, useRef } from 'react';
import { X, RotateCw, Check, ArrowDown } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { BottomNav } from './components/BottomNav';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { OfflineIndicator } from './components/OfflineIndicator';
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

import { StoreService } from './lib/store';
import { Job, UserProfile, Exam, MarketplaceProduct, CommunityPost, ExamAttempt, JobApplication } from './lib/types';
import { onAuthStateChange, getSession, supabase } from './lib/supabase';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(StoreService.getCurrentUser());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isPCMode, setIsPCMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cunene_pc_mode');
      if (saved !== null) return saved === 'true';
      return window.innerWidth >= 1024;
    }
    return true;
  });

  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cunene_theme_mode');
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    }
    return 'system';
  });

  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      let isDark = false;
      if (themeMode === 'dark') {
        isDark = true;
      } else if (themeMode === 'light') {
        isDark = false;
      } else {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode]);

  const handleTogglePCMode = () => {
    setIsPCMode((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('cunene_pc_mode', String(next));
      }
      return next;
    });
  };

  const handleToggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === 'system' ? 'light' : prev === 'light' ? 'dark' : 'system';
      if (typeof window !== 'undefined') {
        localStorage.setItem('cunene_theme_mode', next);
      }
      return next;
    });
  };

  // Sync posts in real-time
  useEffect(() => {
    const channel = supabase
      .channel('community-posts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_posts',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const post = payload.new as CommunityPost;
            setPosts((atuais) => [post, ...atuais.filter((item) => item.id !== post.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedPost = payload.new as CommunityPost;
            setPosts((atuais) =>
              atuais.map((item) => (item.id === updatedPost.id ? updatedPost : item))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
      setNotifications(StoreService.getNotifications(currentUser.id));
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
      // Adicionar mais tratamentos conforme necessário
    };
    window.addEventListener('navigate-to-item', handleNavigateToItem);
    
    return () => {
      window.removeEventListener('open-explore-search', handleOpenExplore);
      window.removeEventListener('navigate-to-item', handleNavigateToItem);
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

      const compTimeout = new Promise<UserProfile[]>((resolve) => setTimeout(() => resolve(StoreService.getCompanies()), 5000));
      const freshCompanies = await Promise.race([
        StoreService.fetchCompanies(),
        compTimeout
      ]);
      if (freshCompanies) setCompanies(freshCompanies);
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

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Escuta exclusão de posts para atualização reativa instantânea
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
    window.addEventListener('cunene_post_deleted', handlePostDeleted);
    return () => {
      window.removeEventListener('cunene_post_deleted', handlePostDeleted);
    };
  }, [selectedPost]);

  // Supabase Realtime: Atualiza os dados instantaneamente em todos os clientes
  useEffect(() => {
    const channel = supabase
      .channel('cunene-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, () => {
        StoreService.fetchPosts().then(freshPosts => setPosts(freshPosts));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace' }, () => {
        StoreService.fetchProducts().then(freshProds => setProducts(freshProds));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
        StoreService.fetchJobs().then(freshJobs => setJobs(freshJobs));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vagas' }, () => {
        StoreService.fetchJobs().then(freshJobs => setJobs(freshJobs));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
    <div 
      onTouchStart={handleTouchStartGlobal}
      onTouchMove={handleTouchMoveGlobal}
      onTouchEnd={handleTouchEndGlobal}
      onTouchCancel={handleTouchCancelGlobal}
      className="min-h-screen flex flex-col bg-white font-sans text-[#111827] antialiased selection:bg-[#0F4C9C] selection:text-white"
    >
      {!isOnline && <OfflineIndicator />}
      {/* PWA Install Banner */}
      <PWAInstallPrompt />

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

      {/* Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        onOpenNewJob={() => setNewJobModalOpen(true)}
        onOpenNewProduct={handleOpenNewProduct}
        onSwitchAccountRole={handleSwitchAccountRole}
        unreadNotificationsCount={unreadNotificationsCount}
        isPCMode={isPCMode}
        onTogglePCMode={handleTogglePCMode}
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
        onOpenNotifications={() => {
          if (!currentUser) {
            setCurrentTab('login');
            return;
          }
          setNotificationsModalOpen(true);
        }}
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
              posts={posts}
              companies={companies}
              setCurrentTab={setCurrentTab}
              onSelectJob={job => setSelectedJob(job)}
              onSelectCompany={company => setSelectedCompany(company)}
              onSelectPost={post => setSelectedPost(post)}
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
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
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

      {/* Assistente de IA VDN */}
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
    </div>
  );
}
