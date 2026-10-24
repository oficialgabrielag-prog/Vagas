import React, { useState, useEffect } from 'react';
import { 
  User, MapPin, Phone, Mail, FileText, Award, Briefcase, 
  GraduationCap, Edit3, Trash2, Send, Image as ImageIcon, 
  CheckCircle2, Users, Building2, Sparkles, ExternalLink, 
  Calendar, Eye, Share2, ArrowRight, Check
} from 'lucide-react';
import { UserProfile, CommunityPost, ExperienceItem, EducationItem, FollowerItem } from '../lib/types';
import { StoreService } from '../lib/store';
import { uploadToCloudinary } from '../lib/cloudinary';
import { MediaViewer } from './MediaViewer';
import { EditarPerfilCandidato } from './EditarPerfilCandidato';
import { FollowersModal } from './FollowersModal';

interface CandidateProfileViewProps {
  currentUser: UserProfile;
  posts: CommunityPost[];
  onProfileUpdated: (updated: UserProfile) => void;
  onPostCreated: () => void;
  onSwitchToEmployer: () => void;
}

export const CandidateProfileView: React.FC<CandidateProfileViewProps> = ({
  currentUser,
  posts,
  onProfileUpdated,
  onPostCreated,
  onSwitchToEmployer
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [followers, setFollowers] = useState<FollowerItem[]>(() => StoreService.getFollowers(currentUser.id));
  const [activeTab, setActiveTab] = useState<'profile' | 'posts'>('profile');
  const [showCvViewer, setShowCvViewer] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Post creation in candidate profile
  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState('');
  const [postCategory, setPostCategory] = useState<'Emprego' | 'Negócios' | 'Dicas' | 'Formação'>('Emprego');
  const [uploading, setUploading] = useState(false);
  const [deleteConfirmPostId, setDeleteConfirmPostId] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (!e.detail?.targetId || e.detail.targetId === currentUser.id) {
        setFollowers(StoreService.getFollowers(currentUser.id));
      }
    };
    window.addEventListener('cunene_followers_updated', handleUpdate);
    return () => window.removeEventListener('cunene_followers_updated', handleUpdate);
  }, [currentUser.id]);

  // Exam stats & badges
  const userAttempts = StoreService.getExamAttempts().filter(a => a.candidate_id === currentUser.id);
  const avgScore = userAttempts.length > 0 
    ? Math.round(userAttempts.reduce((acc, curr) => acc + curr.percentage, 0) / userAttempts.length)
    : 0;
  
  const isTopTalent = avgScore >= 90 && userAttempts.length >= 2;
  const isQualified = avgScore >= 75 && userAttempts.length >= 1;

  // Filter candidate's own personal posts
  const candidatePosts = posts.filter(p => 
    (p.author_id === currentUser.id || 
     (p.author_name && p.author_name.toLowerCase() === currentUser.full_name?.toLowerCase())) &&
    (p.author_type === 'candidate' || (p as any).post_type === 'candidate')
  );

  const handlePostImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setPostImage(url);
    } catch {
      alert('Erro ao carregar imagem da publicação.');
    } finally {
      setUploading(false);
    }
  };

  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;

    setUploading(true);
    try {
      await StoreService.addPost({
        author_id: currentUser.id,
        author_type: 'candidate',
        author_name: currentUser.full_name,
        author_avatar: currentUser.avatar_url,
        content: postContent.trim(),
        image_url: postImage || undefined,
        category: postCategory
      });

      setPostContent('');
      setPostImage('');
      onPostCreated();
    } catch (err: any) {
      alert(err.message || 'Erro ao publicar no servidor.');
    } finally {
      setUploading(false);
    }
  };

  const handleShareProfile = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Perfil de ${currentUser.full_name} | CuneneVagas`,
          text: `Conheça o perfil profissional de ${currentUser.full_name} no CuneneVagas.`,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    navigator.clipboard?.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 font-sans">
      
      {/* 1. Header do Perfil Corporativo Moderno */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Capa de Perfil */}
        <div className="h-40 sm:h-56 relative bg-gradient-to-r from-[#193B70] via-[#244F9A] to-[#123D73] overflow-hidden">
          {currentUser.cover_url ? (
            <img 
              src={currentUser.cover_url} 
              alt="Capa de perfil" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full relative opacity-20">
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Zona do Perfil Principal */}
        <div className="px-5 sm:px-8 pb-6 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-16 sm:-mt-20 gap-5">
            
            {/* Avatar & Informações Pessoais */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white p-1 ring-4 ring-white shadow-md overflow-hidden shrink-0">
                {currentUser.avatar_url ? (
                  <img 
                    src={currentUser.avatar_url} 
                    alt={currentUser.full_name} 
                    className="w-full h-full object-cover rounded-2xl"
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <div className="w-full h-full bg-[#193B70] text-white rounded-2xl flex items-center justify-center font-black text-3xl">
                    {currentUser.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'C'}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight">
                    {currentUser.full_name}
                  </h1>

                  {/* Selos de Reconhecimento */}
                  {isTopTalent && (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-[#F5B91B]/40 px-2.5 py-0.5 rounded-lg text-xs font-bold shadow-2xs">
                      <Award className="w-3.5 h-3.5 text-[#F5B91B]" />
                      Top Talent
                    </span>
                  )}
                  {isQualified && !isTopTalent && (
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-[#193B70] border border-[#244F9A]/20 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#244F9A]" />
                      Qualificado
                    </span>
                  )}
                </div>

                <p className="text-sm sm:text-base font-semibold text-[#244F9A]">
                  {currentUser.profession || currentUser.headline || 'Profissional no Cunene'}
                </p>

                {/* Metadados não-envelopados (Anti-Slop Zero-Pill) */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-xs text-[#64748B] pt-0.5">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#193B70]" />
                    {currentUser.municipality || 'Ondjiva'}, Cunene
                  </span>
                  
                  {currentUser.phone && (
                    <>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-[#193B70]" />
                        {currentUser.phone}
                      </span>
                    </>
                  )}

                  {currentUser.email && (
                    <>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-[#193B70]" />
                        {currentUser.email}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Ações do Perfil */}
            <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-end w-full sm:w-auto pt-2 sm:pt-0">
              <button
                type="button"
                onClick={() => setIsFollowersModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#193B70] bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition cursor-pointer active:scale-95"
                title="Ver quem me seguiu"
              >
                <Users className="w-4 h-4 text-[#244F9A]" />
                <span className="tabular-nums font-extrabold">{followers.length}</span>
                <span>{followers.length === 1 ? 'Seguidor' : 'Seguidores'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareProfile}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition cursor-pointer active:scale-95"
                title="Partilhar perfil"
              >
                {shareCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copiado</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-slate-600" />
                    <span className="hidden sm:inline">Partilhar</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#244F9A] hover:bg-[#193B70] transition shadow-xs cursor-pointer active:scale-95"
              >
                <Edit3 className="w-4 h-4" />
                <span>Editar Perfil</span>
              </button>
            </div>
          </div>

          {/* Cartão de Transição para Modo Empresa se aplicável */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100/60 text-[#193B70] flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-[#244F9A]" />
              </div>
              <div>
                <p className="font-bold text-[#172033]">Representa uma empresa no Cunene?</p>
                <p className="text-[#64748B]">Alterne para o Modo Empresa para publicar vagas e gerir produtos no Marketplace.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onSwitchToEmployer}
              className="text-[#244F9A] hover:text-[#193B70] font-extrabold flex items-center gap-1 self-start sm:self-center transition"
            >
              <span>Ativar Modo Empresa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2. Barra de Navegação por Abas (Design Corporativo Refinado) */}
        <div className="flex border-t border-slate-200 px-6 sm:px-8 text-xs sm:text-sm font-bold bg-[#F8FAFC]">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-3.5 mr-8 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'border-[#244F9A] text-[#193B70]'
                : 'border-transparent text-[#64748B] hover:text-[#172033]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Perfil & Currículo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('posts')}
            className={`py-3.5 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'posts'
                ? 'border-[#244F9A] text-[#193B70]'
                : 'border-transparent text-[#64748B] hover:text-[#172033]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Minhas Publicações</span>
            <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-200/80 text-[#172033] tabular-nums font-bold">
              {candidatePosts.length}
            </span>
          </button>
        </div>
      </div>

      {/* 3. Conteúdo da Aba: Perfil & Currículo */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Coluna Esquerda: Resumo, Habilidades, Certificados, Currículo */}
          <div className="space-y-6">
            
            {/* Resumo Profissional */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <h3 className="text-xs uppercase tracking-wider font-extrabold text-[#64748B]">
                Resumo Profissional
              </h3>
              <p className="text-sm text-[#263449] leading-relaxed whitespace-pre-line">
                {currentUser.bio || 'Adicione um resumo sobre a sua experiência, objetivos e competências no botão Editar Perfil.'}
              </p>
            </div>

            {/* Habilidades & Competências */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <h3 className="text-xs uppercase tracking-wider font-extrabold text-[#64748B]">
                Competências & Habilidades
              </h3>
              <div className="flex flex-wrap gap-2">
                {currentUser.skills && currentUser.skills.length > 0 ? (
                  currentUser.skills.map((skill, i) => (
                    <span 
                      key={i} 
                      className="bg-slate-100 hover:bg-slate-200 text-[#172033] text-xs px-3 py-1.5 rounded-xl font-semibold border border-slate-200/60 transition"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-[#64748B] italic">Nenhuma habilidade adicionada ainda.</p>
                )}
              </div>
            </div>

            {/* Certificados */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <h3 className="text-xs uppercase tracking-wider font-extrabold text-[#64748B]">
                Certificados & Formações
              </h3>
              {currentUser.certificates && currentUser.certificates.length > 0 ? (
                <ul className="space-y-2.5">
                  {currentUser.certificates.map((cert, i) => (
                    <li key={i} className="text-xs text-[#263449] flex items-start gap-2.5">
                      <Award className="w-4 h-4 text-[#F5B91B] shrink-0 mt-0.5" />
                      <span className="font-medium leading-snug">{cert}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[#64748B] italic">Nenhum certificado listado.</p>
              )}
            </div>

            {/* Cartão de Currículo Vitae */}
            {currentUser.cv_url && (
              <div className="bg-[#F8FAFC] p-6 rounded-3xl border border-slate-200 text-center space-y-3">
                <div className="w-12 h-12 bg-blue-100/70 text-[#244F9A] rounded-2xl flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#172033]">Currículo Anexado</h4>
                  <p className="text-xs text-[#64748B] mt-0.5">Disponível para avaliação das empresas do Cunene</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCvViewer(true)}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#244F9A] hover:bg-[#193B70] text-white text-xs font-bold py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
                >
                  <Eye className="w-4 h-4" />
                  <span>Visualizar Currículo em Tela Cheia</span>
                </button>
              </div>
            )}

            {showCvViewer && currentUser.cv_url && (
              <MediaViewer
                media={[{ url: currentUser.cv_url, type: 'image', alt: 'Currículo Vitae de ' + currentUser.full_name }]}
                onClose={() => setShowCvViewer(false)}
              />
            )}
          </div>

          {/* Coluna Direita: Experiência Profissional & Formação Académica */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Experiência Profissional */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#244F9A] flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-[#244F9A]" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#172033]">Experiência Profissional</h3>
                    <p className="text-xs text-[#64748B]">Histórico de cargos e projetos profissionais</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-bold text-[#244F9A] hover:underline"
                >
                  Adicionar
                </button>
              </div>

              <div className="space-y-6">
                {currentUser.experiences && currentUser.experiences.length > 0 ? (
                  currentUser.experiences.map((exp, i) => (
                    <div key={i} className="relative pl-6 pb-2 border-l-2 border-[#244F9A]/30 last:border-transparent space-y-1">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-[#244F9A]" />
                      <h4 className="text-sm font-bold text-[#172033]">{exp.title}</h4>
                      <p className="text-xs font-semibold text-[#244F9A] flex items-center gap-1.5">
                        <span>{exp.company}</span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-[#64748B] font-normal">{exp.period}</span>
                      </p>
                      {exp.description && (
                        <p className="text-xs sm:text-sm text-[#475569] leading-relaxed pt-1.5 whitespace-pre-line">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400 space-y-2">
                    <Briefcase className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
                    <p className="text-xs">Nenhuma experiência profissional cadastrada ainda.</p>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-xs font-bold text-[#244F9A] hover:underline"
                    >
                      Cadastrar primeira experiência
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Formação Académica */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-[#F5B91B] flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#172033]">Formação Académica</h3>
                    <p className="text-xs text-[#64748B]">Cursos, graduações e qualificações de ensino</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-bold text-[#244F9A] hover:underline"
                >
                  Adicionar
                </button>
              </div>

              <div className="space-y-6">
                {currentUser.educations && currentUser.educations.length > 0 ? (
                  currentUser.educations.map((edu, i) => (
                    <div key={i} className="relative pl-6 pb-2 border-l-2 border-[#F5B91B]/40 last:border-transparent space-y-1">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-[#F5B91B]" />
                      <h4 className="text-sm font-bold text-[#172033]">{edu.degree}</h4>
                      <p className="text-xs font-semibold text-[#64748B] flex items-center gap-1.5">
                        <span className="text-[#172033] font-medium">{edu.institution}</span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-[#64748B] font-normal">{edu.year}</span>
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400 space-y-2">
                    <GraduationCap className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
                    <p className="text-xs">Nenhuma formação académica cadastrada ainda.</p>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-xs font-bold text-[#244F9A] hover:underline"
                    >
                      Cadastrar formação
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 4. Conteúdo da Aba: Minhas Publicações Pessoais */}
      {activeTab === 'posts' && (
        <div className="space-y-6">
          
          {/* Caixa de Publicação Pessoal */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#193B70] text-white flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                {currentUser.avatar_url ? (
                  <img src={currentUser.avatar_url} alt="Foto" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  currentUser.full_name?.charAt(0).toUpperCase() || 'C'
                )}
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[#172033]">Publicar no meu Perfil Profissional</h4>
                <p className="text-[11px] text-[#64748B]">Partilhe conquistas, procura de emprego ou certificados</p>
              </div>
            </div>

            <form onSubmit={handlePublishPost} className="space-y-3">
              <textarea
                rows={3}
                required
                value={postContent}
                onChange={e => setPostContent(e.target.value)}
                placeholder="Escreva algo sobre a sua carreira, projetos ou procura de oportunidades..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#244F9A] bg-[#F8FAFC]/50"
              />

              <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-[#172033] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition">
                    <ImageIcon className="w-4 h-4 text-[#244F9A]" />
                    <span>{uploading ? 'A carregar...' : postImage ? 'Imagem pronta' : 'Foto'}</span>
                    <input type="file" accept="image/*" onChange={handlePostImageUpload} className="hidden" />
                  </label>

                  <select
                    value={postCategory}
                    onChange={e => setPostCategory(e.target.value as any)}
                    className="bg-slate-100 text-[#172033] px-3 py-2 rounded-xl text-xs font-semibold border-none focus:outline-none cursor-pointer"
                  >
                    <option value="Emprego">Procura de Emprego</option>
                    <option value="Formação">Formação & Curso</option>
                    <option value="Dicas">Dica Profissional</option>
                    <option value="Negócios">Negócios</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={uploading || !postContent.trim()}
                  className="bg-[#244F9A] hover:bg-[#193B70] text-white font-bold px-5 py-2 rounded-xl text-xs sm:text-sm transition shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publicar</span>
                </button>
              </div>
            </form>
          </div>

          {/* Lista de Publicações do Perfil */}
          <div className="space-y-4">
            {candidatePosts.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-3xl border border-slate-200/80 text-[#64748B] text-xs space-y-2">
                <FileText className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
                <p className="font-semibold">Ainda não fez nenhuma publicação no seu perfil.</p>
                <p className="text-slate-400">Use o formulário acima para publicar a sua primeira mensagem.</p>
              </div>
            ) : (
              candidatePosts.map(post => (
                <div key={post.id} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 space-y-3.5 shadow-2xs">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#193B70] text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                        {currentUser.avatar_url ? (
                          <img src={currentUser.avatar_url} alt="Foto" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          currentUser.full_name?.charAt(0).toUpperCase() || 'C'
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-[#172033]">{currentUser.full_name}</h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
                          <span>{new Date(post.created_at).toLocaleDateString('pt-AO')}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-medium text-[#244F9A]">{post.category}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmPostId(post.id)}
                      className="text-slate-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition cursor-pointer"
                      title="Excluir publicação"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm text-[#263449] leading-relaxed whitespace-pre-line">
                    {post.content}
                  </p>

                  {post.image_url && (
                    <div className="rounded-2xl overflow-hidden border border-slate-100 max-h-96">
                      <img 
                        src={post.image_url} 
                        alt="Foto da publicação" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.classList.add('hidden');
                        }}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Exibição da Foto de Perfil na Parte Inferior da Aba Perfil */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 text-center space-y-4 shadow-2xs">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identidade Visual & Foto de Perfil</h3>
        <div className="w-28 h-28 sm:w-36 sm:h-36 mx-auto rounded-3xl ring-4 ring-[#244F9A]/20 overflow-hidden bg-slate-100 shadow-md">
          {currentUser.avatar_url ? (
            <img src={currentUser.avatar_url} alt={currentUser.full_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full bg-[#193B70] text-white flex items-center justify-center font-black text-4xl">
              {currentUser.full_name?.charAt(0).toUpperCase() || 'C'}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-base sm:text-lg font-black text-[#172033]">{currentUser.full_name}</p>
          <p className="text-xs sm:text-sm font-semibold text-[#244F9A]">{currentUser.profession || 'Candidato Profissional'}</p>
          <p className="text-xs text-slate-500">{currentUser.municipality || 'Ondjiva'}, Cunene · {currentUser.email || 'Conta Verificada'}</p>
        </div>
      </div>

      {/* Tela Única de Edição do Perfil de Candidato */}
      <EditarPerfilCandidato
        isOpen={isEditing}
        currentUser={currentUser}
        onClose={() => setIsEditing(false)}
        onProfileUpdated={onProfileUpdated}
      />

      {/* Modal de Seguidores */}
      <FollowersModal
        isOpen={isFollowersModalOpen}
        onClose={() => setIsFollowersModalOpen(false)}
        title="Quem Me Seguiu"
        followers={StoreService.getFollowers(currentUser.id)}
      />

      {/* Modal / Diálogo de Confirmação para Apagar Publicação */}
      {deleteConfirmPostId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn select-none">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-slate-200 text-center animate-scaleUp">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
              <Trash2 className="w-7 h-7 text-rose-600" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-black text-slate-950">
                Apagar Publicação?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed px-1">
                Tem a certeza de que deseja apagar esta publicação do seu perfil? Esta ação não pode ser desfeita.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPostId(null)}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer active:scale-95"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  const pid = deleteConfirmPostId;
                  setDeleteConfirmPostId(null);
                  StoreService.deletePost(pid);
                  onPostCreated();
                }}
                className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs sm:text-sm rounded-xl transition shadow-md cursor-pointer active:scale-95"
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
