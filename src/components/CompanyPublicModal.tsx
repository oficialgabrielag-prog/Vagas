import React, { useState } from 'react';
import { X, MapPin, Building2, Phone, Mail, Globe, MessageCircle, Briefcase, ShoppingBag, Users, Check, Plus } from 'lucide-react';
import { UserProfile, Job, MarketplaceProduct, CommunityPost } from '../lib/types';
import { StoreService } from '../lib/store';

interface CompanyPublicModalProps {
  company: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  jobs: Job[];
  products: MarketplaceProduct[];
  posts: CommunityPost[];
  currentUser: UserProfile | null;
  onSelectJob: (job: Job) => void;
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
  onOpenAuth
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'store' | 'posts'>('overview');
  const [followed, setFollowed] = useState<boolean>(() => {
    if (!currentUser || !company) return false;
    return StoreService.getFollowedCompanies(currentUser.id).includes(company.id);
  });

  if (!isOpen || !company) return null;

  // Real data filtered strictly by this company
  const companyJobs = jobs.filter(j => (j.employer_id === company.id || j.company_name === company.company_name) && j.status === 'active');
  const companyProducts = products.filter(p => (p.seller_id === company.id || p.company_id === company.id) && (p.is_active !== false && p.status === 'available'));
  const companyPosts = posts.filter(p => p.author_id === company.id);

