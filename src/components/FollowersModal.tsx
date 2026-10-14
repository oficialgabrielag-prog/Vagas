import React from 'react';
import { X, Users, MapPin, MessageCircle, User, Building2, ExternalLink, Calendar } from 'lucide-react';
import { FollowerItem, UserProfile } from '../lib/types';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  followers: FollowerItem[];
  onSelectUser?: (userProfile: UserProfile) => void;
}

export const FollowersModal: React.FC<FollowersModalProps> = ({
  isOpen,
  onClose,
  title = 'Seguidores',
  followers = [],
  onSelectUser
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn select-none">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 flex flex-col max-h-[85vh] animate-scaleUp">
        {/* Header */}
        <div className="bg-[#0F4C9C] p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <Users className="w-5 h-5 text-[#FFC20E]" />
            </div>
            <div>
              <h3 className="text-base font-black leading-tight">{title}</h3>
              <p className="text-xs text-blue-100">{followers.length} pessoas e empresas a seguir</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Followers List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 divide-y divide-slate-100">
          {followers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Users className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Ainda não tem seguidores</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                À medida que publicar vagas, produtos e novidades, os candidatos e empresas começarão a seguir o seu perfil.
              </p>
            </div>
          ) : (
            followers.map(f => {
              const isEmployer = f.role === 'employer';
              const formattedDate = f.created_at ? new Date(f.created_at).toLocaleDateString('pt-AO') : 'Recente';

              return (
                <div key={f.id + f.created_at} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-black text-xs text-[#0F4C9C]">
                      {f.avatar_url ? (
                        <img src={f.avatar_url} alt={f.name} className="w-full h-full object-cover" />
                      ) : (
                        f.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">{f.name}</h4>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          isEmployer ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-[#0F4C9C]'
                        }`}>
                          {isEmployer ? 'Empresa' : 'Candidato'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        {f.municipality && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {f.municipality}
                          </span>
                        )}
                        <span>•</span>
                        <span>Seguiu a {formattedDate}</span>
                      </div>
                    </div>
                  </div>

                  {onSelectUser && (
                    <button
                      onClick={() => {
                        onClose();
                        onSelectUser({
                          id: f.id,
                          email: '',
                          full_name: f.name,
                          role: f.role,
                          avatar_url: f.avatar_url,
                          company_logo: f.avatar_url,
                          company_name: isEmployer ? f.name : undefined,
                          municipality: f.municipality || 'Ondjiva',
                          skills: [],
                          certificates: [],
                          experiences: [],
                          educations: [],
                          created_at: f.created_at
                        });
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-[#0F4C9C] hover:text-white text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
                    >
                      Ver Perfil
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
