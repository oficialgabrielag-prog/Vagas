import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './lib/supabase';
import { StoreService } from './lib/store';
import { 
  Job, 
  MarketplaceProduct, 
  CommunityPost, 
  UserProfile, 
  JobApplication, 
  Exam, 
  ExamAttempt, 
  NotificationItem,
  CandidateProfile
} from './lib/types';

// Navegação e Layout Principal
import CuneneVagasSplash from './components/CuneneVagasSplash';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';

// Páginas Completas da Plataforma
import { Home } from './pages/Home';
import { JobsPage } from './pages/JobsPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { CommunityPage } from './pages/CommunityPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { DashboardPage } from './pages/DashboardPage';
import { LegalPage } from './pages/LegalPage';

// Perfil de Candidato e Empresa
import { CandidateProfileView } from './components/CandidateProfileView';
import { EmployerProfileView } from './components/EmployerProfileView';
import { CandidatesBrowser, ExamsCenter } from './components/ExtendedModules';

// Modais Oficiais
import { JobDetailModal } from './components/JobDetailModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CompanyPublicModal } from './components/CompanyPublicModal';
import { CandidatePublicModal } from './components/CandidatePublicModal';
import { ExamModal } from './components/ExamModal';
import { ExamReviewModal } from './components/ExamReviewModal';
import { ExamCertificateModal } from './components/ExamCertificateModal';
import { AuthModal } from './components/AuthModal';
import { NewJobModal } from './components/NewJobModal';
import { NewProductModal } from './components/NewProductModal';
import { PostDetailModal } from './components/PostDetailModal';
import { ExploreSearchModal } from './components/ExploreSearchModal';
import { NotificationsModal } from './components/NotificationsModal';
import { AIAssistantWidget } from './components/AIAssistantWidget';
import { EmailVerificationBanner } from './components/EmailVerificationBanner';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SeoHelmet } from './components/SeoHelmet';

import './style.css';

