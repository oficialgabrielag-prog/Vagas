import React, { useState } from 'react';
import { Building2, MapPin, Globe, Phone, Briefcase, ChevronRight, MessageCircle, Search } from 'lucide-react';
import { UserProfile, Job, CUNENE_MUNICIPALITIES } from '../lib/types';

interface CompaniesPageProps {
  jobs: Job[];
  companies: UserProfile[];
  onSelectCompany: (company: UserProfile) => void;
}

export const CompaniesPage: React.FC<CompaniesPageProps> = ({ jobs, companies, onSelectCompany }) => {
  const [selectedMunicipality, setSelectedMunicipality] = useState('Todos');

  const filteredCompanies = companies.filter(emp => {
    return selectedMunicipality === 'Todos' || (emp.municipality && emp.municipality.toLowerCase().includes(selectedMunicipality.toLowerCase()));
  });

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6 pb-20">
      {/* Page Header */}
      <div className="bg-[#0F4C9C] text-white p-6 rounded-3xl shadow-sm space-y-2">
        <span className="text-xs uppercase tracking-widest font-bold text-[#FFC20E]">
          Tecido Empresarial & Empregadores
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold">Empresas no Cunene</h1>
        <p className="text-slate-200 text-xs sm:text-sm font-light">
          Conheça as empresas, lojas e organizações cadastradas na província do Cunene.
        </p>
      </div>

      {/* Search Bar & Municipality filter pills */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedMunicipality('Todos')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
              selectedMunicipality === 'Todos'
                ? 'bg-[#0F4C9C] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            Todo o Cunene ({companies.length})
          </button>
          {CUNENE_MUNICIPALITIES.map(m => {
            const count = companies.filter(c => c.municipality && c.municipality.toLowerCase().includes(m.toLowerCase())).length;
            return (
              <button
                key={m}
                onClick={() => setSelectedMunicipality(m)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                  selectedMunicipality === m
                    ? 'bg-[#0F4C9C] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                📍 {m} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>
      </div>

      {filteredCompanies.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-2">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Nenhuma empresa encontrada</h3>
          <p className="text-xs text-slate-500">
            As empresas que criarem perfil na plataforma aparecerão nesta listagem.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredCompanies.map(emp => {
            const companyJobs = jobs.filter(j => j.employer_id === emp.id || j.company_name === emp.company_name);
            const displayLogo = emp.company?.logo_url || emp.company_logo || emp.avatar_url;
            return (
              <div
                key={emp.id}
                onClick={() => onSelectCompany(emp)}
                className="p-5 hover:bg-slate-50/80 transition cursor-pointer flex flex-col justify-between space-y-4 group border-b border-slate-100 last:border-b-0"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                      {displayLogo ? (
                        <img src={displayLogo} alt={emp.company_name || emp.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#0F4C9C] text-white flex items-center justify-center font-bold text-base">
                          {(emp.company_name || emp.full_name)?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0F4C9C] transition">
                        {emp.company_name || emp.full_name}
                      </h3>
                      <span className="text-[10px] text-slate-500 font-semibold block">{emp.industry || 'Empresa'}</span>
                    </div>
                  </div>

                  {emp.bio && (
                    <p className="text-slate-600 text-xs leading-relaxed line-clamp-2">{emp.bio}</p>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-[#0F4C9C]" />
                    <span>{emp.municipality || 'Ondjiva'}, Cunene</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-[#0F4C9C]" /> {companyJobs.length} Vagas
                  </span>
                  <span className="font-bold text-[#0F4C9C] flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
                    Ver vitrine <ChevronRight className="w-3.5 h-3.5" />
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
