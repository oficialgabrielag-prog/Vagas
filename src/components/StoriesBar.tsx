import React, { useState } from 'react';
import { StoryItem, StoryViewerModal } from './StoryViewerModal';
import { triggerHaptic } from '../lib/haptics';

interface StoriesBarProps {
  onNavigateTab: (tab: string) => void;
}

const DEFAULT_STORIES: StoryItem[] = [
  {
    id: 's-vagas',
    authorName: 'Cunene Vagas',
    authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    authorRole: 'Oficial',
    title: 'Novas Vagas de Emprego em Ondjiva',
    subtitle: 'Oportunidades em Saúde, Educação, Logística e Comércio com exames técnicos abertos.',
    imageUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800',
    tag: 'Vagas',
    actionText: 'Explorar Vagas Abertas',
    actionTab: 'jobs'
  },
  {
    id: 's-vdn',
    authorName: 'Confeitaria VDN',
    authorAvatar: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=150',
    authorRole: 'Empresa',
    title: 'Pães e Bolos Artesanais do Cunene',
    subtitle: 'Produção diária e encomendas especiais para festas e eventos com entrega local.',
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800',
    tag: 'Loja',
    actionText: 'Ver Produtos no Mercado',
    actionTab: 'marketplace'
  },
  {
    id: 's-talentos',
    authorName: 'Mérito Académico',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    authorRole: 'Candidato',
    title: 'Top Candidatos Certificados',
    subtitle: 'Conheça os profissionais com as maiores notas nos exames de qualificação do Cunene.',
    imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
    tag: 'Talentos',
    actionText: 'Ver Ranking de Mérito',
    actionTab: 'dashboard'
  },
  {
    id: 's-mercado',
    authorName: 'Móveis Cunene',
    authorAvatar: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=150',
    authorRole: 'Empresa',
    title: 'Mobiliário e Decoração Local',
    subtitle: 'Sofás, conjuntos de sala e mobiliário sob medida direto dos marceneiros locais.',
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800',
    tag: 'Mercado',
    actionText: 'Ir para o Marketplace',
    actionTab: 'marketplace'
  },
  {
    id: 's-comunidade',
    authorName: 'Rede Profissional',
    authorAvatar: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=150',
    authorRole: 'Oficial',
    title: 'Partilhe as suas Conquistas',
    subtitle: 'Publique formações, certificados e conecte-se com recrutadores na província.',
    imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800',
    tag: 'Comunidade',
    actionText: 'Aceder à Comunidade',
    actionTab: 'community'
  }
];

export const StoriesBar: React.FC<StoriesBarProps> = ({ onNavigateTab }) => {
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);

  const handleOpenStory = (index: number) => {
    triggerHaptic('light');
    setActiveStoryIndex(index);
  };

  return (
    <>
      <div className="w-full overflow-x-auto scrollbar-none py-1 px-1">
        <div className="flex items-center gap-3.5 sm:gap-5 min-w-max">
          {DEFAULT_STORIES.map((story, index) => (
            <button
              key={story.id}
              onClick={() => handleOpenStory(index)}
              className="flex flex-col items-center gap-1.5 focus:outline-none group active:scale-95 transition-transform"
            >
              {/* Ring Container with Native Gradient Border */}
              <div className="w-16 h-16 sm:w-18 sm:h-18 p-[2.5px] rounded-full bg-gradient-to-tr from-[#FFC20E] via-[#0F4C9C] to-sky-400 group-hover:scale-105 transition-all shadow-xs">
                <div className="w-full h-full p-[2px] bg-white rounded-full overflow-hidden">
                  <img
                    src={story.authorAvatar}
                    alt={story.authorName}
                    className="w-full h-full object-cover rounded-full"
                    loading="lazy"
                  />
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-700 group-hover:text-[#0F4C9C] transition-colors truncate max-w-[70px] sm:max-w-[76px] leading-tight">
                {story.authorName}
              </span>
            </button>
          ))}
        </div>
      </div>

      <StoryViewerModal
        stories={DEFAULT_STORIES}
        initialIndex={activeStoryIndex ?? 0}
        isOpen={activeStoryIndex !== null}
        onClose={() => setActiveStoryIndex(null)}
        onNavigateTab={onNavigateTab}
      />
    </>
  );
};
