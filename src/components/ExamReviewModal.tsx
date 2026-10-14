import React from 'react';
import { X, CheckCircle2, XCircle, Clock, Award, FileText, Check, AlertCircle } from 'lucide-react';
import { ExamAttempt, ExamQuestion } from '../lib/types';

interface ExamReviewModalProps {
  attempt: ExamAttempt | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenCertificate?: (attempt: ExamAttempt) => void;
}

export const ExamReviewModal: React.FC<ExamReviewModalProps> = ({
  attempt,
  isOpen,
  onClose,
  onOpenCertificate
}) => {
  if (!isOpen || !attempt) return null;

  const questions: ExamQuestion[] = attempt.exam?.questions || [];
  const candidateAnswers = attempt.answers || {};

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-y-auto">
      {/* Sleek Top Header Bar */}
      <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest font-black text-[#FFC20E]">
                Gabarito & Correção Detalhada
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                attempt.passed ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
              }`}>
                {attempt.passed ? 'Aprovado' : 'Não Aprovado'}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black">{attempt.exam?.title || attempt.job_title || 'Avaliação Técnica'}</h2>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition flex items-center gap-1.5 text-xs font-bold"
        >
          <X className="w-5 h-5" />
          <span className="hidden sm:inline">Fechar</span>
        </button>
      </div>

      {/* Main Full-Screen Body */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* Candidate & Metrics Summary (Natural, no heavy blue/white cards) */}
        <div className="space-y-4 border-b border-slate-200 pb-6">
          {attempt.candidate_name && (
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Candidato: <strong className="text-slate-900">{attempt.candidate_name}</strong>
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-black">Classificação</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{attempt.percentage}%</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-black">Pontuação</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{attempt.score} / {attempt.total_points} pts</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-black">Tempo Gasto</span>
              <span className="text-2xl font-black text-[#0F4C9C] mt-1 flex items-center gap-1">
                <Clock className="w-4 h-4" /> {formatTime(attempt.time_spent_seconds || 0)}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-black">Mínimo Exigido</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{attempt.exam?.passing_score || 70}%</span>
            </div>
          </div>
        </div>

        {/* Questions list without white cards */}
        <div className="space-y-8">
          {questions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p>O detalhe das perguntas não está disponível para esta avaliação.</p>
            </div>
          ) : (
            questions.map((q, idx) => {
              const candidateAns = candidateAnswers[q.id] || '';
              
              let correctAns = q.correct_answer || '';
              try {
                if (correctAns !== 'HIDDEN' && !correctAns.includes(' ')) {
                  const decoded = decodeURIComponent(atob(correctAns));
                  if (decoded) correctAns = decoded;
                }
              } catch {}

              const isHidden = correctAns === 'HIDDEN';
              const isCorrect = !isHidden && candidateAns.trim().toLowerCase() === correctAns.trim().toLowerCase();

              return (
                <div 
                  key={q.id || idx}
                  className="space-y-4 pb-6 border-b border-slate-100 last:border-b-0"
                >
                  {/* Question header */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[#0F4C9C]">
                        {idx + 1}.
                      </span>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {q.question_type === 'multiple_choice' ? 'Escolha Múltipla' : q.question_type === 'true_false' ? 'Verdadeiro ou Falso' : 'Resposta Curta'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">{q.points} pts</span>
                      {isCorrect ? (
                        <span className="flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Correto
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-black text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200/60">
                          <XCircle className="w-3.5 h-3.5" /> Incorreto
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question text */}
                  <h4 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                    {q.question_text}
                  </h4>

                  {/* Options / Answers visualization */}
                  {q.question_type === 'multiple_choice' && q.options && (
                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => {
                        const isSelectedByCandidate = candidateAns === opt;
                        const isThisCorrect = !isHidden && opt.trim().toLowerCase() === correctAns.trim().toLowerCase();

                        let optClass = 'border-slate-200 bg-slate-50/50 text-slate-700';
                        if (isThisCorrect) {
                          optClass = 'border-emerald-500 bg-emerald-50/80 text-emerald-900 font-black';
                        } else if (isSelectedByCandidate && !isThisCorrect) {
                          optClass = 'border-red-400 bg-red-50/80 text-red-900 font-bold';
                        }

                        return (
                          <div 
                            key={optIdx}
                            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${optClass}`}
                          >
                            <span className="flex items-center gap-2.5 font-bold">
                              {isThisCorrect ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : isSelectedByCandidate ? (
                                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                              )}
                              <span>{opt}</span>
                            </span>

                            {isSelectedByCandidate && (
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
                                Resposta do Candidato
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.question_type !== 'multiple_choice' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase mb-0.5">Resposta do Candidato</span>
                        <span className={`font-bold ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                          {candidateAns || '(Sem resposta)'}
                        </span>
                      </div>
                      {!isHidden && (
                        <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200">
                          <span className="text-[10px] text-emerald-600 font-bold block uppercase mb-0.5">Gabarito Oficial</span>
                          <span className="font-bold text-emerald-900">
                            {correctAns}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {q.explanation && (
                    <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-blue-100 flex items-start gap-2 text-xs text-blue-900">
                      <AlertCircle className="w-4 h-4 text-[#0F4C9C] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[#0F4C9C] font-bold">Explicação Pedagógica:</strong>
                        <span>{q.explanation}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-xs text-slate-500 font-semibold">
            {attempt.passed 
              ? 'Classificação satisfatória atingida com aprovação oficial.' 
              : 'Não atingiu a nota mínima nesta tentativa.'}
          </span>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {attempt.passed && onOpenCertificate && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCertificate(attempt);
                }}
                className="flex-1 sm:flex-none bg-[#FFC20E] hover:bg-amber-400 text-slate-950 font-bold text-xs px-5 py-3 rounded-xl transition shadow-xs flex items-center justify-center gap-2"
              >
                <Award className="w-4 h-4" />
                <span>Ver Certificado</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="flex-1 sm:flex-none bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-3 rounded-xl transition"
            >
              Concluir & Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
