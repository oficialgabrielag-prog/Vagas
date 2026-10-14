import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Briefcase, ShoppingBag, Award, ArrowRight, Share2 } from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';

export interface StoryItem {
  id: string;
  authorName: string;
  authorAvatar: string;
  authorRole: 'Empresa' | 'Candidato' | 'Oficial';
  title: string;
  subtitle: string;
  imageUrl: string;
  tag: string;
  actionText?: string;
  actionTab?: string;
}

interface StoryViewerModalProps {
  stories: StoryItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  stories,
  initialIndex,
  isOpen,
  onClose,
  onNavigateTab
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setProgress(0);
    }
  }, [isOpen, initialIndex]);

  useEffect(() => {
    if (!isOpen || stories.length === 0) return;

    if (isPaused) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    const duration = 5000; // 5s per story
    const stepTime = 50;
    const stepIncrement = (stepTime / duration) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + stepIncrement;
      });
    }, stepTime);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isOpen, currentIndex, isPaused, stories.length]);

  if (!isOpen || stories.length === 0) return null;

  const currentStory = stories[currentIndex] || stories[0];

  const handleNextStory = () => {
    triggerHaptic('light');
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrevStory = () => {
    triggerHaptic('light');
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

  const handleAction = () => {
    triggerHaptic('medium');
    if (currentStory.actionTab && onNavigateTab) {
      onNavigateTab(currentStory.actionTab);
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center select-none backdrop-blur-md"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="relative w-full h-full max-w-md max-h-[92vh] sm:rounded-3xl overflow-hidden bg-slate-950 flex flex-col justify-between shadow-2xl border border-white/10">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={currentStory.imageUrl} 
            alt={currentStory.title} 
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/90" />
        </div>

        {/* Top Header & Progress Bars */}
        <div className="relative z-20 p-4 space-y-3 pt-safe">
          {/* Progress indicators */}
          <div className="flex items-center gap-1.5 w-full">
            {stories.map((story, idx) => (
              <div key={story.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-75"
                  style={{
                    width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Author info & Close */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img 
                src={currentStory.authorAvatar} 
                alt={currentStory.authorName} 
                className="w-9 h-9 rounded-full object-cover ring-2 ring-[#FFC20E]"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-xs font-bold leading-none">{currentStory.authorName}</span>
                  <span className="text-[10px] bg-[#0F4C9C] text-white px-1.5 py-0.5 rounded-full font-bold">{currentStory.tag}</span>
                </div>
                <span className="text-white/70 text-[10px] font-medium">{currentStory.authorRole}</span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('light');
                onClose();
              }}
              className="p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition"
              aria-label="Fechar histórias"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tap area left & right for story navigation */}
        <div className="absolute inset-y-16 inset-x-0 z-10 flex">
          <div 
            className="w-1/3 h-full cursor-pointer" 
            onClick={(e) => {
              e.stopPropagation();
              handlePrevStory();
            }} 
          />
          <div 
            className="w-2/3 h-full cursor-pointer" 
            onClick={(e) => {
              e.stopPropagation();
              handleNextStory();
            }} 
          />
        </div>

        {/* Bottom Story Content & Action CTA */}
        <div className="relative z-20 p-5 space-y-4 pb-safe">
          <div className="space-y-1 text-white">
            <h3 className="text-lg sm:text-xl font-black leading-tight drop-shadow-md">
              {currentStory.title}
            </h3>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed drop-shadow-sm">
              {currentStory.subtitle}
            </p>
          </div>

          {currentStory.actionText && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAction();
              }}
              className="w-full bg-[#FFC20E] hover:bg-[#e5ad0c] active:scale-[0.98] text-slate-950 font-bold py-3 px-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <span>{currentStory.actionText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
