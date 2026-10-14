import React, { useState, useMemo } from 'react';
import { X, Search, Briefcase, MapPin, Building2, ChevronRight, Award, DollarSign, Filter, Sparkles, Smartphone, Sprout, GraduationCap, CheckCircle } from 'lucide-react';
import { Job, UserProfile, CUNENE_MUNICIPALITIES } from '../lib/types';

interface JobCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string | null;
  jobs: Job[];
  companies?: UserProfile[];
  onSelectJob: (job: Job) => void;
  onSelectCompany?: (company: UserProfile) => void;
}

const CATEGORY_ITEMS = [
  { id: 'all', label: 'Todas as Categorias', icon: Briefcase },
  { id: 'Tecnologia', label: 'Tecnologia', icon: Smartphone },
  { id: 'Agricultura', label: 'Agricultura', icon: Sprout },
  { id: 'Saúde', label: 'Saúde', icon: Sparkles },
  { id: 'Educação', label: 'Educação', icon: GraduationCap },
];

export const JobCategoryModal: React.FC<JobCategoryModalProps> = ({
  isOpen,
  onClose,
  category,
  jobs = [],
  companies = [],
  onSelectJob,
  onSelectCompany
}) => {
  const [selectedCat, setSelectedCat] = useState<string>(category || 'all');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Keep internal category filter synced when the modal opens with a new category prop
  React.useEffect(() => {
    if (isOpen) {
      setSelectedCat(category || 'all');
      setSearchQuery('');
      setSelectedMunicipality('Todos');
    }
  }, [isOpen, category]);

  const filteredJobs = useMemo(() => {
    return (jobs || []).filter(job => {
      // Filter by category
      if (selectedCat && selectedCat !== 'all') {
        const jobCat = (job.category || '').toLowerCase();
        if (!jobCat.includes(selectedCat.toLowerCase())) {
          return false;
        }
      }

      // Filter by municipality
      if (selectedMunicipality !== 'Todos') {
        if (job.municipality !== selectedMunicipality) {
          return false;
        }
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = (job.title || '').toLowerCase().includes(query);
        const compMatch = (job.company_name || '').toLowerCase().includes(query);
        const munMatch = (job.municipality || '').toLowerCase().includes(query);
        const descMatch = (job.description || '').toLowerCase().includes(query);
        if (!titleMatch && !compMatch && !munMatch && !descMatch) {
          return false;
        }
      }

      return true;
    });
  }, [jobs, selectedCat, selectedMunicipality, searchQuery]);

  if (!isOpen) return null;

  const currentCategoryLabel = selectedCat !== 'all' 
    ? selectedCat 
    : (category ? category : 'Todas as Oportunidades');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0F4C9C]/10 border border-[#0F4C9C]/20 flex items-center justify-center text-[#0F4C9C] shadow-2xs">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                  {currentCategoryLabel}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0F4C9C] text-white tabular-nums">
                  {filteredJobs.length} {filteredJobs.length === 1 ? 'vaga' : 'vagas'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Vagas disponíveis e oportunidades de trabalho na província do Cunene
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Bar */}
        <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Pesquisar por cargo, empresa ou palavra-chave..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F4C9C]/20 focus:border-[#0F4C9C] transition"
              />
            </div>

            {/* Municipality Dropdown */}
            <div className="sm:w-48 relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedMunicipality}
                onChange={e => setSelectedMunicipality(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C9C]/20 focus:border-[#0F4C9C] appearance-none cursor-pointer"
              >
                <option value="Todos">Todos os Municípios</option>
                {CUNENE_MUNICIPALITIES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {CATEGORY_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = selectedCat === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedCat(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-[#0F4C9C] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Job List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Briefcase className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">Nenhuma vaga encontrada</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Não há ofertas que correspondam aos filtros selecionados. Tente limpar a busca ou mudar o município.
              </p>
              {(searchQuery || selectedMunicipality !== 'Todos' || selectedCat !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedMunicipality('Todos');
                    setSelectedCat('all');
                  }}
                  className="px-4 py-2 bg-white border border-slate-200 hover:border-[#0F4C9C] text-xs font-bold text-[#0F4C9C] rounded-xl shadow-2xs transition cursor-pointer"
                >
                  Limpar todos os filtros
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredJobs.map(job => {
                const compObj = companies.find(c => c.id === job.employer_id || c.company_name === job.company_name);
                const displayJobLogo = job.company_logo || compObj?.company?.logo_url || compObj?.company_logo || compObj?.avatar_url;

                return (
                  <div
                    key={job.id}
                    onClick={() => {
                      onClose();
                      onSelectJob(job);
                    }}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-[#0F4C9C] hover:shadow-md transition-all duration-150 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectCompany) {
                            const comp = compObj || {
                              id: job.employer_id || 'comp',
                              company_name: job.company_name,
                              full_name: job.company_name,
                              role: 'employer',
                              municipality: job.municipality || 'Ondjiva'
                            };
                            onClose();
                            onSelectCompany(comp as UserProfile);
                          }
                        }}
                        className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center p-1.5 hover:border-[#0F4C9C] hover:scale-105 transition-all cursor-pointer"
                      >
                        {displayJobLogo ? (
                          <img src={displayJobLogo} alt={job.company_name} className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="w-5 h-5 text-[#0F4C9C]" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1 text-xs text-slate-500 font-semibold truncate">
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectCompany) {
                                const comp = compObj || {
                                  id: job.employer_id || 'comp',
                                  company_name: job.company_name,
                                  full_name: job.company_name,
                                  role: 'employer',
                                  municipality: job.municipality || 'Ondjiva'
                                };
                                onClose();
                                onSelectCompany(comp as UserProfile);
                              }
                            }}
                            className="text-[#0F4C9C] hover:underline font-bold truncate cursor-pointer"
                          >
                            {job.company_name}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5 truncate text-slate-500">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {job.municipality}
                          </span>
                        </div>

                        <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#0F4C9C] transition-colors truncate">
                          {job.title}
                        </h4>

                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium text-[11px]">
                            {job.contract_type || 'Presencial'}
                          </span>
                          {job.category && (
                            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-medium text-[11px]">
                              {job.category}
                            </span>
                          )}
                          {job.has_exam && (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold text-[11px] flex items-center gap-1">
                              <Award className="w-3 h-3" />
                              Exame Técnico
                            </span>
                          )}
                          {job.vacancies_count && job.vacancies_count > 1 && (
                            <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                              {job.vacancies_count} vagas
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                      {job.salary_min ? (
                        <div className="text-right">
                          <span className="text-xs sm:text-sm font-extrabold text-slate-900 tabular-nums block">
                            {(Number(job.salary_min) || 0).toLocaleString()} {job.salary_currency || 'AOA'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">Salário base</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">A combinar</span>
                      )}

                      <button
                        type="button"
                        className="px-3.5 py-1.5 rounded-xl bg-[#0F4C9C] group-hover:bg-[#0c3c7c] text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                      >
                        <span>Ver Detalhes</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Total de {jobs.length} oportunidades publicadas</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition cursor-pointer shadow-2xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
