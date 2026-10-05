// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { X, MapPin, ShoppingBag, MessageCircle, Share2, Heart, Store, Calendar, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StoreService } from '../lib/store';

export const ProdutoDetalhe = ({
  product: initialProduct,
  isOpen,
  onClose,
  currentUser,
  companies = [],
  onSelectCompany,
  onOpenAuth
}) => {
  const { id } = useParams();
  const [product, setProduct] = useState(initialProduct || null);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchProduct = async () => {
      setLoading(true);
      const targetId = id || initialProduct?.id;
      if (!targetId) {
        if (isMounted) {
          setNotFound(true);
          setLoading(false);
        }
        return;
      }

      try {
        // Tente buscar da tabela 'produtos' primeiro
        let { data, error } = await supabase
          .from('produtos')
          .select('*, users(company_name)')
          .eq('id', targetId)
          .single();

        let found = data;

        // Se der erro ou não encontrar, busque da tabela real 'marketplace'
        if (!found || error) {
          const { data: mData, error: mError } = await supabase
            .from('marketplace')
            .select('*, profiles(full_name)')
            .eq('id', targetId)
            .single();

          if (mData && !mError) {
            const rawDesc = mData.descricao || mData.description || '';
            let cat = 'Outros';
            let mun = 'Ondjiva';
            let tel = '+244 923 000 000';
            let cleanDesc = rawDesc;

            const metaMatch = rawDesc.match(/<!--META:([\s\S]*?)-->/);
            if (metaMatch) {
              try {
                const parsed = JSON.parse(metaMatch[1]);
                if (parsed.cat) cat = parsed.cat;
                if (parsed.mun) mun = parsed.mun;
                if (parsed.tel) tel = parsed.tel;
                cleanDesc = rawDesc.replace(metaMatch[0], '').trim();
              } catch {}
            }

            found = {
              id: mData.id,
              seller_id: mData.company_id || mData.seller_id || mData.user_id || '',
              company_id: mData.company_id || undefined,
              title: mData.titulo || mData.title || 'Produto',
              description: cleanDesc,
              price: Number(mData.preco || mData.price || 0),
              currency: 'AOA',
              category: cat,
              municipality: mData.municipio || mun,
              contact_phone: mData.telefone || tel,
              image_url: mData.imagem_url || mData.image_url || undefined,
              status: 'available',
              is_active: true,
              created_at: mData.created_at,
              users: {
                company_name: mData.profiles?.full_name || ''
              }
            };
          }
        }

        // Se mesmo assim não achar, use o cache local
        if (!found) {
          const cache = localStorage.getItem('produtos_cache');
          if (cache) {
            try {
              const parsed = JSON.parse(cache);
              if (Array.isArray(parsed)) {
                found = parsed.find(p => String(p.id) === String(targetId)) || null;
              }
            } catch {}
          }
        }

        if (isMounted) {
          if (found) {
            setProduct(found);
            setNotFound(false);
          } else {
            setNotFound(true);
          }
        }
      } catch {
        const cache = localStorage.getItem('produtos_cache');
        let found = null;
        if (cache) {
          try {
            const parsed = JSON.parse(cache);
            if (Array.isArray(parsed)) {
              found = parsed.find(p => String(p.id) === String(targetId)) || null;
            }
          } catch {}
        }
        if (isMounted) {
          if (found) {
            setProduct(found);
            setNotFound(false);
          } else {
            setNotFound(true);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProduct();

    return () => { isMounted = false; };
  }, [id]);

  useEffect(() => {
    if (currentUser && product) {
      StoreService.fetchSavedProducts(currentUser.id).then(ids => {
        setSaved(ids.includes(product.id));
      });
    }
  }, [currentUser, product]);

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center space-y-4 animate-pulse">
          <div className="w-16 h-16 bg-slate-200 rounded-full mx-auto" />
          <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto" />
          <div className="h-3 bg-slate-200 rounded w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Produto não encontrado - faça login</h3>
          <p className="text-xs text-slate-500">O produto pode ter sido removido ou requer autenticação para ser visualizado.</p>
          <div className="flex gap-2 justify-center pt-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
            >
              Fechar
            </button>
            <button
              onClick={() => {
                onClose();
                if (onOpenAuth) onOpenAuth();
              }}
              className="px-5 py-2.5 bg-[#0F4C9C] hover:bg-[#0c3c7d] text-white font-bold text-xs rounded-xl transition shadow-sm"
            >
              Fazer Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const companyNameFromUser = product.users?.company_name;
  const sellerCompany = companies.find(c => c.id === product.seller_id || c.id === product.company_id);
  const displayCompanyName = companyNameFromUser || sellerCompany?.company_name || sellerCompany?.full_name || 'Vendedor Local';

  const handleWhatsAppContact = (phone, title) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) return;
    const message = encodeURIComponent(`Olá, vi o produto "${title}" no CuneneVagas e gostaria de obter mais informações.`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const handleShare = async () => {
    const shareUrl = window.location.origin + '#marketplace/produto/' + product.id;
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: `Confira "${product.title}" por ${product.price?.toLocaleString()} ${product.currency || 'AOA'} no CuneneVagas.`,
          url: shareUrl,
        });
        return;
      } catch {}
    }
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleToggleSave = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    const updated = await StoreService.toggleSaveProductSupabase(currentUser.id, product.id);
    setSaved(updated.includes(product.id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 my-auto max-h-[92vh] flex flex-col">
        {/* Header Bar */}
        <div className="bg-[#0F4C9C] p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#FFC20E]" />
            <h3 className="text-sm font-extrabold">Detalhes do Produto • Marketplace</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Main Image */}
          <div className="w-full h-64 sm:h-80 bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-200">
            {product.image_url ? (
              <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <ShoppingBag className="w-16 h-16" />
              </div>
            )}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm">
              <MapPin className="w-3.5 h-3.5 text-[#0F4C9C]" />
              <span className="text-xs font-black text-slate-800 uppercase">{product.municipality}</span>
            </div>
            <span className={`absolute top-3 right-3 px-3 py-1 rounded-xl text-xs font-bold ${
              product.status === 'available' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-white'
            }`}>
              {product.status === 'available' ? 'Disponível' : 'Esgotado'}
            </span>
          </div>

          {/* Title & Price */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#0F4C9C] uppercase tracking-wider block">{product.category}</span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">{product.title}</h1>
            <p className="text-2xl font-black text-[#0F4C9C]">
              {product.price?.toLocaleString()} {product.currency || 'AOA'}
            </p>
          </div>

          {/* Description */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-1">
            <h4 className="text-xs font-bold text-slate-500 uppercase">Descrição do Produto</h4>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {product.description || 'Nenhuma descrição detalhada fornecida pelo vendedor.'}
            </p>
          </div>

          {/* Publication Date */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>Publicado a {product.created_at ? new Date(product.created_at).toLocaleDateString('pt-AO') : 'Recente'}</span>
          </div>

          {/* Vendor / Company Card */}
          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white p-1 shadow-xs border border-slate-200 overflow-hidden shrink-0">
                {sellerCompany?.avatar_url ? (
                  <img src={sellerCompany.avatar_url} alt="Logo" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <Store className="w-6 h-6 text-[#0F4C9C] m-auto mt-2" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{displayCompanyName}</h4>
                <p className="text-xs text-slate-500">{sellerCompany?.industry || 'Comércio Local'} • 📍 {sellerCompany?.municipality || 'Cunene'}</p>
              </div>
            </div>

            {sellerCompany && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onSelectCompany) onSelectCompany(sellerCompany);
                }}
                className="bg-white hover:bg-slate-100 text-[#0F4C9C] border border-[#0F4C9C] font-bold px-4 py-2 rounded-xl text-xs transition shadow-2xs"
              >
                Ver Loja da Empresa
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSave}
              className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                saved ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Guardar produto"
            >
              <Heart className={`w-4 h-4 ${saved ? 'fill-red-600' : ''}`} />
              <span className="hidden sm:inline">{saved ? 'Guardado' : 'Guardar'}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition flex items-center gap-1.5"
              title="Partilhar produto"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
              <span>{copied ? 'Copiado!' : 'Partilhar'}</span>
            </button>
          </div>

          {product.contact_phone ? (
            <button
              type="button"
              onClick={() => handleWhatsAppContact(product.contact_phone, product.title)}
              className="bg-[#25D366] hover:bg-[#128C7E] text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition shadow-sm flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Contactar Vendedor (WhatsApp)</span>
            </button>
          ) : (
            <span className="text-xs italic text-slate-400">Este vendedor ainda não disponibilizou contacto directo.</span>
          )}
        </div>
      </div>
    </div>
  );
};
