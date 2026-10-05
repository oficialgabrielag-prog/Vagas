import React from 'react';
import { MarketplaceProduct, UserProfile } from '../lib/types';
import { ProdutoDetalhe } from './ProdutoDetalhe';

interface ProductDetailModalProps {
  product: MarketplaceProduct | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  companies: UserProfile[];
  onSelectCompany: (company: UserProfile) => void;
  onOpenAuth: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = (props) => {
  return <ProdutoDetalhe {...(props as any)} />;
};

export { ProdutoDetalhe };
