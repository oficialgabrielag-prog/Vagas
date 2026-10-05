// ==============================================================================
// SQL FIX FOR SUPABASE RLS (RUN IN SUPABASE SQL EDITOR):
// ALTER TABLE users DISABLE ROW LEVEL SECURITY;
// -- OU SE PREFERIR MANTER RLS ATIVO:
// CREATE POLICY "allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Camera, User, Loader2, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const EditarPerfilCandidato = ({ currentUser: initialUser, isOpen, onClose, onProfileUpdated }) => {
  const [currentUser, setCurrentUser] = useState(initialUser || null);
  const [fullName, setFullName] = useState('');
  const [profession, setProfession] = useState('');
  const [municipality, setMunicipality] = useState('Ondjiva');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  const avatarInputRef = useRef(null);

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'jbj12sj2';
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'empregocunene';

  // Helper para higienizar URLs e bloquear URLs temporárias 'blob:'
  const clean = (url) => {
    if (!url || typeof url !== 'string' || url.startsWith('blob:')) return null;
    return url.split('?')[0];
  };

  // Carregar dados do candidato do Supabase
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return;

        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Supabase fetch error:', error);
        }

        const data = profile || initialUser || {};
        setFullName(data.full_name || '');
        setProfession(data.profession || '');
        setMunicipality(data.municipality || 'Ondjiva');
        setPhone(data.phone || '');
        setWhatsapp(data.whatsapp || '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url || '');
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      }
    };

    if (isOpen) {
      fetchUserData();
    }
  }, [isOpen, initialUser]);

  // Upload da Fotografia Pessoal
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Preview local instantâneo
    const localPreview = URL.createObjectURL(file);
    setAvatarUrl(localPreview);
    setUploadingAvatar(true);
    setStatusMessage({ type: '', text: '' });

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Utilizador não autenticado.');

      // 2. Upload Cloudinary unsigned com preset empregocunene
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.error('Cloudinary error:', errJson);
        throw new Error('Falha no upload para o Cloudinary.');
      }

      const uploadData = await res.json();
      const secure_url = uploadData.secure_url;
      console.log('Cloudinary secure_url:', secure_url);

      // 3. Atualizar tabela users no Supabase com .select() e log de debug
      const { data: updatedRows, error: supabaseError } = await supabase
        .from('users')
        .update({ avatar_url: secure_url })
        .eq('id', user.id)
        .select();

      console.log('SUPABASE RETURN:', updatedRows, supabaseError);

      if (supabaseError) {
        console.error('Supabase error:', supabaseError);
        throw new Error('Erro ao salvar no Supabase: ' + supabaseError.message);
      }

      // Verificação de bloqueio por RLS
      if (!updatedRows || updatedRows.length === 0) {
        alert('RLS bloqueou. Rode no Supabase: ALTER TABLE users DISABLE ROW LEVEL SECURITY');
        throw new Error('RLS bloqueou update - updatedRows vazio');
      }

      // 4. Substituir preview pelo link final HTTPS com cache buster
      const freshUrl = `${secure_url}?t=${Date.now()}`;
      setAvatarUrl(freshUrl);
      setStatusMessage({ type: 'success', text: 'Fotografia salva com sucesso!' });

      if (onProfileUpdated && updatedRows[0]) {
        onProfileUpdated(updatedRows[0]);
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao carregar fotografia.' });
      alert(err.message || 'Erro ao carregar fotografia.');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // Guardar todos os campos do perfil do candidato
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage({ type: '', text: '' });

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Utilizador não autenticado.');

      // Bloqueio rigoroso de URLs 'blob:'
      const cleanAvatarUrl = clean(avatarUrl);

      const updatePayload = {
        full_name: fullName,
        profession,
        municipality,
        phone,
        whatsapp,
        bio
      };

      if (cleanAvatarUrl !== null) updatePayload.avatar_url = cleanAvatarUrl;

      const { data: updatedRows, error: supabaseError } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', user.id)
        .select();

      console.log('SUPABASE RETURN:', updatedRows, supabaseError);

      if (supabaseError) {
        console.error('Supabase error:', supabaseError);
        throw new Error('Erro ao guardar perfil: ' + supabaseError.message);
      }

      if (!updatedRows || updatedRows.length === 0) {
        alert('RLS bloqueou. Rode no Supabase: ALTER TABLE users DISABLE ROW LEVEL SECURITY');
        throw new Error('RLS bloqueou update - updatedRows vazio');
      }

      setStatusMessage({ type: 'success', text: 'Perfil de candidato guardado com sucesso!' });
      
      if (onProfileUpdated && updatedRows[0]) {
        onProfileUpdated(updatedRows[0]);
      }

      setTimeout(() => {
        if (onClose) onClose();
      }, 1000);
    } catch (err) {
      console.error('Save error:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao guardar dados do candidato.' });
      alert(err.message || 'Erro ao guardar dados do candidato.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 my-6">
        <div className="bg-[#0F4C9C] p-5 text-white flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">Editar Perfil do Candidato</h3>
            <p className="text-xs text-slate-200">As alterações afetam exclusivamente o seu perfil na tabela users</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMessage.text && (
          <div className={`p-3 text-xs font-bold text-center ${
            statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
          }`}>
            {statusMessage.text}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Fotografia Pessoal */}
          <div className="flex flex-col items-center gap-2">
            <label className="text-xs font-bold text-slate-700">Fotografia Pessoal</label>
            
            <div 
              className="relative group cursor-pointer" 
              onClick={() => !uploadingAvatar && avatarInputRef.current?.click()}
            >
              <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-100 flex items-center justify-center shadow-xs transition group-hover:border-[#0F4C9C]">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Fotografia de Perfil" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-slate-400 flex flex-col items-center gap-1">
                    <User className="w-8 h-8" />
                    <span className="text-[10px] font-semibold">Adicionar</span>
                  </div>
                )}

                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white gap-1 animate-fadeIn">
                    <Loader2 className="w-6 h-6 animate-spin text-[#FFC20E]" />
                    <span className="text-[10px] font-bold">Enviando...</span>
                  </div>
                )}
              </div>

              {!uploadingAvatar && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    avatarInputRef.current?.click();
                  }}
                  className="absolute bottom-0 right-0 p-2 bg-[#0F4C9C] text-white rounded-full shadow-md hover:bg-[#0c3c7d] transition"
                  title={avatarUrl ? 'Alterar foto' : 'Adicionar foto'}
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="text-xs font-bold text-[#0F4C9C] hover:underline"
            >
              {avatarUrl ? 'Alterar Fotografia' : 'Adicionar Fotografia'}
            </button>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-[#0F4C9C] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Profissão / Título Profissional</label>
            <input
              type="text"
              value={profession}
              onChange={e => setProfession(e.target.value)}
              placeholder="Ex: Eletricista, Contabilista, Gestor"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-[#0F4C9C] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Município de Residência</label>
            <select
              value={municipality}
              onChange={e => setMunicipality(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-[#0F4C9C] focus:outline-none bg-white"
            >
              <option value="Ondjiva">Ondjiva</option>
              <option value="Cuanhama">Cuanhama</option>
              <option value="Namacunde">Namacunde</option>
              <option value="Ombadja">Ombadja</option>
              <option value="Curoca">Curoca</option>
              <option value="Cahama">Cahama</option>
              <option value="Cuvelai">Cuvelai</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Telefone de Contacto</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+244 9XX XXX XXX"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-[#0F4C9C] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp de Contacto</label>
              <input
                type="text"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="+244 9XX XXX XXX"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-[#0F4C9C] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Resumo Curricular / Biografia</label>
            <textarea
              rows={3}
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Fale brevemente sobre a sua experiência e objetivos profissionais..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:border-[#0F4C9C] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'A guardar...' : 'Guardar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
