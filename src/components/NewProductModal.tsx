import React, { useState } from 'react';
import { X, Plus, ShoppingBag } from 'lucide-react';
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
      if (err.message === 'LIMIT_REACHED') {
        setError('Você atingiu o limite de 3 produtos gratuitos. Ative o Premium para publicar mais produtos.');
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
          <p className="text-xs sm:text-sm text-slate-200 mt-1">Venda ou divulgue os seus produtos no Cunene</p>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição Detalhada</label>
            <textarea
              rows={3}
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
