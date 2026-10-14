import React from 'react';
import { Users, Building2, Briefcase, Award } from 'lucide-react';
import { PlatformStats } from '../lib/types';

interface HomeTrustStatsProps {
  stats: PlatformStats | null;
}

export const HomeTrustStats: React.FC<HomeTrustStatsProps> = ({ stats }) => {
  const items = [
    {
      label: 'Candidatos',
      value: stats?.totalCandidates ? `+${stats.totalCandidates}` : '...',
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      label: 'Empresas',
      value: stats?.totalEmployers ? `+${stats.totalEmployers}` : '...',
      icon: Building2,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    },
    {
      label: 'Vagas Abertas',
      value: stats?.totalJobs ? `+${stats.totalJobs}` : '...',
      icon: Briefcase,
      color: 'text-[#0F4C9C]',
      bg: 'bg-[#0F4C9C]/5'
    },
    {
      label: 'Testes de Mérito',
      value: stats?.totalExams ? `+${stats.totalExams}` : '...',
      icon: Award,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 -mt-10 relative z-30">
      <div className="p-6 sm:p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {items.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center text-center space-y-2">
              <div className={`w-12 h-12 ${item.bg} rounded-2xl flex items-center justify-center ${item.color}`}>
                <item.icon className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-xl sm:text-2xl font-black text-slate-900 leading-none">
                  {item.value}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {item.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
