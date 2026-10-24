import React, { useState, useEffect } from 'react';
import { Briefcase, UserCheck, Building2, Mail, Lock, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { UserProfile } from '../lib/types';
import { StoreService } from '../lib/store';
import { AnimatedBrandLogo } from '../components/AnimatedBrandLogo';
import { verifyRecaptchaAction, getRecaptchaSiteKey, loadRecaptchaScript } from '../lib/recaptcha';

interface RegisterPageProps {
  onRegisterSuccess: (user: UserProfile) => void;
  onNavigateToLogin: () => void;
  onNavigateToHome: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onRegisterSuccess,
  onNavigateToLogin,
  onNavigateToHome
}) => {
  const [role, setRole] = useState<'candidate' | 'employer'>('candidate');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pré-carrega o script do reCAPTCHA v3 de forma assíncrona
  useEffect(() => {
    const siteKey = getRecaptchaSiteKey();
    if (siteKey) {
      loadRecaptchaScript(siteKey).catch(() => {});
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError('Por favor, preencha o seu email e palavra-passe.');
      return;
    }

    if (password.length < 6) {
      setError('A palavra-passe deve conter pelo menos 6 caracteres.');
      return;
    }

    if (role === 'employer' && !companyName.trim()) {
      setError('Por favor, informe o nome comercial da sua empresa.');
      return;
    }

    setLoading(true);
    try {
      // 1. Verificação prévia se já existe conta criada com este e-mail
      const alreadyExists = await StoreService.checkEmailAlreadyRegistered(cleanEmail);
      if (alreadyExists) {
        setError('Atenção: Já existe uma conta registada com este endereço de e-mail. Não é permitido criar mais de uma conta com o mesmo e-mail.');
        setLoading(false);
        return;
      }

      // 2. Verificação de segurança Google reCAPTCHA v3 (ação: register)
      const captchaResult = await verifyRecaptchaAction('register');
      if (!captchaResult.success) {
        setError(captchaResult.error || 'Verificação de segurança reCAPTCHA falhou. Tente novamente.');
        setLoading(false);
        return;
      }

      // 3. Realizar cadastro com Supabase Auth
      const user = await StoreService.registerWithSupabase(
        cleanEmail,
        password,
        fullName.trim() || cleanEmail.split('@')[0],
        role,
        companyName.trim()
      );

      // Usuário entra imediatamente na plataforma sem necessidade de confirmação de e-mail
      onRegisterSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta. Verifique os dados introduzidos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 font-sans selection:bg-[#0F4C9C] selection:text-white">
      {/* Top Header Branding Centered with Animated Letters */}
      <div className="max-w-md w-full mx-auto flex items-center justify-center pt-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-[#0F4C9C] rounded-xl flex items-center justify-center text-white shadow-xs">
            <Briefcase className="w-5 h-5 text-[#FFC20E]" />
          </div>
          <AnimatedBrandLogo mode="active" size="lg" />
        </div>
      </div>

      {/* Main Register Form without White Card Container */}
      <div className="max-w-md sm:max-w-lg w-full mx-auto my-auto space-y-6 py-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Criar nova conta
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
            Junte-se à maior plataforma de emprego e negócios da Província do Cunene.
          </p>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="bg-rose-50 text-rose-700 p-4 rounded-xl text-sm border border-rose-200 flex flex-col gap-2.5 animate-fadeIn">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="font-semibold text-rose-900 leading-snug">{error}</div>
            </div>
            {error.includes('Já existe uma conta') && (
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="self-start text-xs font-bold text-[#0F4C9C] hover:text-[#0a3366] bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-xs transition hover:underline cursor-pointer"
              >
                👉 Ir para Iniciar Sessão com este e-mail
              </button>
            )}
          </div>
        )}

        {/* Account Role Selector - Modern & Cardless */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            O seu objetivo na plataforma:
          </label>
          <div className="p-1.5 bg-slate-200/70 rounded-2xl grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setRole('candidate')}
              className={`py-3 px-3.5 rounded-xl text-left transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                role === 'candidate'
                  ? 'bg-[#0F4C9C] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition ${
                role === 'candidate' ? 'bg-white/20 text-[#FFC20E]' : 'bg-slate-300/60 text-slate-600'
              }`}>
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-extrabold truncate">Candidato</h4>
                <p className={`text-[10px] leading-tight truncate mt-0.5 ${role === 'candidate' ? 'text-blue-100' : 'text-slate-500'}`}>
                  Vagas & Currículo
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRole('employer')}
              className={`py-3 px-3.5 rounded-xl text-left transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                role === 'employer'
                  ? 'bg-[#0F4C9C] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition ${
                role === 'employer' ? 'bg-white/20 text-[#FFC20E]' : 'bg-slate-300/60 text-slate-600'
              }`}>
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-extrabold truncate">Empresa</h4>
                <p className={`text-[10px] leading-tight truncate mt-0.5 ${role === 'employer' ? 'text-blue-100' : 'text-slate-500'}`}>
                  Publicar Vagas & Loja
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">
              {role === 'employer' ? 'Nome do Responsável' : 'Nome Completo'}
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder={role === 'employer' ? 'Nome e Apelido' : 'O seu nome completo'}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F4C9C] focus:ring-1 focus:ring-[#0F4C9C] transition-all bg-white"
            />
          </div>

          {role === 'employer' && (
            <div className="animate-fadeIn space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">
                Nome da Empresa / Loja
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Ex: AgroCunene ou Minha Loja"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F4C9C] focus:ring-1 focus:ring-[#0F4C9C] transition-all bg-white"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="exemplo@cunenevagas.online"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F4C9C] focus:ring-1 focus:ring-[#0F4C9C] transition-all bg-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">
              Palavra-passe
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F4C9C] focus:ring-1 focus:ring-[#0F4C9C] transition-all bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-sm active:scale-[0.98] flex items-center justify-center disabled:opacity-60 cursor-pointer mt-3"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Criar conta agora</span>
            )}
          </button>
        </form>

        {/* Toggle to Login */}
        <div className="pt-4 text-center">
          <p className="text-sm text-slate-600">
            Já tem uma conta?{' '}
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="text-[#0F4C9C] font-bold hover:underline"
            >
              Inicie sessão
            </button>
          </p>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="text-center text-xs text-slate-400 mt-6 font-medium">
        © {new Date().getFullYear()} CuneneVagas • Oportunidades & Negócios no Cunene
      </div>
    </div>
  );
};
