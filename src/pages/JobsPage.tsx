import React, { useState, useMemo } from 'react';
import { Search, MapPin, Briefcase, Filter, Calendar, DollarSign, ArrowRight, Bookmark } from 'lucide-react';
import { Job, CUNENE_MUNICIPALITIES, JOB_CATEGORIES, UserProfile } from '../lib/types';
import { StoreService } from '../lib/store';

interface JobsPageProps {
  jobs: Job[];
  currentUser: UserProfile | null;
  onSelectJob: (job: Job) => void;
}

export const JobsPage: React.FC<JobsPageProps> = ({ jobs, currentUser, onSelectJob }) => {
  const [keyword, setKeyword] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState('Todos');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedContract, setSelectedContract] = useState('Todos');
  const [selectedExperience, setSelectedExperience] = useState('Todos');

  const [savedJobIds, setSavedJobIds] = useState<string[]>(
    currentUser ? StoreService.getSavedJobs(currentUser.id) : []
  );

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchKeyword =
        !keyword ||
        job.title.toLowerCase().includes(keyword.toLowerCase()) ||
        job.company_name.toLowerCase().includes(keyword.toLowerCase()) ||
        job.description.toLowerCase().includes(keyword.toLowerCase());

      const matchMunicipality = selectedMunicipality === 'Todos' || job.municipality === selectedMunicipality;
      const matchCategory = selectedCategory === 'Todas' || job.category === selectedCategory;
      const matchContract = selectedContract === 'Todos' || job.contract_type === selectedContract;
      const matchExperience = selectedExperience === 'Todos' || job.experience_level === selectedExperience;

      return matchKeyword && matchMunicipality && matchCategory && matchContract && matchExperience;
    });
  }, [jobs, keyword, selectedMunicipality, selectedCategory, selectedContract, selectedExperience]);

  const handleToggleSave = (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    if (!currentUser) {
      alert('Por favor, faça login para guardar vagas.');
      return;
    }
    const updated = StoreService.toggleSaveJob(currentUser.id, jobId);
    setSavedJobIds(updated);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="bg-[#0F4C9C] text-white p-8 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-2">
          <span className="text-xs uppercase tracking-widest font-bold text-[#FFC20E]">
            Oportunidades Profissionais
          </span>
          <h1 className="text-3xl font-extrabold">Vagas de Emprego no Cunene</h1>
          <p className="text-slate-200 text-sm">
            Encontre a posição ideal para impulsionar a sua carreira na província do Cunene.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Keyword Search */}
          <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-300">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="Pesquisar por cargo, empresa ou palavra-chave..."
              className="w-full bg-transparent text-slate-800 text-sm focus:outline-none"
            />
          </div>

          {/* Municipality Filter */}
          <div className="md:w-64">
            <select
              value={selectedMunicipality}
              onChange={e => setSelectedMunicipality(e.target.value)}
              className="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-sm bg-slate-50 focus:outline-none"
            >
              <option value="Todos">Todos os Municípios</option>
              {CUNENE_MUNICIPALITIES.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Categoria</label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:outline-none"
            >
              <option value="Todas">Todas as Categorias</option>
              {JOB_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo de Contrato</label>
            <select
              value={selectedContract}
              onChange={e => setSelectedContract(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:outline-none"
            >
              <option value="Todos">Todos os Contratos</option>
              <option value="Tempo Inteiro">Tempo Inteiro</option>
              <option value="Meio Tempo">Meio Tempo</option>
              <option value="Contrato">Contrato</option>
              <option value="Estágio">Estágio</option>
              <option value="Freelance">Freelance</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Experiência</label>
            <select
              value={selectedExperience}
              onChange={e => setSelectedExperience(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:outline-none"
            >
              <option value="Todos">Todos os Níveis</option>
              <option value="Júnior">Júnior</option>
              <option value="Intermédio">Intermédio</option>
              <option value="Sénior">Sénior</option>
              <option value="Especialista">Especialista</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center text-sm text-slate-600 font-medium">
        <p>A mostrar <span className="font-bold text-[#0F4C9C]">{filteredJobs.length}</span> vagas encontradas</p>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-xl font-bold text-slate-800">Nenhuma vaga encontrada</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Não encontrámos vagas com os filtros selecionados. Tente pesquisar por outros termos ou municípios.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredJobs.map(job => {
            const isSaved = savedJobIds.includes(job.id);
            return (
              <div
                key={job.id}
                onClick={() => onSelectJob(job)}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition border border-slate-200 cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="meta-text">
                      <span className="text-[#0F4C9C]">{job.category}</span>
                      <span className="meta-separator"></span>
                      <span>{job.contract_type}</span>
                    </div>
                    <button
                      onClick={e => handleToggleSave(e, job.id)}
                      className={`p-2 rounded-xl transition-all ${
                        isSaved ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-amber-500 hover:bg-slate-50'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-amber-500' : ''}`} />
                    </button>
                  </div>

                  <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-[#0F4C9C] transition-colors mb-1">
                    {job.title}
                  </h3>
                  <p className="text-sm font-bold text-slate-500 mb-4">{job.company_name}</p>

                  <p className="text-slate-600 text-sm line-clamp-2 mb-6 leading-relaxed font-medium">
                    {job.description}
                  </p>

                  <div className="flex flex-wrap gap-4 text-[11px] font-black uppercase tracking-tight text-slate-400 mb-6">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#0F4C9C]" />
                      <span>{job.municipality}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-900">
                      <DollarSign className="w-3.5 h-3.5 text-[#0F4C9C]" />
                      <span>{job.salary_min && job.salary_max ? `${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()} ${job.salary_currency}` : 'Salário Negociável'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">{new Date(job.created_at).toLocaleDateString('pt-AO')}</span>
                  <span className="font-bold text-[#0F4C9C] group-hover:underline flex items-center gap-1">
                    Ver detalhes e candidatar <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
