import React, { useState } from 'react';
import { Users, ThumbsUp, MessageSquare, Send, Image as ImageIcon, Trash2, Tag, Building2, User, Maximize2, BarChart3, Share2, AlertCircle, Plus, X, Heart, Bookmark, CheckCircle2, MoreHorizontal, MoreVertical } from 'lucide-react';
import { CommunityPost, UserProfile, COMMUNITY_CATEGORIES, PostReactionType } from '../lib/types';
import { StoreService } from '../lib/store';
import { uploadToCloudinary } from '../lib/cloudinary';
import { supabase } from '../lib/supabase';
import { ImageUploader } from '../components/ImageUploader';
import { VerticalReactionsPicker, REACTIONS_CONFIG } from '../components/VerticalReactionsPicker';
import { soundEffects } from '../lib/soundEffects';

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

  // Use o prop 'posts' do App.tsx como fonte de verdade
  const filteredPosts = posts.filter(p => {
    if (selectedCategory === 'Todos') return true;
    return p.category === selectedCategory;
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setImageUrl(url);
    } catch {
      alert('Erro ao carregar imagem.');
    } finally {
      setUploading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    if (!content.trim()) return;

    setUploading(true);
    try {
      const isEmployer = currentUser.role === 'employer';
      const authorName = isEmployer
        ? (currentUser.company?.name || currentUser.company_name || currentUser.full_name)
        : currentUser.full_name;
      const authorAvatar = isEmployer
        ? (currentUser.company?.logo_url || currentUser.avatar_url)
        : currentUser.avatar_url;

      const cleanCompanyId = isEmployer 
        ? (currentUser.company?.id && !currentUser.company.id.startsWith('comp-') ? currentUser.company.id : currentUser.id)
        : undefined;

      let pollData;
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

      const { data, error: postError } = await supabase
        .from('community_posts')
        .insert({
          author_id: currentUser.id,
          author_type: isEmployer ? 'employer' : 'candidate',
          author_name: authorName,
          company_id: cleanCompanyId,
          content: content.trim(),
          image_url: imageUrl || undefined,
          category: postCategory
        })
        .select()
        .single();
      
      if (postError) throw postError;
      
      setContent('');
      setImageUrl('');
      setShowPollEditor(false);
      setPollOptions(['', '']);
      soundEffects.playPostPublishedSound();
      onPostCreated();
    } catch (err: any) {
      alert(err.message || 'Erro ao publicar. Tente novamente.');
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
        onPostCreated();
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
    <div className="max-w-2xl mx-auto bg-white min-h-screen sm:rounded-3xl sm:border sm:border-slate-200/80 shadow-2xs sm:my-3 overflow-hidden pb-24">
      {/* Header - Native Facebook/TikTok Style Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100 space-y-1">
        <div className="flex items-center gap-2 text-[11px] font-bold text-[#0F4C9C]">
          <span>Comunidade</span>
          <span>·</span>
          <span>Rede Social & Profissional do Cunene</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Feed da Comunidade</h1>
      </div>

      {/* Category Horizontal Filter Bar */}
      <div className="px-3 py-2.5 flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 scrollbar-none bg-white">
        {COMMUNITY_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-150 active:scale-95 cursor-pointer ${
              selectedCategory === cat
                ? 'bg-[#0F4C9C] text-white shadow-2xs'
                : 'bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Native Facebook-style Composer */}
      {currentUser ? (
        <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0F4C9C] text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
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
              <span className="font-bold text-slate-900 block text-xs truncate">
                {currentUser.role === 'employer' ? (currentUser.company?.name || currentUser.company_name || currentUser.full_name) : currentUser.full_name}
              </span>
              <span className={`text-[10px] font-semibold ${
                currentUser.role === 'employer' ? 'text-amber-700' : 'text-[#0F4C9C]'
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
              className="w-full p-3.5 rounded-2xl bg-white border border-slate-200/90 text-xs sm:text-sm text-[#111827] focus:outline-none focus:border-[#0F4C9C] transition resize-none placeholder:text-slate-400"
            />

            <ImageUploader
              context="community-post"
              currentImageUrl={imageUrl}
              onUploadSuccess={url => setImageUrl(url)}
              onRemove={() => setImageUrl('')}
              label="Anexar Imagem ao Post"
            />

            {showPollEditor && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-[#0F4C9C]" />
                    Criar Sondagem
                  </h4>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowPollEditor(false);
                      setPollOptions(['', '']);
                    }}
                    className="text-slate-400 hover:text-rose-500 p-1"
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
                        className="flex-1 bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-[#0F4C9C]"
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
                      className="text-[11px] font-bold text-[#0F4C9C] flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Opção
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <select
                  value={postCategory}
                  onChange={e => setPostCategory(e.target.value as any)}
                  className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold border-none focus:ring-0"
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
                  className={`p-2 rounded-xl transition cursor-pointer ${showPollEditor ? 'bg-blue-100 text-[#0F4C9C]' : 'bg-slate-100 text-slate-500 hover:text-[#0F4C9C]'}`}
                  title="Criar Sondagem"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
              </div>

              <button
                type="submit"
                disabled={!content.trim()}
                className="bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-bold px-5 py-2 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publicar</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="p-4 border-b border-slate-100 text-center space-y-2 bg-white">
          <p className="text-xs text-slate-600">Inicie sessão para partilhar publicações e interagir com a comunidade.</p>
          <button
            onClick={onOpenAuth}
            className="bg-[#0F4C9C] text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer active:scale-95"
          >
            Entrar no CuneneVagas
          </button>
        </div>
      )}

      {/* Feed list - Pure Native Facebook / TikTok Class Posts without White Cards */}
      <div className="divide-y divide-slate-100/80 bg-white">
        {filteredPosts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Nenhuma publicação nesta categoria ainda.
          </div>
        ) : (
          filteredPosts.map(post => {
            const authorDisplayName = post.author_name || (post as any).author?.company_name || (post as any).author?.full_name || 'Profissional';
            const authorDisplayAvatar = post.author_avatar || (post as any).author?.avatar_url;
            const isEmpPost = post.author_type === 'employer' || (post as any).post_type === 'employer';

            return (
              <article 
                key={post.id} 
                className="bg-white hover:bg-slate-50/50 transition-colors py-4 sm:py-5 px-3 sm:px-6 relative border-b border-slate-100 last:border-b-0"
              >
                {/* Post author header */}
                <div className="px-4 pt-4 pb-2.5 flex justify-between items-center">
                  <div 
                    onClick={() => handleAuthorClick(post.author_id, authorDisplayName, authorDisplayAvatar, isEmpPost)}
                    className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition select-none min-w-0"
                    title={`Ver perfil de ${authorDisplayName}`}
                  >
                    <div className="relative">
                      <div className="w-11 h-11 rounded-2xl bg-[#0F4C9C] text-white flex items-center justify-center font-extrabold text-sm shrink-0 overflow-hidden ring-2 ring-blue-500/10 shadow-2xs">
                        {authorDisplayAvatar ? (
                          <img src={authorDisplayAvatar} alt={authorDisplayName} className="w-full h-full object-cover" />
                        ) : (
                          authorDisplayName.charAt(0)
                        )}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" title="Ativo" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-extrabold text-slate-950 leading-snug group-hover:text-[#0F4C9C] transition truncate max-w-[200px]">
                          {authorDisplayName}
                        </h4>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0F4C9C] shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-0.5">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          isEmpPost ? 'bg-amber-50 text-amber-800 border border-amber-200/60' : 'bg-blue-50 text-[#0F4C9C] border border-blue-200/60'
                        }`}>
                          {isEmpPost ? 'Empresa' : 'Candidato'}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-slate-400 font-semibold">{formatTimeAgo(post.created_at)}</span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-[#0F4C9C] font-extrabold">{post.category || 'Geral'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 relative">
                    {/* Botão Apagar Rápido */}
                    {checkCanDeletePost(post) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePost(post.id);
                        }}
                        className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 flex items-center gap-1 transition rounded-xl text-xs font-bold active:scale-90 cursor-pointer border border-red-200"
                        title={StoreService.isAdmin(currentUser) && post.author_id !== currentUser?.id ? "Apagar publicação (Admin)" : "Excluir publicação"}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                        <span className="hidden xs:inline text-[11px]">Apagar</span>
                      </button>
                    )}

                    {/* Menu Três Pontos / Opções Moderno 2026 */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveOptionsMenuPostId(activeOptionsMenuPostId === post.id ? null : post.id);
                        }}
                        className="text-slate-400 hover:text-slate-800 p-2 transition rounded-xl hover:bg-slate-100 active:scale-90 cursor-pointer"
                        title="Mais opções da publicação"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {/* Dropdown de Opções */}
                      {activeOptionsMenuPostId === post.id && (
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 animate-fadeIn"
                        >
                          {checkCanDeletePost(post) && (
                            <button
                              onClick={() => {
                                setActiveOptionsMenuPostId(null);
                                handleDeletePost(post.id);
                              }}
                              className="w-full px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                              <span>Apagar Publicação</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setActiveOptionsMenuPostId(null);
                              handleReportPost(post.id);
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer"
                          >
                            <AlertCircle className="w-4 h-4 text-slate-500" />
                            <span>Denunciar Conteúdo</span>
                          </button>
                          <button
                            onClick={() => {
                              setActiveOptionsMenuPostId(null);
                              handleSharePost(post);
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer"
                          >
                            <Send className="w-4 h-4 text-[#0F4C9C] transform -rotate-12" />
                            <span>Partilhar / Copiar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Post content text */}
                {post.content && (
                  <p 
                    onClick={() => onSelectPost && onSelectPost(post)}
                    className="px-4 pb-3 text-sm sm:text-base text-slate-900 leading-relaxed whitespace-pre-line cursor-pointer font-normal tracking-tight"
                  >
                    {post.content}
                  </p>
                )}

                {/* Post Poll */}
                {post.poll && (
                  <div className="px-4 pb-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <BarChart3 className="w-3.5 h-3.5 text-[#0F4C9C]" /> Sondagem
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {post.poll.total_votes || 0} votos
                        </span>
                      </div>
                      <div className="space-y-2">
                        {post.poll.options.map(opt => {
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
                                hasVoted ? 'border-[#0F4C9C] bg-blue-50/40 font-bold' : 'border-slate-200 bg-white hover:border-[#0F4C9C]/40'
                              }`}
                            >
                              <div 
                                className={`absolute inset-y-0 left-0 transition-all duration-700 ${hasVoted ? 'bg-[#0F4C9C]/15' : 'bg-slate-100/80'}`}
                                style={{ width: `${percentage}%` }}
                              />
                              
                              <div className="relative px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
                                <span className={`font-semibold transition-colors ${hasVoted ? 'text-[#0F4C9C]' : 'text-slate-800'}`}>
                                  {opt.text}
                                </span>
                                <div className="flex items-center gap-2 font-bold">
                                  {hasVoted && <span className="text-[#0F4C9C] text-[10px] uppercase">Votado</span>}
                                  <span className={hasVoted ? 'text-[#0F4C9C]' : 'text-slate-500'}>
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

                {/* Post Image: EDGE-TO-EDGE / FULL-BLEED (Native Facebook / TikTok style) */}
                {(() => {
                  const postImageUrl = post.image_url || (post as any).imagem_url || (post as any).media_url || (post as any).image;
                  if (!postImageUrl) return null;
                  return (
                    <div 
                      onClick={() => onSelectPost && onSelectPost(post)}
                      className="w-full bg-slate-900/5 overflow-hidden cursor-pointer select-none"
                    >
                      <img 
                        src={postImageUrl} 
                        alt="Publicação" 
                        loading="lazy"
                        className="w-full max-h-[550px] object-cover sm:object-contain mx-auto transition-opacity duration-200" 
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  );
                })()}

                {/* Counters row (Likes count and comments count) */}
                <div className="px-4 py-2 flex items-center justify-between text-xs text-slate-500 select-none">
                  <div className="flex items-center gap-1.5">
                    {(post.likes_count || 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full bg-[#0F4C9C] text-white flex items-center justify-center text-[10px]">👍</span>
                        <span className="font-semibold text-slate-700">{post.likes_count}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {(post.comments_count || 0) > 0 && (
                      <button 
                        onClick={() => onSelectPost ? onSelectPost(post) : setActiveCommentsPostId(activeCommentsPostId === post.id ? null : post.id)}
                        className="hover:underline cursor-pointer"
                      >
                        {post.comments_count} {post.comments_count === 1 ? 'comentário' : 'comentários'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Modern 2026 Native Action Bar */}
                <div className="px-3 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-1 text-xs select-none">
                  {/* Reaction Button */}
                  <div className="relative flex-1 flex justify-center">
                    <button
                      onClick={() => handleReactionSelect(post.id, post.user_reaction ? post.user_reaction : 'like')}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setActiveReactionPickerPostId(activeReactionPickerPostId === post.id ? null : post.id);
                      }}
                      className={`w-full py-2 px-2.5 rounded-2xl flex items-center justify-center gap-1.5 font-extrabold transition-all active:scale-95 cursor-pointer ${
                        post.user_reaction ? 'bg-blue-50 text-[#0F4C9C] shadow-2xs' : 'hover:bg-slate-200/60 text-slate-700'
                      }`}
                    >
                      {post.user_reaction ? (
                        <span className="text-base leading-none">{REACTIONS_CONFIG.find(r => r.type === post.user_reaction)?.emoji || '👍'}</span>
                      ) : (
                        <ThumbsUp className="w-4 h-4 text-slate-500" />
                      )}
                      <span>{post.user_reaction ? (REACTIONS_CONFIG.find(r => r.type === post.user_reaction)?.label || 'Gostei') : 'Gostar'}</span>
                      {(post.likes_count || 0) > 0 && (
                        <span className="ml-0.5 text-[11px] font-black text-[#0F4C9C]">({post.likes_count})</span>
                      )}
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
                    className="flex-1 py-2 px-2.5 rounded-2xl flex items-center justify-center gap-1.5 font-bold hover:bg-slate-200/60 active:scale-95 transition-all cursor-pointer text-slate-700"
                  >
                    <MessageSquare className="w-4 h-4 text-slate-500" />
                    <span>Comentar</span>
                    {(post.comments_count || 0) > 0 && (
                      <span className="ml-0.5 text-[11px] font-black text-slate-500">({post.comments_count})</span>
                    )}
                  </button>

                  {/* Modern 2026 Native Share Button (Paperplane / Forward) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                        try { navigator.vibrate(12); } catch {}
                      }
                      handleSharePost(post);
                    }}
                    className="flex-1 py-2 px-2.5 rounded-2xl flex items-center justify-center gap-1.5 font-extrabold bg-blue-50/80 hover:bg-blue-100 text-[#0F4C9C] active:scale-95 transition-all cursor-pointer border border-blue-100 shadow-2xs"
                    title="Partilhar publicação (Nativo 2026)"
                  >
                    <Send className="w-4 h-4 text-[#0F4C9C] transform -rotate-12 shrink-0" />
                    <span>Partilhar</span>
                  </button>
                </div>

                {/* Inline Comments Section (if expanded without opening fullscreen modal) */}
                {activeCommentsPostId === post.id && (
                  <div className="p-3 border-t border-slate-100 bg-slate-50/70 space-y-2.5">
                    <div className="space-y-2">
                      {(!post.comments || post.comments.filter(c => c.author_id !== 'system_reactions_metadata').length === 0) ? (
                        <p className="text-xs text-slate-400 italic text-center py-2">Sem comentários ainda. Seja o primeiro a comentar!</p>
                      ) : (
                        post.comments.filter(c => c.author_id !== 'system_reactions_metadata').map(c => (
                          <div key={c.id} className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-xs space-y-0.5">
                            <span 
                              onClick={() => handleAuthorClick(c.author_id, c.author_name, c.author_avatar, false)}
                              className="font-bold text-slate-900 block text-xs cursor-pointer hover:underline hover:text-[#0F4C9C] transition"
                              title={`Ver perfil de ${c.author_name}`}
                            >
                              {c.author_name}
                            </span>
                            <p className="text-slate-800">{c.content}</p>
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
                          className="flex-1 bg-white px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0F4C9C]"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddComment(post.id);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          className="bg-[#0F4C9C] text-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer"
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
      </div>

      {/* Diálogo / Aviso de Apagar Publicação (Z-[9999] Infalível, NUNCA fica escondido) */}
      {dialogAlert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn select-none">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-slate-200 text-center animate-scaleUp">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border ${
              dialogAlert.isConfirm 
                ? 'bg-rose-50 text-rose-600 border-rose-200' 
                : 'bg-blue-50 text-[#0F4C9C] border-blue-200'
            }`}>
              {dialogAlert.isConfirm ? (
                <Trash2 className="w-7 h-7 text-rose-600" />
              ) : (
                <AlertCircle className="w-7 h-7 text-[#0F4C9C]" />
              )}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-black text-slate-950">
                {dialogAlert.isConfirm ? 'Apagar Publicação?' : 'Aviso da Publicação'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed px-1">
                {dialogAlert.message}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              {dialogAlert.isConfirm && (
                <button
                  type="button"
                  onClick={() => setDialogAlert(null)}
                  className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer active:scale-95"
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
                    : 'bg-[#0F4C9C] hover:bg-blue-700 text-white col-span-2'
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
