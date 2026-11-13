import React, { useState } from 'react';
import { Users, ThumbsUp, MessageSquare, Send, Image as ImageIcon, Trash2, Tag, Building2, User, Maximize2, BarChart3, Share2, AlertCircle, Plus, X, Heart, Bookmark, CheckCircle2, MoreHorizontal, MoreVertical } from 'lucide-react';
import { CommunityPost, UserProfile, COMMUNITY_CATEGORIES, PostReactionType } from '../lib/types';
import { StoreService } from '../lib/store';
import { toUserErrorMessage } from '../lib/errorMessages';
import { uploadToCloudinary } from '../lib/cloudinary';
import { supabase } from '../lib/supabase';
import { ImageUploader } from '../components/ImageUploader';
import { VerticalReactionsPicker, REACTIONS_CONFIG } from '../components/VerticalReactionsPicker';
import { soundEffects } from '../lib/soundEffects';
import { useLazyRenderList } from '../lib/useLazyRenderList';
import { useCommunityFeed } from '../lib/useCommunityFeed';

function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Agora';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Há ${diffMin}m`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Há ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Há ${diffDays}d`;
    return date.toLocaleDateString('pt-AO', { day: 'numeric', month: 'short' });
  } catch {
    return 'Recente';
  }
}

interface CommunityPageProps {
  posts: CommunityPost[];
  currentUser: UserProfile | null;
  onPostCreated: () => void;
  onPostUpdated: (post: CommunityPost) => void;
  onOpenAuth?: () => void;
  onSelectPost?: (post: CommunityPost) => void;
  onSelectCompany?: (company: UserProfile) => void;
  onSelectCandidate?: (candidate: UserProfile) => void;
}

