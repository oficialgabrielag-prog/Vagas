import React, { useState } from 'react';
import { ArrowLeft, User, MapPin, Phone, MessageCircle, Mail, Award, FileText, Briefcase, ShoppingBag, ThumbsUp, MessageSquare, Maximize2, Sparkles, Share2, Users, Plus, Check } from 'lucide-react';
import { UserProfile, CandidateProfile, CommunityPost, MarketplaceProduct, FollowerItem } from '../lib/types';
import { StoreService } from '../lib/store';
import { MediaViewer } from './MediaViewer';
import { FollowersModal } from './FollowersModal';

interface CandidatePublicModalProps {
  candidate: UserProfile | CandidateProfile | null;
  isOpen: boolean;
  onClose: () => void;
  posts?: CommunityPost[];
  products?: MarketplaceProduct[];
  currentUser?: UserProfile | null;
  onSelectPost?: (post: CommunityPost) => void;
  onSelectProduct?: (product: MarketplaceProduct) => void;
}

export const CandidatePublicModal: React.FC<CandidatePublicModalProps> = ({
  candidate,
  isOpen,
  onClose,
  posts = [],
  products = [],
  currentUser,
  onSelectPost,
  onSelectProduct,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'products' | 'posts'>('profile');
  const [viewingMedia, setViewingMedia] = useState<{ url: string; type: 'image'; alt: string }[] | null>(null);
  const [followers, setFollowers] = useState<FollowerItem[]>(() => candidate ? StoreService.getFollowers(candidate.id) : []);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [followed, setFollowed] = useState<boolean>(() => {
    if (!currentUser || !candidate) return false;
    return StoreService.isFollowing(currentUser.id, candidate.id);
  });

  React.useEffect(() => {
    if (!candidate) return;
    const handleUpdate = (e: any) => {
      if (!e.detail?.targetId || e.detail.targetId === candidate.id) {
        setFollowers(StoreService.getFollowers(candidate.id));
      }
    };
    window.addEventListener('cunene_followers_updated', handleUpdate);
    return () => window.removeEventListener('cunene_followers_updated', handleUpdate);
  }, [candidate]);

  const candidateName = candidate?.full_name || 'Candidato';

  const handleToggleFollow = () => {
    if (!currentUser || !candidate) return;
    const isNowFollowing = StoreService.toggleFollow(currentUser, candidate.id, candidateName);
    setFollowed(isNowFollowing);
  };

  if (!isOpen || !candidate) return null;

  const avatarUrl = candidate.avatar_url;
  const coverUrl = candidate.cover_url;
  const whatsappNumber = candidate.whatsapp || candidate.phone;
  const candidatePosts = posts.filter(p => p.author_id === candidate.id);
  const candidateProducts = products.filter(p => p.seller_id === candidate.id);

  const handleOpenCoverViewer = () => {
    if (coverUrl) {
      setViewingMedia([{ url: coverUrl, type: 'image', alt: `Foto de capa de ${candidateName}` }]);
    }
  };

  const handleOpenAvatarViewer = () => {
    if (avatarUrl) {
      setViewingMedia([{ url: avatarUrl, type: 'image', alt: `Foto de perfil de ${candidateName}` }]);
    }
  };

  return (
    <>
      {/* TELA ÚNICA: Ocupa toda a tela com transição fluida e botão voltar dedicado */}
      <div className="fixed inset-0 z-50 bg-[#F8FAFC] flex flex-col overflow-y-auto animate-fadeIn select-text font-sans">
        
        {/* Top Navbar da Tela Única */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shrink-0 shadow-xs">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 text-[#172033] hover:text-[#244F9A] font-bold text-sm bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>

          <div className="text-center truncate px-2 max-w-[200px] sm:max-w-md">
            <h1 className="text-sm font-black text-[#172033] truncate">{candidateName}</h1>
            <p className="text-[11px] text-[#64748B] font-medium truncate">{candidate.profession || 'Perfil de Candidato'}</p>
          </div>

          <div className="w-20 flex justify-end">
            <span className="bg-blue-50 text-[#193B70] border border-[#244F9A]/20 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase">
              Candidato
            </span>
          </div>
        </header>

        {/* Conteúdo Principal Centralizado */}
        <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col bg-white border-x border-slate-200/60 shadow-xs min-h-[calc(100vh-60px)]">
          
          {/* Foto de Capa */}
          <div className="relative shrink-0">
            <div 
              onClick={handleOpenCoverViewer}
              className={`h-44 sm:h-64 bg-gradient-to-r from-[#193B70] via-[#244F9A] to-[#123D73] overflow-hidden relative ${
                coverUrl ? 'cursor-pointer group' : ''
              }`}
            >
              {coverUrl ? (
                <>
                  <img src={coverUrl} alt="Capa" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-xs">
                      <Maximize2 className="w-3.5 h-3.5" /> Ver Capa em Tela Cheia
                    </span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20">
                  <User className="w-28 h-28" />
                </div>
              )}
            </div>

            {/* Avatar & Informações Principais */}
            <div className="px-5 sm:px-8 -mt-14 sm:-mt-20 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
              <div className="flex items-end gap-4">
                <div 
                  onClick={handleOpenAvatarViewer}
                  className={`w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-white p-1.5 shadow-xl shrink-0 ring-4 ring-white overflow-hidden relative ${
                    avatarUrl ? 'cursor-pointer group' : ''
                  }`}
                >
                  {avatarUrl ? (
                    <>
                      <img src={avatarUrl} alt={candidateName} className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/30 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <Maximize2 className="w-6 h-6 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-[#193B70] rounded-2xl flex items-center justify-center text-white font-black text-4xl">
                      {candidateName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="space-y-1 pb-1">
                  <h2 className="text-xl sm:text-3xl font-black text-[#172033] leading-tight">
                    {candidateName}
                  </h2>
                  <p className="text-xs sm:text-base text-[#244F9A] font-bold">
                    {candidate.profession || 'Profissional em Busca de Oportunidades'}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-[#193B70]" />
                    <span>{candidate.municipality || 'Cunene'}</span>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {currentUser && currentUser.id !== candidate.id && (
                  <button
                    type="button"
                    onClick={handleToggleFollow}
                    className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      followed
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-[#244F9A] text-white hover:bg-[#193B70]'
                    }`}
                  >
                    {followed ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{followed ? 'A Seguir' : 'Seguir'}</span>
                  </button>
                )}

                {whatsappNumber && (
                  <a
                    href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xs"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Barra de Contadores Reais */}
          <div className="grid grid-cols-3 border-y border-slate-200/80 bg-[#F8FAFC] py-3.5 mt-6 text-center shrink-0">
            <div>
              <span className="block text-xl font-black text-[#193B70] tabular-nums">{candidatePosts.length}</span>
              <span className="text-xs text-[#64748B] font-semibold">Publicações</span>
            </div>
            <div>
              <span className="block text-xl font-black text-[#193B70] tabular-nums">{candidateProducts.length}</span>
              <span className="text-xs text-[#64748B] font-semibold">Produtos</span>
            </div>
            <div onClick={() => setIsFollowersModalOpen(true)} className="cursor-pointer hover:opacity-80 transition">
              <span className="block text-xl font-black text-[#193B70] tabular-nums">{followers.length}</span>
              <span className="text-xs text-[#64748B] font-semibold">Seguidores</span>
            </div>
          </div>

          {/* Abas de Navegação */}
          <div className="flex border-b border-slate-200 px-5 sm:px-8 space-x-6 text-xs sm:text-sm font-bold shrink-0 bg-[#F8FAFC]">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`py-3.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'profile'
                  ? 'border-[#244F9A] text-[#193B70]'
                  : 'border-transparent text-[#64748B] hover:text-[#172033]'
              }`}
            >
              Perfil & Currículo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`py-3.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'products'
                  ? 'border-[#244F9A] text-[#193B70]'
                  : 'border-transparent text-[#64748B] hover:text-[#172033]'
              }`}
            >
              <span>Produtos</span>
              <span className="bg-slate-200 text-[#172033] text-[10px] px-2 py-0.5 rounded-full font-black tabular-nums">
                {candidateProducts.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('posts')}
              className={`py-3.5 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'posts'
                  ? 'border-[#244F9A] text-[#193B70]'
                  : 'border-transparent text-[#64748B] hover:text-[#172033]'
              }`}
            >
              <span>Publicações</span>
              <span className="bg-slate-200 text-[#172033] text-[10px] px-2 py-0.5 rounded-full font-black tabular-nums">
                {candidatePosts.length}
              </span>
            </button>
          </div>

          {/* Conteúdo das Abas */}
          <div className="p-5 sm:p-8 space-y-6 flex-1 bg-white">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                
                {/* Currículo Vitae (CV) */}
                {candidate.cv_url ? (
                  <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-blue-100/70 text-[#244F9A] flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#172033]">Currículo Vitae (CV) Disponível</h4>
                        <p className="text-xs text-[#64748B]">Documento profissional com qualificações completas</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewingMedia([{ url: candidate.cv_url!, type: 'image', alt: 'Currículo Vitae' }])}
                      className="w-full sm:w-auto bg-[#244F9A] hover:bg-[#193B70] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Ver Currículo em Tela Cheia</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3 text-[#64748B] text-xs">
                    <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                    <span>Nenhum ficheiro de currículo anexado no momento.</span>
                  </div>
                )}

                {/* Resumo Profissional */}
                <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-slate-200/80 space-y-2">
                  <h4 className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#244F9A]" /> Resumo Profissional
                  </h4>
                  <p className="text-xs sm:text-sm text-[#263449] leading-relaxed whitespace-pre-line font-normal">
                    {candidate.bio || 'Sem resumo cadastrado no momento.'}
                  </p>
                </div>

                {/* Habilidades */}
                {candidate.skills && candidate.skills.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#F5B91B]" /> Competências & Habilidades
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills.map((skill, idx) => (
                        <span key={idx} className="bg-slate-100 text-[#172033] text-xs px-3 py-1.5 rounded-xl font-semibold border border-slate-200/60">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certificados */}
                {candidate.certificates && candidate.certificates.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-[#F5B91B]" /> Certificados & Conquistas
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {candidate.certificates.map((cert, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 text-xs text-[#263449] bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-200/60">
                          <Award className="w-4 h-4 text-[#F5B91B] shrink-0" />
                          <span className="font-semibold">{cert}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contactos */}
                <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-slate-200/80 space-y-3">
                  <h4 className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider">Contactos Diretos</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {candidate.email && (
                      <div className="flex items-center gap-2.5 text-[#263449]">
                        <Mail className="w-4 h-4 text-[#244F9A] shrink-0" />
                        <span className="truncate">{candidate.email}</span>
                      </div>
                    )}
                    {whatsappNumber && (
                      <div className="flex items-center gap-2.5 text-[#263449]">
                        <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{whatsappNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-4">
                {candidateProducts.length === 0 ? (
                  <div className="text-center py-16 bg-[#F8FAFC] rounded-2xl border border-slate-200/80 text-xs text-[#64748B]">
                    Este candidato ainda não tem produtos anunciados no marketplace.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                    {candidateProducts.map(prod => (
                      <div
                        key={prod.id}
                        onClick={() => onSelectProduct && onSelectProduct(prod)}
                        className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md cursor-pointer transition transform active:scale-95 group"
                      >
                        <div className="h-32 sm:h-36 bg-slate-100 overflow-hidden relative">
                          {prod.image_url ? (
                            <img src={prod.image_url} alt={prod.title} className="w-full h-full object-cover group-hover:scale-105 transition" referrerPolicy="no-referrer" />
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
                          <span className="text-[10px] text-[#64748B] font-semibold block">{prod.category}</span>
                          <h5 className="text-xs sm:text-sm font-bold text-[#172033] line-clamp-1 group-hover:text-[#244F9A] transition">
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

            {activeTab === 'posts' && (
              <div className="space-y-4">
                {candidatePosts.length === 0 ? (
                  <div className="text-center py-16 bg-[#F8FAFC] rounded-2xl border border-slate-200/80 text-xs text-[#64748B]">
                    Este candidato ainda não publicou nada na comunidade.
                  </div>
                ) : (
                  candidatePosts.map(p => (
                    <div
                      key={p.id}
                      onClick={() => onSelectPost && onSelectPost(p)}
                      className="bg-[#F8FAFC] hover:bg-slate-100 p-5 rounded-2xl border border-slate-200/80 space-y-3 cursor-pointer transition shadow-2xs group"
                    >
                      <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                        <span className="bg-blue-50 text-[#193B70] border border-[#244F9A]/20 font-bold px-2.5 py-0.5 rounded-lg">
                          {p.category || 'Geral'}
                        </span>
                        <span>{new Date(p.created_at).toLocaleDateString('pt-AO')}</span>
                      </div>

                      <p className="text-xs sm:text-sm text-[#263449] line-clamp-3 leading-relaxed">
                        {p.content}
                      </p>

                      {p.image_url && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 max-h-56 bg-slate-900/10">
                          <img src={p.image_url} alt="Imagem do post" className="w-full h-full object-cover group-hover:scale-102 transition" referrerPolicy="no-referrer" />
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs text-[#64748B] font-semibold">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5 font-bold">
                            <ThumbsUp className="w-4 h-4 text-[#244F9A]" />
                            {p.likes_count || 0}
                          </span>
                          <span className="flex items-center gap-1.5 font-bold">
                            <MessageSquare className="w-4 h-4 text-[#64748B]" />
                            {p.comments_count || 0}
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

      {/* Visualizador de Foto de Capa ou Avatar em Tela Cheia */}
      {viewingMedia && (
        <MediaViewer
          media={viewingMedia}
          onClose={() => setViewingMedia(null)}
        />
      )}

      <FollowersModal
        isOpen={isFollowersModalOpen}
        onClose={() => setIsFollowersModalOpen(false)}
        title={`Seguidores de ${candidateName}`}
        followers={followers}
      />
    </>
  );
};
