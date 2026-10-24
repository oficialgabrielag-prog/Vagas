import React, { useState } from 'react';
import { User, MapPin, Phone, MessageCircle, Mail, Globe, MessageCircle as MessageCircleIcon, Briefcase, ShoppingBag, Users, Check, Plus, Maximize2, ThumbsUp, MessageSquare, Star, Award, CheckCircle2, Send, Building2 } from 'lucide-react';
import { UserProfile, Job, MarketplaceProduct, CommunityPost, CompanyRating } from '../lib/types';
import { StoreService } from '../lib/store';
import { MediaViewer } from './MediaViewer';

interface CompanyPublicModalProps {
  company: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  jobs: Job[];
  products: MarketplaceProduct[];
  posts: CommunityPost[];
  currentUser: UserProfile | null;
  onSelectJob: (job: Job) => void;
  onSelectPost?: (post: CommunityPost) => void;
  onSelectProduct?: (product: MarketplaceProduct) => void;
  onOpenAuth: () => void;
}

export const CompanyPublicModal: React.FC<CompanyPublicModalProps> = ({
  company,
  isOpen,
  onClose,
  jobs,
  products,
  posts,
  currentUser,
  onSelectJob,
  onSelectPost,
  onSelectProduct,
  onOpenAuth
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'store' | 'posts' | 'ratings'>('overview');
  const [viewingMedia, setViewingMedia] = useState<{ url: string; type: 'image'; alt: string }[] | null>(null);
  const [followed, setFollowed] = useState<boolean>(() => {
    if (!currentUser || !company) return false;
    return StoreService.isFollowing(currentUser.id, company.id);
  });

  const [ratings, setRatings] = useState<CompanyRating[]>([]);
  
  React.useEffect(() => {
    if (company) {
      const companyId = company.company?.id || company.id;
      StoreService.getCompanyRatingsAsync(companyId).then(setRatings);
    }
  }, [company]);
  const [selectedStars, setSelectedStars] = useState(5);
  const [hoverStars, setHoverStars] = useState<number | null>(null);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  if (!isOpen || !company) return null;

  const companyId = company.company?.id || company.id;
  const ratingStats = StoreService.getCompanyRatingStats(companyId);
  const partnerInfo = StoreService.isUserPartner(company.id);

  const handleRatingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    StoreService.addCompanyRating({
      company_id: companyId,
      user_id: currentUser.id,
      user_name: currentUser.full_name || 'Utilizador do Cunene',
      user_avatar: currentUser.avatar_url,
      rating: selectedStars,
      comment: ratingComment.trim() || undefined
    });
    setRatings(StoreService.getCompanyRatings(companyId));
    setRatingSubmitted(true);
    setRatingComment('');
    setTimeout(() => setRatingSubmitted(false), 5000);
  };

  const companyName = company.company_name || company.full_name || 'Empresa';
  const displayLogo = company.company?.logo_url || company.company_logo || company.avatar_url;
  const coverUrl = company.cover_url;

  // Real data filtered strictly by this company
  const companyJobs = jobs.filter(j => (j.employer_id === company.id || j.company_name === company.company_name) && j.status === 'active');
  const companyProducts = products.filter(p => (p.seller_id === company.id || p.company_id === company.id) && (p.is_active !== false && p.status === 'available'));
  const companyPosts = posts.filter(p => p.author_id === company.id);

  const handleOpenCoverViewer = () => {
    if (coverUrl) {
      setViewingMedia([{ url: coverUrl, type: 'image', alt: `Foto de capa da empresa ${companyName}` }]);
    }
  };

  const handleOpenLogoViewer = () => {
    if (displayLogo) {
      setViewingMedia([{ url: displayLogo, type: 'image', alt: `Logotipo da empresa ${companyName}` }]);
    }
  };

  const handleToggleFollow = () => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    const isNowFollowing = StoreService.toggleFollow(currentUser, company.id, companyName);
    setFollowed(isNowFollowing);
  };

  const hasWhatsApp = !!(company.whatsapp || company.phone);

  const handleWhatsApp = () => {
    const rawNumber = company.whatsapp || company.phone;
    if (!rawNumber) return;
    const cleanPhone = rawNumber.replace(/[^0-9]/g, '');
    if (!cleanPhone) return;
    const message = encodeURIComponent(`Olá, vi o perfil da empresa ${companyName} no CuneneVagas e gostaria de obter mais informações.`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <>
      {/* TELA ÚNICA: Perfil completo da empresa com navegação limpa */}
      <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col overflow-y-auto animate-fadeIn select-text">
        {/* Top Navbar da Tela Única */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shrink-0 shadow-2xs">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-slate-700 hover:text-[#244F9A] font-bold text-sm bg-slate-100 hover:bg-blue-50 px-3.5 py-2 rounded-xl transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">add_box</span>
            <span>Voltar</span>
          </button>

          <div className="text-center truncate px-2 max-w-[200px] sm:max-w-md">
            <h1 className="text-sm font-black text-slate-900 truncate">{companyName}</h1>
            <p className="text-[11px] text-slate-500 font-medium truncate">{company.industry || 'Empresa no Cunene'}</p>
          </div>

          <div className="w-16 flex justify-end">
            <span className="bg-blue-100 text-[#244F9A] text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
              Empresa
            </span>
          </div>
        </header>

        {/* Conteúdo Centralizado */}
        <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col bg-white border-x border-slate-200/60 shadow-xs min-h-[calc(100vh-60px)]">
          
          {/* Foto de Capa (Tela Cheia ao Clicar) */}
          <div className="relative shrink-0">
            <div 
              onClick={handleOpenCoverViewer}
              className={`h-44 sm:h-64 bg-gradient-to-r from-[#244F9A] via-slate-900 to-slate-950 overflow-hidden relative ${
                coverUrl ? 'cursor-pointer group' : ''
              }`}
            >
              {coverUrl ? (
                <>
                  <img src={coverUrl} alt="Capa" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-xs">
                      <Maximize2 className="w-3.5 h-3.5" /> Ver Capa em Tela Cheia
                    </span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-[#244F9A]/90 flex items-center justify-center text-white/20">
                  <Building2 className="w-28 h-28" />
                </div>
              )}
            </div>

            {/* Logotipo & Informações da Empresa */}
            <div className="px-4 sm:px-8 -mt-14 sm:-mt-20 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
              <div className="flex items-end gap-4">
                <div 
                  onClick={handleOpenLogoViewer}
                  className={`w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-white p-1.5 shadow-xl shrink-0 border-4 border-white overflow-hidden relative ${
                    displayLogo ? 'cursor-pointer group' : ''
                  }`}
                >
                  {displayLogo ? (
                    <>
                      <img src={displayLogo} alt={companyName} className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition" />
                      <div className="absolute inset-0 bg-black/30 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <Maximize2 className="w-6 h-6 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-[#244F9A] rounded-2xl flex items-center justify-center text-white font-black text-4xl">
                      {companyName.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="space-y-1 pb-1">
                  <h2 className="text-xl sm:text-3xl font-black text-slate-900 leading-tight">
                    {companyName}
                  </h2>
                  {company.company?.slogan && (
                    <p className="text-xs sm:text-sm text-slate-500 font-medium italic -mt-1">
                      "{company.company.slogan}"
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600 font-semibold">
                    <span className="bg-blue-50 text-[#244F9A] px-2.5 py-0.5 rounded-full font-bold">
                      {company.industry || 'Comércio & Serviços'}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-[#244F9A]" />
                      {company.municipality || 'Cunene'}
                    </span>
                  </div>

                  {/* Classificação em Estrelas & Selo de Parceiro Oficial */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('ratings')}
                      className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 px-2.5 py-1 rounded-full text-xs font-black transition cursor-pointer"
                      title="Ver classificações da empresa"
                    >
                      <div className="flex items-center text-amber-500">
                        {[1, 2, 3, 4, 5].map(st => (
                          <Star 
                            key={st} 
                            className={`w-3.5 h-3.5 ${st <= Math.round(ratingStats.average) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} 
                          />
                        ))}
                      </div>
                      <span>{ratingStats.average.toFixed(1)}</span>
                      <span className="text-amber-700 font-semibold text-[11px]">({ratings.length} {ratings.length === 1 ? 'avaliação' : 'avaliações'})</span>
                    </button>

                    {partnerInfo.isPartner && (
                      <span className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-900 to-indigo-900 text-amber-300 border border-amber-400/50 px-2.5 py-1 rounded-full text-[11px] font-black shadow-2xs">
                        <Award className="w-3.5 h-3.5 text-amber-300" />
                        <span>🤝 {partnerInfo.partner?.partner_title || 'Parceiro Oficial'}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Ações (Seguir & WhatsApp) */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleToggleFollow}
                  className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
                    followed
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-[#244F9A] text-white hover:bg-[#193B70]'
                  }`}
                >
                  {followed ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{followed ? 'A Seguir' : 'Seguir'}</span>
                </button>

                {hasWhatsApp && (
                  <button
                    onClick={handleWhatsApp}
                    className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Barra de Contadores Reais */}
          <div className="grid grid-cols-3 border-y border-slate-100 bg-slate-50/70 py-3.5 mt-6 text-center shrink-0">
            <div onClick={() => setActiveTab('jobs')} className="cursor-pointer hover:opacity-80 transition">
              <span className="block text-xl font-black text-[#244F9A]">{companyJobs.length}</span>
              <span className="text-xs text-slate-500 font-bold">Vagas Abertas</span>
            </div>
            <div onClick={() => setActiveTab('store')} className="cursor-pointer hover:opacity-80 transition">
              <span className="block text-xl font-black text-[#244F9A]">{companyProducts.length}</span>
              <span className="text-xs text-slate-500 font-bold">Produtos na Loja</span>
            </div>
            <div onClick={() => setActiveTab('posts')} className="cursor-pointer hover:opacity-80 transition">
              <span className="block text-xl font-black text-[#244F9A]">{companyPosts.length}</span>
              <span className="text-xs text-slate-500 font-bold">Publicações</span>
            </div>
          </div>

          {/* Abas de Navegação */}
          <div className="flex border-b border-slate-200 px-4 sm:px-8 space-x-6 text-xs sm:text-sm font-bold shrink-0 bg-slate-50/50 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3.5 border-b-2 transition whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-[#244F9A] text-[#244F9A]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Sobre a Empresa
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`py-3.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'jobs'
                  ? 'border-[#244F9A] text-[#244F9A]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Vagas</span>
              <span className="bg-[#244F9A]/10 text-[#244F9A] text-[10px] px-2 py-0.5 rounded-full font-black">
                {companyJobs.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('store')}
              className={`py-3.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'store'
                  ? 'border-[#244F9A] text-[#244F9A]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Loja & Produtos</span>
              <span className="bg-[#244F9A]/10 text-[#244F9A] text-[10px] px-2 py-0.5 rounded-full font-black">
                {companyProducts.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`py-3.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'posts'
                  ? 'border-[#244F9A] text-[#244F9A]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Publicações</span>
              <span className="bg-[#244F9A]/10 text-[#244F9A] text-[10px] px-2 py-0.5 rounded-full font-black">
                {companyPosts.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('ratings')}
              className={`py-3.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'ratings'
                  ? 'border-[#244F9A] text-[#244F9A]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              <span>Avaliações & Estrelas</span>
              <span className="bg-amber-100 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-black">
                {ratings.length}
              </span>
            </button>
          </div>

          {/* Conteúdo da Aba */}
          <div className="p-4 sm:p-8 space-y-6 flex-1 bg-white">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Descrição */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Apresentação da Empresa</h4>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                    {company.company?.description || company.bio || 'Sem descrição cadastrada no momento.'}
                  </p>
                </div>

                {/* Grid de Informações */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                  {company.industry && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                      <Briefcase className="w-5 h-5 text-[#244F9A] shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Setor / Indústria</span>
                        <span className="text-slate-800 font-bold">{company.industry}</span>
                      </div>
                    </div>
                  )}

                  {company.company?.nif && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-[#244F9A] shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">NIF</span>
                        <span className="text-slate-800 font-bold">{company.company.nif}</span>
                      </div>
                    </div>
                  )}

                  {company.email && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                      <Mail className="w-5 h-5 text-[#244F9A] shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 block font-semibold">E-mail Comercial</span>
                        <span className="text-slate-800 font-bold truncate block">{company.email}</span>
                      </div>
                    </div>
                  )}

                  {hasWhatsApp && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                      <Phone className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Telefone / WhatsApp</span>
                        <span className="text-slate-800 font-bold">{company.whatsapp || company.phone}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'jobs' && (
              <div className="space-y-3">
                {companyJobs.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-100">
                    Nenhuma vaga aberta no momento por esta empresa.
                  </div>
                ) : (
                  companyJobs.map(job => (
                    <div
                      key={job.id}
                      onClick={() => {
                        onClose();
                        onSelectJob(job);
                      }}
                      className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition space-y-2.5 shadow-2xs group"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#244F9A] transition">{job.title}</h4>
                        <span className="text-[10px] bg-blue-100 text-[#244F9A] font-black px-2.5 py-0.5 rounded-full">
                          {job.contract_type || 'Tempo Inteiro'}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">{job.description}</p>
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 font-semibold">
                        <span>📍 {job.location || 'Cunene'}</span>
                        <span className="text-[#244F9A] font-bold group-hover:underline">Ver detalhes e candidatar →</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ABA DE PRODUTOS: CLICÁVEL COM ABERTURA DE DETALHE COMPLETO */}
            {activeTab === 'store' && (
              <div className="space-y-4">
                {companyProducts.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-100">
                    Nenhum produto cadastrado na vitrine desta empresa ainda.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                    {companyProducts.map(prod => (
                      <div
                        key={prod.id}
                        onClick={() => onSelectProduct && onSelectProduct(prod)}
                        className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md cursor-pointer transition transform active:scale-95 group"
                      >
                        <div className="h-32 sm:h-36 bg-slate-100 overflow-hidden relative">
                          {prod.image_url ? (
                            <img src={prod.image_url} alt={prod.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <ShoppingBag className="w-8 h-8" />
                            </div>
                          )}
                          <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                            Ver produto →
                          </span>
                        </div>
                        <div className="p-3 space-y-1">
                          <span className="text-[10px] text-slate-400 font-semibold block">{prod.category}</span>
                          <h5 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-[#244F9A] transition">
                            {prod.title}
                          </h5>
                          <span className="text-xs sm:text-sm font-black text-[#244F9A] block">
                            {prod.price.toLocaleString()} {prod.currency || 'AOA'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ABA DE PUBLICAÇÕES: CLICÁVEL EM TELA CHEIA */}
            {activeTab === 'ratings' && (
              <div className="space-y-6">
                {/* Header de Avaliação */}
                <div className="bg-gradient-to-br from-amber-500/10 via-amber-50 to-orange-50/60 p-6 rounded-3xl border border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xs">
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 bg-amber-500 text-white rounded-3xl flex flex-col items-center justify-center font-black shadow-md shrink-0">
                      <span className="text-3xl leading-none">{ratingStats.average.toFixed(1)}</span>
                      <span className="text-[10px] uppercase tracking-wider text-amber-100 font-bold mt-1">de 5.0</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center text-amber-500">
                        {[1, 2, 3, 4, 5].map(st => (
                          <Star 
                            key={st} 
                            className={`w-5 h-5 ${st <= Math.round(ratingStats.average) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} 
                          />
                        ))}
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        Reputação & Classificação da Empresa
                      </h3>
                      <p className="text-xs text-slate-600">
                        Baseada em {ratings.length} {ratings.length === 1 ? 'avaliação de clientes e profissionais' : 'avaliações de clientes e profissionais'} no Cunene.
                      </p>
                    </div>
                  </div>

                  {partnerInfo.isPartner && (
                    <div className="bg-white/90 p-3.5 rounded-2xl border border-amber-200 flex items-center gap-2.5 shrink-0 shadow-2xs">
                      <Award className="w-5 h-5 text-amber-500 shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase font-black text-amber-800 tracking-wider block">Verificada</span>
                        <span className="text-xs font-bold text-slate-900">{partnerInfo.partner?.partner_title || 'Parceiro Oficial'}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Formulário Interativo de Avaliação com Estrelas */}
                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">Deixar a Sua Classificação</h4>
                      <p className="text-xs text-slate-500">Avalie os serviços, produtos ou processo de recrutamento da empresa</p>
                    </div>
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
                      1 a 5 estrelas
                    </span>
                  </div>

                  {ratingSubmitted && (
                    <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-2xl text-xs font-bold border border-emerald-200 flex items-center gap-2 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Obrigado! A sua avaliação com estrelas foi registada com sucesso.</span>
                    </div>
                  )}

                  <form onSubmit={handleRatingSubmit} className="space-y-4">
                    {/* Seletor Interativo de 5 Estrelas */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">A sua pontuação:</label>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map(st => {
                          const isFilled = hoverStars !== null ? st <= hoverStars : st <= selectedStars;
                          return (
                            <button
                              type="button"
                              key={st}
                              onMouseEnter={() => setHoverStars(st)}
                              onMouseLeave={() => setHoverStars(null)}
                              onClick={() => setSelectedStars(st)}
                              className="p-1 hover:scale-115 active:scale-95 transition-all cursor-pointer"
                              title={`${st} estrelas`}
                            >
                              <Star 
                                className={`w-8 h-8 transition-colors ${
                                  isFilled 
                                    ? 'fill-amber-400 text-amber-400 drop-shadow-xs' 
                                    : 'text-slate-200 hover:text-slate-300'
                                }`} 
                              />
                            </button>
                          );
                        })}
                        <span className="text-xs font-black text-slate-700 ml-2">
                          {hoverStars !== null ? hoverStars : selectedStars} de 5 estrelas
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">Comentário ou Experiência (opcional):</label>
                      <textarea
                        rows={3}
                        value={ratingComment}
                        onChange={e => setRatingComment(e.target.value)}
                        placeholder="Ex: Excelente atendimento, entrega pontual e produtos de alta qualidade em Ondjiva..."
                        className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-[#244F9A] transition"
                      />
                    </div>

                    <div className="flex justify-end">
                      {currentUser ? (
                        <button
                          type="submit"
                          className="bg-[#244F9A] hover:bg-[#193B70] text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Publicar Avaliação</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onOpenAuth}
                          className="bg-[#244F9A] text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer active:scale-95"
                        >
                          Iniciar Sessão para Avaliar
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Lista de Avaliações Recebidas */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Todas as Avaliações ({ratings.length})
                  </h4>

                  {ratings.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-100">
                      Nenhuma avaliação registada ainda. Seja o primeiro a classificar esta empresa!
                    </div>
                  ) : (
                    ratings.map(r => (
                      <div key={r.id} className="p-4 bg-white rounded-2xl border border-slate-200/80 space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#244F9A] text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                              {r.user_avatar ? (
                                <img src={r.user_avatar} alt={r.user_name} className="w-full h-full object-cover" />
                              ) : (
                                r.user_name.charAt(0)
                              )}
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-slate-900">{r.user_name}</h5>
                              <span className="text-[10px] text-slate-400">
                                {new Date(r.created_at).toLocaleDateString('pt-AO')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center text-amber-500">
                            {[1, 2, 3, 4, 5].map(st => (
                              <Star 
                                key={st} 
                                className={`w-3.5 h-3.5 ${st <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                              />
                            ))}
                          </div>
                        </div>

                        {r.comment && (
                          <p className="text-xs text-slate-700 leading-relaxed font-normal pl-10">
                            "{r.comment}"
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ABA DE PUBLICAÇÕES: CLICÁVEL EM TELA CHEIA */}
            {activeTab === 'posts' && (
              <div className="space-y-4">
                {companyPosts.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-100">
                    Nenhuma publicação recente desta empresa.
                  </div>
                ) : (
                  companyPosts.map(post => (
                    <div 
                      key={post.id} 
                      onClick={() => onSelectPost && onSelectPost(post)}
                      className="p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100/90 cursor-pointer transition space-y-3 shadow-xs group"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="bg-blue-100 text-[#244F9A] font-bold px-2.5 py-0.5 rounded-md">
                          {post.category || 'Geral'}
                        </span>
                        <span>{new Date(post.created_at).toLocaleDateString('pt-AO')}</span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-800 line-clamp-3 leading-relaxed whitespace-pre-line">{post.content}</p>

                      {post.image_url && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 max-h-56 bg-slate-900/10">
                          <img 
                            src={post.image_url} 
                            alt="Imagem" 
                            className="w-full h-full object-cover group-hover:scale-102 transition" 
                            onError={(e) => {
                              e.currentTarget.parentElement?.classList.add('hidden');
                            }}
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs text-slate-500 font-semibold">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5 font-bold">
                            <ThumbsUp className="w-4 h-4 text-[#244F9A]" />
                            {post.likes_count || 0}
                          </span>
                          <span className="flex items-center gap-1.5 font-bold">
                            <MessageSquare className="w-4 h-4 text-slate-600" />
                            {post.comments_count || 0}
                          </span>
                        </div>
                        <span className="text-[#244F9A] font-bold group-hover:underline flex items-center gap-1">
                          <Maximize2 className="w-3.5 h-3.5" /> Ver em tela cheia
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visualizador de Capa ou Logotipo em Tela Cheia */}
      {viewingMedia && (
        <MediaViewer
          media={viewingMedia}
          onClose={() => setViewingMedia(null)}
        />
      )}
    </>
  );
};
