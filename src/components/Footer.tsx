import React from 'react';
import { Briefcase, MapPin, Phone, Mail, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#0F4C9C] rounded-xl flex items-center justify-center text-white shadow-md">
                <Briefcase className="w-5 h-5 text-[#FFC20E]" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Cunene<span className="text-[#FFC20E]">Vagas</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              A principal plataforma profissional de emprego, recrutamento e marketplace local na província do Cunene, Angola. Conectando talentos a oportunidades.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Plataforma</h3>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#jobs" className="hover:text-[#FFC20E] transition">Vagas de Emprego</a></li>
              <li><a href="#marketplace" className="hover:text-[#FFC20E] transition">Marketplace Local</a></li>
              <li><a href="#community" className="hover:text-[#FFC20E] transition">Comunidade & Dicas</a></li>
              <li><a href="#companies" className="hover:text-[#FFC20E] transition">Diretório de Empresas</a></li>
            </ul>
          </div>

          {/* Municipalities in Cunene */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Municípios do Cunene</h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>Ondjiva (Cuanhama)</li>
              <li>Ombadja (Xangongo)</li>
              <li>Cahama</li>
              <li>Cuvelai</li>
              <li>Namacunde</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Contacto</h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#FFC20E] shrink-0" />
                <span>Ondjiva, Província do Cunene, Angola</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#FFC20E] shrink-0" />
                <span>+244 976 848 444</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#FFC20E] shrink-0" />
                <span>oficialgabrielag@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} CuneneVagas & Marketplace. Todos os direitos reservados.</p>
          <p className="flex items-center gap-1 mt-2 sm:mt-0">
            Feito com <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> para o desenvolvimento do Cunene, Angola.
          </p>
        </div>
      </div>
    </footer>
  );
};