export function App() {
  // Sessão e Utilizador
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => StoreService.getCurrentUser());
  const [currentTab, setCurrentTab] = useState<string>('home');

  // Dados da plataforma (Sincronizados com Supabase e Cache Local)
  const [jobs, setJobs] = useState<Job[]>(() => StoreService.getJobs());
  const [products, setProducts] = useState<MarketplaceProduct[]>(() => StoreService.getProducts());
  const [posts, setPosts] = useState<CommunityPost[]>(() => StoreService.getPosts());
  const [companies, setCompanies] = useState<UserProfile[]>(() => StoreService.getCompanies());
  const [featuredCandidates, setFeaturedCandidates] = useState<UserProfile[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>(() => StoreService.getApplications());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => 
    currentUser ? StoreService.getNotifications(currentUser.id) : []
  );

  // Estados dos Modais de Detalhe e Ação
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<UserProfile | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<UserProfile | CandidateProfile | null>(null);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);

  // Estados dos Exames (Uma vez feito não repetir)
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [activeExamJob, setActiveExamJob] = useState<Job | null>(null);
  const [activeExamApplicationId, setActiveExamApplicationId] = useState<string | undefined>(undefined);
  const [activeReviewAttempt, setActiveReviewAttempt] = useState<ExamAttempt | null>(null);
  const [activeCertificateAttempt, setActiveCertificateAttempt] = useState<ExamAttempt | null>(null);

  // Modais de Formulários & Ferramentas
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isExploreSearchOpen, setIsExploreSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  // Carregar dados canónicos do Supabase
  const refreshAll = useCallback(async () => {
    try {
      const activeU = StoreService.getCurrentUser();
      const syncResult = await StoreService.syncWithSupabase(activeU || undefined);
      if (syncResult) {
        if (Array.isArray(syncResult.jobs) && syncResult.jobs.length > 0) {
          setJobs(syncResult.jobs);
        }
        if (Array.isArray(syncResult.products) && syncResult.products.length > 0) {
          setProducts(syncResult.products);
        }
        if (Array.isArray(syncResult.posts) && syncResult.posts.length > 0) {
          setPosts(StoreService.getPosts());
        }
        if (Array.isArray(syncResult.applications)) {
          setApplications(syncResult.applications);
        }
      }
      const [fetchedCompanies, fetchedCandidates] = await Promise.all([
        StoreService.fetchCompanies(),
        StoreService.fetchFeaturedCandidates()
      ]);
      setCompanies(Array.isArray(fetchedCompanies) ? fetchedCompanies : []);
      setFeaturedCandidates(Array.isArray(fetchedCandidates) ? fetchedCandidates : []);
      if (activeU) {
        const notifs = await StoreService.fetchNotifications(activeU.id);
        setNotifications(notifs);
      }
    } catch (e) {
      console.warn('Erro ao sincronizar dados:', e);
    }
  }, []);

  const handlePostUpdatedInPlace = useCallback((updatedPost?: CommunityPost) => {
    if (updatedPost && updatedPost.id) {
      setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
      setSelectedPost((prev) => (prev && prev.id === updatedPost.id ? updatedPost : prev));
    } else {
      const cached = StoreService.getPosts();
      if (cached.length > 0) setPosts(cached);
    }
  }, []);

  // Monitorar autenticação Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        StoreService.restoreUserFromSession(data.session.user).then((prof: UserProfile | null) => {
          if (prof) setCurrentUser(prof);
        });
      }
    });

    const { data: authSub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const prof = await StoreService.restoreUserFromSession(session.user);
        if (prof) setCurrentUser(prof);
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      authSub.subscription.unsubscribe();
    };
  }, []);

  // Sincronização inicial
  useEffect(() => {
    let mounted = true;
    refreshAll().finally(() => {
      if (mounted) setIsInitialLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [refreshAll]);

  // Realtime Subscriptions para Atualizações Dinâmicas
  useEffect(() => {
    let postsSyncTimer: number | undefined;
    const schedulePostsSync = () => {
      if (postsSyncTimer) window.clearTimeout(postsSyncTimer);
      postsSyncTimer = window.setTimeout(() => {
        StoreService.fetchPosts().then((fetched) => {
          if (fetched && fetched.length > 0) {
            setPosts(StoreService.getPosts());
          }
        });
      }, 450);
    };

    const channel = supabase
      .channel('cunenevagas-realtime-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, schedulePostsSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace' }, () => {
        StoreService.fetchProducts().then((fetched) => {
          if (fetched && fetched.length > 0) setProducts(fetched);
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
        StoreService.fetchJobs().then((fetched) => {
          if (fetched && fetched.length > 0) setJobs(fetched);
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
        if (currentUser) {
          StoreService.fetchApplications(currentUser).then(setApplications);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        if (currentUser) {
          StoreService.fetchNotifications(currentUser.id).then(setNotifications);
        }
      })
      .subscribe();

    return () => {
      if (postsSyncTimer) window.clearTimeout(postsSyncTimer);
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  // Event Listeners Globais para Interações no Header/Footer/Avisos
  useEffect(() => {
    const handleOpenExplore = () => setIsExploreSearchOpen(true);
    const handleOpenAuth = (e: any) => {
      setAuthMode(e.detail?.mode || 'login');
      setIsAuthModalOpen(true);
    };
    const handleOpenNewJob = () => {
      if (!currentUser) {
        setAuthMode('login');
        setIsAuthModalOpen(true);
        return;
      }
      setIsNewJobModalOpen(true);
    };
    const handleOpenNewProduct = () => {
      if (!currentUser) {
        setAuthMode('login');
        setIsAuthModalOpen(true);
        return;
      }
      setIsNewProductModalOpen(true);
    };
    const handleOpenNotifications = () => {
      if (!currentUser) {
        setAuthMode('login');
        setIsAuthModalOpen(true);
        return;
      }
      setIsNotificationsOpen(true);
    };
    const handleNavigate = (e: any) => {
      if (e.detail?.tab) setCurrentTab(e.detail.tab);
    };
    const handlePostAdded = (e: any) => {
      const newPost = e.detail as CommunityPost | undefined;
      if (newPost && newPost.id) {
        const deletedIds = StoreService.getDeletedIds('posts');
        if (deletedIds.has(newPost.id)) return;
        setPosts((prev) => {
          const merged = [newPost, ...prev.filter((p) => p.id !== newPost.id && !deletedIds.has(p.id))];
          merged.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
          return merged;
        });
      } else {
        setPosts(StoreService.getPosts());
      }
    };
    const handlePostDeleted = (e: any) => {
      const deletedId = e.detail?.postId;
      if (deletedId) {
        setPosts((prev) => prev.filter((p) => p.id !== deletedId));
        setSelectedPost((prev) => (prev && prev.id === deletedId ? null : prev));
      } else {
        setPosts(StoreService.getPosts());
      }
    };
    const handlePostsChange = () => {
      const cached = StoreService.getPosts();
      if (cached.length > 0) setPosts(cached);
    };

    window.addEventListener('open-explore-search', handleOpenExplore);
    window.addEventListener('open-auth', handleOpenAuth);
    window.addEventListener('open-new-job', handleOpenNewJob);
    window.addEventListener('open-new-product', handleOpenNewProduct);
    window.addEventListener('open-notifications', handleOpenNotifications);
    window.addEventListener('navigate-tab', handleNavigate);
    window.addEventListener('cunene_post_added', handlePostAdded);
    window.addEventListener('cunene_post_deleted', handlePostDeleted);
    window.addEventListener('cunene_posts_updated', handlePostsChange);

    return () => {
      window.removeEventListener('open-explore-search', handleOpenExplore);
      window.removeEventListener('open-auth', handleOpenAuth);
      window.removeEventListener('open-new-job', handleOpenNewJob);
      window.removeEventListener('open-new-product', handleOpenNewProduct);
      window.removeEventListener('open-notifications', handleOpenNotifications);
      window.removeEventListener('navigate-tab', handleNavigate);
      window.removeEventListener('cunene_post_added', handlePostAdded);
      window.removeEventListener('cunene_post_deleted', handlePostDeleted);
      window.removeEventListener('cunene_posts_updated', handlePostsChange);
    };
  }, [currentUser]);

  // Contagem de notificações não lidas
  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Alternar entre Candidato e Empresa
  const handleSwitchRole = () => {
    if (!currentUser) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    const nextRole = currentUser.role === 'employer' ? 'candidate' : 'employer';
    const updated = StoreService.switchUserRole(currentUser.id, nextRole);
    setCurrentUser(updated);
  };

  // Logout
  const handleLogout = async () => {
    await StoreService.logout();
    setCurrentUser(null);
    setCurrentTab('home');
  };

  // Iniciar Exame Profissional (com verificação estrita: não repetir uma vez feito)
  const handleOpenExam = (exam: Exam, applicationId?: string, job?: Job) => {
    if (!currentUser) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }

    // Verificar se já realizou o exame
    const previous = StoreService.getExamAttempts().filter((a) =>
      a.candidate_id === currentUser.id &&
      (a.exam_id === exam.id || (exam.title && a.exam?.title === exam.title))
    );

    if (previous.length >= 1) {
      // Já realizou: não repetir! Abrir diretamente o gabarito ou certificado
      const best = [...previous].sort((a, b) => b.percentage - a.percentage)[0];
      if (best.passed) {
        setActiveCertificateAttempt(best);
      } else {
        setActiveReviewAttempt(best);
      }
      return;
    }

    setActiveExam(exam);
    setActiveExamApplicationId(applicationId);
    setActiveExamJob(job || null);
  };

  const tabSeoMeta: Record<string, { title: string; description: string }> = {
    home: {
      title: 'CuneneVagas — Emprego, Empresas, Comunidade & Marketplace no Cunene',
      description: 'Portal oficial de emprego, vagas, empresas locais, comunidade e marketplace na Província do Cunene, Angola.'
    },
    marketplace: {
      title: 'Marketplace do Cunene — Produtos e Serviços Locais',
      description: 'Compra e vende produtos, equipamentos e serviços de empresas e profissionais locais no Cunene.'
    },
    community: {
      title: 'Feed da Comunidade — CuneneVagas',
      description: 'Publicações, debates profissionais, novidades de emprego e negócios na comunidade do Cunene.'
    },
    candidates: {
      title: 'Candidatos e Talentos no Cunene',
      description: 'Descobre profissionais qualificados e candidatos disponíveis em Ondjiva, Namacunde, Xangongo e todo o Cunene.'
    },
    exams: {
      title: 'Centro de Exames e Certificações — CuneneVagas',
      description: 'Realiza testes de aptidão profissional e obtém certificações de mérito no CuneneVagas.'
    },
    dashboard: {
      title: 'Painel de Gestão — CuneneVagas',
      description: 'Gere as tuas vagas, candidaturas, exames e actividade profissional no CuneneVagas.'
    },
    profile: {
      title: 'Perfil Profissional — CuneneVagas',
      description: 'Acede e actualiza o teu perfil de candidato ou empresa no CuneneVagas.'
    },
    legal: {
      title: 'Termos e Privacidade — CuneneVagas',
      description: 'Termos de utilização e política de privacidade da plataforma CuneneVagas.'
    },
    privacy: {
      title: 'Política de Privacidade — CuneneVagas',
      description: 'Política de privacidade e protecção de dados dos utilizadores do CuneneVagas.'
    },
    terms: {
      title: 'Termos de Utilização — CuneneVagas',
      description: 'Termos e condições de uso do CuneneVagas.'
    }
  };
  const currentTabSeo = !selectedJob && !selectedCompany && currentTab !== 'jobs' && currentTab !== 'companies'
    ? tabSeoMeta[currentTab]
    : undefined;

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col font-sans antialiased selection:bg-[#D4AF37] selection:text-black">
      {currentTabSeo && (
        <SeoHelmet
          title={currentTabSeo.title}
          description={currentTabSeo.description}
          canonicalPath={currentTab === 'home' ? '/' : `/?sec=${encodeURIComponent(currentTab)}`}
        />
      )}
      {showSplash && (
        <CuneneVagasSplash onComplete={() => setShowSplash(false)} />
      )}

      {/* Banner de Verificação de Email */}
      {currentUser && (
        <EmailVerificationBanner 
          currentUser={currentUser} 
          onUserUpdated={(updated) => {
            StoreService.setCurrentUser(updated);
            setCurrentUser(updated);
          }} 
        />
      )}

      {/* Indicador de Estado de Rede Offline */}
      <OfflineIndicator />

      {/* Cabeçalho Premium CuneneVagas */}
      <Navbar
        user={currentUser}
        profile={currentUser}
        activeMode={currentUser?.role === 'employer' ? 'empresa' : 'candidato'}
        notificationCount={unreadNotificationsCount}
        onLogin={() => {
          setAuthMode('login');
          setIsAuthModalOpen(true);
        }}
        onRegister={() => {
          setAuthMode('register');
          setIsAuthModalOpen(true);
        }}
        onSwitchMode={handleSwitchRole}
        onNotifications={() => setIsNotificationsOpen(true)}
        onProfile={() => setCurrentTab('profile')}
        onSearch={() => setIsExploreSearchOpen(true)}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        onOpenAuth={(mode) => {
          setAuthMode(mode || 'login');
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        onOpenNewJob={() => {
          if (!currentUser) {
            setAuthMode('login');
            setIsAuthModalOpen(true);
          } else {
            setIsNewJobModalOpen(true);
          }
        }}
        onOpenNewProduct={() => {
          if (!currentUser) {
            setAuthMode('login');
            setIsAuthModalOpen(true);
          } else {
            setIsNewProductModalOpen(true);
          }
        }}
        onSwitchAccountRole={handleSwitchRole}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
      />

      {/* Conteúdo Dinâmico por Aba */}
      <main className="flex-1 w-full">
        {currentTab === 'home' && (
          <Home
            jobs={jobs}
            products={products}
            posts={posts}
            companies={companies}
            featuredCandidates={featuredCandidates}
            setCurrentTab={setCurrentTab}
            onSelectJob={(j) => setSelectedJob(j)}
            onSelectCompany={(c) => setSelectedCompany(c)}
            onSelectCandidate={(c) => setSelectedCandidate(c)}
            onSelectProduct={(p) => setSelectedProduct(p)}
            onSelectPost={(post) => setSelectedPost(post)}
            currentUser={currentUser}
            isLoading={isInitialLoading}
            onOpenAuth={() => {
              setAuthMode('login');
              setIsAuthModalOpen(true);
            }}
          />
        )}

        {currentTab === 'jobs' && (
          <JobsPage
            jobs={jobs}
            companies={companies}
            currentUser={currentUser}
            onSelectJob={(j) => setSelectedJob(j)}
            onSelectCompany={(c) => setSelectedCompany(c)}
          />
        )}

        {currentTab === 'marketplace' && (
          <MarketplacePage
            products={products}
            companies={companies}
            currentUser={currentUser}
            onOpenNewProduct={() => {
              if (!currentUser) {
                setAuthMode('login');
                setIsAuthModalOpen(true);
              } else {
                setIsNewProductModalOpen(true);
              }
            }}
            onSelectCompany={(c) => setSelectedCompany(c)}
            onSelectProduct={(p) => setSelectedProduct(p)}
            selectedProduct={selectedProduct}
            onOpenAuth={() => {
              setAuthMode('login');
              setIsAuthModalOpen(true);
            }}
            onProductDeleted={refreshAll}
          />
        )}

        {currentTab === 'community' && (
          <CommunityPage
            posts={posts}
            currentUser={currentUser}
            onPostCreated={refreshAll}
            onPostUpdated={handlePostUpdatedInPlace}
            onOpenAuth={() => {
              setAuthMode('login');
              setIsAuthModalOpen(true);
            }}
            onSelectPost={(p) => setSelectedPost(p)}
            onSelectCompany={(c) => setSelectedCompany(c)}
            onSelectCandidate={(c) => setSelectedCandidate(c)}
          />
        )}

        {currentTab === 'companies' && (
          <CompaniesPage
            jobs={jobs}
            companies={companies}
            onSelectCompany={(c) => setSelectedCompany(c)}
          />
        )}

        {currentTab === 'candidates' && (
          <div className="max-w-6xl mx-auto px-4 py-8">
            <CandidatesBrowser onSelectCandidate={(c) => setSelectedCandidate(c)} />
          </div>
        )}

        {currentTab === 'dashboard' && (
          currentUser ? (
            <DashboardPage
              currentUser={currentUser}
              jobs={jobs}
              onOpenNewJob={() => setIsNewJobModalOpen(true)}
              onSelectJob={(j) => setSelectedJob(j)}
              posts={posts}
              onRefreshData={refreshAll}
              onSelectPost={(p) => setSelectedPost(p)}
              onOpenExam={handleOpenExam}
              onOpenReview={(attempt) => setActiveReviewAttempt(attempt)}
              onOpenCertificate={(attempt) => setActiveCertificateAttempt(attempt)}
            />
          ) : (
            <div className="max-w-md mx-auto my-20 p-8 bg-[#121212] border border-[#D4AF37]/30 rounded-3xl text-center space-y-4">
              <h2 className="text-xl font-black text-[#F5D77A]">Acesso ao Painel</h2>
              <p className="text-slate-400 text-xs leading-relaxed">
                Inicia sessão na tua conta para gerir candidaturas, vagas, avaliações e configurações.
              </p>
              <button
                onClick={() => {
                  setAuthMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="w-full bg-[#D4AF37] hover:bg-[#F5D77A] text-slate-950 font-black py-3 rounded-xl transition cursor-pointer text-sm shadow-md"
              >
                Entrar com a minha conta
              </button>
            </div>
          )
        )}

        {currentTab === 'profile' && (
          currentUser ? (
            currentUser.role === 'employer' ? (
              <EmployerProfileView
                currentUser={currentUser}
                jobs={jobs}
                products={products}
                posts={posts}
                applications={applications}
                onOpenNewJob={() => setIsNewJobModalOpen(true)}
                onOpenNewProduct={() => setIsNewProductModalOpen(true)}
                onProfileUpdated={(updated) => {
                  StoreService.setCurrentUser(updated);
                  setCurrentUser(updated);
                }}
                onProductUpdated={refreshAll}
                onPostCreated={refreshAll}
                onSelectJob={(j) => setSelectedJob(j)}
              />
            ) : (
              <CandidateProfileView
                currentUser={currentUser}
                posts={posts}
                onProfileUpdated={(updated) => {
                  StoreService.setCurrentUser(updated);
                  setCurrentUser(updated);
                }}
                onPostCreated={refreshAll}
                onSwitchToEmployer={handleSwitchRole}
              />
            )
          ) : (
            <div className="max-w-md mx-auto my-20 p-8 bg-[#121212] border border-[#D4AF37]/30 rounded-3xl text-center space-y-4">
              <h2 className="text-xl font-black text-[#F5D77A]">Perfil de Utilizador</h2>
              <p className="text-slate-400 text-xs leading-relaxed">
                Inicia sessão ou cria o teu perfil para apresentar o teu currículo ou empresa.
              </p>
              <button
                onClick={() => {
                  setAuthMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="w-full bg-[#D4AF37] hover:bg-[#F5D77A] text-slate-950 font-black py-3 rounded-xl transition cursor-pointer text-sm shadow-md"
              >
                Iniciar Sessão ou Criar Conta
              </button>
            </div>
          )
        )}

        {currentTab === 'exams' && (
          <div className="max-w-6xl mx-auto px-4 py-8">
            <ExamsCenter session={currentUser ? { user: { id: currentUser.id, email: currentUser.email } } : undefined} />
          </div>
        )}

        {(currentTab === 'legal' || currentTab === 'privacy' || currentTab === 'terms') && (
          <LegalPage
            initialTab={currentTab === 'privacy' ? 'privacy' : 'terms'}
            setCurrentTab={setCurrentTab}
          />
        )}
      </main>

      {/* Rodapé Oficial da Plataforma */}
      <Footer
        companies={companies}
        featuredCandidates={featuredCandidates}
        products={products}
        onSelectCompany={(c) => setSelectedCompany(c)}
        onSelectCandidate={(c) => setSelectedCandidate(c)}
        onSelectProduct={(p) => setSelectedProduct(p)}
        onOpenNewProduct={() => {
          if (!currentUser) {
            setAuthMode('login');
            setIsAuthModalOpen(true);
          } else {
            setIsNewProductModalOpen(true);
          }
        }}
        setCurrentTab={setCurrentTab}
      />

      {/* Navegação Inferior para Telemóveis / Ecrãs Pequenos */}
      <BottomNav
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        onOpenAuth={() => {
          setAuthMode('login');
          setIsAuthModalOpen(true);
        }}
      />

      {/* Assistente de Inteligência Artificial Flutuante */}
      <AIAssistantWidget
        currentUser={currentUser}
        jobs={jobs}
        products={products}
        setCurrentTab={setCurrentTab}
      />

      {/* ======================================================== */}
      {/* MODAIS E TELAS SOBREPOSTAS                               */}
      {/* ======================================================== */}

      {/* Detalhe da Vaga e Candidatura com CV */}
      <JobDetailModal
        job={selectedJob}
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        currentUser={currentUser}
        onOpenAuth={() => {
          setAuthMode('login');
          setIsAuthModalOpen(true);
        }}
        onSuccessApply={refreshAll}
        onOpenExam={(exam, appId, job) => handleOpenExam(exam, appId, job)}
        onSelectCompany={(c) => setSelectedCompany(c)}
        companies={companies}
      />

      {/* Detalhe do Produto no Marketplace */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        currentUser={currentUser}
        companies={companies}
        onSelectCompany={(c) => setSelectedCompany(c)}
        onOpenAuth={() => {
          setAuthMode('login');
          setIsAuthModalOpen(true);
        }}
      />

      {/* Perfil Público da Empresa (Capa, Logo, Vagas, Loja, Avaliações e WhatsApp) */}
      <CompanyPublicModal
        company={selectedCompany}
        isOpen={!!selectedCompany}
        onClose={() => setSelectedCompany(null)}
        jobs={jobs}
        products={products}
        posts={posts}
        currentUser={currentUser}
        onSelectJob={(j) => setSelectedJob(j)}
        onSelectProduct={(p) => setSelectedProduct(p)}
        onOpenAuth={() => {
          setAuthMode('login');
          setIsAuthModalOpen(true);
        }}
      />

      {/* Perfil Público do Candidato */}
      <CandidatePublicModal
        candidate={selectedCandidate}
        isOpen={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        posts={posts}
        products={products}
        currentUser={currentUser}
        onSelectProduct={(p) => setSelectedProduct(p)}
      />

      {/* Modal Oficial de Exame com Temporizador e Verificação de Tentativa Única */}
      <ExamModal
        exam={activeExam}
        job={activeExamJob}
        applicationId={activeExamApplicationId}
        isOpen={!!activeExam}
        onClose={() => {
          setActiveExam(null);
          setActiveExamJob(null);
          setActiveExamApplicationId(undefined);
        }}
        currentUser={currentUser}
        onExamSubmitted={refreshAll}
        onOpenReview={(attempt) => setActiveReviewAttempt(attempt)}
        onOpenCertificate={(attempt) => setActiveCertificateAttempt(attempt)}
      />

      {/* Modal de Revisão / Gabarito de Exame */}
      <ExamReviewModal
        attempt={activeReviewAttempt}
        isOpen={!!activeReviewAttempt}
        onClose={() => setActiveReviewAttempt(null)}
        onOpenCertificate={(attempt) => setActiveCertificateAttempt(attempt)}
      />

      {/* Modal de Certificado Digital Oficial de Exame */}
      <ExamCertificateModal
        attempt={activeCertificateAttempt}
        currentUser={currentUser}
        isOpen={!!activeCertificateAttempt}
        onClose={() => setActiveCertificateAttempt(null)}
      />

      {/* Modal de Autenticação (Login / Registo com Candidato ou Empresa) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authMode}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthModalOpen(false);
          refreshAll();
        }}
      />

      {/* Modal de Publicação de Nova Vaga com Exame */}
      <NewJobModal
        isOpen={isNewJobModalOpen}
        onClose={() => setIsNewJobModalOpen(false)}
        currentUser={currentUser}
        onJobCreated={refreshAll}
      />

      {/* Modal de Publicação de Produto com Upload de Fotos da Galeria */}
      <NewProductModal
        isOpen={isNewProductModalOpen}
        onClose={() => setIsNewProductModalOpen(false)}
        currentUser={currentUser}
        onProductCreated={refreshAll}
      />

      {/* Modal de Pesquisa Global Instantânea */}
      <ExploreSearchModal
        isOpen={isExploreSearchOpen}
        onClose={() => setIsExploreSearchOpen(false)}
        companies={companies}
        allUsers={companies}
        jobs={jobs}
        products={products}
        posts={posts}
        onSelectCompany={(c) => {
          setSelectedCompany(c);
          setIsExploreSearchOpen(false);
        }}
        onSelectJob={(j) => {
          setSelectedJob(j);
          setIsExploreSearchOpen(false);
        }}
        onSelectProduct={(p) => {
          setSelectedProduct(p);
          setIsExploreSearchOpen(false);
        }}
        onSelectPost={() => {
          setIsExploreSearchOpen(false);
          setCurrentTab('community');
        }}
      />

      {/* Modal Central de Notificações */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        currentUser={currentUser}
        notifications={notifications}
        onNotificationUpdate={refreshAll}
        setCurrentTab={setCurrentTab}
      />

      {/* Modal de Detalhes do Post e Comentários */}
      <PostDetailModal
        post={selectedPost}
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        currentUser={currentUser}
        onPostUpdated={handlePostUpdatedInPlace}
        onOpenAuth={() => {
          setAuthMode('login');
          setIsAuthModalOpen(true);
        }}
        onSelectCompany={(c) => setSelectedCompany(c)}
        onSelectCandidate={(c) => setSelectedCandidate(c)}
      />
    </div>
  );
}

export default App;
