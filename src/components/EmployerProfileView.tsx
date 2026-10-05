import React, { useState } from 'react';
import { Building2, MapPin, Phone, Mail, Globe, MessageCircle, Briefcase, ShoppingBag, Plus, Edit3, Trash2, Camera, Users, FileText, CheckCircle2, AlertCircle, X, Power, Award, CreditCard } from 'lucide-react';
import { UserProfile, Job, MarketplaceProduct, CommunityPost, JobApplication, CUNENE_MUNICIPALITIES, JOB_CATEGORIES } from '../lib/types';
import { StoreService } from '../lib/store';
import { uploadToCloudinary } from '../lib/cloudinary';
import { ImageUploader } from './ImageUploader';
import { PayPalPaymentModal } from './PayPalPaymentModal';

interface EmployerProfileViewProps {
  currentUser: UserProfile;
  jobs: Job[];
  products: MarketplaceProduct[];
  posts: CommunityPost[];
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
  onOpenNewJob,
  onOpenNewProduct,
  onProfileUpdated,
  onProductUpdated,
  onPostCreated,
  onSelectJob
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'store' | 'profile' | 'applications' | 'jobs' | 'payments'>('dashboard');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
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
  const [bio, setBio] = useState(company?.description || currentUser.bio || '');
  const [servicesText, setServicesText] = useState((company?.services || currentUser.services || []).join(', '));
  const [logoUrl, setLogoUrl] = useState(company?.logo_url || currentUser.company_logo || currentUser.avatar_url || '');
  const [coverUrl, setCoverUrl] = useState(company?.cover_url || currentUser.cover_url || '');
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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

  // Applications
  const [applications, setApplications] = useState<JobApplication[]>(() => StoreService.getApplications());
  
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

  // Strictly filter real data belonging to this company (not candidate)
  const myJobs = jobs.filter(j => j.employer_id === currentUser.id);
  const myProducts = products.filter(p => p.seller_id === currentUser.id || p.company_id === company?.id);
  const myPosts = posts.filter(p =>
    (p.author_id === currentUser.id ||
     (company?.id && p.company_id === company.id) ||
     (currentUser.company_name && p.author_name?.toLowerCase() === currentUser.company_name.toLowerCase()) ||
     p.author_name?.toLowerCase() === (company?.name || '').toLowerCase()) &&
    (p.author_type === 'employer' || (p as any).post_type === 'employer')
  );
  const myJobIds = myJobs.map(j => j.id);
  const myApplications = applications.filter(a => myJobIds.includes(a.job_id));

