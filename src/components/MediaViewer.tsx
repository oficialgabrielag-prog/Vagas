import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface MediaViewerProps {
  media: { url: string; type: 'image' | 'video'; alt?: string }[];
  initialIndex?: number;
  onClose: () => void;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({ media, initialIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigate = (direction: number) => {
    setLoading(true);
    setError(false);
    setCurrentIndex((prev) => (prev + direction + media.length) % media.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const diffX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const diffY = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) navigate(1);
      else navigate(-1);
    } else if (diffY > 80 && Math.abs(diffY) > Math.abs(diffX)) {
      onClose();
    }
    touchStartRef.current = null;
  };

  const currentMedia = media[currentIndex];
  
  if (!currentMedia || !currentMedia.url) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      >
        <button onClick={onClose} className="absolute top-4 right-4 z-[101] text-white p-2 bg-black/50 rounded-full hover:bg-black/70">
          <X className="w-6 h-6" />
        </button>

        {media.length > 1 && (
          <>
            <button onClick={() => navigate(-1)} className="absolute left-4 z-[101] text-white p-2 bg-black/50 rounded-full hover:bg-black/70">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button onClick={() => navigate(1)} className="absolute right-4 z-[101] text-white p-2 bg-black/50 rounded-full hover:bg-black/70">
              <ChevronRight className="w-6 h-6" />
            </button>
            <div className="absolute bottom-4 text-white font-medium bg-black/50 px-3 py-1 rounded-full text-sm">
              {currentIndex + 1} / {media.length}
            </div>
          </>
        )}

        <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="w-full h-full flex items-center justify-center p-4">
          {loading && <div className="text-white">Carregando...</div>}
          {error && (
            <div className="text-white text-center">
              Não foi possível carregar esta imagem.<br />
              <button onClick={onClose} className="mt-4 px-4 py-2 bg-white/20 rounded-lg">Fechar</button>
            </div>
          )}
          
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full h-full flex items-center justify-center"
          >
            {currentMedia.type === 'image' ? (
              <img
                src={currentMedia.url}
                alt={currentMedia.alt || 'Media'}
                className="max-w-full max-h-full object-contain"
                onLoad={() => setLoading(false)}
                onError={() => { setLoading(false); setError(true); }}
              />
            ) : (
              <video
                src={currentMedia.url}
                controls
                autoPlay
                className="max-w-full max-h-full"
                onLoadedData={() => setLoading(false)}
                onError={() => { setLoading(false); setError(true); }}
              />
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
