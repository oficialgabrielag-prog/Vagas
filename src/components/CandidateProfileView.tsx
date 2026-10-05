import React, { useState } from 'react';
import { User, MapPin, Phone, Mail, FileText, Award, Briefcase, GraduationCap, Edit3, Plus, Trash2, Camera, Send, Image as ImageIcon, CheckCircle2, MessageCircle, Upload, Check } from 'lucide-react';
import { UserProfile, CommunityPost, ExperienceItem, EducationItem, CUNENE_MUNICIPALITIES } from '../lib/types';
import { StoreService } from '../lib/store';
import { uploadToCloudinary, uploadDocumentToCloudinary } from '../lib/cloudinary';
import { ImageUploader } from './ImageUploader';

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
  const [activeTab, setActiveTab] = useState<'profile' | 'posts'>('profile');

  // Candidate-exclusive edit states (isolated from company)
  const [fullName, setFullName] = useState(currentUser.full_name);
  const [profession, setProfession] = useState(currentUser.profession || currentUser.headline || '');
  const [municipality, setMunicipality] = useState(currentUser.municipality || 'Ondjiva');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [whatsapp, setWhatsapp] = useState(currentUser.whatsapp || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [cvUrl, setCvUrl] = useState(currentUser.cv_url || '');
  const [skillsText, setSkillsText] = useState((currentUser.skills || []).join(', '));
  const [certsText, setCertsText] = useState((currentUser.certificates || []).join('\n'));
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar_url || '');

  // Experience & Education items
  const [experiences, setExperiences] = useState<ExperienceItem[]>(currentUser.experiences || []);
  const [educations, setEducations] = useState<EducationItem[]>(currentUser.educations || []);

  // Post creation in candidate profile
  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState('');
  const [postCategory, setPostCategory] = useState<'Emprego' | 'Negócios' | 'Dicas' | 'Formação'>('Emprego');
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Strictly filter candidate's own personal posts (excluding company posts)
  const candidatePosts = posts.filter(p => 
    (p.author_id === currentUser.id || 
     (p.author_name && p.author_name.toLowerCase() === currentUser.full_name?.toLowerCase())) &&
    (p.author_type === 'candidate' || (p as any).post_type === 'candidate')
  );

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setAvatarUrl(url);
    } catch {
      alert('Erro ao carregar fotografia.');
    } finally {
      setUploading(false);
    }
  };

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

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const skills = skillsText.split(',').map(s => s.trim()).filter(Boolean);
    const certificates = certsText.split('\n').map(s => s.trim()).filter(Boolean);

    // Call updateCandidateProfile which strictly protects and does NOT touch the company profile
    const updated = StoreService.updateCandidateProfile(currentUser.id, {
      full_name: fullName,
      profession,
      municipality,
      phone,
      whatsapp,
      bio,
      cv_url: cvUrl,
      skills,
      certificates,
      avatar_url: avatarUrl,
      experiences,
      educations
    });

    onProfileUpdated(updated);
    setIsEditing(false);
    setSuccessMessage('Perfil de candidato atualizado com sucesso!');
    setTimeout(() => setSuccessMessage(''), 3000);
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

  const handleAddExperience = () => {
    setExperiences([
      ...experiences,
      {
        id: 'exp-' + Date.now(),
        title: '',
        company: '',
        period: '',
        description: ''
      }
    ]);
  };

  const handleAddEducation = () => {
    setEducations([
      ...educations,
      {
        id: 'edu-' + Date.now(),
        institution: '',
        degree: '',
        year: ''
      }
    ]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Banner / Candidate Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-[#0F4C9C] to-slate-800" />
        
        <div className="px-6 pb-6 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-16 gap-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
              <div className="relative w-28 h-28 rounded-2xl bg-white p-1.5 shadow-md border-2 border-white overflow-hidden shrink-0">
                {currentUser.avatar_url ? (
                  <img src={currentUser.avatar_url} alt={currentUser.full_name} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className="w-full h-full bg-[#0F4C9C] text-white rounded-xl flex items-center justify-center font-bold text-3xl">
                    {currentUser.full_name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="mt-2 sm:mt-0">
                <div className="inline-flex items-center gap-1 bg-blue-50 text-[#0F4C9C] px-2.5 py-0.5 rounded-full text-xs font-bold mb-1">
                  <User className="w-3 h-3" /> Perfil de Candidato
                </div>
                <h1 className="text-2xl font-extrabold text-slate-900">{currentUser.full_name}</h1>
                <p className="text-sm font-semibold text-slate-600">{currentUser.profession || 'Profissional no Cunene'}</p>
                <p className="text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#0F4C9C]" /> {currentUser.municipality || 'Ondjiva'}, Cunene
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" />
                <span>Editar Perfil Pessoal</span>
              </button>
            </div>
          </div>

          {successMessage && (
            <div className="mt-4 bg-emerald-50 text-emerald-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Tab selector */}
        <div className="flex border-t border-slate-200 px-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3.5 mr-6 border-b-2 transition ${
              activeTab === 'profile' ? 'border-[#0F4C9C] text-[#0F4C9C]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Perfil & Currículo
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`py-3.5 border-b-2 transition ${
              activeTab === 'posts' ? 'border-[#0F4C9C] text-[#0F4C9C]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Minhas Publicações Pessoais ({candidatePosts.length})
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column (Bio, Skills, Certs) */}
          <div className="space-y-6">
            {/* Bio Card */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resumo Profissional</h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {currentUser.bio || 'Adicione um resumo sobre as suas competências e objetivos de carreira.'}
              </p>
            </div>

            {/* Skills Card */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Habilidades</h3>
              <div className="flex flex-wrap gap-1.5">
                {(currentUser.skills && currentUser.skills.length > 0) ? (
                  currentUser.skills.map((skill, i) => (
                    <span key={i} className="bg-slate-100 text-slate-800 text-xs px-2.5 py-1 rounded-lg font-medium">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">Nenhuma habilidade adicionada.</span>
                )}
              </div>
            </div>

            {/* Certificates Card */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Certificados</h3>
              <ul className="space-y-2">
                {(currentUser.certificates && currentUser.certificates.length > 0) ? (
                  currentUser.certificates.map((cert, i) => (
                    <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                      <Award className="w-4 h-4 text-[#FFC20E] shrink-0 mt-0.5" />
                      <span>{cert}</span>
                    </li>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">Nenhum certificado listado.</span>
                )}
              </ul>
            </div>

            {/* CV Download / Link Card */}
            {currentUser.cv_url && (
              <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100 text-center space-y-2">
                <FileText className="w-8 h-8 text-[#0F4C9C] mx-auto" />
                <h4 className="text-xs font-bold text-slate-900">Currículo Disponível</h4>
                <a
                  href={currentUser.cv_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-[#0F4C9C] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#0c3c7d] transition"
                >
                  Visualizar Currículo
                </a>
              </div>
            )}
          </div>

          {/* Right Column (Experiences & Education) */}
          <div className="md:col-span-2 space-y-6">
            {/* Experience */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#0F4C9C]" />
                <h3 className="text-base font-bold text-slate-900">Experiência Profissional</h3>
              </div>

              <div className="space-y-4">
                {(currentUser.experiences && currentUser.experiences.length > 0) ? (
                  currentUser.experiences.map((exp, i) => (
                    <div key={i} className="border-l-2 border-[#0F4C9C]/30 pl-4 py-1 space-y-1">
                      <h4 className="text-sm font-bold text-slate-900">{exp.title}</h4>
                      <p className="text-xs font-semibold text-slate-600">{exp.company} • <span className="text-slate-400 font-normal">{exp.period}</span></p>
                      {exp.description && (
                        <p className="text-xs text-slate-600 leading-relaxed mt-1">{exp.description}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">Nenhuma experiência profissional cadastrada ainda.</p>
                )}
              </div>
            </div>

            {/* Education */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#0F4C9C]" />
                <h3 className="text-base font-bold text-slate-900">Formação Académica</h3>
              </div>

              <div className="space-y-4">
                {(currentUser.educations && currentUser.educations.length > 0) ? (
                  currentUser.educations.map((edu, i) => (
                    <div key={i} className="border-l-2 border-[#FFC20E] pl-4 py-1 space-y-1">
                      <h4 className="text-sm font-bold text-slate-900">{edu.degree}</h4>
                      <p className="text-xs font-semibold text-slate-600">{edu.institution} • <span className="text-slate-400 font-normal">{edu.year}</span></p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">Nenhuma formação cadastrada ainda.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Posts Tab (Personal Posts Only) */}
      {activeTab === 'posts' && (
        <div className="space-y-6">
          {/* Post creator in Profile */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-slate-700">Publicar no meu Perfil de Candidato</h4>
            <form onSubmit={handlePublishPost} className="space-y-3">
              <textarea
                rows={3}
                required
                value={postContent}
                onChange={e => setPostContent(e.target.value)}
                placeholder="Partilhe uma conquista, curso concluído, certificado ou procura de emprego..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C9C]"
              />

              <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition">
                    <ImageIcon className="w-4 h-4 text-[#0F4C9C]" />
                    <span>{uploading ? 'A carregar...' : postImage ? 'Imagem pronta' : 'Foto'}</span>
                    <input type="file" accept="image/*" onChange={handlePostImageUpload} className="hidden" />
                  </label>

                  <select
                    value={postCategory}
                    onChange={e => setPostCategory(e.target.value as any)}
                    className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold border-none focus:outline-none"
                  >
                    <option value="Emprego">Procura de Emprego</option>
                    <option value="Formação">Formação & Curso</option>
                    <option value="Dicas">Dica Profissional</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={uploading || !postContent.trim()}
                  className="bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> Publicar Pessoal
                </button>
              </div>
            </form>
          </div>

          {/* List candidate's personal posts */}
          <div className="space-y-4">
            {candidatePosts.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-400 text-xs">
                Ainda não fez nenhuma publicação pessoal no seu perfil.
              </div>
            ) : (
              candidatePosts.map(post => (
                <div key={post.id} className="bg-white p-5 rounded-3xl border border-slate-200 space-y-3 shadow-2xs">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0F4C9C] text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                        {currentUser.avatar_url ? (
                          <img src={currentUser.avatar_url} alt="Foto" className="w-full h-full object-cover" />
                        ) : (
                          currentUser.full_name.charAt(0)
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{currentUser.full_name}</h4>
                        <span className="text-[10px] text-slate-400">{new Date(post.created_at).toLocaleDateString('pt-AO')} • {post.category}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        StoreService.deletePost(post.id);
                        onPostCreated();
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line">{post.content}</p>

                  {post.image_url && (
                    <img 
                      src={post.image_url} 
                      alt="Foto" 
                      className="w-full max-h-72 object-cover rounded-2xl" 
                      onError={(e) => {
                        e.currentTarget.classList.add('hidden');
                      }}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Edit Candidate Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 my-6">
            <div className="bg-[#0F4C9C] p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">Editar Perfil Pessoal do Candidato</h3>
                <p className="text-xs text-slate-200">As alterações aqui afetam exclusivamente o seu perfil de candidato</p>
              </div>
              <button onClick={() => setIsEditing(false)} className="text-white/80 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Candidate Avatar Upload (Context: candidate-avatar) */}
              <div className="flex flex-col items-center sm:items-start gap-2">
                <ImageUploader
                  context="candidate-avatar"
                  currentImageUrl={avatarUrl}
                  onUploadSuccess={url => setAvatarUrl(url)}
                  onRemove={() => setAvatarUrl('')}
                  label="Fotografia Pessoal do Candidato"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome Pessoal / Profissional *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Profissão / Título</label>
                  <input
                    type="text"
                    value={profession}
                    onChange={e => setProfession(e.target.value)}
                    placeholder="Ex: Engenheiro Agrónomo"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Município Residencial</label>
                  <select
                    value={municipality}
                    onChange={e => setMunicipality(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    {CUNENE_MUNICIPALITIES.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Telefone Pessoal</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Pessoal</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Resumo Profissional / Biografia</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#0F4C9C]" />
                  <span>Currículo do Candidato (PDF, DOC ou DOCX)</span>
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs">
                    <Upload className="w-4 h-4 text-[#0F4C9C]" />
                    <span>{uploading ? 'A enviar...' : 'Carregar Currículo'}</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploading(true);
                        try {
                          const url = await uploadDocumentToCloudinary(file);
                          setCvUrl(url);
                        } catch (err: any) {
                          alert(err.message || 'Erro ao carregar currículo.');
                        } finally {
                          setUploading(false);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  {cvUrl ? (
                    <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 truncate max-w-xs">
                      <Check className="w-3.5 h-3.5" /> Currículo anexado com sucesso
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Nenhum ficheiro carregado</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Habilidades (separadas por vírgula)</label>
                <input
                  type="text"
                  value={skillsText}
                  onChange={e => setSkillsText(e.target.value)}
                  placeholder="Ex: Gestão de Rega, Excel, Liderança"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Certificados (um por linha)</label>
                <textarea
                  rows={2}
                  value={certsText}
                  onChange={e => setCertsText(e.target.value)}
                  placeholder="Ex: Certificado de Formação Agrícola..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              {/* Experience builder */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">Experiências Profissionais</span>
                  <button
                    type="button"
                    onClick={handleAddExperience}
                    className="text-xs font-bold text-[#0F4C9C] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </button>
                </div>

                {experiences.map((exp, idx) => (
                  <div key={exp.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-500">Experiência {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setExperiences(experiences.filter(e => e.id !== exp.id))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Cargo (ex: Técnico Agrícola)"
                        value={exp.title}
                        onChange={e => {
                          const updated = [...experiences];
                          updated[idx].title = e.target.value;
                          setExperiences(updated);
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Empresa (ex: AgroCunene)"
                        value={exp.company}
                        onChange={e => {
                          const updated = [...experiences];
                          updated[idx].company = e.target.value;
                          setExperiences(updated);
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Período (ex: 2021 - Presente)"
                      value={exp.period}
                      onChange={e => {
                        const updated = [...experiences];
                        updated[idx].period = e.target.value;
                        setExperiences(updated);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>
                ))}
              </div>

              {/* Education builder */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">Formação Académica</span>
                  <button
                    type="button"
                    onClick={handleAddEducation}
                    className="text-xs font-bold text-[#0F4C9C] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </button>
                </div>

                {educations.map((edu, idx) => (
                  <div key={edu.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-500">Formação {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setEducations(educations.filter(e => e.id !== edu.id))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Grau / Curso (ex: Licenciatura)"
                        value={edu.degree}
                        onChange={e => {
                          const updated = [...educations];
                          updated[idx].degree = e.target.value;
                          setEducations(updated);
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Instituição (ex: Univ. Cuito Cuanavale)"
                        value={edu.institution}
                        onChange={e => {
                          const updated = [...educations];
                          updated[idx].institution = e.target.value;
                          setEducations(updated);
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Ano (ex: 2016 - 2020)"
                      value={edu.year}
                      onChange={e => {
                        const updated = [...educations];
                        updated[idx].year = e.target.value;
                        setEducations(updated);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#0F4C9C] text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-[#0c3c7d] shadow-sm"
                >
                  Guardar Perfil de Candidato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
