import React, { useState } from 'react';
import { Shield, FileText, CheckCircle2, ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';

interface LegalPageProps {
  initialTab?: 'terms' | 'privacy';
  setCurrentTab: (tab: string) => void;
}

export const LegalPage: React.FC<LegalPageProps> = ({ initialTab = 'terms', setCurrentTab }) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
      {/* Top Navigation / Back */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentTab('home')}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#0F4C9C] bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Início</span>
        </button>

        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'terms' ? 'bg-[#0F4C9C] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Termos de Uso</span>
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'privacy' ? 'bg-[#0F4C9C] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Política de Privacidade</span>
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-[#0F4C9C] text-white p-8 rounded-3xl shadow-sm space-y-3 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4 pointer-events-none">
          {activeTab === 'terms' ? <FileText className="w-64 h-64" /> : <Shield className="w-64 h-64" />}
        </div>
        <span className="text-xs uppercase tracking-widest font-bold text-[#FFC20E] bg-white/10 px-3 py-1 rounded-full inline-block">
          Documentação Legal • Angola / Cunene
        </span>
        <h1 className="text-2xl sm:text-4xl font-black">
          {activeTab === 'terms' ? 'Termos e Condições de Uso' : 'Política de Privacidade e Proteção de Dados'}
        </h1>
        <p className="text-slate-200 text-xs sm:text-sm max-w-2xl leading-relaxed">
          {activeTab === 'terms'
            ? 'Estes Termos regulam a utilização da plataforma CuneneVagas, estabelecendo os direitos e obrigações para candidatos, empresas e visitantes na província do Cunene e em toda a República de Angola.'
            : 'A sua privacidade é fundamental para nós. Esta política descreve como recolhemos, utilizamos, armazenamos e protegemos as suas informações pessoais ao utilizar os nossos serviços.'}
        </p>
        <div className="text-[11px] text-slate-300 pt-2 flex items-center gap-4">
          <span>Última atualização: Outubro de 2026</span>
          <span>•</span>
          <span>CuneneVagas, Ondjiva, Angola</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-2xs space-y-8 text-slate-700 text-sm leading-relaxed">
        {activeTab === 'terms' ? (
          <>
            <section className="space-y-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-blue-50 text-[#0F4C9C] flex items-center justify-center text-xs font-bold">1</span>
                <span>Aceitação dos Termos</span>
              </h2>
              <p>
                Ao aceder e utilizar a plataforma <strong>CuneneVagas</strong> (disponível em cunenevagas.online), o utilizador concorda expressamente em cumprir e ficar vinculado aos presentes Termos de Uso. Caso não concorde com qualquer parte destes termos, deverá abster-se de utilizar a plataforma.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-blue-50 text-[#0F4C9C] flex items-center justify-center text-xs font-bold">2</span>
                <span>Natureza da Plataforma</span>
              </h2>
              <p>
                O CuneneVagas é uma plataforma digital de recrutamento, emprego, testes de competências técnicas e marketplace local, operando prioritariamente na província do Cunene, República de Angola. A plataforma atua como intermediária tecnológica conectando candidatos a oportunidades profissionais e facilitando o comércio local entre empresas e consumidores.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-blue-50 text-[#0F4C9C] flex items-center justify-center text-xs font-bold">3</span>
                <span>Registo e Contas de Utilizador</span>
              </h2>
              <ul className="space-y-2 pl-4 list-disc text-slate-600">
                <li>O utilizador é responsável por manter a confidencialidade das suas credenciais de acesso.</li>
                <li>É estritamente proibido o registo de contas com dados falsos, fraudulentos ou em nome de terceiros sem autorização.</li>
                <li>Contas de empresas e candidatos devem manter informações verídicas e atualizadas para assegurar a transparência nos processos de seleção.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-blue-50 text-[#0F4C9C] flex items-center justify-center text-xs font-bold">4</span>
                <span>Responsabilidades das Partes</span>
              </h2>
              <p>
                <strong>Candidatos:</strong> Garantem a veracidade do seu currículo, qualificações e resultados de exames técnicos submetidos.
              </p>
              <p className="mt-2">
                <strong>Empresas/Empregadores:</strong> Responsabilizam-se integralmente pelas ofertas de emprego publicadas, cumprindo a legislação laboral angolana aplicável e assegurando condições dignas e transparentes de recrutamento.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-blue-50 text-[#0F4C9C] flex items-center justify-center text-xs font-bold">5</span>
                <span>Conduta Proibida</span>
              </h2>
              <p>É expressamente proibido publicar conteúdos ilícitos, discriminatórios, ofensivos, spam, ofertas de emprego falsas ou produtos proibidos no marketplace.</p>
            </section>
          </>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-blue-50 text-[#0F4C9C] flex items-center justify-center text-xs font-bold">1</span>
                <span>Compromisso com a Privacidade</span>
              </h2>
              <p>
                O CuneneVagas valoriza e protege a privacidade dos dados pessoais dos seus utilizadores. Esta Política de Privacidade explica de forma transparente que informações recolhemos e como as utilizamos em conformidade com as boas práticas de proteção de dados.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-blue-50 text-[#0F4C9C] flex items-center justify-center text-xs font-bold">2</span>
                <span>Informações Recolhidas</span>
              </h2>
              <p>Recolhemos dados fornecidos diretamente pelo utilizador durante o registo e utilização da plataforma:</p>
              <ul className="space-y-2 pl-4 list-disc text-slate-600">
                <li>Dados de identificação e contacto (Nome completo, email, número de telefone e WhatsApp).</li>
                <li>Dados profissionais (Currículo, competências, histórico académico e profissional, município de residência).</li>
                <li>Informações de empresas (Nome comercial, NIF, setor, morada e contactos comerciais).</li>
                <li>Registos de candidaturas, exames técnicos e anúncios publicados no marketplace.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-blue-50 text-[#0F4C9C] flex items-center justify-center text-xs font-bold">3</span>
                <span>Utilização dos Dados</span>
              </h2>
              <p>Os dados recolhidos são utilizados exclusivamente para:</p>
              <ul className="space-y-2 pl-4 list-disc text-slate-600">
                <li>Facilitar o processo de recrutamento e a conexão entre candidatos e empregadores.</li>
                <li>Exibir perfis profissionais e empresariais no diretório e feeds da comunidade.</li>
                <li>Enviar notificações transacionais e comunicados importantes sobre candidaturas e exames.</li>
                <li>Garantir a segurança e integridade da plataforma.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-blue-50 text-[#0F4C9C] flex items-center justify-center text-xs font-bold">4</span>
                <span>Partilha e Segurança de Dados</span>
              </h2>
              <p>
                Os dados de contacto e currículos dos candidatos são partilhados apenas com as empresas às quais o candidato submete candidaturas diretas. Implementamos medidas de segurança técnicas e organizativas robustas para proteger as informações contra acessos não autorizados.
              </p>
            </section>
          </>
        )}

        {/* Contact info box */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-3 mt-8">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            Dúvidas sobre os Termos ou Privacidade?
          </h3>
          <p className="text-xs text-slate-600">
            Entre em contacto com a nossa equipa de suporte através dos canais oficiais da plataforma no Cunene.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-bold text-[#0F4C9C]">
            <a href="mailto:oficialgabrielag@gmail.com" className="flex items-center gap-1.5 hover:underline">
              <Mail className="w-4 h-4 text-[#FFC20E]" /> oficialgabrielag@gmail.com
            </a>
            <a href="tel:+244976848444" className="flex items-center gap-1.5 hover:underline">
              <Phone className="w-4 h-4 text-[#FFC20E]" /> +244 976 848 444
            </a>
            <span className="flex items-center gap-1.5 text-slate-500">
              <MapPin className="w-4 h-4 text-slate-400" /> Ondjiva, Cunene, Angola
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