  const handleToggleFollow = () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    const updated = StoreService.toggleFollowCompany(currentUser.id, company.id);
    setFollowed(updated.includes(company.id));
  };

  const hasWhatsApp = !!(company.whatsapp || company.phone);

  const handleWhatsApp = () => {
    const rawNumber = company.whatsapp || company.phone;
    if (!rawNumber) return;
    const cleanPhone = rawNumber.replace(/[^0-9]/g, '');
    if (!cleanPhone) return;
    const message = encodeURIComponent(`Olá, vi o perfil da empresa ${company.company_name || company.full_name} no CuneneVagas e gostaria de obter mais informações.`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const displayLogo = company.company?.logo_url || company.company_logo || company.avatar_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-100 my-4 max-h-[92vh] flex flex-col">
        {/* Cover & Header */}
        <div className="relative">
          <div className="h-36 sm:h-48 bg-gradient-to-r from-[#0F4C9C] to-slate-800 overflow-hidden">
            {company.cover_url ? (
              <img src={company.cover_url} alt="Capa" className="w-full h-full object-cover opacity-80" />
            ) : (
              <div className="w-full h-full bg-[#0F4C9C]/90 flex items-center justify-center text-white/20">
                <Building2 className="w-24 h-24" />
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-xs transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Logo & Headline */}
          <div className="px-6 -mt-12 sm:-mt-16 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-1 shadow-lg shrink-0 border-2 border-white overflow-hidden">
                {displayLogo ? (
                  <img src={displayLogo} alt={company.company_name || company.full_name} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className="w-full h-full bg-[#0F4C9C] rounded-xl flex items-center justify-center text-white font-bold text-3xl">
                    {(company.company_name || company.full_name).charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                  {company.company_name || company.full_name}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-1 font-medium">
                  <span className="bg-blue-50 text-[#0F4C9C] px-2.5 py-0.5 rounded-full font-bold">
                    {company.industry || 'Empresa'}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#0F4C9C]" />
                    {company.municipality || 'Cunene'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleToggleFollow}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  followed
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-[#0F4C9C] text-white hover:bg-[#0c3c7d]'
                }`}
              >
                {followed ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{followed ? 'A Seguir' : 'Seguir'}</span>
              </button>

              {hasWhatsApp && (
                <button
                  onClick={handleWhatsApp}
                  className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Real Counters bar (100% real values) */}
        <div className="grid grid-cols-3 border-y border-slate-100 bg-slate-50/50 py-3 mt-4 text-center">
          <div>
            <span className="block text-lg font-black text-[#0F4C9C]">{companyJobs.length}</span>
            <span className="text-[11px] text-slate-500 font-semibold">Vagas Abertas</span>
          </div>
          <div>
            <span className="block text-lg font-black text-[#0F4C9C]">{companyProducts.length}</span>
            <span className="text-[11px] text-slate-500 font-semibold">Produtos na Loja</span>
          </div>
          <div>
            <span className="block text-lg font-black text-[#0F4C9C]">{companyPosts.length}</span>
            <span className="text-[11px] text-slate-500 font-semibold">Publicações</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 space-x-6 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'overview' ? 'border-[#0F4C9C] text-[#0F4C9C]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`py-3 border-b-2 transition whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'jobs' ? 'border-[#0F4C9C] text-[#0F4C9C]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" /> Vagas ({companyJobs.length})
          </button>
          <button
            onClick={() => setActiveTab('store')}
            className={`py-3 border-b-2 transition whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'store' ? 'border-[#0F4C9C] text-[#0F4C9C]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Loja ({companyProducts.length})
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`py-3 border-b-2 transition whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'posts' ? 'border-[#0F4C9C] text-[#0F4C9C]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Publicações ({companyPosts.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Sobre a Empresa</h4>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {company.bio || 'Empresa sediada no Cunene com compromisso no fomento socioeconómico regional.'}
                </p>
              </div>

              {company.services && company.services.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Serviços e Atividades</h4>
                  <div className="flex flex-wrap gap-2">
                    {company.services.map((svc, i) => (
                      <span key={i} className="bg-slate-100 text-slate-800 text-xs px-3 py-1.5 rounded-xl font-medium">
                        • {svc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#0F4C9C]" />
                  <span>{company.address || `${company.municipality || 'Ondjiva'}, Cunene`}</span>
                </div>
                {company.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#0F4C9C]" />
                    <span>{company.phone}</span>
                  </div>
                )}
                {company.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#0F4C9C]" />
                    <span>{company.email}</span>
                  </div>
                )}
                {company.website && (
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

          {activeTab === 'jobs' && (
            <div className="space-y-3">
              {companyJobs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs bg-slate-50 rounded-2xl">
                  Nenhuma vaga aberta no momento para esta empresa.
                </div>
              ) : (
                companyJobs.map(job => (
                  <div
                    key={job.id}
                    onClick={() => {
                      onClose();
                      onSelectJob(job);
                    }}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-[#0F4C9C] transition cursor-pointer bg-white flex justify-between items-center"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{job.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{job.municipality} • {job.contract_type}</p>
                    </div>
                    <span className="text-xs font-bold text-[#0F4C9C] hover:underline">Ver detalhes</span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'store' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {companyProducts.length === 0 ? (
                <div className="col-span-full text-center py-12 text-slate-400 text-xs bg-slate-50 rounded-2xl">
                  Nenhum produto cadastrado na vitrine desta empresa ainda.
                </div>
              ) : (
                companyProducts.map(prod => (
                  <div key={prod.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                    <div className="h-28 bg-slate-100 overflow-hidden">
                      {prod.image_url ? (
                        <img src={prod.image_url} alt={prod.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ShoppingBag className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <span className="text-[10px] text-slate-400 font-semibold block">{prod.category}</span>
                      <h5 className="text-xs font-bold text-slate-900 line-clamp-1 mt-0.5">{prod.title}</h5>
                      <span className="text-xs font-black text-[#0F4C9C] mt-1 block">
                        {prod.price.toLocaleString()} {prod.currency || 'AOA'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'posts' && (
            <div className="space-y-4">
              {companyPosts.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs bg-slate-50 rounded-2xl">
                  Nenhuma publicação recente desta empresa.
                </div>
              ) : (
                companyPosts.map(post => (
                  <div key={post.id} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                    <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">{post.content}</p>
                    {post.image_url && (
                      <img 
                        src={post.image_url} 
                        alt="Imagem" 
                        className="w-full h-48 object-cover rounded-xl mt-2" 
                        onError={(e) => {
                          e.currentTarget.classList.add('hidden');
                        }}
                      />
                    )}
                    <span className="text-[10px] text-slate-400 block pt-1">
                      {new Date(post.created_at).toLocaleDateString('pt-AO')}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
