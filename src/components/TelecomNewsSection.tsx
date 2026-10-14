import React, { useState, useEffect } from 'react';
import { Radio, Wifi, Signal, Share2, Heart, ExternalLink, Plus, MapPin, Sparkles, Building2, Calendar, Eye, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { TelecomNewsItem, UserProfile } from '../lib/types';
import { StoreService } from '../lib/store';
import { ImageUploader } from './ImageUploader';

interface TelecomNewsSectionProps {
  currentUser: UserProfile | null;
  onOpenAuth?: () => void;
}

export const TelecomNewsSection: React.FC<TelecomNewsSectionProps> = ({
  currentUser,
  onOpenAuth
}) => {
  const [news, setNews] = useState<TelecomNewsItem[]>(() => StoreService.getTelecomNews());
  const [selectedOperator, setSelectedOperator] = useState<string>('Todas');
  const [selectedNews, setSelectedNews] = useState<TelecomNewsItem | null>(null);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    StoreService.fetchTelecomNews().then(result => {
      if (result && result.news && result.news.length > 0) {
        setNews(result.news);
      }
      if (result && result.likedIds) {
        setLikedIds(result.likedIds);
      }
    });
  }, []);

  const operators = [
    'Todas', 
    'UNITEL', 
    'Africell', 
    'Movicel', 
    'Angola Telecom', 
    'Zap Fibra', 
    'Cunene Telecom', 
    'Banco BAI', 
    'Banco BFA', 
    'Standard Bank', 
    'Banco Sol', 
    'Kero / Supermercados', 
    'ENDE (Energia)', 
    'EPAS (Águas)', 
    'Comércio & Serviços'
  ];

  const filteredNews = news.filter(item => {
    if (selectedOperator === 'Todas') return true;
    return (item.operator_name || '').toLowerCase().includes(selectedOperator.toLowerCase());
  });

  const getFriendlyErrorMessage = (err: any, defaultMsg: string) => {
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('violates row-level security') || msg.includes('policy') || msg.includes('permission') || msg.includes('unauthorized')) {
      return 'Permissão negada. Apenas contas autorizadas e associadas a uma empresa podem efetuar esta operação.';
    }
    if (msg.includes('duplicate key') || msg.includes('already exists')) {
      return 'Este registo já existe ou já foi processado.';
    }
    if (msg.includes('jwt') || msg.includes('token') || msg.includes('auth')) {
      return 'Sessão expirada. Por favor, inicie sessão novamente.';
    }
    return defaultMsg;
  };

  const handleLike = async (e: React.MouseEvent, itemOrId: TelecomNewsItem | string) => {
    e.stopPropagation();
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    const itemId = typeof itemOrId === 'string' ? itemOrId : itemOrId.id;
    const item = typeof itemOrId === 'string' 
      ? news.find(n => n.id === itemId) || selectedNews 
      : itemOrId;

    if (!item) return;

    const isLiked = likedIds.includes(itemId);

    // Atualização otimista
    const newLikedIds = isLiked 
      ? likedIds.filter(id => id !== itemId)
      : [...likedIds, itemId];
    setLikedIds(newLikedIds);

    const optimisticCount = isLiked 
      ? Math.max(0, (item.likes_count || 0) - 1)
      : (item.likes_count || 0) + 1;

    setNews(prev => prev.map(n => n.id === itemId ? { ...n, likes_count: optimisticCount } : n));
    if (selectedNews?.id === itemId) {
      setSelectedNews(prev => prev ? { ...prev, likes_count: optimisticCount } : null);
    }

    try {
      const res = await StoreService.toggleLikeTelecomNews(itemId, isLiked);
      if (res && typeof res.likes_count === 'number') {
        const exactCount = res.likes_count;
        setNews(prev => prev.map(n => n.id === itemId ? { ...n, likes_count: exactCount } : n));
        if (selectedNews?.id === itemId) {
          setSelectedNews(prev => prev ? { ...prev, likes_count: exactCount } : null);
        }
      }
    } catch (err: any) {
      // Reverter otimismo em caso de erro
      setLikedIds(likedIds);
      setNews(prev => prev.map(n => n.id === itemId ? { ...n, likes_count: item.likes_count } : n));
      if (selectedNews?.id === itemId) {
        setSelectedNews(prev => prev ? { ...prev, likes_count: item.likes_count } : null);
      }
      setFormError(getFriendlyErrorMessage(err, 'Não foi possível concluir a ação. Tente novamente.'));
      setTimeout(() => setFormError(null), 4000);
    }
  };

  const handleShare = (e: React.MouseEvent, item: TelecomNewsItem) => {
    e.stopPropagation();
    const shareText = `📡 ${item.title} - ${item.operator_name} no Cunene: ${window.location.origin}`;
    if (navigator.share) {
      navigator.share({
        title: item.title,
        text: item.summary,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      setShareFeedback('Link copiado para a área de transferência!');
      setTimeout(() => setShareFeedback(null), 3000);
    }
  };

  const getOperatorColor = (op: string) => {
    const o = (op || '').toLowerCase();
    if (o.includes('unitel')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (o.includes('africell')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (o.includes('movicel')) return 'bg-amber-50 text-amber-800 border-amber-200';
    if (o.includes('angola') || o.includes('zap')) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  const handleSelectNews = (item: TelecomNewsItem) => {
    setSelectedNews(item);
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 space-y-6 shadow-2xs">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-[#0F4C9C] to-blue-600 text-white shadow-xs">
              <Signal className="w-5 h-5" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-[#0F4C9C] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              Canal Oficial • Conectividade
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pt-1">
            Telecomunicações no Cunene
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Acompanhe comunicados, expansão de cobertura 4G/5G, fibra óptica e novidades da UNITEL, Africell, Movicel e Angola Telecom.
          </p>
        </div>
      </div>

      {shareFeedback && (
        <div className="bg-emerald-50 text-emerald-800 text-xs font-bold p-3 rounded-xl border border-emerald-200 animate-fadeIn flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{shareFeedback}</span>
        </div>
      )}

      {/* Operator Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {operators.map(op => {
          const isSelected = selectedOperator === op;
          return (
            <button
              key={op}
              type="button"
              onClick={() => setSelectedOperator(op)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#0F4C9C] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {op}
            </button>
          );
        })}
      </div>

      {/* News Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNews.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <Radio className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">Nenhum comunicado disponível</h4>
            <p className="text-xs text-slate-400">Não existem notícias desta operadora no momento.</p>
          </div>
        ) : (
          filteredNews.map(item => {
            const isLiked = likedIds.includes(item.id);
            return (
              <article
                key={item.id}
                onClick={() => setSelectedNews(item)}
                className="bg-white rounded-2xl border border-slate-200 hover:border-[#0F4C9C]/40 p-4 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Operator badge & location */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${getOperatorColor(item.operator_name)}`}>
                      {item.operator_name}
                    </span>

                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                      <MapPin className="w-3 h-3 text-[#0F4C9C]" />
                      <span>{item.municipality || 'Cunene'}</span>
                    </div>
                  </div>

                  {/* Image banner if present */}
                  {item.image_url && (
                    <div className="h-40 sm:h-44 rounded-xl overflow-hidden bg-slate-100 relative">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                        loading="lazy"
                      />
                      {item.badge && (
                        <span className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Title & Summary */}
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-[#0F4C9C] transition-colors line-clamp-2 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                      {item.summary}
                    </p>
                  </div>
                </div>

                {/* Footer Meta & Actions */}
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(item.published_at).toLocaleDateString('pt-AO')}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => handleLike(e, item.id)}
                      className={`flex items-center gap-1 font-bold text-xs transition cursor-pointer ${
                        isLiked ? 'text-rose-600' : 'text-slate-500 hover:text-rose-600'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-600' : ''}`} />
                      <span>{item.likes_count || 0}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleShare(e, item)}
                      className="text-slate-500 hover:text-[#0F4C9C] transition cursor-pointer p-1"
                      title="Partilhar"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    <span className="text-[#0F4C9C] font-bold inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Ler <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* TELA ÚNICA DE DETALHES DA NOTÍCIA */}
      {selectedNews && (
        <div className="fixed inset-0 z-[9999] bg-white overflow-y-auto flex flex-col animate-fadeIn">
          {/* Top Sticky Header */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedNews(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              >
                <X className="w-4 h-4" />
                <span>Voltar</span>
              </button>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-lg border ${getOperatorColor(selectedNews.operator_name)}`}>
                  {selectedNews.operator_name}
                </span>
                {selectedNews.badge && (
                  <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md hidden sm:inline-block">
                    {selectedNews.badge}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => handleLike(e, selectedNews.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  likedIds.includes(selectedNews.id)
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Heart className={`w-4 h-4 ${likedIds.includes(selectedNews.id) ? 'fill-rose-600 text-rose-600' : ''}`} />
                <span>{selectedNews.likes_count || 0}</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleShare(e, selectedNews)}
                className="inline-flex items-center gap-1.5 bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Partilhar</span>
              </button>
            </div>
          </div>

          {/* Main Full Screen Content */}
          <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 flex-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight tracking-tight">
              {selectedNews.title}
            </h1>

            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium border-b border-slate-100 pb-4">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-[#0F4C9C]" />
                {selectedNews.municipality || 'Cunene'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-slate-400" />
                {new Date(selectedNews.published_at).toLocaleDateString('pt-AO')}
              </span>
              {selectedNews.author_name && (
                <>
                  <span>•</span>
                  <span className="font-bold text-slate-700">Por: {selectedNews.author_name}</span>
                </>
              )}
            </div>

            {selectedNews.image_url && (
              <div className="rounded-3xl overflow-hidden max-h-[420px] bg-slate-100 border border-slate-200 shadow-sm">
                <img
                  src={selectedNews.image_url}
                  alt={selectedNews.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="bg-blue-50/80 p-4 sm:p-5 rounded-2xl border border-blue-100 text-sm sm:text-base font-semibold text-[#0F4C9C] leading-relaxed">
              {selectedNews.summary}
            </div>

            <div className="text-slate-800 text-base sm:text-lg leading-relaxed whitespace-pre-line select-text font-normal pt-2">
              {selectedNews.content}
            </div>

            {selectedNews.source_url && (function() {
              const trimmed = selectedNews.source_url!.trim();
              const isValid = trimmed.startsWith('https://') || trimmed.startsWith('http://');
              if (!isValid) return null;
              return (
                <div className="pt-4 border-t border-slate-100">
                  <a
                    href={trimmed}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-bold text-white bg-[#0F4C9C] hover:bg-[#0c3c7d] px-5 py-3 rounded-2xl shadow-sm transition"
                  >
                    <span>Abrir fonte oficial</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </section>
  );
};
