import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Camera, CheckCircle2, 
  Loader2, Mail, MapPin, Phone, 
  Save, ShieldCheck, Upload, X, Bell, AlertCircle, Briefcase, FileText
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StoreService } from '../lib/store';
import { 
  isPushNotificationSupported, 
  getPushNotificationPermission, 
  requestPushNotificationPermission, 
  sendNativePushNotification 
} from '../lib/pushNotifications';

export const EditarPerfilCandidato = ({ currentUser: initialUser, isOpen, onClose, onProfileUpdated }) => {
  const [currentUser, setCurrentUser] = useState(initialUser || StoreService.getCurrentUser());
  const [fullName, setFullName] = useState('');
  const [profession, setProfession] = useState('');
  const [municipality, setMunicipality] = useState('Ondjiva');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  // Native Push Status
  const [pushStatus, setPushStatus] = useState(() => getPushNotificationPermission());

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'jbj12sj2';
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'empregocunene';

  const clean = (url) => {
    if (!url || typeof url !== 'string' || url.startsWith('blob:')) return null;
    return url.split('?')[0];
  };

  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });

  useEffect(() => {
    const active = initialUser || StoreService.getCurrentUser();
    if (active) {
      setCurrentUser(active);
      setFullName(active.full_name || '');
      setProfession(active.profession || '');
      setMunicipality(active.municipality || 'Ondjiva');
      setPhone(active.phone || '');
      setWhatsapp(active.whatsapp || '');
      setEmail(active.email || '');
      setBio(active.bio || '');
      setAvatarUrl(active.avatar_url || '');
      setCoverUrl(active.cover_url || '');
      const skl = active.skills || [];
      setSkillsInput(Array.isArray(skl) ? skl.join(', ') : '');
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data: profile }) => {
          if (profile) {
            if (profile.full_name) setFullName(profile.full_name);
            if (profile.profession) setProfession(profile.profession);
            if (profile.municipality || profile.municipio) setMunicipality(profile.municipality || profile.municipio);
            if (profile.phone) setPhone(profile.phone);
            if (profile.whatsapp) setWhatsapp(profile.whatsapp);
            if (profile.email) setEmail(profile.email);
            if (profile.bio) setBio(profile.bio);
            if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
            if (profile.cover_url) setCoverUrl(profile.cover_url);
            if (Array.isArray(profile.skills)) setSkillsInput(profile.skills.join(', '));
          }
        }).catch(() => {});
      }
    }).catch(() => {});
  }, [isOpen, initialUser]);

  // Upload Foto Candidato
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setStatusMessage({ type: '', text: '' });

    try {
      let secure_url = '';

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', 'candidatos_cunene/fotos');

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          secure_url = data.secure_url;
        }
      } catch (cloudErr) {
        console.warn('Cloudinary avatar error, fallback to data URL:', cloudErr);
      }

      if (!secure_url) {
        secure_url = await fileToDataUrl(file);
      }

      setAvatarUrl(secure_url);
      setStatusMessage({ type: 'success', text: 'Fotografia atualizada com sucesso!' });
    } catch (err) {
      console.error('Avatar upload error:', err);
      setStatusMessage({ type: 'error', text: 'Erro ao carregar fotografia.' });
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // Upload Capa
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    setStatusMessage({ type: '', text: '' });

    try {
      let secure_url = '';

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', 'candidatos_cunene/capas');

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          secure_url = data.secure_url;
        }
      } catch (cloudErr) {
        console.warn('Cloudinary cover error, fallback to data URL:', cloudErr);
      }

      if (!secure_url) {
        secure_url = await fileToDataUrl(file);
      }

      setCoverUrl(secure_url);
      setStatusMessage({ type: 'success', text: 'Capa do perfil atualizada!' });
    } catch (err) {
      console.error('Cover upload error:', err);
      setStatusMessage({ type: 'error', text: 'Erro ao carregar imagem de capa.' });
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  // Ativar Push Notifications
  const handleTogglePush = async () => {
    const granted = await requestPushNotificationPermission();
    setPushStatus(getPushNotificationPermission());
    if (granted) {
      setStatusMessage({ type: 'success', text: '🔔 Notificações push nativas ativadas com sucesso!' });
      sendNativePushNotification('🔔 Notificações Ativadas!', {
        body: 'Receberá avisos instantâneos quando empresas responderem às suas candidaturas ou seguirem o seu perfil.'
      });
    } else {
      setStatusMessage({ type: 'error', text: 'Permissão de notificações não foi concedida.' });
    }
  };

  const handleTestPush = () => {
    sendNativePushNotification('📢 Alerta CuneneVagas (Candidato)', {
      body: 'As suas notificações push nativas estão a funcionar perfeitamente!',
      tag: 'test-push-candidate'
    });
    setStatusMessage({ type: 'success', text: 'Notificação de teste disparada com sucesso!' });
  };

  // Guardar todas as alterações
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setStatusMessage({ type: '', text: '' });

    try {
      let activeUser = currentUser || StoreService.getCurrentUser();
      let userId = activeUser?.id;
      if (!userId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          userId = session.user.id;
          if (!activeUser) {
            activeUser = await StoreService.restoreUserFromSession(session.user);
          }
        }
      }
      if (!userId) throw new Error('Utilizador não autenticado.');

      const cleanAvatarUrl = clean(avatarUrl) || avatarUrl;
      const cleanCoverUrl = clean(coverUrl) || coverUrl;
      const parsedSkills = skillsInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const updateData = {
        full_name: fullName,
        profession,
        municipality,
        phone,
        whatsapp,
        email,
        bio,
        skills: parsedSkills,
        avatar_url: cleanAvatarUrl,
        cover_url: cleanCoverUrl
      };

      // 1. Guardar no StoreService local
      const updatedUser = StoreService.updateCandidateProfile(userId, updateData);
      StoreService.setCurrentUser(updatedUser);
      setCurrentUser(updatedUser);

      // 2. Sincronizar com Supabase sem travar caso haja RLS
      try {
        await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            profession,
            municipality,
            phone,
            whatsapp,
            bio,
            avatar_url: cleanAvatarUrl,
            cover_url: cleanCoverUrl
          })
          .eq('id', userId);
      } catch (supaErr) {
        console.warn('Sync Supabase profiles note (salvo localmente):', supaErr);
      }

      setStatusMessage({ type: 'success', text: '✅ Perfil de candidato guardado com sucesso!' });

      if (onProfileUpdated) {
        onProfileUpdated(updatedUser);
      }

      setTimeout(() => {
        if (onClose) onClose();
      }, 700);
    } catch (err) {
      console.error('Save error:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao guardar dados do candidato.' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-100 flex flex-col overflow-y-auto min-h-screen animate-fadeIn select-none">
      {/* Hidden File Inputs */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarUpload}
        className="hidden"
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        onChange={handleCoverUpload}
        className="hidden"
      />

      {/* Sticky App Bar (Tela Única Superior) */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 -ml-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            title="Voltar ao perfil"
          >
            <span className="material-symbols-outlined text-lg">add_box</span>
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Editar Perfil do Candidato</span>
              <span className="text-[10px] font-bold text-[#244F9A] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 hidden sm:inline-block">
                Tela Única
              </span>
            </h1>
            <p className="text-xs text-slate-500">Atualize o seu currículo, competências e fotografia profissional</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={saving}
            className="px-5 py-2 bg-[#244F9A] hover:bg-[#193B70] text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-sm flex items-center gap-2 disabled:opacity-60 cursor-pointer active:scale-95"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin text-[#F5B91B]" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'A guardar...' : 'Guardar Alterações'}</span>
          </button>
        </div>
      </header>

      {/* Main Single-Screen Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Status Toast Alert */}
        {statusMessage.text && (
          <div className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-xs animate-fadeIn ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Visual Identity Hero Card */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
          {/* Cover Photo */}
          <div className="h-36 sm:h-48 w-full bg-gradient-to-r from-blue-900 via-[#244F9A] to-slate-800 relative group overflow-hidden">
            {coverUrl ? (
              <img src={coverUrl} alt="Capa" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/30 text-xs font-semibold">
                Capa de perfil profissional
              </div>
            )}

            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="absolute top-4 right-4 bg-slate-950/70 hover:bg-slate-950/90 text-white text-xs font-bold px-3.5 py-2 rounded-xl backdrop-blur-md border border-white/20 transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin text-[#F5B91B]" /> : <Camera className="w-4 h-4 text-[#F5B91B]" />}
              <span>{uploadingCover ? 'A carregar capa...' : 'Alterar Capa'}</span>
            </button>
          </div>

          {/* Avatar & Summary */}
          <div className="p-6 pt-0 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14">
            <div className="flex items-end gap-4">
              <div className="relative group">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-1 border-4 border-white shadow-md overflow-hidden bg-slate-100 flex items-center justify-center shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Foto" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <User className="w-10 h-10 text-slate-400" />
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center text-white">
                      <Loader2 className="w-6 h-6 animate-spin text-[#F5B91B]" />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-1 right-1 p-2 bg-[#244F9A] hover:bg-[#193B70] text-white rounded-xl shadow-md transition cursor-pointer"
                  title="Alterar fotografia"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="pb-1">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                  {fullName || 'Nome do Candidato'}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {profession || 'Profissional'} • {municipality}
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-400">
              Fotografia apresentada a recrutadores ao submeter candidaturas.
            </div>
          </div>
        </div>

        {/* Formulário Principal */}
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* 1. Dados Pessoais e Profissão */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <User className="w-4 h-4 text-[#244F9A]" />
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Dados Pessoais e Identificação
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Ex: Alberto Tchipopilo"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#244F9A] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Profissão / Título Profissional *
                </label>
                <input
                  type="text"
                  required
                  value={profession}
                  onChange={e => setProfession(e.target.value)}
                  placeholder="Ex: Engenheiro Agrónomo, Contabilista, Motorista"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#244F9A] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Município de Residência no Cunene *
                </label>
                <select
                  value={municipality}
                  onChange={e => setMunicipality(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#244F9A] focus:bg-white transition"
                >
                  <option value="Ondjiva">Ondjiva (Cuanhama)</option>
                  <option value="Namacunde">Namacunde (Santa Clara)</option>
                  <option value="Ombadja">Ombadja (Xangongo)</option>
                  <option value="Cahama">Cahama</option>
                  <option value="Cuvelai">Cuvelai</option>
                  <option value="Curoca">Curoca</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-mail Pessoal
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#244F9A] focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          {/* 2. Contactos Diretos */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Phone className="w-4 h-4 text-[#244F9A]" />
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Contactos Rápidos
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Número de Telefone
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Ex: +244 923 000 000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#244F9A] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  WhatsApp para Entrevistas
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  placeholder="Ex: +244 931 000 000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#244F9A] focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          {/* 3. Resumo Profissional & Competências */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileText className="w-4 h-4 text-[#244F9A]" />
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Resumo Profissional e Competências
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Apresentação / Sobre Mim
              </label>
              <textarea
                rows={4}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Apresente a sua trajetória, pontos fortes, ambições profissionais e disponibilidade para trabalhar no Cunene..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-[#244F9A] focus:bg-white transition resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Competências & Habilidades (separadas por vírgula)
              </label>
              <input
                type="text"
                value={skillsInput}
                onChange={e => setSkillsInput(e.target.value)}
                placeholder="Ex: Gestão de Projetos, Excel Avançado, Condução Pesados, Atendimento ao Cliente"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#244F9A] focus:bg-white transition"
              />
            </div>
          </div>

          {/* 4. Notificações Push Nativas */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#244F9A]" />
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  Notificações Push Nativas no Dispositivo
                </h3>
              </div>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                pushStatus === 'granted'
                  ? 'bg-emerald-100 text-emerald-800'
                  : pushStatus === 'denied'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {pushStatus === 'granted' ? '🔔 Ativas' : pushStatus === 'denied' ? 'Bloqueadas' : 'Não Ativadas'}
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Receba notificações nativas imediatas quando uma empresa avaliar a sua candidatura, agendar entrevista ou começar a seguir o seu perfil.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {pushStatus !== 'granted' ? (
                <button
                  type="button"
                  onClick={handleTogglePush}
                  className="bg-[#244F9A] hover:bg-[#193B70] text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
                >
                  <Bell className="w-4 h-4 text-[#F5B91B]" />
                  <span>Ativar Notificações Push Nativas</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleTestPush}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Bell className="w-4 h-4 text-emerald-600" />
                  <span>Disparar Notificação de Teste</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="pt-4 flex items-center justify-end gap-3 pb-8">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#244F9A] hover:bg-[#193B70] text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-md flex items-center gap-2 disabled:opacity-60 cursor-pointer active:scale-95"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin text-[#F5B91B]" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'A guardar perfil...' : 'Guardar Todas as Alterações'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};
