import React, { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { X, Check, ShieldAlert, CreditCard } from 'lucide-react';
import { StoreService } from '../lib/store';
import { UserProfile } from '../lib/types';
import { getSession } from '../lib/supabase';

interface PayPalPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onPaymentSuccess: (updatedUser: UserProfile) => void;
}

export const PayPalPaymentModal: React.FC<PayPalPaymentModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onPaymentSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paypalConfig, setPaypalConfig] = useState<{ clientId: string; environment: string } | null>(null);
  const [fetchingConfig, setFetchingConfig] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<'3_months' | '6_months' | '12_months'>('3_months');

  const PLANS = {
    '3_months': { name: '3 Meses', price: 8, priceString: '8.00', savings: null },
    '6_months': { name: '6 Meses', price: 15, priceString: '15.00', savings: 'Poupe 5%' },
    '12_months': { name: '1 Ano', price: 30, priceString: '30.00', savings: 'Melhor Valor!' }
  };

  useEffect(() => {
    if (isOpen) {
      setFetchingConfig(true);
      setError('');
      fetch('/api/paypal/config')
        .then(res => {
          if (!res.ok) throw new Error('Falha ao carregar configuração de pagamento');
          return res.json();
        })
        .then(data => {
          setPaypalConfig(data);
        })
        .catch(err => {
          console.error(err);
          setError('Não foi possível iniciar o pagamento. Tente novamente.');
        })
        .finally(() => {
          setFetchingConfig(false);
        });
    }
  }, [isOpen]);

  if (!isOpen || !currentUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-fadeIn">
        
        {/* Header */}
        <div className="bg-[#0F4C9C] p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="text-[10px] uppercase tracking-widest font-black text-[#FFC20E] block">
            Licença Empresarial
          </span>
          <h2 className="text-xl sm:text-2xl font-black mt-1">Licença Marketplace</h2>
          <p className="text-xs text-blue-100 mt-1">Ative as vendas online da sua empresa no Cunene</p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-rose-50 text-rose-700 p-3.5 rounded-xl text-xs border border-rose-100 flex items-start gap-2.5 animate-fadeIn">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
              <div className="font-semibold">{error}</div>
            </div>
          )}

              {/* Benefits List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
              O que inclui a subscrição?
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-700">
                <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 font-bold" />
                </div>
                <span>Publicação ilimitada de produtos e serviços.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-700">
                <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 font-bold" />
                </div>
                <span>Botão direto de contacto via WhatsApp para os seus anúncios.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-700">
                <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 font-bold" />
                </div>
                <span>Destaque especial na barra de "Lojas Recomendadas".</span>
              </li>
            </ul>
          </div>

          {/* Plan Selector */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Escolha o plano de duração:
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PLANS) as Array<keyof typeof PLANS>).map((planKey) => {
                const plan = PLANS[planKey];
                const isSelected = selectedPlan === planKey;
                return (
                  <button
                    key={planKey}
                    type="button"
                    onClick={() => setSelectedPlan(planKey)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition text-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'border-[#0F4C9C] bg-blue-50/50 text-[#0F4C9C]'
                        : 'border-slate-100 hover:border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="text-xs font-black">{plan.name}</span>
                    <span className="text-base font-black text-slate-900">US$ {plan.price}</span>
                    {plan.savings && (
                      <span className="text-[8px] bg-[#FFC20E] text-slate-900 px-1 py-0.5 rounded-md font-bold uppercase shrink-0">
                        {plan.savings}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Tag */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Pagamento seguro de ativação ({PLANS[selectedPlan].name})
            </span>
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-2xl font-black text-slate-900">US$ {PLANS[selectedPlan].priceString}</span>
              <span className="text-xs text-slate-500">USD</span>
            </div>
            <p className="text-[10px] text-slate-400">Pagamento seguro processado de forma encriptada pelo PayPal.</p>
          </div>

          {/* Botão de Pagamento Direto */}
          <div className="space-y-3">
            <form action="https://www.paypal.com/ncp/payment/FJUHHTWYQZ8L6" method="post" target="_blank" className="w-full flex flex-col items-center gap-2">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-[#FFC20E] hover:bg-[#e5ae0a] text-slate-900 font-black py-3.5 rounded-2xl text-sm transition active:scale-95 shadow-md cursor-pointer"
              >
                <CreditCard className="w-5 h-5" />
                <span>Pagar e Ativar Premium</span>
              </button>
              <div className="flex flex-col items-center gap-1 mt-1">
                <img src="https://www.paypalobjects.com/images/Debit_Credit.svg" alt="cards" className="h-6" />
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  Powered by <img src="https://www.paypalobjects.com/paypal-ui/logos/svg/paypal-wordmark-color.svg" alt="paypal" className="h-3.5 inline-block align-middle" />
                </span>
              </div>
            </form>
            <p className="text-[10px] text-center text-slate-400">
              Ao clicar, será redirecionado para o ambiente seguro do PayPal para concluir o pagamento.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2 text-[10px] text-slate-400">
          <CreditCard className="w-3.5 h-3.5" />
          <span>Pagamento Seguro encriptado via PayPal</span>
        </div>
      </div>
    </div>
  );
};
