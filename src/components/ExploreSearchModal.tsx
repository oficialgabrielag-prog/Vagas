import React, { useState, useEffect, useRef } from 'react';
import { Search, Building2, Briefcase, ShoppingBag, Users, ChevronRight, TrendingUp, Sparkles } from 'lucide-react';
import { UserProfile, Job, MarketplaceProduct, CommunityPost } from '../lib/types';

interface ExploreSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: UserProfile[];
  allUsers: UserProfile[];
  jobs: Job[];
  products: MarketplaceProduct[];
  posts: CommunityPost[];
  onSelectCompany: (company: UserProfile) => void;
  onSelectJob: (job: Job) => void;
  onSelectProduct: (product: MarketplaceProduct) => void;
  onSelectPost: (post: CommunityPost) => void;
}

const TRENDING_SEARCHES = [
  'Vagas em Ondjiva',
  'Agronegócio Cunene',
  'Serviços de Construção',
  'Lojas de Roupa & Calçado',
  'Milho e Grãos a Granel',
  'Oportunidades em Ombadja',
  'Desenvolvimento Local'
];

export const ExploreSearchModal: React.FC<ExploreSearchModalProps> = ({
  isOpen,
  onClose,
  companies,
  allUsers,
  jobs,
  products,
  posts,
  onSelectCompany,
  onSelectJob,
  onSelectProduct,
  onSelectPost
}) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'companies' | 'users' | 'jobs' | 'products' | 'posts'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const filteredCompanies = companies.filter(c => {
    if (!q) return false;
    const name = (c.company_name || c.full_name || '').toLowerCase();
    const ind = (c.industry || '').toLowerCase();
    const mun = (c.municipality || '').toLowerCase();
    return (c.role === 'employer') && (name.includes(q) || ind.includes(q) || mun.includes(q));
  });

  const filteredUsers = allUsers.filter(u => {
    if (!q) return false;
    const name = (u.full_name || (u as any).name || '').toLowerCase();
    const profession = (u.profession || '').toLowerCase();
    const mun = (u.municipality || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const whatsapp = ((u as any).whatsapp || u.phone || '').toLowerCase();
    const role = (u.role || '').toLowerCase();
    return name.includes(q) || profession.includes(q) || mun.includes(q) || email.includes(q) || whatsapp.includes(q) || role.includes(q);
  });

  const filteredJobs = jobs.filter(j => {
    if (!q) return true;
    const title = (j.title || '').toLowerCase();
    const comp = (j.company_name || '').toLowerCase();
    const mun = (j.municipality || '').toLowerCase();
    const cat = (j.category || '').toLowerCase();
    return title.includes(q) || comp.includes(q) || mun.includes(q) || cat.includes(q);
  });

  const filteredProducts = products.filter(p => {
    if (!q) return true;
    const title = (p.title || '').toLowerCase();
    const desc = (p.description || '').toLowerCase();
    const cat = (p.category || '').toLowerCase();
    const mun = (p.municipality || '').toLowerCase();
    return title.includes(q) || desc.includes(q) || cat.includes(q) || mun.includes(q);
  });

  const filteredPosts = posts.filter(p => {
    if (!q) return true;
    const content = (p.content || '').toLowerCase();
    const author = (p.author_name || '').toLowerCase();
    const cat = (p.category || '').toLowerCase();
    return content.includes(q) || author.includes(q) || cat.includes(q);
  });

  const totalResults = filteredCompanies.length + filteredUsers.length + filteredJobs.length + filteredProducts.length + filteredPosts.length;

  return (
    <div className="fixed inset-0 z-50 bg-white text-slate-900 flex flex-col animate-fadeIn overflow-hidden">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 sm:px-6 flex items-center gap-3 shadow-2xs shrink-0 pt-safe">
        <button
          onClick={onClose}
          className="p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
          title="Voltar"
        >
          <span className="material-symbols-outlined text-lg">add_box</span>
        </button>

        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Pesquisar..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 rounded-full text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F4C9C]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-200 rounded-full w-5 h-5 flex items-center justify-center"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-b border-slate-100 px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
        {[
          { id: 'all', label: 'Tudo', count: totalResults },
          { id: 'companies', label: 'Empresas', count: filteredCompanies.length },
          { id: 'users', label: 'Usuários', count: filteredUsers.length },
          { id: 'jobs', label: 'Vagas', count: filteredJobs.length },
          { id: 'products', label: 'Marketplace', count: filteredProducts.length },
          { id: 'posts', label: 'Comunidade', count: filteredPosts.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#0F4C9C] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-white">
        
        {/* Trending Searches */}
        {!query && (
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#0F4C9C]" /> Tendências
            </div>
            <div className="flex flex-wrap gap-2">
              {TRENDING_SEARCHES.map(term => (
                <button
                  key={term}
                  onClick={() => setQuery(term)}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium px-3.5 py-2 rounded-xl border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>{term}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results Sections */}
        <div className="space-y-6">
          
          {/* Companies Section */}
          {(activeTab === 'all' || activeTab === 'companies') && filteredCompanies.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#0F4C9C]" /> Empresas ({filteredCompanies.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredCompanies.map(comp => {
                  const logo = comp.company?.logo_url || comp.avatar_url;
                  return (
                    <div
                      key={comp.id}
                      onClick={() => {
                        onSelectCompany(comp);
                        onClose();
                      }}
                      className="bg-white hover:bg-slate-50 p-4 rounded-xl border border-slate-200 transition cursor-pointer flex items-center gap-3.5 group"
                    >
                      <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-slate-200">
                        {logo ? (
                          <img src={logo} alt={comp.company_name || comp.full_name} className="w-full h-full object-cover" />
                        ) : (
                          (comp.company_name || comp.full_name || 'E').charAt(0)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#0F4C9C] transition truncate">
                          {comp.company_name || comp.full_name}
                        </h4>
                        <p className="text-xs text-slate-500 truncate">
                          {comp.municipality || 'Ondjiva'} • {comp.industry || 'Empresa'}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0F4C9C] transition" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Users Section */}
          {(activeTab === 'all' || activeTab === 'users') && filteredUsers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#0F4C9C]" /> Usuários ({filteredUsers.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => {
                      onSelectCompany(user); // Reusing onSelectCompany as it navigates to profile
                      onClose();
                    }}
                    className="bg-white hover:bg-slate-50 p-4 rounded-xl border border-slate-200 transition cursor-pointer flex items-center gap-3.5 group"
                  >
                    <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-slate-200">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                      ) : (
                        (user.full_name || 'U').charAt(0)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#0F4C9C] transition truncate">
                        {user.full_name}
                      </h4>
                      <p className="text-xs text-slate-500 truncate">
                        {user.municipality || 'Cunene'} • {user.profession || 'Usuário'}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0F4C9C] transition" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Jobs Section */}
          {(activeTab === 'all' || activeTab === 'jobs') && filteredJobs.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-[#0F4C9C]" /> Vagas ({filteredJobs.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredJobs.map(job => (
                  <div
                    key={job.id}
                    onClick={() => {
                      onSelectJob(job);
                      onClose();
                    }}
                    className="bg-white hover:bg-slate-50 p-4 rounded-xl border border-slate-200 transition cursor-pointer space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#0F4C9C] transition line-clamp-1">{job.title}</h4>
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">Vaga</span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-1">{job.company_name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>{job.municipality || 'Cunene'}</span>
                      <span>·</span>
                      <span className="text-[#0F4C9C] font-bold">{job.salary_min ? `${job.salary_min.toLocaleString()} ${job.salary_currency || 'AOA'}` : 'A combinar'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Marketplace Section */}
          {(activeTab === 'all' || activeTab === 'products') && filteredProducts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-[#0F4C9C]" /> Marketplace ({filteredProducts.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredProducts.map(prod => (
                  <div
                    key={prod.id}
                    onClick={() => {
                      onSelectProduct(prod);
                      onClose();
                    }}
                    className="bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition cursor-pointer overflow-hidden group flex flex-col"
                  >
                    <div className="h-32 bg-slate-100 relative overflow-hidden">
                      {prod.image_url ? (
                        <img src={prod.image_url} alt={prod.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">Produto</div>
                      )}
                      <span className="absolute top-2 left-2 bg-slate-900/70 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        {prod.municipality}
                      </span>
                    </div>
                    <div className="p-3 space-y-1 flex-1 flex flex-col justify-between">
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-[#0F4C9C]">{prod.title}</h4>
                      <p className="text-xs font-extrabold text-[#0F4C9C]">{Number(prod.price || 0).toLocaleString()} {prod.currency || 'AOA'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Community Section */}
          {(activeTab === 'all' || activeTab === 'posts') && filteredPosts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#0F4C9C]" /> Comunidade ({filteredPosts.length})
              </h3>
              <div className="space-y-2">
                {filteredPosts.map(post => (
                  <div
                    key={post.id}
                    onClick={() => {
                      onSelectPost(post);
                      onClose();
                    }}
                    className="bg-white hover:bg-slate-50 p-4 rounded-xl border border-slate-200 transition cursor-pointer space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#0F4C9C] text-white flex items-center justify-center font-bold text-xs">
                        {(post.author_name || 'U').charAt(0)}
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">{post.author_name || 'Membro'}</h5>
                        <span className="text-[10px] text-slate-400">{post.category || 'Geral'}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">{post.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalResults === 0 && (
            <div className="py-20 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                <Search className="w-5 h-5 text-[#0F4C9C]" />
              </div>
              <p className="text-sm font-bold text-slate-800">Nenhum resultado para "{query}"</p>
              <p className="text-xs text-slate-500">Tente pesquisar por outros termos ou municípios do Cunene.</p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
