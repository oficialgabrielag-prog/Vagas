import React from 'react';
import { X, User, MapPin, Phone, MessageCircle, Mail, Award, FileText, Briefcase, GraduationCap } from 'lucide-react';
import { UserProfile, CandidateProfile } from '../lib/types';

interface CandidatePublicModalProps {
  candidate: UserProfile | CandidateProfile | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
}

export const CandidatePublicModal: React.FC<CandidatePublicModalProps> = ({
  candidate,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !candidate) return null;

  const candidateName = candidate.full_name || 'Candidato';
  const avatarUrl = candidate.avatar_url;
  const whatsappNumber = candidate.whatsapp || candidate.phone;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 my-auto max-h-[92vh] flex flex-col">
        {/* Banner Header */}
        <div className="bg-[#0F4C9C] p-6 text-white relative shrink-0 border-b border-white/10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 border-2 border-white/40 overflow-hidden flex items-center justify-center text-white shrink-0 shadow-md">
              {avatarUrl ? (
                <img src={avatarUrl} alt={candidateName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-9 h-9" />
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <span className="inline-block bg-[#FFC20E] text-slate-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                Perfil de Candidato
              </span>
              <h2 className="text-xl sm:text-2xl font-black truncate">{candidateName}</h2>
              <p className="text-xs text-slate-200 font-medium">
                {candidate.profession || 'Profissional em Busca de Oportunidades'}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-[#FFC20E]" />
                <span>{candidate.municipality || 'Cunene'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Bio Section */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resumo Profissional</h4>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {candidate.bio || 'Sem resumo cadastrado no momento.'}
            </p>
          </div>

          {/* Skills Section */}
          {candidate.skills && candidate.skills.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Habilidades</h4>
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill, idx) => (
                  <span key={idx} className="bg-[#0F4C9C]/10 text-[#0F4C9C] text-xs px-3 py-1.5 rounded-xl font-bold">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Certificates Section */}
          {candidate.certificates && candidate.certificates.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Certificados</h4>
              <div className="space-y-2">
                {candidate.certificates.map((cert, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <Award className="w-4 h-4 text-[#FFC20E] shrink-0" />
                    <span>{cert}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CV Link */}
          {candidate.cv_url && (
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-[#0F4C9C]" />
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Currículo Anexado</h5>
                  <p className="text-[10px] text-slate-500">Documento de apresentação do candidato</p>
                </div>
              </div>
              <a
                href={candidate.cv_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#0F4C9C] text-white text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-[#0c3c7d] transition"
              >
                Abrir CV
              </a>
            </div>
          )}
        </div>

        {/* Contact Footer */}
        {whatsappNumber && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0">
            <a
              href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Contactar Candidato via WhatsApp ({whatsappNumber})</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
