import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Building2, Camera, CheckCircle2, Globe, 
  Image as ImageIcon, Loader2, Mail, MapPin, Phone, 
  Save, ShieldCheck, Upload, X, Bell, AlertCircle, FileText
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StoreService } from '../lib/store';
import { 
  isPushNotificationSupported, 
  getPushNotificationPermission, 
  requestPushNotificationPermission, 
  sendNativePushNotification 
} from '../lib/pushNotifications';

export const EditarPerfilEmpresa = ({ currentUser: initialUser, isOpen, onClose, onProfileUpdated }) => {
  const [currentUser, setCurrentUser] = useState(initialUser || StoreService.getCurrentUser());
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [municipality, setMunicipality] = useState('Ondjiva');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [nif, setNif] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [servicesInput, setServicesInput] = useState('');

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  
  // Push Notifications State
  const [pushStatus, setPushStatus] = useState(() => getPushNotificationPermission());

  const logoInputRef = useRef(null);
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

  // Carregar dados da empresa
  useEffect(() => {
    const active = initialUser || StoreService.getCurrentUser();
    if (active) {
      setCurrentUser(active);
      setCompanyName(active.company_name || active.company?.name || active.full_name || '');
      setIndustry(active.industry || active.company?.industry || 'Comércio e Serviços');
      setMunicipality(active.municipality || active.company?.municipality || 'Ondjiva');
      setPhone(active.phone || active.company?.phone || '');
      setWhatsapp(active.whatsapp || active.company?.whatsapp || '');
      setEmail(active.email || active.company?.email || '');
      setWebsite(active.website || active.company?.website || '');
      setNif(active.nif || active.company?.nif || '');
      setDescription(active.bio || active.company?.description || '');
      setLogoUrl(active.company_logo || active.logo_url || active.avatar_url || '');
      setCoverUrl(active.cover_url || active.company?.cover_url || '');
      const srv = active.services || active.company?.services || [];
      setServicesInput(Array.isArray(srv) ? srv.join(', ') : '');
    }

    // Try fetching fresh data from Supabase
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('users').select('*').eq('id', user.id).single().then(({ data: profile }) => {
          if (profile) {
            if (profile.company_name) setCompanyName(profile.company_name);
            if (profile.industry) setIndustry(profile.industry);
            if (profile.municipality) setMunicipality(profile.municipality);
            if (profile.phone) setPhone(profile.phone);
            if (profile.whatsapp) setWhatsapp(profile.whatsapp);
            if (profile.email) setEmail(profile.email);
            if (profile.website) setWebsite(profile.website);
            if (profile.nif) setNif(profile.nif);
            if (profile.bio) setDescription(profile.bio);
            if (profile.logo_url) setLogoUrl(profile.logo_url);
            if (profile.cover_url) setCoverUrl(profile.cover_url);
            if (Array.isArray(profile.services)) setServicesInput(profile.services.join(', '));
          }
        });
      }
    }).catch(() => {});
  }, [isOpen, initialUser]);

  // Upload Logótipo
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setStatusMessage({ type: '', text: '' });

    try {
      let secure_url = '';

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', 'empresas_cunene/logos');

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          secure_url = data.secure_url;
        }
      } catch (cloudErr) {
        console.warn('Cloudinary logo error, fallback to data URL:', cloudErr);
      }

      if (!secure_url) {
        secure_url = await fileToDataUrl(file);
      }

      setLogoUrl(secure_url);
      setStatusMessage({ type: 'success', text: 'Logótipo atualizado com sucesso!' });
    } catch (err) {
      console.error('Logo upload error:', err);
      setStatusMessage({ type: 'error', text: 'Erro ao carregar logótipo.' });
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
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
        formData.append('folder', 'empresas_cunene/capas');

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
      setStatusMessage({ type: 'success', text: 'Imagem de capa atualizada!' });
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
        body: 'A sua empresa receberá alertas instantâneos de novos candidatos e seguidores.'
      });
    } else {
      setStatusMessage({ type: 'error', text: 'Permissão de notificações não foi concedida.' });
    }
  };

  const handleTestPush = () => {
    sendNativePushNotification('📢 Alerta CuneneVagas (Empresa)', {
      body: 'O sistema de notificações push nativas está ativo e a funcionar na perfeição!',
      tag: 'test-push-company'
    });
    setStatusMessage({ type: 'success', text: 'Notificação de teste enviada para o seu dispositivo!' });
  };

  // Guardar todas as alterações
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setStatusMessage({ type: '', text: '' });

    try {
      const activeUser = currentUser || StoreService.getCurrentUser();
      const userId = activeUser?.id;
      if (!userId) throw new Error('Utilizador não autenticado.');

      const cleanLogoUrl = clean(logoUrl) || logoUrl;
      const cleanCoverUrl = clean(coverUrl) || coverUrl;
      const parsedServices = servicesInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const updateData = {
        company_name: companyName,
        industry,
        municipality,
        phone,
        whatsapp,
        email,
        website,
        nif,
        bio: description,
        services: parsedServices,
        company_logo: cleanLogoUrl,
        logo_url: cleanLogoUrl,
        avatar_url: cleanLogoUrl,
        cover_url: cleanCoverUrl,
        company: {
          id: userId,
          user_id: userId,
          name: companyName,
          logo_url: cleanLogoUrl,
          cover_url: cleanCoverUrl,
          industry,
          municipality,
          description,
          services: parsedServices,
          nif,
          phone,
          whatsapp,
          email,
          website
        }
      };

      // 1. Guardar de forma robusta no StoreService local
      const updatedUser = StoreService.updateCompanyProfile(userId, updateData);
      StoreService.setCurrentUser(updatedUser);
      setCurrentUser(updatedUser);

      // 2. Sincronizar com Supabase sem bloquear em caso de RLS
      try {
        await supabase
          .from('users')
          .update({
            company_name: companyName,
            industry,
            municipality,
            phone,
            whatsapp,
            website,
            bio: description,
            nif,
            logo_url: cleanLogoUrl,
            cover_url: cleanCoverUrl
          })
          .eq('id', userId);
      } catch (supaErr) {
        console.warn('Sync Supabase users error (continua salvo localmente):', supaErr);
      }

      setStatusMessage({ type: 'success', text: '✅ Perfil da empresa guardado com sucesso!' });

      if (onProfileUpdated) {
        onProfileUpdated(updatedUser);
      }

      setTimeout(() => {
        if (onClose) onClose();
      }, 700);
    } catch (err) {
      console.error('Save error:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao guardar dados da empresa.' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-100 flex flex-col overflow-y-auto min-h-screen animate-fadeIn select-none">
      {/* Hidden File Inputs */}
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        onChange={handleLogoUpload}
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
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Editar Perfil da Empresa</span>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 hidden sm:inline-block">
                Tela Única
              </span>
            </h1>
            <p className="text-xs text-slate-500">Configure a imagem de marca, contactos e informações públicas</p>
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
          <div className="h-40 sm:h-52 w-full bg-gradient-to-r from-[#244F9A] to-slate-900 relative group overflow-hidden">
            {coverUrl ? (
              <img src={coverUrl} alt="Capa da Empresa" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/30 text-xs font-semibold">
                Nenhuma imagem de capa selecionada
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

          {/* Logo & Basic Info Header */}
          <div className="p-6 pt-0 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14">
            <div className="flex items-end gap-4">
              {/* Floating Logo */}
              <div className="relative group">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-1 border-4 border-white shadow-md overflow-hidden bg-slate-100 flex items-center justify-center shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Building2 className="w-10 h-10 text-slate-400" />
                  )}
                  {uploadingLogo && (
                    <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center text-white">
                      <Loader2 className="w-6 h-6 animate-spin text-[#F5B91B]" />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="absolute bottom-1 right-1 p-2 bg-[#244F9A] hover:bg-[#193B70] text-white rounded-xl shadow-md transition cursor-pointer"
                  title="Alterar logótipo"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="pb-1">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                  {companyName || 'Nome da Sua Empresa'}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {industry} • {municipality}
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-400">
              Fotografia e capa visíveis em vagas, publicações e marketplace.
            </div>
          </div>
        </div>

        {/* Formulário Principal em Tela Única */}
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* 1. Dados Institucionais */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-[#244F9A]" />
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Informações da Empresa
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome da Empresa / Razão Social *
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Ex: Agro-Pecuária Cunene Viva"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#244F9A] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NIF (Número de Identificação Fiscal)
                </label>
                <input
                  type="text"
                  value={nif}
                  onChange={e => setNif(e.target.value)}
                  placeholder="Ex: 5000123456"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#244F9A] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Setor / Ramo de Atividade *
                </label>
                <select
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#244F9A] focus:bg-white transition"
                >
                  <option value="Agricultura & Pecuária">Agricultura & Pecuária</option>
                  <option value="Comércio & Serviços">Comércio & Serviços</option>
                  <option value="Construção Civil & Obras">Construção Civil & Obras</option>
                  <option value="Transporte & Logística">Transporte & Logística</option>
                  <option value="Tecnologia & Telecomunicações">Tecnologia & Telecomunicações</option>
                  <option value="Saúde & Farmácia">Saúde & Farmácia</option>
                  <option value="Educação & Formação">Educação & Formação</option>
                  <option value="Hotelaria & Restauração">Hotelaria & Restauração</option>
                  <option value="Banca & Seguros">Banca & Seguros</option>
                  <option value="Indústria & Manufatura">Indústria & Manufatura</option>
                  <option value="Outro">Outro Setor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Município de Sede no Cunene *
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
            </div>
          </div>

          {/* 2. Contactos e Localização */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Phone className="w-4 h-4 text-[#244F9A]" />
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Canais de Contacto e Atendimento
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Telefone Principal
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
                  WhatsApp Oficial da Empresa
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  placeholder="Ex: +244 931 000 000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#244F9A] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-mail de Contacto / RH
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Ex: contacto@empresa.ao"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#244F9A] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Website Oficial / Link Redes Sociais
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://suaempresa.ao"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#244F9A] focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          {/* 3. Apresentação & Serviços */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileText className="w-4 h-4 text-[#244F9A]" />
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Biografia e Serviços da Empresa
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Apresentação / Descrição da Empresa
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Descreva a história da empresa, missão, principais atividades no Cunene e oportunidades que oferece aos candidatos..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-[#244F9A] focus:bg-white transition resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Serviços ou Ramos de Atuação (separados por vírgula)
              </label>
              <input
                type="text"
                value={servicesInput}
                onChange={e => setServicesInput(e.target.value)}
                placeholder="Ex: Fornecimento de Materiais, Fretes, Despacho Aduaneiro, Consultoria"
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
                  Notificações Push Nativas do Navegador
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
              Receba avisos instantâneos no ecrã do seu telemóvel ou computador sempre que um candidato se candidatar a uma vaga sua ou alguém seguir a sua empresa.
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

          {/* Sticky Bottom Bar for Mobile Convenience */}
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
