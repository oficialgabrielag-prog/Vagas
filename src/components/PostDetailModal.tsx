import React, { useState, useMemo } from 'react';
import { X, ThumbsUp, MessageSquare, Send, Calendar, User, Building2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { CommunityPost, UserProfile, PostReactionType, PostComment } from '../lib/types';
import { StoreService } from '../lib/store';
import { VerticalReactionsPicker, REACTIONS_CONFIG } from './VerticalReactionsPicker';
import { MediaViewer } from './MediaViewer';

interface PostDetailModalProps {
  post: CommunityPost | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onPostUpdated: (updatedPost: CommunityPost) => void;
  onOpenAuth?: () => void;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  post,
  isOpen,
  onClose,
  currentUser,
  onPostUpdated,
  onOpenAuth,
}) => {
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<PostComment | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<boolean>(false);

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

  const handleReaction = async (type: PostReactionType) => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    const updated = await StoreService.reactToPost(post.id, type, currentUser.id);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#0F4C9C] p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
              {authorDisplayAvatar ? (
                <img src={authorDisplayAvatar} alt={authorDisplayName} className="w-full h-full object-cover" />
              ) : (
                authorDisplayName.charAt(0)
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold truncate max-w-[200px] sm:max-w-xs">{authorDisplayName}</h3>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-sm ${
                  isEmpPost ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-[#0F4C9C]'
                }`}>
                  {isEmpPost ? 'Empresa' : 'Candidato'}
                </span>
              </div>
              <p className="text-[11px] text-slate-200">
                {new Date(post.created_at).toLocaleDateString('pt-AO')} • {post.category || 'Geral'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Post Content & Comments Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Main Text Content */}
          <div className="text-sm sm:text-base text-slate-800 leading-relaxed whitespace-pre-line font-normal">
            {post.content}
          </div>

          {/* Full Resolution Image */}
          {post.image_url && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 max-h-[450px] cursor-pointer" onClick={() => setViewingMedia(true)}>
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
          <div className="flex items-center justify-between border-y border-slate-100 py-3 text-xs relative">
            <div className="flex items-center gap-1">
              <div className="relative">
                <button
                  onClick={() => setShowReactions(!showReactions)}
                  className={`flex items-center gap-2 font-bold px-3 py-1.5 rounded-xl transition ${
                    post.user_reaction
                      ? 'bg-slate-100 text-[#0F4C9C]'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {post.user_reaction ? (
                    <span>{REACTIONS_CONFIG.find(r => r.type === post.user_reaction)?.emoji || '👍'}</span>
                  ) : (
                    <ThumbsUp className="w-4 h-4" />
                  )}
                  <span>{post.user_reaction ? REACTIONS_CONFIG.find(r => r.type === post.user_reaction)?.label : 'Gostar'}</span>
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
              
              <span className="text-slate-400 font-medium">{post.likes_count || 0} reações</span>
            </div>

            <div className="flex items-center gap-1.5 font-bold text-slate-500">
              <MessageSquare className="w-4 h-4 text-[#0F4C9C]" />
              <span>{post.comments_count || 0} Comentários</span>
            </div>
          </div>

          {/* Comments Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Comentários ({post.comments_count || 0})
            </h4>

            {topLevelComments.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-400">
                Ainda não há comentários nesta publicação. Seja o primeiro a comentar!
              </div>
            ) : (
              <div className="space-y-4">
                {topLevelComments.map(c => (
                  <div key={c.id} className="space-y-2">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#0F4C9C] text-white flex items-center justify-center text-[10px] font-bold overflow-hidden">
                            {c.author_avatar ? (
                              <img src={c.author_avatar} alt={c.author_name} className="w-full h-full object-cover" />
                            ) : (
                              c.author_name.charAt(0)
                            )}
                          </div>
                          <span className="text-xs font-bold text-slate-900">{c.author_name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(c.created_at).toLocaleDateString('pt-AO')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed pl-8">{c.content}</p>
                      
                      <div className="pl-8 pt-2 flex items-center gap-4 text-[10px] font-bold">
                        <button 
                          onClick={() => handleLikeComment(c.id)}
                          className={`${c.liked_by_user ? 'text-blue-600' : 'text-slate-500'}`}
                        >
                          Gostar {c.likes_count ? `(${c.likes_count})` : ''}
                        </button>
                        <button 
                          onClick={() => setReplyingTo(c)}
                          className="text-slate-500 hover:text-[#0F4C9C]"
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
                            className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#0F4C9C] hover:underline"
                          >
                            <ChevronDown className="w-3 h-3" />
                            Ver {repliesMap[c.id].length} respostas
                          </button>
                        ) : (
                          <>
                            <button 
                              onClick={() => toggleReplies(c.id)}
                              className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 hover:underline mb-2"
                            >
                              <ChevronUp className="w-3 h-3" />
                              Ocultar respostas
                            </button>
                            {repliesMap[c.id].map(reply => (
                              <div key={reply.id} className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100/50 space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-slate-300 text-white flex items-center justify-center text-[9px] font-bold overflow-hidden">
                                      {reply.author_avatar ? (
                                        <img src={reply.author_avatar} alt={reply.author_name} className="w-full h-full object-cover" />
                                      ) : (
                                        reply.author_name.charAt(0)
                                      )}
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-900">{reply.author_name}</span>
                                  </div>
                                  <span className="text-[9px] text-slate-400">
                                    {new Date(reply.created_at).toLocaleDateString('pt-AO')}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-700 leading-relaxed pl-7">{reply.content}</p>
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
        <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0">
          {replyingTo && (
            <div className="mb-2 flex items-center justify-between bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
              <span className="text-[10px] text-blue-700 font-medium">
                A responder a <span className="font-bold">@{replyingTo.author_name}</span>
              </span>
              <button onClick={() => setReplyingTo(null)} className="text-blue-400 hover:text-blue-600">
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
                className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-300 text-xs focus:outline-none focus:border-[#0F4C9C] focus:ring-2 focus:ring-[#0F4C9C]/20 bg-white"
                autoFocus={!!replyingTo}
              />
              <button
                type="submit"
                disabled={isSubmitting || !commentText.trim()}
                className="bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white p-2.5 rounded-2xl transition shadow-xs disabled:opacity-50 flex items-center justify-center shrink-0"
                title="Enviar"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="text-center py-2 flex items-center justify-between">
              <span className="text-xs text-slate-500">Inicie sessão para interagir nesta publicação</span>
              <button
                onClick={onOpenAuth}
                className="bg-[#0F4C9C] text-white font-bold px-3.5 py-1.5 rounded-xl text-xs"
              >
                Entrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
