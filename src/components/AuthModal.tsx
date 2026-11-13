import React, { useState, useEffect } from 'react';
import { X, UserCheck, Building2, Mail, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import { UserProfile } from '../lib/types';
import { StoreService } from '../lib/store';
import { toUserErrorMessage } from '../lib/errorMessages';
import { verifyRecaptchaAction, getRecaptchaSiteKey, loadRecaptchaScript } from '../lib/recaptcha';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess, initialMode = 'login' }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [role, setRole] = useState<'candidate' | 'employer'>('candidate');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Sincroniza modo inicial (Entrar vs Registar) e pré-carrega reCAPTCHA quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setAuthMode(initialMode);
      setError('');
      setSuccessMessage('');
      const siteKey = getRecaptchaSiteKey();
      if (siteKey) {
        loadRecaptchaScript(siteKey).catch(() => {});
      }
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (authMode === 'forgot') {
      if (!email) {
        setError('Por favor, introduza o seu email.');
        return;
      }
      setLoading(true);
      try {
        const captchaResult = await verifyRecaptchaAction('forgot_password');
        if (!captchaResult.success) {
          setError(captchaResult.error || 'Verificação de segurança reCAPTCHA falhou. Tente novamente.');
          setLoading(false);
          return;
        }

        await StoreService.resetPassword(email);
        setSuccessMessage('Instruções de recuperação enviadas para o seu email!');
      } catch (err: unknown) {
        console.warn('Erro ao recuperar palavra-passe:', err);
        setError(toUserErrorMessage(err, 'Não foi possível enviar o email de recuperação. Tenta novamente.'));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email || !password) {
      setError('Por favor, preencha o email e a palavra-passe.');
      return;
    }

    setLoading(true);
    try {
      let user: UserProfile;
      if (authMode === 'register') {
        const cleanEmail = email.trim().toLowerCase();
        const alreadyExists = await StoreService.checkEmailAlreadyRegistered(cleanEmail);
        if (alreadyExists) {
          setError('Atenção: Já existe uma conta registada com este endereço de e-mail. Não é permitido criar mais de uma conta com o mesmo e-mail.');
          setLoading(false);
          return;
        }

        const captchaResult = await verifyRecaptchaAction('register');
        if (!captchaResult.success) {
          setError(captchaResult.error || 'Verificação de segurança reCAPTCHA falhou. Tente novamente.');
          setLoading(false);
          return;
        }

        user = await StoreService.registerWithSupabase(cleanEmail, password, fullName || cleanEmail.split('@')[0], role, companyName);
      } else {
        const captchaResult = await verifyRecaptchaAction('login');
        if (!captchaResult.success) {
          setError(captchaResult.error || 'Verificação de segurança reCAPTCHA falhou. Tente novamente.');
          setLoading(false);
          return;
        }

        user = await StoreService.loginWithSupabase(email, password);
      }
      onLoginSuccess(user);
      onClose();
    } catch (err: unknown) {
      console.warn('Erro na autenticação:', err);
      setError(toUserErrorMessage(err, 'Não foi possível iniciar sessão. Verifica os teus dados e tenta novamente.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="bg-[#D4AF37] p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="text-xs uppercase tracking-widest font-semibold text-[#FFC20E]">
            Acesso • CuneneVagas
          </span>
          <h2 className="text-2xl font-bold mt-1">
            {authMode === 'register' && 'Criar Nova Conta'}
            {authMode === 'login' && 'Iniciar Sessão'}
            {authMode === 'forgot' && 'Recuperar Palavra-passe'}
          </h2>
          <p className="text-sm text-slate-200 mt-1">
            {authMode === 'register' && 'Cria a tua conta para aceder às oportunidades no Cunene'}
            {authMode === 'login' && 'Inicia sessão de forma rápida e segura na tua conta'}
            {authMode === 'forgot' && 'Insere o teu email para redefinir a palavra-passe'}
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-rose-50 text-rose-700 p-3.5 rounded-xl text-sm border border-rose-200 space-y-2 animate-fadeIn">
              <div className="font-medium">{error}</div>
              {error.includes('Já existe uma conta') && (
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setAuthMode('login');
                  }}
                  className="text-xs font-bold text-[#D4AF37] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  👉 Iniciar Sessão com este e-mail
                </button>
              )}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 bg-emerald-50 text-emerald-700 p-3 rounded-xl text-sm border border-emerald-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Tipo de Conta</label>
                <div className="p-1 bg-slate-100 rounded-xl grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setRole('candidate')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
                      role === 'candidate'
                        ? 'bg-[#D4AF37] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" /> Candidato
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('employer')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
                      role === 'employer'
                        ? 'bg-[#D4AF37] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="w-4 h-4" /> Empresa
                  </button>
                </div>
              </div>
            )}

            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {role === 'employer' ? 'Nome do Responsável / Titular' : 'Nome Completo'}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder={role === 'employer' ? 'Manuel António' : 'João Manuel Silva'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                />
              </div>
            )}

            {authMode === 'register' && role === 'employer' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Comercial da Empresa</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Ex: AgroCunene LDA"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Correio Eletrónico (Email)</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.ao"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                />
              </div>
            </div>

            {authMode !== 'forgot' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Palavra-passe (Password)</label>
                  {authMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setAuthMode('forgot')}
                      className="text-[11px] text-[#D4AF37] hover:underline"
                    >
                      Esqueceu-se?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#D4AF37] hover:bg-[#F5D77A] text-white font-semibold py-3 rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              <span>
                {loading
                  ? 'A processar...'
                  : authMode === 'register'
                  ? 'Criar Conta'
                  : authMode === 'forgot'
                  ? 'Enviar Link de Recuperação'
                  : 'Iniciar Sessão'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-600 space-y-1">
            {authMode === 'register' && (
              <p>
                Já tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-[#D4AF37] font-bold hover:underline"
                >
                  Entrar
                </button>
              </p>
            )}

            {authMode === 'login' && (
              <p>
                Ainda não tem conta?{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className="text-[#D4AF37] font-bold hover:underline"
                >
                  Registar gratuitamente
                </button>
              </p>
            )}

            {authMode === 'forgot' && (
              <p>
                Lembrou-se da palavra-passe?{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-[#D4AF37] font-bold hover:underline"
                >
                  Voltar ao início de sessão
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
