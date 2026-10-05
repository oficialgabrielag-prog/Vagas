import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
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
import { CompanyPublicModal } from './components/CompanyPublicModal';
import { CandidatePublicModal } from './components/CandidatePublicModal';
import { FullscreenPostModal } from './components/FullscreenPostModal';
import { CandidateProfileView } from './components/CandidateProfileView';
import { EmployerProfileView } from './components/EmployerProfileView';

import { Home } from './pages/Home';
import { JobsPage } from './pages/JobsPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { CommunityPage } from './pages/CommunityPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

import { StoreService } from './lib/store';
import { Job, UserProfile, Exam, MarketplaceProduct, CommunityPost } from './lib/types';
import { onAuthStateChange, getSession, supabase } from './lib/supabase';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(StoreService.getCurrentUser());
  const [initializing, setInitializing] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  const [jobs, setJobs] = useState<Job[]>(StoreService.getJobs());
  const [products, setProducts] = useState<MarketplaceProduct[]>(StoreService.getProducts());
  const [posts, setPosts] = useState(StoreService.getPosts());
  const [companies, setCompanies] = useState<UserProfile[]>([]);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedExam, setSelectedExam] = useState<{ exam: Exam; applicationId?: string; job?: Job } | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<UserProfile | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<UserProfile | null>(null);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [newJobModalOpen, setNewJobModalOpen] = useState(false);
  const [newProductModalOpen, setNewProductModalOpen] = useState(false);
  const [paypalModalOpen, setPaypalModalOpen] = useState(false);
  const [switchFeedback, setSwitchFeedback] = useState<string>('');

  // 1. Gestos de Deslizar (Swipe Navigation)
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

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
  };

  const handleTouchEndGlobal = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    // Pull-to-refresh (vertical down swipe)
    if (diffY > 150 && Math.abs(diffX) < 50) {
      window.location.reload();
    }

    // Detetar deslize horizontal focado (delta X expressivo, delta Y baixo)
    else if (Math.abs(diffX) > 75 && Math.abs(diffY) < 55) {
      const tabsList = ['home', 'jobs'];
      if (currentUser?.role === 'employer') {
        tabsList.push('store');
      }
      tabsList.push('marketplace', 'community', 'companies');

      const curIndex = tabsList.indexOf(currentTab);
      if (curIndex !== -1) {
        if (diffX < 0) {
          // Deslizar para a Esquerda -> Voltar (Prev Tab)
          const prevTab = tabsList[(curIndex - 1 + tabsList.length) % tabsList.length];
          setCurrentTab(prevTab);
        } else {
          // Deslizar para a Direita -> Avançar (Next Tab)
          const nextTab = tabsList[(curIndex + 1) % tabsList.length];
          setCurrentTab(nextTab);
        }
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleOpenNewProduct = () => {
    if (!currentUser) {
      setCurrentTab('login');
      return;
    }
    if (currentUser.role === 'employer') {
      const isUnlocked = currentUser.company?.marketplace_unlocked || currentUser.marketplace_unlocked;
      if (!isUnlocked) {
        setPaypalModalOpen(true);
        return;
      }
    }
    setNewProductModalOpen(true);
  };

  const refreshData = async () => {
    const { jobs: freshJobs, products: freshProds, posts: freshPosts, applications: freshApps } = await StoreService.syncWithSupabase(currentUser || undefined);
    setJobs(freshJobs);
    setProducts(freshProds);
    setPosts(freshPosts);

    const freshCompanies = await StoreService.fetchCompanies();
    setCompanies(freshCompanies);
  };

  const handlePostUpdate = (updatedPost: CommunityPost) => {
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
    if (selectedPost?.id === updatedPost.id) {
      setSelectedPost(updatedPost);
    }
  };

  // Restore & sync Supabase Auth session & fresh data on startup
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
            // Limpa o parâmetro da URL de forma limpa
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          setCurrentUser(restored);
        }
      }
      setInitializing(false);
    });

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
      setInitializing(false);
    });

    // Initial sync
    refreshData();

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Sincronização automática sempre que mudar de aba
  useEffect(() => {
    refreshData();
  }, [currentTab]);

  // Sincronização ao focar na janela ou voltar a ter internet
  useEffect(() => {
    const handleWindowFocus = () => {
      refreshData();
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

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

  // RESTRIÇÃO TOTAL: Usuários não autenticados não podem ver o conteúdo do app
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-[#0F4C9C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    if (currentTab === 'register') {
      return (
        <RegisterPage
          onRegisterSuccess={(user) => {
            setCurrentUser(user);
            setCurrentTab('home');
            refreshData();
          }}
          onNavigateToLogin={() => setCurrentTab('login')}
          onNavigateToHome={() => setCurrentTab('login')}
        />
      );
    }

    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setCurrentTab('home');
          refreshData();
        }}
        onNavigateToRegister={() => setCurrentTab('register')}
        onNavigateToHome={() => setCurrentTab('login')}
      />
    );
  }

  return (
    <div 
      onTouchStart={handleTouchStartGlobal}
      onTouchEnd={handleTouchEndGlobal}
      className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800 antialiased selection:bg-[#0F4C9C] selection:text-white"
    >
      {!isOnline && <OfflineIndicator />}
      {/* PWA Install Banner */}
      <PWAInstallPrompt />

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
      />

      {/* Main Content Area */}
      <main className="flex-1">
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
            currentUser={currentUser}
            onOpenAuth={() => handleOpenAuth('login')}
          />
        )}

        {currentTab === 'jobs' && (
          <JobsPage
            jobs={jobs}
            currentUser={currentUser}
            onSelectJob={job => setSelectedJob(job)}
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
            onOpenNewJob={() => setNewJobModalOpen(true)}
            onSelectJob={job => setSelectedJob(job)}
          />
        )}

        {currentTab === 'profile' && currentUser && (
          currentUser.role === 'employer' ? (
            <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full">
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
          ) : (
            <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full">
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
          <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full">
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
      </main>

[REMOVED]

      {/* Footer */}
      <Footer />

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
        onOpenAuth={() => {
          setSelectedCompany(null);
          handleOpenAuth('login');
        }}
      />

      <CandidatePublicModal
        candidate={selectedCandidate}
        isOpen={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        currentUser={currentUser}
      />

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
    </div>
  );
}
