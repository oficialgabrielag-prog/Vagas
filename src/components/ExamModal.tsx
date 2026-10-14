import React, { useState, useEffect } from 'react';
import { X, Clock, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, Award, FileText } from 'lucide-react';
import { Exam, UserProfile, ExamAttempt, Job } from '../lib/types';
import { StoreService } from '../lib/store';

interface ExamModalProps {
  exam: Exam | null;
  job?: Job | null;
  applicationId?: string;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onExamSubmitted: () => void;
  onOpenReview?: (attempt: ExamAttempt) => void;
  onOpenCertificate?: (attempt: ExamAttempt) => void;
}

export const ExamModal: React.FC<ExamModalProps> = ({
  exam,
  job,
  applicationId,
  isOpen,
  onClose,
  currentUser,
  onExamSubmitted,
  onOpenReview,
  onOpenCertificate
}) => {
  const [currentStep, setCurrentStep] = useState<'instructions' | 'taking' | 'result'>('instructions');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [attemptResult, setAttemptResult] = useState<ExamAttempt | null>(null);

  useEffect(() => {
    if (exam && isOpen) {
      setCurrentStep('instructions');
      setCurrentQuestionIndex(0);
      setAnswers({});
      setTimeLeft((exam.time_limit_minutes || 15) * 60);
      setAttemptResult(null);
    }
  }, [exam, isOpen]);

  useEffect(() => {
    let timer: any;
    if (currentStep === 'taking' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [currentStep, timeLeft]);

  if (!isOpen || !exam || !currentUser) return null;

  const previousAttempts = StoreService.getExamAttempts().filter(a => 
    a.candidate_id === currentUser.id && 
    (a.exam_id === exam.id || (exam.title && a.exam?.title === exam.title))
  );
  const maxAttempts = exam.max_attempts || 3;
  const hasReachedLimit = maxAttempts > 0 && maxAttempts < 90 && previousAttempts.length >= maxAttempts;
  const bestAttempt = previousAttempts.length > 0 
    ? [...previousAttempts].sort((a, b) => b.percentage - a.percentage)[0] 
    : null;

  const handleSelectAnswer = (questionId: string, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleSubmitExam = async () => {
    try {
      // Find job through prop, by id, by embedded exam id, or fallback
      let targetJob = job || StoreService.getJobs().find(j => 
        (exam.job_id && exam.job_id !== 'pending' && j.id === exam.job_id) || 
        (j.exam && j.exam.id === exam.id) ||
        (exam.title && j.exam && j.exam.title === exam.title)
      );

      if (!targetJob) {
        targetJob = {
          id: exam.job_id && exam.job_id !== 'pending' ? exam.job_id : 'job-' + Date.now(),
          employer_id: currentUser.id,
          title: exam.title || 'Avaliação Técnica',
          company_name: 'Empresa',
          municipality: 'Ondjiva',
          category: 'Tecnologia',
          contract_type: 'Tempo Inteiro',
          experience_level: 'Intermédio',
          salary_currency: 'AOA',
          description: exam.description || '',
          requirements: [],
          benefits: [],
          vacancies_count: 1,
          status: 'active',
          has_exam: true,
          exam: {
            ...exam,
            job_id: exam.job_id || 'job-active'
          },
          created_at: new Date().toISOString()
        };
      }

      const effectiveJobId = targetJob.id;

      const isSimulatedExam = !!(
        exam.is_simulated ||
        exam.id?.startsWith('free-') ||
        exam.job_id === 'practice-general' ||
        (!job && !applicationId && exam.id?.startsWith('free-'))
      );

      const attempt = await StoreService.submitExamAttempt({
        exam_id: exam.id,
        job_id: effectiveJobId,
        candidate_id: currentUser.id,
        application_id: isSimulatedExam ? undefined : applicationId,
        time_spent_seconds: (exam.time_limit_minutes || 15) * 60 - timeLeft,
        status: 'completed',
        is_simulated: isSimulatedExam
      }, answers, targetJob);

      // Update application ONLY if not a simulated test and applicationId exists
      if (!isSimulatedExam) {
        if (applicationId) {
          StoreService.updateApplicationExamResult(applicationId, attempt.score, attempt.percentage, attempt.passed);
        } else {
          // Fallback: find application by job_id & candidate_id
          const apps = StoreService.getApplications();
          const app = apps.find(a => (a.job_id === effectiveJobId || a.job_id === exam.job_id) && a.candidate_id === currentUser.id);
          if (app) {
            StoreService.updateApplicationExamResult(app.id, attempt.score, attempt.percentage, attempt.passed);
          }
        }
      }

      setAttemptResult(attempt);
      setCurrentStep('result');
      onExamSubmitted();
    } catch (err: any) {
      alert(err.message || 'Erro ao submeter exame.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const currentQ = exam.questions[currentQuestionIndex];

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-y-auto">
      {/* Top Bar / Header */}
      <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shadow-sm shrink-0">
        <div>
          <span className="text-[10px] uppercase tracking-widest font-black text-[#FFC20E]">
            Avaliação Profissional Oficial
          </span>
          <h2 className="text-lg sm:text-xl font-black">{exam.title}</h2>
        </div>

        <button
          onClick={() => {
            onClose();
          }}
          className="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition flex items-center gap-1.5 text-xs font-bold"
        >
          <X className="w-5 h-5" />
          <span className="hidden sm:inline">Sair do Exame</span>
        </button>
      </div>

      {/* Main Container without white cards */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-center">
        {currentStep === 'instructions' && (
          <div className="space-y-6 max-w-2xl mx-auto py-8">
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900">Instruções Importantes</h3>
              <p className="text-sm text-slate-600">{exam.description}</p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-bold uppercase tracking-wider">Perguntas</span>
                  <span className="text-base font-black text-slate-900">{exam.questions.length} Questões</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase tracking-wider">Tempo Limite</span>
                  <span className="text-base font-black text-[#0F4C9C]">{exam.time_limit_minutes} Minutos</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase tracking-wider">Nota Mínima</span>
                  <span className="text-base font-black text-slate-900">{exam.passing_score}% para Aprovação</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase tracking-wider">Tentativas</span>
                  <span className="text-base font-black text-slate-900">{exam.max_attempts} Max ({previousAttempts.length} usadas)</span>
                </div>
              </div>
            </div>

            {hasReachedLimit ? (
              <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-rose-900 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Limite de tentativas atingido</h4>
                    <p className="text-xs text-rose-700 mt-1">
                      Já utilizou todas as oportunidades permitidas. Melhor pontuação: <strong>{bestAttempt?.percentage}%</strong> ({bestAttempt?.passed ? 'Aprovado' : 'Não Aprovado'}).
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  {bestAttempt && onOpenReview && (
                    <button
                      onClick={() => { onClose(); onOpenReview(bestAttempt); }}
                      className="flex-1 bg-[#0F4C9C] text-white font-bold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" /> Ver Gabarito
                    </button>
                  )}
                  {bestAttempt?.passed && onOpenCertificate && (
                    <button
                      onClick={() => { onClose(); onOpenCertificate(bestAttempt); }}
                      className="flex-1 bg-[#FFC20E] text-slate-950 font-bold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2"
                    >
                      <Award className="w-4 h-4" /> Ver Certificado
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-4 rounded-2xl border border-amber-200/60">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>O cronômetro iniciará assim que clicar em começar. Responda com atenção.</span>
                </div>

                <button
                  onClick={() => setCurrentStep('taking')}
                  className="w-full bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-black py-4 px-6 rounded-2xl text-sm transition shadow-lg flex items-center justify-center gap-2 active:scale-98"
                >
                  <span>Iniciar Exame em Tela Cheia</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {currentStep === 'taking' && currentQ && (
          <div className="space-y-8 max-w-3xl mx-auto w-full py-6">
            {/* Progress & Timer */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                <span>Questão {currentQuestionIndex + 1} de {exam.questions.length}</span>
                <div className={`flex items-center gap-1.5 font-black px-3 py-1.5 rounded-xl border ${
                  timeLeft < 60 ? 'text-red-600 border-red-200 bg-red-50' : 'text-[#0F4C9C] border-blue-200 bg-blue-50'
                }`}>
                  <Clock className="w-4 h-4" />
                  <span className="tabular-nums">{formatTime(timeLeft)}</span>
                </div>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#0F4C9C] transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / exam.questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Card (No white background card box, clean natural flow) */}
            <div className="space-y-6">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                {currentQ.question_text}
              </h3>

              {currentQ.question_type === 'multiple_choice' && currentQ.options && (
                <div className="space-y-3">
                  {currentQ.options.map((opt, idx) => {
                    const isSelected = answers[currentQ.id] === opt;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectAnswer(currentQ.id, opt)}
                        className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-[#0F4C9C] bg-blue-50/50 text-[#0F4C9C] font-black'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700 font-bold bg-slate-50/50'
                        }`}
                      >
                        <span className="text-sm">{opt}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-[#0F4C9C] bg-[#0F4C9C]' : 'border-slate-300'
                        }`}>
                          {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {currentQ.question_type === 'true_false' && (
                <div className="grid grid-cols-2 gap-4">
                  {['Verdadeiro', 'Falso'].map(opt => {
                    const isSelected = answers[currentQ.id] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSelectAnswer(currentQ.id, opt)}
                        className={`py-6 px-4 rounded-2xl border-2 text-sm font-black transition-all ${
                          isSelected
                            ? 'border-[#0F4C9C] bg-blue-50/50 text-[#0F4C9C]'
                            : 'border-slate-200 text-slate-600 bg-slate-50/50 hover:border-slate-300'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {currentQ.question_type === 'short_answer' && (
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={answers[currentQ.id] || ''}
                    onChange={e => handleSelectAnswer(currentQ.id, e.target.value)}
                    placeholder="Escreva a sua resposta..."
                    className="w-full p-5 rounded-2xl border-2 border-slate-200 focus:border-[#0F4C9C] text-sm text-slate-800 outline-none transition bg-slate-50/50 resize-none"
                  />
                </div>
              )}
            </div>

            {/* Navigation footer */}
            <div className="flex items-center justify-between pt-8 border-t border-slate-200">
              <button
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                className={`px-5 py-3 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  currentQuestionIndex === 0 ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <ArrowLeft className="w-4 h-4" /> Anterior
              </button>

              {currentQuestionIndex < exam.questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                  className="bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-black px-6 py-3 rounded-xl text-xs transition shadow-sm flex items-center gap-2"
                >
                  <span>Seguinte</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleSubmitExam();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-3 rounded-xl text-xs transition shadow-md uppercase tracking-wider cursor-pointer active:scale-95"
                >
                  Finalizar Exame
                </button>
              )}
            </div>
          </div>
        )}

        {currentStep === 'result' && attemptResult && (
          <div className="text-center space-y-6 max-w-lg mx-auto py-12">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
              attemptResult.passed ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
            }`}>
              {attemptResult.passed ? <CheckCircle2 className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-900">
                {attemptResult.passed ? 'Parabéns, Exame Aprovado!' : 'Exame Não Aprovado'}
              </h3>
              <p className="text-sm text-slate-600">
                Pontuação: <strong>{attemptResult.percentage}%</strong> ({attemptResult.score} de {attemptResult.total_points} pontos).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <p>Tempo utilizado: {Math.round(attemptResult.time_spent_seconds / 60)} minutos</p>
              <p>Nota mínima exigida: {exam.passing_score}%</p>
            </div>

            <div className="space-y-2.5 pt-4">
              {attemptResult && onOpenReview && (
                <button
                  onClick={() => { onClose(); onOpenReview(attemptResult); }}
                  className="w-full bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-bold py-3.5 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <FileText className="w-4 h-4" /> Ver Gabarito Completo & Correção
                </button>
              )}

              {attemptResult.passed && onOpenCertificate && (
                <button
                  onClick={() => { onClose(); onOpenCertificate(attemptResult); }}
                  className="w-full bg-[#FFC20E] hover:bg-amber-400 text-slate-950 font-bold py-3.5 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <Award className="w-4 h-4" /> Ver Certificado Oficial de Aprovação
                </button>
              )}

              <button
                onClick={() => { onClose(); setCurrentStep('instructions'); }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs transition"
              >
                Concluir e Voltar ao Painel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
