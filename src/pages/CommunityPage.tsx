import React, { useState } from 'react';
import { Users, ThumbsUp, MessageSquare, Send, Image as ImageIcon, Trash2, Tag, Building2, User, Maximize2 } from 'lucide-react';
import { CommunityPost, UserProfile, COMMUNITY_CATEGORIES, PostReactionType } from '../lib/types';
import { StoreService } from '../lib/store';
import { uploadToCloudinary } from '../lib/cloudinary';
import { supabase } from '../lib/supabase';
import { ImageUploader } from '../components/ImageUploader';
import { VerticalReactionsPicker, REACTIONS_CONFIG } from '../components/VerticalReactionsPicker';

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
  const [commentText, setCommentText] = useState('');

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

      await StoreService.addPost({
        author_id: currentUser.id,
        author_type: isEmployer ? 'employer' : 'candidate',
        author_name: authorName,
        author_avatar: authorAvatar,
        company_id: cleanCompanyId,
        content: content.trim(),
        image_url: imageUrl || undefined,
        category: postCategory
      });

      setContent('');
      setImageUrl('');
      onPostCreated();
    } catch (err: any) {
      alert(err.message || 'Erro ao publicar. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleReactionSelect = async (postId: string, type: PostReactionType) => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    const updated = await StoreService.reactToPost(postId, type, currentUser.id);
    setActiveReactionPickerPostId(null);
    if (updated) {
      onPostUpdated(updated);
    }
  };

  const handleDeletePost = (postId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta publicação?')) {
      StoreService.deletePost(postId);
      onPostCreated(); // Full refresh needed for deletion
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-20">
      {/* Header - Domain Native */}
      <div className="bg-[#0F4C9C] text-white p-8 rounded-[2.5rem] shadow-sm space-y-3 relative overflow-hidden">
        <div className="meta-text text-[#FFC20E]">
          <span>Comunidade</span>
          <span className="meta-separator bg-[#FFC20E]"></span>
          <span>Rede Profissional do Cunene</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black">Partilhe & Conecte-se</h1>
        <p className="text-blue-100 text-xs sm:text-sm font-medium opacity-90 max-w-xl">
          Anúncios de contratação, conquistas de formação e oportunidades de negócios no Sul de Angola.
        </p>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {COMMUNITY_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === cat
                ? 'bg-[#0F4C9C] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Create Post Card */}
      {currentUser ? (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#0F4C9C] text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
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
            <div>
              <span className="font-bold text-slate-900 block text-xs">
                {currentUser.role === 'employer' ? (currentUser.company?.name || currentUser.company_name || currentUser.full_name) : currentUser.full_name}
              </span>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.2 rounded-full inline-block mt-0.5 ${
                currentUser.role === 'employer' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {currentUser.role === 'employer' ? 'Publicando como Empresa' : 'Publicando como Candidato'}
              </span>
            </div>
          </div>

          <form onSubmit={handleCreatePost} className="space-y-3">
            <textarea
              rows={3}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={
                currentUser.role === 'employer'
                  ? 'Publique uma novidade, oportunidade ou comunicado da sua empresa...'
                  : 'Escreva uma conquista, formação ou dica profissional...'
              }
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C9C]"
            />

            <ImageUploader
              context="community-post"
              currentImageUrl={imageUrl}
              onUploadSuccess={url => setImageUrl(url)}
              onRemove={() => setImageUrl('')}
              label="Anexar Imagem à Publicação (Cloudinary)"
            />

            <div className="flex flex-wrap justify-between items-center gap-2 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <select
                  value={postCategory}
                  onChange={e => setPostCategory(e.target.value as any)}
                  className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold border-none"
                >
                  <option value="Emprego">Emprego</option>
                  <option value="Negócios">Negócios</option>
                  <option value="Dicas">Dicas</option>
                  <option value="Formação">Formação</option>
                  <option value="Empresas">Empresas</option>
                  <option value="Marketplace">Marketplace</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={!content.trim()}
                className="bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-bold px-5 py-2 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publicar</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 text-center space-y-2">
          <p className="text-xs text-slate-600">Inicie sessão para partilhar publicações e interagir com a comunidade.</p>
          <button
            onClick={onOpenAuth}
            className="bg-[#0F4C9C] text-white font-bold px-4 py-2 rounded-xl text-xs"
          >
            Entrar no CuneneVagas
          </button>
        </div>
      )}

      {/* Feed list */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-400 text-xs">
            Nenhuma publicação nesta categoria ainda.
          </div>
        ) : (
          filteredPosts.map(post => {
            const authorDisplayName = post.author_name || (post as any).author?.company_name || (post as any).author?.full_name || 'Profissional';
            const authorDisplayAvatar = post.author_avatar || (post as any).author?.avatar_url;
            const isEmpPost = post.author_type === 'employer' || (post as any).post_type === 'employer';

            return (
              <div key={post.id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
                {/* Post author header */}
                <div className="flex justify-between items-start">
                  <div 
                    onClick={() => handleAuthorClick(post.author_id, authorDisplayName, authorDisplayAvatar, isEmpPost)}
                    className="flex items-center gap-3 cursor-pointer group hover:opacity-95 transition"
                    title={`Ver perfil de ${authorDisplayName}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#0F4C9C] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden ring-2 ring-transparent group-hover:ring-[#0F4C9C]/30 transition shadow-2xs">
                      {authorDisplayAvatar ? (
                        <img src={authorDisplayAvatar} alt={authorDisplayName} className="w-full h-full object-cover" />
                      ) : (
                        authorDisplayName.charAt(0)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-slate-900 leading-tight group-hover:text-[#0F4C9C] group-hover:underline transition">
                          {authorDisplayName}
                        </h4>
                        <span className="meta-separator"></span>
                        <span className={`text-[10px] font-black uppercase ${
                          isEmpPost ? 'text-amber-600' : 'text-[#0F4C9C]'
                        }`}>
                          {isEmpPost ? 'Empresa' : 'Candidato'}
                        </span>
                      </div>
                      <div className="meta-text mt-1 text-slate-400">
                        <span>{new Date(post.created_at).toLocaleDateString('pt-AO')}</span>
                        <span className="meta-separator"></span>
                        <span className="text-slate-500">
                          {post.category || 'Geral'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {currentUser && post.author_id === currentUser.id && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="text-slate-400 hover:text-red-600 p-1"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Post content */}
                <p 
                  onClick={() => onSelectPost && onSelectPost(post)}
                  className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line cursor-pointer hover:text-slate-900"
                >
                  {post.content}
                </p>

                {/* Post Image */}
                {post.image_url && (
                  <div 
                    onClick={() => onSelectPost && onSelectPost(post)}
                    className="rounded-2xl overflow-hidden border border-slate-100 max-h-80 bg-slate-50 cursor-pointer hover:opacity-95 transition"
                  >
                    <img 
                      src={post.image_url} 
                      alt="Publicação" 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        e.currentTarget.parentElement?.classList.add('hidden');
                      }}
                    />
                  </div>
                )}

                {/* Interactions bar */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-xs text-slate-600 font-semibold relative">
                  <div className="flex items-center gap-1">
                    <div className="relative">
                      <button
                        onClick={() => setActiveReactionPickerPostId(activeReactionPickerPostId === post.id ? null : post.id)}
                        className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl transition ${
                          post.user_reaction ? 'text-[#0F4C9C] font-bold bg-blue-50' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {post.user_reaction ? (
                          <span className="text-sm">{REACTIONS_CONFIG.find(r => r.type === post.user_reaction)?.emoji || '👍'}</span>
                        ) : (
                          <ThumbsUp className="w-3.5 h-3.5" />
                        )}
                        <span>{post.user_reaction ? REACTIONS_CONFIG.find(r => r.type === post.user_reaction)?.label : 'Gostar'}</span>
                      </button>

                      {/* Vertical Reaction Selector */}
                      {activeReactionPickerPostId === post.id && (
                        <VerticalReactionsPicker
                          currentReaction={post.user_reaction}
                          onSelectReaction={(type) => handleReactionSelect(post.id, type)}
                          onClose={() => setActiveReactionPickerPostId(null)}
                          position="top"
                        />
                      )}
                    </div>
                    
                    <span className="text-slate-400 font-medium ml-1">{post.likes_count || 0}</span>
                  </div>

                  <button
                    onClick={() => {
                      if (onSelectPost) {
                        onSelectPost(post);
                      } else {
                        setActiveCommentsPostId(activeCommentsPostId === post.id ? null : post.id);
                      }
                    }}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-[#0F4C9C] bg-[#0F4C9C]/10 font-bold hover:bg-[#0F4C9C]/20 transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{post.comments_count || 0} Comentários • Abrir</span>
                  </button>
                </div>

                {/* Comments Section Drawer */}
                {activeCommentsPostId === post.id && (
                  <div className="pt-3 border-t border-slate-100 space-y-3 bg-slate-50 p-3 rounded-2xl">
                    {/* Comments list */}
                    <div className="space-y-2">
                      {(!post.comments || post.comments.filter(c => c.author_id !== 'system_reactions_metadata').length === 0) ? (
                        <p className="text-[11px] text-slate-400 italic">Seja o primeiro a comentar...</p>
                      ) : (
                        post.comments.filter(c => c.author_id !== 'system_reactions_metadata').map(c => (
                          <div key={c.id} className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs space-y-0.5">
                            <span 
                              onClick={() => handleAuthorClick(c.author_id, c.author_name, c.author_avatar, false)}
                              className="font-bold text-slate-900 block text-[11px] cursor-pointer hover:underline hover:text-[#0F4C9C] transition"
                              title={`Ver perfil de ${c.author_name}`}
                            >
                              {c.author_name}
                            </span>
                            <p className="text-slate-700">{c.content}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add comment input */}
                    {currentUser ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          placeholder="Escrever um comentário..."
                          className="flex-1 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          className="bg-[#0F4C9C] text-white px-3 py-1.5 rounded-xl text-xs font-bold"
                        >
                          Enviar
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
