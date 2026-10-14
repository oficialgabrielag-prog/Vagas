import { Job, MarketplaceProduct, UserProfile } from './types';

export interface SmartNotification {
  id: string;
  title: string;
  message: string;
  type: 'job' | 'product' | 'system';
  timestamp: string;
  read: boolean;
  linkId?: string;
}

export const RecommendationEngine = {
  // Track user interactions to learn preferences
  trackInteraction(userId: string, type: 'view_job' | 'view_product' | 'search', categoryOrMunicipality: string) {
    if (!userId) return;
    try {
      const key = `cunene_learning_${userId}`;
      const history = JSON.parse(localStorage.getItem(key) || '[]');
      history.unshift({
        type,
        target: categoryOrMunicipality,
        timestamp: new Date().toISOString()
      });
      // Keep last 30 interactions
      localStorage.setItem(key, JSON.stringify(history.slice(0, 30)));
    } catch {}
  },

  // Learn top interests from user history
  getUserInterests(userId: string): { municipalities: string[]; categories: string[] } {
    if (!userId) return { municipalities: [], categories: [] };
    try {
      const key = `cunene_learning_${userId}`;
      const history = JSON.parse(localStorage.getItem(key) || '[]');
      const munCount: Record<string, number> = {};
      const catCount: Record<string, number> = {};

      history.forEach((h: any) => {
        if (h.type === 'search' || h.type === 'view_job') {
          munCount[h.target] = (munCount[h.target] || 0) + 1;
        }
        if (h.type === 'view_product') {
          catCount[h.target] = (catCount[h.target] || 0) + 1;
        }
      });

      return {
        municipalities: Object.keys(munCount).sort((a, b) => munCount[b] - munCount[a]),
        categories: Object.keys(catCount).sort((a, b) => catCount[b] - catCount[a])
      };
    } catch {
      return { municipalities: [], categories: [] };
    }
  },

  // Recommend jobs based on learning, municipality match, and profession
  getRecommendedJobs(currentUser: UserProfile | null, jobs: Job[]): Job[] {
    if (!jobs || jobs.length === 0) return [];
    const userMun = currentUser?.municipality || 'Ondjiva';
    const userProfession = (currentUser?.profession || currentUser?.industry || '').toLowerCase();
    const interests = currentUser ? this.getUserInterests(currentUser.id) : { municipalities: [], categories: [] };

    const scored = jobs.map(job => {
      let score = 0;
      // Exact municipality match
      if (job.municipality === userMun) score += 10;
      else if (interests.municipalities.includes(job.municipality)) score += 5;

      // Profession / title keyword match
      if (userProfession && job.title.toLowerCase().includes(userProfession)) score += 8;

      // Freshness bonus (recent jobs)
      const daysOld = (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysOld <= 3) score += 4;
      else if (daysOld <= 7) score += 2;

      return { job, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.job);
  },

  // Recommend marketplace products based on user municipality and category interests
  getRecommendedProducts(currentUser: UserProfile | null, products: MarketplaceProduct[]): MarketplaceProduct[] {
    if (!products || products.length === 0) return [];
    const userMun = currentUser?.municipality || 'Ondjiva';
    const interests = currentUser ? this.getUserInterests(currentUser.id) : { municipalities: [], categories: [] };

    const scored = products.map(prod => {
      let score = 0;
      if (prod.municipality === userMun) score += 10;
      if (interests.categories.includes(prod.category)) score += 8;

      // Freshness bonus
      const daysOld = (Date.now() - new Date(prod.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysOld <= 2) score += 5;

      return { product: prod, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.product);
  },

  // Generate smart contextual notifications
  getSmartNotifications(currentUser: UserProfile | null, jobs: Job[], products: MarketplaceProduct[]): SmartNotification[] {
    if (!currentUser) return [];
    const userMun = currentUser.municipality || 'Ondjiva';
    const notifications: SmartNotification[] = [];

    // Check for recent jobs in user municipality
    const recentLocalJobs = jobs.filter(j => j.municipality === userMun).slice(0, 2);
    recentLocalJobs.forEach((job, idx) => {
      notifications.push({
        id: `notif-job-${job.id || idx}`,
        title: 'Nova Vaga em ' + userMun,
        message: `A vaga "${job.title}" foi publicada recentemente na sua região. Candidate-se já!`,
        type: 'job',
        timestamp: job.created_at || new Date().toISOString(),
        read: false,
        linkId: job.id
      });
    });

    // Check marketplace highlights
    const localProducts = products.filter(p => p.municipality === userMun).slice(0, 1);
    localProducts.forEach((prod, idx) => {
      notifications.push({
        id: `notif-prod-${prod.id || idx}`,
        title: 'Destaque no Marketplace',
        message: `"${prod.title}" está disponível em ${userMun} por ${prod.price?.toLocaleString()} AOA.`,
        type: 'product',
        timestamp: prod.created_at || new Date().toISOString(),
        read: false,
        linkId: prod.id
      });
    });

    // Premium status notice
    if (!currentUser.marketplace_unlocked && currentUser.role === 'employer') {
      notifications.push({
        id: 'notif-premium-reminder',
        title: 'Ative o seu Plano Premium',
        message: 'Desbloqueie publicações ilimitadas no Marketplace e contacto direto com clientes via PayPal.',
        type: 'system',
        timestamp: new Date().toISOString(),
        read: false
      });
    }

    return notifications;
  }
};
