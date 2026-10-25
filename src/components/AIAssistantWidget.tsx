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
      const saved = localStorage.getItem('cunene_ai_chat_history') || localStorage.getItem('vdn_ai_chat_history');
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
        localStorage.setItem('cunene_ai_chat_history', JSON.stringify(messages));
      } catch {}
    }
  }, [messages]);

  // Set initial welcome message when opened
  useEffect(() => {
    if (messages.length === 0) {
      const userName = currentUser?.full_name || currentUser?.company_name || 'Visitante';
      const userRole = currentUser?.role === 'employer' ? 'Empresa / Recrutador' : 'Candidato';
      const welcomeText = `Olá, **${userName}**! 👋

Sou a **Assistente CuneneVagas**, a sua consultora inteligente no **CuneneVagas & Marketplace**.

Conheço o seu perfil como **${userRole}** em **${currentUser?.municipality || 'Ondjiva'}**. Temos atualmente **${jobs.length} vagas de emprego** ativas e **${products.length} produtos** no marketplace!

Como posso ajudar a sua carreira ou o seu negócio hoje?`;

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

    const getLocalSmartResponse = (prompt: string, context: any) => {
      const p = prompt.toLowerCase();
      const userName = context.name || 'Visitante';
      const mun = context.municipality || 'Ondjiva';
      const jobsCount = context.totalJobsCount || 0;
      const productsCount = context.totalProductsCount || 0;

      if (p.includes('medo') || p.includes('nervos') || p.includes('ansios') || p.includes('insegur') || p.includes('entrevista') || p.includes('teste técnico') || p.includes('não sei se passo')) {
        return `É completamente natural sentir nervosismo ou insegurança, **${userName}**! Isso apenas demonstra o quanto esta oportunidade é importante para si.\n\nPara ter sucesso na sua entrevista ou exame técnico no Cunene:\n* **Foco no que sabe:** Fale das suas competências com honestidade e mostre vontade de aprender.\n* **Pontualidade e Confiança:** Em ${mun}, as empresas valorizam muito o compromisso e a boa comunicação.\n* **Preparação:** Explore as empresas ativas em [Ver Empresas do Cunene](#companies) e prepare o seu currículo em [Meu Perfil](#profile).\n\nAcredite no seu potencial! Se quiser treinar perguntas ou falar sobre a sua área, diga-me qual é a sua profissão e preparamo-nos juntos.`;
      }

      if (p.includes('obrigad') || p.includes('agradeç') || p.includes('agradeco') || p.includes('feliz') || p.includes('consegui') || p.includes('muito bom') || p.includes('gostei') || p.includes('parabéns') || p.includes('parabens') || p.includes('excelente') || p.includes('maravilha') || p.includes('valeu')) {
        return `Fico de coração cheio por si, **${userName}**! É uma honra poder caminhar consigo nesta jornada.\n\nA plataforma **CuneneVagas & Marketplace** existe exatamente para transformar vidas e impulsionar a nossa comunidade no Cunene. Partilhe também as suas conquistas em [Abrir Feed da Comunidade](#community)! Conte sempre comigo!`;
      }

      if (p.includes('quem é você') || p.includes('quem e voce') || p.includes('o que você sente') || p.includes('o que voce sente') || p.includes('você é humana') || p.includes('voce e humana') || p.includes('como você funciona') || p.includes('cunenevagas') || p.includes('vai dar namoro') || p.includes('vdn')) {
        return `Sou a **Assistente CuneneVagas**, a sua consultora virtual dedicada ao emprego, recrutamento, formação técnica e marketplace na província do Cunene (${mun}).\n\nO meu propósito é ouvi-lo(a) com verdadeira atenção, esclarecer dúvidas e ajudar a transformar a sua carreira e os seus negócios locais. Pode explorar as [Vagas de Emprego](#jobs), o [Marketplace](#marketplace) ou a nossa [Comunidade](#community)!`;
      }

      if (p.includes('comunidade') || p.includes('comunidades') || p.includes('feed') || p.includes('post') || p.includes('publicar em comunidade') || p.includes('publicar post') || p.includes('publicação') || p.includes('publicacao') || p.includes('notícia') || p.includes('noticia')) {
        return `Com certeza, **${userName}**! O feed da nossa comunidade é o espaço ideal para networking. Agora temos funcionalidades avançadas:\n1. **Sondagens Profissionais:** Pode criar perguntas com opções de voto para ouvir a comunidade.\n2. **Partilha Facilitada:** Partilhe posts diretamente para o WhatsApp ou redes sociais.\n3. **Segurança:** Implementámos um sistema de denúncia para manter o ambiente profissional.\n\n👉 Clique em [Abrir Feed da Comunidade](#community) para ver as novidades, participar em sondagens ou publicar a sua dica!`;
      }

      if (p.includes('pagamento') || p.includes('pagar') || p.includes('paypal') || p.includes('premium') || p.includes('licença') || p.includes('licenca')) {
        return `Com certeza, **${userName}**! Para ativar a sua **Licença Premium** com anúncios ilimitados no Marketplace e contacto direto via WhatsApp, clique no botão abaixo para abrir o checkout seguro do PayPal:\n\n👉 [Ativar Licença Premium (PayPal)](#paypal)\n\nOu explore os produtos disponíveis em [Ver Marketplace](#marketplace)!`;
      }

      if (p.includes('vaga') || p.includes('vagas') || p.includes('emprego') || p.includes('trabalho') || p.includes('procurar emprego') || p.includes('candidat') || p.includes('exame') || p.includes('teste') || p.includes('certificado')) {
        return `Olá, **${userName}**! Temos atualmente **${jobsCount} vagas abertas** no Cunene.\n\nNovidades importantes no nosso sistema de recrutamento:\n1. **Exames de Mérito:** Muitas vagas agora incluem testes técnicos automáticos. Ao ser aprovado, recebe um **Certificado Digital de Proficiência** que pode imprimir ou anexar ao CV!\n2. **Simulados:** No seu painel, pode fazer "Simulados de Treino" gratuitos para praticar antes das provas reais.\n3. **Ranking de Talentos:** Os melhores nos exames aparecem no Top da plataforma, e agora as empresas podem filtrar o **Ranking por Município**!\n\n👉 Clique em [Ver Todas as Vagas](#jobs) ou aceda ao seu [Painel de Controlo](#dashboard) para ver os seus exames e certificados.`;
      }

      if (p.includes('marketplace') || p.includes('produto') || p.includes('produtos') || p.includes('vender') || p.includes('loja') || p.includes('comprar') || p.includes('anúncio') || p.includes('anuncio') || p.includes('slogan')) {
        return `Excelente iniciativa, **${userName}**! O marketplace está mais profissional do que nunca:\n1. **Vitrine Completa:** Agora cada empresa pode ter o seu próprio **Slogan** e uma página de loja dedicada.\n2. **Navegação Inteligente:** Ao ver um produto, pode clicar em "Ver Loja da Empresa" para descobrir todos os outros itens desse vendedor.\n3. **Contacto Direto:** O botão de WhatsApp permite fechar negócios instantaneamente em ${mun}.\n\n👉 Clique em [Aceder ao Marketplace](#marketplace) para explorar os produtos locais!`;
      }

      if (p.includes('empresa') || p.includes('empresas') || p.includes('recrutador') || p.includes('patrão') || p.includes('patrao')) {
        return `Conheça todas as empresas e organizações ativas na província do Cunene!\n\n👉 Clique em [Ver Diretório de Empresas](#companies) para ver perfis oficiais, vagas publicadas e contactos diretos.`;
      }

      if (p.includes('perfil') || p.includes('conta') || p.includes('curriculo') || p.includes('currículo') || p.includes('foto') || p.includes('dados')) {
        return `O seu perfil é o seu cartão de visita para as empresas em ${mun}!\n\n👉 Clique em [Meu Perfil](#profile) para atualizar a sua foto, experiência profissional e número de WhatsApp.`;
      }

      if (p.includes('oi') || p.includes('olá') || p.includes('ola') || p.includes('bom dia') || p.includes('boa tarde') || p.includes('boa noite') || p.includes('tudo bem') || p.includes('como vai')) {
        return `Olá, **${userName}**! É muito bom falar consigo. Estou aqui para o(a) escutar. Como se sente hoje e como posso ajudar na sua vida profissional ou nos seus negócios em **${mun}**?\n\nPode navegar diretamente para [Vagas](#jobs), [Marketplace](#marketplace), [Comunidade](#community) ou [Meu Perfil](#profile)!`;
      }

      return `Olá, **${userName}**! Ouvi atentamente o que me disse. Como sua conselheira no **CuneneVagas & Marketplace**, estou aqui para ajudá-lo(a) em tudo o que precisar:\n* 💼 [Explorar Vagas Ativas](#jobs)\n* 🛒 [Ver Marketplace](#marketplace)\n* 👥 [Abrir Comunidade](#community)\n* 🏢 [Ver Empresas](#companies)\n* 👤 [Meu Perfil](#profile)\n\nDiga-me o que gostaria de alcançar hoje!`;
    };

    try {
      let replyText = '';
      try {
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

        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            replyText = data.reply || '';
          } else {
            const textResult = await res.text();
            const lines = textResult.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.replace('data: ', '').trim();
                if (jsonStr === '[DONE]') break;
                try {
                  const parsed = JSON.parse(jsonStr);
                  if (parsed.text) replyText += parsed.text;
                } catch {}
              }
            }
          }
        }
      } catch (fetchErr) {
        // Fallback silenciando erro de fetch (Netlify / offline)
      }

      if (!replyText) {
        replyText = getLocalSmartResponse(text, userContext);
      }

      // Typewriter effect for natural feel
      let accumulatedText = '';
      for (const char of replyText) {
        accumulatedText += char;
        setMessages(prev =>
          prev.map(m =>
            m.id === botMsgId ? { ...m, text: accumulatedText } : m
          )
        );
        await new Promise(r => setTimeout(r, 4));
      }

      soundEffects.playAiReceiveSound();
      setMessages(prev =>
        prev.map(m =>
          m.id === botMsgId ? { ...m, isStreaming: false } : m
        )
      );
    } catch (err: any) {
      console.error('Erro na IA CuneneVagas:', err);
      const fallbackText = getLocalSmartResponse(text, userContext);
      let accumulatedText = '';
      for (const char of fallbackText) {
        accumulatedText += char;
        setMessages(prev =>
          prev.map(m =>
            m.id === botMsgId ? { ...m, text: accumulatedText } : m
          )
        );
        await new Promise(r => setTimeout(r, 4));
      }
      soundEffects.playAiReceiveSound();
      setMessages(prev =>
        prev.map(m =>
          m.id === botMsgId ? { ...m, isStreaming: false } : m
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
          title="Falar com a Assistente CuneneVagas"
        >
          <div className="relative">
            <MessageCircleHeart className="w-6 h-6 text-[#FFC20E] group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0F4C9C] animate-ping" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0F4C9C]" />
          </div>
          <div className="flex flex-col items-start pr-1 hidden sm:flex text-left">
            <span className="text-xs font-black text-white leading-none flex items-center gap-1">
              CuneneVagas
              <Sparkles className="w-3 h-3 text-[#FFC20E]" />
            </span>
            <span className="text-[9px] text-blue-200 font-medium leading-tight mt-0.5">Assistente Profissional</span>
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
                  <h3 className="text-sm font-black text-white">CuneneVagas AI</h3>
                  <span className="text-[10px] text-blue-200 font-medium">• Consultora</span>
                </div>
                <p className="text-[10px] text-blue-200 flex items-center gap-1 mt-0.5">
                  <span>Assistente Oficial CuneneVagas</span>
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

          {/* VDN Partner Suggestion Banner */}
          <div className="bg-amber-50/90 px-3.5 py-2 border-b border-amber-200/60 flex items-center justify-between text-[11px] shrink-0">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
              <span className="text-slate-700 font-medium">Sugestão parceira:</span>
              <a 
                href="https://freevdn.netlify.app" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="font-black text-[#0F4C9C] hover:underline truncate inline-flex items-center gap-1"
                title="Visitar VDN — Vai Dar Namoro"
              >
                <span>VDN — Vai Dar Namoro</span>
                <Heart className="w-3 h-3 text-rose-500 fill-rose-500 shrink-0" />
              </a>
            </div>
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
