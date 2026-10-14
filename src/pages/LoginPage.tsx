import React, { useState } from 'react';
import { Briefcase, Mail, Lock, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { UserProfile } from '../lib/types';
import { StoreService } from '../lib/store';
import { AnimatedBrandLogo } from '../components/AnimatedBrandLogo';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  onNavigateToRegister: () => void;
  onNavigateToHome: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onNavigateToRegister,
  onNavigateToHome
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (isForgot) {
      if (!email.trim()) {
        setError('Por favor, introduza o seu endereço de email.');
        return;
      }
      setLoading(true);
      try {
        await StoreService.resetPassword(email.trim());
        setSuccessMessage('Instruções de recuperação enviadas para o seu email!');
      } catch (err: any) {
        setError(err.message || 'Erro ao enviar email de recuperação.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email.trim() || !password) {
      setError('Por favor, preencha o seu email e palavra-passe.');
      return;
    }

    setLoading(true);
    try {
      const user = await StoreService.loginWithSupabase(email.trim(), password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Dados de acesso incorretos. Verifique o email e a palavra-passe.');
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

      {/* Main Login Form without White Card Container */}
      <div className="max-w-md w-full mx-auto my-auto space-y-6 py-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {isForgot ? 'Recuperar Palavra-passe' : 'Bem-vindo de volta'}
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
            {isForgot
              ? 'Introduza o seu email para receber as instruções de recuperação.'
              : 'Inicie sessão para gerir as suas candidaturas ou anúncios de emprego no Cunene.'}
          </p>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="bg-rose-50 text-rose-700 p-4 rounded-xl text-sm border border-rose-100 flex items-start gap-3 animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <div className="font-medium">{error}</div>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm border border-emerald-100 flex items-start gap-3 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="font-medium">{successMessage}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {!isForgot && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-semibold text-slate-700">
                  Palavra-passe
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgot(true);
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="text-xs text-[#0F4C9C] font-bold hover:text-[#0c3c7d]"
                >
                  Esqueceu-se?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
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
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-sm active:scale-[0.98] flex items-center justify-center disabled:opacity-60 cursor-pointer mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>{isForgot ? 'Enviar recuperação' : 'Entrar na minha conta'}</span>
            )}
          </button>
        </form>

        {/* Toggle between Login, Register, Forgot */}
        <div className="pt-4 text-center">
          {isForgot ? (
            <p className="text-sm text-slate-600">
              Lembrou-se da palavra-passe?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsForgot(false);
                  setError('');
                  setSuccessMessage('');
                }}
                className="text-[#0F4C9C] font-bold hover:underline"
              >
                Voltar ao início
              </button>
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              Ainda não tem conta?{' '}
              <button
                type="button"
                onClick={onNavigateToRegister}
                className="text-[#0F4C9C] font-bold hover:underline"
              >
                Registe-se agora
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Footer copyright */}
      <div className="text-center text-xs text-slate-400 mt-6 font-medium">
        © {new Date().getFullYear()} CuneneVagas • Oportunidades & Negócios no Cunene
      </div>
    </div>
  );
};
