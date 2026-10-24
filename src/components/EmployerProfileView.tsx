import React, { useState } from 'react';
import { Building2, MapPin, Phone, Mail, Globe, MessageCircle, Briefcase, ShoppingBag, Plus, Edit3, Trash2, Camera, Users, FileText, CheckCircle2, AlertCircle, X, Power, Award, CreditCard, Bell, Search, Filter, Star, ChevronRight, RefreshCw } from 'lucide-react';
import { UserProfile, Job, MarketplaceProduct, CommunityPost, JobApplication, CUNENE_MUNICIPALITIES, JOB_CATEGORIES, FollowerItem, CompanyRating, ExamAttempt } from '../lib/types';
import { StoreService } from '../lib/store';
import { supabase } from '../lib/supabase';
import { uploadToCloudinary, cleanDocumentUrl } from '../lib/cloudinary';
import { ImageUploader } from './ImageUploader';
import { PayPalPaymentModal } from './PayPalPaymentModal';
import { MediaViewer } from './MediaViewer';
import { EditarPerfilEmpresa } from './EditarPerfilEmpresa';
import { FollowersModal } from './FollowersModal';

interface EmployerProfileViewProps {
  currentUser: UserProfile;
  jobs: Job[];
  products: MarketplaceProduct[];
  posts: CommunityPost[];
  applications?: JobApplication[];
  onOpenNewJob: () => void;
  onOpenNewProduct: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
  onProductUpdated: () => void;
  onPostCreated: () => void;
  onSelectJob: (job: Job) => void;
}