  // Calculated strictly from real data
  const activeJobsCount = myJobs.filter(j => j.status === 'active').length;
  const receivedAppsCount = myApplications.length;
  const storeProductsCount = myProducts.length;
  const myPostsCount = myPosts.length;

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErrorMessage('');
    try {
      const url = await uploadToCloudinary(file);
      if (url.startsWith('blob:') || url.startsWith('data:')) {
        throw new Error('Não foi possível carregar a imagem. Tente novamente.');
      }
      setCoverUrl(url);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao carregar imagem de capa.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const services = servicesText.split(',').map(s => s.trim()).filter(Boolean);

      // Call updateCompanyProfile — strictly saves company profile without modifying candidate's name, avatar or bio!
      const updatedCompany = StoreService.updateCompanyProfile(currentUser.id, {
        name: companyName,
        logo_url: logoUrl || undefined,
        cover_url: coverUrl || undefined,
        industry,
        municipality,
        address,
        phone,
        whatsapp,
        email,
        website,
        nif,
        description: bio,
        services
      });

      const updatedUser = StoreService.getCurrentUser();
      if (updatedUser) {
        onProfileUpdated(updatedUser);
      }
      setIsEditingProfile(false);
      setSuccessMessage('Perfil da empresa atualizado com sucesso! (O perfil de candidato permaneceu intacto)');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao guardar perfil da empresa.');
    } finally {
      setSavingProfile(false);
    }
  };

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

  // Job actions
  const handleToggleJobStatus = (job: Job) => {
    const nextStatus = job.status === 'active' ? 'closed' : 'active';
    StoreService.updateJob(job.id, { status: nextStatus });
    onProfileUpdated(currentUser);
  };

  const handleDeleteJob = (jobId: string) => {
    if (window.confirm('Tem a certeza que deseja eliminar esta vaga?')) {
      StoreService.deleteJob(jobId);
      onProfileUpdated(currentUser);
    }
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

  // Product actions
  const handleToggleProductStatus = (prod: MarketplaceProduct) => {
    const nextStatus = prod.status === 'available' ? 'sold' : 'available';
    StoreService.updateProduct(prod.id, {
      status: nextStatus,
      is_active: nextStatus === 'available'
    });
    onProductUpdated();
  };

  const handleDeleteProduct = (productId: string) => {
    if (window.confirm('Excluir este produto da loja?')) {
      StoreService.deleteProduct(productId);
      onProductUpdated();
    }
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

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="h-36 sm:h-48 bg-gradient-to-r from-[#0F4C9C] to-slate-900 relative">
          {company?.cover_url ? (
            <img src={company.cover_url} alt="Capa da Empresa" className="w-full h-full object-cover opacity-80" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20">
              <Building2 className="w-20 h-20" />
            </div>
          )}
        </div>

        <div className="px-6 pb-6 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-16 gap-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
              <div className="relative w-28 h-28 rounded-2xl bg-white p-1.5 shadow-lg border-2 border-white overflow-hidden shrink-0">
                {company?.logo_url ? (
                  <img src={company.logo_url} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className="w-full h-full bg-[#0F4C9C] text-white rounded-xl flex items-center justify-center font-bold text-3xl">
                    {(company?.name || companyName).charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 bg-[#FFC20E]/20 text-amber-900 border border-[#FFC20E]/40 px-2.5 py-0.5 rounded-full text-xs font-bold mb-1">
                  <Building2 className="w-3.5 h-3.5 text-[#0F4C9C]" /> Modo Empresa Oficial
                </div>
                <h1 className="text-2xl font-extrabold text-slate-900">{company?.name || companyName}</h1>
                <p className="text-xs font-bold text-[#0F4C9C]">{company?.industry || industry}</p>
                <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#0F4C9C]" /> {company?.municipality || municipality}, Cunene
                  {company?.nif && <span>• NIF: {company.nif}</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditingProfile(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" />
                <span>Editar Perfil Empresa</span>
              </button>
              <button
                onClick={onOpenNewJob}
                className="bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Publicar Vaga</span>
              </button>
            </div>
          </div>

          {successMessage && (
            <div className="mt-4 bg-emerald-50 text-emerald-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 bg-red-50 text-red-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Tab selector */}
        <div className="flex border-t border-slate-200 px-6 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-3.5 mr-6 border-b-2 transition whitespace-nowrap ${
              activeTab === 'dashboard' ? 'border-[#0F4C9C] text-[#0F4C9C]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Painel da Empresa
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`py-3.5 mr-6 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'jobs' ? 'border-[#0F4C9C] text-[#0F4C9C]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-4 h-4" /> Minhas Vagas ({myJobs.length})
          </button>
          <button
            onClick={() => setActiveTab('store')}
            className={`py-3.5 mr-6 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'store' ? 'border-[#0F4C9C] text-[#0F4C9C]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Minha Loja ({myProducts.length})
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`py-3.5 mr-6 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'applications' ? 'border-[#0F4C9C] text-[#0F4C9C]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" /> Candidaturas Recebidas ({myApplications.length})
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3.5 mr-6 border-b-2 transition whitespace-nowrap ${
              activeTab === 'profile' ? 'border-[#0F4C9C] text-[#0F4C9C]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Perfil Público & Serviços
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-3.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'payments' ? 'border-[#0F4C9C] text-[#0F4C9C]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" /> Pagamentos
          </button>
        </div>
      </div>

      {/* Tab: Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Real Metrics Cards - 100% Calculated strictly from data */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-400 block mb-1">Vagas Ativas</span>
              <span className="text-2xl font-black text-[#0F4C9C]">{activeJobsCount}</span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-400 block mb-1">Candidaturas</span>
              <span className="text-2xl font-black text-[#0F4C9C]">{receivedAppsCount}</span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-400 block mb-1">Produtos na Loja</span>
              <span className="text-2xl font-black text-[#0F4C9C]">{storeProductsCount}</span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-400 block mb-1">Publicações da Empresa</span>
              <span className="text-2xl font-black text-slate-700">{myPostsCount}</span>
            </div>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="bg-slate-100 p-4 rounded-3xl flex flex-wrap gap-2 items-center">
            <button
              onClick={onOpenNewJob}
              className="bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Publicar Vaga
            </button>
            <button
              onClick={onOpenNewProduct}
              className="bg-[#FFC20E] hover:bg-[#e5ae0a] text-slate-900 font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Adicionar Produto
            </button>
          </div>

          {/* Create Business Post / Comunicado Empresarial */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-slate-800">Publicar Comunicado ou Novidade da Empresa</h4>
            <form onSubmit={handlePublishBusinessPost} className="space-y-3">
              <textarea
                rows={3}
                required
                value={postContent}
                onChange={e => setPostContent(e.target.value)}
                placeholder="Partilhe novidades, oportunidades de contratação, produtos ou serviços da empresa no Cunene..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C9C]"
              />

              <div className="flex flex-wrap justify-between items-center gap-2">
                <select
                  value={postCategory}
                  onChange={e => setPostCategory(e.target.value as any)}
                  className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold border-none"
                >
                  <option value="Empresas">Novidade Empresarial</option>
                  <option value="Emprego">Oportunidade de Trabalho</option>
                  <option value="Negócios">Parceria Comercial</option>
                  <option value="Marketplace">Oferta de Produto</option>
                </select>

                <button
                  type="submit"
                  disabled={publishingPost || !postContent.trim()}
                  className="bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm disabled:opacity-50"
                >
                  {publishingPost ? 'A publicar...' : 'Publicar Comunicado'}
                </button>
              </div>
            </form>
          </div>

          {/* Recent Jobs Preview */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Vagas Recentes da Empresa</h3>
              <button onClick={() => setActiveTab('jobs')} className="text-xs font-bold text-[#0F4C9C] hover:underline">
                Ver todas ({myJobs.length})
              </button>
            </div>

            {myJobs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Nenhuma vaga publicada ainda.</p>
            ) : (
              <div className="space-y-2">
                {myJobs.slice(0, 3).map(job => (
                  <div key={job.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{job.title}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {job.municipality} • {job.contract_type} • Estado:{' '}
                        <span className={`font-bold ${job.status === 'active' ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {job.status === 'active' ? 'Ativa' : 'Encerrada'}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditJob(job)}
                        className="text-xs text-slate-600 hover:text-slate-900 bg-white p-1.5 rounded-lg border border-slate-200"
                        title="Editar vaga"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onSelectJob(job)}
                        className="text-xs font-bold text-[#0F4C9C] bg-white px-3 py-1.5 rounded-xl border border-slate-200 hover:border-[#0F4C9C]"
                      >
                        Ver Detalhes
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Jobs Management */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Gestão de Vagas da Empresa</h3>
              <p className="text-xs text-slate-500">Crie, edite, publique, encerre ou remova as suas ofertas de emprego</p>
            </div>
            <button
              onClick={onOpenNewJob}
              className="bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nova Vaga
            </button>
          </div>

          {myJobs.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 space-y-3">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Nenhuma vaga publicada ainda</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Crie a primeira vaga da sua empresa para receber candidaturas e recrutar profissionais no Cunene.
              </p>
              <button
                onClick={onOpenNewJob}
                className="bg-[#FFC20E] text-slate-900 font-bold px-5 py-2.5 rounded-xl text-xs shadow-sm inline-block"
              >
                + Publicar Primeira Vaga
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myJobs.map(job => (
                <div key={job.id} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{job.title}</h4>
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
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        job.status === 'active' ? 'bg-amber-50 text-amber-800 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{job.status === 'active' ? 'Encerrar Vaga' : 'Reativar'}</span>
                    </button>
                    <button
                      onClick={() => openEditJob(job)}
                      className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200"
                      title="Editar vaga"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteJob(job.id)}
                      className="p-2 rounded-xl text-red-600 hover:bg-red-50 border border-red-100"
                      title="Excluir vaga"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onSelectJob(job)}
                      className="bg-[#0F4C9C] text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-[#0c3c7d]"
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
          <button onClick={() => setIsPaymentModalOpen(true)} className="bg-red-500 text-white p-4">FORÇAR PAYPAL</button>
          {!(currentUser.company?.marketplace_unlocked || currentUser.marketplace_unlocked) && (
            <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 space-y-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fadeIn">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black text-[#FFC20E] tracking-wider block">Recurso Premium</span>
                <h4 className="text-lg font-black">Ative o Marketplace da sua Empresa</h4>
                <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                  Para publicar produtos e serviços na vitrine oficial do CuneneVagas, a sua empresa necessita de uma Licença de Marketplace ativa. Ative com um pagamento único e seguro via PayPal.
                </p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="bg-[#FFC20E] hover:bg-[#e5ae0a] text-slate-900 font-bold px-5 py-3 rounded-xl text-xs shadow-sm transition active:scale-95 shrink-0"
              >
                Ativar Licença com PayPal
              </button>
            </div>
          )}

          {/* Pagamento PayPal Modal */}
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
              <h3 className="text-base font-extrabold text-slate-900">Minha Loja & Meus Produtos</h3>
              <p className="text-xs text-slate-500">Faça a gestão dos produtos e serviços exibidos na sua vitrine</p>
            </div>
            <button
              onClick={onOpenNewProduct}
              className="bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Adicionar Produto
            </button>
          </div>

          {myProducts.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 space-y-3">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">A sua loja ainda não tem produtos</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Adicione produtos agrícolas, materiais de construção, tecnologia ou serviços para compradores no Cunene.
              </p>
              <button
                onClick={onOpenNewProduct}
                className="bg-[#FFC20E] text-slate-900 font-bold px-5 py-2 rounded-xl text-xs shadow-sm inline-block"
              >
                + Adicionar Primeiro Produto
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {myProducts.map(prod => (
                <div key={prod.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col justify-between">
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
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{prod.title}</h4>
                      <p className="text-xs font-black text-[#0F4C9C]">{prod.price.toLocaleString()} {prod.currency || 'AOA'}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{prod.description}</p>
                    </div>
                  </div>

                  <div className="p-4 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleToggleProductStatus(prod)}
                      className="text-[11px] font-bold text-slate-600 hover:text-slate-900 py-1"
                    >
                      {prod.status === 'available' ? 'Marcar Esgotado' : 'Marcar Disponível'}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditProduct(prod)}
                        className="text-slate-500 hover:text-slate-900 p-1.5 rounded-lg"
                        title="Editar produto"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded-lg"
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

      {/* Tab: Received Applications */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          <h3 className="text-base font-extrabold text-slate-900">Candidaturas Recebidas das Suas Vagas</h3>

          {myApplications.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-400 text-xs">
              Nenhuma candidatura recebida até ao momento.
            </div>
          ) : (
            myApplications.map(app => {
              const job = jobs.find(j => j.id === app.job_id);
              const attempts = StoreService.getExamAttempts();
              const attempt = attempts.find(a => (a.application_id === app.id || a.job_id === app.job_id) && a.candidate_id === app.candidate_id);
              const hasExam = job?.has_exam && job?.exam;

              return (
                <div key={app.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-[#0F4C9C] font-black text-lg flex items-center justify-center shrink-0 overflow-hidden">
                        {app.candidate?.avatar_url ? (
                          <img src={app.candidate.avatar_url} alt="Foto" className="w-full h-full object-cover" />
                        ) : (
                          (app.candidate?.full_name || 'C').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#0F4C9C]">{job?.title || 'Vaga'}</span>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">{app.candidate?.full_name || 'Candidato'}</h4>
                        <p className="text-xs text-slate-500">
                          {app.candidate?.profession || 'Profissional'} • {app.candidate?.email} • {app.candidate?.municipality || 'Cunene'}
                        </p>
                        <span className="text-[10px] text-slate-400">
                          Enviada a {new Date(app.created_at).toLocaleDateString('pt-AO')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={app.status}
                        onChange={e => handleUpdateAppStatus(app.id, e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none"
                      >
                        <option value="Enviada">Recebida</option>
                        <option value="Em análise">Em análise</option>
                        <option value="Selecionada para exame">Selecionada para exame</option>
                        <option value="Exame realizado">Exame realizado</option>
                        <option value="Aprovada">Aprovada</option>
                        <option value="Rejeitada">Rejeitada</option>
                        <option value="Contratada">Contratada</option>
                      </select>

                      <button
                        onClick={() => setSelectedCandidateApp(app)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold"
                      >
                        Consultar
                      </button>

                      {app.candidate?.whatsapp && (
                        <a
                          href={`https://wa.me/${app.candidate.whatsapp.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-600 text-white p-2 rounded-xl text-xs hover:bg-emerald-700 transition"
                          title="Falar no WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Technical Exam Summary Banner */}
                  {hasExam ? (
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 font-medium text-slate-700">
                        <Award className="w-4 h-4 text-[#0F4C9C]" />
                        <span>Exame Técnico:</span>
                        {attempt || app.exam_score !== undefined ? (
                          <span className="font-bold text-slate-900">
                            Exame concluído ({attempt?.percentage ?? app.exam_score}%)
                          </span>
                        ) : (
                          <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                            Exame não realizado
                          </span>
                        )}
                      </div>

                      {(attempt || app.exam_score !== undefined) && (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-600">
                            Nota: {attempt?.score ?? Math.round((app.exam_score || 0) / 10)}/{attempt?.total_points ?? 10}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full font-black text-[11px] ${
                            (attempt?.passed ?? app.exam_passed)
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {(attempt?.passed ?? app.exam_passed) ? 'Aprovado ✓' : 'Reprovado ✗'}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">
                      Esta vaga não requer exame técnico.
                    </div>
                  )}

                  {app.cover_letter && (
                    <div className="bg-slate-50 p-3 rounded-2xl text-xs text-slate-700 border border-slate-100">
                      <span className="font-bold block mb-0.5 text-slate-500">Mensagem do Candidato:</span>
                      {app.cover_letter}
                    </div>
                  )}

                  {app.cv_url && (
                    <a
                      href={app.cv_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#0F4C9C] hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Abrir Currículo Anexo</span>
                    </a>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Profile & Services */}
      {activeTab === 'profile' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 mb-1">Sobre a Empresa</h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {company?.description || 'Adicione uma descrição detalhada da empresa para os candidatos e clientes.'}
            </p>
          </div>

          {company?.services && company.services.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Serviços Oferecidos</h3>
              <div className="flex flex-wrap gap-2">
                {company.services.map((svc, i) => (
                  <span key={i} className="bg-slate-100 text-slate-800 text-xs px-3 py-1.5 rounded-xl font-medium">
                    ✓ {svc}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#0F4C9C]" />
              <span>{company?.address || `${company?.municipality || 'Ondjiva'}, Cunene`}</span>
            </div>
            {company?.nif && (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0F4C9C]" />
                <span>NIF: {company.nif}</span>
              </div>
            )}
            {company?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#0F4C9C]" />
                <span>{company.phone}</span>
              </div>
            )}
            {company?.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#0F4C9C]" />
                <span>{company.email}</span>
              </div>
            )}
            {company?.website && (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#0F4C9C]" />
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-[#0F4C9C] hover:underline">
                  {company.website}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Payments History */}
      {activeTab === 'payments' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">Histórico de Transações</h3>
              <p className="text-xs text-slate-500">
                Acompanhe as suas transações reais e ativações de recursos do Marketplace.
              </p>
            </div>
          </div>

          {loadingPayments ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-3 border-[#0F4C9C] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-500">A carregar pagamentos...</span>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
              <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">Sem pagamentos registados</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Qualquer ativação de recurso premium do Marketplace aparecerá nesta secção.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-4">Recurso Premium</th>
                    <th className="p-4">Valor</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4">Data</th>
                    <th className="p-4">Referência da Transação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map(tx => {
                    const statusColors: any = {
                      pending: 'bg-amber-50 text-amber-700 border-amber-200',
                      completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      failed: 'bg-rose-50 text-rose-700 border-rose-200',
                      cancelled: 'bg-slate-50 text-slate-600 border-slate-200'
                    };

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 font-bold text-slate-900">
                          {tx.resource_type === 'marketplace_unlocked' ? 'Licença de Marketplace' : tx.resource_type}
                        </td>
                        <td className="p-4 font-extrabold text-[#0F4C9C]">
                          {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {tx.currency || 'USD'}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusColors[tx.status] || 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500">
                          {new Date(tx.created_at).toLocaleDateString(undefined, {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="p-4 font-mono text-slate-400 select-all truncate max-w-[150px]">
                          {tx.paypal_order_id}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Company Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 my-6">
            <div className="bg-[#0F4C9C] p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">Editar Perfil da Empresa</h3>
                <p className="text-xs text-slate-200">As alterações aqui afetam exclusivamente o contexto da sua empresa</p>
              </div>
              <button onClick={() => setIsEditingProfile(false)} className="text-white/80 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Logo and Cover upload via ImageUploader (Context: company-logo & company-cover) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ImageUploader
                  context="company-logo"
                  currentImageUrl={logoUrl}
                  onUploadSuccess={url => setLogoUrl(url)}
                  onRemove={() => setLogoUrl('')}
                  label="Logótipo da Empresa"
                />
                <ImageUploader
                  context="company-cover"
                  currentImageUrl={coverUrl}
                  onUploadSuccess={url => setCoverUrl(url)}
                  onRemove={() => setCoverUrl('')}
                  label="Imagem de Capa Empresarial"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome Comercial da Empresa *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Setor / Ramo de Atividade</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    placeholder="Ex: Agricultura e Pecuária"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Município da Empresa</label>
                  <select
                    value={municipality}
                    onChange={e => setMunicipality(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    {CUNENE_MUNICIPALITIES.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NIF (Número de Identificação Fiscal)</label>
                  <input
                    type="text"
                    value={nif}
                    onChange={e => setNif(e.target.value)}
                    placeholder="Ex: 5001234567"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Endereço da Empresa</label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Ex: Av. 11 de Novembro, Ondjiva"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Telefone Comercial</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Comercial</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Website Oficial</label>
                <input
                  type="text"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descrição da Empresa</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Serviços Oferecidos (separados por vírgula)</label>
                <input
                  type="text"
                  value={servicesText}
                  onChange={e => setServicesText(e.target.value)}
                  placeholder="Ex: Fornecimento de Grãos, Consultoria, Maquinaria"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-[#0F4C9C] text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-[#0c3c7d] shadow-sm disabled:opacity-50"
                >
                  {savingProfile ? 'A guardar...' : 'Guardar Alterações da Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Job Modal */}
      {editingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 my-6">
            <div className="bg-[#0F4C9C] p-4 text-white flex justify-between items-center">
              <h3 className="text-base font-bold">Editar Vaga</h3>
              <button onClick={() => setEditingJob(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditJob} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Título da Vaga</label>
                <input
                  type="text"
                  required
                  value={editJobTitle}
                  onChange={e => setEditJobTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Categoria</label>
                  <select
                    value={editJobCategory}
                    onChange={e => setEditJobCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    {JOB_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Município</label>
                  <select
                    value={editJobMunicipality}
                    onChange={e => setEditJobMunicipality(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    {CUNENE_MUNICIPALITIES.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Contrato</label>
                  <select
                    value={editJobContractType}
                    onChange={e => setEditJobContractType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="Tempo Inteiro">Tempo Inteiro</option>
                    <option value="Meio Tempo">Meio Tempo</option>
                    <option value="Contrato">Contrato</option>
                    <option value="Estágio">Estágio</option>
                    <option value="Freelance">Freelance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estado da Vaga</label>
                  <select
                    value={editJobStatus}
                    onChange={e => setEditJobStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="active">Ativa / Publicada</option>
                    <option value="closed">Encerrada</option>
                    <option value="paused">Pausada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descrição da Vaga</label>
                <textarea
                  rows={4}
                  required
                  value={editJobDescription}
                  onChange={e => setEditJobDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingJob(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#0F4C9C] text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-[#0c3c7d]"
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
            <div className="bg-[#0F4C9C] p-4 text-white flex justify-between items-center">
              <h3 className="text-base font-bold">Editar Produto</h3>
              <button onClick={() => setEditingProduct(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Produto</label>
                <input
                  type="text"
                  required
                  value={editProductTitle}
                  onChange={e => setEditProductTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Preço (AOA / Kz)</label>
                  <input
                    type="number"
                    required
                    value={editProductPrice}
                    onChange={e => setEditProductPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Categoria</label>
                  <select
                    value={editProductCategory}
                    onChange={e => setEditProductCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Município</label>
                  <select
                    value={editProductMunicipality}
                    onChange={e => setEditProductMunicipality(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    {CUNENE_MUNICIPALITIES.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Telefone WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={editProductPhone}
                    onChange={e => setEditProductPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descrição</label>
                <textarea
                  rows={3}
                  required
                  value={editProductDescription}
                  onChange={e => setEditProductDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
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
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#0F4C9C] text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-[#0c3c7d]"
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
            <div className="bg-[#0F4C9C] p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold">Perfil do Candidato</h3>
                <p className="text-xs text-slate-200">Detalhes da candidatura recebida</p>
              </div>
              <button onClick={() => setSelectedCandidateApp(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="flex items-center gap-3 border-b pb-4 border-slate-100">
                <div className="w-12 h-12 rounded-full bg-[#0F4C9C] text-white flex items-center justify-center font-bold text-base">
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

              {/* Technical Exam Result Section */}
              {(() => {
                const targetJob = jobs.find(j => j.id === selectedCandidateApp.job_id);
                const attempts = StoreService.getExamAttempts();
                const attempt = attempts.find(a => (a.application_id === selectedCandidateApp.id || a.job_id === selectedCandidateApp.job_id) && a.candidate_id === selectedCandidateApp.candidate_id);
                const hasExam = targetJob?.has_exam && targetJob?.exam;

                if (!hasExam) return null;

                const score = attempt?.score ?? (selectedCandidateApp.exam_score !== undefined ? Math.round(selectedCandidateApp.exam_score / 10) : null);
                const percentage = attempt?.percentage ?? selectedCandidateApp.exam_score;
                const passed = attempt?.passed ?? selectedCandidateApp.exam_passed;
                const minRequired = targetJob?.exam?.passing_score || 70;

                return (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-[#0F4C9C]" />
                        <span>Avaliação Técnica da Vaga</span>
                      </span>
                      {passed !== undefined ? (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                          passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {passed ? 'Aprovado ✓' : 'Reprovado ✗'}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                          Exame não realizado
                        </span>
                      )}
                    </div>

                    {percentage !== undefined ? (
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-center">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Pontuação</span>
                          <span className="text-sm font-black text-slate-900">{score !== null ? `${score}/10` : '-'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Percentagem</span>
                          <span className="text-sm font-black text-[#0F4C9C]">{percentage}%</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Mín. Exigido</span>
                          <span className="text-sm font-black text-slate-600">{minRequired}%</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-500 text-xs italic">
                        O candidato ainda não realizou o exame técnico desta vaga.
                      </p>
                    )}
                  </div>
                );
              })()}

              {selectedCandidateApp.cv_url && (
                <a
                  href={selectedCandidateApp.cv_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#0F4C9C] text-white font-bold py-2.5 rounded-xl text-center flex items-center justify-center gap-1.5 hover:bg-[#0c3c7d]"
                >
                  <FileText className="w-4 h-4" />
                  <span>Descarregar / Abrir Currículo Anexo</span>
                </a>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedCandidateApp(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
