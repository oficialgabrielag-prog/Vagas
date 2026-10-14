import React, { useState } from 'react';
import { X, Plus, ShoppingBag, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { MarketplaceProduct, UserProfile, CUNENE_MUNICIPALITIES } from '../lib/types';
import { StoreService } from '../lib/store';
import { ImageUploader } from './ImageUploader';
import { PayPalPaymentModal } from './PayPalPaymentModal';

interface NewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onProductCreated: () => void;
}

export const NewProductModal: React.FC<NewProductModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProductCreated
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MarketplaceProduct['category']>('Agricultura');
  const [municipality, setMunicipality] = useState(CUNENE_MUNICIPALITIES[0]);
  const [price, setPrice] = useState('');
  const [contactPhone, setContactPhone] = useState(currentUser?.phone || '+244 ');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

  const handleGenerateAIDescription = async () => {
    if (!title.trim()) {
      setError('Por favor, informe primeiro o Título do Anúncio para a IA gerar a descrição.');
      return;
    }
    setError('');
    setIsGeneratingDescription(true);
    setAiSuccessMsg(null);
    try {
      const res = await fetch('/api/ai/product-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          municipality,
          price: price ? Number(price) : undefined,
          existingDescription: description
        })
      });
      if (!res.ok) throw new Error('Falha na resposta do servidor');
      const data = await res.json();
      if (data.description) {
        setDescription(data.description);
        setAiSuccessMsg('✨ Descrição profissional gerada com IA! Pode ajustá-la livremente.');
        setTimeout(() => setAiSuccessMsg(null), 5000);
      }
    } catch (e) {
      // Fallback local se o servidor estiver sem rede
      const priceFormatted = price ? `${Number(price).toLocaleString('pt-AO')} AOA` : 'Negociável';
      const fallbackDesc = `⭐ **${title.trim()} — Disponível no Cunene**\n\nExcelente oportunidade em ${municipality}! Produto de alta qualidade na categoria ${category}, pronto para entrega ou levantamento.\n\n**Destaques:**\n• Categoria: ${category}\n• Município: ${municipality}\n• Preço: ${priceFormatted}\n• Condição: Novo / Excelente conservação\n\n📞 Contacte via WhatsApp ou chamada para combinar a entrega ou negociar!`;
      setDescription(fallbackDesc);
      setAiSuccessMsg('✨ Descrição gerada com sucesso! Pode personalizá-la.');
      setTimeout(() => setAiSuccessMsg(null), 4000);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const currentCompanyProductsCount = React.useMemo(() => {
    if (!currentUser) return 0;
    const allProds = StoreService.getProducts();
    return allProds.filter(p => p.seller_id === currentUser.id || (currentUser.company?.id && p.company_id === currentUser.company.id)).length;
  }, [currentUser, isOpen]);

  const isUnlimited = Boolean(currentUser?.marketplace_unlocked || currentUser?.company?.marketplace_unlocked);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !contactPhone) {
      setError('Por favor, preencha o título, preço e contacto.');
      return;
    }

    try {
      await StoreService.addProduct({
        seller_id: currentUser.id,
        company_id: currentUser.role === 'employer' ? currentUser.id : undefined,
        title,
        category,
        municipality,
        price: Number(price),
        currency: 'AOA',
        contact_phone: contactPhone,
        image_url: imageUrl || undefined,
        description,
        status: 'available',
        is_active: true,
        seller: currentUser
      });

      onProductCreated();
      onClose();
    } catch (err: any) {
      if (err.message === 'LIMIT_REACHED' || err.message?.includes('LIMIT_REACHED')) {
        setError('A sua empresa atingiu o limite gratuito de 10 produtos. Para publicar produtos adicionais de forma ilimitada, efetue o pagamento seguro via PayPal.');
        setShowPayment(true);
      } else {
        setError('Erro ao criar anúncio. Tente novamente.');
      }
    }
  };

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 my-8">
        <div className="bg-[#0F4C9C] p-5 sm:p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-6 h-6" />
          </button>
          <span className="text-xs uppercase tracking-widest font-semibold text-[#FFC20E]">
            Marketplace Local
          </span>
          <h2 className="text-xl sm:text-2xl font-bold mt-1">Criar Anúncio de Produto ou Serviço</h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <p className="text-xs sm:text-sm text-slate-200">Venda ou divulgue os seus produtos no Cunene</p>
            {isUnlimited ? (
              <span className="text-[10px] font-extrabold text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-400/40">
                🌟 Produtos Ilimitados (PayPal Ativo)
              </span>
            ) : (
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                currentCompanyProductsCount >= 10 
                  ? 'bg-rose-950/70 text-rose-300 border-rose-400/50' 
                  : 'bg-white/15 text-[#FFC20E] border-white/20'
              }`}>
                📦 {currentCompanyProductsCount}/10 produtos gratuitos
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs sm:text-sm space-y-2">
              <p>{error}</p>
              {error.includes('limite') && (
                <button
                  type="button"
                  onClick={() => setShowPayment(true)}
                  className="w-full bg-[#FFC20E] text-slate-900 font-bold py-2 rounded-lg text-xs"
                >
                  Ativar Premium — US$ 1
                </button>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Título do Anúncio *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Sofá modular, Milho a granel ou Serviços de Canalização"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C9C]"
            />
          </div>

          <ImageUploader
            context="product-image"
            currentImageUrl={imageUrl}
            onUploadSuccess={url => setImageUrl(url)}
            onRemove={() => setImageUrl('')}
            label="Fotografia do Produto (Upload Cloudinary)"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C9C]"
              >
                <option value="Agricultura">Agricultura</option>
                <option value="Móveis">Móveis</option>
                <option value="Casa">Casa</option>
                <option value="Serviços">Serviços</option>
                <option value="Moda">Moda</option>
                <option value="Calçados">Calçados</option>
                <option value="Eletrónicos">Eletrónicos</option>
                <option value="Telemóveis">Telemóveis</option>
                <option value="Informática">Informática</option>
                <option value="Alimentação">Alimentação</option>
                <option value="Beleza">Beleza</option>
                <option value="Automóveis">Automóveis</option>
                <option value="Construção">Construção</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Município *</label>
              <select
                value={municipality}
                onChange={e => setMunicipality(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C9C]"
              >
                {CUNENE_MUNICIPALITIES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Preço (AOA) *</label>
              <input
                type="number"
                required
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="Ex: 250000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C9C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contacto WhatsApp / Tel *</label>
              <input
                type="text"
                required
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                placeholder="+244 923 000 000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C9C]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <label className="block text-xs font-semibold text-slate-700">Descrição Detalhada</label>
              <button
                type="button"
                onClick={handleGenerateAIDescription}
                disabled={isGeneratingDescription}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0F4C9C] bg-blue-50 hover:bg-blue-100/90 active:scale-95 px-2.5 py-1 rounded-lg border border-blue-200 transition cursor-pointer disabled:opacity-50"
                title="Ajudar a criar uma descrição comercial persuasiva com Inteligência Artificial"
              >
                {isGeneratingDescription ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F4C9C]" />
                    <span>A gerar com IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#FFC20E]" />
                    <span>Ajudar a criar descrição com IA</span>
                  </>
                )}
              </button>
            </div>
            
            {aiSuccessMsg && (
              <div className="mb-2 p-2 bg-emerald-50 text-emerald-800 rounded-xl text-[11px] font-bold border border-emerald-200 flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{aiSuccessMsg}</span>
              </div>
            )}

            <textarea
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descreva o estado, condições de entrega ou detalhes do serviço..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C9C]"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-bold py-3.5 rounded-xl text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2 mt-4 active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Publicar Anúncio no Marketplace</span>
          </button>        </form>
      </div>
    </div>
    {showPayment && (
      <PayPalPaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        currentUser={currentUser}
        onPaymentSuccess={() => {
          setShowPayment(false);
          setError('');
        }}
      />
    )}
    </>
  );
};
