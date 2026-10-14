import React from 'react';
import { Building2, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../lib/types';
import { StoreService } from '../lib/store';

interface HomePartnersProps {
  companies?: UserProfile[];
  onSelectCompany?: (company: UserProfile) => void;
}

export const HomePartners: React.FC<HomePartnersProps> = ({ companies = [], onSelectCompany }) => {
  const allCompanies = companies.length > 0 ? companies : StoreService.getCompanies();
  const partners = StoreService.getPartners();
  const partnerUserIds = new Set(partners.map(p => p.user_id));

  return (
    <footer className="w-full bg-white text-slate-800 pt-12 pb-16 px-4 sm:px-6 mt-16 border-t border-slate-100">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Apoiando o Futuro do Cunene */}
        <div className="text-center space-y-1.5 max-w-lg mx-auto">
          <span className="text-[10px] uppercase tracking-widest font-bold text-[#0F4C9C]">
            Cunene
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
            Apoiando o Futuro
          </h2>
          <p className="text-xs text-slate-500 font-normal">
            Parceiros oficiais e empresas que impulsionam a economia local e o emprego.
          </p>
        </div>

        {/* Parceiros Oficiais */}
        {partners.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#0F4C9C]" /> Parceiros Oficiais
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {partners.map(partner => {
                const companyObj = allCompanies.find(c => c.id === partner.user_id || c.company?.id === partner.user_id);
                const displayName = partner.user_name || companyObj?.company_name || companyObj?.full_name || 'Parceiro';
                const displayAvatar = companyObj?.company?.logo_url || companyObj?.avatar_url;
                const mun = partner.municipality || companyObj?.municipality || 'Ondjiva';

                return (
                  <div
                    key={partner.id}
                    onClick={() => {
                      if (companyObj && onSelectCompany) {
                        onSelectCompany(companyObj);
                      }
                    }}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-50 transition cursor-pointer select-none group border border-slate-100"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#0F4C9C] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                      {displayAvatar ? (
                        <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        displayName.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#0F4C9C] transition truncate">
                          {displayName}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{partner.partner_title} • {mun}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tecido Empresarial Registado */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#0F4C9C]" /> Empresas ({allCompanies.length})
          </h3>
          {allCompanies.length === 0 ? (
            <p className="text-xs text-slate-400">Nenhuma empresa registada.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {allCompanies.map(comp => {
                const name = comp.company_name || comp.company?.name || comp.full_name || 'Empresa';
                const logo = comp.company?.logo_url || comp.avatar_url;
                const mun = comp.municipality || 'Ondjiva';

                return (
                  <div
                    key={comp.id}
                    onClick={() => {
                      if (onSelectCompany) onSelectCompany(comp);
                    }}
                    className="flex flex-col items-center text-center p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer group border border-slate-100/80"
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs mb-1.5 overflow-hidden shrink-0 group-hover:bg-[#0F4C9C] group-hover:text-white transition">
                      {logo ? (
                        <img src={logo} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        name.charAt(0)
                      )}
                    </div>
                    <h5 className="text-xs font-bold text-slate-800 group-hover:text-[#0F4C9C] transition truncate w-full">
                      {name}
                    </h5>
                    <span className="text-[10px] text-slate-400 truncate w-full">{mun}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Copyright */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <span className="font-bold text-slate-700">CuneneVagas</span>
          <p>© {new Date().getFullYear()} Governo Provincial & Empreendedores do Cunene.</p>
        </div>

      </div>
    </footer>
  );
};
