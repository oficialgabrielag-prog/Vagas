import React, { useState, useEffect } from 'react';
import { X, Clock, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
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
}

export const ExamModal: React.FC<ExamModalProps> = ({
  exam,
  job,
  applicationId,
  isOpen,
  onClose,
  currentUser,
  onExamSubmitted
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

      const attempt = await StoreService.submitExamAttempt({
        exam_id: exam.id,
        job_id: effectiveJobId,
        candidate_id: currentUser.id,
        application_id: applicationId,
        time_spent_seconds: (exam.time_limit_minutes || 15) * 60 - timeLeft,
        status: 'completed'
      }, answers, targetJob);

      // Update application if applicationId is provided
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 my-8">
        {/* Header */}
        <div className="bg-[#0F4C9C] p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-6 h-6" />
          </button>
          <span className="text-xs uppercase tracking-widest font-semibold text-[#FFC20E]">
            Avaliação Profissional
          </span>
          <h2 className="text-2xl font-bold mt-1">{exam.title}</h2>
          <p className="text-sm text-slate-200 mt-1">{exam.description}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 'instructions' && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-slate-900 text-base">Instruções do Exame:</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• Número de perguntas: <strong>{exam.questions.length}</strong></li>
                  <li>• Tempo limite: <strong>{exam.time_limit_minutes} minutos</strong></li>
                  <li>• Nota mínima para aprovação: <strong>{exam.passing_score}%</strong></li>
                  <li>• Tentativas permitidas: <strong>{exam.max_attempts}</strong></li>
                </ul>
              </div>

              <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>Certifique-se de ter uma conexão estável antes de iniciar. O cronômetro começará imediatamente após clicar em "Iniciar Exame".</span>
              </div>

              <button
                onClick={() => setCurrentStep('taking')}
                className="w-full bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-semibold py-3 rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2"
              >
                <span>Iniciar Exame Agora</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {currentStep === 'taking' && currentQ && (
            <div className="space-y-6">
              {/* Progress and Timer */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div className="meta-text text-slate-500">
                    <span>Questão {currentQuestionIndex + 1} de {exam.questions.length}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 font-black text-sm px-3 py-1 rounded-lg border ${
                    timeLeft < 60 ? 'text-red-600 border-red-100 bg-red-50' : 'text-[#0F4C9C] border-blue-100 bg-blue-50'
                  }`}>
                    <Clock className="w-4 h-4" />
                    <span className="tabular-nums">{formatTime(timeLeft)}</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#0F4C9C] transition-all duration-500" 
                    style={{ width: `${((currentQuestionIndex + 1) / exam.questions.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="animate-fadeIn">
                <h3 className="text-lg font-black text-slate-900 mb-6 leading-tight">{currentQ.question_text}</h3>
                
                {currentQ.question_type === 'multiple_choice' && currentQ.options && (
                  <div className="space-y-3">
                    {currentQ.options.map((opt, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          answers[currentQ.id] === opt
                            ? 'border-[#0F4C9C] bg-[#0F4C9C]/5 ring-1 ring-[#0F4C9C]'
                            : 'border-slate-100 hover:border-slate-200 text-slate-600'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          answers[currentQ.id] === opt ? 'border-[#0F4C9C] bg-[#0F4C9C]' : 'border-slate-300'
                        }`}>
                          {answers[currentQ.id] === opt && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <input
                          type="radio"
                          name={currentQ.id}
                          checked={answers[currentQ.id] === opt}
                          onChange={() => handleSelectAnswer(currentQ.id, opt)}
                          className="hidden"
                        />
                        <span className="text-sm font-bold">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {currentQ.question_type === 'true_false' && (
                  <div className="grid grid-cols-2 gap-4">
                    {['Verdadeiro', 'Falso'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSelectAnswer(currentQ.id, opt)}
                        className={`py-6 px-4 rounded-2xl border-2 text-sm font-black transition-all ${
                          answers[currentQ.id] === opt
                            ? 'border-[#0F4C9C] bg-[#0F4C9C]/5 text-[#0F4C9C] ring-1 ring-[#0F4C9C]'
                            : 'border-slate-100 text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-6 border-t border-slate-100">
                <button
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                  className="btn-secondary text-xs flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Anterior
                </button>

                {currentQuestionIndex < exam.questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    className="btn-primary text-xs flex items-center gap-2"
                  >
                    Seguinte <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (window.confirm('Tem certeza que deseja finalizar e enviar o seu exame?')) {
                        handleSubmitExam();
                      }
                    }}
                    className="px-6 py-2.5 bg-emerald-600 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-sm hover:bg-emerald-700 transition-all active:scale-95"
                  >
                    Finalizar Exame
                  </button>
                )}
              </div>
            </div>
          )}

          {currentStep === 'result' && attemptResult && (
            <div className="text-center space-y-6 py-4">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
                attemptResult.passed ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
              }`}>
                {attemptResult.passed ? <CheckCircle2 className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
              </div>

              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  {attemptResult.passed ? 'Parabéns, Exame Aprovado!' : 'Exame Não Aprovado'}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Obteve <strong>{attemptResult.percentage}%</strong> ({attemptResult.score} de {attemptResult.total_points} pontos).
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <p>Tempo utilizado: {Math.round(attemptResult.time_spent_seconds / 60)} minutos</p>
                <p>Nota mínima exigida: {exam.passing_score}%</p>
              </div>

              <button
                onClick={() => {
                  onClose();
                  setCurrentStep('instructions');
                }}
                className="w-full bg-[#0F4C9C] text-white font-semibold py-3 rounded-xl text-sm transition shadow"
              >
                Concluir e Voltar ao Painel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
