import React, { useState, useEffect } from 'react';
import { X, Check, ShieldAlert, CreditCard, Send, Building, FileText } from 'lucide-react';
import { StoreService } from '../lib/store';
import { UserProfile } from '../lib/types';

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
  const [paymentMode, setPaymentMode] = useState<'paypal' | 'manual'>('paypal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paypalConfig, setPaypalConfig] = useState<{ clientId: string; environment: string } | null>(null);
  const [fetchingConfig, setFetchingConfig] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<'3_months' | '6_months' | '12_months'>('3_months');

  // Manual payment state
  const [manualReference, setManualReference] = useState('');
  const [manualProof, setManualProof] = useState('');
  const [manualSuccess, setManualSuccess] = useState(false);

  const PLANS = {
    '3_months': { name: '3 Meses', price: 8, priceString: '8.00', kwanzaPrice: '25.000 Kz', savings: null },
    '6_months': { name: '6 Meses', price: 15, priceString: '15.00', kwanzaPrice: '45.000 Kz', savings: 'Poupe 5%' },
    '12_months': { name: '1 Ano', price: 30, priceString: '30.00', kwanzaPrice: '85.000 Kz', savings: 'Melhor Valor!' }
  };

  useEffect(() => {
    if (isOpen) {
      setFetchingConfig(true);
      setError('');
      setManualSuccess(false);
      fetch('/api/paypal/config')
        .then(res => {
          if (!res.ok) throw new Error('Falha ao carregar configuração de pagamento');
          return res.json();
        })
        .then(data => {
          setPaypalConfig(data);
        })
        .catch(err => {
          console.warn('Aviso de configuração PayPal:', err);
        })
        .finally(() => {
          setFetchingConfig(false);
        });
    }
  }, [isOpen]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!manualReference.trim()) {
      setError('Por favor, insira a referência da transferência ou Multicaixa.');
      return;
    }

    try {
      StoreService.submitManualPayment({
        user_id: currentUser.id,
        user_email: currentUser.email,
        user_name: currentUser.full_name || currentUser.company_name || 'Utilizador',
        amount: PLANS[selectedPlan].kwanzaPrice,
        reference: manualReference.trim(),
        proof_note: manualProof.trim() || 'Sem observações'
      });
      setManualSuccess(true);
      setError('');
    } catch (err: any) {
      setError('Erro ao submeter pagamento manual: ' + err.message);
    }
  };

  if (!isOpen || !currentUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto pt-12 sm:pt-6 pb-12 sm:pb-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] my-auto animate-fadeIn">
        
        {/* Header */}
        <div className="bg-[#0F4C9C] px-5 py-4 sm:p-6 text-white relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="text-[10px] uppercase tracking-widest font-black text-[#FFC20E] block">
            Licença Empresarial / Marketplace
          </span>
          <h2 className="text-lg sm:text-2xl font-black mt-0.5 leading-tight">Ativação de Assinatura</h2>
          <p className="text-xs text-blue-100 mt-1">Ultrapassou o limite de 10 produtos gratuitos. Ative a sua licença.</p>
        </div>

        {/* Payment Mode Selector Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setPaymentMode('paypal')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              paymentMode === 'paypal' ? 'bg-[#0F4C9C] text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>PayPal / Cartão Visa</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMode('manual')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              paymentMode === 'manual' ? 'bg-[#0F4C9C] text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Pagamento Manual (Kz / IBAN)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="bg-rose-50 text-rose-700 p-3.5 rounded-xl text-xs border border-rose-100 flex items-start gap-2.5 animate-fadeIn">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
              <div className="font-semibold">{error}</div>
            </div>
          )}

          {manualSuccess ? (
            <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center space-y-3 animate-fadeIn">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 font-bold" />
              </div>
              <h3 className="text-base font-black text-emerald-900">Comprovante Submetido com Sucesso!</h3>
              <p className="text-xs text-emerald-700 leading-relaxed">
                O seu pedido de pagamento manual foi registado e enviado para validação do administrador. A sua conta será aprovada em breve para continuar a publicar.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 bg-[#0F4C9C] text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer"
              >
                Concluir
              </button>
            </div>
          ) : paymentMode === 'manual' ? (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-2 text-xs text-amber-900">
                <h4 className="font-black flex items-center gap-1.5 text-slate-900">
                  <Building className="w-4 h-4 text-amber-700" />
                  Dados Bancários para Transferência (Banco BAI):
                </h4>
                <p><strong>Titular:</strong> António Mayandjo J. Ndala</p>
                <p><strong>IBAN BAI:</strong> <span className="font-mono font-bold">0040 0000 98020995101 26</span></p>
                <p><strong>Xpress / Unitel Money:</strong> <span className="font-mono font-bold">976848444</span></p>
                <p className="pt-1 border-t border-amber-200 font-bold text-emerald-800">
                  Valor a transferir: {PLANS[selectedPlan].kwanzaPrice} ({PLANS[selectedPlan].name})
                </p>
                <div className="pt-2">
                  <a
                    href="https://wa.me/244976848444?text=Olá,%20aqui%20está%20o%20comprovante%20de%20pagamento%20para%20ativação%20da%20conta%20na%20CuneneVagas."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-[11px] transition shadow-xs"
                  >
                    <span>Enviar Comprovante via WhatsApp (976848444)</span>
                  </a>
                </div>
              </div>

              {/* Plan Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Plano Selecionado:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(PLANS) as Array<keyof typeof PLANS>).map((planKey) => {
                    const plan = PLANS[planKey];
                    const isSelected = selectedPlan === planKey;
                    return (
                      <button
                        key={planKey}
                        type="button"
                        onClick={() => setSelectedPlan(planKey)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition text-center gap-0.5 cursor-pointer ${
                          isSelected ? 'border-[#0F4C9C] bg-blue-50/50 text-[#0F4C9C]' : 'border-slate-100 text-slate-600'
                        }`}
                      >
                        <span className="text-xs font-black">{plan.name}</span>
                        <span className="text-xs font-bold text-slate-900">{plan.kwanzaPrice}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Referência da Transferência / Multicaixa *</label>
                <input
                  type="text"
                  required
                  value={manualReference}
                  onChange={e => setManualReference(e.target.value)}
                  placeholder="Ex: TRF-2026-984512 ou talão Multicaixa"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0F4C9C] bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Observações ou Detalhes (opcional)</label>
                <textarea
                  value={manualProof}
                  onChange={e => setManualProof(e.target.value)}
                  placeholder="Ex: Transferido a partir de conta BAI em nome de..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#0F4C9C] bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
              >
                <Send className="w-4 h-4 text-[#FFC20E]" />
                <span>Enviar Comprovante para Aprovação do Admin</span>
              </button>
            </form>
          ) : (
            <div className="space-y-5">
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
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2 text-[10px] text-slate-400">
          <CreditCard className="w-3.5 h-3.5" />
          <span>CuneneVagas & Marketplace — Segurança Garantida</span>
        </div>
      </div>
    </div>
  );
};
