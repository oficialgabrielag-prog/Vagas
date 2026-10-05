import React, { useState } from 'react';
import { Briefcase, User, Bookmark, CheckCircle2, Trash2, Plus, Edit3, Clock, XCircle, Building2, FileText, Award, Bell } from 'lucide-react';
import { UserProfile, Job, JobApplication, ExamAttempt } from '../lib/types';
import { StoreService } from '../lib/store';

interface DashboardPageProps {
  currentUser: UserProfile;
  jobs: Job[];
  onOpenNewJob: () => void;
  onSelectJob: (job: Job) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currentUser,
  jobs,
  onOpenNewJob,
  onSelectJob
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'applications' | 'saved' | 'my-jobs' | 'candidates' | 'exams' | 'notifications' | 'settings'>('overview');
  const [applications, setApplications] = useState<JobApplication[]>(StoreService.getApplications());
  const [allJobs, setAllJobs] = useState<Job[]>(jobs);
  const [savedJobIds, setSavedJobIds] = useState<string[]>(StoreService.getSavedJobs(currentUser.id));
  const [attempts, setAttempts] = useState<ExamAttempt[]>(StoreService.getExamAttempts());
  const [notifications, setNotifications] = useState(StoreService.getNotifications(currentUser.id));

  // Profile editable state
  const [fullName, setFullName] = useState(currentUser.full_name);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [whatsapp, setWhatsapp] = useState(currentUser.whatsapp || '');
  const [municipality, setMunicipality] = useState(currentUser.municipality || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [companyName, setCompanyName] = useState(currentUser.company_name || '');
  const [industry, setIndustry] = useState(currentUser.industry || '');
  const [profileSuccess, setProfileSuccess] = useState('');

  const handleUpdateStatus = (appId: string, status: JobApplication['status']) => {
    StoreService.updateApplicationStatus(appId, status);
    setApplications(StoreService.getApplications());
  };

  const handleDeleteJob = (jobId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta vaga?')) {
      StoreService.deleteJob(jobId);
      setAllJobs(StoreService.getJobs());
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    StoreService.updateProfile(currentUser.id, {
      full_name: fullName,
      phone,
      whatsapp,
      municipality,
      bio,
      company_name: companyName,
      industry
    });
    setProfileSuccess('Perfil atualizado com sucesso!');
    setTimeout(() => setProfileSuccess(''), 3000);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const displayAvatar = currentUser.role === 'employer'
    ? (currentUser.company?.logo_url || currentUser.company_logo || currentUser.avatar_url)
    : currentUser.avatar_url;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Dashboard Header - Refined */}
      <div className="bg-[#0F4C9C] text-white p-8 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-white/10">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-white p-0.5 border-2 border-white shadow-md overflow-hidden shrink-0 flex items-center justify-center">
            {displayAvatar ? (
              <img src={displayAvatar} alt={currentUser.full_name} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <div className="w-full h-full bg-[#FFC20E] text-slate-900 rounded-xl flex items-center justify-center font-black text-2xl">
                {currentUser.full_name.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <div className="meta-text text-[#FFC20E] mb-1">
              <span>{currentUser.role === 'employer' ? 'Empresa' : 'Candidato'}</span>
              <span className="meta-separator bg-[#FFC20E]"></span>
              <span>Conta Verificada</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black">{currentUser.full_name}</h1>
            <p className="text-blue-100 text-sm mt-1 font-medium opacity-80">{currentUser.email} • {currentUser.municipality || 'Cunene'}</p>
          </div>
        </div>

        {currentUser.role === 'employer' && (
          <button
            onClick={onOpenNewJob}
            className="bg-[#FFC20E] hover:bg-white text-slate-900 font-black px-6 py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Publicar Vaga & Exame</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition whitespace-nowrap ${
            activeTab === 'overview' ? 'border-[#0F4C9C] text-[#0F4C9C]' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Resumo Geral
        </button>

        {currentUser.role === 'candidate' && (
          <>
            <button
              onClick={() => setActiveTab('applications')}
              className={`pb-3 border-b-2 transition whitespace-nowrap ${
                activeTab === 'applications' ? 'border-[#0F4C9C] text-[#0F4C9C]' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Minhas Candidaturas
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`pb-3 border-b-2 transition whitespace-nowrap ${
                activeTab === 'saved' ? 'border-[#0F4C9C] text-[#0F4C9C]' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Vagas Guardadas ({savedJobIds.length})
            </button>
            <button
              onClick={() => setActiveTab('exams')}
              className={`pb-3 border-b-2 transition whitespace-nowrap ${
                activeTab === 'exams' ? 'border-[#0F4C9C] text-[#0F4C9C]' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Meus Exames ({attempts.filter(a => a.candidate_id === currentUser.id).length})
            </button>
          </>
        )}

        {currentUser.role === 'employer' && (
          <>
            <button
              onClick={() => setActiveTab('my-jobs')}
              className={`pb-3 border-b-2 transition whitespace-nowrap ${
                activeTab === 'my-jobs' ? 'border-[#0F4C9C] text-[#0F4C9C]' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Vagas Publicadas
            </button>
            <button
              onClick={() => setActiveTab('candidates')}
              className={`pb-3 border-b-2 transition whitespace-nowrap ${
                activeTab === 'candidates' ? 'border-[#0F4C9C] text-[#0F4C9C]' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Candidaturas Recebidas
            </button>
          </>
        )}

        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'notifications' ? 'border-[#0F4C9C] text-[#0F4C9C]' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Bell className="w-4 h-4" /> Notificações
          {unreadCount > 0 && <span className="bg-red-500 text-white px-1.5 py-0.2 rounded-full text-[10px]">{unreadCount}</span>}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 border-b-2 transition whitespace-nowrap ${
            activeTab === 'settings' ? 'border-[#0F4C9C] text-[#0F4C9C]' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Configurações & Perfil
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Tipo de Conta</span>
            <h3 className="text-xl font-bold text-[#0F4C9C]">
              {currentUser.role === 'employer' ? 'Empresa / Empregador' : 'Candidato Profissional'}
            </h3>
            <p className="text-slate-600 text-sm">
              {currentUser.role === 'employer'
                ? 'Pode publicar vagas, gerir exames técnicos e avaliar candidatos no Cunene.'
                : 'Pode candidatar-se a vagas, realizar exames e guardar favoritos.'}
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Localização</span>
            <h3 className="text-xl font-bold text-[#0F4C9C]">{currentUser.municipality || 'Cunene'}</h3>
            <p className="text-slate-600 text-sm">Província do Cunene, República de Angola.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Contacto</span>
            <h3 className="text-xl font-bold text-[#0F4C9C]">{currentUser.phone || currentUser.whatsapp || 'Não definido'}</h3>
            <p className="text-slate-600 text-sm">{currentUser.email}</p>
          </div>
        </div>
      )}

      {/* Candidate Applications */}
      {activeTab === 'applications' && currentUser.role === 'candidate' && (
        <div className="space-y-4">
          {applications.filter(app => app.candidate_id === currentUser.id).length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-lg font-bold text-slate-800">Nenhuma candidatura encontrada</h3>
              <p className="text-sm text-slate-500">Explore as vagas disponíveis e submeta a sua candidatura.</p>
            </div>
          ) : (
            applications
              .filter(app => app.candidate_id === currentUser.id)
              .map(app => {
                const job = allJobs.find(j => j.id === app.job_id);
                return (
                  <div key={app.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <span className="text-xs font-bold text-slate-400">{new Date(app.created_at).toLocaleDateString('pt-AO')}</span>
                      <h3 className="text-lg font-bold text-slate-900 mt-0.5">{job?.title || 'Vaga no Cunene'}</h3>
                      <p className="text-sm font-semibold text-slate-600">{job?.company_name}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#0F4C9C]">
                        {app.status}
                      </span>
                      {job && (
                        <button
                          onClick={() => onSelectJob(job)}
                          className="bg-slate-100 hover:bg-[#0F4C9C] hover:text-white text-slate-800 text-xs font-semibold px-4 py-2 rounded-xl transition"
                        >
                          Ver Vaga
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* Candidate Exam Attempts */}
      {activeTab === 'exams' && currentUser.role === 'candidate' && (
        <div className="space-y-4">
          {attempts.filter(a => a.candidate_id === currentUser.id).length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <Award className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-lg font-bold text-slate-800">Nenhum exame realizado ainda</h3>
              <p className="text-sm text-slate-500">Os exames técnicos realizados aparecerão aqui.</p>
            </div>
          ) : (
            attempts
              .filter(a => a.candidate_id === currentUser.id)
              .map(attempt => (
                <div key={attempt.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{attempt.exam?.title || 'Avaliação Técnica'}</h3>
                    <p className="text-xs text-slate-500 mt-1">{new Date(attempt.created_at).toLocaleDateString('pt-AO')}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      attempt.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {attempt.percentage}% ({attempt.passed ? 'Aprovado' : 'Não Aprovado'})
                    </span>
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Sem notificações no momento.</p>
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => {
                  StoreService.markNotificationAsRead(currentUser.id, notif.id);
                  setNotifications(StoreService.getNotifications(currentUser.id));
                  if (notif.link) {
                    if (notif.link === 'exams') setActiveTab('exams');
                    else if (notif.link === 'applications') setActiveTab('applications');
                    else if (notif.link === 'candidates') setActiveTab('candidates');
                    else if (notif.link === 'my-jobs') setActiveTab('my-jobs');
                  }
                }}
                className={`p-5 rounded-2xl border transition cursor-pointer hover:border-[#0F4C9C] flex justify-between items-center ${
                  notif.read ? 'bg-white border-slate-200' : 'bg-blue-50/50 border-blue-200 shadow-2xs'
                }`}
              >
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{notif.title}</h4>
                  <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
                  <span className="text-[10px] text-slate-400 mt-2 block">{new Date(notif.created_at).toLocaleString('pt-AO')}</span>
                </div>
                {!notif.read && <span className="w-2.5 h-2.5 rounded-full bg-[#0F4C9C]" />}
              </div>
            ))
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-2xl mx-auto space-y-6">
          <h3 className="text-xl font-bold text-slate-900">Configurações e Perfil</h3>
          {profileSuccess && (
            <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-sm">
              {profileSuccess}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            {currentUser.role === 'employer' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nome da Empresa</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Setor de Atividade</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp</label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Município no Cunene</label>
              <input
                type="text"
                value={municipality}
                onChange={e => setMunicipality(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Biografia / Resumo Profissional</label>
              <textarea
                rows={3}
                value={bio}
                onChange={e => setBio(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#0F4C9C] text-white font-semibold py-3 rounded-xl text-sm transition shadow"
            >
              Guardar Alterações
            </button>
          </form>
        </div>
      )}

      {/* Employer Posted Jobs */}
      {activeTab === 'my-jobs' && currentUser.role === 'employer' && (
        <div className="space-y-4">
          {allJobs.filter(j => j.employer_id === currentUser.id || j.company_name === currentUser.company_name).length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800">Nenhuma vaga publicada</h3>
            </div>
          ) : (
            allJobs
              .filter(j => j.employer_id === currentUser.id || j.company_name === currentUser.company_name)
              .map(job => (
                <div key={job.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{job.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{job.municipality} • {job.contract_type}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onSelectJob(job)}
                      className="bg-slate-100 hover:bg-[#0F4C9C] hover:text-white text-slate-800 text-xs font-semibold px-4 py-2 rounded-xl transition"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => handleDeleteJob(job.id)}
                      className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* Employer Candidates Applications */}
      {activeTab === 'candidates' && currentUser.role === 'employer' && (
        <div className="space-y-4">
          {(() => {
            const employerApps = applications.filter(app => {
              const job = allJobs.find(j => j.id === app.job_id);
              return job && (job.employer_id === currentUser.id || job.company_name === currentUser.company_name);
            });

            if (employerApps.length === 0) {
              return (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                  <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Nenhuma candidatura recebida para as suas vagas ainda.</p>
                </div>
              );
            }

            return employerApps.map(app => {
              const job = allJobs.find(j => j.id === app.job_id);
              // Find if there's an exam attempt for this candidate and this job's exam
              const attempt = job?.has_exam && job.exam ? attempts.find(a => a.candidate_id === app.candidate_id && a.exam_id === job.exam?.id) : null;

              return (
                <div key={app.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-[#0F4C9C] uppercase tracking-tighter">{job?.title || 'Vaga'}</span>
                      <h3 className="text-lg font-bold text-slate-900">{app.candidate?.full_name || 'Candidato'}</h3>
                      <p className="text-xs text-slate-500">{app.candidate?.email} • {app.candidate?.phone || 'Sem telefone'}</p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <select
                        value={app.status}
                        onChange={e => handleUpdateStatus(app.id, e.target.value as any)}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50 text-slate-700 focus:ring-2 focus:ring-[#0F4C9C]"
                      >
                        <option value="Enviada">Recebida</option>
                        <option value="Em análise">Em análise</option>
                        <option value="Selecionada para exame">Selecionada para exame</option>
                        <option value="Exame realizado">Exame realizado</option>
                        <option value="Aprovada">Aprovada</option>
                        <option value="Rejeitada">Rejeitada</option>
                        <option value="Contratada">Contratada</option>
                      </select>

                      {attempt && (
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                          attempt.passed ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          Exame: {attempt.percentage}% ({attempt.passed ? 'APROVADO' : 'NÃO APROVADO'})
                        </span>
                      )}
                    </div>
                  </div>

                  {app.cover_letter && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-600 italic">"{app.cover_letter}"</p>
                    </div>
                  )}

                  {app.cv_url && (
                    <a 
                      href={app.cv_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0F4C9C] hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5" /> Ver Currículo Anexado
                    </a>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
};
