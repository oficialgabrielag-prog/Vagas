import React, { useState, useMemo } from 'react';
import { Search, MapPin, Briefcase, Filter, Calendar, Clock, DollarSign, ArrowRight, Bookmark, ChevronRight } from 'lucide-react';
import { Job, CUNENE_MUNICIPALITIES, JOB_CATEGORIES, UserProfile } from '../lib/types';
import { StoreService } from '../lib/store';
import { GiantCinematicCarousel } from '../components/GiantCinematicCarousel';

interface JobsPageProps {
  jobs: Job[];
  companies?: UserProfile[];
  currentUser: UserProfile | null;
  onSelectJob: (job: Job) => void;
  onSelectCompany?: (company: UserProfile) => void;
}

export const JobsPage: React.FC<JobsPageProps> = ({ jobs, companies = [], currentUser, onSelectJob, onSelectCompany }) => {
  const [selectedMunicipality, setSelectedMunicipality] = useState('Todos');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedContract, setSelectedContract] = useState('Todos');
  const [selectedExperience, setSelectedExperience] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  const [savedJobIds, setSavedJobIds] = useState<string[]>(
    currentUser ? StoreService.getSavedJobs(currentUser.id) : []
  );

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchMunicipality = selectedMunicipality === 'Todos' || (job.municipality && job.municipality.toLowerCase() === selectedMunicipality.toLowerCase());
      const matchCategory = selectedCategory === 'Todas' || (job.category && job.category.toLowerCase() === selectedCategory.toLowerCase());
      const matchContract = selectedContract === 'Todos' || (job.contract_type && job.contract_type.toLowerCase() === selectedContract.toLowerCase());
      const matchExperience = selectedExperience === 'Todos' || (job.experience_level && job.experience_level.toLowerCase() === selectedExperience.toLowerCase());
      const matchSearch = !searchTerm || 
        (job.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (job.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (job.description || '').toLowerCase().includes(searchTerm.toLowerCase());

      return matchMunicipality && matchCategory && matchContract && matchExperience && matchSearch;
    });
  }, [jobs, selectedMunicipality, selectedCategory, selectedContract, selectedExperience, searchTerm]);

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      
      {/* Carrossel Cinemático */}
      <GiantCinematicCarousel 
        jobs={jobs}
        products={[]}
        companies={companies}
        onSelectJob={onSelectJob}
        onSelectProduct={() => {}}
        onSelectCompany={comp => onSelectCompany && onSelectCompany(comp)}
        onNavigateTab={() => {}}
      />

      {/* 1. Cabeçalho Corporativo e Limpo */}
      <div className="pb-6 border-b border-slate-100 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest font-bold text-[#123D73] block mb-1">
            Oportunidades em Angola
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-[#263449] tracking-tight">
            Vagas de Emprego
          </h1>
          <p className="text-sm text-[#66758A] mt-1.5 max-w-xl">
            Explora vagas abertas, candidata-te diretamente e encontra a posição ideal para a tua carreira.
          </p>
        </div>

        <div className="text-xs text-[#66758A] font-semibold bg-[#F8FAFC] border border-slate-200/80 px-3.5 py-2 rounded-xl">
          Total de vagas disponíveis: <strong className="text-[#123D73] font-bold">{filteredJobs.length}</strong>
        </div>
      </div>

      {/* 2. Barra de Filtros Direta (Sem caixas ou cards pesados) */}
      <div className="bg-[#F8FAFC] border border-slate-200/80 p-4 sm:p-5 rounded-2xl space-y-4">
        
        {/* Barra de Busca rápida */}
        <div className="flex items-center gap-2.5 bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl">
          <Search className="w-4 h-4 text-[#66758A] shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por cargo, empresa ou palavra-chave..."
            className="w-full text-xs sm:text-sm text-[#263449] placeholder:text-[#66758A]/80 outline-none bg-transparent font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-[#66758A] hover:text-[#263449] font-bold px-1"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Seletores de Filtros Abertos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          
          <div>
            <label className="block text-[11px] font-bold text-[#66758A] uppercase tracking-wider mb-1">
              Município
            </label>
            <select
              value={selectedMunicipality}
              onChange={e => setSelectedMunicipality(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-[#263449] font-medium outline-none cursor-pointer"
            >
              <option value="Todos">Todos os Municípios</option>
              <option value="Luanda">Luanda</option>
              <option value="Lubango">Lubango</option>
              <option value="Huambo">Huambo</option>
              <option value="Benguela">Benguela</option>
              {CUNENE_MUNICIPALITIES.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#66758A] uppercase tracking-wider mb-1">
              Categoria
            </label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-[#263449] font-medium outline-none cursor-pointer"
            >
              <option value="Todas">Todas as Categorias</option>
              {JOB_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#66758A] uppercase tracking-wider mb-1">
              Regime de Trabalho
            </label>
            <select
              value={selectedContract}
              onChange={e => setSelectedContract(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-[#263449] font-medium outline-none cursor-pointer"
            >
              <option value="Todos">Todos os Regimes</option>
              <option value="Tempo Inteiro">Tempo Inteiro</option>
              <option value="Meio Tempo">Meio Tempo</option>
              <option value="Contrato">Contrato</option>
              <option value="Estágio">Estágio</option>
              <option value="Freelance">Freelance</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#66758A] uppercase tracking-wider mb-1">
              Experiência
            </label>
            <select
              value={selectedExperience}
              onChange={e => setSelectedExperience(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-[#263449] font-medium outline-none cursor-pointer"
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

      {/* 3. Lista Aberta de Vagas (Sem Cards Caixotes - Padrão Aberto e Limpo) */}
      {filteredJobs.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-[#263449]">Nenhuma vaga encontrada</h3>
          <p className="text-xs sm:text-sm text-[#66758A] max-w-md mx-auto">
            Não encontramos vagas com os filtros selecionados. Tente ajustar os termos de pesquisa ou municípios.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
          {filteredJobs.map(job => {
            const isSaved = savedJobIds.includes(job.id);
            return (
              <div
                key={job.id}
                onClick={() => onSelectJob(job)}
                className="py-4 sm:py-5 px-2 sm:px-4 hover:bg-[#F8FAFC] rounded-xl transition cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Esquerda: Identificação da Empresa + Cargo */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-sm text-[#123D73] shrink-0 overflow-hidden shadow-2xs">
                    {job.company_logo ? (
                      <img src={job.company_logo} alt={job.company_name} className="w-full h-full object-cover" />
                    ) : (
                      (job.company_name || 'E').charAt(0)
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-bold text-[#123D73] uppercase tracking-wide">
                        {job.category || 'Geral'}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-[11px] text-[#66758A] font-medium">
                        {job.contract_type || 'Tempo inteiro'}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-[#263449] group-hover:text-[#123D73] transition truncate">
                      {job.title}
                    </h3>

                    <p 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectCompany) {
                          const comp = companies.find(c => c.id === job.employer_id || c.company_name === job.company_name);
                          if (comp) {
                            onSelectCompany(comp);
                          } else {
                            onSelectCompany({
                              id: job.employer_id || 'comp',
                              company_name: job.company_name,
                              full_name: job.company_name,
                              role: 'employer'
                            } as any);
                          }
                        }
                      }}
                      className="text-xs text-[#66758A] hover:underline hover:text-[#123D73] transition cursor-pointer font-medium mt-0.5"
                    >
                      {job.company_name}
                    </p>
                  </div>
                </div>

                {/* Direita: Metadados em linha aberta + Ação */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-[#66758A] pl-16 md:pl-0">
                  <div className="flex items-center gap-1.5 min-w-[90px]">
                    <MapPin className="w-3.5 h-3.5 text-[#66758A]" />
                    <span>{job.municipality || 'Cunene'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 min-w-[90px]">
                    <Calendar className="w-3.5 h-3.5 text-[#66758A]" />
                    <span>{new Date(job.created_at).toLocaleDateString('pt-AO')}</span>
                  </div>

                  <div className="flex items-center gap-1.5 min-w-[100px] font-bold text-[#263449]">
                    <DollarSign className="w-3.5 h-3.5 text-[#123D73]" />
                    <span>
                      {job.salary_min && job.salary_max 
                        ? `${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()} ${job.salary_currency}`
                        : (job.salary_min ? `${job.salary_min.toLocaleString()} ${job.salary_currency}` : 'A definir')}
                    </span>
                  </div>

                  {/* Botão de Guardar Vaga */}
                  <button
                    onClick={e => handleToggleSave(e, job.id)}
                    className={`p-2 rounded-xl transition cursor-pointer ${
                      isSaved ? 'text-[#F5B91B] bg-amber-50' : 'text-slate-300 hover:text-[#F5B91B] hover:bg-slate-100'
                    }`}
                    title={isSaved ? 'Vaga guardada' : 'Guardar vaga'}
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#F5B91B]' : ''}`} />
                  </button>

                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#123D73] group-hover:translate-x-1 transition hidden md:block shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
