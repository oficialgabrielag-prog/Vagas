import React from 'react';
import { PostReactionType } from '../lib/types';
import { ThumbsUp, Heart, Laugh, Meh, Award, Frown } from 'lucide-react';

export interface ReactionConfig {
  type: PostReactionType;
  label: string;
  emoji: string;
  icon: React.ReactNode;
  activeColor: string;
  bgColor: string;
}

export const REACTIONS_CONFIG: ReactionConfig[] = [
  {
    type: 'love',
    label: 'Amei',
    emoji: '❤️',
    icon: <Heart className="w-5 h-5 fill-red-500 text-red-500" />,
    activeColor: 'text-red-600',
    bgColor: 'hover:bg-red-50'
  },
  {
    type: 'like',
    label: 'Gostei',
    emoji: '👍',
    icon: <ThumbsUp className="w-5 h-5 fill-blue-600 text-blue-600" />,
    activeColor: 'text-blue-600',
    bgColor: 'hover:bg-blue-50'
  },
  {
    type: 'haha',
    label: 'Haha',
    emoji: '😂',
    icon: <Laugh className="w-5 h-5 text-amber-500" />,
    activeColor: 'text-amber-600',
    bgColor: 'hover:bg-amber-50'
  },
  {
    type: 'wow',
    label: 'Uau',
    emoji: '😮',
    icon: <Meh className="w-5 h-5 text-amber-500" />,
    activeColor: 'text-amber-600',
    bgColor: 'hover:bg-amber-50'
  },
  {
    type: 'celebrate',
    label: 'Parabéns',
    emoji: '👏',
    icon: <Award className="w-5 h-5 text-emerald-600" />,
    activeColor: 'text-emerald-600',
    bgColor: 'hover:bg-emerald-50'
  },
  {
    type: 'sad',
    label: 'Triste',
    emoji: '😢',
    icon: <Frown className="w-5 h-5 text-slate-500" />,
    activeColor: 'text-slate-600',
    bgColor: 'hover:bg-slate-100'
  }
];

interface VerticalReactionsPickerProps {
  currentReaction?: PostReactionType;
  onSelectReaction: (type: PostReactionType) => void;
  onClose: () => void;
  position?: 'top' | 'bottom';
}

export const VerticalReactionsPicker: React.FC<VerticalReactionsPickerProps> = ({
  currentReaction,
  onSelectReaction,
  onClose,
  position = 'top'
}) => {
  return (
    <>
      {/* Backdrop to close on click outside */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }} 
      />

      <div
        className={`absolute z-50 ${
          position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
        } left-0 bg-white/98 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/80 p-1.5 min-w-[160px] animate-fadeIn`}
        onClick={(e) => e.stopPropagation()}
        role="menu"
        aria-label="Selecionar reação"
      >
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-3 py-1.5 border-b border-slate-100">
          Reagir
        </div>

        <div className="flex flex-col gap-1 py-1">
          {REACTIONS_CONFIG.map(({ type, label, emoji, activeColor, bgColor }) => {
            const isSelected = currentReaction === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  onSelectReaction(type);
                  onClose();
                }}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-all ${bgColor} ${
                  isSelected ? 'bg-slate-100 font-black shadow-2xs scale-[1.02]' : 'hover:scale-[1.02] text-slate-700'
                }`}
                role="menuitem"
              >
                <span className="text-2xl shrink-0 transition-transform active:scale-125" aria-hidden="true">
                  {emoji}
                </span>
                <span className={`text-xs font-bold ${isSelected ? activeColor : 'text-slate-800'}`}>
                  {label}
                </span>
                {isSelected && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#0F4C9C]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
