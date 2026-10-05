import React, { useState } from 'react';
import { X, Plus, Trash2, Briefcase, FileText } from 'lucide-react';
import { Job, UserProfile, CUNENE_MUNICIPALITIES, JOB_CATEGORIES, ExamQuestion, Exam } from '../lib/types';
import { StoreService } from '../lib/store';
import { uploadToCloudinary } from '../lib/cloudinary';

interface NewJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onJobCreated: () => void;
}

export const NewJobModal: React.FC<NewJobModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onJobCreated
}) => {
  const [title, setTitle] = useState('');
  const [municipality, setMunicipality] = useState(CUNENE_MUNICIPALITIES[0]);
  const [category, setCategory] = useState(JOB_CATEGORIES[0]);
  const [contractType, setContractType] = useState<Job['contract_type']>('Tempo Inteiro');
  const [experienceLevel, setExperienceLevel] = useState<Job['experience_level']>('Intermédio');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [description, setDescription] = useState('');
  const [requirementsText, setRequirementsText] = useState('');
  const [benefitsText, setBenefitsText] = useState('');
  const [companyLogo, setCompanyLogo] = useState(currentUser?.company?.logo_url || currentUser?.company_logo || '');
  const [whatsapp, setWhatsapp] = useState(currentUser?.whatsapp || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  
  // Exam configuration
  const [hasExam, setHasExam] = useState(false);
  const [examTitle, setExamTitle] = useState('Avaliação de Competências');
  const [examDescription, setExamDescription] = useState('Por favor, responda a todas as perguntas com atenção.');
  const [examTimeLimit, setExamTimeLimit] = useState('15');
  const [passingScore, setPassingScore] = useState('70');
  const [isExamRequired, setIsExamRequired] = useState(true);
  const [questions, setQuestions] = useState<Array<{
    id: string;
    question_text: string;
    question_type: 'multiple_choice' | 'true_false';
    options: string[];
    correct_answer: string;
    points: number;
  }>>([
    {
      id: 'q1',
      question_text: 'Qual é a sua experiência nesta área?',
      question_type: 'multiple_choice',
      options: ['Menos de 1 ano', '1 a 3 anos', 'Mais de 3 anos'],
      correct_answer: 'Mais de 3 anos',
      points: 10
    }
  ]);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !currentUser) return null;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setCompanyLogo(url);
    } catch {
      setError('Erro ao carregar logótipo.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: 'q-' + Date.now(),
        question_text: '',
        question_type: 'multiple_choice',
        options: ['Opção A', 'Opção B', 'Opção C'],
        correct_answer: 'Opção A',
        points: 10
      }
    ]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      setError('Por favor, preencha o título e a descrição da vaga.');
      return;
    }

    try {
      const requirements = requirementsText.split('\n').filter(Boolean);
      const benefits = benefitsText.split('\n').filter(Boolean);

      let examObj: Exam | undefined;
      if (hasExam && questions.length > 0) {
        const examId = 'exam-' + Date.now();
        const formattedQuestions: ExamQuestion[] = questions.map((q, idx) => ({
          id: q.id || 'q-' + idx + '-' + Date.now(),
          exam_id: examId,
          question_text: q.question_text || 'Pergunta ' + (idx + 1),
          question_type: q.question_type,
          options: q.options,
          correct_answer: btoa(encodeURIComponent(q.correct_answer)), // Obfuscated fallback
          points: q.points || 10,
          is_required: true
        }));

        examObj = {
          id: examId,
          job_id: 'pending',
          title: examTitle,
          description: examDescription,
          time_limit_minutes: Number(examTimeLimit) || 15,
          passing_score: Number(passingScore) || 70,
          max_attempts: 1,
          is_required: isExamRequired,
          questions: formattedQuestions,
          created_at: new Date().toISOString()
        };
      }

      StoreService.saveJob({
        employer_id: currentUser.id,
        title,
        company_name: currentUser.company_name || currentUser.full_name,
        company_logo: companyLogo,
        municipality,
        category,
        contract_type: contractType,
        experience_level: experienceLevel,
        salary_min: salaryMin ? Number(salaryMin) : undefined,
        salary_max: salaryMax ? Number(salaryMax) : undefined,
        salary_currency: 'AOA',
        description,
        requirements,
        benefits,
        vacancies_count: 1,
        whatsapp,
        email,
        status: 'active',
        has_exam: hasExam,
        exam: examObj,
        employer: currentUser
      });

      onJobCreated();
      onClose();
    } catch {
      setError('Erro ao criar vaga. Tente novamente.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-100 my-8">
        <div className="bg-[#0F4C9C] p-6 sm:p-8 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-6 h-6" />
          </button>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Publicar nova vaga</h2>
          <p className="text-sm text-blue-100 mt-2 max-w-lg leading-relaxed">Configurar detalhes da oportunidade e exames de avaliação técnica para os candidatos.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-2">1. Dados da Vaga</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Título da Vaga *</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Engenheiro Agrónomo Sénior"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C9C]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Município no Cunene *</label>
                <select
                  value={municipality}
                  onChange={e => setMunicipality(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none"
                >
                  {CUNENE_MUNICIPALITIES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria *</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none"
                >
                  {JOB_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Contrato *</label>
                <select
                  value={contractType}
                  onChange={e => setContractType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none"
                >
                  <option value="Tempo Inteiro">Tempo Inteiro</option>
                  <option value="Meio Tempo">Meio Tempo</option>
                  <option value="Contrato">Contrato</option>
                  <option value="Estágio">Estágio</option>
                  <option value="Freelance">Freelance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nível de Experiência *</label>
                <select
                  value={experienceLevel}
                  onChange={e => setExperienceLevel(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none"
                >
                  <option value="Júnior">Júnior</option>
                  <option value="Intermédio">Intermédio</option>
                  <option value="Sénior">Sénior</option>
                  <option value="Especialista">Especialista</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Salário Mínimo (AOA)</label>
                <input
                  type="number"
                  value={salaryMin}
                  onChange={e => setSalaryMin(e.target.value)}
                  placeholder="Ex: 200000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Salário Máximo (AOA)</label>
                <input
                  type="number"
                  value={salaryMax}
                  onChange={e => setSalaryMax(e.target.value)}
                  placeholder="Ex: 400000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição Completa *</label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Descreva as funções, responsabilidades e requisitos..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Exam Toggle Section */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">2. Exame / Teste Técnico Associado</h3>
                <p className="text-xs text-slate-500">Ative para exigir exame técnico aos candidatos selecionados.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasExam}
                  onChange={e => setHasExam(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0F4C9C]"></div>
              </label>
            </div>

            {hasExam && (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Título do Exame</label>
                    <input
                      type="text"
                      value={examTitle}
                      onChange={e => setExamTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tempo Limite (min)</label>
                    <input
                      type="number"
                      value={examTimeLimit}
                      onChange={e => setExamTimeLimit(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nota Mínima Aprovação (%)</label>
                    <input
                      type="number"
                      value={passingScore}
                      onChange={e => setPassingScore(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>
                  <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-300">
                    <span className="text-xs font-bold text-slate-700">Exame Obrigatório?</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isExamRequired}
                        onChange={e => setIsExamRequired(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0F4C9C]"></div>
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Instruções para o Candidato</label>
                  <textarea
                    rows={2}
                    value={examDescription}
                    onChange={e => setExamDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none"
                    placeholder="Ex: Leia atentamente cada questão antes de responder..."
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">Perguntas do Exame</span>
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="text-xs font-semibold text-[#0F4C9C] hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Pergunta
                    </button>
                  </div>

                  {questions.map((q, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-600">Pergunta {idx + 1}</span>
                        {questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setQuestions(questions.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={q.question_text}
                        onChange={e => {
                          const updated = [...questions];
                          updated[idx].question_text = e.target.value;
                          setQuestions(updated);
                        }}
                        placeholder="Texto da pergunta..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                      />

                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500">Opções (separadas por vírgula ou lista):</span>
                        <input
                          type="text"
                          value={q.options.join(', ')}
                          onChange={e => {
                            const updated = [...questions];
                            updated[idx].options = e.target.value.split(',').map(s => s.trim());
                            setQuestions(updated);
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                        />
                      </div>

                      <div>
                        <span className="text-[11px] font-semibold text-slate-500">Resposta Correta Exata:</span>
                        <input
                          type="text"
                          value={q.correct_answer}
                          onChange={e => {
                            const updated = [...questions];
                            updated[idx].correct_answer = e.target.value;
                            setQuestions(updated);
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-semibold py-3 rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2 mt-4"
          >
            <Plus className="w-4 h-4" />
            <span>Publicar Vaga e Exame Oficial</span>
          </button>
        </form>
      </div>
    </div>
  );
};
