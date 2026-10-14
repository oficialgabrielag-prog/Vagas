// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { X, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StoreService } from '../lib/store';
import { ProductDetailPage } from '../pages/ProductDetailPage';

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
  const [loading, setLoading] = useState(!initialProduct);

  useEffect(() => {
    let isMounted = true;
    const fetchProduct = async () => {
      const targetId = id || initialProduct?.id;
      if (!targetId) {
        if (isMounted) {
          if (!initialProduct) setNotFound(true);
          setLoading(false);
        }
        return;
      }

      // Se já temos initialProduct, exiba imediatamente e valide em segundo plano
      if (initialProduct && String(initialProduct.id) === String(targetId)) {
        if (isMounted) {
          setProduct(initialProduct);
          setNotFound(false);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      // Tente buscar do cache local primeiro para velocidade e robustez
      let found = null;
      const cache = localStorage.getItem('produtos_cache');
      if (cache) {
        try {
          const parsed = JSON.parse(cache);
          if (Array.isArray(parsed)) {
            found = parsed.find(p => String(p.id) === String(targetId)) || null;
          }
        } catch {}
      }

      if (found) {
        if (isMounted) {
          setProduct(found);
          setNotFound(false);
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

        found = data;

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

        if (isMounted) {
          if (found) {
            setProduct(found);
            setNotFound(false);
          } else {
            setNotFound(true);
          }
        }
      } catch {
        if (isMounted) {
          setNotFound(true);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProduct();

    return () => { isMounted = false; };
  }, [id, initialProduct]);

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white animate-fadeIn">
      <ProductDetailPage
        product={product}
        onBack={onClose}
        currentUser={currentUser}
        companies={companies}
        onSelectCompany={onSelectCompany}
        onOpenAuth={onOpenAuth}
      />
    </div>
  );
};
