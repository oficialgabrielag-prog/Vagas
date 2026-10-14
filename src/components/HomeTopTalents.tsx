import React from 'react';
import { Award, Star, TrendingUp, Sparkles, ChevronRight } from 'lucide-react';
import { ExamAttempt } from '../lib/types';

interface HomeTopTalentsProps {
  attempts: ExamAttempt[];
  onSelectRanking: () => void;
}

export const HomeTopTalents: React.FC<HomeTopTalentsProps> = ({ attempts, onSelectRanking }) => {
  const rankingData = React.useMemo(() => {
    const candidateScores: Record<string, { total: number; count: number; name: string }> = {};

    // Filtrar apenas exames reais de vagas (excluindo testes simulados livres)
    const realAttempts = (attempts || []).filter(a => !a.is_simulated && !a.exam_id?.startsWith('free-') && a.job_id !== 'practice-general');

    realAttempts.forEach(a => {
      if (!a.candidate_id) return;
      if (!candidateScores[a.candidate_id]) {
        candidateScores[a.candidate_id] = { total: 0, count: 0, name: a.candidate_name || 'Candidato' };
      }
      candidateScores[a.candidate_id].total += a.percentage;
      candidateScores[a.candidate_id].count += 1;
    });

    return Object.entries(candidateScores)
      .map(([id, stats]) => ({
        id,
        name: stats.name,
        avg: Math.round(stats.total / stats.count),
        count: stats.count
      }))
      .sort((a, b) => b.avg - a.avg || b.count - a.count)
      .slice(0, 3);
  }, [attempts]);

  if (rankingData.length === 0) return null;

  return (
    <section className="max-w-4xl mx-auto px-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">Talentos de Mérito no Cunene</h2>
        </div>
        <button 
          onClick={onSelectRanking}
          className="text-xs font-bold text-[#0F4C9C] hover:underline flex items-center gap-1"
        >
          Ver ranking completo <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {rankingData.map((talent, idx) => (
          <div key={talent.id} className="p-5 rounded-[2rem] hover:bg-slate-50 transition-all relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-10 h-10 flex items-center justify-center font-black text-xs ${
              idx === 0 ? 'bg-amber-100 text-amber-600' : 
              idx === 1 ? 'bg-slate-100 text-slate-500' : 
              'bg-orange-50 text-orange-600'
            } rounded-bl-2xl`}>
              #{idx + 1}
            </div>
            
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0F4C9C] to-blue-800 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-blue-200 group-hover:scale-110 transition duration-300">
                {talent.name.charAt(0)}
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 line-clamp-1">{talent.name}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Top Performer</p>
                <div className="inline-flex items-center gap-1.5 bg-blue-50 text-[#0F4C9C] font-black px-3 py-1 rounded-full text-xs border border-blue-100 mt-2">
                  <Star className="w-3 h-3 fill-current" />
                  {talent.avg}% de Média
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
