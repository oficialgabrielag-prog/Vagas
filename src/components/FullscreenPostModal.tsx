import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, MessageSquare, Share2, Send, ThumbsUp, Trash2, BarChart3, CornerDownRight, Check, AlertCircle } from 'lucide-react';
import { CommunityPost, UserProfile, PostReactionType, PostComment } from '../lib/types';
import { StoreService } from '../lib/store';
import { supabase } from '../lib/supabase';
import { VerticalReactionsPicker, REACTIONS_CONFIG } from './VerticalReactionsPicker';
import { soundEffects } from '../lib/soundEffects';

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
  const [showCommentsSheet, setShowCommentsSheet] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<PostComment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isChromeVisible, setIsChromeVisible] = useState(true);
  const [isExpandedText, setIsExpandedText] = useState(false);

  // Pinch-to-zoom and Pan state
  const [zoomScale, setZoomScale] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);

  // Touch event references
  const touchStartRef = useRef<{ x: number; y: number; dist: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const commentsInputRef = useRef<HTMLInputElement>(null);

  // Sync activeId when currentPostId or isOpen changes
  useEffect(() => {
    if (isOpen && currentPostId) {
      setActiveId(currentPostId);
      setShowCommentsSheet(false);
      setShowReactions(false);
      setZoomScale(1);
      setPanPosition({ x: 0, y: 0 });
      setImageError(false);
      setIsChromeVisible(true);
      setIsExpandedText(false);
      setReplyingTo(null);
      setCommentText('');
    }
  }, [currentPostId, isOpen]);

  // Target post ID
  const targetId = activeId || currentPostId;

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

  // Permissão ampla e precisa para apagar post
  const canDeleteCurrentPost = useMemo(() => {
    if (!currentPost) return false;
    if (currentUser && (StoreService.isAdmin(currentUser) || currentUser.role === 'admin' || (currentUser as any).is_admin)) {
      return true;
    }
    const visitorId = StoreService.getVisitorId ? StoreService.getVisitorId() : null;
    if (visitorId && (currentPost.author_id === visitorId || (currentPost as any).user_id === visitorId)) {
      return true;
    }
    let localMyPosts: string[] = [];
    try {
      localMyPosts = JSON.parse(localStorage.getItem('my_created_post_ids') || '[]');
    } catch {}
    if (Array.isArray(localMyPosts) && localMyPosts.includes(currentPost.id)) {
      return true;
    }
    if (!currentUser) return false;

    const uid = String(currentUser.id || '').trim();
    const uEmail = String(currentUser.email || '').toLowerCase().trim();
    const uName = String(currentUser.full_name || currentUser.company_name || '').toLowerCase().trim();

    const postAuthorId = String(currentPost.author_id || (currentPost as any).user_id || (currentPost as any).company_id || (currentPost as any).seller_id || '').trim();
    const postAuthorName = String(currentPost.author_name || (currentPost as any).company_name || '').toLowerCase().trim();

    if (uid && postAuthorId && postAuthorId === uid) return true;
    if (uEmail && postAuthorId && postAuthorId.toLowerCase() === uEmail) return true;
    if (uName && postAuthorName && postAuthorName === uName) return true;

    return false;
  }, [currentUser, currentPost]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ message: string; postId: string } | null>(null);

  const handleDeletePost = () => {
    if (!currentPost) return;
    const authorName = currentPost.author_name || 'utilizador';
    const isAdmin = StoreService.isAdmin(currentUser);
    const msg = isAdmin && !canDeleteCurrentPost
      ? `Eliminar a publicação de "${authorName}" como Administrador da plataforma?`
      : 'Tem a certeza de que deseja apagar permanentemente esta publicação? Esta ação não pode ser desfeita.';

    setShowDeleteConfirm({
      message: msg,
      postId: currentPost.id
    });
  };

  // Group comments into parents and replies
  const { topLevelComments, repliesMap } = useMemo(() => {
    const top: PostComment[] = [];
    const replies: Record<string, PostComment[]> = {};
    if (currentPost?.comments && Array.isArray(currentPost.comments)) {
      currentPost.comments.filter(c => c.author_id !== 'system_reactions_metadata').forEach(c => {
        if (!c.parent_id) {
          top.push(c);
        } else {
          if (!replies[c.parent_id]) replies[c.parent_id] = [];
          replies[c.parent_id].push(c);
        }
      });
    }
    return { topLevelComments: top, repliesMap: replies };
  }, [currentPost?.comments]);

  const resetTransforms = () => {
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
    setShowReactions(false);
    setImageError(false);
    setIsExpandedText(false);
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

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCommentsSheet) {
          setShowCommentsSheet(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, posts?.length, showCommentsSheet]);

  // Touch Handlers for Pinch to Zoom & Swiping
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchStartRef.current = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2, dist, time: Date.now() };
      setIsZooming(true);
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY, dist: 0, time: Date.now() };

      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        if (zoomScale > 1) {
          resetTransforms();
        } else {
          setZoomScale(2.5);
        }
      }
      lastTapRef.current = now;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    if (e.touches.length === 2 && isZooming) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scaleDelta = currentDist / (touchStartRef.current.dist || currentDist);
      const newScale = Math.min(Math.max(1, zoomScale * scaleDelta), 4);
      setZoomScale(newScale);
    } else if (e.touches.length === 1 && zoomScale > 1) {
      const t = e.touches[0];
      const deltaX = t.clientX - touchStartRef.current.x;
      const deltaY = t.clientY - touchStartRef.current.y;
      setPanPosition(prev => ({
        x: prev.x + deltaX * 0.5,
        y: prev.y + deltaY * 0.5
      }));
      touchStartRef.current.x = t.clientX;
      touchStartRef.current.y = t.clientY;
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
    soundEffects.playLikeSound();
    const userId = currentUser?.id || StoreService.getVisitorId();
    const updated = await StoreService.reactToPost(currentPost.id, type, userId, currentPost);
    setShowReactions(false);
    if (updated) {
      if (!updated.image_url && currentPost.image_url) {
        updated.image_url = currentPost.image_url;
      }
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
        // fallback
      }
    }
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !currentPost) return null;

  const authorName = currentPost.author_name || 'Membro do CuneneVagas';
  const authorAvatar = currentPost.author_avatar;
  const isCompanyPost = currentPost.author_type === 'employer';
  const postDate = currentPost.created_at ? new Date(currentPost.created_at).toLocaleDateString('pt-AO') : '';
  const postCategory = currentPost.category || 'Geral';
  const hasImage = !!currentPost.image_url && !imageError;

  const activeReactionConfig = currentPost.user_reaction 
    ? REACTIONS_CONFIG.find(r => r.type === currentPost.user_reaction)
    : null;

  const totalCommentsCount = currentPost.comments_count || (currentPost.comments?.length || 0);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col lg:flex-row overflow-hidden select-none animate-fadeIn">
      {/* ========================================================================= */}
      {/* LEFT AREA: PHOTO THEATER (FACEBOOK-STYLE LIGHTBOX)                       */}
      {/* ========================================================================= */}
      <div 
        className={`relative flex-1 flex flex-col justify-between bg-black overflow-hidden ${hasImage ? 'h-full' : 'hidden lg:flex'}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top Floating Chrome (Mobile & Desktop) */}
        <div 
          className={`absolute top-0 inset-x-0 z-30 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-200 ${
            isChromeVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Mobile author summary on photo top */}
          <div 
            onClick={handleAuthorClick}
            className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition lg:hidden"
          >
            <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm overflow-hidden border border-white/20">
              {authorAvatar ? (
                <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
              ) : (
                authorName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate max-w-[170px]">{authorName}</h3>
                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md ${
                  isCompanyPost ? 'bg-[#FFC20E] text-slate-900' : 'bg-[#0F4C9C] text-white'
                }`}>
                  {isCompanyPost ? 'Empresa' : 'Candidato'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                {postDate} • {postCategory}
              </p>
            </div>
          </div>

          {/* Desktop Left-Corner Close/Branding */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={onClose}
              className="bg-black/60 hover:bg-black/90 text-white p-2.5 rounded-full transition border border-white/20 cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>

            {canDeleteCurrentPost && (
              <button
                onClick={handleDeletePost}
                className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white px-3.5 py-2 rounded-full transition-all border border-rose-400/40 flex items-center gap-1.5 text-xs font-black shadow-lg cursor-pointer"
                title="Apagar publicação"
              >
                <Trash2 className="w-4 h-4 text-white" />
                <span>Apagar Publicação</span>
              </button>
            )}
          </div>

          {/* Mobile Right Close Button */}
          <div className="flex items-center gap-2 lg:hidden">
            {canDeleteCurrentPost && (
              <button
                onClick={handleDeletePost}
                className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-full border border-rose-400/40 flex items-center gap-1 text-xs font-extrabold shadow-md cursor-pointer active:scale-95"
                title="Apagar publicação"
              >
                <Trash2 className="w-4 h-4" />
                <span>Apagar</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="bg-black/60 text-white p-2.5 rounded-full border border-white/20 cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Media Presentation (Authentic Natural Photo) */}
        <div 
          onClick={() => setIsChromeVisible(prev => !prev)}
          className="flex-1 w-full h-full flex items-center justify-center p-0 sm:p-4 overflow-hidden cursor-pointer"
        >
          {hasImage ? (
            <div 
              className="w-full h-full flex items-center justify-center transition-transform duration-100 ease-out"
              style={{
                transform: `scale(${zoomScale}) translate(${panPosition.x}px, ${panPosition.y}px)`
              }}
            >
              <img
                src={currentPost.image_url}
                alt="Publicação"
                className="max-h-full max-w-full w-auto h-auto object-contain select-none"
                draggable={false}
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            <div className="max-w-xl mx-auto p-8 text-center text-white space-y-4">
              <p className="text-xl sm:text-2xl font-medium leading-relaxed whitespace-pre-line">
                {currentPost.content}
              </p>
            </div>
          )}
        </div>

        {/* Desktop Prev / Next Carousel Navigation */}
        {currentIndex > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); goToPrev(); }}
            className="hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white p-3.5 rounded-full border border-white/20 transition z-30"
            title="Anterior (Seta Esquerda)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {currentIndex < posts.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goToNext(); }}
            className="hidden lg:flex absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white p-3.5 rounded-full border border-white/20 transition z-30"
            title="Seguinte (Seta Direita)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Mobile Floating Bottom Bar (Facebook-Style Caption & Central Actions) */}
        <div 
          className={`lg:hidden absolute bottom-0 inset-x-0 z-30 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-8 transition-opacity duration-200 ${
            isChromeVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Post text caption */}
          {currentPost.content && (
            <div className="mb-3 px-1">
              <p className={`text-sm text-white/95 leading-snug whitespace-pre-line ${isExpandedText ? '' : 'line-clamp-2'}`}>
                {currentPost.content}
              </p>
              {currentPost.content.length > 90 && (
                <button
                  onClick={() => setIsExpandedText(!isExpandedText)}
                  className="text-xs font-bold text-[#FFC20E] mt-0.5 hover:underline"
                >
                  {isExpandedText ? 'Ver menos' : 'Ver mais'}
                </button>
              )}
            </div>
          )}

          {/* Centralized Action Bar on Mobile */}
          <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3">
            {/* Reactions */}
            <div className="relative flex-1">
              <button
                onClick={() => handleReactionSelect(currentPost.user_reaction || 'like')}
                className={`w-full py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition ${
                  activeReactionConfig ? 'bg-white/20 text-white' : 'bg-white/10 text-white/90 hover:bg-white/20'
                }`}
              >
                {activeReactionConfig ? (
                  <span className="text-base leading-none">{activeReactionConfig.emoji}</span>
                ) : (
                  <ThumbsUp className="w-4 h-4 text-[#FFC20E]" />
                )}
                <span>{activeReactionConfig ? activeReactionConfig.label : 'Gostei'}</span>
                {(currentPost.likes_count || 0) > 0 && (
                  <span className="text-white/60 font-black ml-0.5">{currentPost.likes_count}</span>
                )}
              </button>

              {showReactions && (
                <VerticalReactionsPicker
                  currentReaction={currentPost.user_reaction}
                  onSelectReaction={(type) => {
                    handleReactionSelect(type);
                    setShowReactions(false);
                  }}
                  onClose={() => setShowReactions(false)}
                  position="top"
                />
              )}
            </div>

            {/* Comments button (Opens bottom sheet) */}
            <button
              onClick={() => setShowCommentsSheet(true)}
              className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center gap-2 text-xs font-bold transition"
            >
              <MessageSquare className="w-4 h-4 text-[#FFC20E]" />
              <span>Comentários</span>
              {totalCommentsCount > 0 && (
                <span className="text-white/60 font-black">({totalCommentsCount})</span>
              )}
            </button>

            {/* Modern 2026 Share Button */}
            <button
              onClick={() => {
                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                  try { navigator.vibrate(12); } catch {}
                }
                handleShare();
              }}
              className="py-2 px-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-white flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer font-bold text-xs border border-blue-400/30"
              title="Partilhar"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Send className="w-4 h-4 text-[#FFC20E] transform -rotate-12 shrink-0" />
              )}
              <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Partilhar'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT SIDEBAR / POST DETAILS & COMMENTS (FACEBOOK DESKTOP + NO-IMAGE POST) */}
      {/* ========================================================================= */}
      <div className={`w-full lg:w-[420px] xl:w-[460px] bg-white flex flex-col justify-between shrink-0 h-full border-l border-slate-200 z-20 ${
        hasImage ? 'hidden lg:flex' : 'flex'
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div 
            onClick={handleAuthorClick}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-[#0F4C9C] text-white flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
              {authorAvatar ? (
                <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
              ) : (
                authorName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0F4C9C] transition">{authorName}</h3>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                  isCompanyPost ? 'bg-[#FFC20E] text-slate-900' : 'bg-[#0F4C9C] text-white'
                }`}>
                  {isCompanyPost ? 'Empresa' : 'Candidato'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {postDate} • {postCategory}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {canDeleteCurrentPost && (
              <button
                onClick={handleDeletePost}
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-xl transition border border-rose-200/80 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                title="Apagar publicação"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Apagar</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Post Text & Comments Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Post Text */}
          {currentPost.content && (
            <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-line pb-2 border-b border-slate-100">
              {currentPost.content}
            </div>
          )}

          {/* Poll Component */}
          {currentPost.poll && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5"><BarChart3 className="w-4 h-4" /> Sondagem</span>
                <span>{currentPost.poll.total_votes || 0} votos</span>
              </div>
              <div className="space-y-2">
                {currentPost.poll.options.map(opt => {
                  const hasVoted = currentUser && opt.votes?.includes(currentUser.id);
                  const percentage = currentPost.poll?.total_votes && currentPost.poll.total_votes > 0 
                    ? Math.round(((opt.votes?.length || 0) / currentPost.poll.total_votes) * 100) 
                    : 0;
                  return (
                    <button
                      key={opt.id}
                      disabled={!currentUser}
                      onClick={async () => {
                        if (!currentUser) return;
                        const updated = await StoreService.voteOnPoll(currentPost.id, opt.id, currentUser.id);
                        if (updated) onPostUpdated(updated);
                      }}
                      className={`w-full relative overflow-hidden rounded-xl border p-3 text-left transition-all ${
                        hasVoted ? 'border-[#0F4C9C] bg-blue-50/50' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div 
                        className={`absolute inset-y-0 left-0 transition-all duration-700 ${hasVoted ? 'bg-[#0F4C9C]/15' : 'bg-slate-100'}`}
                        style={{ width: `${percentage}%` }}
                      />
                      <div className="relative flex justify-between items-center text-xs">
                        <span className={`font-bold ${hasVoted ? 'text-[#0F4C9C]' : 'text-slate-700'}`}>{opt.text}</span>
                        <span className="font-extrabold text-slate-400">{percentage}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stats Bar */}
          <div className="flex items-center justify-between text-xs text-slate-500 py-1 border-b border-slate-100">
            <div className="flex items-center gap-1.5 font-semibold">
              <span className="flex -space-x-1">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px]">👍</span>
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px]">❤️</span>
              </span>
              <span>{currentPost.likes_count || 0}</span>
            </div>
            <div className="flex items-center gap-3">
              <span>{totalCommentsCount} comentários</span>
            </div>
          </div>

          {/* Actions Bar (Facebook-Style) */}
          <div className="grid grid-cols-3 gap-1 py-1 border-b border-slate-100">
            <div className="relative">
              <button
                onClick={() => handleReactionSelect(currentPost.user_reaction || 'like')}
                className={`w-full py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition hover:bg-slate-100 ${
                  activeReactionConfig ? 'text-[#0F4C9C]' : 'text-slate-600'
                }`}
              >
                {activeReactionConfig ? (
                  <span className="text-base leading-none">{activeReactionConfig.emoji}</span>
                ) : (
                  <ThumbsUp className="w-4 h-4 text-slate-500" />
                )}
                <span>{activeReactionConfig ? activeReactionConfig.label : 'Gostar'}</span>
              </button>

              {showReactions && (
                <VerticalReactionsPicker
                  currentReaction={currentPost.user_reaction}
                  onSelectReaction={(type) => {
                    handleReactionSelect(type);
                    setShowReactions(false);
                  }}
                  onClose={() => setShowReactions(false)}
                  position="top"
                />
              )}
            </div>

            <button
              onClick={() => commentsInputRef.current?.focus()}
              className="py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <span>Comentar</span>
            </button>

            <button
              onClick={() => {
                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                  try { navigator.vibrate(12); } catch {}
                }
                handleShare();
              }}
              className="py-2 px-3 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-extrabold text-[#0F4C9C] bg-blue-50/80 hover:bg-blue-100 border border-blue-100 transition active:scale-95 cursor-pointer shadow-2xs"
              title="Partilhar publicação (2026)"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Send className="w-4 h-4 text-[#0F4C9C] transform -rotate-12 shrink-0" />
              )}
              <span>{copied ? 'Copiado' : 'Partilhar'}</span>
            </button>
          </div>

          {/* Comments List */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Comentários</h4>

            {topLevelComments.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Seja o primeiro a comentar esta publicação!
              </div>
            ) : (
              topLevelComments.map(comment => {
                const commentReplies = repliesMap[comment.id] || [];
                return (
                  <div key={comment.id} className="space-y-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden mt-0.5">
                        {comment.author_avatar ? (
                          <img src={comment.author_avatar} alt={comment.author_name} className="w-full h-full object-cover" />
                        ) : (
                          (comment.author_name || 'U').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="bg-slate-100 rounded-2xl px-3.5 py-2">
                          <span className="block text-xs font-bold text-slate-900">{comment.author_name}</span>
                          <p className="text-xs text-slate-800 mt-0.5 leading-relaxed">{comment.content}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-1 ml-2 text-[10px] font-bold text-slate-400">
                          <span>{comment.created_at ? new Date(comment.created_at).toLocaleDateString('pt-AO') : ''}</span>
                          <button
                            onClick={() => {
                              setReplyingTo(comment);
                              commentsInputRef.current?.focus();
                            }}
                            className="hover:text-[#0F4C9C] transition"
                          >
                            Responder
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Replies list */}
                    {commentReplies.length > 0 && (
                      <div className="ml-10 space-y-2 border-l-2 border-slate-100 pl-3">
                        {commentReplies.map(rep => (
                          <div key={rep.id} className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0 overflow-hidden mt-0.5">
                              {rep.author_avatar ? (
                                <img src={rep.author_avatar} alt={rep.author_name} className="w-full h-full object-cover" />
                              ) : (
                                (rep.author_name || 'U').charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="bg-slate-100 rounded-xl px-3 py-1.5">
                                <span className="block text-[11px] font-bold text-slate-900">{rep.author_name}</span>
                                <p className="text-xs text-slate-800 leading-relaxed">{rep.content}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Comment Input Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 shrink-0">
          {replyingTo && (
            <div className="flex items-center justify-between text-xs text-[#0F4C9C] bg-blue-50 px-3 py-1.5 rounded-lg mb-2">
              <span className="flex items-center gap-1 truncate">
                <CornerDownRight className="w-3.5 h-3.5 shrink-0" />
                A responder a <strong>{replyingTo.author_name}</strong>
              </span>
              <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-slate-700 font-bold ml-2">
                ✕
              </button>
            </div>
          )}

          {currentUser ? (
            <form onSubmit={handleAddComment} className="flex items-center gap-2">
              <input
                ref={commentsInputRef}
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder={replyingTo ? `Escrever resposta a ${replyingTo.author_name}...` : 'Escreva um comentário...'}
                className="flex-1 bg-white border border-slate-300 rounded-full px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0F4C9C] focus:ring-1 focus:ring-[#0F4C9C]"
              />
              <button
                type="submit"
                disabled={isSubmitting || !commentText.trim()}
                className="w-9 h-9 rounded-full bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white flex items-center justify-center shrink-0 disabled:opacity-40 transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="text-center py-1">
              <button
                onClick={onOpenAuth}
                className="text-xs font-bold text-[#0F4C9C] hover:underline"
              >
                Inicie sessão para deixar um comentário
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE COMMENTS BOTTOM SHEET (FACEBOOK-STYLE SLIDING COMMENTS DRAWER)     */}
      {/* ========================================================================= */}
      {showCommentsSheet && (
        <div 
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn"
          onClick={() => setShowCommentsSheet(false)}
        >
          <div 
            className="bg-white rounded-t-3xl max-h-[82vh] h-[80vh] flex flex-col shadow-2xl animate-slideUp overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle & Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#0F4C9C]" />
                <h3 className="text-sm font-black text-slate-900">
                  Comentários ({totalCommentsCount})
                </h3>
              </div>
              <button
                onClick={() => setShowCommentsSheet(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comments List in Sheet */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {topLevelComments.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Sem comentários ainda. Seja o primeiro a comentar!
                </div>
              ) : (
                topLevelComments.map(comment => {
                  const commentReplies = repliesMap[comment.id] || [];
                  return (
                    <div key={comment.id} className="space-y-2">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden mt-0.5">
                          {comment.author_avatar ? (
                            <img src={comment.author_avatar} alt={comment.author_name} className="w-full h-full object-cover" />
                          ) : (
                            (comment.author_name || 'U').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="bg-slate-100 rounded-2xl px-3.5 py-2">
                            <span className="block text-xs font-bold text-slate-900">{comment.author_name}</span>
                            <p className="text-xs text-slate-800 mt-0.5 leading-relaxed">{comment.content}</p>
                          </div>
                          <div className="flex items-center gap-3 mt-1 ml-2 text-[10px] font-bold text-slate-400">
                            <span>{comment.created_at ? new Date(comment.created_at).toLocaleDateString('pt-AO') : ''}</span>
                            <button
                              onClick={() => {
                                setReplyingTo(comment);
                              }}
                              className="hover:text-[#0F4C9C] transition"
                            >
                              Responder
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Replies */}
                      {commentReplies.length > 0 && (
                        <div className="ml-10 space-y-2 border-l-2 border-slate-100 pl-3">
                          {commentReplies.map(rep => (
                            <div key={rep.id} className="flex items-start gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0 overflow-hidden mt-0.5">
                                {rep.author_avatar ? (
                                  <img src={rep.author_avatar} alt={rep.author_name} className="w-full h-full object-cover" />
                                ) : (
                                  (rep.author_name || 'U').charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="bg-slate-100 rounded-xl px-3 py-1.5">
                                  <span className="block text-[11px] font-bold text-slate-900">{rep.author_name}</span>
                                  <p className="text-xs text-slate-800 leading-relaxed">{rep.content}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Comment Input in Sheet */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 shrink-0">
              {replyingTo && (
                <div className="flex items-center justify-between text-xs text-[#0F4C9C] bg-blue-50 px-3 py-1.5 rounded-lg mb-2">
                  <span className="flex items-center gap-1 truncate">
                    <CornerDownRight className="w-3.5 h-3.5 shrink-0" />
                    A responder a <strong>{replyingTo.author_name}</strong>
                  </span>
                  <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-slate-700 font-bold ml-2">
                    ✕
                  </button>
                </div>
              )}

              {currentUser ? (
                <form onSubmit={handleAddComment} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder={replyingTo ? `Escrever resposta a ${replyingTo.author_name}...` : 'Escreva um comentário...'}
                    className="flex-1 bg-white border border-slate-300 rounded-full px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0F4C9C] focus:ring-1 focus:ring-[#0F4C9C]"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !commentText.trim()}
                    className="w-9 h-9 rounded-full bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white flex items-center justify-center shrink-0 disabled:opacity-40 transition"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="text-center py-1">
                  <button
                    onClick={() => {
                      setShowCommentsSheet(false);
                      if (onOpenAuth) onOpenAuth();
                    }}
                    className="text-xs font-bold text-[#0F4C9C] hover:underline"
                  >
                    Inicie sessão para comentar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de Confirmação de Eliminação do Post (Funciona 100% em todos os Navegadores/iFrames) */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn select-none">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-slate-200 text-center animate-scaleUp">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-slate-950">
                Apagar Publicação?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {showDeleteConfirm.message}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(null)}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer active:scale-95"
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
