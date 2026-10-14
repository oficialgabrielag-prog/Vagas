import React, { useState } from 'react';
import { X, MapPin, Briefcase, DollarSign, Calendar, CheckCircle2, Send, Building, FileText, Award, Upload, Check } from 'lucide-react';
import { Job, UserProfile, Exam } from '../lib/types';
import { StoreService } from '../lib/store';
import { uploadDocumentToCloudinary } from '../lib/cloudinary';

interface JobDetailModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onSuccessApply: () => void;
  onOpenExam: (exam: Exam, applicationId: string, job?: Job) => void;
  onSelectCompany?: (company: UserProfile) => void;
  companies?: UserProfile[];
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  job,
  isOpen,
  onClose,
  currentUser,
  onOpenAuth,
  onSuccessApply,
  onOpenExam,
  onSelectCompany,
  companies = []
}) => {
  const [coverLetter, setCoverLetter] = useState('');
  const [cvUrl, setCvUrl] = useState(currentUser?.cv_url || '');
  const [uploadingCv, setUploadingCv] = useState(false);
  const [parsingCv, setParsingCv] = useState(false);
  const [cvParsedNotice, setCvParsedNotice] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState<{ profession?: boolean; municipality?: boolean; summary?: boolean }>({});
  const [cvFileName, setCvFileName] = useState('');
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState('');

  // Editable candidate snapshot fields before applying
  const [profession, setProfession] = useState(currentUser?.profession || '');
  const [municipality, setMunicipality] = useState(currentUser?.municipality || 'Ondjiva');
  const [summary, setSummary] = useState(currentUser?.bio || '');

  if (!isOpen || !job || !currentUser) return null;

  const applications = StoreService.getApplications();
  const existingApp = applications.find(a => a.job_id === job.id && a.candidate_id === currentUser.id);

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side format pre-validation
    const name = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
    const isDoc = file.type === 'application/msword' || name.endsWith('.doc');
    const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx');

    if (!isPdf && !isDoc && !isDocx) {
      setError('Formato de documento inválido. Por favor utilize ficheiros nos formatos PDF, DOC ou DOCX.');
      return;
    }

    setUploadingCv(true);
    setError('');
    setCvParsedNotice(false);

    try {
      const url = await uploadDocumentToCloudinary(file);
      if (url.startsWith('blob:') || url.startsWith('data:')) {
        throw new Error('Não foi possível carregar o documento. Tente novamente.');
      }
      setCvUrl(url);
      setCvFileName(file.name);

      // Automatic CV text extraction and Gemini AI profile parsing
      setParsingCv(true);
      const fileText = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const res = ev.target?.result;
          resolve(typeof res === 'string' ? res : file.name);
        };
        reader.onerror = () => resolve(file.name);
        reader.readAsText(file);
      });

      const response = await fetch('/api/parse-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fileText || file.name })
      });

      if (response.ok) {
        const data = await response.json();
        const filled: any = {};
        if (data.profession) {
          setProfession(data.profession);
          filled.profession = true;
        }
        if (data.municipality) {
          setMunicipality(data.municipality);
          filled.municipality = true;
        }
        if (data.summary) {
          setSummary(data.summary);
          filled.summary = true;
        }
        setAutoFilledFields(filled);
        setCvParsedNotice(true);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar currículo.');
    } finally {
      setUploadingCv(false);
      setParsingCv(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (currentUser.role !== 'candidate') {
      setError('Apenas contas de candidatos podem candidatar-se a vagas.');
      return;
    }

    if (uploadingCv) {
      setError('Por favor aguarde a conclusão do envio do currículo.');
      return;
    }

    try {
      // 1. Update candidate profile first with latest edited details
      const updatedProfile = StoreService.updateCandidateProfile(currentUser.id, {
        profession,
        municipality,
        bio: summary,
        cv_url: cvUrl || currentUser.cv_url
      });

      // 2. Apply with snapshot data and await real Supabase persistence confirmation
      await StoreService.applyToJob(job.id, updatedProfile, coverLetter, cvUrl || currentUser.cv_url);
      setApplied(true);
      setTimeout(() => {
        onSuccessApply();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar candidatura.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-100 my-8">
        {/* Header Banner */}
        <div className="bg-[#0F4C9C] p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md shrink-0 text-[#0F4C9C] font-bold text-2xl overflow-hidden">
              {job.company_logo ? (
                <img src={job.company_logo} alt={job.company_name} className="w-full h-full object-cover" />
              ) : (
                job.company_name.charAt(0)
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-[#FFC20E] text-slate-900 font-semibold text-xs px-2.5 py-1 rounded-full">
                  {job.category}
                </span>
                {job.has_exam && (
                  <span className="bg-emerald-500 text-white font-semibold text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" /> Inclui Exame Técnico
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold">{job.title}</h2>
              <p 
                onClick={() => {
                  if (onSelectCompany) {
                    const comp = companies.find(c => c.id === job.employer_id || c.company_name === job.company_name) || {
                      id: job.employer_id || 'comp',
                      company_name: job.company_name,
                      full_name: job.company_name,
                      role: 'employer',
                      municipality: job.municipality || 'Ondjiva'
                    };
                    onClose();
                    onSelectCompany(comp as any);
                  }
                }}
                className={`text-slate-200 text-sm font-medium flex items-center gap-1 mt-1 transition ${onSelectCompany ? 'hover:text-white hover:underline cursor-pointer' : ''}`}
                title="Ver perfil da empresa"
              >
                <Building className="w-4 h-4 text-[#FFC20E]" /> {job.company_name}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Info bar */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#0F4C9C]" />
            <span>{job.municipality}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-[#0F4C9C]" />
            <span>{job.contract_type}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-[#0F4C9C]" />
            <span>{job.salary_min && job.salary_max ? `${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()} ${job.salary_currency}` : 'A combinar'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#0F4C9C]" />
            <span>{new Date(job.created_at).toLocaleDateString('pt-AO')}</span>
          </div>
        </div>

        {/* Detailed Body */}
        <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-semibold">
              {error}
            </div>
          )}

          {existingApp ? (
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-[#0F4C9C] mx-auto" />
              <h3 className="text-lg font-bold text-slate-900">Candidatura Submetida</h3>
              <p className="text-sm text-slate-600">Estado atual: <strong className="text-[#0F4C9C]">{existingApp.status}</strong></p>
              
              {existingApp.exam_score !== undefined && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 inline-block text-left">
                  <span className="text-xs text-slate-400 block font-bold">Resultado do Exame Técnico</span>
                  <span className="text-base font-black text-[#0F4C9C]">{existingApp.exam_score}% ({existingApp.exam_passed ? 'Aprovado' : 'Não Aprovado'})</span>
                </div>
              )}

              {job.has_exam && job.exam && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenExam(job.exam!, existingApp.id, job);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition shadow flex items-center justify-center gap-2 mx-auto"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{existingApp.exam_score !== undefined ? 'Rever / Refazer Exame Técnico' : 'Realizar Exame Técnico da Vaga'}</span>
                  </button>
                </div>
              )}
            </div>
          ) : applied ? (
            <div className="bg-emerald-50 text-emerald-700 p-6 rounded-2xl text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-lg font-bold">Candidatura Enviada com Sucesso!</h3>
              <p className="text-sm">Os seus dados atualizados e currículo foram registados.</p>
              {job.has_exam && job.exam && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenExam(job.exam!, 'pending-app', job);
                  }}
                  className="bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-semibold px-6 py-3 rounded-xl text-sm transition shadow flex items-center justify-center gap-2 mx-auto"
                >
                  <Award className="w-4 h-4" />
                  Realizar Exame Técnico
                </button>
              )}
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Descrição da Vaga</h3>
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{job.description}</p>
              </div>

              {job.requirements && job.requirements.length > 0 && (
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">Requisitos e Perfil</h3>
                  <ul className="space-y-2">
                    {job.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-[#0F4C9C] shrink-0 mt-0.5" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Apply Form with Profile Verification & Real CV Upload */}
              <div className="border-t border-slate-200 pt-6 mt-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">Atualizar Dados & Candidatar-se</h3>
                <p className="text-xs text-slate-500">Confirme ou atualize as suas informações antes de submeter a candidatura.</p>

                {parsingCv && (
                  <div className="bg-blue-50 text-blue-800 p-3.5 rounded-2xl border border-blue-200 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>A analisar o currículo com Inteligência Artificial para preenchimento automático...</span>
                  </div>
                )}

                {cvParsedNotice && (
                  <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-2xl border border-emerald-200 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Currículo analisado. Revê os teus dados profissionais antes de continuar.</span>
                  </div>
                )}

                <form onSubmit={handleApply} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Profissão / Cargo Pretendido</span>
                        {autoFilledFields.profession && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-bold">✨ Extraído</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={profession}
                        onChange={e => setProfession(e.target.value)}
                        placeholder="Ex: Contabilista Sénior"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Município</span>
                        {autoFilledFields.municipality && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-bold">✨ Extraído</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={municipality}
                        onChange={e => setMunicipality(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Resumo Profissional</span>
                      {autoFilledFields.summary && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-bold">✨ Extraído</span>
                      )}
                    </label>
                    <textarea
                      rows={2}
                      value={summary}
                      onChange={e => setSummary(e.target.value)}
                      placeholder="Breve resumo da sua experiência e competências..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  {/* Real CV Upload (PDF/DOC) */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#0F4C9C]" />
                      <span>Currículo (PDF, DOC ou DOCX) *</span>
                    </label>

                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs">
                        <Upload className="w-4 h-4 text-[#0F4C9C]" />
                        <span>{uploadingCv ? 'A enviar...' : 'Selecionar Arquivo'}</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleCvUpload}
                          className="hidden"
                        />
                      </label>

                      {cvFileName ? (
                        <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 truncate max-w-xs">
                          <Check className="w-3.5 h-3.5" /> {cvFileName}
                        </span>
                      ) : cvUrl ? (
                        <span className="text-xs text-blue-700 font-semibold truncate max-w-xs">
                          Currículo anexado ✓
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Nenhum arquivo selecionado</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Carta de Apresentação / Mensagem à Empresa
                    </label>
                    <textarea
                      rows={3}
                      value={coverLetter}
                      onChange={e => setCoverLetter(e.target.value)}
                      placeholder="Explique brevemente porque é o candidato ideal..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C9C]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={uploadingCv}
                    className="w-full bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-semibold py-3 rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submeter Candidatura com Snapshot</span>
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
