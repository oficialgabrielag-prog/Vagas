import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  ChevronLeft, 
  ChevronRight, 
  Monitor, 
  Heart,
  Building2,
  Clock
} from 'lucide-react';
import { UserProfile, MarketplaceProduct } from '../lib/types';

interface FooterProps {
  products?: MarketplaceProduct[];
  companies?: UserProfile[];
  onSelectCompany?: (company: UserProfile) => void;
  onSelectProduct?: (product: MarketplaceProduct) => void;
  onOpenNewProduct?: () => void;
  isPCMode?: boolean;
  onTogglePCMode?: () => void;
  setCurrentTab?: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  companies = [],
  onSelectCompany,
  isPCMode = false,
  onTogglePCMode,
  setCurrentTab
}) => {
  const [activeCompanyIndex, setActiveCompanyIndex] = useState(0);
  const [slideInterval, setSlideInterval] = useState<number>(5000); // 5 segundos padrão, ajustável para 3 segundos

  // Filtrar empresas reais que possuem nome
  const validCompanies = companies.filter(c => c && (c.company_name || c.full_name));

  const totalCompanies = validCompanies.length;

  const handlePrevCompany = () => {
    if (totalCompanies === 0) return;
    setActiveCompanyIndex(prev => (prev === 0 ? totalCompanies - 1 : prev - 1));
  };

  const handleNextCompany = () => {
    if (totalCompanies === 0) return;
    setActiveCompanyIndex(prev => (prev + 1) % totalCompanies);
  };

  // Alternância suave automática (a cada 5s por padrão, ajustável para 3s)
  useEffect(() => {
    if (totalCompanies <= 1) return;
    const timer = setInterval(() => {
      setActiveCompanyIndex(prev => (prev + 1) % totalCompanies);
    }, slideInterval);
    return () => clearInterval(timer);
  }, [totalCompanies, slideInterval]);

  const handleNavClick = (tab: string) => {
    if (setCurrentTab) {
      setCurrentTab(tab);
    } else {
      window.dispatchEvent(new CustomEvent('navigate-tab', { detail: { tab } }));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Obter pequeno grupo de empresas visíveis no carrossel
  const visibleCompanies: UserProfile[] = [];
  if (totalCompanies > 0) {
    const countToShow = Math.min(3, totalCompanies);
    for (let i = 0; i < countToShow; i++) {
      const idx = (activeCompanyIndex + i) % totalCompanies;
      visibleCompanies.push(validCompanies[idx]);
    }
  }

  return (
    <footer className="mt-auto relative w-full bg-white">
      
      {/* =========================================================================
          1. SILHUETA SUPERIOR EM FORMA DE RAIO COM DETALHE DOURADO
          Reprodução fiel da silhueta da imagem de referência no topo do rodapé
         ========================================================================= */}
      <div className="relative w-full overflow-hidden leading-none select-none pointer-events-none -mb-px">
        <svg 
          viewBox="0 0 1200 48" 
          preserveAspectRatio="none" 
          className="w-full h-8 sm:h-12 block"
        >
          {/* Silhueta superior cortada em raio azul-marinho #123D73 */}
          <path 
            d="M0,48 L0,22 L380,22 L430,44 L465,8 L525,36 L580,0 L1200,0 L1200,48 Z" 
            fill="#123D73" 
          />
          {/* Linha geométrica de detalhe dourado #F5B91B que acompanha a silhueta em raio */}
          <path 
            d="M0,22 L380,22 L430,44 L465,8 L525,36 L580,0 L1200,0" 
            stroke="#F5B91B" 
            strokeWidth="3.5" 
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none" 
          />
        </svg>
      </div>

      {/* =========================================================================
          2. CORPO DO RODAPÉ AZUL-MARINHO (#123D73)
          - Logótipo CuneneVagas com detalhe dourado
          - Frase institucional curta
          - Faixa de empresas reais registadas com rotação suave de 5s / 3s
          - Links úteis existentes
          - Informação legal
         ========================================================================= */}
      <div className="bg-[#123D73] text-white pt-8 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center pb-10 border-b border-white/10">
            
            {/* Coluna Esquerda: Logótipo CuneneVagas + Frase Institucional */}
            <div className="lg:col-span-4 space-y-3">
              <div 
                className="flex items-center space-x-2.5 cursor-pointer inline-flex"
                onClick={() => handleNavClick('home')}
              >
                <div className="w-10 h-10 bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl flex items-center justify-center text-white shrink-0">
                  <Briefcase className="w-5 h-5 text-[#F5B91B]" />
                </div>
                <div className="text-2xl font-bold tracking-tight">
                  <span className="text-white">Cunene</span>
                  <span className="text-[#F5B91B]">Vagas</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed font-normal">
                Mais oportunidades. Mais empresas. <br className="hidden sm:inline" />
                Um só lugar, em Angola.
              </p>
            </div>

            {/* Coluna Central: Faixa de Empresas Reais Registadas */}
            <div className="lg:col-span-5 text-center lg:text-left space-y-3">
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <span className="text-xs font-bold tracking-wider text-slate-200 uppercase">
                  Empresas em destaque
                </span>
                
                {/* Ajuste suave de intervalo: 5s ou 3s */}
                <button
                  type="button"
                  onClick={() => setSlideInterval(prev => prev === 5000 ? 3000 : 5000)}
                  className="inline-flex items-center gap-1 text-[10px] text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 px-2 py-0.5 rounded transition cursor-pointer"
                  title="Alternar velocidade de rotação entre 5 segundos e 3 segundos"
                >
                  <Clock className="w-3 h-3 text-[#F5B91B]" />
                  <span>{slideInterval / 1000}s</span>
                </button>
              </div>

              {totalCompanies > 0 ? (
                <div className="flex items-center justify-center lg:justify-start gap-2.5">
                  <button
                    type="button"
                    onClick={handlePrevCompany}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
                    title="Empresa anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Grupo de Empresas Reais em Destaque */}
                  <div className="flex items-center gap-2.5 overflow-hidden py-1">
                    {visibleCompanies.map((comp) => {
                      const logo = comp.company_logo || comp.company?.logo_url || comp.avatar_url;
                      const name = comp.company_name || comp.full_name || 'Empresa';
                      return (
                        <div
                          key={comp.id}
                          onClick={() => onSelectCompany ? onSelectCompany(comp) : handleNavClick('companies')}
                          className="bg-white text-[#263449] rounded-xl px-3.5 py-2 h-11 flex items-center gap-2 transition-all duration-500 hover:scale-105 cursor-pointer shadow-xs shrink-0 max-w-[200px]"
                          title={`${name} · Clique para ver perfil`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                            {logo ? (
                              <img 
                                src={logo} 
                                alt={name} 
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <Building2 className="w-4 h-4 text-[#123D73]" />
                            )}
                          </div>
                          <span className="text-xs font-bold text-[#263449] truncate">
                            {name}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleNextCompany}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
                    title="Próxima empresa"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-300 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 inline-block">
                  Registe a sua empresa e junte-se à plataforma CuneneVagas.
                </div>
              )}
            </div>

            {/* Coluna Direita: Links Úteis */}
            <div className="lg:col-span-3 space-y-3 text-xs">
              <h4 className="font-bold text-white tracking-wide">Links úteis</h4>
              <ul className="space-y-1.5 text-slate-200/80">
                <li>
                  <button 
                    onClick={() => handleNavClick('jobs')} 
                    className="hover:text-[#F5B91B] transition cursor-pointer"
                  >
                    Vagas de Emprego
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleNavClick('marketplace')} 
                    className="hover:text-[#F5B91B] transition cursor-pointer"
                  >
                    Marketplace
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleNavClick('community')} 
                    className="hover:text-[#F5B91B] transition cursor-pointer"
                  >
                    Comunidade
                  </button>
                </li>
                <li>
                  <a 
                    href="mailto:oficialgabrielag@gmail.com" 
                    className="hover:text-[#F5B91B] transition"
                  >
                    Ajuda & Suporte
                  </a>
                </li>
                <li>
                  <a 
                    href="tel:+244976848444" 
                    className="hover:text-[#F5B91B] transition"
                  >
                    Contacto (+244 976 848 444)
                  </a>
                </li>
              </ul>
            </div>

          </div>

          {/* Informação Legal & Utilitários */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-300/80">
            <div className="flex flex-wrap items-center gap-3">
              <p>&copy; {new Date().getFullYear()} CuneneVagas. Todos os direitos reservados.</p>
              <span>·</span>
              <a 
                href="#termos" 
                onClick={(e) => { e.preventDefault(); alert('Termos de Uso e Política de Privacidade da CuneneVagas em conformidade com a legislação de Angola.'); }} 
                className="hover:text-white underline"
              >
                Termos de Uso
              </a>
              <span>·</span>
              <a 
                href="#privacidade" 
                onClick={(e) => { e.preventDefault(); alert('Política de Proteção de Dados e Privacidade da CuneneVagas.'); }} 
                className="hover:text-white underline"
              >
                Privacidade
              </a>
            </div>

            <div className="flex items-center gap-3">
              {onTogglePCMode && (
                <button
                  onClick={onTogglePCMode}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer border ${
                    isPCMode
                      ? 'bg-white/20 border-white/30 text-white'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                  title={isPCMode ? 'Desativar Modo PC' : 'Ativar Modo PC'}
                >
                  <Monitor className="w-3.5 h-3.5 text-[#F5B91B]" />
                  <span>Modo PC: {isPCMode ? 'Ativado' : 'Desativado'}</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
};
