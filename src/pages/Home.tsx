import React from 'react';
import { Home as HomeJsx } from './Home.jsx';
import { Job, MarketplaceProduct, CommunityPost, UserProfile } from '../lib/types';

interface HomeProps {
  jobs: Job[];
  products: MarketplaceProduct[];
  posts: CommunityPost[];
  companies: UserProfile[];
  setCurrentTab: (tab: string) => void;
  onSelectJob: (job: Job) => void;
  onSelectCompany: (company: UserProfile) => void;
  onSelectPost?: (post: CommunityPost) => void;
  onSelectProduct?: (product: MarketplaceProduct) => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
}

export const Home: React.FC<HomeProps> = (props) => {
  return <HomeJsx {...(props as any)} />;
};
