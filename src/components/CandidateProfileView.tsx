import React, { useState, useEffect } from 'react';
import { 
  User, MapPin, Phone, Mail, FileText, Award, Briefcase, 
  GraduationCap, Edit3, Trash2, Send, Image as ImageIcon, 
  CheckCircle2, Users, Building2, ExternalLink, 
  Eye, Share2, ArrowRight, Check, Bookmark, Clock, Plus,
  ShieldCheck, AlertCircle, Sparkles
} from 'lucide-react';
import { UserProfile, CommunityPost, FollowerItem } from '../lib/types';
import { StoreService } from '../lib/store';
import { toUserErrorMessage } from '../lib/errorMessages';
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
  const [activeTab, setActiveTab] = useState<'profile' | 'applications' | 'saved' | 'exams' | 'posts'>('profile');
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

  // Exam stats & attempts
  const userAttempts = StoreService.getExamAttempts().filter(a => a.candidate_id === currentUser.id);
  const avgScore = userAttempts.length > 0 
    ? Math.round(userAttempts.reduce((acc, curr) => acc + curr.percentage, 0) / userAttempts.length)
    : 0;
  
  const isTopTalent = avgScore >= 90 && userAttempts.length >= 2;
  const isQualified = avgScore >= 75 && userAttempts.length >= 1;

  // Applications & Saved Jobs
  const myApplications = StoreService.getApplications().filter(a => a.candidate_id === currentUser.id);
  const mySavedJobIds = StoreService.getSavedJobs(currentUser.id);
  const allJobs = StoreService.getJobs();
  const mySavedJobs = allJobs.filter(j => mySavedJobIds.includes(j.id));

  // Filter candidate's own personal posts
  const candidatePosts = posts.filter(p => 
    (p.author_id === currentUser.id || 
     (p.author_name && p.author_name.toLowerCase() === currentUser.full_name?.toLowerCase())) &&
    (p.author_type === 'candidate' || (p as any).post_type === 'candidate')
  );

  // Profile Completeness Calculation
  const completenessItems = [
    { label: 'Foto de Perfil', done: !!currentUser.avatar_url, weight: 15 },
    { label: 'Resumo / Sobre mim', done: !!currentUser.bio, weight: 15 },
    { label: 'Profissão / Título', done: !!(currentUser.profession || currentUser.headline), weight: 15 },
    { label: 'Competências / Habilidades', done: !!(currentUser.skills && currentUser.skills.length > 0), weight: 15 },
    { label: 'Experiência Profissional', done: !!(currentUser.experiences && currentUser.experiences.length > 0), weight: 15 },
    { label: 'Formação Académica', done: !!(currentUser.educations && currentUser.educations.length > 0), weight: 10 },
    { label: 'Currículo Anexado (CV)', done: !!currentUser.cv_url, weight: 15 },
  ];

  const completenessPercentage = completenessItems.reduce((acc, item) => item.done ? acc + item.weight : acc, 0);
  const missingItems = completenessItems.filter(item => !item.done);

  const handlePostImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setPostImage(url);
    } catch {
      alert('Não foi possível carregar a imagem da publicação.');
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
    } catch (err: unknown) {
      console.warn('Erro ao publicar no perfil:', err);
      alert(toUserErrorMessage(err, 'Não foi possível concluir a publicação. Tenta novamente.'));
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

  // Helper for application status steps
  const APPLICATION_STEPS = ['Enviada', 'Em análise', 'Selecionada para exame', 'Exame realizado', 'Aprovada'];

  const getStepIndex = (status?: string) => {
    if (!status) return 0;
    if (status === 'Rejeitada') return -1;
    const idx = APPLICATION_STEPS.indexOf(status);
    return idx >= 0 ? idx : 0;
  };

  return (
    <div className="max-w-[480px] sm:max-w-5xl mx-auto space-y-5 pb-20 font-sans text-[#16213a]">
      
      {/* 1. Header do Perfil: Capa Fina + Avatar Redondo Overlapping */}
      <div className="bg-card rounded-[22px] border border-[#e0e6ee] shadow-2xs overflow-hidden">
        
        {/* Capa fina no topo (h-[116px]) */}
        <div 
          className="h-[116px] sm:h-[140px] relative bg-[#14305f] overflow-hidden"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.09) 1.2px, transparent 1.3px)',
            backgroundSize: '22px 22px'
          }}
        >
          {currentUser.cover_url ? (
            <img 
              src={currentUser.cover_url} 
              alt="Capa de perfil" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
          ) : null}
        </div>

        {/* Informações Principais do Candidato */}
        <div className="px-4 sm:px-6 pb-5 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-12 sm:-mt-14 gap-4">
            
            {/* Avatar Redondo Grande (92px) Sobreposto */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
              <div className="w-[92px] h-[92px] rounded-full ring-4 ring-white shadow-xs overflow-hidden shrink-0 bg-white relative z-10">
                {currentUser.avatar_url ? (
                  <img 
                    src={currentUser.avatar_url} 
                    alt={currentUser.full_name} 
                    className="w-full h-full object-cover rounded-full"
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <div className="w-full h-full bg-[#1d5fc4] text-white rounded-full flex items-center justify-center font-display font-extrabold text-3xl">
                    {currentUser.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'C'}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-xl sm:text-2xl font-display font-extrabold text-[#16213a] tracking-tight leading-tight">
                    {currentUser.full_name}
                  </h1>

                  {/* Selos de Reconhecimento */}
                  {isTopTalent && (
                    <span className="inline-flex items-center gap-1 bg-[#fbeec2] text-[#5b4300] px-2.5 py-0.5 rounded-full text-[12px] font-bold">
                      <Award className="w-3.5 h-3.5 text-[#f0b823]" />
                      Top Talent
                    </span>
                  )}
                  {isQualified && !isTopTalent && (
                    <span className="inline-flex items-center gap-1 bg-[#d8efe2] text-[#14573a] px-2.5 py-0.5 rounded-full text-[12px] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1d8a52]" />
                      Qualificado
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm font-semibold text-[#1d5fc4]">
                  {currentUser.profession || currentUser.headline || 'Profissional no Cunene'}
                </p>

                {/* Etiquetas de Disponibilidade, Município e Email Verificado */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-[12.5px]">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#d8efe2] text-[#14573a] px-2.5 py-0.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-[#1d8a52] animate-pulse" />
                    {currentUser.availability || 'Disponível para trabalhar'}
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-full bg-[#e9eef6] text-[#16213a] px-2.5 py-0.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-[#1d5fc4]" />
                    {currentUser.municipality || 'Ondjiva'}, Cunene
                  </span>

                  {currentUser.is_email_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-[#1d5fc4] border border-blue-200/60 px-2.5 py-0.5 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#1d5fc4]" />
                      Email Verificado
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Botões "Editar perfil" e "Partilhar" */}
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end w-full sm:w-auto pt-2 sm:pt-0">
              <button
                type="button"
                onClick={handleShareProfile}
                className="bg-[#e9eef6] hover:bg-slate-200 text-[#16213a] font-bold rounded-xl px-4 py-2.5 text-xs sm:text-sm transition inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Partilhar perfil"
              >
                {shareCopied ? (
                  <>
                    <Check className="w-4 h-4 text-[#1d8a52]" />
                    <span className="text-[#1d8a52] font-bold">Copiado</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-[#5d6778]" />
                    <span>Partilhar</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="bg-[#1d5fc4] hover:bg-[#14305f] text-white font-bold rounded-xl px-5 py-2.5 text-xs sm:text-sm transition shadow-2xs inline-flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Edit3 className="w-4 h-4" />
                <span>Editar Perfil</span>
              </button>
            </div>
          </div>

          {/* Cartão de Transição para Modo Empresa */}
          <div className="mt-4 pt-3.5 border-t border-[#e0e6ee] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-[#e9eef6]/50 p-3.5 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#14305f] flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-[#1d5fc4]" />
              </div>
              <div>
                <p className="font-bold text-[#16213a]">Representa uma empresa no Cunene?</p>
                <p className="text-[#5d6778]">Alterne para o Modo Empresa para publicar vagas e gerir produtos no Marketplace.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onSwitchToEmployer}
              className="text-[#1d5fc4] hover:text-[#14305f] font-extrabold flex items-center gap-1 self-start sm:self-center transition cursor-pointer"
            >
              <span>Ativar Modo Empresa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Faixa de 4 Números (candidaturas, guardadas, exame, seguidores) */}
      <div className="bg-card border border-[#e0e6ee] rounded-[20px] p-3 sm:p-4 grid grid-cols-4 divide-x divide-[#e0e6ee] text-center shadow-2xs">
        <button 
          type="button"
          onClick={() => setActiveTab('applications')}
          className="px-2 hover:bg-slate-50/80 transition rounded-xl py-1 cursor-pointer"
        >
          <div className="text-lg sm:text-2xl font-display font-extrabold text-[#1d5fc4] tabular-nums">
            {myApplications.length}
          </div>
          <div className="text-[11px] sm:text-xs text-[#5d6778] font-medium leading-tight mt-0.5">
            Candidaturas
          </div>
        </button>

        <button 
          type="button"
          onClick={() => setActiveTab('saved')}
          className="px-2 hover:bg-slate-50/80 transition rounded-xl py-1 cursor-pointer"
        >
          <div className="text-lg sm:text-2xl font-display font-extrabold text-[#16213a] tabular-nums">
            {mySavedJobIds.length}
          </div>
          <div className="text-[11px] sm:text-xs text-[#5d6778] font-medium leading-tight mt-0.5">
            Guardadas
          </div>
        </button>

        <button 
          type="button"
          onClick={() => setActiveTab('exams')}
          className="px-2 hover:bg-slate-50/80 transition rounded-xl py-1 cursor-pointer"
        >
          <div className="text-lg sm:text-2xl font-display font-extrabold text-[#14573a] tabular-nums">
            {avgScore > 0 ? `${avgScore}%` : userAttempts.length}
          </div>
          <div className="text-[11px] sm:text-xs text-[#5d6778] font-medium leading-tight mt-0.5">
            {avgScore > 0 ? 'Média Exames' : 'Exames'}
          </div>
        </button>

        <button 
          type="button"
          onClick={() => setIsFollowersModalOpen(true)}
          className="px-2 hover:bg-slate-50/80 transition rounded-xl py-1 cursor-pointer"
        >
          <div className="text-lg sm:text-2xl font-display font-extrabold text-[#16213a] tabular-nums">
            {followers.length}
          </div>
          <div className="text-[11px] sm:text-xs text-[#5d6778] font-medium leading-tight mt-0.5">
            Seguidores
          </div>
        </button>
      </div>

      {/* 3. Separadores em Chips */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 px-1">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-[#14305f] text-white shadow-2xs'
              : 'bg-card border border-[#e0e6ee] text-[#5d6778] hover:text-[#16213a] hover:bg-[#e9eef6]'
          }`}
        >
          Perfil & Currículo
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('applications')}
          className={`rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'applications'
              ? 'bg-[#14305f] text-white shadow-2xs'
              : 'bg-card border border-[#e0e6ee] text-[#5d6778] hover:text-[#16213a] hover:bg-[#e9eef6]'
          }`}
        >
          <span>Candidaturas</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${activeTab === 'applications' ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#16213a]'}`}>
            {myApplications.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('saved')}
          className={`rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'saved'
              ? 'bg-[#14305f] text-white shadow-2xs'
              : 'bg-card border border-[#e0e6ee] text-[#5d6778] hover:text-[#16213a] hover:bg-[#e9eef6]'
          }`}
        >
          <span>Guardadas</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${activeTab === 'saved' ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#16213a]'}`}>
            {mySavedJobIds.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('exams')}
          className={`rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'exams'
              ? 'bg-[#14305f] text-white shadow-2xs'
              : 'bg-card border border-[#e0e6ee] text-[#5d6778] hover:text-[#16213a] hover:bg-[#e9eef6]'
          }`}
        >
          <span>Exames</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${activeTab === 'exams' ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#16213a]'}`}>
            {userAttempts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('posts')}
          className={`rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'posts'
              ? 'bg-[#14305f] text-white shadow-2xs'
              : 'bg-card border border-[#e0e6ee] text-[#5d6778] hover:text-[#16213a] hover:bg-[#e9eef6]'
          }`}
        >
          <span>Minhas Publicações</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${activeTab === 'posts' ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#16213a]'}`}>
            {candidatePosts.length}
          </span>
        </button>
      </div>

      {/* 4. CONTEÚDO: TAB PERFIL */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* Coluna Esquerda: Completa o perfil, Sobre, Competências, Contactos, Currículo */}
          <div className="space-y-5">
            
            {/* Cartão "Perfil N% completo" */}
            <div className="bg-card border border-[#e0e6ee] rounded-[18px] p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-wider font-extrabold text-[#5d6778] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#1d5fc4]" />
                  Força do Perfil
                </h3>
                <span className="text-xs font-extrabold text-[#1d5fc4] tabular-nums">
                  {completenessPercentage}%
                </span>
              </div>

              {/* Barra de Progresso */}
              <div className="w-full h-2.5 bg-[#e9eef6] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#1d5fc4] transition-all duration-500 rounded-full"
                  style={{ width: `${completenessPercentage}%` }}
                />
              </div>

              {missingItems.length > 0 && (
                <div className="pt-1">
                  <p className="text-[11px] font-semibold text-[#5d6778] mb-1.5">Para atingir 100%, adicione:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {missingItems.slice(0, 3).map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="text-[11px] font-bold text-[#1d5fc4] bg-[#e9eef6] hover:bg-blue-100 px-2.5 py-1 rounded-full transition cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Cartão "Sobre" / Resumo Profissional */}
            <div className="bg-card border border-[#e0e6ee] rounded-[18px] p-4 sm:p-5 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-extrabold text-base text-[#16213a]">
                  Sobre mim
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-bold text-[#1d5fc4] hover:underline"
                >
                  Editar
                </button>
              </div>
              <p className="text-xs sm:text-sm text-[#16213a] leading-relaxed whitespace-pre-line">
                {currentUser.bio || 'Adicione um resumo sobre a sua experiência profissional, objetivos de carreira e diferenciais.'}
              </p>
            </div>

            {/* Cartão Competências & Idiomas (como tags) */}
            <div className="bg-card border border-[#e0e6ee] rounded-[18px] p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-extrabold text-base text-[#16213a]">
                  Competências & Idiomas
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-bold text-[#1d5fc4] hover:underline"
                >
                  Editar
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {currentUser.skills && currentUser.skills.length > 0 ? (
                  currentUser.skills.map((skill, i) => (
                    <span 
                      key={i} 
                      className="rounded-full bg-[#e9eef6] text-[#16213a] px-3 py-1 text-[12.5px] font-medium"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-[#5d6778] italic">Nenhuma competência adicionada.</p>
                )}

                {currentUser.languages && currentUser.languages.map((lang, i) => (
                  <span 
                    key={`lang-${i}`} 
                    className="rounded-full bg-[#d8efe2] text-[#14573a] px-3 py-1 text-[12.5px] font-medium"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>

            {/* Cartão Currículo Anexado */}
            <div className="bg-card border border-[#e0e6ee] rounded-[18px] p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-extrabold text-base text-[#16213a]">
                  Currículo Vitae (CV)
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-bold text-[#1d5fc4] hover:underline"
                >
                  {currentUser.cv_url ? 'Alterar' : 'Anexar'}
                </button>
              </div>

              {currentUser.cv_url ? (
                <div className="bg-[#e9eef6]/60 p-3.5 rounded-xl space-y-2 text-center">
                  <FileText className="w-8 h-8 text-[#1d5fc4] mx-auto opacity-80" />
                  <div>
                    <p className="text-xs font-bold text-[#16213a]">Documento de CV Ativo</p>
                    <p className="text-[11px] text-[#5d6778]">Acessível para recrutadores ao candidatar-se</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCvViewer(true)}
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-[#1d5fc4] hover:bg-[#14305f] text-white text-xs font-bold py-2 px-3 rounded-lg transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Visualizar CV</span>
                  </button>
                </div>
              ) : (
                <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                  <FileText className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs text-[#5d6778]">Sem documento de CV em anexo.</p>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-xs font-bold text-[#1d5fc4] hover:underline"
                  >
                    Anexar ficheiro PDF ou Imagem
                  </button>
                </div>
              )}
            </div>

            {/* Cartão de Contacto */}
            <div className="bg-card border border-[#e0e6ee] rounded-[18px] p-4 sm:p-5 shadow-2xs space-y-3">
              <h3 className="font-display font-extrabold text-base text-[#16213a]">
                Informações de Contacto
              </h3>
              <div className="space-y-2 text-xs text-[#16213a]">
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-[#1d5fc4] shrink-0" />
                  <span>{currentUser.phone || currentUser.whatsapp || 'Não especificado'}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#1d5fc4] shrink-0" />
                  <span>{currentUser.email || 'Não especificado'}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-[#1d5fc4] shrink-0" />
                  <span>{currentUser.municipality || 'Ondjiva'}, Cunene, Angola</span>
                </div>
              </div>
            </div>

          </div>

          {/* Coluna Direita: Linhas de Tempo de Experiência e Formação */}
          <div className="lg:col-span-2 space-y-5">
            
            {/* Experiência Profissional (Linha do tempo vertical) */}
            <div className="bg-card border border-[#e0e6ee] rounded-[18px] p-5 sm:p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#e0e6ee]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#e9eef6] text-[#1d5fc4] flex items-center justify-center">
                    <Briefcase className="w-4 h-4 text-[#1d5fc4]" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-base text-[#16213a]">Experiência Profissional</h3>
                    <p className="text-xs text-[#5d6778]">Histórico vertical de cargos e empregos</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="bg-[#e9eef6] hover:bg-slate-200 text-[#16213a] font-bold text-xs px-3 py-1.5 rounded-xl transition inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </div>

              <div className="space-y-6 pt-1">
                {currentUser.experiences && currentUser.experiences.length > 0 ? (
                  currentUser.experiences.map((exp, i) => (
                    <div key={i} className="relative pl-6 pb-2 border-l-2 border-[#1d5fc4]/30 last:border-transparent space-y-1">
                      <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-[#1d5fc4] ring-4 ring-white" />
                      
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <h4 className="font-display font-extrabold text-sm sm:text-base text-[#16213a]">{exp.title}</h4>
                        <span className="text-[11px] font-semibold text-[#5d6778] bg-[#e9eef6] px-2 py-0.5 rounded-md">
                          {exp.period}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-[#1d5fc4]">{exp.company}</p>

                      {exp.description && (
                        <p className="text-xs sm:text-sm text-[#5d6778] leading-relaxed pt-1.5 whitespace-pre-line">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-[#5d6778] space-y-2 bg-[#F8FAFC] rounded-2xl border border-dashed border-[#e0e6ee]">
                    <Briefcase className="w-8 h-8 mx-auto opacity-40 text-[#5d6778]" />
                    <p className="text-xs">Nenhuma experiência profissional cadastrada ainda.</p>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-xs font-bold text-[#1d5fc4] hover:underline"
                    >
                      + Adicionar Experiência
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Formação Académica (Linha do tempo vertical) */}
            <div className="bg-card border border-[#e0e6ee] rounded-[18px] p-5 sm:p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#e0e6ee]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#fbeec2] text-[#5b4300] flex items-center justify-center">
                    <GraduationCap className="w-4 h-4 text-[#f0b823]" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-base text-[#16213a]">Formação Académica</h3>
                    <p className="text-xs text-[#5d6778]">Qualificações de ensino e graus obtidos</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="bg-[#e9eef6] hover:bg-slate-200 text-[#16213a] font-bold text-xs px-3 py-1.5 rounded-xl transition inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </div>

              <div className="space-y-6 pt-1">
                {currentUser.educations && currentUser.educations.length > 0 ? (
                  currentUser.educations.map((edu, i) => (
                    <div key={i} className="relative pl-6 pb-2 border-l-2 border-[#f0b823]/50 last:border-transparent space-y-1">
                      <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-[#f0b823] ring-4 ring-white" />
                      
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <h4 className="font-display font-extrabold text-sm sm:text-base text-[#16213a]">{edu.degree}</h4>
                        <span className="text-[11px] font-semibold text-[#5d6778] bg-[#e9eef6] px-2 py-0.5 rounded-md">
                          {edu.year}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-[#5d6778]">{edu.institution}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-[#5d6778] space-y-2 bg-[#F8FAFC] rounded-2xl border border-dashed border-[#e0e6ee]">
                    <GraduationCap className="w-8 h-8 mx-auto opacity-40 text-[#5d6778]" />
                    <p className="text-xs">Nenhuma formação académica cadastrada ainda.</p>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-xs font-bold text-[#1d5fc4] hover:underline"
                    >
                      + Adicionar Formação
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 5. CONTEÚDO: TAB CANDIDATURAS */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-display font-extrabold text-lg text-[#16213a]">
              Minhas Candidaturas ({myApplications.length})
            </h2>
            <span className="text-xs font-semibold text-[#5d6778]">Acompanhamento em tempo real</span>
          </div>

          {myApplications.length === 0 ? (
            <div className="bg-card border border-[#e0e6ee] rounded-[20px] p-10 text-center text-[#5d6778] space-y-3">
              <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs sm:text-sm font-bold text-[#16213a]">Ainda não se candidatou a nenhuma vaga.</p>
              <p className="text-xs text-[#5d6778]">Consulte o separador Vagas para encontrar e enviar candidaturas.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myApplications.map((app) => {
                const currentStepIdx = getStepIndex(app.status);
                const isRejected = app.status === 'Rejeitada';

                return (
                  <div key={app.id} className="bg-card border border-[#e0e6ee] rounded-[20px] p-4 sm:p-5 shadow-2xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e0e6ee] pb-3">
                      <div>
                        <h3 className="font-display font-extrabold text-base text-[#16213a]">
                          {app.job?.title || 'Vaga de Emprego'}
                        </h3>
                        <p className="text-xs font-semibold text-[#1d5fc4] mt-0.5">
                          {app.job?.company_name || 'Empresa Registada'} · {app.job?.municipality || 'Cunene'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                          isRejected 
                            ? 'bg-[#f7dcdc] text-[#8d2626]' 
                            : app.status === 'Aprovada'
                            ? 'bg-[#d8efe2] text-[#14573a]'
                            : 'bg-[#e9eef6] text-[#16213a]'
                        }`}>
                          {app.status || 'Enviada'}
                        </span>
                        <span className="text-[11px] text-[#5d6778]">
                          {new Date(app.created_at).toLocaleDateString('pt-AO')}
                        </span>
                      </div>
                    </div>

                    {/* Barra de Estado com 5 passos */}
                    {!isRejected ? (
                      <div className="space-y-2 pt-1">
                        <div className="flex justify-between items-center text-[10.5px] sm:text-xs font-bold text-[#5d6778]">
                          {APPLICATION_STEPS.map((step, idx) => (
                            <span 
                              key={step} 
                              className={`text-center ${idx <= currentStepIdx ? 'text-[#1d5fc4]' : 'text-slate-400'}`}
                            >
                              {step}
                            </span>
                          ))}
                        </div>

                        {/* Progress line */}
                        <div className="w-full h-2 bg-[#e9eef6] rounded-full overflow-hidden flex">
                          {APPLICATION_STEPS.map((_, idx) => (
                            <div 
                              key={idx} 
                              className={`flex-1 h-full transition-colors border-r border-white/40 last:border-r-0 ${
                                idx <= currentStepIdx ? 'bg-[#1d5fc4]' : 'bg-[#e9eef6]'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#f7dcdc]/50 p-3 rounded-xl border border-red-200/60 text-xs text-[#8d2626] font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>A empresa concluiu a avaliação e esta candidatura foi encerrada.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. CONTEÚDO: TAB GUARDADAS */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-display font-extrabold text-lg text-[#16213a]">
              Vagas Guardadas ({mySavedJobs.length})
            </h2>
          </div>

          {mySavedJobs.length === 0 ? (
            <div className="bg-card border border-[#e0e6ee] rounded-[20px] p-10 text-center text-[#5d6778] space-y-3">
              <Bookmark className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs sm:text-sm font-bold text-[#16213a]">Nenhuma vaga guardada na sua lista.</p>
              <p className="text-xs text-[#5d6778]">Ao consultar vagas, clique no ícone do coração/marcador para guardar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {mySavedJobs.map((job) => (
                <div key={job.id} className="bg-card border border-[#e0e6ee] rounded-[20px] p-4 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display font-extrabold text-base text-[#16213a] line-clamp-1">
                        {job.title}
                      </h3>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          StoreService.toggleSaveJob(currentUser.id, job.id);
                          onProfileUpdated({ ...currentUser });
                        }}
                        className="text-red-500 hover:text-red-700 p-1 transition cursor-pointer"
                        title="Remover das guardadas"
                      >
                        <Bookmark className="w-4 h-4 fill-current" />
                      </button>
                    </div>

                    <p className="text-xs font-bold text-[#1d5fc4]">{job.company_name} · {job.municipality || 'Cunene'}</p>

                    <div className="flex flex-wrap gap-1.5 text-xs pt-1">
                      {job.salary_min && (
                        <span className="rounded-full bg-[#fbeec2] text-[#5b4300] px-2.5 py-0.5 font-bold">
                          {job.salary_min.toLocaleString('pt-AO')} Kz
                        </span>
                      )}
                      <span className="rounded-full bg-[#e9eef6] text-[#16213a] px-2.5 py-0.5 font-medium">
                        {job.contract_type || 'Tempo Inteiro'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. CONTEÚDO: TAB EXAMES */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-display font-extrabold text-lg text-[#16213a]">
              Certificados & Exames ({userAttempts.length})
            </h2>
          </div>

          {userAttempts.length === 0 ? (
            <div className="bg-card border border-[#e0e6ee] rounded-[20px] p-10 text-center text-[#5d6778] space-y-3">
              <Award className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs sm:text-sm font-bold text-[#16213a]">Nenhum exame realizado até ao momento.</p>
              <p className="text-xs text-[#5d6778]">Ao candidatar-se a vagas com testes técnicos, os seus resultados aparecerão aqui.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {userAttempts.map((attempt) => (
                <div key={attempt.id} className="border-2 border-[#f0b823] rounded-2xl p-4 bg-white shadow-2xs space-y-3 relative overflow-hidden">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#5b4300] bg-[#fbeec2] px-2 py-0.5 rounded-md inline-block">
                        Certificado Digital
                      </span>
                      <h3 className="font-display font-extrabold text-base text-[#16213a]">
                        Exame de Seleção Técnica
                      </h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#f0b823] flex flex-col items-center justify-center border border-[#f0b823]/40 shrink-0 font-display font-black text-sm">
                      <span>{attempt.percentage}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className={`font-bold px-2.5 py-0.5 rounded-full ${
                      attempt.passed ? 'bg-[#d8efe2] text-[#14573a]' : 'bg-[#f7dcdc] text-[#8d2626]'
                    }`}>
                      {attempt.passed ? 'Aprovado' : 'Não Aprovado'}
                    </span>
                    <span className="text-[11px] text-[#5d6778]">
                      {new Date(attempt.created_at).toLocaleDateString('pt-AO')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 8. CONTEÚDO: TAB MINHAS PUBLICAÇÕES */}
      {activeTab === 'posts' && (
        <div className="space-y-5">
          
          {/* Caixa para Publicar */}
          <div className="bg-card border border-[#e0e6ee] rounded-[18px] p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1d5fc4] text-white flex items-center justify-center font-display font-extrabold text-sm overflow-hidden shrink-0">
                {currentUser.avatar_url ? (
                  <img src={currentUser.avatar_url} alt="Foto" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  currentUser.full_name?.charAt(0).toUpperCase() || 'C'
                )}
              </div>
              <div>
                <h4 className="font-display font-extrabold text-sm text-[#16213a]">Publicar no meu Perfil</h4>
                <p className="text-[11px] text-[#5d6778]">Partilhe uma novidade ou conquista na comunidade</p>
              </div>
            </div>

            <form onSubmit={handlePublishPost} className="space-y-3">
              <textarea
                rows={3}
                required
                value={postContent}
                onChange={e => setPostContent(e.target.value)}
                placeholder="Escreva algo sobre a sua carreira, dicas ou projetos..."
                className="w-full px-4 py-3 rounded-2xl border border-[#e0e6ee] text-xs sm:text-sm text-[#16213a] focus:outline-none focus:border-[#1d5fc4] bg-[#f3f5f8]/50 resize-none"
              />

              <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer bg-[#e9eef6] hover:bg-slate-200 text-[#16213a] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition">
                    <ImageIcon className="w-4 h-4 text-[#1d5fc4]" />
                    <span>{uploading ? 'A carregar...' : postImage ? 'Imagem' : 'Anexar Imagem'}</span>
                    <input type="file" accept="image/*" onChange={handlePostImageUpload} className="hidden" />
                  </label>

                  <select
                    value={postCategory}
                    onChange={e => setPostCategory(e.target.value as any)}
                    className="bg-[#e9eef6] text-[#16213a] px-3 py-1.5 rounded-xl text-xs font-semibold border-none focus:outline-none cursor-pointer"
                  >
                    <option value="Emprego">Emprego</option>
                    <option value="Formação">Formação</option>
                    <option value="Dicas">Dicas</option>
                    <option value="Negócios">Negócios</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={uploading || !postContent.trim()}
                  className="bg-[#1d5fc4] hover:bg-[#14305f] text-white font-bold px-5 py-2 rounded-xl text-xs sm:text-sm transition shadow-2xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publicar</span>
                </button>
              </div>
            </form>
          </div>

          {/* Lista de Publicações Próprias */}
          <div className="space-y-4">
            {candidatePosts.length === 0 ? (
              <div className="bg-card border border-[#e0e6ee] rounded-[18px] p-10 text-center text-[#5d6778] text-xs space-y-2">
                <FileText className="w-8 h-8 mx-auto opacity-40 text-[#5d6778]" />
                <p className="font-bold text-[#16213a]">Ainda não fez nenhuma publicação no seu perfil.</p>
                <p className="text-[#5d6778]">Use a caixa acima para partilhar atualizações com a rede.</p>
              </div>
            ) : (
              candidatePosts.map(post => (
                <div key={post.id} className="bg-card border border-[#e0e6ee] rounded-[18px] p-4 sm:p-5 space-y-3 shadow-2xs">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1d5fc4] text-white flex items-center justify-center font-display font-extrabold text-xs overflow-hidden shrink-0">
                        {currentUser.avatar_url ? (
                          <img src={currentUser.avatar_url} alt="Foto" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          currentUser.full_name?.charAt(0).toUpperCase() || 'C'
                        )}
                      </div>
                      <div>
                        <h4 className="font-display font-extrabold text-sm text-[#16213a]">{currentUser.full_name}</h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#5d6778]">
                          <span>{new Date(post.created_at).toLocaleDateString('pt-AO')}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-bold text-[#1d5fc4]">{post.category}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmPostId(post.id)}
                      className="text-slate-400 hover:text-[#c23b3b] p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
                      title="Excluir publicação"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm text-[#16213a] leading-relaxed whitespace-pre-line">
                    {post.content}
                  </p>

                  {post.image_url && (
                    <div className="rounded-2xl overflow-hidden border border-[#e0e6ee] max-h-96">
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

      {/* Modais & Diálogos Auxiliares Invariantes */}
      <EditarPerfilCandidato
        isOpen={isEditing}
        currentUser={currentUser}
        onClose={() => setIsEditing(false)}
        onProfileUpdated={onProfileUpdated}
      />

      <FollowersModal
        isOpen={isFollowersModalOpen}
        onClose={() => setIsFollowersModalOpen(false)}
        title="Quem Me Seguiu"
        followers={followers}
      />

      {deleteConfirmPostId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn select-none">
          <div className="bg-card rounded-[22px] shadow-2xl w-full max-w-sm p-6 space-y-4 border border-[#e0e6ee] text-center">
            <div className="w-12 h-12 bg-red-50 text-[#c23b3b] rounded-2xl flex items-center justify-center mx-auto border border-red-200">
              <Trash2 className="w-6 h-6 text-[#c23b3b]" />
            </div>

            <div className="space-y-1">
              <h3 className="font-display font-extrabold text-base text-[#16213a]">
                Apagar Publicação?
              </h3>
              <p className="text-xs text-[#5d6778] leading-relaxed">
                Tem a certeza de que deseja apagar esta publicação do seu perfil? Esta ação não pode ser desfeita.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPostId(null)}
                className="w-full py-2.5 px-4 bg-[#e9eef6] hover:bg-slate-200 text-[#16213a] font-bold text-xs rounded-xl transition cursor-pointer active:scale-95"
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
                className="w-full py-2.5 px-4 bg-[#c23b3b] hover:bg-red-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer active:scale-95"
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
