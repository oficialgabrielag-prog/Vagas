import React from 'react';
import { X, Award, CheckCircle2, Printer, ShieldCheck, Calendar, User, FileText } from 'lucide-react';
import { ExamAttempt, UserProfile } from '../lib/types';

interface ExamCertificateModalProps {
  attempt: ExamAttempt | null;
  currentUser?: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ExamCertificateModal: React.FC<ExamCertificateModalProps> = ({
  attempt,
  currentUser,
  isOpen,
  onClose
}) => {
  if (!isOpen || !attempt) return null;

  const candidateName = attempt.candidate_name || currentUser?.full_name || 'Candidato da Plataforma';
  const examTitle = attempt.exam?.title || attempt.job_title || 'Avaliação Profissional';
  const dateFormatted = new Date(attempt.created_at).toLocaleDateString('pt-AO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const certCode = `CUN-CERT-${attempt.id.slice(-8).toUpperCase()}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-100 my-6 print:border-none print:shadow-none print:m-0 print:max-w-none">
        
        {/* Modal Action Bar (hidden on print) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#FFC20E]" />
            <span className="text-sm font-bold tracking-wide">Certificado Digital Oficial</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 transition shadow-sm"
              title="Imprimir ou Salvar como PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Canvas / Body */}
        <div className="p-8 sm:p-12 relative bg-[#FBFBFD] border-8 border-double border-[#0F4C9C]/20 m-4 rounded-2xl print:m-0 print:border-4">
          {/* Subtle Watermark Corner Ornaments */}
          <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-[#FFC20E]" />
          <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-[#FFC20E]" />
          <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-[#FFC20E]" />
          <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-[#FFC20E]" />

          {/* Top Brand & Crest */}
          <div className="text-center space-y-2 mb-8">
            <div className="inline-flex items-center justify-center gap-2 bg-[#0F4C9C]/10 text-[#0F4C9C] px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4 text-[#0F4C9C]" />
              <span>Cunene Oportunidades • Emprego & Qualificação</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight mt-3">
              Certificado de Proficiência Técnica
            </h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              República de Angola • Província do Cunene
            </p>
          </div>

          {/* Recipient Announcement */}
          <div className="text-center space-y-6 my-8">
            <p className="text-sm text-slate-600 font-medium">
              Certifica-se com honras que o(a) profissional
            </p>

            <div className="py-2 border-b-2 border-[#0F4C9C]/30 inline-block px-8 max-w-full">
              <h2 className="text-2xl sm:text-3xl font-black text-[#0F4C9C] tracking-wide break-words">
                {candidateName}
              </h2>
            </div>

            <p className="text-sm sm:text-base text-slate-700 max-w-xl mx-auto leading-relaxed">
              concluiu e obteve aprovação na avaliação técnica de competências:
            </p>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs max-w-lg mx-auto">
              <h3 className="text-lg font-bold text-slate-900">{examTitle}</h3>
              <div className="flex items-center justify-center gap-4 mt-2 text-xs font-semibold text-slate-600">
                <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Aproveitamento: <strong>{attempt.percentage}%</strong>
                </span>
                <span className="text-slate-500">
                  Pontos: <strong>{attempt.score} de {attempt.total_points}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Footer Metadata & Stamp */}
          <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
            <div className="text-center sm:text-left text-xs text-slate-500 space-y-1">
              <p className="font-bold text-slate-700 flex items-center justify-center sm:justify-start gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#0F4C9C]" /> Data de Conclusão:
              </p>
              <p>{dateFormatted}</p>
              <p className="text-[10px] text-slate-400 font-mono">Código: {certCode}</p>
            </div>

            {/* Official Stamp */}
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full border-4 border-dashed border-[#FFC20E] bg-[#FFC20E]/10 flex flex-col items-center justify-center p-2 text-center rotate-[-6deg] shadow-xs">
                <Award className="w-7 h-7 text-[#0F4C9C]" />
                <span className="text-[9px] font-black uppercase text-[#0F4C9C] leading-none mt-1">APROVADO</span>
                <span className="text-[7px] text-slate-600 uppercase font-semibold">CUNENE 2026</span>
              </div>
            </div>

            <div className="text-center sm:text-right text-xs text-slate-500 space-y-1">
              <div className="border-t border-slate-400 pt-1 w-36 mx-auto sm:ml-auto">
                <p className="font-bold text-slate-800 text-[11px]">Conselho de Avaliação</p>
                <p className="text-[9px] text-slate-500">Validação Digital Cunene</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom helper */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-2 print:hidden">
          <span>Este certificado digital pode ser anexado ao seu currículo ou perfil.</span>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-bold px-4 py-1.5 rounded-lg hover:bg-slate-200 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
