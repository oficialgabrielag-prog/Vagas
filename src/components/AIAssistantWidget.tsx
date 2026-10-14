import React, { useState, useRef, useEffect } from 'react';
import { MessageCircleHeart, Send, X, Sparkles, User, Loader2, Heart, HeartHandshake, Bot } from 'lucide-react';
import { UserProfile, Job, MarketplaceProduct } from '../lib/types';
import { soundEffects } from '../lib/soundEffects';

interface AIAssistantWidgetProps {
  currentUser: UserProfile | null;
  jobs: Job[];
  products: MarketplaceProduct[];
  setCurrentTab: (tab: string) => void;
  onOpenPayPal?: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  time: string;
  isStreaming?: boolean;
}

const QUICK_SUGGESTIONS = [
  'Procurar vagas ativas no Cunene',
  'Certificados digitais de exames',
  'Como votar em sondagens da comunidade?',
  'Ver ranking de talentos por município',
  'Como publicar produtos no Marketplace?',
  'Informações sobre a Licença Premium'
];

export const AIAssistantWidget: React.FC<AIAssistantWidgetProps> = ({
  currentUser,
  jobs,
  products,
  setCurrentTab,
  onOpenPayPal
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('vdn_ai_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save chat history to localStorage on change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem('vdn_ai_chat_history', JSON.stringify(messages));
      } catch {}
    }
  }, [messages]);

  // Set initial welcome message when opened
  useEffect(() => {
    if (messages.length === 0) {
      const userName = currentUser?.full_name || currentUser?.company_name || 'Visitante';
      const userRole = currentUser?.role === 'employer' ? 'Empresa / Recrutador' : 'Candidato';
      const welcomeText = `Olá, **${userName}**! 👋

Sou a **VDN AI**, a sua assistente inteligente no **CuneneVagas & Marketplace** (desenvolvida pelo projeto **Vai Dar Namoro**).

Conheço o seu perfil como **${userRole}** em **${currentUser?.municipality || 'Ondjiva'}**. Temos atualmente **${jobs.length} vagas de emprego** ativas e **${products.length} produtos** no marketplace!

Como posso ajudar a sua carreira ou negócio hoje?`;

      setMessages([
        {
          id: 'welcome-1',
          role: 'assistant',
          text: welcomeText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [currentUser, jobs.length, products.length]);

  const renderBoldText = (text: string, keyPrefix: string) => {
    return (
      <span key={keyPrefix}>
        {text.split('**').map((part, i) =>
          i % 2 === 1 ? <strong key={`${keyPrefix}-${i}`} className="font-black text-slate-900">{part}</strong> : part
        )}
      </span>
    );
  };

  const renderFormattedText = (rawText: string) => {
    if (!rawText) return null;

    const linkRegex = /\[([^\]]+)\]\((#[a-zA-Z0-9_-]+|https?:\/\/[^\s)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(rawText)) !== null) {
      const matchIndex = match.index;
      const [, linkText, linkTarget] = match;

      if (matchIndex > lastIndex) {
        const textBefore = rawText.slice(lastIndex, matchIndex);
        parts.push(renderBoldText(textBefore, `pre-${lastIndex}`));
      }

      if (linkTarget.startsWith('#')) {
        const targetTab = linkTarget.replace('#', '');
        parts.push(
          <button
            key={`link-${matchIndex}`}
            type="button"
            onClick={() => {
              if (targetTab === 'paypal' || targetTab === 'payment' || targetTab === 'premium') {
                if (onOpenPayPal) onOpenPayPal();
                setIsOpen(false);
              } else {
                setCurrentTab(targetTab);
                setIsOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="text-[#0F4C9C] font-bold underline hover:text-[#0c3c7d] cursor-pointer transition-colors"
          >
            {linkText}
          </button>
        );
      } else {
        parts.push(
          <a
            key={`link-${matchIndex}`}
            href={linkTarget}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mx-1 px-2.5 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0F4C9C] font-bold text-xs sm:text-sm border border-blue-200 transition underline cursor-pointer align-middle"
          >
            {linkText}
          </a>
        );
      }

      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < rawText.length) {
      parts.push(renderBoldText(rawText.slice(lastIndex), `post-${lastIndex}`));
    }

    return parts;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || loading) return;

    // Toca o som de envio para a IA
    soundEffects.playAiSendSound();

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!promptToSend) setInputPrompt('');
    setLoading(true);

    const botMsgId = 'bot-' + Date.now();
    const initialBotMsg: ChatMessage = {
      id: botMsgId,
      role: 'assistant',
      text: '',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true
    };

    setMessages(prev => [...prev, initialBotMsg]);

    try {
      const userContext = {
        name: currentUser?.full_name || currentUser?.company_name || 'Anónimo',
        email: currentUser?.email || 'N/A',
        role: currentUser?.role || 'candidato',
        municipality: currentUser?.municipality || 'Ondjiva',
        profession: currentUser?.profession || currentUser?.industry || 'N/A',
        isMarketplaceUnlocked: currentUser?.marketplace_unlocked || currentUser?.company?.marketplace_unlocked || false,
        totalJobsCount: jobs.length,
        totalProductsCount: products.length
      };

      const historyPayload = messages.map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          userContext,
          history: historyPayload
        })
      });

      if (!res.ok || !res.body) {
        throw new Error('Falha ao obter conexão de streaming da VDN AI.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') break;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                accumulatedText += parsed.text;
                // Update bot message progressively chunk by chunk
                setMessages(prev =>
                  prev.map(m =>
                    m.id === botMsgId ? { ...m, text: accumulatedText } : m
                  )
                );
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }

      // Mark streaming as complete and play notification tone
      soundEffects.playAiReceiveSound();
      setMessages(prev =>
        prev.map(m =>
          m.id === botMsgId ? { ...m, isStreaming: false } : m
        )
      );
    } catch (err: any) {
      console.error('Erro no streaming da IA VDN:', err);
      soundEffects.playAiReceiveSound();
      setMessages(prev =>
        prev.map(m =>
          m.id === botMsgId
            ? {
                ...m,
                text: 'Desculpe, ocorreu um erro temporário de comunicação. Por favor, tente novamente.',
                isStreaming: false
              }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white p-3.5 sm:p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center gap-2.5 group hover:scale-105 active:scale-95 cursor-pointer border-2 border-white/20"
          title="Falar com a VDN"
        >
          <div className="relative">
            <MessageCircleHeart className="w-6 h-6 text-[#FFC20E] group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0F4C9C] animate-ping" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0F4C9C]" />
          </div>
          <div className="flex flex-col items-start pr-1 hidden sm:flex text-left">
            <span className="text-xs font-black text-white leading-none flex items-center gap-1">
              VDN
              <Sparkles className="w-3 h-3 text-[#FFC20E]" />
            </span>
            <span className="text-[9px] text-blue-200 font-medium leading-tight mt-0.5">Consultora Profissional</span>
          </div>
        </button>
      )}

      {/* Floating Chat Modal / Drawer */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 w-full sm:w-[420px] h-full sm:h-[600px] max-h-full sm:max-h-[85vh] bg-white sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="bg-[#0F4C9C] p-4 text-white flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <MessageCircleHeart className="w-6 h-6 text-[#FFC20E]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black text-white">VDN</h3>
                  <span className="text-[10px] text-blue-200 font-medium">• Consultora</span>
                </div>
                <p className="text-[10px] text-blue-200 flex items-center gap-1 mt-0.5">
                  <span>Desenvolvido por</span>
                  <a
                    href="https://freevdn.netlify.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FFC20E] font-bold hover:underline flex items-center gap-0.5"
                  >
                    <span>Vai Dar Namoro</span>
                    <Heart className="w-2.5 h-2.5 text-rose-400 fill-rose-400" />
                  </a>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  window.dispatchEvent(new CustomEvent('open-automation-assistant'));
                }}
                className="bg-white/10 hover:bg-white/20 text-[#FFC20E] text-[10px] font-black px-2.5 py-1.5 rounded-xl border border-white/20 flex items-center gap-1 transition cursor-pointer shadow-2xs"
                title="Abrir Assistente de Automação (Edge Function Supabase)"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Automação</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* User Badge Bar */}
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-600 shrink-0">
            <div className="flex items-center gap-1.5 truncate">
              <User className="w-3.5 h-3.5 text-[#0F4C9C] shrink-0" />
              <span className="font-bold truncate">{currentUser?.full_name || currentUser?.company_name || 'Utilizador Visitante'}</span>
            </div>
            <span className="text-[9px] font-extrabold uppercase bg-blue-100 text-[#0F4C9C] px-2 py-0.5 rounded-full shrink-0">
              {currentUser?.municipality || 'Cunene'}
            </span>
          </div>

          {/* Chat Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-white">
            {messages.map((m) => {
              const isBot = m.role === 'assistant';
              return (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${isBot ? 'items-start' : 'items-end justify-end'}`}
                >
                  <div
                    className={`text-sm sm:text-base ${
                      isBot
                        ? 'max-w-[95%] bg-transparent text-slate-900 p-1 sm:p-2 border-0 shadow-none'
                        : 'max-w-[85%] bg-[#0F4C9C] text-white rounded-2xl rounded-tr-xs p-3.5 sm:p-4 font-medium shadow-xs'
                    }`}
                  >
                    {/* Natural conversation text format with interactive direct links */}
                    <div className="whitespace-pre-wrap leading-relaxed space-y-1">
                      {m.text ? (
                        renderFormattedText(m.text)
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400 py-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F4C9C]" />
                          <span className="text-xs font-semibold animate-pulse">A responder...</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-1.5 mt-1.5">
                      {m.isStreaming && (
                        <span className="inline-block w-1.5 h-3 bg-[#0F4C9C] animate-pulse" />
                      )}
                      <span
                        className={`text-[9px] block ${
                          isBot ? 'text-slate-400' : 'text-blue-200'
                        }`}
                      >
                        {m.time}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="p-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            {QUICK_SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(s)}
                disabled={loading}
                className="text-[10px] font-bold whitespace-nowrap bg-slate-100 hover:bg-blue-50 hover:text-[#0F4C9C] text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 transition cursor-pointer active:scale-95 shrink-0"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Pergunte sobre vagas, exames ou produtos..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-300 text-xs sm:text-sm focus:border-[#0F4C9C] focus:outline-none bg-slate-50 font-medium"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || loading}
              className="p-2.5 bg-[#0F4C9C] hover:bg-[#0c3c7d] disabled:opacity-50 text-white rounded-2xl transition cursor-pointer shadow-md active:scale-95 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