export const EmployerProfileView: React.FC<EmployerProfileViewProps> = ({
  currentUser,
  jobs,
  products,
  posts,
  applications: propApplications,
  onOpenNewJob,
  onOpenNewProduct,
  onProfileUpdated,
  onProductUpdated,
  onPostCreated,
  onSelectJob
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'store' | 'profile' | 'applications' | 'jobs' | 'payments'>('dashboard');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [followers, setFollowers] = useState<FollowerItem[]>(() => StoreService.getFollowers(currentUser.id));

  React.useEffect(() => {
    const handleUpdate = (e: any) => {
      if (!e.detail?.targetId || e.detail.targetId === currentUser.id) {
        setFollowers(StoreService.getFollowers(currentUser.id));
      }
    };
    window.addEventListener('cunene_followers_updated', handleUpdate);
    return () => window.removeEventListener('cunene_followers_updated', handleUpdate);
  }, [currentUser.id]);

  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [candidateStatusFilter, setCandidateStatusFilter] = useState<string>('all');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<{ url: string; type: 'image'; alt: string }[] | null>(null);
  
  // Product Edit modal state
  const [editingProduct, setEditingProduct] = useState<MarketplaceProduct | null>(null);
  const [editProductTitle, setEditProductTitle] = useState('');
  const [editProductPrice, setEditProductPrice] = useState<number>(0);
  const [editProductCategory, setEditProductCategory] = useState<MarketplaceProduct['category']>('Agricultura');
  const [editProductMunicipality, setEditProductMunicipality] = useState('Ondjiva');
  const [editProductDescription, setEditProductDescription] = useState('');
  const [editProductPhone, setEditProductPhone] = useState('');
  const [editProductImage, setEditProductImage] = useState('');

  // Job Edit modal state
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editJobCategory, setEditJobCategory] = useState('');
  const [editJobMunicipality, setEditJobMunicipality] = useState('Ondjiva');
  const [editJobContractType, setEditJobContractType] = useState<Job['contract_type']>('Tempo Inteiro');
  const [editJobDescription, setEditJobDescription] = useState('');
  const [editJobStatus, setEditJobStatus] = useState<Job['status']>('active');

  // Candidate detail modal state
  const [selectedCandidateApp, setSelectedCandidateApp] = useState<JobApplication | null>(null);
  const [candidateExamAttempt, setCandidateExamAttempt] = useState<ExamAttempt | null>(null);

  React.useEffect(() => {
    if (selectedCandidateApp) {
      const attempts = StoreService.getExamAttempts();
      const found = attempts.find(a => 
        a.candidate_id === selectedCandidateApp.candidate_id && 
        (a.job_id === selectedCandidateApp.job_id || a.application_id === selectedCandidateApp.id)
      );
      setCandidateExamAttempt(found || null);
    } else {
      setCandidateExamAttempt(null);
    }
  }, [selectedCandidateApp]);

  // Isolated Company Profile States
  const company = currentUser.company;
  const [companyName, setCompanyName] = useState(company?.name || currentUser.company_name || 'Minha Empresa');
  const [industry, setIndustry] = useState(company?.industry || currentUser.industry || 'Comércio e Serviços');
  const [municipality, setMunicipality] = useState(company?.municipality || currentUser.municipality || 'Ondjiva');
  const [address, setAddress] = useState(company?.address || currentUser.address || '');
  const [phone, setPhone] = useState(company?.phone || currentUser.phone || '');
  const [whatsapp, setWhatsapp] = useState(company?.whatsapp || currentUser.whatsapp || '');
  const [email, setEmail] = useState(company?.email || currentUser.email || '');
  const [website, setWebsite] = useState(company?.website || currentUser.website || '');
  const [nif, setNif] = useState(company?.nif || currentUser.nif || '');
  const [slogan, setSlogan] = useState(company?.slogan || '');
  const [bio, setBio] = useState(company?.description || currentUser.bio || '');
  const [servicesText, setServicesText] = useState((company?.services || currentUser.services || []).join(', '));
  const [logoUrl, setLogoUrl] = useState(company?.logo_url || currentUser.company_logo || currentUser.avatar_url || '');
  const [coverUrl, setCoverUrl] = useState(company?.cover_url || currentUser.cover_url || '');
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  } | null>(null);

  // Sync form inputs with latest profile data on change or modal open
  React.useEffect(() => {
    const activeComp = currentUser.company;
    setCompanyName(activeComp?.name || currentUser.company_name || 'Minha Empresa');
    setIndustry(activeComp?.industry || currentUser.industry || 'Comércio e Serviços');
    setMunicipality(activeComp?.municipality || currentUser.municipality || 'Ondjiva');
    setAddress(activeComp?.address || currentUser.address || '');
    setPhone(activeComp?.phone || currentUser.phone || '');
    setWhatsapp(activeComp?.whatsapp || currentUser.whatsapp || '');
    setEmail(activeComp?.email || currentUser.email || '');
    setWebsite(activeComp?.website || currentUser.website || '');
    setNif(activeComp?.nif || currentUser.nif || '');
    setSlogan(activeComp?.slogan || '');
    setBio(activeComp?.description || currentUser.bio || '');
    setServicesText((activeComp?.services || currentUser.services || []).join(', '));
    setLogoUrl(activeComp?.logo_url || currentUser.company_logo || currentUser.avatar_url || '');
    setCoverUrl(activeComp?.cover_url || currentUser.cover_url || '');
  }, [currentUser, isEditingProfile]);

  // Business Post state
  const [postContent, setPostContent] = useState('');
  const [postCategory, setPostCategory] = useState<'Empresas' | 'Emprego' | 'Negócios' | 'Marketplace'>('Empresas');
  const [postImage, setPostImage] = useState('');
  const [publishingPost, setPublishingPost] = useState(false);

  // Applications State & Robust Sync / Loading / Error Handling
  const [applications, setApplications] = useState<JobApplication[]>(() => propApplications || StoreService.getApplications());
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    const loadApps = async () => {
      setLoadingApplications(true);
      setApplicationsError(null);
      try {
        const fetched = await StoreService.fetchApplications(currentUser);
        if (isMounted) {
          setApplications(fetched || []);
        }
      } catch (err) {
        if (isMounted) {
          setApplicationsError('Não foi possível carregar candidaturas do servidor.');
          console.warn('Erro ao carregar candidaturas:', err);
        }
      } finally {
        if (isMounted) {
          setLoadingApplications(false);
        }
      }
    };

    if (propApplications && propApplications.length > 0) {
      setApplications(propApplications);
    } else {
      loadApps();
    }

    // Realtime subscription with verified channel and automatic refetch
    const channel = supabase
      .channel(`emp-apps-sync-${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications' },
        async () => {
          try {
            const apps = await StoreService.fetchApplications(currentUser);
            if (isMounted) setApplications(apps || []);
          } catch {}
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.info('[Realtime] Canal de candidaturas conectado.');
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
          console.warn('[Realtime] Canal interrompido, sincronização periódica ativa:', status, err?.message);
        }
      });

    // Safety polling every 30 seconds
    const safetyPoll = setInterval(() => {
      if (document.visibilityState === 'visible') {
        StoreService.fetchApplications(currentUser)
          .then(apps => {
            if (isMounted) setApplications(apps || []);
          })
          .catch(() => {});
      }
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(safetyPoll);
      supabase.removeChannel(channel);
    };
  }, [propApplications, currentUser.id, currentUser.company?.id]);
  
  // Payments State
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  React.useEffect(() => {
    if (activeTab === 'payments') {
      setLoadingPayments(true);
      StoreService.fetchTransactions(currentUser.id)
        .then(data => {
          setPayments(data);
        })
        .catch(err => console.error(err))
        .finally(() => {
          setLoadingPayments(false);
        });
    }
  }, [activeTab, currentUser.id]);

  // Robustly filter real data belonging to this company/employer
  const cleanCompId = (company?.id || currentUser.id).replace(/^comp-/, '');
  const myJobs = jobs.filter(j => 
    j.employer_id === currentUser.id || 
    (company?.id && j.company_id === company.id) ||
    (cleanCompId && j.company_id === cleanCompId) ||
    (currentUser.id && j.company_id === currentUser.id) ||
    (company?.name && j.company_name?.toLowerCase() === company.name.toLowerCase()) ||
    (currentUser.company_name && j.company_name?.toLowerCase() === currentUser.company_name.toLowerCase())
  );

  const myProducts = products.filter(p => p.seller_id === currentUser.id || p.company_id === company?.id || p.company_id === cleanCompId);
  const myPosts = posts.filter(p =>
    (p.author_id === currentUser.id ||
     (company?.id && p.company_id === company.id) ||
     (cleanCompId && p.company_id === cleanCompId) ||
     (currentUser.company_name && p.author_name?.toLowerCase() === currentUser.company_name.toLowerCase()) ||
     p.author_name?.toLowerCase() === (company?.name || '').toLowerCase()) &&
    (p.author_type === 'employer' || (p as any).post_type === 'employer')
  );

  const myJobIds = myJobs.map(j => j.id);
  const myApplications = applications.filter(a => 
    myJobIds.includes(a.job_id) ||
    (cleanCompId && (a as any).company_id === cleanCompId) ||
    (company?.id && (a as any).company_id === company.id) ||
    (currentUser.id && (a as any).company_id === currentUser.id) ||
    (a.job && (a.job.employer_id === currentUser.id || a.job.company_id === cleanCompId))
  );

  // Calculated strictly from real data
  const activeJobsCount = myJobs.filter(j => j.status === 'active').length;
  const receivedAppsCount = myApplications.length;
  const approvedAppsCount = myApplications.filter(a => a.status === 'Aprovada' || a.status === 'Contratada').length;
  const pendingAppsCount = myApplications.filter(a => a.status === 'Em análise' || a.status === 'Enviada' || a.status === 'Selecionada para exame' || a.status === 'Exame realizado').length;
  const storeProductsCount = myProducts.length;
  const myPostsCount = myPosts.length;

  // Real ratings data
  const [companyRatings, setCompanyRatings] = useState<CompanyRating[]>([]);
  const [ratingStats, setRatingStats] = useState({ average: 5.0, count: 0 });

  React.useEffect(() => {
    StoreService.getCompanyRatingsAsync(currentUser.id).then(ratings => {
      setCompanyRatings(ratings);
      const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
      setRatingStats({
        average: ratings.length > 0 ? Number((sum / ratings.length).toFixed(1)) : 5.0,
        count: ratings.length
      });
    });
  }, [currentUser.id]);
  
  const totalReviews = companyRatings.length;
  const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  companyRatings.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) {
      starCounts[r.rating as keyof typeof starCounts]++;
    }
  });

  const handlePublishBusinessPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;

    setPublishingPost(true);
    try {
      await StoreService.addPost({
        author_id: currentUser.id,
        author_type: 'employer',
        author_name: company?.name || companyName,
        author_avatar: company?.logo_url || logoUrl,
        company_id: company?.id,
        content: postContent.trim(),
        image_url: postImage || undefined,
        category: postCategory
      });

      setPostContent('');
      setPostImage('');
      onPostCreated();
      setSuccessMessage('Comunicado empresarial publicado no feed!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao publicar comunicado.');
    } finally {
      setPublishingPost(false);
    }
  };

  const handleToggleJobStatus = (job: Job) => {
    const nextStatus = job.status === 'active' ? 'closed' : 'active';
    StoreService.updateJob(job.id, { status: nextStatus });
    setSuccessMessage(nextStatus === 'closed' ? '✅ Vaga encerrada com sucesso!' : '✅ Vaga reativada com sucesso!');
    setTimeout(() => setSuccessMessage(''), 3000);
    onProfileUpdated(currentUser);
  };

  const handleDeleteJob = (jobId: string) => {
    setConfirmModal({
      title: 'Eliminar Vaga?',
      message: 'Tem a certeza de que deseja eliminar esta vaga de emprego? Os candidatos deixarão de ver este anúncio.',
      confirmText: 'Eliminar Vaga',
      onConfirm: () => {
        StoreService.deleteJob(jobId);
        setSuccessMessage('✅ Vaga eliminada com sucesso!');
        setTimeout(() => setSuccessMessage(''), 3000);
        onProfileUpdated(currentUser);
      }
    });
  };

  const openEditJob = (job: Job) => {
    setEditingJob(job);
    setEditJobTitle(job.title);
    setEditJobCategory(job.category);
    setEditJobMunicipality(job.municipality);
    setEditJobContractType(job.contract_type);
    setEditJobDescription(job.description);
    setEditJobStatus(job.status);
  };

  const handleSaveEditJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;

    StoreService.updateJob(editingJob.id, {
      title: editJobTitle,
      category: editJobCategory,
      municipality: editJobMunicipality,
      contract_type: editJobContractType,
      description: editJobDescription,
      status: editJobStatus
    });

    setEditingJob(null);
    onProfileUpdated(currentUser);
    setSuccessMessage('Vaga atualizada com sucesso!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleToggleProductStatus = (prod: MarketplaceProduct) => {
    const nextStatus = prod.status === 'available' ? 'sold' : 'available';
    StoreService.updateProduct(prod.id, {
      status: nextStatus,
      is_active: nextStatus === 'available'
    });
    onProductUpdated();
  };

  const handleDeleteProduct = (productId: string) => {
    setConfirmModal({
      title: 'Excluir Produto?',
      message: 'Tem a certeza de que deseja excluir permanentemente este produto do Marketplace?',
      confirmText: 'Excluir Produto',
      onConfirm: () => {
        StoreService.deleteProduct(productId);
        onProductUpdated();
      }
    });
  };

  const openEditProduct = (prod: MarketplaceProduct) => {
    setEditingProduct(prod);
    setEditProductTitle(prod.title);
    setEditProductPrice(prod.price);
    setEditProductCategory(prod.category);
    setEditProductMunicipality(prod.municipality);
    setEditProductDescription(prod.description);
    setEditProductPhone(prod.contact_phone);
    setEditProductImage(prod.image_url || '');
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    StoreService.updateProduct(editingProduct.id, {
      title: editProductTitle,
      price: editProductPrice,
      category: editProductCategory,
      municipality: editProductMunicipality,
      description: editProductDescription,
      contact_phone: editProductPhone,
      image_url: editProductImage || undefined
    });

    setEditingProduct(null);
    onProductUpdated();
    setSuccessMessage('Produto atualizado com sucesso!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleUpdateAppStatus = (appId: string, status: JobApplication['status']) => {
    StoreService.updateApplicationStatus(appId, status);
    setApplications(StoreService.getApplications());
    setSuccessMessage(`Estado da candidatura atualizado para "${status}".`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleSendWhatsAppResult = (app: JobApplication) => {
    const rawPhone = app.candidate?.whatsapp || app.candidate?.phone;
    if (!rawPhone || !rawPhone.trim()) {
      setErrorMessage('O candidato não possui número de contacto/WhatsApp registado.');
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }
    let cleaned = rawPhone.replace(/\D/g, '');
    if (!cleaned) {
      setErrorMessage('O número de telefone registado é inválido.');
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }
    if (!cleaned.startsWith('244') && cleaned.length === 9) {
      cleaned = '244' + cleaned;
    }
    const job = jobs.find(j => j.id === app.job_id) || app.job;
    const jobTitle = job?.title || 'Vaga';
    const candidateName = app.candidate?.full_name || 'Candidato';
    
    // Look up real exam attempt
    const allAttempts = StoreService.getExamAttempts();
    const attempt = app.exam_result || allAttempts.find(a => 
      a.candidate_id === app.candidate_id && 
      (a.job_id === app.job_id || a.application_id === app.id)
    );

    let examStatusText = 'Pendente / Não realizado';
    if (attempt) {
      examStatusText = attempt.passed 
        ? `APTO (Aprovado com ${attempt.percentage}%)` 
        : `NÃO APTO (${attempt.percentage}%)`;
    } else if (app.exam_score !== undefined) {
      examStatusText = app.exam_passed 
        ? `APTO (Aprovado com ${app.exam_score}%)` 
        : `NÃO APTO (${app.exam_score}%)`;
    }

    const message = `Olá ${candidateName}, informamos que o resultado da sua candidatura para a vaga de "${jobTitle}" no CuneneVagas foi processado.\n\n• Estado da Candidatura: ${app.status}\n• Resultado do Exame Técnico: ${examStatusText}\n\nPor favor confirme o recebimento desta mensagem no WhatsApp. Obrigado por utilizar a CuneneVagas.`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${cleaned}?text=${encoded}`, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 text-[#172033]">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-[#E6EAF0] shadow-xs overflow-hidden">
        <div className="h-40 sm:h-52 bg-gradient-to-r from-[#244F9A] to-[#193B70] relative">
          {company?.cover_url ? (
            <img src={company.cover_url} alt="Capa da Empresa" className="w-full h-full object-cover opacity-85" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20">
              <Building2 className="w-20 h-20" />
            </div>
          )}
        </div>

        <div className="px-6 pb-6 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-16 gap-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
              <div className="relative w-28 h-28 rounded-2xl bg-white p-1.5 shadow-md border-2 border-white overflow-hidden shrink-0">
                {company?.logo_url ? (
                  <img src={company.logo_url} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className="w-full h-full bg-[#244F9A] text-white rounded-xl flex items-center justify-center font-bold text-3xl">
                    {(company?.name || companyName).charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 bg-[#F5B91B]/20 text-amber-900 border border-[#F5B91B]/40 px-2.5 py-0.5 rounded-full text-xs font-bold mb-1">
                  <Building2 className="w-3.5 h-3.5 text-[#244F9A]" /> Empresa Verificada
                </div>
                <h1 className="text-2xl font-extrabold text-[#172033]">{company?.name || companyName}</h1>
                <p className="text-xs font-bold text-[#244F9A]">{company?.industry || industry}</p>
                <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#244F9A]" /> {company?.municipality || municipality}, Cunene
                  {company?.nif && <span>• NIF: {company.nif}</span>}
                </p>

                {/* Rating Badge & Partner */}
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200/80 px-2.5 py-0.5 rounded-full text-xs font-black">
                    <Star className="w-3.5 h-3.5 fill-[#F5B91B] text-[#F5B91B]" />
                    <span>{ratingStats.average.toFixed(1)} / 5.0</span>
                    <span className="text-amber-700 font-semibold text-[11px]">
                      ({totalReviews} avaliações)
                    </span>
                  </div>

                  {StoreService.isUserPartner(currentUser.id).isPartner && (
                    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-[#244F9A] to-[#193B70] text-[#F5B91B] border border-[#F5B91B]/40 px-2.5 py-0.5 rounded-full text-xs font-black shadow-2xs">
                      <Award className="w-3.5 h-3.5 text-[#F5B91B]" />
                      <span>🤝 {StoreService.isUserPartner(currentUser.id).partner?.partner_title || 'Parceiro Oficial'}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsFollowersModalOpen(true)}
                className="bg-blue-50 hover:bg-blue-100 text-[#244F9A] font-bold px-3.5 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 border border-blue-100 cursor-pointer shadow-2xs"
                title="Ver quem seguiu a minha empresa"
              >
                <Users className="w-4 h-4 text-[#F5B91B]" />
                <span>{followers.length} Seguidores</span>
              </button>
              <button
                onClick={() => setIsEditingProfile(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer border border-[#E6EAF0]"
              >
                <Edit3 className="w-4 h-4" />
                <span>Editar Empresa</span>
              </button>
              <button
                onClick={onOpenNewJob}
                className="bg-[#244F9A] hover:bg-[#193B70] text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Publicar Vaga</span>
              </button>
            </div>
          </div>

          {successMessage && (
            <div className="mt-4 bg-emerald-50 text-emerald-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 bg-red-50 text-red-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Tab selector */}
        <div className="flex border-t border-[#E6EAF0] px-6 text-xs font-bold overflow-x-auto bg-white">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-3.5 mr-6 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'dashboard' ? 'border-[#244F9A] text-[#244F9A]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Início
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`py-3.5 mr-6 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'jobs' ? 'border-[#244F9A] text-[#244F9A]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-4 h-4" /> Minhas Vagas ({myJobs.length})
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`py-3.5 mr-6 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'applications' ? 'border-[#244F9A] text-[#244F9A]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" /> Candidaturas ({receivedAppsCount})
          </button>
          <button
            onClick={() => setActiveTab('store')}
            className={`py-3.5 mr-6 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'store' ? 'border-[#244F9A] text-[#244F9A]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Loja ({myProducts.length})
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3.5 mr-6 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'profile' ? 'border-[#244F9A] text-[#244F9A]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Perfil
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-3.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'payments' ? 'border-[#244F9A] text-[#244F9A]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" /> Configurações
          </button>
        </div>
      </div>

      {/* Tab: Dashboard (Modernized to match user reference image precisely) */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Indicators / Metrics Cards - 4 Compact Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div 
              onClick={() => setActiveTab('jobs')}
              className="bg-white p-5 rounded-3xl border border-[#E6EAF0] shadow-2xs hover:border-[#244F9A] transition cursor-pointer flex justify-between items-center group"
            >
              <div>
                <span className="text-xs font-bold text-slate-400 block mb-1">Vagas publicadas</span>
                <span className="text-2xl font-black text-[#244F9A]">{activeJobsCount}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#244F9A] transition" />
            </div>

            <div 
              onClick={() => setActiveTab('applications')}
              className="bg-white p-5 rounded-3xl border border-[#E6EAF0] shadow-2xs hover:border-[#244F9A] transition cursor-pointer flex justify-between items-center group"
            >
              <div>
                <span className="text-xs font-bold text-slate-400 block mb-1">Candidaturas recebidas</span>
                <span className="text-2xl font-black text-[#244F9A]">{receivedAppsCount}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#244F9A] transition" />
            </div>

            <div 
              onClick={() => setActiveTab('applications')}
              className="bg-white p-5 rounded-3xl border border-[#E6EAF0] shadow-2xs hover:border-[#244F9A] transition cursor-pointer flex justify-between items-center group"
            >
              <div>
                <span className="text-xs font-bold text-slate-400 block mb-1">Aprovadas</span>
                <span className="text-2xl font-black text-emerald-600">{approvedAppsCount}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#244F9A] transition" />
            </div>

            <div 
              onClick={() => setActiveTab('applications')}
              className="bg-white p-5 rounded-3xl border border-[#E6EAF0] shadow-2xs hover:border-[#244F9A] transition cursor-pointer flex justify-between items-center group"
            >
              <div>
                <span className="text-xs font-bold text-slate-400 block mb-1">Em análise</span>
                <span className="text-2xl font-black text-amber-600">{pendingAppsCount}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#244F9A] transition" />
            </div>
          </div>

          {/* Desktop Two-Column Layout (Main Content + Star Rating Panel on Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left 2 Columns: Vagas Recentes, Recrute, Ações Rápidas */}
            <div className="lg:col-span-2 space-y-6">
              {/* Vagas Recentes */}
              <div className="bg-white p-6 rounded-3xl border border-[#E6EAF0] shadow-2xs space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-extrabold text-[#172033] flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#244F9A]" /> Vagas Recentes
                  </h3>
                  <button onClick={() => setActiveTab('jobs')} className="text-xs font-bold text-[#244F9A] hover:underline flex items-center gap-1 cursor-pointer">
                    Ver todas <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {myJobs.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <p className="text-xs text-slate-400">Nenhuma vaga publicada ainda.</p>
                    <button onClick={onOpenNewJob} className="bg-[#244F9A] text-white font-bold px-4 py-2 rounded-xl text-xs">
                      + Publicar Primeira Vaga
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myJobs.slice(0, 4).map(job => (
                      <div 
                        key={job.id} 
                        onClick={() => onSelectJob(job)}
                        className="p-3.5 rounded-2xl bg-slate-50/70 border border-[#E6EAF0] hover:border-[#244F9A] transition flex justify-between items-center cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#244F9A]/10 text-[#244F9A] flex items-center justify-center font-bold shrink-0">
                            <Briefcase className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[#172033] group-hover:text-[#244F9A] transition">{job.title}</h4>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <MapPin className="w-3 h-3 text-[#244F9A]" /> {job.municipality}, Cunene • <span className={`font-bold ${job.status === 'active' ? 'text-emerald-600' : 'text-slate-500'}`}>{job.status === 'active' ? 'Em aberto' : 'Encerrada'}</span>
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#244F9A] transition" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recruitment Promo Banner */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-amber-50/40 p-6 rounded-3xl border border-[#E6EAF0] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="text-sm font-black text-[#172033]">Recrute os melhores talentos</h4>
                  <p className="text-xs text-slate-600">Publique vagas e encontre profissionais qualificados para a sua empresa no Cunene.</p>
                </div>
                <button
                  onClick={onOpenNewJob}
                  className="bg-[#244F9A] hover:bg-[#193B70] text-white font-bold px-5 py-2.5 rounded-xl text-xs transition shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#F5B91B]" /> Publicar Nova Vaga
                </button>
              </div>

              {/* Ações Rápidas */}
              <div className="bg-white p-6 rounded-3xl border border-[#E6EAF0] shadow-2xs space-y-4">
                <h3 className="text-sm font-extrabold text-[#172033]">Ações Rápidas</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <button
                    onClick={onOpenNewJob}
                    className="p-4 bg-[#244F9A] hover:bg-[#193B70] text-white rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition cursor-pointer shadow-xs"
                  >
                    <Plus className="w-5 h-5 text-[#F5B91B]" />
                    <span className="text-xs font-bold">Publicar Vaga</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('jobs')}
                    className="p-4 bg-slate-50 hover:bg-slate-100 text-[#172033] border border-[#E6EAF0] rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition cursor-pointer"
                  >
                    <Briefcase className="w-5 h-5 text-[#244F9A]" />
                    <span className="text-xs font-bold">Gerir Vagas</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('applications')}
                    className="p-4 bg-slate-50 hover:bg-slate-100 text-[#172033] border border-[#E6EAF0] rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition cursor-pointer"
                  >
                    <Users className="w-5 h-5 text-[#244F9A]" />
                    <span className="text-xs font-bold">Ver Candidaturas</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('store')}
                    className="p-4 bg-slate-50 hover:bg-slate-100 text-[#172033] border border-[#E6EAF0] rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition cursor-pointer"
                  >
                    <ShoppingBag className="w-5 h-5 text-[#244F9A]" />
                    <span className="text-xs font-bold">Gerir Loja</span>
                  </button>

                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('open-notifications'))}
                    className="p-4 bg-slate-50 hover:bg-slate-100 text-[#172033] border border-[#E6EAF0] rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition cursor-pointer col-span-2 sm:col-span-1"
                  >
                    <Bell className="w-5 h-5 text-[#244F9A]" />
                    <span className="text-xs font-bold">Notificações</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right 1 Column: Painel de Avaliações por Estrelas (Mandatory Section) */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-[#E6EAF0] shadow-2xs space-y-5">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-extrabold text-[#172033] flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-[#F5B91B] text-[#F5B91B]" /> Avaliações da Empresa
                  </h3>
                  <span className="text-xs font-bold text-[#244F9A]">Ver todas</span>
                </div>

                {totalReviews === 0 ? (
                  <div className="text-center py-8 space-y-2 bg-slate-50 rounded-2xl p-4 border border-[#E6EAF0]">
                    <Star className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">Ainda não recebeste avaliações.</p>
                    <p className="text-[11px] text-slate-500">As avaliações dos candidatos e clientes aparecerão aqui assim que forem registadas.</p>
                  </div>
                ) : (
                  <>
                    {/* General Classification */}
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-black text-[#172033]">{ratingStats.average.toFixed(1)}</span>
                      <div>
                        <div className="flex items-center gap-1 text-[#F5B91B]">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star 
                              key={s} 
                              className={`w-4 h-4 ${s <= Math.round(ratingStats.average) ? 'fill-[#F5B91B]' : 'text-slate-300'}`} 
                            />
                          ))}
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-0.5">({totalReviews} avaliações)</span>
                      </div>
                    </div>

                    {/* Distribution Bars */}
                    <div className="space-y-1.5 pt-2 border-t border-[#E6EAF0]">
                      {[5, 4, 3, 2, 1].map(stars => {
                        const count = starCounts[stars as keyof typeof starCounts];
                        const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                        return (
                          <div key={stars} className="flex items-center gap-2 text-xs">
                            <span className="w-3 font-bold text-slate-600">{stars}</span>
                            <Star className="w-3.5 h-3.5 fill-[#F5B91B] text-[#F5B91B] shrink-0" />
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#F5B91B] rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-8 text-right text-[11px] text-slate-400 font-semibold">{Math.round(pct)}%</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Recent Reviews */}
                    <div className="pt-3 border-t border-[#E6EAF0] space-y-3">
                      <h4 className="text-xs font-bold text-slate-700">Avaliações Recentes</h4>
                      <div className="space-y-3">
                        {companyRatings.slice(0, 3).map((rev: CompanyRating) => (
                          <div key={rev.id} className="bg-slate-50 p-3 rounded-2xl border border-[#E6EAF0] space-y-1">
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-bold text-slate-900">{rev.user_name || 'Utilizador'}</span>
                              <div className="flex items-center gap-0.5 text-[#F5B91B]">
                                {[...Array(rev.rating)].map((_, i) => (
                                  <Star key={i} className="w-3 h-3 fill-[#F5B91B]" />
                                ))}
                              </div>
                            </div>
                            {rev.comment && (
                              <p className="text-[11px] text-slate-600 leading-relaxed">{rev.comment}</p>
                            )}
                            <span className="text-[10px] text-slate-400 block">
                              {new Date(rev.created_at).toLocaleDateString('pt-AO')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Dica Card */}
              <div className="bg-amber-50/60 p-5 rounded-3xl border border-amber-200/80 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <Star className="w-4 h-4 fill-[#F5B91B] text-[#F5B91B]" /> Dica
                </div>
                <p className="text-xs text-amber-900/80 leading-relaxed">
                  Mantenha o seu perfil atualizado com logótipo nítido, morada exata e descrição detalhada para aumentar a confiança dos candidatos.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Jobs Management */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-extrabold text-[#172033]">Gestão de Vagas da Empresa</h3>
              <p className="text-xs text-slate-500">Crie, edite, publique, encerre ou remova as suas ofertas de emprego</p>
            </div>
            <button
              onClick={onOpenNewJob}
              className="bg-[#244F9A] hover:bg-[#193B70] text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Nova Vaga
            </button>
          </div>

          {myJobs.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-[#E6EAF0] space-y-3">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Nenhuma vaga publicada ainda</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Crie a primeira vaga da sua empresa para receber candidaturas e recrutar profissionais no Cunene.
              </p>
              <button
                onClick={onOpenNewJob}
                className="bg-[#F5B91B] text-slate-900 font-bold px-5 py-2.5 rounded-xl text-xs shadow-sm inline-block cursor-pointer"
              >
                + Publicar Primeira Vaga
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myJobs.map(job => (
                <div key={job.id} className="bg-white p-4 rounded-3xl border border-[#E6EAF0] shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#172033]">{job.title}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        job.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {job.status === 'active' ? 'Publicada / Ativa' : 'Encerrada'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      📍 {job.municipality} • Categoria: {job.category} • {job.contract_type}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Publicada a {new Date(job.created_at).toLocaleDateString('pt-AO')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleToggleJobStatus(job)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        job.status === 'active' ? 'bg-amber-50 text-amber-800 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{job.status === 'active' ? 'Encerrar Vaga' : 'Reativar'}</span>
                    </button>
                    <button
                      onClick={() => openEditJob(job)}
                      className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-[#E6EAF0] cursor-pointer"
                      title="Editar vaga"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteJob(job.id)}
                      className="p-2 rounded-xl text-red-600 hover:bg-red-50 border border-red-100 cursor-pointer"
                      title="Excluir vaga"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onSelectJob(job)}
                      className="bg-[#244F9A] text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-[#193B70] cursor-pointer"
                    >
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Store ("Minha Loja") */}
      {activeTab === 'store' && (
        <div className="space-y-6">
          {(currentUser.company?.marketplace_unlocked || currentUser.marketplace_unlocked) ? (
            <div className="bg-emerald-900/90 text-white p-5 rounded-3xl border border-emerald-700/60 shadow-sm flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-black text-emerald-300 tracking-wider block">Plano Ilimitado Ativo</span>
                <h4 className="text-sm sm:text-base font-black">Vitrine Marketplace Ilimitada</h4>
                <p className="text-xs text-emerald-100/90 leading-relaxed">
                  A sua empresa tem licença ativa e pode publicar produtos e serviços sem restrição de quantidade.
                </p>
              </div>
              <span className="text-xs font-black bg-emerald-800 text-emerald-200 px-3 py-1.5 rounded-xl shrink-0">
                {myProducts.length} produtos ativos
              </span>
            </div>
          ) : (
            <div className={`p-5 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              myProducts.length >= 10 ? 'bg-slate-900 text-white border-slate-800' : 'bg-blue-50/80 text-slate-800 border-blue-200/80'
            }`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md ${
                    myProducts.length >= 10 ? 'bg-rose-500 text-white' : 'bg-[#244F9A] text-white'
                  }`}>
                    {myProducts.length >= 10 ? 'Limite Atingido' : 'Plano Gratuito'}
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    {myProducts.length} de 10 produtos gratuitos utilizados
                  </span>
                </div>
                <h4 className={`text-sm sm:text-base font-black ${myProducts.length >= 10 ? 'text-white' : 'text-[#172033]'}`}>
                  {myProducts.length >= 10 ? 'Atingiu o limite de 10 produtos' : `Pode publicar mais ${10 - myProducts.length} produtos gratuitamente`}
                </h4>
              </div>

              {myProducts.length >= 10 && (
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="bg-[#F5B91B] hover:bg-[#e5ae0a] text-slate-900 font-extrabold px-5 py-3 rounded-xl text-xs shadow-sm transition active:scale-95 shrink-0 cursor-pointer"
                >
                  Pagar no PayPal (Ilimitado)
                </button>
              )}
            </div>
          )}

          <PayPalPaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            currentUser={currentUser}
            onPaymentSuccess={(updatedUser: UserProfile) => {
              onProfileUpdated(updatedUser);
              setIsPaymentModalOpen(false);
            }}
          />

          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-extrabold text-[#172033]">Minha Loja & Meus Produtos</h3>
              <p className="text-xs text-slate-500">Faça a gestão dos produtos e serviços exibidos na sua vitrine</p>
            </div>
            <button
              onClick={() => {
                const isUnlocked = Boolean(currentUser.company?.marketplace_unlocked || currentUser.marketplace_unlocked);
                if (myProducts.length >= 10 && !isUnlocked) {
                  setIsPaymentModalOpen(true);
                } else {
                  onOpenNewProduct();
                }
              }}
              className="bg-[#244F9A] hover:bg-[#193B70] text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" /> 
              <span>Adicionar Produto</span>
            </button>
          </div>

          {myProducts.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-[#E6EAF0] space-y-3">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">A sua loja ainda não tem produtos</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Adicione produtos agrícolas, materiais de construção, tecnologia ou serviços para compradores no Cunene.
              </p>
              <button
                onClick={onOpenNewProduct}
                className="bg-[#F5B91B] text-slate-900 font-bold px-5 py-2 rounded-xl text-xs shadow-sm inline-block cursor-pointer"
              >
                + Adicionar Primeiro Produto
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {myProducts.map(prod => (
                <div key={prod.id} className="bg-white rounded-3xl border border-[#E6EAF0] overflow-hidden shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="h-36 bg-slate-100 overflow-hidden relative">
                      {prod.image_url ? (
                        <img src={prod.image_url} alt={prod.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ShoppingBag className="w-10 h-10" />
                        </div>
                      )}
                      <span className={`absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        prod.status === 'available' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-white'
                      }`}>
                        {prod.status === 'available' ? 'Disponível' : 'Esgotado'}
                      </span>
                    </div>

                    <div className="p-4 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{prod.category}</span>
                      <h4 className="text-sm font-bold text-[#172033] line-clamp-1">{prod.title}</h4>
                      <p className="text-xs font-black text-[#244F9A]">{prod.price.toLocaleString()} {prod.currency || 'AOA'}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{prod.description}</p>
                    </div>
                  </div>

                  <div className="p-4 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleToggleProductStatus(prod)}
                      className="text-[11px] font-bold text-slate-600 hover:text-slate-900 py-1 cursor-pointer"
                    >
                      {prod.status === 'available' ? 'Marcar Esgotado' : 'Marcar Disponível'}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditProduct(prod)}
                        className="text-slate-500 hover:text-slate-900 p-1.5 rounded-lg cursor-pointer"
                        title="Editar produto"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded-lg cursor-pointer"
                        title="Excluir produto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Applications / Candidaturas */}
      {activeTab === 'applications' && (() => {
        const filteredCandidates = myApplications.filter(app => {
          const job = jobs.find(j => j.id === app.job_id);
          const candName = (app.candidate?.full_name || '').toLowerCase();
          const candProf = (app.candidate?.profession || '').toLowerCase();
          const jobTitle = (job?.title || '').toLowerCase();
          const query = candidateSearchQuery.toLowerCase();

          const matchesSearch = !query || candName.includes(query) || candProf.includes(query) || jobTitle.includes(query);
          const matchesStatus = candidateStatusFilter === 'all' || app.status === candidateStatusFilter;

          return matchesSearch && matchesStatus;
        });

        return (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-[#172033]">Candidaturas Recebidas</h3>
                <p className="text-xs text-slate-500">Avalie os profissionais que se candidataram às vagas da sua empresa</p>
              </div>
              <button
                onClick={async () => {
                  setLoadingApplications(true);
                  setApplicationsError(null);
                  try {
                    const apps = await StoreService.fetchApplications(currentUser);
                    setApplications(apps || []);
                    setSuccessMessage('Candidaturas consultadas e atualizadas com sucesso.');
                    setTimeout(() => setSuccessMessage(''), 3000);
                  } catch (err) {
                    setApplicationsError('Não foi possível atualizar as candidaturas. Tente novamente.');
                    setTimeout(() => setApplicationsError(null), 4000);
                  } finally {
                    setLoadingApplications(false);
                  }
                }}
                disabled={loadingApplications}
                className="flex items-center gap-1.5 bg-[#244F9A] text-white hover:bg-[#193B70] px-4 py-2.5 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingApplications ? 'animate-spin' : ''}`} />
                <span>{loadingApplications ? 'A consultar...' : 'Consultar candidaturas'}</span>
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Pesquisar candidato..."
                    value={candidateSearchQuery}
                    onChange={e => setCandidateSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-2 bg-white rounded-xl border border-[#E6EAF0] text-xs focus:outline-none focus:ring-2 focus:ring-[#244F9A]"
                  />
                </div>

                <select
                  value={candidateStatusFilter}
                  onChange={e => setCandidateStatusFilter(e.target.value)}
                  className="bg-white px-3 py-2 rounded-xl border border-[#E6EAF0] text-xs font-semibold"
                >
                  <option value="all">Todos os Estados</option>
                  <option value="Em análise">Em Análise</option>
                  <option value="Aprovada">Aprovados</option>
                  <option value="Rejeitada">Rejeitados</option>
                </select>
              </div>
            </div>

            {loadingApplications ? (
              <div className="bg-white p-12 text-center rounded-3xl border border-[#E6EAF0] space-y-3">
                <div className="w-8 h-8 border-4 border-[#244F9A] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-500">A carregar candidaturas do servidor...</p>
              </div>
            ) : applicationsError ? (
              <div className="bg-rose-50 text-rose-700 p-6 rounded-3xl border border-rose-200 text-center space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto" />
                <p className="text-xs font-bold">{applicationsError}</p>
                <button 
                  onClick={() => {
                    setLoadingApplications(true);
                    setApplicationsError(null);
                    StoreService.fetchApplications(currentUser).then(apps => setApplications(apps || [])).catch(() => setApplicationsError('Falha ao consultar.')).finally(() => setLoadingApplications(false));
                  }}
                  className="bg-rose-600 text-white font-bold px-4 py-1.5 rounded-xl text-xs mt-2 cursor-pointer"
                >
                  Tentar Novamente
                </button>
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-3xl border border-[#E6EAF0] space-y-3">
                <Users className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">Nenhuma candidatura encontrada</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Assim que profissionais se candidatarem às suas vagas publicadas, eles aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCandidates.map(app => {
                  const job = jobs.find(j => j.id === app.job_id) || app.job;
                  const candidateName = app.candidate?.full_name || 'Candidato';
                  const candidateProfession = app.candidate?.profession || 'Profissional';
                  const candidateMunicipality = app.candidate?.municipality || 'Cunene';

                  const allAttempts = StoreService.getExamAttempts();
                  const attempt = app.exam_result || allAttempts.find(a => 
                    a.candidate_id === app.candidate_id && 
                    (a.job_id === app.job_id || a.application_id === app.id)
                  );

                  return (
                    <div key={app.id} className="bg-white p-5 rounded-3xl border border-[#E6EAF0] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-[#244F9A] text-white flex items-center justify-center font-bold text-lg shrink-0">
                          {candidateName.charAt(0)}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-[#172033]">{candidateName}</h4>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              app.status === 'Aprovada' || app.status === 'Contratada' ? 'bg-emerald-100 text-emerald-800' :
                              app.status === 'Rejeitada' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {app.status || 'Em análise'}
                            </span>
                            {attempt ? (
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                                attempt.passed ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}>
                                Exame: {attempt.passed ? 'Apto' : 'Não Apto'} ({attempt.percentage}%)
                              </span>
                            ) : app.exam_score !== undefined ? (
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                                app.exam_passed ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}>
                                Exame: {app.exam_passed ? 'Apto' : 'Não Apto'} ({app.exam_score}%)
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs font-semibold text-[#244F9A]">{candidateProfession} • Vaga: {job?.title || 'Vaga'}</p>
                          <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500">
                            <span>📍 {candidateMunicipality}</span>
                            <span>•</span>
                            <span>Candidatura em {new Date(app.created_at).toLocaleDateString('pt-AO')}</span>
                            {attempt && (
                              <>
                                <span>•</span>
                                <span className="text-slate-600 font-semibold">Exame a {new Date(attempt.created_at).toLocaleDateString('pt-AO')}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <button
                          onClick={() => setSelectedCandidateApp(app)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3.5 py-2 rounded-xl text-xs transition cursor-pointer"
                        >
                          Ver Perfil / CV
                        </button>
                        <button
                          onClick={() => handleSendWhatsAppResult(app)}
                          className="bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold px-3 py-2 rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                          title="Enviar resultado por WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-white" />
                          <span>WhatsApp</span>
                        </button>
                        <button
                          onClick={() => handleUpdateAppStatus(app.id, 'Aprovada')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs transition cursor-pointer"
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => handleUpdateAppStatus(app.id, 'Rejeitada')}
                          className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold px-3 py-2 rounded-xl text-xs transition cursor-pointer"
                        >
                          Rejeitar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Tab: Profile & Company Settings */}
      {activeTab === 'profile' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E6EAF0] shadow-2xs space-y-6">
          <div className="flex justify-between items-center border-b border-[#E6EAF0] pb-4">
            <div>
              <h3 className="text-base font-extrabold text-[#172033]">Perfil Público e Informações da Empresa</h3>
              <p className="text-xs text-slate-500">Estes dados são estritamente empresariais e visíveis no diretório de empresas</p>
            </div>
            <button
              onClick={() => setIsEditingProfile(true)}
              className="bg-[#244F9A] text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-[#193B70] cursor-pointer"
            >
              Editar Dados
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <div>
                <span className="font-bold text-slate-400 block mb-0.5">Nome da Empresa</span>
                <span className="text-slate-900 text-sm font-extrabold">{company?.name || companyName}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block mb-0.5">Setor de Atividade</span>
                <span className="text-slate-800 font-semibold">{company?.industry || industry}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block mb-0.5">Município</span>
                <span className="text-slate-800">{company?.municipality || municipality}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block mb-0.5">Endereço / Localização</span>
                <span className="text-slate-800">{company?.address || address || 'Não informado'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block mb-0.5">NIF (Número de Identificação Fiscal)</span>
                <span className="text-slate-800 font-mono">{company?.nif || nif || 'Não informado'}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="font-bold text-slate-400 block mb-0.5">Telefone Comercial</span>
                <span className="text-slate-800">{company?.phone || phone || 'Não informado'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block mb-0.5">WhatsApp para Contato</span>
                <span className="text-slate-800">{company?.whatsapp || whatsapp || 'Não informado'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block mb-0.5">Email Comercial</span>
                <span className="text-slate-800">{company?.email || email || 'Não informado'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block mb-0.5">Website</span>
                <span className="text-slate-800">{company?.website || website || 'Não informado'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block mb-0.5">Descrição / Slogan</span>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-xl leading-relaxed">
                  {company?.description || bio || 'Nenhuma descrição fornecida.'}
                </p>
              </div>
            </div>
          </div>

          {/* Exibição da Foto do Perfil da Empresa na Parte Inferior da Aba Perfil */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 text-center space-y-4 mt-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Logotipo / Foto Oficial da Empresa</h4>
            <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-2xl ring-4 ring-[#244F9A]/20 overflow-hidden bg-white shadow-md">
              {company?.logo_url || logoUrl || currentUser.company_logo || currentUser.avatar_url ? (
                <img 
                  src={company?.logo_url || logoUrl || currentUser.company_logo || currentUser.avatar_url} 
                  alt={company?.name || companyName} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <div className="w-full h-full bg-[#193B70] text-white flex items-center justify-center font-black text-3xl">
                  {(company?.name || companyName)?.charAt(0).toUpperCase() || 'E'}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-base font-black text-[#172033]">{company?.name || companyName}</p>
              <p className="text-xs font-semibold text-[#244F9A]">{company?.industry || industry}</p>
              <p className="text-xs text-slate-500">{company?.municipality || municipality}, Cunene · NIF: {company?.nif || nif || '000000000'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Payments / Configurações de Pagamento */}
      {activeTab === 'payments' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E6EAF0] shadow-2xs space-y-6">
          <div className="flex justify-between items-center border-b border-[#E6EAF0] pb-4">
            <div>
              <h3 className="text-base font-extrabold text-[#172033]">Transações e Pagamentos via PayPal</h3>
              <p className="text-xs text-slate-500">Histórico de subscrições e pagamentos efetuados pela empresa</p>
            </div>
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="bg-[#F5B91B] text-slate-900 font-extrabold px-4 py-2 rounded-xl text-xs hover:bg-[#e5ae0a] cursor-pointer"
            >
              Ativar Plano Ilimitado PayPal
            </button>
          </div>

          {loadingPayments ? (
            <p className="text-xs text-slate-400 text-center py-8">A carregar transações...</p>
          ) : payments.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <CreditCard className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Nenhum pagamento registado</h4>
              <p className="text-xs text-slate-500">As faturas e pagamentos efetuados via PayPal aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map(p => (
                <div key={p.id} className="p-4 rounded-2xl bg-slate-50 border border-[#E6EAF0] flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{p.description || 'Subscrição Marketplace'}</span>
                    <span className="text-[10px] text-slate-400">ID: {p.id} • {new Date(p.created_at).toLocaleString('pt-AO')}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-[#244F9A] block">{p.amount} {p.currency || 'USD'}</span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Concluído</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Company Profile Modal */}
      {isEditingProfile && (
        <EditarPerfilEmpresa
          currentUser={currentUser}
          isOpen={isEditingProfile}
          onClose={() => setIsEditingProfile(false)}
          onProfileUpdated={(updatedUser: UserProfile) => {
            onProfileUpdated(updatedUser);
            setIsEditingProfile(false);
            setSuccessMessage('Perfil empresarial atualizado com sucesso!');
            setTimeout(() => setSuccessMessage(''), 3000);
          }}
        />
      )}

      {/* Edit Job Modal */}
      {editingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 my-6">
            <div className="bg-[#244F9A] p-4 text-white flex justify-between items-center">
              <h3 className="text-base font-bold">Editar Vaga de Emprego</h3>
              <button onClick={() => setEditingJob(null)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditJob} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Título da Vaga</label>
                <input
                  type="text"
                  required
                  value={editJobTitle}
                  onChange={e => setEditJobTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoria</label>
                  <select
                    value={editJobCategory}
                    onChange={e => setEditJobCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {JOB_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Município</label>
                  <select
                    value={editJobMunicipality}
                    onChange={e => setEditJobMunicipality(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {CUNENE_MUNICIPALITIES.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Contrato</label>
                  <select
                    value={editJobContractType}
                    onChange={e => setEditJobContractType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="Tempo Inteiro">Tempo Inteiro</option>
                    <option value="Meio Tempo">Meio Tempo</option>
                    <option value="Estágio">Estágio</option>
                    <option value="Contrato">Contrato</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estado</label>
                  <select
                    value={editJobStatus}
                    onChange={e => setEditJobStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="active">Ativa</option>
                    <option value="closed">Encerrada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descrição da Vaga</label>
                <textarea
                  rows={4}
                  required
                  value={editJobDescription}
                  onChange={e => setEditJobDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingJob(null)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#244F9A] text-white px-5 py-2 rounded-xl font-bold hover:bg-[#193B70] cursor-pointer"
                >
                  Guardar Vaga
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 my-6">
            <div className="bg-[#244F9A] p-4 text-white flex justify-between items-center">
              <h3 className="text-base font-bold">Editar Produto</h3>
              <button onClick={() => setEditingProduct(null)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Produto</label>
                <input
                  type="text"
                  required
                  value={editProductTitle}
                  onChange={e => setEditProductTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Preço (AOA)</label>
                  <input
                    type="number"
                    required
                    value={editProductPrice}
                    onChange={e => setEditProductPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoria</label>
                  <select
                    value={editProductCategory}
                    onChange={e => setEditProductCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="Agricultura">Agricultura</option>
                    <option value="Serviços">Serviços</option>
                    <option value="Veículos">Veículos</option>
                    <option value="Tecnologia">Tecnologia</option>
                    <option value="Imóveis">Imóveis</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Município</label>
                  <select
                    value={editProductMunicipality}
                    onChange={e => setEditProductMunicipality(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {CUNENE_MUNICIPALITIES.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={editProductPhone}
                    onChange={e => setEditProductPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descrição</label>
                <textarea
                  rows={3}
                  required
                  value={editProductDescription}
                  onChange={e => setEditProductDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <ImageUploader
                context="product-image"
                currentImageUrl={editProductImage}
                onUploadSuccess={url => setEditProductImage(url)}
                onRemove={() => setEditProductImage('')}
                label="Fotografia do Produto"
              />

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#244F9A] text-white px-5 py-2 rounded-xl font-bold hover:bg-[#193B70] cursor-pointer"
                >
                  Guardar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidate Consultation Modal */}
      {selectedCandidateApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 my-6">
            <div className="bg-[#244F9A] p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold">Perfil do Candidato</h3>
                <p className="text-xs text-slate-200">Detalhes da candidatura recebida</p>
              </div>
              <button onClick={() => setSelectedCandidateApp(null)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="flex items-center gap-3 border-b pb-4 border-slate-100">
                <div className="w-12 h-12 rounded-full bg-[#244F9A] text-white flex items-center justify-center font-bold text-base">
                  {selectedCandidateApp.candidate?.full_name.charAt(0) || 'C'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{selectedCandidateApp.candidate?.full_name}</h4>
                  <p className="text-slate-500">{selectedCandidateApp.candidate?.profession || 'Profissional no Cunene'}</p>
                  <p className="text-slate-400">📍 {selectedCandidateApp.candidate?.municipality || 'Cunene'}</p>
                </div>
              </div>

              {selectedCandidateApp.candidate?.bio && (
                <div>
                  <span className="font-bold text-slate-500 block mb-1">Resumo:</span>
                  <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl">
                    {selectedCandidateApp.candidate.bio}
                  </p>
                </div>
              )}

              {selectedCandidateApp.cover_letter && (
                <div>
                  <span className="font-bold text-slate-500 block mb-1">Carta de Apresentação:</span>
                  <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl">
                    {selectedCandidateApp.cover_letter}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="font-bold text-slate-400 block">Email:</span>
                  <span className="text-slate-800">{selectedCandidateApp.candidate?.email}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block">Telefone:</span>
                  <span className="text-slate-800">{selectedCandidateApp.candidate?.phone || 'Não informado'}</span>
                </div>
              </div>

              {selectedCandidateApp.cv_url && (
                <button
                  onClick={() => setViewingMedia([{ url: selectedCandidateApp.cv_url!, type: 'image', alt: 'Currículo Vitae' }])}
                  className="w-full bg-[#244F9A] text-white font-bold py-2.5 rounded-xl text-center flex items-center justify-center gap-1.5 hover:bg-[#193B70] cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Ver Currículo em Tela Cheia</span>
                </button>
              )}

              {/* Exam Result Details */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-extrabold text-slate-800 block">Resultado do Exame Técnico:</span>
                {candidateExamAttempt ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-600 font-semibold">Nota: {candidateExamAttempt.percentage}% ({candidateExamAttempt.score}/{candidateExamAttempt.total_points} pts)</p>
                      <p className="text-[10px] text-slate-400">Realizado a {new Date(candidateExamAttempt.created_at).toLocaleDateString('pt-AO')}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${
                      candidateExamAttempt.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {candidateExamAttempt.passed ? 'Apto' : 'Não Apto'}
                    </span>
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-[11px]">Nenhum exame técnico registado para esta candidatura.</p>
                )}
              </div>

              {/* WhatsApp Action Button */}
              <button
                onClick={() => {
                  const rawPhone = selectedCandidateApp.candidate?.whatsapp || selectedCandidateApp.candidate?.phone;
                  if (!rawPhone) {
                    alert('O candidato não possui número de contacto/WhatsApp registado.');
                    return;
                  }
                  let cleaned = rawPhone.replace(/\D/g, '');
                  if (!cleaned.startsWith('244') && cleaned.length === 9) {
                    cleaned = '244' + cleaned;
                  }
                  const job = jobs.find(j => j.id === selectedCandidateApp.job_id);
                  const jobTitle = job?.title || 'Vaga';
                  const examStatusText = candidateExamAttempt 
                    ? (candidateExamAttempt.passed ? `APTO (Aprovado com ${candidateExamAttempt.percentage}%)` : `NÃO APTO (${candidateExamAttempt.percentage}%)`)
                    : 'Pendente / Não realizado';

                  const message = `Olá ${selectedCandidateApp.candidate?.full_name || 'Candidato'}, informamos que o resultado da sua candidatura para a vaga de "${jobTitle}" na CuneneVagas foi processado.\n\nEstado da Candidatura: ${selectedCandidateApp.status}\nResultado do Exame: ${examStatusText}\n\nObrigado por usar a CuneneVagas.`;
                  const encoded = encodeURIComponent(message);
                  window.open(`https://wa.me/${cleaned}?text=${encoded}`, '_blank');
                }}
                className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold py-2.5 rounded-xl text-center flex items-center justify-center gap-2 cursor-pointer shadow-sm transition"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Enviar Resultado por WhatsApp</span>
              </button>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedCandidateApp(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingMedia && (
        <MediaViewer
          media={viewingMedia}
          onClose={() => setViewingMedia(null)}
        />
      )}

      <FollowersModal
        isOpen={isFollowersModalOpen}
        onClose={() => setIsFollowersModalOpen(false)}
        title={`Seguidores de ${company?.name || currentUser.company_name || 'Empresa'}`}
        followers={followers}
      />

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn select-none">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-slate-200 text-center">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
              <Trash2 className="w-7 h-7 text-rose-600" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-black text-slate-950">
                {confirmModal.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed px-1">
                {confirmModal.message}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  const cb = confirmModal.onConfirm;
                  setConfirmModal(null);
                  if (cb) cb();
                }}
                className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs sm:text-sm rounded-xl transition shadow-md cursor-pointer"
              >
                {confirmModal.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
