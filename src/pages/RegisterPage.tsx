import React, { useState } from 'react';
import { Briefcase, User, Building2, Mail, Lock, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { UserProfile } from '../lib/types';
import { StoreService } from '../lib/store';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
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
      const user = await StoreService.registerWithSupabase(
        email.trim(),
        password,
        fullName.trim() || email.split('@')[0],
        role,
        companyName.trim()
      );
      onRegisterSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta. Verifique os dados introduzidos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 font-sans selection:bg-[#0F4C9C] selection:text-white">
      {/* Top Header Navigation */}
      <div className="max-w-md sm:max-w-xl w-full mx-auto flex items-center justify-between mb-4">
        <button
          onClick={onNavigateToHome}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#0F4C9C] bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition"
        >
          <ArrowLeft className="w-4 h-4 text-[#0F4C9C]" />
          <span>Voltar à Plataforma</span>
        </button>

        <div className="flex items-center gap-2 cursor-pointer" onClick={onNavigateToHome}>
          <div className="w-8 h-8 bg-[#0F4C9C] rounded-lg flex items-center justify-center text-white shadow-xs">
            <Briefcase className="w-4 h-4 text-[#FFC20E]" />
          </div>
          <span className="text-base font-black text-[#0F4C9C] tracking-tight">
            Cunene<span className="text-[#FFC20E]">Vagas</span>
          </span>
        </div>
      </div>

      {/* Main Register Card */}
      <div className="max-w-md sm:max-w-lg w-full mx-auto my-auto">
        <div className="bg-white rounded-2xl p-6 sm:p-10 shadow-sm border border-slate-200 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Criar nova conta
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
              Junte-se à maior plataforma de emprego e negócios da Província do Cunene.
            </p>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="bg-rose-50 text-rose-700 p-4 rounded-xl text-sm border border-rose-100 flex items-start gap-3 animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <div className="font-medium">{error}</div>
            </div>
          )}

          {/* Account Role Selector */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700 block">
              O seu objetivo na plataforma:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('candidate')}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-3 ${
                  role === 'candidate'
                    ? 'border-[#0F4C9C] bg-[#0F4C9C]/5 ring-1 ring-[#0F4C9C] text-[#0F4C9C]'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-slate-50/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${role === 'candidate' ? 'bg-[#0F4C9C] text-white' : 'bg-slate-200 text-slate-500'}`}>
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Candidato</h4>
                  <p className="text-[11px] text-slate-500 leading-tight mt-1">Procurar vagas e gerir currículo.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole('employer')}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-3 ${
                  role === 'employer'
                    ? 'border-[#0F4C9C] bg-[#0F4C9C]/5 ring-1 ring-[#0F4C9C] text-[#0F4C9C]'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-slate-50/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${role === 'employer' ? 'bg-[#0F4C9C] text-white' : 'bg-slate-200 text-slate-500'}`}>
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Empresa</h4>
                  <p className="text-[11px] text-slate-500 leading-tight mt-1">Publicar vagas e produtos.</p>
                </div>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
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
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F4C9C] focus:ring-1 focus:ring-[#0F4C9C] transition-all bg-slate-50/30"
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
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F4C9C] focus:ring-1 focus:ring-[#0F4C9C] transition-all bg-slate-50/30"
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
                  placeholder="exemplo@cunenevagas.ao"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F4C9C] focus:ring-1 focus:ring-[#0F4C9C] transition-all bg-slate-50/30"
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
                  className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0F4C9C] focus:ring-1 focus:ring-[#0F4C9C] transition-all bg-slate-50/30"
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
              className="w-full bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Criar conta agora</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle to Login */}
          <div className="pt-6 border-t border-slate-100 text-center">
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
      </div>

      {/* Footer copyright */}
      <div className="text-center text-xs text-slate-400 mt-6 font-medium">
        © {new Date().getFullYear()} CuneneVagas • Oportunidades & Negócios no Cunene
      </div>
    </div>
  );
};
