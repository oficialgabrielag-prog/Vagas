import React, { useState, useMemo } from 'react';
import { X, ThumbsUp, MessageSquare, Send, Calendar, User, Building2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { CommunityPost, UserProfile, PostReactionType, PostComment } from '../lib/types';
import { StoreService } from '../lib/store';
import { supabase } from '../lib/supabase';
import { VerticalReactionsPicker, REACTIONS_CONFIG } from './VerticalReactionsPicker';
import { MediaViewer } from './MediaViewer';
import { soundEffects } from '../lib/soundEffects';

interface PostDetailModalProps {
  post: CommunityPost | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onPostUpdated: (updatedPost: CommunityPost) => void;
  onOpenAuth?: () => void;
  onSelectCompany?: (company: UserProfile) => void;
  onSelectCandidate?: (candidate: UserProfile) => void;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  post,
  isOpen,
  onClose,
  currentUser,
  onPostUpdated,
  onOpenAuth,
  onSelectCompany,
  onSelectCandidate,
}) => {
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<PostComment | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ message: string; postId: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingMedia, setViewingMedia] = useState(false);

  // Group comments into parents and children
  const { topLevelComments, repliesMap } = useMemo(() => {
    const top: PostComment[] = [];
    const replies: Record<string, PostComment[]> = {};
    
    if (post?.comments) {
      post.comments.filter(c => c.author_id !== 'system_reactions_metadata').forEach(c => {
        if (!c.parent_id) {
          top.push(c);
        } else {
          if (!replies[c.parent_id]) replies[c.parent_id] = [];
          replies[c.parent_id].push(c);
        }
      });
    }
    
    return { topLevelComments: top, repliesMap: replies };
  }, [post?.comments]);

  if (!isOpen || !post) return null;

  const authorDisplayName =
    post.author_name || (post as any).author?.company_name || (post as any).author?.full_name || 'Profissional';
  const authorDisplayAvatar = post.author_avatar || (post as any).author?.avatar_url;
  const isEmpPost = post.author_type === 'employer' || (post as any).post_type === 'employer';

  const handleAuthorClick = async (authorId: string, authorName: string, authorAvatar?: string, isEmployer?: boolean) => {
    onClose();

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

  const handleReaction = async (type: PostReactionType) => {
    soundEffects.playLikeSound();
    const userId = currentUser?.id || StoreService.getVisitorId();
    const updated = await StoreService.reactToPost(post.id, type, userId);
    setShowReactions(false);
    if (updated) {
      onPostUpdated(updated);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    if (!commentText.trim()) return;

    setIsSubmitting(true);

    const commentAuthorName =
      currentUser.role === 'employer'
        ? currentUser.company?.name || currentUser.company_name || currentUser.full_name
        : currentUser.full_name;

    const commentAuthorAvatar =
      currentUser.role === 'employer'
        ? currentUser.company?.logo_url || currentUser.avatar_url
        : currentUser.avatar_url;

    await StoreService.addCommentToPost(post.id, {
      author_id: currentUser.id,
      author_name: commentAuthorName,
      author_avatar: commentAuthorAvatar,
      content: commentText.trim(),
      parent_id: replyingTo?.id
    });

    setCommentText('');
    setReplyingTo(null);
    setIsSubmitting(false);
    
    // Snappy update
    const allPosts = StoreService.getPosts();
    const updatedPost = allPosts.find(p => p.id === post.id);
    if (updatedPost) {
      onPostUpdated(updatedPost);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    await StoreService.likeComment(post.id, commentId, currentUser.id);
    
    // Snappy update
    const allPosts = StoreService.getPosts();
    const updatedPost = allPosts.find(p => p.id === post.id);
    if (updatedPost) {
      onPostUpdated(updatedPost);
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedComments(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#121212] rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-[#D4AF37]/30 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#16140F] p-4 sm:p-5 text-[#F5D77A] border-b border-[#D4AF37]/30 flex items-center justify-between shrink-0">
          <div 
            onClick={() => handleAuthorClick(post.author_id, authorDisplayName, authorDisplayAvatar, isEmpPost)}
            className="flex items-center gap-3 cursor-pointer group"
            title={`Ver perfil completo de ${authorDisplayName}`}
          >
            <div className="w-10 h-10 rounded-full bg-[#1C1811] border border-[#D4AF37]/40 flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 group-hover:scale-105 transition">
              {authorDisplayAvatar ? (
                <img src={authorDisplayAvatar} alt={authorDisplayName} className="w-full h-full object-cover" />
              ) : (
                authorDisplayName.charAt(0)
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold truncate max-w-[200px] sm:max-w-xs group-hover:underline text-[#F5D77A]">{authorDisplayName}</h3>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-sm bg-[#1C1811] text-[#F5D77A] border border-[#D4AF37]/40`}>
                  {isEmpPost ? 'Empresa' : 'Candidato'}
                </span>
              </div>
              <p className="text-[11px] text-[#BDB29F]">
                {new Date(post.created_at).toLocaleDateString('pt-AO')} • {post.category || 'Geral'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser && (
              StoreService.isAdmin(currentUser) ||
              currentUser.role === 'admin' ||
              post.author_id === currentUser.id ||
              (post as any).user_id === currentUser.id ||
              (post as any).company_id === currentUser.id ||
              (post as any).seller_id === currentUser.id ||
              (currentUser.email && post.author_id === currentUser.email) ||
              (currentUser.full_name && post.author_name === currentUser.full_name) ||
              (currentUser.company_name && post.author_name === currentUser.company_name)
            ) && (
              <button
                onClick={() => {
                  const isAdmin = StoreService.isAdmin(currentUser);
                  const msg = isAdmin && post.author_id !== currentUser?.id
                    ? `Tem a certeza de que deseja apagar a publicação de "${post.author_name || 'utilizador'}" como Administrador da plataforma?`
                    : 'Tem a certeza que deseja eliminar esta publicação permanentemente? Esta ação não pode ser desfeita.';
                  setShowDeleteConfirm({
                    message: msg,
                    postId: post.id
                  });
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl transition-all border border-rose-400/30 flex items-center gap-1.5 text-xs font-bold shadow-md cursor-pointer active:scale-95"
                title="Apagar publicação"
              >
                <Trash2 className="w-4 h-4 text-white" />
                <span>
                  {StoreService.isAdmin(currentUser) && post.author_id !== currentUser?.id ? 'Apagar (Admin)' : 'Apagar'}
                </span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-[#F5D77A] hover:text-white p-1.5 rounded-full hover:bg-[#1C1811] transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Post Content & Comments Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-[#121212]">
          {/* Main Text Content */}
          <div className="text-sm sm:text-base text-[#EAE4D7] leading-relaxed whitespace-pre-line font-normal post-content-text" data-post-text="true">
            {post.content}
          </div>

          {/* Full Resolution Image */}
          {post.image_url && (
            <div className="rounded-2xl overflow-hidden border border-[#D4AF37]/30 bg-[#121212] max-h-[450px] cursor-pointer" onClick={() => setViewingMedia(true)}>
              <img
                src={post.image_url}
                alt="Fotografia da publicação"
                className="w-full h-full object-contain max-h-[450px] mx-auto"
                onError={(e) => {
                  e.currentTarget.parentElement?.classList.add('hidden');
                }}
              />
            </div>
          )}

          {viewingMedia && post.image_url && (
            <MediaViewer
              media={[{ url: post.image_url, type: 'image', alt: 'Fotografia da publicação' }]}
              onClose={() => setViewingMedia(false)}
            />
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between border-y border-[#26241E] py-3 text-xs relative">
            <div className="flex items-center gap-1.5">
              <div className="relative inline-flex items-center rounded-xl bg-[#16140F] border border-[#D4AF37]/30 p-0.5">
                <button
                  onClick={() => handleReaction(post.user_reaction || 'like')}
                  className={`flex items-center gap-2 font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    post.user_reaction
                      ? 'bg-[#1C1811] text-[#F5D77A]'
                      : 'text-[#F5D77A] hover:bg-[#201A12]'
                  }`}
                  title={post.user_reaction ? 'Remover reação' : 'Gostar'}
                >
                  {post.user_reaction ? (
                    <span className="text-base leading-none">{REACTIONS_CONFIG.find(r => r.type === post.user_reaction)?.emoji || '👍'}</span>
                  ) : (
                    <ThumbsUp className="w-4 h-4 text-[#D4AF37]" />
                  )}
                  <span>{post.user_reaction ? (REACTIONS_CONFIG.find(r => r.type === post.user_reaction)?.label || 'Gostei') : 'Gostar'}</span>
                </button>

                <button
                  onClick={() => setShowReactions(!showReactions)}
                  className="py-1.5 px-2 rounded-r-lg hover:bg-[#201A12] text-[#F5D77A] transition cursor-pointer"
                  title="Outras reações"
                >
                  <span className="text-[10px]">▼</span>
                </button>

                {/* Vertical Reaction Popover */}
                {showReactions && (
                  <VerticalReactionsPicker
                    currentReaction={post.user_reaction}
                    onSelectReaction={handleReaction}
                    onClose={() => setShowReactions(false)}
                    position="top"
                  />
                )}
              </div>
              
              <span className="text-[#BDB29F] font-semibold text-xs ml-1.5">
                {post.likes_count || 0} {post.likes_count === 1 ? 'gosto' : 'gostos'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-bold text-[#F5D77A]">
              <MessageSquare className="w-4 h-4 text-[#D4AF37]" />
              <span>{post.comments_count || 0} Comentários</span>
            </div>
          </div>

          {/* Comments Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
              Comentários ({post.comments_count || 0})
            </h4>

            {topLevelComments.length === 0 ? (
              <div className="text-center py-6 bg-[#16140F] rounded-2xl border border-[#D4AF37]/25 text-xs text-[#BDB29F]">
                Ainda não há comentários nesta publicação. Seja o primeiro a comentar!
              </div>
            ) : (
              <div className="space-y-4">
                {topLevelComments.map(c => (
                  <div key={c.id} className="space-y-2">
                    <div className="bg-[#16140F] p-3.5 rounded-2xl border border-[#D4AF37]/25 space-y-1">
                      <div className="flex items-center justify-between">
                        <div 
                          onClick={() => handleAuthorClick(c.author_id, c.author_name, c.author_avatar, false)}
                          className="flex items-center gap-2 cursor-pointer group"
                          title={`Ver perfil de ${c.author_name}`}
                        >
                          <div className="w-6 h-6 rounded-full bg-[#D4AF37] text-slate-950 flex items-center justify-center text-[10px] font-bold overflow-hidden group-hover:scale-105 transition">
                            {c.author_avatar ? (
                              <img src={c.author_avatar} alt={c.author_name} className="w-full h-full object-cover" />
                            ) : (
                              c.author_name.charAt(0)
                            )}
                          </div>
                          <span className="text-xs font-bold text-[#F5D77A] group-hover:underline group-hover:text-[#D4AF37]">{c.author_name}</span>
                        </div>
                        <span className="text-[10px] text-[#BDB29F]">
                          {new Date(c.created_at).toLocaleDateString('pt-AO')}
                        </span>
                      </div>
                      <p className="text-xs text-[#BDB29F] leading-relaxed pl-8">{c.content}</p>
                      
                      <div className="pl-8 pt-2 flex items-center gap-4 text-[10px] font-bold">
                        <button 
                          onClick={() => handleLikeComment(c.id)}
                          className={`${c.liked_by_user ? 'text-[#D4AF37]' : 'text-[#BDB29F]'}`}
                        >
                          Gostar {c.likes_count ? `(${c.likes_count})` : ''}
                        </button>
                        <button 
                          onClick={() => setReplyingTo(c)}
                          className="text-[#BDB29F] hover:text-[#D4AF37]"
                        >
                          Responder
                        </button>
                      </div>
                    </div>

                    {/* Replies */}
                    {repliesMap[c.id] && (
                      <div className="pl-8 space-y-2">
                        {!expandedComments[c.id] ? (
                          <button 
                            onClick={() => toggleReplies(c.id)}
                            className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#D4AF37] hover:underline cursor-pointer"
                          >
                            <ChevronDown className="w-3 h-3" />
                            Ver {repliesMap[c.id].length} respostas
                          </button>
                        ) : (
                          <>
                            <button 
                              onClick={() => toggleReplies(c.id)}
                              className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#BDB29F] hover:underline mb-2 cursor-pointer"
                            >
                              <ChevronUp className="w-3 h-3" />
                              Ocultar respostas
                            </button>
                            {repliesMap[c.id].map(reply => (
                              <div key={reply.id} className="bg-[#1C1811] p-3 rounded-2xl border border-[#D4AF37]/25 space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-[#D4AF37] text-slate-950 flex items-center justify-center text-[9px] font-bold overflow-hidden">
                                      {reply.author_avatar ? (
                                        <img src={reply.author_avatar} alt={reply.author_name} className="w-full h-full object-cover" />
                                      ) : (
                                        reply.author_name.charAt(0)
                                      )}
                                    </div>
                                    <span className="text-[11px] font-bold text-[#F5D77A]">{reply.author_name}</span>
                                  </div>
                                  <span className="text-[9px] text-[#BDB29F]">
                                    {new Date(reply.created_at).toLocaleDateString('pt-AO')}
                                  </span>
                                </div>
                                <p className="text-xs text-[#BDB29F] leading-relaxed pl-7">{reply.content}</p>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Comment Input Footer */}
        <div className="p-4 bg-[#16140F] border-t border-[#26241E] shrink-0">
          {replyingTo && (
            <div className="mb-2 flex items-center justify-between bg-[#1C1811] px-3 py-1.5 rounded-xl border border-[#D4AF37]/30">
              <span className="text-[10px] text-[#F5D77A] font-medium">
                A responder a <span className="font-bold">@{replyingTo.author_name}</span>
              </span>
              <button onClick={() => setReplyingTo(null)} className="text-[#BDB29F] hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          
          {currentUser ? (
            <form onSubmit={handleAddComment} className="flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder={replyingTo ? "Escreva uma resposta..." : "Escreva um comentário..."}
                className="flex-1 px-4 py-2.5 rounded-2xl border border-[#D4AF37]/30 text-xs focus:outline-none focus:border-[#D4AF37] bg-[#1C1811] text-white placeholder:text-[#BDB29F]"
                autoFocus={!!replyingTo}
              />
              <button
                type="submit"
                disabled={isSubmitting || !commentText.trim()}
                className="bg-[#D4AF37] hover:bg-[#F5D77A] text-slate-950 font-extrabold p-2.5 rounded-2xl transition shadow-xs disabled:opacity-50 flex items-center justify-center shrink-0 cursor-pointer gold-cta"
                title="Enviar"
              >
                <Send className="w-4 h-4 text-slate-950" />
              </button>
            </form>
          ) : (
            <div className="text-center py-2 flex items-center justify-between">
              <span className="text-xs text-[#BDB29F]">Inicie sessão para interagir nesta publicação</span>
              <button
                onClick={onOpenAuth}
                className="bg-[#D4AF37] text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs gold-cta cursor-pointer"
              >
                Entrar
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Diálogo de Confirmação de Eliminação do Post */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn select-none">
          <div className="bg-[#121212] rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-[#D4AF37]/30 text-center animate-scaleUp">
            <div className="w-12 h-12 bg-rose-950 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/40">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-[#F5D77A]">
                Apagar Publicação?
              </h3>
              <p className="text-xs sm:text-sm text-[#BDB29F] leading-relaxed">
                {showDeleteConfirm.message}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(null)}
                className="w-full py-2.5 px-4 bg-[#1C1811] hover:bg-[#201A12] text-[#F5D77A] font-bold text-xs sm:text-sm rounded-xl transition border border-[#D4AF37]/30 cursor-pointer active:scale-95"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  const pid = showDeleteConfirm.postId;
                  setShowDeleteConfirm(null);
                  StoreService.deletePost(pid);
                  onClose();
                  try {
                    window.dispatchEvent(new CustomEvent('cunene_post_deleted', { detail: { postId: pid } }));
                  } catch {}
                }}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs sm:text-sm rounded-xl transition shadow-md cursor-pointer active:scale-95"
              >
                Apagar Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
