import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, MessageSquare, Share2, Send, Heart, ThumbsUp, Trash2 } from 'lucide-react';
import { CommunityPost, UserProfile, PostReactionType, PostComment } from '../lib/types';
import { StoreService } from '../lib/store';
import { supabase } from '../lib/supabase';
import { VerticalReactionsPicker, REACTIONS_CONFIG } from './VerticalReactionsPicker';

interface FullscreenPostModalProps {
  posts: CommunityPost[];
  currentPostId: string | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onPostUpdated: (updatedPost: CommunityPost) => void;
  onOpenAuth?: () => void;
  onSelectCompany?: (company: UserProfile) => void;
  onSelectCandidate?: (candidate: UserProfile) => void;
}

export const FullscreenPostModal: React.FC<FullscreenPostModalProps> = ({
  posts,
  currentPostId,
  isOpen,
  onClose,
  currentUser,
  onPostUpdated,
  onOpenAuth,
  onSelectCompany,
  onSelectCandidate
}) => {
  const [activeId, setActiveId] = useState<string | null>(currentPostId);
  const [showReactions, setShowReactions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<PostComment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Pinch-to-zoom and Pan state
  const [zoomScale, setZoomScale] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);

  // Vertical drag-to-dismiss state
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDraggingVertical, setIsDraggingVertical] = useState(false);

  // Touch event references
  const touchStartRef = useRef<{ x: number; y: number; dist: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Sync activeId when currentPostId or isOpen changes
  useEffect(() => {
    if (isOpen && currentPostId) {
      setActiveId(currentPostId);
      setShowComments(false);
      setShowReactions(false);
      setZoomScale(1);
      setPanPosition({ x: 0, y: 0 });
      setDragOffsetY(0);
      setImageError(false);
    }
  }, [currentPostId, isOpen]);

  // Resolve current active post ID (fallback to currentPostId if activeId not set)
  const targetId = activeId || currentPostId;

  // Current Post Resolution across posts list
  const currentIndex = useMemo(() => {
    if (!targetId || !Array.isArray(posts) || posts.length === 0) return -1;
    return posts.findIndex(p => p.id === targetId);
  }, [posts, targetId]);

  const currentPost: CommunityPost | null = useMemo(() => {
    if (currentIndex >= 0 && currentIndex < posts.length) {
      return posts[currentIndex];
    }
    if (targetId && Array.isArray(posts)) {
      const found = posts.find(p => p.id === targetId);
      if (found) return found;
    }
    return null;
  }, [posts, currentIndex, targetId]);

  // Group comments into parents and replies safely (BEFORE any early return)
  const { topLevelComments } = useMemo(() => {
    const top: PostComment[] = [];
    if (currentPost?.comments && Array.isArray(currentPost.comments)) {
      currentPost.comments.filter(c => c.author_id !== 'system_reactions_metadata').forEach(c => {
        if (!c.parent_id) {
          top.push(c);
        }
      });
    }
    return { topLevelComments: top };
  }, [currentPost?.comments]);

  // Reset zoom & pan transforms
  const resetTransforms = () => {
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
    setDragOffsetY(0);
    setShowReactions(false);
    setImageError(false);
  };

  const goToNext = () => {
    if (currentIndex >= 0 && currentIndex < posts.length - 1) {
      setActiveId(posts[currentIndex + 1].id);
      resetTransforms();
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setActiveId(posts[currentIndex - 1].id);
      resetTransforms();
    }
  };

  // Keyboard navigation for desktop (Escape, Left, Right)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, posts?.length]);

  // Touch Handlers for Pinch to Zoom, Pan & Swipes
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchStartRef.current = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2, dist, time: Date.now() };
      setIsZooming(true);
    } else if (e.touches.length === 1) {
      // Single touch start
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY, dist: 0, time: Date.now() };

      // Double tap to zoom toggle
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        if (zoomScale > 1) {
          resetTransforms();
        } else {
          setZoomScale(2.2);
        }
      }
      lastTapRef.current = now;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    if (e.touches.length === 2 && isZooming) {
      // Pinch zooming
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scaleDelta = currentDist / (touchStartRef.current.dist || currentDist);
      const newScale = Math.min(Math.max(1, zoomScale * scaleDelta), 4);
      setZoomScale(newScale);
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      const deltaX = t.clientX - touchStartRef.current.x;
      const deltaY = t.clientY - touchStartRef.current.y;

      if (zoomScale > 1) {
        // Pan image when zoomed
        setPanPosition(prev => ({
          x: prev.x + deltaX * 0.5,
          y: prev.y + deltaY * 0.5
        }));
        touchStartRef.current.x = t.clientX;
        touchStartRef.current.y = t.clientY;
      } else {
        // Vertical swipe to dismiss
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 20) {
          setIsDraggingVertical(true);
          setDragOffsetY(deltaY);
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    if (isZooming) {
      setIsZooming(false);
      if (zoomScale < 1.1) resetTransforms();
    } else if (zoomScale <= 1) {
      const touchEnd = e.changedTouches[0];
      const deltaX = touchEnd.clientX - touchStartRef.current.x;
      const deltaY = touchEnd.clientY - touchStartRef.current.y;
      const elapsed = Date.now() - touchStartRef.current.time;

      // Check vertical dismiss threshold (> 110px)
      if (Math.abs(deltaY) > 110) {
        onClose();
        return;
      } else {
        setDragOffsetY(0);
        setIsDraggingVertical(false);
      }

      // Check horizontal swipe threshold
      if (Math.abs(deltaX) > 60 && Math.abs(deltaY) < 50 && elapsed < 400) {
        if (deltaX < 0) {
          goToNext();
        } else {
          goToPrev();
        }
      }
    }
    touchStartRef.current = null;
  };

  const handleReactionSelect = async (type: PostReactionType) => {
    if (!currentPost) return;
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    const updated = await StoreService.reactToPost(currentPost.id, type, currentUser.id);
    if (updated) {
      onPostUpdated(updated);
    }
  };

  const handleAuthorClick = async () => {
    if (!currentPost) return;
    onClose();

    if (currentUser && currentUser.id === currentPost.author_id) {
      if (isCompanyPost && onSelectCompany) {
        onSelectCompany(currentUser);
        return;
      }
      if (!isCompanyPost && onSelectCandidate) {
        onSelectCandidate(currentUser);
        return;
      }
    }

    let authorProfile: UserProfile = {
      id: currentPost.author_id,
      email: '',
      full_name: authorName,
      role: isCompanyPost ? 'employer' : 'candidate',
      avatar_url: authorAvatar,
      municipality: 'Ondjiva',
      created_at: currentPost.created_at
    };

    try {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', currentPost.author_id).single();
      if (prof) {
        authorProfile.full_name = prof.full_name || authorProfile.full_name;
        authorProfile.municipality = prof.municipio || authorProfile.municipality;
        authorProfile.whatsapp = prof.whatsapp;
        authorProfile.phone = prof.whatsapp;
      }
      if (isCompanyPost) {
        const { data: comp } = await supabase.from('companies').select('*').eq('id', currentPost.author_id).single();
        if (comp) {
          authorProfile.company_name = authorName;
          authorProfile.company_logo = authorAvatar;
          authorProfile.industry = comp.setor || 'Comércio e Serviços';
          authorProfile.nif = comp.nif;
          authorProfile.bio = comp.descricao;
        }
      }
    } catch {
      // ignore
    }

    if (isCompanyPost) {
      if (onSelectCompany) onSelectCompany(authorProfile);
    } else {
      if (onSelectCandidate) onSelectCandidate(authorProfile);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPost) return;
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    try {
      const isEmployer = currentUser.role === 'employer';
      const cAuthorName = isEmployer
        ? (currentUser.company?.name || currentUser.company_name || currentUser.full_name)
        : currentUser.full_name;
      const cAuthorAvatar = isEmployer
        ? (currentUser.company?.logo_url || currentUser.avatar_url)
        : currentUser.avatar_url;

      await StoreService.addCommentToPost(currentPost.id, {
        author_id: currentUser.id,
        author_name: cAuthorName,
        author_avatar: cAuthorAvatar,
        content: commentText.trim(),
        parent_id: replyingTo?.id
      });

      setCommentText('');
      setReplyingTo(null);

      const allPosts = StoreService.getPosts();
      const updated = allPosts.find(p => p.id === currentPost.id);
      if (updated) onPostUpdated(updated);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (!currentPost) return;
    const authorDisplayName = currentPost.author_name || 'Profissional';
    const shareUrl = `${window.location.origin}/#community/post/${currentPost.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Publicação de ${authorDisplayName} no CuneneVagas`,
          text: (currentPost.content || '').substring(0, 120),
          url: shareUrl
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Safe early exit AFTER all hooks have executed
  if (!isOpen || !currentPost) return null;

  // Safe display data
  const authorName = currentPost.author_name || 'Membro do CuneneVagas';
  const authorAvatar = currentPost.author_avatar;
  const isCompanyPost = currentPost.author_type === 'employer';
  const postDate = currentPost.created_at ? new Date(currentPost.created_at).toLocaleDateString('pt-AO') : '';
  const postCategory = currentPost.category || 'Geral';

  // Current active reaction configuration
  const activeReactionConfig = currentPost.user_reaction 
    ? REACTIONS_CONFIG.find(r => r.type === currentPost.user_reaction)
    : null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between overflow-hidden animate-fadeIn select-none touch-none"
      style={{
        transform: isDraggingVertical ? `translateY(${dragOffsetY}px)` : 'translateY(0)',
        opacity: isDraggingVertical ? Math.max(0.4, 1 - Math.abs(dragOffsetY) / 300) : 1,
        transition: isDraggingVertical ? 'none' : 'transform 0.25s ease-out, opacity 0.25s ease-out'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between p-4 sm:p-6 text-white bg-slate-900/40 border-b border-white/5 shrink-0 z-20 backdrop-blur-md">
        <div 
          onClick={handleAuthorClick}
          className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition"
          title={`Ver perfil de ${authorName}`}
        >
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 border border-white/10 ring-2 ring-transparent group-hover:ring-[#FFC20E]/50 transition">
            {authorAvatar ? (
              <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
            ) : (
              authorName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white truncate max-w-[180px] sm:max-w-xs group-hover:text-[#FFC20E] group-hover:underline transition">{authorName}</h3>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg ${
                isCompanyPost ? 'bg-[#FFC20E] text-slate-900' : 'bg-[#0F4C9C] text-white'
              }`}>
                {isCompanyPost ? 'Empresa' : 'Candidato'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {postDate} • {postCategory}
            </p>
          </div>
        </div>

        {/* Close button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="bg-white/5 hover:bg-white/10 text-white p-2.5 rounded-xl transition-all active:scale-95 border border-white/10"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        ref={imageContainerRef}
        className="flex-1 flex flex-col items-center justify-center p-4 sm:p-10 overflow-hidden relative"
      >
        {/* Media Container with Zoom & Pan */}
        <div 
          className="w-full h-full flex flex-col items-center justify-center transition-transform duration-100 ease-out"
          style={{
            transform: `scale(${zoomScale}) translate(${panPosition.x}px, ${panPosition.y}px)`
          }}
        >
          {currentPost.image_url && !imageError ? (
            <div className="max-w-4xl max-h-[60vh] sm:max-h-[70vh] rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center bg-black/20">
              <img
                src={currentPost.image_url}
                alt="Publicação"
                className="max-h-[60vh] sm:max-h-[70vh] w-auto object-contain rounded-2xl"
                draggable={false}
                onError={() => setImageError(true)}
              />
            </div>
          ) : null}

          {/* Text Content */}
          <div className="max-w-3xl w-full mt-8 px-4">
            <p className="text-base sm:text-xl text-white/90 leading-relaxed whitespace-pre-line font-medium text-center">
              {currentPost.content}
            </p>
          </div>
        </div>

        {/* Navigation Arrows (Desktop) */}
        {currentIndex > 0 && (
          <button
            onClick={goToPrev}
            className="hidden lg:flex absolute left-8 top-1/2 -translate-y-1/2 bg-white/5 hover:bg-white/15 text-white p-4 rounded-2xl border border-white/10 transition-all z-20 backdrop-blur-sm"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {currentIndex < posts.length - 1 && (
          <button
            onClick={goToNext}
            className="hidden lg:flex absolute right-8 top-1/2 -translate-y-1/2 bg-white/5 hover:bg-white/15 text-white p-4 rounded-2xl border border-white/10 transition-all z-20 backdrop-blur-sm"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Actions Bar */}
      <div className="bg-slate-900/60 border-t border-white/5 p-4 sm:p-8 shrink-0 z-20 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-4 flex-1">
            <div className="relative">
              <button
                onClick={() => setShowReactions(!showReactions)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl transition-all font-bold text-sm ${
                  activeReactionConfig ? 'bg-white/10 text-white' : 'bg-white/5 hover:bg-white/10 text-white/80'
                } border border-white/5`}
              >
                {activeReactionConfig ? (
                  <span className="text-xl">{activeReactionConfig.emoji}</span>
                ) : (
                  <ThumbsUp className="w-5 h-5 text-[#FFC20E]" />
                )}
                <span>{activeReactionConfig ? activeReactionConfig.label : 'Gostar'}</span>
                <span className="text-white/40 font-bold ml-1">{currentPost.likes_count || 0}</span>
              </button>

              {showReactions && (
                <VerticalReactionsPicker
                  currentReaction={currentPost.user_reaction}
                  onSelectReaction={handleReactionSelect}
                  onClose={() => setShowReactions(false)}
                  position="top"
                />
              )}
            </div>

            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 px-5 py-3 rounded-xl text-sm font-bold transition-all text-white/80 border border-white/5"
            >
              <MessageSquare className="w-5 h-5 text-[#FFC20E]" />
              <span className="hidden sm:inline">Comentários</span>
              <span className="text-white/40">({currentPost.comments_count || topLevelComments.length || 0})</span>
            </button>
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 px-5 py-3 rounded-xl text-sm font-bold transition-all text-white/80 border border-white/5"
          >
            <Share2 className="w-5 h-5" />
            <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Partilhar'}</span>
          </button>
        </div>

        {/* Comments Drawer */}
        {showComments && (
          <div className="max-w-3xl mx-auto mt-6 bg-slate-800/80 border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4 max-h-[30vh] overflow-y-auto animate-slideUp">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-sm font-bold text-white">Comentários</span>
              <button onClick={() => setShowComments(false)} className="text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {topLevelComments.length === 0 ? (
                <p className="text-sm text-white/30 text-center py-6">Sem comentários ainda.</p>
              ) : (
                topLevelComments.map(c => (
                  <div key={c.id} className="bg-white/5 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white/90">{c.author_name}</span>
                      <span className="text-[10px] text-white/30">{c.created_at ? new Date(c.created_at).toLocaleDateString('pt-AO') : ''}</span>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            {currentUser ? (
              <form onSubmit={handleAddComment} className="flex gap-3 pt-4 border-t border-white/10">
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Escreva algo..."
                  className="flex-1 bg-white/5 border border-white/10 text-white placeholder-white/20 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#FFC20E] transition-all"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !commentText.trim()}
                  className="bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white px-5 rounded-xl transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="text-center pt-2">
                <button onClick={onOpenAuth} className="text-sm font-bold text-[#FFC20E] hover:underline">
                  Inicie sessão para comentar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
