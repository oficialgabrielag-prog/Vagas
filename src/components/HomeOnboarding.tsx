import React from 'react';
import { UserPlus, FileSearch, CheckCircle, Smartphone, Download, ShieldCheck, Zap, Award } from 'lucide-react';

export const HomeOnboarding: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 space-y-12 py-10">
      {/* How it Works */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Como funciona o Portal?</h2>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">Ligamos talentos locais às melhores oportunidades do Cunene de forma transparente e segura.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Candidates */}
          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0F4C9C] text-white flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Para Candidatos</h3>
            </div>
            <div className="space-y-4">
              {[
                { step: '1', text: 'Crie o seu Perfil Profissional completo e faça upload do seu currículo.', icon: ShieldCheck },
                { step: '2', text: 'Realize os Exames de Mérito para provar as suas competências técnicas.', icon: Award },
                { step: '3', text: 'Destaque-se no Ranking de Talentos e seja convidado por empresas.', icon: Zap }
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <span className="text-2xl font-black text-[#0F4C9C]/20 leading-none">{item.step}</span>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Companies */}
          <div className="bg-[#0F4C9C]/5 p-8 rounded-[2.5rem] border border-[#0F4C9C]/10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                <FileSearch className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Para Empresas</h3>
            </div>
            <div className="space-y-4">
              {[
                { step: '1', text: 'Publique as suas vagas e crie testes técnicos personalizados.', icon: Smartphone },
                { step: '2', text: 'Filtre os melhores candidatos através do Ranking de Mérito Global.', icon: CheckCircle },
                { step: '3', text: 'Contrate talentos locais qualificados com segurança e rapidez.', icon: ShieldCheck }
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <span className="text-2xl font-black text-amber-500/20 leading-none">{item.step}</span>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Web Portal Banner */}
      <section className="bg-gradient-to-br from-[#0F4C9C] to-slate-900 p-8 sm:p-12 rounded-[3rem] text-white relative overflow-hidden shadow-xl shadow-blue-900/20 group">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left space-y-4 max-w-md">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
              <ShieldCheck className="w-3 h-3 text-[#FFC20E]" /> Plataforma Web Oficial
            </div>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight">Oportunidades em tempo real</h2>
            <p className="text-blue-100/80 text-xs sm:text-sm font-medium leading-relaxed">
              Aceda ao CuneneVagas diretamente no navegador a partir de qualquer telemóvel, tablet ou computador, sem necessidade de instalação.
            </p>
          </div>

          <div className="relative">
            <div className="w-48 h-64 bg-slate-800 rounded-[2rem] border-8 border-slate-700 shadow-2xl relative overflow-hidden group-hover:-rotate-6 transition-transform duration-500">
               <div className="w-full h-10 bg-slate-700 flex items-center justify-center">
                 <div className="w-12 h-1.5 bg-slate-600 rounded-full" />
               </div>
               <div className="p-4 space-y-4">
                 <div className="w-full h-2 bg-[#0F4C9C]/30 rounded" />
                 <div className="w-2/3 h-2 bg-[#0F4C9C]/30 rounded" />
                 <div className="w-full h-24 bg-[#0F4C9C]/20 rounded-xl flex items-center justify-center">
                   <Smartphone className="w-8 h-8 text-white/20" />
                 </div>
               </div>
            </div>
            {/* Decoration */}
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-[#FFC20E] rounded-full blur-3xl opacity-30 animate-pulse" />
          </div>
        </div>
        
        {/* Subtle background circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full -ml-32 -mb-32 blur-3xl" />
      </section>
    </div>
  );
};