export const CommunityPage: React.FC<CommunityPageProps> = ({
  posts,
  currentUser,
  onPostCreated,
  onPostUpdated,
  onOpenAuth,
  onSelectPost,
  onSelectCompany,
  onSelectCandidate
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [content, setContent] = useState('');
  const [postCategory, setPostCategory] = useState<'Emprego' | 'Negócios' | 'Dicas' | 'Formação' | 'Empresas' | 'Marketplace'>('Emprego');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [activeReactionPickerPostId, setActiveReactionPickerPostId] = useState<string | null>(null);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [activeOptionsMenuPostId, setActiveOptionsMenuPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Poll state
  const [showPollEditor, setShowPollEditor] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  // Native Alert Dialog State (matching exact user screenshot)
  const [dialogAlert, setDialogAlert] = useState<{
    message: string;
    actionText?: string;
    isConfirm?: boolean;
    onConfirm?: () => void;
  } | null>(null);

  const handleAuthorClick = async (authorId: string, authorName: string, authorAvatar?: string, isEmployer?: boolean) => {
    if (currentUser && currentUser.id === authorId) {
      if (isEmployer && onSelectCompany) {
        onSelectCompany(currentUser);
        return;
      }
      if (!isEmployer && onSelectCandidate) {
        onSelectCandidate(currentUser);
        return;
      }
    }

    let authorProfile: UserProfile = {
      id: authorId,
      email: '',
      full_name: authorName || 'Utilizador',
      role: isEmployer ? 'employer' : 'candidate',
      avatar_url: authorAvatar || '',
      municipality: 'Ondjiva',
      created_at: new Date().toISOString()
    };

    try {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', authorId).single();
      if (prof) {
        authorProfile.full_name = prof.full_name || authorProfile.full_name;
        authorProfile.municipality = prof.municipio || authorProfile.municipality;
        authorProfile.whatsapp = prof.whatsapp;
        authorProfile.phone = prof.whatsapp;
        if (prof.role === 'empresa' || prof.role === 'employer') {
          authorProfile.role = 'employer';
        }
      }

      if (authorProfile.role === 'employer') {
        const { data: comp } = await supabase.from('companies').select('*').eq('id', authorId).single();
        if (comp) {
          authorProfile.company_name = authorName || prof?.full_name;
          authorProfile.company_logo = authorAvatar;
          authorProfile.industry = comp.setor || 'Comércio e Serviços';
          authorProfile.nif = comp.nif;
          authorProfile.bio = comp.descricao;
        }
      }
    } catch {
      // ignore
    }

    if (authorProfile.role === 'employer') {
      if (onSelectCompany) onSelectCompany(authorProfile);
    } else {
      if (onSelectCandidate) onSelectCandidate(authorProfile);
    }
  };

  const { posts: feedPosts, refresh: refreshFeed } = useCommunityFeed(supabase);
  const activePosts = feedPosts.length > 0 ? feedPosts : posts;

  const filteredPosts = activePosts.filter(p => {
    if (selectedCategory === 'Todos') return true;
    return (p.category || '').toLowerCase() === selectedCategory.toLowerCase();
  });

  const {
    visibleItems: visiblePosts,
    hasMore: hasMorePosts,
    remainingCount: remainingPostsCount,
    loadMore: loadMorePosts,
    sentinelRef: postsSentinelRef
  } = useLazyRenderList(filteredPosts, {
    initialCount: 10,
    batchSize: 10,
    resetKey: selectedCategory
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setImageUrl(url);
    } catch {
      alert('Não foi possível carregar a imagem. Tenta novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) return; // Prevent duplicate submissions

    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    if (!content.trim()) return;

    setUploading(true);
    try {
      // 1. Obter e validar a sessão activa do Supabase Auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        if (onOpenAuth) onOpenAuth();
        throw new Error('A tua sessão expirou. Inicia sessão novamente.');
      }

      const isEmployer = currentUser.role === 'employer';
      const authorName = isEmployer
        ? (currentUser.company?.name || currentUser.company_name || currentUser.full_name)
        : currentUser.full_name;
      const authorAvatar = isEmployer
        ? (currentUser.company?.logo_url || currentUser.avatar_url)
        : currentUser.avatar_url;

      const cleanCompanyId = isEmployer 
        ? (currentUser.company?.id && !currentUser.company.id.startsWith('comp-') ? currentUser.company.id : null)
        : null;

      let pollData = null;
      if (showPollEditor && pollOptions.filter(o => o.trim()).length >= 2) {
        pollData = {
          options: pollOptions.filter(o => o.trim()).map(text => ({
            id: 'opt-' + Math.random().toString(36).substr(2, 9),
            text: text.trim(),
            votes: []
          })),
          total_votes: 0
        };
      }

      // 2. Inserção rigorosa na tabela community_posts com author_id UUID obrigatório
      const { data, error: postError } = await supabase
        .from('community_posts')
        .insert({
          author_id: user.id, // UUID real garantido pelo Supabase Auth
          author_type: isEmployer ? 'employer' : 'candidate',
          author_name: authorName || 'Utilizador',
          author_avatar: authorAvatar || '',
          company_id: cleanCompanyId,
          content: content.trim(),
          image_url: imageUrl || null,
          poll: pollData,
          category: postCategory
        })
        .select()
        .single();
      
      if (postError) throw postError;

      if (data) {
        StoreService.cacheLocalPost(data as CommunityPost);
        void refreshFeed();
      }

      setContent('');
      setImageUrl('');
      setShowPollEditor(false);
      setPollOptions(['', '']);
      soundEffects.playPostPublishedSound();
      onPostCreated();
    } catch (err: unknown) {
      console.warn('Erro ao publicar no feed:', err);
      alert(toUserErrorMessage(err, 'Não foi possível publicar. Verifica a tua sessão e tenta novamente.'));
    } finally {
      setUploading(false);
    }
  };

  const handleReactionSelect = async (postId: string, type: PostReactionType) => {
    soundEffects.playLikeSound();
    const currentPost = posts.find(p => p.id === postId);
    const userId = currentUser?.id || StoreService.getVisitorId();
    const updated = await StoreService.reactToPost(postId, type, userId, currentPost);
    setActiveReactionPickerPostId(null);
    if (updated) {
      if (!updated.image_url && currentPost?.image_url) {
        updated.image_url = currentPost.image_url;
      }
      onPostUpdated(updated);
    }
  };

  const checkCanDeletePost = (p: CommunityPost): boolean => {
    if (!p) return false;
    if (currentUser && (StoreService.isAdmin(currentUser) || currentUser.role === 'admin' || (currentUser as any).is_admin)) {
      return true;
    }
    const visitorId = StoreService.getVisitorId ? StoreService.getVisitorId() : null;
    if (visitorId && (p.author_id === visitorId || (p as any).user_id === visitorId)) {
      return true;
    }
    let localMyPosts: string[] = [];
    try {
      localMyPosts = JSON.parse(localStorage.getItem('my_created_post_ids') || '[]');
    } catch {}
    if (Array.isArray(localMyPosts) && localMyPosts.includes(p.id)) {
      return true;
    }
    if (!currentUser) return false;

    const uid = String(currentUser.id || '').trim();
    const uEmail = String(currentUser.email || '').toLowerCase().trim();
    const uName = String(currentUser.full_name || currentUser.company_name || '').toLowerCase().trim();

    const authorId = String(p.author_id || (p as any).user_id || (p as any).company_id || (p as any).seller_id || '').trim();
    const authorName = String(p.author_name || (p as any).company_name || '').toLowerCase().trim();

    if (uid && authorId && authorId === uid) return true;
    if (uEmail && authorId && authorId.toLowerCase() === uEmail) return true;
    if (uName && authorName && authorName === uName) return true;

    return false;
  };

  const handleDeletePost = (postId: string) => {
    const isAdmin = StoreService.isAdmin(currentUser);
    const postToDelete = posts.find(p => p.id === postId);
    const authorName = postToDelete?.author_name || 'este utilizador';
    const msg = isAdmin && postToDelete && postToDelete.author_id !== currentUser?.id
      ? `Tem a certeza de que deseja apagar permanentemente a publicação de "${authorName}" como Administrador da plataforma?`
      : 'Tem certeza que deseja excluir esta publicação?';

    setDialogAlert({
      message: msg,
      actionText: 'Excluir',
      isConfirm: true,
      onConfirm: () => {
        StoreService.deletePost(postId);
      }
    });
  };

  const handleReportPost = async (postId: string) => {
    setDialogAlert({
      message: 'Deseja denunciar esta publicação por conteúdo impróprio?',
      actionText: 'Denunciar',
      isConfirm: true,
      onConfirm: async () => {
        await StoreService.reportPost(postId);
        setDialogAlert({
          message: 'Obrigado. A sua denúncia foi enviada para revisão.',
          actionText: 'Fechar'
        });
      }
    });
  };

  const handleSharePost = (post: CommunityPost) => {
    const shareData = {
      title: 'CuneneVagas - Comunidade',
      text: post.content.substring(0, 100) + '...',
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => {
        navigator.clipboard.writeText(window.location.href);
        setDialogAlert({
          message: 'Ligação copiada para a área de transferência com sucesso!',
          actionText: 'Fechar'
        });
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      setDialogAlert({
        message: 'Ligação copiada para a área de transferência com sucesso!',
        actionText: 'Fechar'
      });
    }
  };

  const handleVoteOnPoll = async (postId: string, optionId: string) => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    const updated = await StoreService.voteOnPoll(postId, optionId, currentUser.id);
    if (updated) {
      onPostUpdated(updated);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    if (!commentText.trim()) return;

    const isEmployer = currentUser.role === 'employer';
    const authorName = isEmployer
      ? (currentUser.company?.name || currentUser.company_name || currentUser.full_name)
      : currentUser.full_name;
    const authorAvatar = isEmployer
      ? (currentUser.company?.logo_url || currentUser.avatar_url)
      : currentUser.avatar_url;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    await StoreService.addCommentToPost(postId, {
      author_id: currentUser.id,
      author_name: authorName,
      author_avatar: authorAvatar,
      content: commentText.trim()
    });

    setCommentText('');
    
    const allPosts = StoreService.getPosts();
    const updatedPost = allPosts.find(p => p.id === postId);
    if (updatedPost) {
      onPostUpdated(updatedPost);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-[#080808] min-h-screen px-4 sm:px-6 pt-5 pb-24 text-[var(--text-main)]">
      {/* Header Editorial */}
      <div className="pb-4 border-b border-[#D4AF37]/15 space-y-1">
        <div className="flex items-center gap-2 text-xs text-[#D4AF37] font-semibold">
          <span>Comunidade</span>
          <span aria-hidden="true">·</span>
          <span className="text-[#8e887b] font-normal">Rede Profissional do Cunene</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Feed da Comunidade</h1>
      </div>

      {/* Category Horizontal Filter Bar */}
      <div className="py-3 flex items-center gap-2 overflow-x-auto border-b border-[#D4AF37]/15 scrollbar-none bg-[#080808]">
        {COMMUNITY_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors duration-150 cursor-pointer ${
              selectedCategory === cat
                ? 'bg-[#D4AF37] text-[#080808] gold-cta'
                : 'bg-[#121212] border border-[#D4AF37]/20 text-[#c4beb0] hover:text-[#F5D77A]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Composer Editorial */}
      {currentUser ? (
        <div className="py-4 border-b border-[#D4AF37]/15 space-y-3 bg-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#D4AF37] text-slate-950 rounded-full flex items-center justify-center font-black text-sm shrink-0 overflow-hidden border border-[#D4AF37]/40">
              {currentUser.role === 'employer' ? (
                currentUser.company?.logo_url ? (
                  <img src={currentUser.company.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  (currentUser.company?.name || currentUser.full_name).charAt(0)
                )
              ) : (
                currentUser.avatar_url ? (
                  <img src={currentUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  currentUser.full_name.charAt(0)
                )
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-extrabold text-[#F5D77A] block text-xs truncate">
                {currentUser.role === 'employer' ? (currentUser.company?.name || currentUser.company_name || currentUser.full_name) : currentUser.full_name}
              </span>
              <span className={`text-[10px] font-bold ${
                currentUser.role === 'employer' ? 'text-[#D4AF37]' : 'text-amber-400'
              }`}>
                {currentUser.role === 'employer' ? 'Conta Empresa' : 'Conta Candidato'}
              </span>
            </div>
          </div>

          <form onSubmit={handleCreatePost} className="space-y-3">
            <textarea
              rows={2}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={
                currentUser.role === 'employer'
                  ? 'No que está a pensar a sua empresa? Publique uma novidade, vaga ou produto...'
                  : 'No que está a pensar? Partilhe uma novidade, dica ou conquista...'
              }
              className="w-full p-3.5 rounded-2xl bg-[#1C1811] border border-[#D4AF37]/30 text-white focus:outline-none focus:border-[#D4AF37] transition resize-none placeholder:text-[#BDB29F]"
            />

            <ImageUploader
              context="community-post"
              currentImageUrl={imageUrl}
              onUploadSuccess={url => setImageUrl(url)}
              onRemove={() => setImageUrl('')}
              label="Anexar Imagem ao Post"
            />

            {showPollEditor && (
              <div className="p-3.5 rounded-2xl bg-[#16140F] border border-[#D4AF37]/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#F5D77A] flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-[#D4AF37]" />
                    Criar Sondagem
                  </h4>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowPollEditor(false);
                      setPollOptions(['', '']);
                    }}
                    className="text-[#BDB29F] hover:text-rose-400 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={opt}
                        onChange={e => {
                          const newOpts = [...pollOptions];
                          newOpts[idx] = e.target.value;
                          setPollOptions(newOpts);
                        }}
                        placeholder={`Opção ${idx + 1}`}
                        className="flex-1 bg-[#1C1811] px-3 py-2 rounded-xl border border-[#D4AF37]/30 text-xs text-white focus:ring-1 focus:ring-[#D4AF37]"
                        maxLength={50}
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                          className="text-rose-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 5 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions([...pollOptions, ''])}
                      className="text-[11px] font-bold text-[#F5D77A] flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Opção
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-[#26241E]">
              <div className="flex items-center gap-2">
                <select
                  value={postCategory}
                  onChange={e => setPostCategory(e.target.value as any)}
                  className="bg-[#1C1811] text-[#F5D77A] px-3 py-1.5 rounded-xl text-xs font-semibold border border-[#D4AF37]/30"
                >
                  <option value="Emprego">Emprego</option>
                  <option value="Negócios">Negócios</option>
                  <option value="Dicas">Dicas</option>
                  <option value="Formação">Formação</option>
                  <option value="Empresas">Empresas</option>
                  <option value="Marketplace">Marketplace</option>
                </select>

                <button
                  type="button"
                  onClick={() => setShowPollEditor(!showPollEditor)}
                  className={`p-2 rounded-xl transition cursor-pointer ${showPollEditor ? 'bg-[#D4AF37] text-slate-950' : 'bg-[#16140F] text-[#F5D77A] hover:text-white border border-[#D4AF37]/30'}`}
                  title="Criar Sondagem"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
              </div>

              <button
                type="submit"
                disabled={!content.trim()}
                className="bg-[#D4AF37] hover:bg-[#F5D77A] text-slate-950 font-extrabold px-5 py-2 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95 gold-cta"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publicar</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="py-5 border-b border-[#D4AF37]/15 text-center space-y-2.5 bg-transparent">
          <p className="text-xs text-[#c4beb0]">Inicie sessão para partilhar publicações e interagir com a comunidade.</p>
          <button
            onClick={onOpenAuth}
            className="bg-[#D4AF37] hover:bg-[#F5D77A] text-slate-950 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer gold-cta"
          >
            Entrar no CuneneVagas
          </button>
        </div>
      )}

      {/* Feed list editorial */}
      <div className="bg-transparent">
        {filteredPosts.length === 0 ? (
          <div className="py-16 text-center text-[#8e887b] text-xs">
            Nenhuma publicação nesta categoria ainda.
          </div>
        ) : (
          visiblePosts.map(post => {
            const authorDisplayName = post.author_name || (post as any).author?.company_name || (post as any).author?.full_name || 'Profissional';
            const authorDisplayAvatar = post.author_avatar || (post as any).author?.avatar_url;
            const isEmpPost = post.author_type === 'employer' || (post as any).post_type === 'employer';
            const isOverlayOpen =
              activeReactionPickerPostId === post.id || activeOptionsMenuPostId === post.id;

            return (
              <article 
                key={post.id} 
                className={`cv-post cv-lazy-post-item py-5 relative ${isOverlayOpen ? 'is-overlay-open' : ''}`}
              >
                {/* Post author header */}
                <div className="pb-2 flex justify-between items-center gap-3">
                  <div 
                    onClick={() => handleAuthorClick(post.author_id, authorDisplayName, authorDisplayAvatar, isEmpPost)}
                    className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition select-none min-w-0"
                    title={`Ver perfil de ${authorDisplayName}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#16140F] border border-[#D4AF37]/30 text-[#F5D77A] flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                      {authorDisplayAvatar ? (
                        <img src={authorDisplayAvatar} alt={authorDisplayName} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        authorDisplayName.charAt(0)
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-semibold text-[#F5D77A] leading-snug group-hover:text-[#D4AF37] transition truncate max-w-[220px]">
                          {authorDisplayName}
                        </h4>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                      </div>
                      <div className="cv-post-meta flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-[#d6cba9]">{isEmpPost ? 'Empresa' : 'Candidato'}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatTimeAgo(post.created_at)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#D4AF37]">{post.category || 'Geral'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 relative shrink-0">
                    {/* Botão Apagar Rápido */}
                    {checkCanDeletePost(post) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePost(post.id);
                        }}
                        className="cv-editorial-btn text-rose-400 hover:text-rose-300 px-2 py-1.5 flex items-center gap-1 text-xs font-medium cursor-pointer"
                        title={StoreService.isAdmin(currentUser) && post.author_id !== currentUser?.id ? "Apagar publicação (Admin)" : "Excluir publicação"}
                      >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                        <span className="hidden xs:inline text-[11px]">Apagar</span>
                      </button>
                    )}

                    {/* Menu Três Pontos / Opções */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveOptionsMenuPostId(activeOptionsMenuPostId === post.id ? null : post.id);
                        }}
                        className="cv-editorial-btn text-[#8e887b] hover:text-[#F5D77A] p-2 transition cursor-pointer"
                        title="Mais opções da publicação"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {/* Dropdown de Opções */}
                      {activeOptionsMenuPostId === post.id && (
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1.5 w-48 bg-[#121212] rounded-xl border border-[#D4AF37]/25 py-1.5 z-30 animate-fadeIn"
                        >
                          {checkCanDeletePost(post) && (
                            <button
                              onClick={() => {
                                setActiveOptionsMenuPostId(null);
                                handleDeletePost(post.id);
                              }}
                              className="cv-editorial-btn w-full px-3 py-2 text-left text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-2 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 text-rose-400" />
                              <span>Apagar Publicação</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setActiveOptionsMenuPostId(null);
                              handleReportPost(post.id);
                            }}
                            className="cv-editorial-btn w-full px-3 py-2 text-left text-xs font-medium text-[#c4beb0] hover:text-[#F5D77A] flex items-center gap-2 transition cursor-pointer"
                          >
                            <AlertCircle className="w-4 h-4 text-[#D4AF37]" />
                            <span>Denunciar Conteúdo</span>
                          </button>
                          <button
                            onClick={() => {
                              setActiveOptionsMenuPostId(null);
                              handleSharePost(post);
                            }}
                            className="cv-editorial-btn w-full px-3 py-2 text-left text-xs font-medium text-[#c4beb0] hover:text-[#F5D77A] flex items-center gap-2 transition cursor-pointer"
                          >
                            <Send className="w-4 h-4 text-[#D4AF37] transform -rotate-12" />
                            <span>Partilhar / Copiar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Post content text */}
                {post.content && (
                  <div className="cv-post-content">
                    <p 
                      onClick={() => onSelectPost && onSelectPost(post)}
                      className="post-content-text cv-post-description text-sm sm:text-base text-[#EAE4D7] whitespace-pre-line cursor-pointer"
                    >
                      {post.content}
                    </p>
                  </div>
                )}

                {/* Post Poll */}
                {post.poll && (
                  <div className="px-4 pb-3">
                    <div className="p-3.5 rounded-2xl bg-[#16140F] border border-[#D4AF37]/25 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
                          <BarChart3 className="w-3.5 h-3.5 text-[#D4AF37]" /> Sondagem
                        </span>
                        <span className="text-[11px] font-semibold text-[#BDB29F]">
                          {post.poll.total_votes || 0} votos
                        </span>
                      </div>
                      <div className="space-y-2">
                        {post.poll.options.map((opt: any) => {
                          const hasVoted = currentUser && opt.votes?.includes(currentUser.id);
                          const percentage = post.poll?.total_votes && post.poll.total_votes > 0 
                            ? Math.round(((opt.votes?.length || 0) / post.poll.total_votes) * 100) 
                            : 0;
                          
                          return (
                            <button
                              key={opt.id}
                              disabled={!currentUser}
                              onClick={(e) => { e.stopPropagation(); handleVoteOnPoll(post.id, opt.id); }}
                              className={`w-full relative group overflow-hidden rounded-xl border transition-all active:scale-[0.98] cursor-pointer ${
                                hasVoted ? 'border-[#D4AF37] bg-[#241E13] font-bold' : 'border-[#D4AF37]/20 bg-[#1C1811] hover:border-[#D4AF37]/50'
                              }`}
                            >
                              <div 
                                className={`absolute inset-y-0 left-0 transition-all duration-700 ${hasVoted ? 'bg-[#D4AF37]/20' : 'bg-[#D4AF37]/10'}`}
                                style={{ width: `${percentage}%` }}
                              />
                              
                              <div className="relative px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
                                <span className={`font-semibold transition-colors ${hasVoted ? 'text-[#F5D77A]' : 'text-[#EAE4D7]'}`}>
                                  {opt.text}
                                </span>
                                <div className="flex items-center gap-2 font-bold">
                                  {hasVoted && <span className="text-[#D4AF37] text-[10px] uppercase">Votado</span>}
                                  <span className={hasVoted ? 'text-[#F5D77A]' : 'text-[#BDB29F]'}>
                                    {percentage}%
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Post Image: Editorial full-width clean radius */}
                {(() => {
                  const postImageUrl = post.image_url || (post as any).imagem_url || (post as any).media_url || (post as any).image;
                  if (!postImageUrl) return null;
                  return (
                    <div 
                      onClick={() => onSelectPost && onSelectPost(post)}
                      className="w-full overflow-hidden cursor-pointer select-none pt-1"
                    >
                      <img 
                        src={postImageUrl} 
                        alt="Publicação" 
                        loading="lazy"
                        className="cv-post-image mx-auto transition-opacity duration-200" 
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  );
                })()}

                {/* Counters row */}
                {((post.likes_count || 0) > 0 || (post.comments_count || 0) > 0) && (
                  <div className="cv-post-meta pt-2.5 flex items-center justify-between select-none">
                    <div>
                      {(post.likes_count || 0) > 0 && (
                        <span>
                          {post.likes_count} {post.likes_count === 1 ? 'gosto' : 'gostos'}
                        </span>
                      )}
                    </div>
                    <div>
                      {(post.comments_count || 0) > 0 && (
                        <button 
                          onClick={() => onSelectPost ? onSelectPost(post) : setActiveCommentsPostId(activeCommentsPostId === post.id ? null : post.id)}
                          className="cv-editorial-btn hover:underline cursor-pointer"
                        >
                          {post.comments_count} {post.comments_count === 1 ? 'comentário' : 'comentários'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Editorial Action Bar */}
                <div className="cv-post-actions text-xs select-none border-t border-[#D4AF37]/10 mt-2">
                  {/* Reaction Button */}
                  <div className="relative flex items-center">
                    <button
                      onClick={() => handleReactionSelect(post.id, post.user_reaction ? post.user_reaction : 'like')}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setActiveReactionPickerPostId(activeReactionPickerPostId === post.id ? null : post.id);
                      }}
                      className={`cv-editorial-btn py-1.5 flex items-center gap-1.5 font-semibold transition-colors cursor-pointer ${
                        post.user_reaction ? 'text-[#e6c34f]' : 'text-[#d6cba9]'
                      }`}
                    >
                      {post.user_reaction ? (
                        <span className="text-sm leading-none">{REACTIONS_CONFIG.find(r => r.type === post.user_reaction)?.emoji || '👍'}</span>
                      ) : (
                        <ThumbsUp className="w-4 h-4 text-[#D4AF37]" />
                      )}
                      <span>{post.user_reaction ? (REACTIONS_CONFIG.find(r => r.type === post.user_reaction)?.label || 'Gostei') : 'Gostar'}</span>
                    </button>

                    {activeReactionPickerPostId === post.id && (
                      <VerticalReactionsPicker
                        currentReaction={post.user_reaction}
                        onSelectReaction={(type) => handleReactionSelect(post.id, type)}
                        onClose={() => setActiveReactionPickerPostId(null)}
                        position="top"
                      />
                    )}
                  </div>

                  {/* Comment Button */}
                  <button
                    onClick={() => {
                      if (onSelectPost) {
                        onSelectPost(post);
                      } else {
                        setActiveCommentsPostId(activeCommentsPostId === post.id ? null : post.id);
                      }
                    }}
                    className="cv-editorial-btn py-1.5 flex items-center gap-1.5 font-semibold transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 text-[#D4AF37]" />
                    <span>Comentar</span>
                  </button>

                  {/* Share Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                        try { navigator.vibrate(12); } catch {}
                      }
                      handleSharePost(post);
                    }}
                    className="cv-editorial-btn py-1.5 flex items-center gap-1.5 font-semibold transition-colors cursor-pointer"
                    title="Partilhar publicação"
                  >
                    <Send className="w-4 h-4 text-[#D4AF37] transform -rotate-12 shrink-0" />
                    <span>Partilhar</span>
                  </button>
                </div>

                {/* Inline Comments Section (if expanded without opening fullscreen modal) */}
                {activeCommentsPostId === post.id && (
                  <div className="p-3 border-t border-[#D4AF37]/20 bg-[#100F0C] space-y-2.5">
                    <div className="space-y-2">
                      {(!post.comments || post.comments.filter((c: any) => c.author_id !== 'system_reactions_metadata').length === 0) ? (
                        <p className="text-xs text-[#BDB29F] italic text-center py-2">Sem comentários ainda. Seja o primeiro a comentar!</p>
                      ) : (
                        post.comments.filter((c: any) => c.author_id !== 'system_reactions_metadata').map((c: any) => (
                          <div key={c.id} className="bg-[#16140F] p-2.5 rounded-xl border border-[#D4AF37]/25 text-xs space-y-0.5">
                            <span 
                              onClick={() => handleAuthorClick(c.author_id, c.author_name, c.author_avatar, false)}
                              className="font-bold text-[#F5D77A] block text-xs cursor-pointer hover:underline hover:text-[#D4AF37] transition"
                              title={`Ver perfil de ${c.author_name}`}
                            >
                              {c.author_name}
                            </span>
                            <p className="text-[#EAE4D7]">{c.content}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {currentUser && (
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          placeholder="Escreva um comentário..."
                          className="flex-1 bg-[#1C1811] text-[#EAE4D7] placeholder:text-[#8E8575] px-3.5 py-2 rounded-xl border border-[#D4AF37]/30 text-xs focus:outline-none focus:border-[#D4AF37]"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddComment(post.id);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          className="bg-[#D4AF37] hover:bg-[#F5D77A] text-[#080808] px-3.5 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition"
                        >
                          Enviar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}

        {hasMorePosts && (
          <div ref={postsSentinelRef} className="py-6 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={loadMorePosts}
              className="cv-card-pressable px-5 py-2.5 rounded-xl bg-[#16140F] hover:bg-[#1E1A12] text-[#F5D77A] border border-[#D4AF37]/35 hover:border-[#D4AF37] text-xs font-bold transition cursor-pointer active:scale-[0.96]"
            >
              Carregar mais publicações ({remainingPostsCount} restantes)
            </button>
          </div>
        )}
      </div>

      {/* Diálogo / Aviso de Apagar Publicação (Z-[9999] Infalível, NUNCA fica escondido) */}
      {dialogAlert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn select-none">
          <div className="bg-[#121212] rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-[#D4AF37]/30 text-center animate-scaleUp">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border ${
              dialogAlert.isConfirm 
                ? 'bg-rose-950/60 text-rose-400 border-rose-500/40' 
                : 'bg-[#1C1811] text-[#D4AF37] border-[#D4AF37]/40'
            }`}>
              {dialogAlert.isConfirm ? (
                <Trash2 className="w-7 h-7 text-rose-400" />
              ) : (
                <AlertCircle className="w-7 h-7 text-[#D4AF37]" />
              )}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-black text-[#F5D77A]">
                {dialogAlert.isConfirm ? 'Apagar Publicação?' : 'Aviso da Publicação'}
              </h3>
              <p className="text-xs sm:text-sm text-[#BDB29F] leading-relaxed px-1">
                {dialogAlert.message}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              {dialogAlert.isConfirm && (
                <button
                  type="button"
                  onClick={() => setDialogAlert(null)}
                  className="w-full py-3 px-4 bg-[#1C1811] hover:bg-[#241E13] text-[#F5D77A] font-bold text-xs sm:text-sm rounded-xl border border-[#D4AF37]/30 transition cursor-pointer active:scale-95"
                >
                  Cancelar
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const cb = dialogAlert.onConfirm;
                  setDialogAlert(null);
                  if (cb) cb();
                }}
                className={`w-full py-3 px-4 ${
                  dialogAlert.isConfirm 
                    ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                    : 'bg-[#D4AF37] hover:bg-[#F5D77A] text-[#080808] col-span-2'
                } font-extrabold text-xs sm:text-sm rounded-xl transition shadow-md cursor-pointer active:scale-95`}
              >
                {dialogAlert.actionText || 'Apagar Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
