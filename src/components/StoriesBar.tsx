import React, { useState, useMemo } from 'react';
import { StoryItem, StoryViewerModal } from './StoryViewerModal';
import { triggerHaptic } from '../lib/haptics';
import { Job, MarketplaceProduct, UserProfile, CommunityPost } from '../lib/types';

interface StoriesBarProps {
  onNavigateTab: (tab: string) => void;
  jobs?: Job[];
  products?: MarketplaceProduct[];
  companies?: UserProfile[];
  featuredCandidates?: UserProfile[];
  posts?: CommunityPost[];
}

export const StoriesBar: React.FC<StoriesBarProps> = ({
  onNavigateTab,
  jobs = [],
  products = [],
  companies = [],
  featuredCandidates = [],
  posts = []
}) => {
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});

  const stories: StoryItem[] = useMemo(() => {
    const list: StoryItem[] = [];

    // 1. Perfis reais de candidatos registados
    featuredCandidates
      .filter((c) => c && c.full_name && c.full_name.trim().length > 1)
      .slice(0, 3)
      .forEach((cand) => {
        list.push({
          id: `cand-${cand.id}`,
          authorName: cand.full_name,
          authorAvatar: cand.avatar_url || '',
          authorRole: 'Candidato',
          title: `${cand.full_name} — ${cand.profession || 'Talento'}`,
          subtitle:
            cand.bio?.slice(0, 110) ||
            `Profissional disponível em ${cand.municipality || 'Ondjiva'}, Cunene.`,
          imageUrl: cand.cover_url || cand.avatar_url || '',
          tag: 'Talento',
          actionText: 'Explorar Candidatos',
          actionTab: 'candidates'
        });
      });

    // 2. Empresas reais registadas
    companies
      .filter((comp) => comp && (comp.company_name || comp.full_name))
      .slice(0, 2)
      .forEach((comp) => {
        const compName = comp.company_name || comp.full_name || 'Empresa';
        const logo = comp.company_logo || comp.avatar_url || '';
        list.push({
          id: `comp-${comp.id}`,
          authorName: compName,
          authorAvatar: logo,
          authorRole: 'Empresa',
          title: compName,
          subtitle:
            comp.bio?.slice(0, 110) ||
            `${comp.industry || 'Comércio & Serviços'} em ${comp.municipality || 'Ondjiva'}.`,
          imageUrl: comp.cover_url || logo,
          tag: 'Empresa',
          actionText: 'Ver Empresas',
          actionTab: 'companies'
        });
      });

    // 3. Vagas reais recentes
    jobs
      .filter((j) => j && j.title)
      .slice(0, 2)
      .forEach((job) => {
        list.push({
          id: `job-${job.id}`,
          authorName: job.company_name || 'Vaga CuneneVagas',
          authorAvatar: job.company_logo || '',
          authorRole: 'Oficial',
          title: job.title,
          subtitle: `${job.municipality || 'Ondjiva'} · ${job.contract_type || 'Oportunidade ativa'}`,
          imageUrl: job.company_logo || '',
          tag: 'Vaga',
          actionText: 'Ver Vagas Abertas',
          actionTab: 'jobs'
        });
      });

    // 4. Produtos reais do Marketplace
    products
      .filter((p) => p && p.title)
      .slice(0, 2)
      .forEach((prod) => {
        list.push({
          id: `prod-${prod.id}`,
          authorName: prod.company_name || (prod as any).seller_name || prod.title,
          authorAvatar: prod.image_url || '',
          authorRole: 'Empresa',
          title: prod.title,
          subtitle: prod.price
            ? `${Number(prod.price).toLocaleString('pt-AO')} Kz em ${prod.municipality || 'Ondjiva'}`
            : `Disponível em ${prod.municipality || 'Ondjiva'}`,
          imageUrl: prod.image_url || '',
          tag: 'Mercado',
          actionText: 'Ir para o Marketplace',
          actionTab: 'marketplace'
        });
      });

    // 5. Publicações reais do Feed
    posts
      .filter((p) => p && p.author_name && p.content)
      .slice(0, 2)
      .forEach((post) => {
        list.push({
          id: `post-${post.id}`,
          authorName: post.author_name,
          authorAvatar: post.author_avatar || '',
          authorRole: post.author_type === 'employer' ? 'Empresa' : 'Candidato',
          title: post.category || 'Comunidade',
          subtitle: post.content.slice(0, 120),
          imageUrl: post.image_url || post.author_avatar || '',
          tag: 'Feed',
          actionText: 'Aceder à Comunidade',
          actionTab: 'community'
        });
      });

    return list;
  }, [featuredCandidates, companies, jobs, products, posts]);

  if (stories.length === 0) {
    return null;
  }

  const handleOpenStory = (index: number) => {
    triggerHaptic('light');
    setActiveStoryIndex(index);
  };

  return (
    <>
      <div className="w-full overflow-x-auto scrollbar-none py-1 px-1">
        <div className="flex items-center gap-3.5 sm:gap-5 min-w-max">
          {stories.map((story, index) => {
            const hasAvatar = Boolean(story.authorAvatar) && !failedAvatars[story.id];
            const initial = (story.authorName || 'C').charAt(0).toUpperCase();
            return (
              <button
                key={story.id}
                type="button"
                onClick={() => handleOpenStory(index)}
                className="flex flex-col items-center gap-1.5 focus:outline-none group active:scale-[0.96] transition-transform cursor-pointer"
              >
                <div className="w-16 h-16 sm:w-18 sm:h-18 p-[2.5px] rounded-full bg-gradient-to-tr from-[#D4AF37] via-[#F5D77A] to-[#805817] group-hover:scale-105 transition-all shadow-md shadow-[#D4AF37]/20">
                  <div className="w-full h-full p-[2px] bg-[#080808] rounded-full overflow-hidden flex items-center justify-center">
                    {hasAvatar ? (
                      <img
                        src={story.authorAvatar}
                        alt={story.authorName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover rounded-full"
                        loading="lazy"
                        onError={() =>
                          setFailedAvatars((prev) => ({ ...prev, [story.id]: true }))
                        }
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-[#1C1811] flex items-center justify-center text-base font-black text-[#F5D77A]">
                        {initial}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[11px] font-bold text-[#EAE6DF] group-hover:text-[#F5D77A] transition-colors truncate max-w-[76px] leading-tight">
                  {story.authorName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <StoryViewerModal
        stories={stories}
        initialIndex={activeStoryIndex ?? 0}
        isOpen={activeStoryIndex !== null}
        onClose={() => setActiveStoryIndex(null)}
        onNavigateTab={onNavigateTab}
      />
    </>
  );
};
