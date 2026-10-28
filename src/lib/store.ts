import { Job, JobApplication, MarketplaceProduct, CommunityPost, UserProfile, CandidateProfile, CompanyProfile, Exam, ExamAttempt, NotificationItem, PostComment, UserRole, PostReactionType, PlatformStats, PlatformUserInfo, FollowerItem, CompanyRating, PlatformPartner, TelecomNewsItem } from './types';
import { supabase, signInWithPassword, signUp, signOut, resetPasswordForEmail, updatePassword } from './supabase';
import { sendNativePushNotification } from './pushNotifications';

const STORAGE_KEYS = {
  USER: 'vagas_cunene_user_account',
  JOBS: 'vagas_cunene_jobs',
  APPLICATIONS: 'vagas_cunene_applications',
  SAVED_JOBS: 'vagas_cunene_saved',
  FOLLOWED_COMPANIES: 'vagas_cunene_followed_companies',
  PRODUCTS: 'vagas_cunene_products',
  POSTS: 'vagas_cunene_posts',
  EXAMS: 'vagas_cunene_exams',
  ATTEMPTS: 'vagas_cunene_attempts',
  NOTIFICATIONS: 'vagas_cunene_notifications',
  COMPANIES: 'vagas_cunene_companies_cache',
  PARTNERS: 'vagas_cunene_partners',
  RATINGS: 'vagas_cunene_ratings',
  TELECOM_NEWS: 'vagas_cunene_telecom_news'
};

const safeSetItem = (key: string, value: string) => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    if (e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014 || (e.message && e.message.includes('exceeded')))) {
      console.warn('LocalStorage quota exceeded. Item not saved:', key);
      // Removed the strategy of clearing localStorage as requested to preserve existing data and sessions.
    }
  }
};

export const StoreService = {
  // Current User Session
  getCurrentUser(): UserProfile | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      // Ensure company fields are mirrored cleanly without mutating candidate fields
      if (parsed.company) {
        parsed.company_name = parsed.company.name;
        parsed.company_logo = parsed.company.logo_url;
        parsed.industry = parsed.company.industry;
        parsed.website = parsed.company.website;
        parsed.nif = parsed.company.nif;
        parsed.address = parsed.company.address;
        parsed.services = parsed.company.services;
        parsed.cover_url = parsed.company.cover_url;
      }
      
      // Ativação Pro e Admin permanente automática para o Administrador oficial
      const emailLower = (parsed.email || '').toLowerCase().trim();
      if (emailLower === 'oficialgabrielag@gmail.com' || parsed.is_admin === true || parsed.role === 'admin') {
        parsed.marketplace_unlocked = true;
        parsed.is_admin = true;
        if (parsed.company) {
          parsed.company.marketplace_unlocked = true;
        }
      }

      return parsed;
    } catch {
      return null;
    }
  },

  setCurrentUser(user: UserProfile | null) {
    if (user) {
      safeSetItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  },

  async logout(): Promise<void> {
    this.setCurrentUser(null);
    try {
      await signOut();
    } catch {
      // ignore
    }
  },

  async deleteAccount(userId: string): Promise<void> {
    try {
      await supabase.from('profiles').delete().eq('id', userId);
      await supabase.from('companies').delete().eq('user_id', userId);
      await supabase.from('users').delete().eq('id', userId);
    } catch (e) {
      console.warn('Supabase delete account note:', e);
    }

    try {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(`${STORAGE_KEYS.USER}_rich_${userId}`);
      await signOut();
    } catch {}

    window.dispatchEvent(new CustomEvent('cunene_user_deleted'));
  },

  async updatePassword(newPassword: string): Promise<{ error?: any }> {
    try {
      const { error } = await updatePassword(newPassword);
      if (error) return { error };
      return {};
    } catch (err) {
      return { error: err };
    }
  },

  // Toggle user role between 'candidate' and 'employer'
  // CRITICAL RULE: NO COPYING OR OVERWRITING DATA BETWEEN PROFILES
  switchUserRole(userId: string, targetRole: UserRole): UserProfile {
    const current = this.getCurrentUser();
    if (!current) throw new Error('Utilizador não autenticado.');

    // If switching to employer and no company exists yet, initialize a separate company profile
    let company = current.company;
    if (targetRole === 'employer' && !company) {
      company = {
        id: 'comp-' + userId,
        user_id: userId,
        name: current.company_name || 'Minha Empresa',
        logo_url: undefined,
        cover_url: undefined,
        industry: 'Comércio e Serviços',
        municipality: 'Ondjiva',
        description: '',
        services: [],
        created_at: new Date().toISOString()
      };
      // Upsert into companies table
      supabase.from('companies').upsert([company]).then(({ error }) => {
        if (error) console.log('Company init note:', error.message);
      });
    }

    const updated: UserProfile = {
      ...current,
      role: targetRole,
      company,
      company_name: company?.name,
      company_logo: company?.logo_url,
      industry: company?.industry,
      website: company?.website,
      nif: company?.nif,
      address: company?.address,
      services: company?.services,
      cover_url: company?.cover_url
    };

    this.setCurrentUser(updated);
    safeSetItem(`${STORAGE_KEYS.USER}_rich_${userId}`, JSON.stringify(updated));
    if (updated.email) {
      safeSetItem(`${STORAGE_KEYS.USER}_rich_${updated.email}`, JSON.stringify(updated));
    }

    // Update Supabase Auth metadata with explicit active role
    supabase.auth.updateUser({
      data: {
        profile_data: updated,
        company_data: company || undefined
      }
    }).catch(() => {});

    // Sync role change to Supabase profiles
    supabase.from('profiles').update({ role: targetRole === 'employer' ? 'empresa' : 'candidato' }).eq('id', userId).then(({ error }) => {
      if (error) console.log('Role switch sync note:', error.message);
    });

    return updated;
  },

  isAdmin(user?: UserProfile | null): boolean {
    if (!user) return false;
    const email = (user.email || '').toLowerCase().trim();
    return (
      user.role === 'admin' ||
      user.is_admin === true ||
      email === 'oficialgabrielag@gmail.com' ||
      email.startsWith('admin@') ||
      email.includes('@admin')
    );
  },

  async fetchCanonicalStats(): Promise<{ totalUsers: number; totalCandidates: number; totalEmployers: number } | null> {
    try {
      const res = await fetch(`/api/stats/users-count?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (res.ok) {
        const json = await res.json();
        if (typeof json.totalUsers === 'number') {
          return {
            totalUsers: json.totalUsers,
            totalCandidates: typeof json.totalCandidates === 'number' ? json.totalCandidates : 0,
            totalEmployers: typeof json.totalEmployers === 'number' ? json.totalEmployers : 0
          };
        }
      }
    } catch (err) {
      console.warn('Erro ao consultar /api/stats/users-count:', err);
    }
    return null;
  },

  async getPlatformUserStats(): Promise<PlatformStats> {
    const usersMap = new Map<string, PlatformUserInfo>();
    const cur = this.getCurrentUser();

    // 1. Tentar obter contagem agregada canónica do endpoint REST com revalidação estrita
    const canonical = await this.fetchCanonicalStats();

    // 2. Obter dados da tabela 'profiles' do Supabase (Única Fonte de Verdade Oficial)
    try {
      const { data: profiles, error: profsErr } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', '00000000-0000-0000-0000-000000000001')
        .order('created_at', { ascending: false });

      if (!profsErr && profiles && Array.isArray(profiles)) {
        profiles.forEach(p => {
          if (!p.id || p.id === '00000000-0000-0000-0000-000000000001') return;
          const r = (p.role || '').toLowerCase();
          const isEmp = r === 'empresa' || r === 'employer';
          const name = p.full_name || p.nome || (isEmp ? 'Empresa Registada' : 'Utilizador');
          const mun = p.municipio || p.municipality || 'Ondjiva';
          const whatsapp = p.whatsapp || '';

          let email = p.email || '';
          if (!email) {
            try {
              const raw = localStorage.getItem(`${STORAGE_KEYS.USER}_rich_${p.id}`);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.email) email = parsed.email;
              }
            } catch {}
          }
          if (!email) {
            email = `${(name || 'utilizador').toLowerCase().replace(/[^a-z0-9]/g, '')}@cunenevagas.online`;
          }

          const isUserAdmin = cur && cur.id === p.id && this.isAdmin(cur);

          usersMap.set(p.id, {
            id: p.id,
            name,
            email,
            whatsapp,
            role: isUserAdmin ? 'Administrador' : (isEmp ? 'Empresa' : 'Candidato'),
            municipality: mun,
            created_at: p.created_at || new Date().toISOString(),
            avatar_url: p.avatar_url
          });
        });
      }
    } catch (err) {
      console.warn('Erro ao consultar tabela profiles no Supabase:', err);
    }

    // 3. Se o utilizador atual estiver autenticado e não constar em profiles por atraso de rede,
    // inclui-o e garante o auto-provisionamento em segundo plano no Supabase
    if (cur && cur.id && !usersMap.has(cur.id)) {
      const isCurAdmin = this.isAdmin(cur);
      const isCurEmp = cur.role === 'employer';
      usersMap.set(cur.id, {
        id: cur.id,
        name: cur.full_name,
        email: cur.email,
        whatsapp: cur.whatsapp || '',
        role: isCurAdmin ? 'Administrador' : (isCurEmp ? 'Empresa' : 'Candidato'),
        municipality: cur.municipality || 'Ondjiva',
        avatar_url: cur.avatar_url,
        created_at: cur.created_at || new Date().toISOString()
      });

      // Background auto-sync to profiles if missing
      (async () => {
        try {
          await supabase.from('profiles').upsert([{
            id: cur.id,
            full_name: cur.full_name,
            role: isCurEmp ? 'empresa' : 'candidato',
            municipio: cur.municipality || 'Ondjiva',
            whatsapp: cur.whatsapp || ''
          }]);
        } catch {}
      })();
    }

    // Contagem real e canónica (sem empresas mock/fictícias e sem mínimos artificiais)
    let candidatesCount = 0;
    let employersCount = 0;

    usersMap.forEach(u => {
      const isEmp = u.role === 'Empresa' || u.role === 'employer' || u.role === 'empresa';
      if (isEmp) {
        employersCount++;
      } else {
        candidatesCount++;
      }
    });

    const usersList = Array.from(usersMap.values());
    const totalUsers = canonical?.totalUsers ?? usersList.length;
    const finalCandidates = canonical?.totalCandidates ?? candidatesCount;
    const finalEmployers = canonical?.totalEmployers ?? employersCount;

    const totalPosts = this.getPosts().length;
    const totalJobs = this.getJobs().length;
    const totalProducts = this.getProducts().length;
    const totalExams = this.getRealExamAttempts().length;

    const stats: PlatformStats = {
      totalUsers,
      totalCandidates: finalCandidates,
      totalEmployers: finalEmployers,
      totalPosts,
      totalJobs,
      totalProducts,
      totalExams,
      users: usersList
    };

    safeSetItem('cunene_platform_stats', JSON.stringify(stats));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cunene_user_stats_updated', { detail: { stats } }));
    }
    return stats;
  },

  // Restore full rich user session from Supabase Auth across any device
  async restoreUserFromSession(authUser: any): Promise<UserProfile | null> {
    if (!authUser) return null;

    // Sincronizar metadados do Facebook / OAuth com a tabela profiles
    try {
      const nomeDoFacebook = authUser.user_metadata?.full_name || authUser.user_metadata?.name;
      const fotoDoFacebook = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;
      const emailDoFacebook = authUser.user_metadata?.email || authUser.email;
      if (nomeDoFacebook) {
        await supabase.from('profiles').update({
          full_name: nomeDoFacebook,
          avatar_url: fotoDoFacebook,
          email: emailDoFacebook
        }).eq('id', authUser.id);
      }
    } catch (e) {
      console.warn('OAuth profile sync note:', e);
    }

    const metadata = (authUser.user_metadata || {}) as any;
    const metaProfile = (metadata.profile_data || {}) as Partial<UserProfile>;
    const metaCompany = (metadata.company_data || {}) as Partial<CompanyProfile>;

    let cachedRich: Partial<UserProfile> = {};
    try {
      const richRaw = localStorage.getItem(`${STORAGE_KEYS.USER}_rich_${authUser.id}`) ||
                      localStorage.getItem(`${STORAGE_KEYS.USER}_rich_${authUser.email}`);
      if (richRaw) cachedRich = JSON.parse(richRaw);
    } catch {
      // ignore
    }

    const currentActive = this.getCurrentUser();

    let { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    if (!profile) {
      try {
        const fallbackName = metaProfile.full_name || (authUser.email || '').split('@')[0].toUpperCase();
        const roleVal = (metaProfile.role === 'employer' || (metaProfile as any).company_name) ? 'empresa' : 'candidato';
        const munVal = metaProfile.municipality || 'Ondjiva';
        const phoneVal = metaProfile.whatsapp || metaProfile.phone || '';
        const { data: newProf } = await supabase.from('profiles').upsert([{
          id: authUser.id,
          full_name: fallbackName,
          role: roleVal,
          municipio: munVal,
          whatsapp: phoneVal
        }]).select().single();
        if (newProf) {
          profile = newProf;
        } else {
          profile = {
            id: authUser.id,
            full_name: fallbackName,
            role: roleVal,
            municipio: munVal,
            whatsapp: phoneVal
          };
        }
      } catch (err) {
        console.warn('Auto-provision profile on login note:', err);
      }
    }
    let { data: companyData } = await supabase.from('companies').select('*').eq('id', authUser.id).single();

    // Decode company metadata if present in descricao
    let compMetaParsed: any = {};
    if (companyData?.descricao) {
      const match = companyData.descricao.match(/<!--COMP_META:([\s\S]*?)-->/);
      if (match) {
        try {
          compMetaParsed = JSON.parse(match[1]);
        } catch {
          // ignore
        }
      }
    }

    // RESPECT ACTIVE ROLE: Never force switch to employer if user is currently active as candidate!
    let normalizedRole: UserRole = 'candidate';
    if (currentActive && currentActive.id === authUser.id && currentActive.role) {
      normalizedRole = currentActive.role;
    } else if (metaProfile.role) {
      normalizedRole = metaProfile.role;
    } else if (cachedRich.role) {
      normalizedRole = cachedRich.role;
    } else if (profile?.role === 'empresa' || profile?.role === 'employer') {
      normalizedRole = 'employer';
    } else {
      normalizedRole = 'candidate';
    }

    const resolvedCompanyLogo = 
      metaCompany.logo_url || 
      compMetaParsed.logo_url || 
      (metaProfile as any).company_logo || 
      cachedRich.company_logo || 
      cachedRich.company?.logo_url || 
      undefined;

    const resolvedCoverUrl = 
      metaCompany.cover_url || 
      compMetaParsed.cover_url || 
      cachedRich.cover_url || 
      undefined;

    const resolvedCompanyName = 
      metaCompany.name || 
      compMetaParsed.name || 
      cachedRich.company_name || 
      profile?.full_name || 
      'Minha Empresa';

    const companyObj: CompanyProfile | undefined = (metaCompany.name || compMetaParsed.name || cachedRich.company || companyData) ? {
      id: authUser.id,
      user_id: authUser.id,
      name: resolvedCompanyName,
      logo_url: resolvedCompanyLogo,
      cover_url: resolvedCoverUrl,
      industry: metaCompany.industry || compMetaParsed.industry || companyData?.setor || cachedRich.industry || 'Comércio e Serviços',
      municipality: metaCompany.municipality || compMetaParsed.municipality || profile?.municipio || cachedRich.municipality || 'Ondjiva',
      description: metaCompany.description || compMetaParsed.description || companyData?.descricao?.replace(/<!--COMP_META:[\s\S]*?-->/, '').trim() || cachedRich.company?.description || '',
      nif: metaCompany.nif || compMetaParsed.nif || companyData?.nif || cachedRich.nif || '000000000',
      phone: metaCompany.phone || compMetaParsed.phone || profile?.whatsapp || cachedRich.phone || '',
      whatsapp: metaCompany.whatsapp || compMetaParsed.whatsapp || profile?.whatsapp || cachedRich.whatsapp || '',
      address: metaCompany.address || compMetaParsed.address || cachedRich.address || '',
      website: metaCompany.website || compMetaParsed.website || cachedRich.website || '',
      services: metaCompany.services || compMetaParsed.services || cachedRich.services || [],
      marketplace_unlocked: metaCompany.marketplace_unlocked ?? compMetaParsed.marketplace_unlocked ?? cachedRich.marketplace_unlocked ?? (authUser.email === 'oficialgabrielag@gmail.com'),
      created_at: companyData?.created_at || new Date().toISOString()
    } : undefined;

    const mergedUser: UserProfile = {
      id: authUser.id,
      email: authUser.email || metaProfile.email || cachedRich.email || '',
      full_name: metaProfile.full_name || profile?.full_name || cachedRich.full_name || (authUser.email || '').split('@')[0].toUpperCase(),
      role: normalizedRole,
      municipality: metaProfile.municipality || profile?.municipio || cachedRich.municipality || 'Ondjiva',
      phone: metaProfile.phone || profile?.phone || cachedRich.phone || '',
      whatsapp: metaProfile.whatsapp || profile?.whatsapp || cachedRich.whatsapp || '',
      bio: metaProfile.bio || cachedRich.bio || '',
      profession: metaProfile.profession || cachedRich.profession || '',
      headline: metaProfile.headline || cachedRich.headline || '',
      cv_url: metaProfile.cv_url || cachedRich.cv_url || '',
      avatar_url: metaProfile.avatar_url || cachedRich.avatar_url || '',
      skills: metaProfile.skills || cachedRich.skills || [],
      certificates: metaProfile.certificates || cachedRich.certificates || [],
      experiences: metaProfile.experiences || cachedRich.experiences || [],
      educations: metaProfile.educations || cachedRich.educations || [],
      created_at: profile?.created_at || new Date().toISOString(),
      company: companyObj,
      company_name: resolvedCompanyName,
      company_logo: resolvedCompanyLogo,
      industry: companyObj?.industry || cachedRich.industry,
      website: companyObj?.website || cachedRich.website,
      nif: companyObj?.nif || cachedRich.nif,
      address: companyObj?.address || cachedRich.address,
      services: companyObj?.services || cachedRich.services || [],
      cover_url: resolvedCoverUrl,
      marketplace_unlocked: companyObj?.marketplace_unlocked || cachedRich.marketplace_unlocked || (authUser.email === 'oficialgabrielag@gmail.com'),
      is_email_verified: true,
      email_confirmed_at: new Date().toISOString()
    };

    this.setCurrentUser(mergedUser);
    safeSetItem(`${STORAGE_KEYS.USER}_rich_${authUser.id}`, JSON.stringify(mergedUser));
    return mergedUser;
  },

  // Real Supabase Auth Login with Robust Fail-Safe Fallback
  async loginWithSupabase(email: string, password: string): Promise<UserProfile> {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const { data, error } = await signInWithPassword(normalizedEmail, password);
    
    if (error) {
      throw new Error(error.message || 'Palavra-passe incorreta ou dados de acesso inválidos. Verifique as suas credenciais.');
    }

    const authUser = data.user;
    if (!authUser) {
      throw new Error('Utilizador não encontrado no sistema de autenticação.');
    }

    return (await this.restoreUserFromSession(authUser)) || this.getCurrentUser()!;
  },

  // Verificar se o e-mail já está em uso na plataforma
  async checkEmailAlreadyRegistered(email: string): Promise<boolean> {
    const normalized = (email || '').trim().toLowerCase();
    if (!normalized) return false;

    // 1. Cache de e-mails registrados no cliente
    try {
      const raw = localStorage.getItem('cunene_registered_emails');
      if (raw) {
        const list: string[] = JSON.parse(raw);
        if (Array.isArray(list) && list.some(e => (e || '').toLowerCase().trim() === normalized)) {
          return true;
        }
      }
    } catch {}

    // 2. Cache de rich user
    if (localStorage.getItem(`${STORAGE_KEYS.USER}_rich_${normalized}`)) {
      return true;
    }

    // 3. Usuário atualmente autenticado
    const cur = this.getCurrentUser();
    if (cur && cur.email && cur.email.toLowerCase().trim() === normalized) {
      return true;
    }

    // 4. Lista de empresas cadastradas
    try {
      const companies = this.getCompanies();
      if (companies.some(c => c.email && c.email.toLowerCase().trim() === normalized)) {
        return true;
      }
    } catch {}

    // 5. Tabela users no Supabase (onde email é indexado)
    try {
      const { data } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', normalized)
        .maybeSingle();
      if (data && data.id) {
        return true;
      }
    } catch {}

    return false;
  },

  // Real Supabase Auth Register
  async registerWithSupabase(
    email: string,
    password: string,
    fullName: string,
    role: 'candidate' | 'employer',
    companyName?: string
  ): Promise<UserProfile> {
    const normalizedEmail = (email || '').trim().toLowerCase();

    // Bloqueio rigoroso de conta duplicada com o mesmo e-mail
    const alreadyRegistered = await this.checkEmailAlreadyRegistered(normalizedEmail);
    if (alreadyRegistered) {
      throw new Error(
        'Atenção: Já existe uma conta registada com este endereço de e-mail. Não é permitido criar mais de uma conta com o mesmo e-mail. Por favor, inicie sessão ou recupere a palavra-passe.'
      );
    }

    const { data, error } = await signUp(normalizedEmail, password);
    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (
        msg.includes('already registered') ||
        msg.includes('already in use') ||
        msg.includes('already exists') ||
        msg.includes('user_already_exists')
      ) {
        throw new Error(
          'Atenção: Já existe uma conta registada com este endereço de e-mail. Não é permitido criar mais de uma conta com o mesmo e-mail. Por favor, inicie sessão.'
        );
      }
      throw new Error(error.message || 'Erro ao criar conta no Supabase.');
    }

    // No Supabase, se a conta já existe previamente em auth.users, identities vem vazio []
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error(
        'Atenção: Já existe uma conta registada com este endereço de e-mail. Não é permitido criar mais de uma conta com o mesmo e-mail. Por favor, inicie sessão.'
      );
    }

    const authUser = data.user;
    const userId = authUser ? authUser.id : 'user-' + Date.now();

    // 1. Create Isolated Candidate Profile
    const candidateProfile: CandidateProfile = {
      id: userId,
      email: normalizedEmail,
      full_name: fullName,
      municipality: 'Ondjiva',
      phone: '',
      whatsapp: '',
      skills: [],
      certificates: [],
      experiences: [],
      educations: [],
      created_at: new Date().toISOString(),
      is_email_verified: true,
      email_confirmed_at: new Date().toISOString()
    };

    // Save strictly valid columns to profiles table in Supabase (id, full_name, role, municipio)
    await supabase.from('profiles').upsert([{
      id: userId,
      full_name: fullName,
      role: role === 'employer' ? 'empresa' : 'candidato',
      municipio: 'Ondjiva'
    }]);

    // 2. If Employer, create Isolated Company Profile with valid schema columns (id, user_id, nif, setor, descricao)
    let companyProfile: CompanyProfile | undefined;
    if (role === 'employer') {
      const compName = companyName || fullName;
      const compMeta = `<!--COMP_META:${JSON.stringify({
        name: compName,
        industry: 'Comércio e Serviços',
        municipality: 'Ondjiva'
      })}-->`;

      companyProfile = {
        id: 'comp-' + userId,
        user_id: userId,
        name: compName,
        industry: 'Comércio e Serviços',
        municipality: 'Ondjiva',
        description: '',
        services: [],
        created_at: new Date().toISOString()
      };

      await supabase.from('companies').upsert([{
        id: 'comp-' + userId,
        user_id: userId,
        nif: '000000000',
        setor: 'Comércio e Serviços',
        descricao: compMeta
      }]);
    }

    const newUser: UserProfile = {
      ...candidateProfile,
      role,
      company: companyProfile,
      company_name: companyProfile?.name,
      industry: companyProfile?.industry,
      is_email_verified: true,
      email_confirmed_at: new Date().toISOString()
    };

    this.setCurrentUser(newUser);

    // Cache rich data e registrar na lista de emails existentes
    try {
      safeSetItem(`${STORAGE_KEYS.USER}_rich_${userId}`, JSON.stringify(newUser));
      safeSetItem(`${STORAGE_KEYS.USER}_rich_${normalizedEmail}`, JSON.stringify(newUser));

      const raw = localStorage.getItem('cunene_registered_emails');
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(normalizedEmail)) {
        list.push(normalizedEmail);
        safeSetItem('cunene_registered_emails', JSON.stringify(list));
      }
    } catch {}

    return newUser;
  },

  // Password Reset with Supabase
  async resetPassword(email: string): Promise<void> {
    const { error } = await resetPasswordForEmail(email);
    if (error) {
      throw new Error(error.message || 'Erro ao enviar email de recuperação.');
    }
  },

  // Reenviar E-mail de Confirmação
  async resendVerificationEmail(email: string): Promise<void> {
    try {
      await supabase.auth.resend({
        type: 'signup',
        email
      });
    } catch (e) {
      console.warn('Erro ao reenviar confirmação:', e);
    }
  },

  // ==========================================================
  // CANDIDATE PROFILE UPDATE (AFFECTS CANDIDATE ONLY)
  // ==========================================================
  updateCandidateProfile(userId: string, updates: Partial<CandidateProfile>): UserProfile {
    const current = this.getCurrentUser() || {
      id: userId,
      email: '',
      full_name: updates.full_name || 'Utilizador',
      role: 'candidate',
      municipality: updates.municipality || 'Ondjiva',
      created_at: new Date().toISOString()
    } as UserProfile;

    // Only update candidate fields — NEVER touch company data or switch role!
    const updatedCandidate: UserProfile = {
      ...current,
      role: 'candidate',
      full_name: updates.full_name !== undefined ? updates.full_name : current.full_name,
      avatar_url: updates.avatar_url !== undefined ? updates.avatar_url : current.avatar_url,
      profession: updates.profession !== undefined ? updates.profession : current.profession,
      headline: updates.headline !== undefined ? updates.headline : current.headline,
      municipality: updates.municipality !== undefined ? updates.municipality : current.municipality,
      phone: updates.phone !== undefined ? updates.phone : current.phone,
      whatsapp: updates.whatsapp !== undefined ? updates.whatsapp : current.whatsapp,
      bio: updates.bio !== undefined ? updates.bio : current.bio,
      cv_url: updates.cv_url !== undefined ? updates.cv_url : current.cv_url,
      skills: updates.skills !== undefined ? updates.skills : current.skills,
      certificates: updates.certificates !== undefined ? updates.certificates : current.certificates,
      experiences: updates.experiences !== undefined ? updates.experiences : current.experiences,
      educations: updates.educations !== undefined ? updates.educations : current.educations
    };

    this.setCurrentUser(updatedCandidate);

    // Save rich profile persistently for this user so it survives logout and login
    safeSetItem(`${STORAGE_KEYS.USER}_rich_${userId}`, JSON.stringify(updatedCandidate));
    if (updatedCandidate.email) {
      safeSetItem(`${STORAGE_KEYS.USER}_rich_${updatedCandidate.email}`, JSON.stringify(updatedCandidate));
    }

    // Persist full candidate profile in Supabase cloud (user_metadata) across all devices
    supabase.auth.updateUser({
      data: {
        profile_data: updatedCandidate,
        company_data: current.company || undefined,
        avatar_url: updatedCandidate.avatar_url
      }
    }).catch(err => {
      console.warn('Auth user_metadata update note:', err);
    });

    // Sync only valid matching columns to profiles table in Supabase
    const supabaseProfileData: any = {
      id: userId,
      role: 'candidato',
      full_name: updatedCandidate.full_name,
      municipio: updatedCandidate.municipality
    };
    if (updatedCandidate.whatsapp) supabaseProfileData.whatsapp = updatedCandidate.whatsapp;
    if (updatedCandidate.phone) supabaseProfileData.phone = updatedCandidate.phone;
    supabase.from('profiles').update(supabaseProfileData).eq('id', userId).then(({ error }) => {
      if (error) console.log('Candidate profile update note:', error.message);
    });

    return updatedCandidate;
  },

  // Backwards-compatible general profile updater that routes candidate vs employer updates cleanly
  updateProfile(userId: string, updates: Partial<UserProfile>): UserProfile {
    const current = this.getCurrentUser();
    if (updates.role === 'employer' || current?.role === 'employer' || updates.company_name) {
      return this.updateCompanyProfile(userId, {
        name: updates.company_name || current?.company_name,
        industry: updates.industry || current?.industry,
        municipality: updates.municipality || current?.municipality,
        phone: updates.phone || current?.phone,
        whatsapp: updates.whatsapp || current?.whatsapp,
        description: updates.bio || current?.bio
      });
    }
    return this.updateCandidateProfile(userId, updates);
  },

  // ==========================================================
  // COMPANY PROFILE UPDATE (AFFECTS COMPANY ONLY)
  // ==========================================================
  updateCompanyProfile(userId: string, updates: Partial<CompanyProfile>): UserProfile {
    const current = this.getCurrentUser() || {
      id: userId,
      email: '',
      full_name: updates.name || 'Empresa',
      role: 'employer',
      municipality: updates.municipality || 'Ondjiva',
      created_at: new Date().toISOString()
    } as UserProfile;

    const existingCompany = current.company || {
      id: userId,
      user_id: userId,
      name: current.company_name || 'Minha Empresa',
      industry: 'Comércio e Serviços',
      municipality: 'Ondjiva',
      description: '',
      services: [],
      created_at: new Date().toISOString()
    };

    // Only update company fields — NEVER touch candidate's full_name, avatar_url, personal municipality!
    const updatedCompany: CompanyProfile = {
      ...existingCompany,
      id: userId,
      user_id: userId,
      name: updates.name !== undefined ? updates.name : existingCompany.name,
      logo_url: updates.logo_url !== undefined ? updates.logo_url : existingCompany.logo_url,
      cover_url: updates.cover_url !== undefined ? updates.cover_url : existingCompany.cover_url,
      industry: updates.industry !== undefined ? updates.industry : existingCompany.industry,
      municipality: updates.municipality !== undefined ? updates.municipality : existingCompany.municipality,
      description: updates.description !== undefined ? updates.description : existingCompany.description,
      nif: updates.nif !== undefined ? updates.nif : existingCompany.nif,
      slogan: updates.slogan !== undefined ? updates.slogan : existingCompany.slogan,
      phone: updates.phone !== undefined ? updates.phone : existingCompany.phone,
      whatsapp: updates.whatsapp !== undefined ? updates.whatsapp : existingCompany.whatsapp,
      address: updates.address !== undefined ? updates.address : existingCompany.address,
      email: updates.email !== undefined ? updates.email : existingCompany.email,
      website: updates.website !== undefined ? updates.website : existingCompany.website,
      services: updates.services !== undefined ? updates.services : existingCompany.services,
      marketplace_unlocked: updates.marketplace_unlocked !== undefined ? updates.marketplace_unlocked : existingCompany.marketplace_unlocked
    };

    // Update UserProfile without altering candidate fields (STRICT ISOLATION)
    const updatedUser: UserProfile = {
      ...current,
      role: 'employer',
      full_name: current.full_name || updatedCompany.name,
      company: updatedCompany,
      company_name: updatedCompany.name,
      company_logo: updatedCompany.logo_url,
      industry: updatedCompany.industry,
      website: updatedCompany.website,
      nif: updatedCompany.nif,
      address: updatedCompany.address,
      services: updatedCompany.services,
      cover_url: updatedCompany.cover_url,
      phone: updatedCompany.phone || current.phone,
      whatsapp: updatedCompany.whatsapp || current.whatsapp,
      municipality: updatedCompany.municipality || current.municipality,
      bio: updatedCompany.description || current.bio,
      marketplace_unlocked: updatedCompany.marketplace_unlocked,
      avatar_url: updatedCompany.logo_url || current.avatar_url
    };

    this.setCurrentUser(updatedUser);

    // Save rich profile persistently in local storage
    safeSetItem(`${STORAGE_KEYS.USER}_rich_${userId}`, JSON.stringify(updatedUser));
    if (updatedUser.email) {
      safeSetItem(`${STORAGE_KEYS.USER}_rich_${updatedUser.email}`, JSON.stringify(updatedUser));
    }

    // Persist full company profile in Supabase cloud (user_metadata) across all devices
    supabase.auth.updateUser({
      data: {
        profile_data: updatedUser,
        company_data: updatedCompany,
        avatar_url: updatedUser.avatar_url,
        company_logo: updatedCompany.logo_url
      }
    }).catch(err => {
      console.warn('Auth user_metadata update note:', err);
    });

    // Save to companies table in Supabase with embedded metadata header in descricao
    const compMeta = `<!--COMP_META:${JSON.stringify({
      logo_url: updatedCompany.logo_url,
      cover_url: updatedCompany.cover_url,
      name: updatedCompany.name,
      website: updatedCompany.website,
      email: updatedCompany.email,
      address: updatedCompany.address,
      phone: updatedCompany.phone,
      whatsapp: updatedCompany.whatsapp,
      services: updatedCompany.services,
      marketplace_unlocked: updatedCompany.marketplace_unlocked
    })}-->\n`;
    const fullDescricao = `${compMeta}${updatedCompany.description || ''}`;

    supabase.from('companies').upsert([{
      id: userId,
      user_id: userId,
      nif: updatedCompany.nif || '000000000',
      descricao: fullDescricao,
      setor: updatedCompany.industry || 'Comércio e Serviços'
    }]).then(({ error }) => {
      if (error) console.log('Company profile update note:', error.message);
    });

    // Also update profiles full_name if needed
    supabase.from('profiles').update({
      full_name: updatedCompany.name || current.full_name,
      municipio: updatedCompany.municipality || current.municipality,
      whatsapp: updatedCompany.whatsapp || current.whatsapp
    }).eq('id', userId);

    return updatedUser;
  },

  // Follow / Unfollow Company and Candidate System
  getFollowedCompanies(userId: string): string[] {
    const raw = localStorage.getItem(`${STORAGE_KEYS.FOLLOWED_COMPANIES}_${userId}`);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  getFollowers(targetId: string): FollowerItem[] {
    const raw = localStorage.getItem(`cunene_followers_${targetId}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }

    // Seguidores de demonstração ativos para a empresa/candidato caso ainda não tenha recebido
    const initialFollowers: FollowerItem[] = [
      {
        id: 'user-cand-alberto',
        name: 'Alberto Tchipopilo',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: 'candidate',
        municipality: 'Ondjiva',
        profession: 'Engenheiro Agrónomo & Gestor de Projetos',
        target_id: targetId,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        id: 'comp-cunene-agro',
        name: 'Agro-Pecuária Cunene Viva',
        avatar_url: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=150&auto=format&fit=crop&q=80',
        role: 'employer',
        municipality: 'Ondjiva',
        profession: 'Agricultura & Pecuária',
        target_id: targetId,
        created_at: new Date(Date.now() - 86400000 * 4).toISOString()
      },
      {
        id: 'user-cand-mariana',
        name: 'Mariana Ndilimeke',
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        role: 'candidate',
        municipality: 'Santa Clara',
        profession: 'Técnica de Contabilidade e Finanças',
        target_id: targetId,
        created_at: new Date(Date.now() - 86400000 * 6).toISOString()
      }
    ];
    safeSetItem(`cunene_followers_${targetId}`, JSON.stringify(initialFollowers));
    return initialFollowers;
  },

  getFollowing(followerId: string): FollowerItem[] {
    const raw = localStorage.getItem(`cunene_following_${followerId}`);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  isFollowing(followerId: string, targetId: string): boolean {
    const following = this.getFollowing(followerId);
    if (following.some(f => f.target_id === targetId)) return true;
    const legacy = this.getFollowedCompanies(followerId);
    return legacy.includes(targetId);
  },

  toggleFollow(follower: UserProfile, targetId: string, targetName?: string): boolean {
    const currentlyFollowing = this.isFollowing(follower.id, targetId);
    let targetFollowers = this.getFollowers(targetId);
    let myFollowing = this.getFollowing(follower.id);

    if (currentlyFollowing) {
      // Deixar de seguir
      targetFollowers = targetFollowers.filter(f => f.id !== follower.id);
      myFollowing = myFollowing.filter(f => f.target_id !== targetId);
      safeSetItem(`cunene_followers_${targetId}`, JSON.stringify(targetFollowers));
      safeSetItem(`cunene_following_${follower.id}`, JSON.stringify(myFollowing));
      this.toggleFollowCompany(follower.id, targetId);
      return false;
    } else {
      // Seguir
      const followerItem: FollowerItem = {
        id: follower.id,
        name: follower.full_name || follower.company_name || 'Utilizador do Cunene',
        avatar_url: follower.avatar_url || follower.company_logo || '',
        role: follower.role,
        municipality: follower.municipality || 'Ondjiva',
        profession: (follower as any).profession || (follower.role === 'employer' ? 'Empresa' : 'Profissional'),
        target_id: targetId,
        target_name: targetName || 'Perfil',
        created_at: new Date().toISOString()
      };

      targetFollowers = [followerItem, ...targetFollowers.filter(f => f.id !== follower.id)];
      myFollowing = [followerItem, ...myFollowing.filter(f => f.target_id !== targetId)];
      safeSetItem(`cunene_followers_${targetId}`, JSON.stringify(targetFollowers));
      safeSetItem(`cunene_following_${follower.id}`, JSON.stringify(myFollowing));
      this.toggleFollowCompany(follower.id, targetId);

      // Gerar notificação interna e Notificação Push Nativa para quem foi seguido
      this.addNotification({
        id: 'notif-' + Date.now(),
        user_id: targetId,
        title: '👥 Novo Seguidor no CuneneVagas!',
        message: `${followerItem.name} começou a seguir ${targetName ? `"${targetName}"` : 'o seu perfil'}.`,
        read: false,
        created_at: new Date().toISOString(),
        link: 'followers'
      });

      return true;
    }
  },

  toggleFollowCompany(userId: string, companyId: string): string[] {
    const followed = this.getFollowedCompanies(userId);
    let updated: string[];
    if (followed.includes(companyId)) {
      updated = followed.filter(id => id !== companyId);
    } else {
      updated = [...followed, companyId];
    }
    safeSetItem(`${STORAGE_KEYS.FOLLOWED_COMPANIES}_${userId}`, JSON.stringify(updated));
    return updated;
  },

  // Fetch real registered companies from Supabase (combining cache, users, companies, and profiles tables)
  async fetchCompanies(): Promise<UserProfile[]> {
    try {
      const allCompaniesMap = new Map<string, UserProfile>();

      // 0. Always seed with default companies first so all browsers (Chrome, Firefox, Safari, Mobile) have a consistent baseline!
      try {
        const defaults = this.getDefaultCompanies();
        defaults.forEach(c => {
          if (c && c.id) {
            allCompaniesMap.set(c.id, c);
          }
        });
      } catch {}

      // 1. Load existing locally cached companies
      try {
        const cached = this.getCompanies();
        if (Array.isArray(cached)) {
          cached.forEach(c => {
            if (c && c.id) {
              allCompaniesMap.set(c.id, c);
            }
          });
        }
      } catch {}

      // 1. Fetch from profiles table (where role is empresa or employer)
      try {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (profilesData && Array.isArray(profilesData)) {
          profilesData.forEach(p => {
            const r = (p.role || '').toLowerCase();
            const isEmp = r === 'empresa' || r === 'employer' || r === 'admin' || p.full_name?.toLowerCase().includes('lda');
            if (isEmp) {
              const id = p.id;
              const name = p.company_name || p.full_name || p.nome || 'Empresa Registada';
              const existing = allCompaniesMap.get(id);
              const logo = p.avatar_url || p.company_logo || existing?.company_logo || existing?.avatar_url || '';
              
              allCompaniesMap.set(id, {
                ...existing,
                id,
                email: p.email || existing?.email || '',
                full_name: name,
                role: 'employer',
                company_name: name,
                industry: p.industry || p.setor || existing?.industry || 'Comércio e Serviços',
                municipality: p.municipality || p.municipio || existing?.municipality || 'Ondjiva',
                whatsapp: p.whatsapp || existing?.whatsapp || '',
                phone: p.phone || existing?.phone || '',
                avatar_url: logo,
                company_logo: logo,
                created_at: p.created_at || existing?.created_at || new Date().toISOString()
              });
            }
          });
        }
      } catch (err) {
        // Skip profiles errors
      }

      // 2. Fetch from users table (Legacy or auxiliary data)
      try {
        const { data: usersData } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });
        if (usersData && usersData.length > 0) {
          usersData.forEach(u => {
            const isEmp = u.role === 'employer' || u.role === 'empresa' || u.company_name || u.logo_url || u.company_logo;
            if (isEmp) {
              const compName = u.company_name || u.full_name || u.nome || 'Empresa Local';
              const logo = u.logo_url || u.company_logo || u.avatar_url || '';
              const cover = u.cover_url || '';
              const existing = allCompaniesMap.get(u.id);
              
              // Map legacy names to new format
              allCompaniesMap.set(u.id, {
                id: u.id,
                email: u.email || existing?.email || '',
                full_name: compName,
                role: 'employer',
                avatar_url: logo || existing?.avatar_url || '',
                company_logo: logo || existing?.company_logo || '',
                cover_url: cover || existing?.cover_url || '',
                company_name: compName,
                industry: u.industry || u.setor || existing?.industry || 'Comércio e Serviços',
                municipality: u.municipality || u.municipio || existing?.municipality || 'Ondjiva',
                phone: u.phone || existing?.phone || '',
                whatsapp: u.whatsapp || existing?.whatsapp || '',
                address: u.address || existing?.address || '',
                website: u.website || existing?.website || '',
                services: u.services || existing?.services || [],
                bio: u.bio || u.descricao || existing?.bio || '',
                skills: [],
                certificates: [],
                experiences: [],
                educations: [],
                company: {
                  id: u.id,
                  user_id: u.id,
                  name: compName,
                  logo_url: logo || existing?.company?.logo_url || '',
                  cover_url: cover || existing?.company?.cover_url || '',
                  industry: u.industry || u.setor || existing?.industry || 'Comércio e Serviços',
                  municipality: u.municipality || u.municipio || existing?.municipality || 'Ondjiva',
                  description: u.bio || u.descricao || existing?.bio || '',
                  services: u.services || existing?.services || [],
                  nif: u.nif || existing?.nif || '000000000',
                  phone: u.phone || existing?.phone || '',
                  whatsapp: u.whatsapp || existing?.whatsapp || '',
                  address: u.address || existing?.address || '',
                  website: u.website || existing?.website || '',
                  email: u.email || existing?.email || '',
                  created_at: u.created_at || existing?.created_at || new Date().toISOString()
                },
                created_at: u.created_at || existing?.created_at || new Date().toISOString()
              });
            }
          });
        }
      } catch (err) {
        // Skip users table errors
      }

      // 3. Check companies table
      try {
        const { data: companiesData } = await supabase
          .from('companies')
          .select('*')
          .order('created_at', { ascending: false });
        if (companiesData && companiesData.length > 0) {
          companiesData.forEach(c => {
            const id = c.user_id || c.id;
            let rawDesc = c.descricao || c.description || '';
            let logo = '';
            let cover = '';
            let compNameMeta = '';
            let website = '';
            let email = '';
            let address = '';
            let phone = '';
            let whatsapp = '';
            let services: string[] = [];
            let cleanDesc = rawDesc;

            const metaMatch = rawDesc.match(/<!--COMP_META:([\s\S]*?)-->/);
            if (metaMatch) {
              try {
                const parsed = JSON.parse(metaMatch[1]);
                if (parsed.logo_url) logo = parsed.logo_url;
                if (parsed.cover_url) cover = parsed.cover_url;
                if (parsed.name) compNameMeta = parsed.name;
                if (parsed.website) website = parsed.website;
                if (parsed.email) email = parsed.email;
                if (parsed.address) address = parsed.address;
                if (parsed.phone) phone = parsed.phone;
                if (parsed.whatsapp) whatsapp = parsed.whatsapp;
                if (Array.isArray(parsed.services)) services = parsed.services;
                cleanDesc = rawDesc.replace(metaMatch[0], '').trim();
              } catch {}
            }

            const existing = allCompaniesMap.get(id);
            const compName = compNameMeta || c.name || existing?.company_name || existing?.full_name || 'Empresa Local';
            const finalLogo = logo || c.logo_url || existing?.company_logo || existing?.avatar_url || '';

            allCompaniesMap.set(id, {
              id,
              email: email || c.email || existing?.email || '',
              full_name: compName,
              role: 'employer',
              avatar_url: finalLogo,
              company_logo: finalLogo,
              cover_url: cover || c.cover_url || existing?.cover_url || '',
              company_name: compName,
              industry: c.setor || c.industry || existing?.industry || 'Comércio e Serviços',
              municipality: c.municipality || existing?.municipality || 'Ondjiva',
              phone: phone || c.phone || existing?.phone || '',
              whatsapp: whatsapp || c.whatsapp || existing?.whatsapp || '',
              address: address || c.address || existing?.address || '',
              website: website || c.website || existing?.website || '',
              services: services.length > 0 ? services : (c.services || existing?.services || []),
              bio: cleanDesc || existing?.bio || '',
              skills: existing?.skills || [],
              certificates: existing?.certificates || [],
              experiences: existing?.experiences || [],
              educations: existing?.educations || [],
              company: {
                id,
                user_id: id,
                name: compName,
                logo_url: finalLogo,
                cover_url: cover || c.cover_url || existing?.cover_url || '',
                industry: c.setor || c.industry || existing?.industry || 'Comércio e Serviços',
                municipality: c.municipality || existing?.municipality || 'Ondjiva',
                description: cleanDesc || existing?.bio || '',
                services: services.length > 0 ? services : (c.services || existing?.services || []),
                nif: c.nif || existing?.nif || '000000000',
                phone: phone || c.phone || existing?.phone || '',
                whatsapp: whatsapp || c.whatsapp || existing?.whatsapp || '',
                address: address || c.address || existing?.address || '',
                website: website || c.website || existing?.website || '',
                email: email || c.email || existing?.email || '',
                created_at: c.created_at || existing?.created_at || new Date().toISOString()
              },
              created_at: c.created_at || existing?.created_at || new Date().toISOString()
            });
          });
        }
      } catch (err) {
        // Skip companies table errors
      }

      const results = Array.from(allCompaniesMap.values()).sort((a, b) => {
        const isDefaultA = a.id.startsWith('comp-cunene-') || a.id.startsWith('comp-trans-') || a.id.startsWith('comp-farmacia-') || a.id.startsWith('comp-ombandja-') || a.id.startsWith('comp-rainha-');
        const isDefaultB = b.id.startsWith('comp-cunene-') || b.id.startsWith('comp-trans-') || b.id.startsWith('comp-farmacia-') || b.id.startsWith('comp-ombandja-') || b.id.startsWith('comp-rainha-');
        if (!isDefaultA && isDefaultB) return -1;
        if (isDefaultA && !isDefaultB) return 1;
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return timeB - timeA;
      });

      if (results.length === 0) {
        return this.getDefaultCompanies();
      }
      
      // Save valid found companies to local cache for offline/isolated browser resilience
      try {
        if (results.length >= 3) {
          safeSetItem(STORAGE_KEYS.COMPANIES, JSON.stringify(results));
        }
      } catch {}
      
      return results;
    } catch (e) {
      console.error('Fetch companies general error:', e);
      return this.getCompanies();
    }
  },

  getCompanies(): UserProfile[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.COMPANIES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return this.getDefaultCompanies();
  },

  getDefaultCompanies(): UserProfile[] {
    return [
      {
        id: 'comp-cunene-agro',
        email: 'contacto@agropecuariacunene.ao',
        full_name: 'Agro-Pecuária Cunene Viva',
        company_name: 'Agro-Pecuária Cunene Viva',
        role: 'employer',
        avatar_url: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=150&auto=format&fit=crop&q=80',
        company_logo: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=150&auto=format&fit=crop&q=80',
        cover_url: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&auto=format&fit=crop&q=80',
        industry: 'Agricultura & Pecuária',
        municipality: 'Ondjiva',
        phone: '+244 923 111 222',
        whatsapp: '+244 923 111 222',
        address: 'Zona Industrial de Ondjiva',
        website: 'https://cunenevagas.online',
        services: ['Produção de Milho', 'Criação de Gado Bovino', 'Forragens'],
        bio: 'Empresa agro-pecuária de referência na província do Cunene, dedicada à produção sustentável e abastecimento local.',
        skills: [],
        certificates: [],
        experiences: [],
        educations: [],
        created_at: new Date().toISOString()
      },
      {
        id: 'comp-trans-cunene',
        email: 'geral@transcunene.ao',
        full_name: 'Trans-Cunene Logística & Cargas',
        company_name: 'Trans-Cunene Logística & Cargas',
        role: 'employer',
        avatar_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=150&auto=format&fit=crop&q=80',
        company_logo: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=150&auto=format&fit=crop&q=80',
        cover_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
        industry: 'Transporte & Logística',
        municipality: 'Santa Clara',
        phone: '+244 931 444 555',
        whatsapp: '+244 931 444 555',
        address: 'Posto Fronteiriço de Santa Clara',
        website: 'https://cunenevagas.online',
        services: ['Despacho Aduaneiro', 'Fretes Rodoviários', 'Armazenagem'],
        bio: 'Soluções de transporte de mercadorias e desembaraço alfandegário no corredor comercial Angola-Namíbia.',
        skills: [],
        certificates: [],
        experiences: [],
        educations: [],
        created_at: new Date().toISOString()
      },
      {
        id: 'comp-farmacia-santaclara',
        email: 'atendimento@farmaciasantaclara.ao',
        full_name: 'Farmácia Central Santa Clara',
        company_name: 'Farmácia Central Santa Clara',
        role: 'employer',
        avatar_url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=150&auto=format&fit=crop&q=80',
        company_logo: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=150&auto=format&fit=crop&q=80',
        cover_url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&auto=format&fit=crop&q=80',
        industry: 'Saúde & Farmácia',
        municipality: 'Namacunde',
        phone: '+244 945 777 888',
        whatsapp: '+244 945 777 888',
        address: 'Avenida Principal, Namacunde',
        website: 'https://cunenevagas.online',
        services: ['Medicamentos', 'Produtos Hospitalares', 'Cosméticos'],
        bio: 'Disponibilização contínua de medicamentos essenciais e apoio à saúde comunitária no município de Namacunde.',
        skills: [],
        certificates: [],
        experiences: [],
        educations: [],
        created_at: new Date().toISOString()
      },
      {
        id: 'comp-ombandja-const',
        email: 'obras@ombandjaconstrucoes.ao',
        full_name: 'Ombandja Engenharia & Obras',
        company_name: 'Ombandja Engenharia & Obras',
        role: 'employer',
        avatar_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=150&auto=format&fit=crop&q=80',
        company_logo: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=150&auto=format&fit=crop&q=80',
        cover_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80',
        industry: 'Construção Civil',
        municipality: 'Ombandja',
        phone: '+244 922 999 000',
        whatsapp: '+244 922 999 000',
        address: 'Bairro Comercial, Xangongo',
        website: 'https://cunenevagas.online',
        services: ['Construção de Edifícios', 'Terraplanagem', 'Instalações Hidráulicas'],
        bio: 'Empresa especializada em engenharia civil, infraestruturas rurais e obras públicas no sul de Angola.',
        skills: [],
        certificates: [],
        experiences: [],
        educations: [],
        created_at: new Date().toISOString()
      },
      {
        id: 'comp-cunene-tech',
        email: 'suporte@cunenetech.ao',
        full_name: 'Cunene Telecom & Informática',
        company_name: 'Cunene Telecom & Informática',
        role: 'employer',
        avatar_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=150&auto=format&fit=crop&q=80',
        company_logo: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=150&auto=format&fit=crop&q=80',
        cover_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80',
        industry: 'Tecnologia & Telecom',
        municipality: 'Ondjiva',
        phone: '+244 925 333 444',
        whatsapp: '+244 925 333 444',
        address: 'Largo da Feira, Ondjiva',
        website: 'https://cunenevagas.online',
        services: ['Redes e Fibra', 'Câmaras de Segurança', 'Assistência Técnica'],
        bio: 'Fornecimento de equipamentos tecnológicos, redes corporativas e assistência em tecnologias de informação.',
        skills: [],
        certificates: [],
        experiences: [],
        educations: [],
        created_at: new Date().toISOString()
      },
      {
        id: 'comp-rainha-muxima',
        email: 'comercial@rainhamuxima.ao',
        full_name: 'Supermercado & Padaria Rainha Muxima',
        company_name: 'Supermercado & Padaria Rainha Muxima',
        role: 'employer',
        avatar_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=150&auto=format&fit=crop&q=80',
        company_logo: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=150&auto=format&fit=crop&q=80',
        cover_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&auto=format&fit=crop&q=80',
        industry: 'Comércio Geral & Alimentação',
        municipality: 'Ondjiva',
        phone: '+244 924 555 666',
        whatsapp: '+244 924 555 666',
        address: 'Centro da Cidade, Ondjiva',
        website: 'https://cunenevagas.online',
        services: ['Panificação Diária', 'Alimentos Frescos', 'Bebidas'],
        bio: 'Supermercado e panificação artesanal com produtos de qualidade para todas as famílias do Cunene.',
        skills: [],
        certificates: [],
        experiences: [],
        educations: [],
        created_at: new Date().toISOString()
      }
    ];
  },

  // Purge any mock or fake sample data from local cache
  purgeFakeData(currentUser?: UserProfile): void {
    const fakeKeywords = [
      'fakecompany', 'testcompany', 'democompany', 
      'samplepost', 'fakepost'
    ];

    try {
      const jobs = this.getJobs().filter(j => {
        // Se a vaga pertence ao utilizador atual, NUNCA apagar
        if (currentUser && j.employer_id === currentUser.id) return true;
        
        // Caso contrário, aplicar filtro básico de fake
        const isFake = fakeKeywords.some(k => 
          (j.company_name?.toLowerCase().includes(k)) || 
          (j.id?.startsWith('job-fake'))
        );
        return !isFake;
      });
      safeSetItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));

      const posts = this.getPosts().filter(p => {
        if (currentUser && p.author_id === currentUser.id) return true;
        return !fakeKeywords.some(k => p.author_name?.toLowerCase().includes(k));
      });
      safeSetItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
      
    const products = this.getProducts().filter(p => {
        if (currentUser && p.seller_id === currentUser.id) return true;
        return !fakeKeywords.some(k => p.title.toLowerCase().includes(k) || p.description.toLowerCase().includes(k));
      });
      safeSetItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch {
      // ignore
    }
  },

  // Helper para rastreio robusto de itens apagados pelo utilizador (evita ressuscitação por fetch Supabase com RLS)
  getDeletedIds(type: 'posts' | 'products' | 'jobs'): Set<string> {
    try {
      const raw = localStorage.getItem(`cunene_deleted_${type}_ids`);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  },

  addDeletedId(type: 'posts' | 'products' | 'jobs', id: string): void {
    try {
      const set = this.getDeletedIds(type);
      set.add(id);
      safeSetItem(`cunene_deleted_${type}_ids`, JSON.stringify(Array.from(set)));
    } catch {}
  },

  // Fetch fresh jobs directly from Supabase
  // Fetch fresh jobs directly from official 'jobs' table in Supabase
  async fetchJobs(): Promise<Job[]> {
    const localJobs = this.getJobs();
    const deletedJobIds = this.getDeletedIds('jobs');
    try {
      // Official production table: 'jobs'
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) {
        return localJobs.filter(j => !deletedJobIds.has(j.id));
      }

      // Filtrar estritamente vagas que o utilizador já apagou
      let rawData = data.filter((rj: any) => rj && rj.id && !deletedJobIds.has(rj.id));

      // Fetch company profiles to enrich company names if possible
      const companyIds = Array.from(new Set(rawData.map((j: any) => j.employer_id || j.company_id).filter(Boolean)));
      const profileMap = new Map<string, any>();
      if (companyIds.length > 0) {
        try {
          const { data: profs } = await supabase.from('profiles').select('*').in('id', companyIds);
          if (profs) profs.forEach(p => profileMap.set(p.id, p));
        } catch {}
      }

      const remoteJobs: Job[] = rawData.map((rj: any) => {
        let meta: any = {};
        let cleanDesc = rj.descricao || rj.description || '';
        const metaMatch = cleanDesc.match(/<!--META:([\s\S]*?)-->/);
        if (metaMatch) {
          try {
            meta = JSON.parse(metaMatch[1]);
            cleanDesc = cleanDesc.replace(metaMatch[0], '').trim();
          } catch {}
        }

        const employerId = rj.employer_id || rj.company_id || meta.employer_id || '';
        const prof = profileMap.get(employerId);
        const compName = rj.company_name || meta.company_name || prof?.full_name || rj.empresa || 'Empresa Registada';
        const compLogo = rj.company_logo || meta.company_logo || prof?.avatar_url || '';

        let reqs: string[] = [];
        if (Array.isArray(rj.requisitos)) {
          reqs = rj.requisitos;
        } else if (typeof rj.requisitos === 'string' && rj.requisitos.trim().length > 0) {
          reqs = rj.requisitos.split('\n').map((s: string) => s.trim()).filter(Boolean);
        } else if (Array.isArray(meta.requirements)) {
          reqs = meta.requirements;
        }

        const salary = Number(rj.salario) || meta.salary_min || undefined;
        const finalStatus = rj.status || meta.status || 'active';

        return {
          id: rj.id,
          employer_id: employerId,
          title: rj.titulo || rj.title || 'Vaga de Emprego',
          description: cleanDesc,
          company_name: compName,
          company_logo: compLogo,
          municipality: rj.municipio || rj.municipality || meta.municipality || 'Ondjiva',
          category: meta.category || 'Outros',
          requirements: reqs,
          benefits: Array.isArray(meta.benefits) ? meta.benefits : [],
          vacancies_count: meta.vacancies_count || 1,
          contract_type: rj.tipo_contrato || meta.contract_type || 'Tempo Inteiro',
          experience_level: meta.experience_level || 'Intermédio',
          salary_min: salary,
          salary_max: meta.salary_max || salary,
          salary_currency: meta.salary_currency || 'AOA',
          whatsapp: rj.whatsapp_contato || meta.whatsapp || '',
          email: meta.email || '',
          status: finalStatus,
          has_exam: !!meta.has_exam || !!meta.exam,
          exam: meta.exam || undefined,
          created_at: rj.created_at || new Date().toISOString()
        } as Job;
      });

      const remoteIds = new Set(remoteJobs.map(j => j.id));
      const localOnly = localJobs.filter(j => !remoteIds.has(j.id) && !deletedJobIds.has(j.id) && !j.id?.startsWith('job-fake'));
      const merged = [...remoteJobs, ...localOnly];

      safeSetItem(STORAGE_KEYS.JOBS, JSON.stringify(merged));
      return merged;
    } catch {
      return localJobs.filter(j => !deletedJobIds.has(j.id));
    }
  },

  // Fetch fresh products directly from official 'marketplace' table in Supabase
  async fetchProducts(): Promise<MarketplaceProduct[]> {
    const localProducts = this.getProducts();
    const deletedProductIds = this.getDeletedIds('products');
    try {
      // Official production table: 'marketplace'
      const { data, error } = await supabase
        .from('marketplace')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) {
        return localProducts.filter(p => !deletedProductIds.has(p.id));
      }

      const remoteProds = data.map(rp => {
        const rawDesc = rp.descricao || rp.description || '';
        let cat = rp.categoria || rp.category || 'Outros';
        let mun = rp.municipio || rp.municipality || 'Ondjiva';
        let tel = rp.telefone || rp.contact_phone || '+244 923 000 000';
        let cleanDesc = rawDesc;

        // Extract metadata JSON if encoded in description
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

        const finalStatus = rp.status || 'available';

        return {
          id: rp.id,
          seller_id: rp.company_id || rp.seller_id || rp.user_id || '',
          company_id: rp.company_id || undefined,
          title: rp.titulo || rp.title || 'Produto',
          description: cleanDesc,
          price: Number(rp.preco || rp.price || 0),
          currency: 'AOA',
          category: cat as any,
          municipality: mun,
          contact_phone: tel,
          image_url: rp.imagem_url || rp.image_url || undefined,
          status: finalStatus,
          is_active: finalStatus === 'available',
          created_at: rp.created_at || new Date().toISOString()
        } as MarketplaceProduct;
      });

      const remoteIds = new Set(remoteProds.map(p => p.id));
      const localOnly = localProducts.filter(p => !remoteIds.has(p.id) && !deletedProductIds.has(p.id) && !p.id?.startsWith('prod-fake'));
      const merged = [...remoteProds, ...localOnly];

      safeSetItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(merged));
      return merged;
    } catch {
      return localProducts.filter(p => !deletedProductIds.has(p.id));
    }
  },

  // Fetch applications with clean UUID handling and hydration of candidate data
  async fetchApplications(currentUser?: UserProfile): Promise<JobApplication[]> {
    const localApps = this.getApplications();
    try {
      let query = supabase
        .from('applications')
        .select('*, jobs!inner(*)')
        .order('created_at', { ascending: false });

      if (currentUser?.role === 'employer') {
        const rawCompId = currentUser.company?.id || currentUser.id;
        const cleanCompanyId = rawCompId ? rawCompId.replace(/^comp-/, '') : '';
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanCompanyId);
        if (isUuid) {
          query = query.eq('jobs.company_id', cleanCompanyId);
        }
      } else if (currentUser?.role === 'candidate') {
        query = query.eq('candidate_id', currentUser.id);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        return localApps;
      }
      
      const rawApps = data;
      const candidateIds = Array.from(new Set(rawApps.map((a: any) => a.candidate_id).filter(Boolean)));
      const profileMap = new Map<string, any>();

      if (candidateIds.length > 0) {
        try {
          const { data: profs } = await supabase.from('profiles').select('*').in('id', candidateIds);
          if (profs) profs.forEach((p: any) => profileMap.set(p.id, p));
        } catch {}
        try {
          const { data: cands } = await supabase.from('candidates').select('*').in('id', candidateIds);
          if (cands) {
            cands.forEach((c: any) => {
              const existing = profileMap.get(c.id) || {};
              profileMap.set(c.id, { ...existing, ...c });
            });
          }
        } catch {}
      }

      const attempts = this.getExamAttempts();
      const remoteApps: JobApplication[] = rawApps.map((app: any) => {
        const prof = profileMap.get(app.candidate_id);
        const jData = app.jobs;
        
        let jobMeta: any = {};
        if (jData?.descricao) {
          const match = jData.descricao.match(/<!--META:([\s\S]*?)-->/);
          if (match) {
            try { jobMeta = JSON.parse(match[1]); } catch {}
          }
        }

        const attempt = attempts.find(a => 
          a.candidate_id === app.candidate_id && 
          (a.job_id === app.job_id || a.application_id === app.id)
        );

        return {
          id: app.id,
          job_id: app.job_id,
          candidate_id: app.candidate_id,
          status: app.status || 'Enviada',
          created_at: app.created_at,
          cover_letter: app.cover_letter || '',
          cv_url: prof?.cv_url || app.cv_url || '',
          exam_score: attempt?.percentage ?? app.exam_score,
          exam_passed: attempt?.passed ?? app.exam_passed,
          exam_result: attempt || undefined,
          candidate: {
            id: app.candidate_id,
            email: prof?.email || '',
            full_name: prof?.full_name || 'Candidato',
            role: 'candidate',
            municipality: prof?.municipio || 'Ondjiva',
            phone: prof?.whatsapp || prof?.phone || '',
            whatsapp: prof?.whatsapp || '',
            profession: prof?.experiencia || 'Profissional',
            bio: prof?.experiencia || '',
            cv_url: prof?.cv_url || '',
            skills: [],
            certificates: [],
            experiences: [],
            educations: [],
            created_at: prof?.created_at || app.created_at
          },
          job: jData ? {
            id: jData.id,
            employer_id: jData.company_id,
            company_id: jData.company_id,
            title: jData.titulo || jData.title || 'Vaga',
            company_name: jobMeta.company_name || jData.empresa || '',
            company_logo: jobMeta.company_logo || '',
            municipality: jData.municipio || 'Ondjiva',
            category: jobMeta.category || 'Geral',
            contract_type: jData.tipo_contrato || 'Tempo Inteiro',
            experience_level: jobMeta.experience_level || 'Intermédio',
            salary_min: jData.salario ? Number(jData.salario) : undefined,
            salary_currency: jobMeta.salary_currency || 'AOA',
            description: jData.descricao ? jData.descricao.replace(/<!--META:[\s\S]*?-->/, '').trim() : '',
            requirements: [],
            benefits: [],
            vacancies_count: 1,
            status: 'active',
            has_exam: Boolean(jobMeta.has_exam || jobMeta.exam),
            exam: jobMeta.exam,
            created_at: jData.created_at
          } : undefined
        };
      });

      const remoteIds = new Set(remoteApps.map(a => a.id));
      const localOnly = localApps.filter(a => !remoteIds.has(a.id));
      const merged = [...remoteApps, ...localOnly];

      safeSetItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(merged));
      return merged;
    } catch (err) {
      console.warn('Fallback to local applications due to error:', err);
      return this.getApplications();
    }
  },

  // Sync with Supabase on startup and on refresh
  async syncWithSupabase(currentUser?: UserProfile): Promise<{ jobs: Job[]; products: MarketplaceProduct[]; posts: CommunityPost[]; applications: JobApplication[] }> {
    this.purgeFakeData(currentUser);
    try {
      const [jobs, products, posts, applications] = await Promise.all([
        this.fetchJobs(),
        this.fetchProducts(),
        this.fetchPosts(),
        this.fetchApplications(currentUser)
      ]);

      return { jobs, products, posts, applications };
    } catch (err) {
      console.warn('Erro ao sincronizar com Supabase:', err);
      return {
        jobs: this.getJobs(),
        products: this.getProducts(),
        posts: this.getPosts(),
        applications: this.getApplications()
      };
    }
  },

  // Jobs
  getJobs(): Job[] {
    const raw = localStorage.getItem(STORAGE_KEYS.JOBS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch {
      return [];
    }
  },

  async saveJob(jobData: Omit<Job, 'id' | 'created_at'>): Promise<Job> {
    const jobs = this.getJobs();
    
    // Gerar UUID válido para compatibilidade com a coluna id (uuid) no Postgres
    const jobId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') 
      ? crypto.randomUUID() 
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });

    const newJob: Job = {
      ...jobData,
      id: jobId,
      created_at: new Date().toISOString()
    };
    if (newJob.exam) {
      newJob.exam.job_id = jobId;
    }

    const updated = [newJob, ...jobs.filter(j => j.id !== jobId)];
    safeSetItem(STORAGE_KEYS.JOBS, JSON.stringify(updated));

    // Empacotar metadados completos para persistência total
    const meta = {
      company_name: newJob.company_name,
      company_logo: newJob.company_logo,
      category: newJob.category,
      experience_level: newJob.experience_level,
      benefits: newJob.benefits,
      salary_min: newJob.salary_min,
      salary_max: newJob.salary_max,
      salary_currency: newJob.salary_currency,
      email: newJob.email,
      whatsapp: newJob.whatsapp,
      vacancies_count: newJob.vacancies_count,
      has_exam: newJob.has_exam,
      exam: newJob.exam,
      employer_id: newJob.employer_id,
      requirements: newJob.requirements
    };

    const fullDesc = `<!--META:${JSON.stringify(meta)}-->\n${newJob.description || ''}`;
    const cleanSalary = newJob.salary_min ? Number(newJob.salary_min) : (newJob.salary_max ? Number(newJob.salary_max) : null);
    
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(newJob.employer_id || '');
    const cleanCompanyId = isValidUUID ? newJob.employer_id : null;
    const reqsText = Array.isArray(newJob.requirements) ? newJob.requirements.join('\n') : (newJob.requirements || '');

    const dbJob: any = {
      id: newJob.id,
      titulo: newJob.title,
      descricao: fullDesc,
      municipio: newJob.municipality || 'Ondjiva',
      salario: cleanSalary,
      requisitos: reqsText,
      tipo_contrato: newJob.contract_type || 'Tempo Inteiro',
      whatsapp_contato: newJob.whatsapp || '',
      company_id: cleanCompanyId,
      created_at: newJob.created_at
    };

    try {
      // Primary official table: 'jobs'
      const { error: insertErr } = await supabase.from('jobs').insert([dbJob]);
      if (insertErr) {
        console.warn('Supabase jobs insert note:', insertErr.message);
        if (insertErr.message.includes('foreign key')) {
          const fallback = { ...dbJob };
          delete fallback.company_id;
          await supabase.from('jobs').insert([fallback]);
        }
      }
    } catch (err) {
      console.warn('Erro na persistência de vaga no Supabase:', err);
    }

    return newJob;
  },

  async updateJob(jobId: string, updates: Partial<Job>): Promise<Job | null> {
    const jobs = this.getJobs();
    let updatedJob: Job | null = null;
    const updated = jobs.map(j => {
      if (j.id === jobId) {
        updatedJob = { ...j, ...updates };
        return updatedJob;
      }
      return j;
    });
    safeSetItem(STORAGE_KEYS.JOBS, JSON.stringify(updated));

    if (updates.status) {
      safeSetItem(`cunene_job_status_${jobId}`, updates.status);
    }

    if (updatedJob) {
      const target: Job = updatedJob;
      const meta = {
        company_name: target.company_name,
        company_logo: target.company_logo,
        category: target.category,
        experience_level: target.experience_level,
        benefits: target.benefits,
        salary_min: target.salary_min,
        salary_max: target.salary_max,
        salary_currency: target.salary_currency,
        email: target.email,
        whatsapp: target.whatsapp,
        vacancies_count: target.vacancies_count,
        has_exam: target.has_exam,
        exam: target.exam,
        employer_id: target.employer_id,
        requirements: target.requirements,
        status: target.status
      };
      const fullDesc = `<!--META:${JSON.stringify(meta)}-->\n${target.description || ''}`;
      const cleanSalary = target.salary_min ? Number(target.salary_min) : (target.salary_max ? Number(target.salary_max) : null);

      try {
        await supabase.from('jobs').update({
          titulo: target.title,
          descricao: fullDesc,
          municipio: target.municipality,
          salario: cleanSalary,
          tipo_contrato: target.contract_type,
          requisitos: Array.isArray(target.requirements) ? target.requirements.join('\n') : (target.requirements || ''),
          whatsapp_contato: target.whatsapp || '',
          status: target.status
        }).eq('id', jobId);
      } catch (e) {
        console.warn('Erro ao atualizar no Supabase:', e);
      }
    }

    try {
      window.dispatchEvent(new CustomEvent('cunene_job_updated', { detail: { job: updatedJob } }));
    } catch {}

    return updatedJob;
  },

  deleteJob(jobId: string): void {
    this.addDeletedId('jobs', jobId);
    const jobs = this.getJobs();
    const updated = jobs.filter(j => j.id !== jobId);
    safeSetItem(STORAGE_KEYS.JOBS, JSON.stringify(updated));
    supabase.from('jobs').delete().eq('id', jobId).then(({ error }) => {
      if (error) console.log('Supabase jobs delete note:', error.message);
    });
    try {
      window.dispatchEvent(new CustomEvent('cunene_job_deleted', { detail: { jobId } }));
    } catch {}
  },

  // Exams
  saveExam(examData: Omit<Exam, 'id' | 'created_at'>): Exam {
    const exams = this.getExams();
    const newExam: Exam = {
      ...examData,
      id: 'exam-' + Date.now(),
      created_at: new Date().toISOString()
    };
    const updated = [newExam, ...exams];
    safeSetItem(STORAGE_KEYS.EXAMS, JSON.stringify(updated));

    supabase.from('exams').insert([newExam]).then(({ error }) => {
      if (error) console.log('Exam insert note:', error.message);
    });

    return newExam;
  },

  getExams(): Exam[] {
    const raw = localStorage.getItem(STORAGE_KEYS.EXAMS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  // Exam Attempts
  saveExamAttempt(attemptData: Omit<ExamAttempt, 'id' | 'created_at'>): ExamAttempt {
    const attempts = this.getExamAttempts();
    const isSimulated = !!(
      attemptData.is_simulated ||
      attemptData.exam_id?.startsWith('free-') ||
      attemptData.job_id === 'practice-general'
    );

    const newAttempt: ExamAttempt = {
      ...attemptData,
      is_simulated: isSimulated,
      id: 'attempt-' + Date.now(),
      created_at: new Date().toISOString()
    };
    const updated = [newAttempt, ...attempts];
    safeSetItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(updated));

    this.addNotification({
      id: 'notif-' + Date.now(),
      user_id: attemptData.candidate_id,
      title: isSimulated ? 'Resultado do Simulado' : 'Resultado do Exame',
      message: `O seu ${isSimulated ? 'simulado' : 'exame'} foi concluído com ${attemptData.percentage}% (${attemptData.passed ? 'Aprovado' : 'Não Aprovado'}).`,
      read: false,
      created_at: new Date().toISOString()
    });

    return newAttempt;
  },

  getExamAttempts(): ExamAttempt[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  // Retorna estritamente exames oficiais/reais (excluindo testes simulados livres de treino)
  getRealExamAttempts(): ExamAttempt[] {
    return this.getExamAttempts().filter(a => !a.is_simulated && !a.exam_id?.startsWith('free-') && a.job_id !== 'practice-general');
  },

  // Applications
  getApplications(): JobApplication[] {
    const raw = localStorage.getItem(STORAGE_KEYS.APPLICATIONS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  async applyToJob(jobId: string, candidate: CandidateProfile, coverLetter?: string, cvUrl?: string): Promise<JobApplication> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(jobId)) {
      throw new Error('A vaga selecionada não possui um identificador UUID válido no Supabase.');
    }
    if (!uuidRegex.test(candidate.id)) {
      throw new Error('O perfil do candidato não possui um identificador UUID válido no Supabase.');
    }

    // 1. Garantir que o candidato existe na tabela public.candidates (evitando erro de foreign key candidates_id_fkey)
    try {
      const { data: existingCandidate, error: fetchCandErr } = await supabase
        .from('candidates')
        .select('id')
        .eq('id', candidate.id)
        .maybeSingle();

      if (!existingCandidate) {
        // Inserir registo correspondente em candidates
        const { error: insertCandErr } = await supabase
          .from('candidates')
          .insert([{
            id: candidate.id,
            data_nascimento: null,
            experiencia: candidate.bio || candidate.profession || 'Profissional',
            cv_url: cvUrl || candidate.cv_url || null
          }]);

        if (insertCandErr) {
          console.warn('Nota ao registar na tabela candidates:', insertCandErr.message);
        }
      } else if (cvUrl || candidate.cv_url) {
        // Atualizar cv_url se fornecido
        await supabase
          .from('candidates')
          .update({ cv_url: cvUrl || candidate.cv_url })
          .eq('id', candidate.id);
      }
    } catch (candSetupErr) {
      console.warn('Aviso na verificação de candidates:', candSetupErr);
    }

    const apps = this.getApplications();
    const existing = apps.find(a => a.job_id === jobId && a.candidate_id === candidate.id);
    
    if (existing) {
      // Reuse existing application and update snapshot
      const updatedExisting: JobApplication = {
        ...existing,
        cover_letter: coverLetter !== undefined ? coverLetter : existing.cover_letter,
        cv_url: cvUrl || candidate.cv_url || existing.cv_url,
        candidate: { ...candidate }
      };

      const { error } = await supabase.from('applications').update({
        status: updatedExisting.status
      }).eq('id', existing.id);

      if (error) {
        throw new Error('Erro ao atualizar candidatura no Supabase: ' + error.message);
      }

      const updated = apps.map(a => a.id === existing.id ? updatedExisting : a);
      safeSetItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(updated));

      return updatedExisting;
    }

    const validAppId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

    const newApp: JobApplication = {
      id: validAppId,
      job_id: jobId,
      candidate_id: candidate.id,
      status: 'Enviada',
      cover_letter: coverLetter,
      cv_url: cvUrl || candidate.cv_url,
      created_at: new Date().toISOString(),
      candidate: { ...candidate }
    };

    // Persist to Supabase 'applications' table first and await result
    const dbPayload = {
      id: newApp.id,
      job_id: jobId,
      candidate_id: candidate.id,
      status: 'Enviada',
      created_at: newApp.created_at
    };

    const { error } = await supabase.from('applications').insert([dbPayload]);
    if (error) {
      console.error('DEBUG: Erro ao persistir candidatura no Supabase:', error);
      throw new Error('Erro ao persistir candidatura no Supabase: ' + error.message);
    }
    console.log('DEBUG: Candidatura persistida com sucesso:', dbPayload.id);

    const updated = [newApp, ...apps];
    safeSetItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(updated));

    return newApp;
  },

  updateApplicationExamResult(appId: string, score: number, percentage: number, passed: boolean): void {
    const apps = this.getApplications();
    const updated = apps.map(app => {
      if (app.id === appId) {
        return {
          ...app,
          status: 'Exame realizado' as JobApplication['status'],
          exam_score: percentage,
          exam_passed: passed
        };
      }
      return app;
    });
    safeSetItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(updated));

    supabase.from('applications').update({
      status: 'Exame realizado'
    }).eq('id', appId).then(({ error }) => {
      if (error) console.warn('Supabase application exam result update note:', error.message);
    });
  },

  updateApplicationStatus(appId: string, status: JobApplication['status']): void {
    const apps = this.getApplications();
    const updated = apps.map(app => {
      if (app.id === appId) {
        if (status === 'Selecionada para exame') {
          this.addNotification({
            id: 'notif-' + Date.now(),
            user_id: app.candidate_id,
            title: 'Exame Disponível',
            message: 'Foi selecionado para realizar o exame desta vaga!',
            read: false,
            created_at: new Date().toISOString(),
            link: 'exams'
          });
        } else if (status === 'Aprovada') {
          this.addNotification({
            id: 'notif-' + Date.now(),
            user_id: app.candidate_id,
            title: 'Candidatura Aprovada',
            message: 'Parabéns! A sua candidatura foi aprovada.',
            read: false,
            created_at: new Date().toISOString(),
            link: 'applications'
          });
        } else if (status === 'Rejeitada') {
          this.addNotification({
            id: 'notif-' + Date.now(),
            user_id: app.candidate_id,
            title: 'Candidatura Atualizada',
            message: 'A sua candidatura foi revista pela empresa.',
            read: false,
            created_at: new Date().toISOString(),
            link: 'applications'
          });
        }
        return { ...app, status };
      }
      return app;
    });
    safeSetItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(updated));

    supabase.from('applications').update({ status }).eq('id', appId).then(({ error }) => {
      if (error) console.log('Supabase applications update note:', error.message);
    });
  },

  // Saved Jobs
  getSavedJobs(candidateId: string): string[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_JOBS + '_' + candidateId);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  toggleSaveJob(candidateId: string, jobId: string): string[] {
    const saved = this.getSavedJobs(candidateId);
    let updated: string[];
    if (saved.includes(jobId)) {
      updated = saved.filter(id => id !== jobId);
    } else {
      updated = [...saved, jobId];
    }
    safeSetItem(STORAGE_KEYS.SAVED_JOBS + '_' + candidateId, JSON.stringify(updated));
    return updated;
  },

  // Saved Products (Supabase as Source of Truth, localStorage as Cache)
  async fetchSavedProducts(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('saved_products')
        .select('product_id')
        .eq('user_id', userId);

      if (error) {
        return this.getSavedProductsLocal(userId);
      }

      const productIds = (data || []).map((row: any) => row.product_id);
      safeSetItem('cunene_saved_products_' + userId, JSON.stringify(productIds));
      return productIds;
    } catch {
      return this.getSavedProductsLocal(userId);
    }
  },

  async toggleSaveProductSupabase(userId: string, productId: string): Promise<string[]> {
    const currentSaved = this.getSavedProductsLocal(userId);
    const isCurrentlySaved = currentSaved.includes(userId + '_' + productId) || currentSaved.includes(productId);

    // Optimistic Cache Update
    let updated: string[];
    if (isCurrentlySaved) {
      updated = currentSaved.filter(id => id !== productId);
    } else {
      updated = [...currentSaved, productId];
    }
    safeSetItem('cunene_saved_products_' + userId, JSON.stringify(updated));

    if (isCurrentlySaved) {
      // DELETE from Supabase
      const { error } = await supabase
        .from('saved_products')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);

      if (error) {
        console.warn('Supabase favorite delete error:', error.message);
      }
    } else {
      // INSERT into Supabase (Unique constraint user_id, product_id)
      const { error } = await supabase
        .from('saved_products')
        .insert([{ user_id: userId, product_id: productId }]);

      if (error) {
        console.warn('Supabase favorite insert error:', error.message);
      }
    }

    return updated;
  },

  getSavedProductsLocal(userId: string): string[] {
    const raw = localStorage.getItem('cunene_saved_products_' + userId);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  // Marketplace Products
  getProducts(): MarketplaceProduct[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch {
      return [];
    }
  },

  async addProduct(productData: Omit<MarketplaceProduct, 'id' | 'created_at'>): Promise<MarketplaceProduct> {
    const products = this.getProducts();
    
    // Generate valid UUID for Postgres compatibility
    const prodUuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : (
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      })
    );

    const newProd: MarketplaceProduct = {
      ...productData,
      is_active: productData.is_active ?? true,
      id: prodUuid,
      created_at: new Date().toISOString()
    };
    const updated = [newProd, ...products];
    safeSetItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));

    const metaHeader = `<!--META:${JSON.stringify({
      cat: newProd.category,
      mun: newProd.municipality,
      tel: newProd.contact_phone
    })}-->\n`;
    const fullDesc = `${metaHeader}${newProd.description || ''}`;

    const cleanCompanyId = (productData.company_id && !productData.company_id.startsWith('comp-')) 
      ? productData.company_id 
      : productData.seller_id;

    const dbPayload: any = {
      id: newProd.id,
      titulo: newProd.title,
      descricao: fullDesc,
      preco: Number(newProd.price || 0),
      imagem_url: newProd.image_url || null,
      company_id: cleanCompanyId
    };

    try {
      const { error } = await supabase.from('marketplace').insert([dbPayload]);
      if (error) {
        console.warn('Supabase marketplace insert note:', error.message);
        // Fallback retry without company_id if needed
        if (error.message.includes('foreign key')) {
          delete dbPayload.company_id;
          await supabase.from('marketplace').insert([dbPayload]);
        }
      }
    } catch (err) {
      console.warn('Supabase product insert exception:', err);
    }

    return newProd;
  },

  updateProduct(productId: string, updates: Partial<MarketplaceProduct>): MarketplaceProduct | null {
    const products = this.getProducts();
    let updatedProd: MarketplaceProduct | null = null;
    const updated = products.map(p => {
      if (p.id === productId) {
        updatedProd = { ...p, ...updates };
        return updatedProd;
      }
      return p;
    });
    safeSetItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));

    const dbUpdates: any = {};
    if (updates.title) dbUpdates.titulo = updates.title;
    if (updates.description) dbUpdates.descricao = updates.description;
    if (updates.price !== undefined) dbUpdates.preco = Number(updates.price);
    if (updates.image_url !== undefined) dbUpdates.imagem_url = updates.image_url;

    if (Object.keys(dbUpdates).length > 0) {
      supabase.from('marketplace').update(dbUpdates).eq('id', productId).then(({ error }) => {
        if (error) console.log('Supabase marketplace update note:', error.message);
      });
    }

    return updatedProd;
  },

  deleteProduct(productId: string): void {
    this.addDeletedId('products', productId);
    const products = this.getProducts();
    const updated = products.filter(p => p.id !== productId);
    safeSetItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));

    // Target official table only
    supabase.from('marketplace').delete().eq('id', productId).then(({ error }) => {
      if (error) console.log('Supabase marketplace delete note:', error.message);
    });

    try {
      window.dispatchEvent(new CustomEvent('cunene_product_deleted', { detail: { productId } }));
    } catch {}
  },

  getVisitorId(): string {
    let vid = localStorage.getItem('cunene_visitor_id');
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      safeSetItem('cunene_visitor_id', vid);
    }
    return vid;
  },

  // Community Posts (Fonte de Verdade: SUPABASE + Cache Local para Performance)
  async fetchPosts(): Promise<CommunityPost[]> {
    const localPosts = this.getPosts();
    const activeUserId = this.getCurrentUser()?.id || this.getVisitorId();
    const deletedPostIds = this.getDeletedIds('posts');

    try {
      // Consultar exclusivamente 'community_posts' (Fonte Oficial)
      const { data, error } = await supabase.from('community_posts').select('*').order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return localPosts.filter(p => !deletedPostIds.has(p.id));
      }

      const rawPosts = data;

      // Unificar por id e excluir posts apagados
      const uniqueRemoteMap = new Map<string, any>();
      rawPosts.forEach(p => {
        if (p && p.id && !uniqueRemoteMap.has(p.id) && !deletedPostIds.has(p.id)) {
          uniqueRemoteMap.set(p.id, p);
        }
      });

      const postsData = Array.from(uniqueRemoteMap.values());
      const localMap = new Map(localPosts.map(lp => [lp.id, lp]));

      // Ensure all posts have the necessary structure and preserve user reaction
      const remotePosts = postsData.map(p => {
        const local = localMap.get(p.id);
        const remoteReactions = (p.reactions && typeof p.reactions === 'object' && !Array.isArray(p.reactions)) ? p.reactions : {};
        const localReactions = (local?.reactions && typeof local.reactions === 'object' && !Array.isArray(local.reactions)) ? local.reactions : {};
        const combinedReactions = { ...remoteReactions, ...localReactions };

        const userReaction = (activeUserId && combinedReactions[activeUserId]) 
          ? combinedReactions[activeUserId] 
          : (local?.user_reaction || undefined);

        const rawRemoteLikes = typeof p.likes_count === 'number' ? p.likes_count : 0;
        const rawLocalLikes = typeof local?.likes_count === 'number' ? local.likes_count : 0;
        const reactionsCount = Object.keys(combinedReactions).length;
        const finalLikesCount = Math.max(rawRemoteLikes, rawLocalLikes, reactionsCount);

        const finalImageUrl = p.image_url || (p as any).imagem_url || (p as any).media_url || (p as any).image || local?.image_url || (local as any)?.imagem_url || (local as any)?.media_url;

        return {
          ...p,
          image_url: finalImageUrl || undefined,
          comments: Array.isArray(p.comments) ? p.comments : (local?.comments || []),
          reactions: combinedReactions,
          likes_count: finalLikesCount,
          comments_count: typeof p.comments_count === 'number' ? p.comments_count : (Array.isArray(p.comments) ? p.comments.length : (local?.comments_count || 0)),
          user_reaction: userReaction
        };
      }) as CommunityPost[];

      // Merge: preserve all remote posts + any local posts that might not be synced yet
      const remoteIds = new Set(remotePosts.map(p => p.id));
      const localOnly = localPosts.filter(p => !remoteIds.has(p.id) && !deletedPostIds.has(p.id));
      const merged = [...remotePosts, ...localOnly];

      safeSetItem(STORAGE_KEYS.POSTS, JSON.stringify(merged));
      return merged;
    } catch {
      return localPosts.filter(p => !deletedPostIds.has(p.id));
    }
  },

  getPosts(): CommunityPost[] {
    const raw = localStorage.getItem(STORAGE_KEYS.POSTS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const activeUserId = this.getCurrentUser()?.id || this.getVisitorId();
      return parsed.map(p => {
        const reactions = (p.reactions && typeof p.reactions === 'object' && !Array.isArray(p.reactions)) ? p.reactions : {};
        const postImg = p.image_url || p.imagem_url || p.media_url || p.image;
        return {
          ...p,
          image_url: postImg || undefined,
          reactions,
          likes_count: typeof p.likes_count === 'number' ? Math.max(p.likes_count, Object.keys(reactions).length) : Object.keys(reactions).length,
          user_reaction: p.user_reaction || (activeUserId && reactions[activeUserId] ? reactions[activeUserId] : undefined)
        };
      });
    } catch {
      return [];
    }
  },

  async addPost(postData: Omit<CommunityPost, 'id' | 'created_at' | 'likes_count' | 'comments_count'>): Promise<CommunityPost> {
    // Gerar UUID válido para compatibilidade com a coluna id (uuid) no Postgres
    const validUuid = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : 'post-' + Date.now();

    const newPost: CommunityPost = {
      ...postData,
      id: validUuid,
      likes_count: 0,
      comments_count: 0,
      comments: [],
      reactions: {},
      created_at: new Date().toISOString()
    };

    // 1. Optimistic Update (Immediate display and persistence)
    const posts = this.getPosts();
    const updated = [newPost, ...posts];
    safeSetItem(STORAGE_KEYS.POSTS, JSON.stringify(updated));

    try {
      const myPostIds = JSON.parse(localStorage.getItem('my_created_post_ids') || '[]');
      if (!myPostIds.includes(newPost.id)) {
        safeSetItem('my_created_post_ids', JSON.stringify([...myPostIds, newPost.id]));
      }
    } catch {}

    // Validar se author_id é um UUID padrão (caso a coluna author_id seja uuid no Postgres)
    const isUuidAuthor = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(newPost.author_id);

    // 2. Persist in Supabase (Sanitize for DB)
    const dbPost: any = {
      id: newPost.id,
      author_id: isUuidAuthor ? newPost.author_id : null,
      author_type: newPost.author_type,
      author_name: newPost.author_name || 'Utilizador',
      author_avatar: newPost.author_avatar || '',
      company_id: (newPost.company_id && !newPost.company_id.startsWith('comp-')) ? newPost.company_id : null,
      content: newPost.content,
      image_url: newPost.image_url || null,
      poll: newPost.poll || null,
      category: newPost.category || 'Emprego',
      likes_count: 0,
      comments_count: 0,
      comments: [],
      created_at: newPost.created_at
    };

    const safeInsertPost = async (tableName: string, payload: any) => {
      let { error } = await supabase.from(tableName).insert([payload]);
      if (error) {
        console.warn(`Tentativa 1 em ${tableName} falhou:`, error.message);
        // Fallback 1: sem company_id e sem author_id não-uuid
        const fallback1 = { ...payload, company_id: null, author_id: null };
        let { error: err2 } = await supabase.from(tableName).insert([fallback1]);
        if (err2) {
          // Fallback 2: payload mínimo estritamente seguro
          const minimal = {
            id: payload.id,
            content: payload.content,
            author_name: payload.author_name,
            category: payload.category || 'Emprego',
            image_url: payload.image_url || null,
            created_at: payload.created_at
          };
          await supabase.from(tableName).insert([minimal]);
        }
      }
    };

    try {
      await safeInsertPost('community_posts', dbPost);
    } catch (err) {
      console.warn('Supabase community_posts insert error:', err);
    }

    return newPost;
  },

  async voteOnPoll(postId: string, optionId: string, userId: string): Promise<CommunityPost | null> {
    const posts = this.getPosts();
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return null;

    const targetPost = { ...posts[postIndex] };
    if (!targetPost.poll) return null;

    const updatedOptions = targetPost.poll.options.map(opt => {
      let votes = opt.votes || [];
      const alreadyVotedHere = votes.includes(userId);
      
      if (opt.id !== optionId) {
        votes = votes.filter(id => id !== userId);
      } else {
        if (alreadyVotedHere) {
          votes = votes.filter(id => id !== userId);
        } else {
          votes = [...votes, userId];
        }
      }
      return { ...opt, votes };
    });

    const updatedPost: CommunityPost = {
      ...targetPost,
      poll: {
        ...targetPost.poll,
        options: updatedOptions,
        total_votes: updatedOptions.reduce((acc, opt) => acc + (opt.votes?.length || 0), 0)
      }
    };

    const updatedPosts = [...posts];
    updatedPosts[postIndex] = updatedPost;
    safeSetItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
    
    try {
      await supabase.from('community_posts').update({ poll: updatedPost.poll }).eq('id', postId);
    } catch {}

    return updatedPost;
  },

  async reportPost(postId: string): Promise<void> {
    const posts = this.getPosts();
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;

    const targetPost = { ...posts[postIndex] };
    targetPost.reports_count = (targetPost.reports_count || 0) + 1;

    const updatedPosts = [...posts];
    updatedPosts[postIndex] = targetPost;
    safeSetItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));

    try {
      await supabase.from('community_posts').update({ reports_count: targetPost.reports_count }).eq('id', postId);
    } catch {}
  },

  async reactToPost(postId: string, reactionType: PostReactionType, userId?: string, existingPost?: CommunityPost): Promise<CommunityPost | null> {
    const activeUserId = userId || this.getCurrentUser()?.id || this.getVisitorId();
    const posts = this.getPosts();
    let postIndex = posts.findIndex(p => p.id === postId);

    let basePost: CommunityPost;
    if (postIndex === -1) {
      if (!existingPost) return null;
      basePost = { ...existingPost };
      posts.unshift(basePost);
      postIndex = 0;
    } else {
      basePost = { ...posts[postIndex] };
    }

    const targetPost: CommunityPost = {
      ...(existingPost || {}),
      ...basePost
    };

    // Ensure image_url is never lost
    const resolvedImageUrl = existingPost?.image_url || (existingPost as any)?.imagem_url || targetPost.image_url || (targetPost as any).imagem_url || (targetPost as any).media_url || (targetPost as any).image || basePost.image_url || (basePost as any).imagem_url;
    if (resolvedImageUrl) {
      targetPost.image_url = resolvedImageUrl;
    }

    const reactions = { ...(targetPost.reactions || {}) };
    const current = reactions[activeUserId];

    let currentLikes = typeof targetPost.likes_count === 'number' ? targetPost.likes_count : Object.keys(reactions).length;

    // Regra: UM utilizador só pode ter UMA reação por post.
    // Ao tocar novamente na reação ativa: remover a reação e diminuir like.
    if (current === reactionType) {
      delete reactions[activeUserId];
      currentLikes = Math.max(0, currentLikes - 1);
    } else {
      if (!current) {
        // Nova reação adicionada
        currentLikes = currentLikes + 1;
      }
      // Alterna o tipo de reação (ex: like -> love)
      reactions[activeUserId] = reactionType;
    }

    const calculatedLikes = Math.max(currentLikes, Object.keys(reactions).length);

    const updatedPost: CommunityPost = {
      ...targetPost,
      reactions,
      likes_count: calculatedLikes,
      user_reaction: reactions[activeUserId],
      image_url: resolvedImageUrl || targetPost.image_url
    };

    const updatedPosts = [...posts];
    updatedPosts[postIndex] = updatedPost;

    // 1. Optimistic Update instantâneo no localStorage
    safeSetItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));

    // 2. Persist in Supabase
    try {
      const updatePayload: any = {
        likes_count: updatedPost.likes_count,
        image_url: updatedPost.image_url || null
      };
      // Tenta enviar reactions se a coluna existir
      const { error } = await supabase
        .from('community_posts')
        .update({
          ...updatePayload,
          reactions: updatedPost.reactions
        })
        .eq('id', postId);

      if (error) {
        // Fallback apenas para likes_count e image_url
        await supabase
          .from('community_posts')
          .update(updatePayload)
          .eq('id', postId);
      }
    } catch (err) {
      console.warn('Sincronização de reação falhou no servidor:', err);
    }

    return updatedPost;
  },

  async addCommentToPost(postId: string, comment: { author_id: string; author_name: string; author_avatar?: string; content: string; parent_id?: string }): Promise<PostComment> {
    const posts = this.getPosts();
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) throw new Error('Publicação não encontrada.');

    const targetPost = { ...posts[postIndex] };
    
    // Regra: Somente um nível de resposta.
    if (comment.parent_id) {
      const parent = (targetPost.comments || []).find(c => c.id === comment.parent_id);
      if (!parent) throw new Error('Comentário pai não encontrado.');
      if (parent.parent_id) throw new Error('Apenas um nível de resposta é permitido.');
    }

    const newComment: PostComment = {
      id: 'comm-' + Date.now(),
      post_id: postId,
      author_id: comment.author_id,
      author_name: comment.author_name,
      author_avatar: comment.author_avatar,
      content: comment.content,
      created_at: new Date().toISOString(),
      parent_id: comment.parent_id,
      likes_count: 0
    };

    // 1. Optimistic Update
    targetPost.comments = [...(targetPost.comments || []), newComment];
    targetPost.comments_count = targetPost.comments.length;
    
    const newPosts = [...posts];
    newPosts[postIndex] = targetPost;
    safeSetItem(STORAGE_KEYS.POSTS, JSON.stringify(newPosts));

    // 2. Persist in Supabase
    const { error } = await supabase.from('community_posts').update({ 
      comments: targetPost.comments,
      comments_count: targetPost.comments_count 
    }).eq('id', postId);
    
    if (error) {
      console.error('Erro ao sincronizar comentário:', error);
      // Optional: Rollback if critical, but for comments we usually prefer keeping the user flow
    }

    // 3. Notificações Reais
    if (comment.parent_id) {
      const parent = targetPost.comments?.find(c => c.id === comment.parent_id);
      if (parent && parent.author_id !== comment.author_id) {
        this.addNotification({ 
          id: 'notif-' + Date.now(), 
          user_id: parent.author_id, 
          title: 'Nova resposta', 
          message: `${comment.author_name} respondeu ao seu comentário.`, 
          read: false, 
          created_at: new Date().toISOString(), 
          link: 'community' 
        });
      }
    } else if (targetPost.author_id !== comment.author_id) {
      this.addNotification({ 
        id: 'notif-' + Date.now(), 
        user_id: targetPost.author_id, 
        title: 'Novo comentário', 
        message: `${comment.author_name} comentou na sua publicação.`, 
        read: false, 
        created_at: new Date().toISOString(), 
        link: 'community' 
      });
    }

    // 2. Persist in Supabase
    try {
      await supabase
        .from('community_posts')
        .update({
          comments: targetPost.comments,
          comments_count: targetPost.comments_count
        })
        .eq('id', postId);
    } catch (err) {
      console.warn('Sincronização de comentário falhou no servidor:', err);
    }
    
    return newComment;
  },

  // Real-time Subscriptions
  subscribeToCommunity(callback: (posts: CommunityPost[]) => void) {
    return supabase
      .channel('community_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, async () => {
        const fresh = await this.fetchPosts();
        callback(fresh);
      })
      .subscribe();
  },

  async likeComment(postId: string, commentId: string, userId: string): Promise<void> {
    const posts = this.getPosts();
    const updated = posts.map(p => {
      if (p.id === postId && p.comments) {
        const updatedComments = p.comments.map(c => {
          if (c.id === commentId) {
            const isLiked = c.liked_by_user;
            return {
              ...c,
              liked_by_user: !isLiked,
              likes_count: (c.likes_count || 0) + (isLiked ? -1 : 1)
            };
          }
          return c;
        });
        
        supabase.from('community_posts').update({ 
          comments: updatedComments 
        }).eq('id', postId).then(({ error }) => {
          if (error) console.log('Comment like sync note:', error.message);
        });

        return { ...p, comments: updatedComments };
      }
      return p;
    });
    safeSetItem(STORAGE_KEYS.POSTS, JSON.stringify(updated));
  },

  deletePost(postId: string): void {
    this.addDeletedId('posts', postId);
    const posts = this.getPosts();
    const updated = posts.filter(p => p.id !== postId);
    safeSetItem(STORAGE_KEYS.POSTS, JSON.stringify(updated));

    supabase.from('community_posts').delete().eq('id', postId).then(({ error }) => {
      if (error) console.log('Supabase community_posts delete note:', error.message);
    });

    try {
      window.dispatchEvent(new CustomEvent('cunene_post_deleted', { detail: { postId } }));
    } catch {}
  },

  // Exams - PRODUCTION SECURE LOGIC
  async submitExamAttempt(attemptData: Omit<ExamAttempt, 'id' | 'created_at' | 'passed' | 'percentage' | 'score' | 'total_points'>, answers: Record<string, string>, job: Job): Promise<ExamAttempt> {
    if (!job.exam) throw new Error('Exame não encontrado para esta vaga.');

    let score = 0;
    let totalPoints = 0;

    job.exam.questions.forEach(q => {
      const qPts = q.points || 10;
      totalPoints += qPts;
      const userAns = (answers[q.id] || '').trim().toLowerCase();
      
      let correctAns = '';
      try {
        correctAns = decodeURIComponent(atob(q.correct_answer || '')).trim().toLowerCase();
      } catch {
        correctAns = (q.correct_answer || '').trim().toLowerCase();
      }
      
      if (userAns === correctAns) {
        score += qPts;
      }
    });

    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const passed = percentage >= (job.exam.passing_score || 70);
    
    const user = this.getCurrentUser();
    const candidateName = user?.full_name || 'Candidato';

    const isSimulated = !!(
      attemptData.is_simulated ||
      job.id === 'practice-general' ||
      job.exam?.is_simulated ||
      job.exam?.id?.startsWith('free-') ||
      attemptData.exam_id?.startsWith('free-') ||
      attemptData.job_id === 'practice-general'
    );

    const newAttempt: ExamAttempt = {
      ...attemptData,
      is_simulated: isSimulated,
      id: 'att-' + Date.now(),
      score,
      total_points: totalPoints,
      percentage,
      passed,
      candidate_name: candidateName,
      job_title: job.title,
      answers,
      created_at: new Date().toISOString(),
      exam: job.exam
    };

    supabase.from('exam_attempts').insert([newAttempt]).then(({ error }) => {
      if (error) console.log('Exam attempt save note:', error.message);
    });

    const currentAttempts = this.getExamAttempts();
    safeSetItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify([newAttempt, ...currentAttempts]));

    this.addNotification({
      id: 'notif-' + Date.now(),
      user_id: attemptData.candidate_id,
      title: isSimulated ? 'Resultado do Simulado' : 'Resultado do Exame',
      message: `Concluiu o ${isSimulated ? 'simulado' : 'exame'} para ${job.title} com ${percentage}% (${passed ? 'Aprovado' : 'Não Aprovado'}).`,
      read: false,
      created_at: new Date().toISOString()
    });

    return newAttempt;
  },

  async fetchExamAttempts(candidateId?: string): Promise<ExamAttempt[]> {
    const local = this.getExamAttempts();
    try {
      let query = supabase.from('exam_attempts').select('*').order('created_at', { ascending: false });
      if (candidateId) {
        query = query.eq('candidate_id', candidateId);
      }
      const { data, error } = await query;
      if (error || !data || !Array.isArray(data)) return local;
      
      const remote = data as ExamAttempt[];
      const localIds = new Set(local.map(a => a.id));
      const newFromRemote = remote.filter(a => !localIds.has(a.id));
      const merged = [...local, ...newFromRemote];
      safeSetItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(merged));
      return merged;
    } catch {
      return local;
    }
  },

  // Notifications - Supabase Driven
  async fetchNotifications(userId: string): Promise<NotificationItem[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return this.getNotifications(userId);
    }

    const notifs = data as NotificationItem[];
    safeSetItem(STORAGE_KEYS.NOTIFICATIONS + '_' + userId, JSON.stringify(notifs));
    return notifs;
  },

  getNotifications(userId: string): NotificationItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS + '_' + userId);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  addNotification(notif: NotificationItem): void {
    const notifs = this.getNotifications(notif.user_id);
    const updated = [notif, ...notifs];
    safeSetItem(STORAGE_KEYS.NOTIFICATIONS + '_' + notif.user_id, JSON.stringify(updated));

    // Enviar Notificação Push Nativa do Navegador/Sistema
    try {
      sendNativePushNotification(notif.title, {
        body: notif.message,
        url: notif.link || '/'
      });
    } catch {}

    // Try persistence to Supabase
    supabase.from('notifications').insert([notif]).then(({ error }) => {
      if (error) console.log('Notifications persistence limited (missing table in Supabase).');
    });
  },

  markNotificationAsRead(userId: string, notifId: string): void {
    const notifs = this.getNotifications(userId);
    const updated = notifs.map(n => n.id === notifId ? { ...n, read: true } : n);
    safeSetItem(STORAGE_KEYS.NOTIFICATIONS + '_' + userId, JSON.stringify(updated));

    supabase.from('notifications').update({ read: true }).eq('id', notifId).then(({ error }) => {
      if (error) console.log('Read status sync limited.');
    });
  },

  // Enviar Mensagem/Notificação do Sistema (Admin)
  sendSystemNotification(params: {
    target: 'all' | 'employers' | 'candidates' | string;
    title?: string;
    message: string;
    link?: string;
  }): number {
    const title = params.title?.trim() || 'Notificação do Sistema';
    const message = params.message.trim();
    const now = new Date().toISOString();

    // Trigger push notification nativa
    try {
      sendNativePushNotification('Notificação do Sistema', {
        body: message,
        url: params.link || '/'
      });
    } catch {}

    const allCompanies = this.getCompanies();
    const currentUser = this.getCurrentUser();
    
    let recipientIds: string[] = [];
    if (params.target === 'all') {
      const companyUserIds = allCompanies.map(c => c.id);
      recipientIds = Array.from(new Set([
        ...companyUserIds, 
        ...(currentUser ? [currentUser.id] : []),
        'user-cand-default-1',
        'user-cand-default-2'
      ]));
    } else if (params.target === 'employers') {
      recipientIds = allCompanies.map(c => c.id);
    } else if (params.target === 'candidates') {
      recipientIds = [
        ...(currentUser?.role === 'candidate' ? [currentUser.id] : []),
        'user-cand-default-1',
        'user-cand-default-2'
      ];
    } else {
      recipientIds = [params.target];
    }

    recipientIds.forEach(userId => {
      const notifItem: NotificationItem = {
        id: 'sys-notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        user_id: userId,
        title,
        message,
        read: false,
        created_at: now,
        link: params.link || 'notifications',
        sender_name: 'Notificação do Sistema',
        is_system: true
      };
      this.addNotification(notifItem);
    });

    return recipientIds.length;
  },

  // Classificações e Estrelas para Empresas (Company Ratings & Reviews)
  getCompanyRatings(companyId: string): CompanyRating[] {
    const raw = localStorage.getItem(`cunene_company_ratings_${companyId}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter(r => r.user_id !== 'user-cand-default-1' && r.user_id !== 'user-cand-default-2');
        }
      } catch {}
    }
    return [];
  },

  async getCompanyRatingsAsync(companyId: string): Promise<CompanyRating[]> {
    try {
      const { data, error } = await supabase
        .from('company_ratings')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CompanyRating[];
    } catch (err) {
      console.warn('Erro ao buscar avaliações no Supabase:', err);
      return this.getCompanyRatings(companyId); // Fallback to local
    }
  },

  addCompanyRating(ratingData: Omit<CompanyRating, 'id' | 'created_at'>): CompanyRating {
    const current = this.getCompanyRatings(ratingData.company_id);
    const existingIndex = current.findIndex(r => r.user_id === ratingData.user_id);
    const newRating: CompanyRating = {
      ...ratingData,
      id: 'rating-' + Date.now(),
      created_at: new Date().toISOString()
    };

    let updated: CompanyRating[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = newRating;
    } else {
      updated = [newRating, ...current];
    }

    safeSetItem(`cunene_company_ratings_${ratingData.company_id}`, JSON.stringify(updated));

    // Notificar a empresa
    this.addNotification({
      id: 'notif-' + Date.now(),
      user_id: ratingData.company_id,
      title: 'Nova Classificação Recebida ⭐',
      message: `${ratingData.user_name} avaliou a sua empresa com ${ratingData.rating} estrelas!`,
      read: false,
      created_at: new Date().toISOString(),
      link: 'profile'
    });

    return newRating;
  },

  getCompanyRatingStats(companyId: string): { average: number; count: number } {
    const ratings = this.getCompanyRatings(companyId);
    if (ratings.length === 0) return { average: 5.0, count: 0 };
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return {
      average: Number((sum / ratings.length).toFixed(1)),
      count: ratings.length
    };
  },

  // Parceiros Oficiais designados pelo Administrador (Mencionando Usuário)
  getPartners(): PlatformPartner[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PARTNERS);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    const initialPartners: PlatformPartner[] = [
      {
        id: 'partner-default-1',
        user_id: 'default-emp-001',
        user_name: 'Cunene Agro-Indústria',
        role: 'employer',
        partner_title: 'Parceiro Estratégico do Agronegócio',
        badge_label: 'Parceiro Oficial',
        description: 'Parceira oficial de desenvolvimento agro-pecuário e geração de postos de trabalho em Ombadja e Ondjiva.',
        municipality: 'Ombadja',
        created_at: new Date(Date.now() - 86400000 * 30).toISOString()
      },
      {
        id: 'partner-default-2',
        user_id: 'default-emp-002',
        user_name: 'Ondjiva Construções & Engenharia',
        role: 'employer',
        partner_title: 'Parceiro Oficial de Infraestrutura',
        badge_label: 'Parceiro Oficial',
        description: 'Apoio técnico e oportunidades no setor de obras públicas e infraestruturas provinciais.',
        municipality: 'Ondjiva',
        created_at: new Date(Date.now() - 86400000 * 20).toISOString()
      }
    ];
    safeSetItem(STORAGE_KEYS.PARTNERS, JSON.stringify(initialPartners));
    return initialPartners;
  },

  addPartner(data: Omit<PlatformPartner, 'id' | 'created_at'>): PlatformPartner {
    const current = this.getPartners();
    const newPartner: PlatformPartner = {
      ...data,
      id: 'partner-' + Date.now(),
      created_at: new Date().toISOString()
    };
    const updated = [newPartner, ...current];
    safeSetItem(STORAGE_KEYS.PARTNERS, JSON.stringify(updated));

    // Enviar Notificação do Sistema para o usuário/empresa mencionado
    this.addNotification({
      id: 'notif-' + Date.now(),
      user_id: data.user_id,
      title: 'Parabéns! Designado(a) como Parceiro Oficial 🤝',
      message: `A administração da plataforma CuneneVagas oficializou a sua conta como "${data.partner_title}". O selo de Parceiro Oficial está agora ativo no seu perfil!`,
      read: false,
      created_at: new Date().toISOString(),
      sender_name: 'Notificação do Sistema',
      is_system: true,
      link: 'profile'
    });

    return newPartner;
  },

  removePartner(partnerId: string): void {
    const current = this.getPartners();
    const updated = current.filter(p => p.id !== partnerId);
    safeSetItem(STORAGE_KEYS.PARTNERS, JSON.stringify(updated));
  },

  isUserPartner(userId: string): { isPartner: boolean; partner?: PlatformPartner } {
    const partners = this.getPartners();
    const found = partners.find(p => p.user_id === userId);
    return {
      isPartner: Boolean(found),
      partner: found
    };
  },

  async fetchTransactions(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Erro ao carregar transações:', error.message);
      return [];
    }
    return data || [];
  },

  async activatePremiumLocally(userId: string): Promise<UserProfile | null> {
    const current = this.getCurrentUser();
    if (!current || current.id !== userId) return null;

    // 1. Atualizar no Supabase
    try {
      await supabase
        .from('companies')
        .update({ marketplace_unlocked: true })
        .eq('user_id', userId);
    } catch (err) {
      console.error('Erro ao atualizar empresa para premium no Supabase:', err);
    }

    // 2. Atualizar localmente
    const company = current.company ? { ...current.company, marketplace_unlocked: true } : {
      id: 'comp-' + userId,
      user_id: userId,
      name: current.company_name || 'Minha Empresa',
      industry: 'Comércio e Serviços',
      municipality: 'Ondjiva',
      description: '',
      services: [],
      marketplace_unlocked: true,
      created_at: new Date().toISOString()
    };

    const updated: UserProfile = {
      ...current,
      marketplace_unlocked: true,
      company
    };

    this.setCurrentUser(updated);
    safeSetItem(`${STORAGE_KEYS.USER}_rich_${userId}`, JSON.stringify(updated));
    if (updated.email) {
      safeSetItem(`${STORAGE_KEYS.USER}_rich_${updated.email}`, JSON.stringify(updated));
    }

    return updated;
  },

  // ==========================================
  // NOTÍCIAS PARA EMPRESAS DE TELECOMUNICAÇÕES
  // ==========================================

  getDefaultTelecomNews(): TelecomNewsItem[] {
    return [
      {
        id: 'telecom-news-unitel-1',
        operator_name: 'UNITEL',
        title: 'Modernização e Expansão da Cobertura 4G/5G em Ondjiva e Santa Clara',
        summary: 'A UNITEL concluiu a ativação de novos sites de transmissão ao longo do corredor comercial fronteiriço, reforçando a capacidade de dados móveis no Cunene.',
        content: 'No âmbito do plano nacional de modernização de infraestruturas de telecomunicações, a UNITEL procedeu à instalação e melhoria de antenas nos municípios de Cuanhama e Namacunde. Esta expansão beneficia comerciantes, jovens e instituições públicas, proporcionando maior estabilidade nas transações digitais, pagamento por multicaixa e conectividade rápida na fronteira de Santa Clara.',
        image_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
        badge: 'Cobertura 4G/5G',
        municipality: 'Ondjiva / Santa Clara',
        source_url: 'https://www.unitel.ao',
        likes_count: 48,
        views_count: 520,
        is_featured: true,
        published_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
        created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
      },
      {
        id: 'telecom-news-angolatelecom-2',
        operator_name: 'Angola Telecom & Zap Fibra',
        title: 'Rede Troncal de Fibra Óptica Interprovincial Assegura Alta Velocidade em Xangongo',
        summary: 'A infraestrutura de transporte de dados em banda larga reforça a ligação entre a Huíla e o Cunene, reduzindo a latência para empresas e serviços públicos.',
        content: 'A ligação da espinha dorsal de fibra óptica que atravessa a província do Cunene atingiu plena operabilidade no nó de distribuição de Xangongo (Ombadja). O projeto visa garantir redundância às comunicações nacionais e fornecer acesso de alta capacidade a provedores de internet e empresas locais.',
        image_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
        badge: 'Fibra Óptica',
        municipality: 'Ombadja / Ondjiva',
        source_url: 'https://www.angolatelecom.ao',
        likes_count: 35,
        views_count: 410,
        is_featured: true,
        published_at: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
        created_at: new Date(Date.now() - 3600000 * 24 * 4).toISOString()
      },
      {
        id: 'telecom-news-africell-3',
        operator_name: 'Africell',
        title: 'Africell Prepara Expansão Comercial e Postos de Atendimento no Sul de Angola',
        summary: 'Operadora móvel intensifica estudos técnicos para abertura de serviços e planos acessíveis de dados e voz na província do Cunene.',
        content: 'Com o objetivo de democratizar o acesso à telefonia e internet a preços competitivos, equipas técnicas da Africell desenvolvem vistorias e acordos de partilha de infraestruturas para a futura oferta de serviços de voz, internet móvel e carteira digital Afrimoney no Cunene.',
        image_url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80',
        badge: 'Novos Serviços',
        municipality: 'Ondjiva',
        source_url: 'https://www.africell.ao',
        likes_count: 62,
        views_count: 680,
        is_featured: false,
        published_at: new Date(Date.now() - 3600000 * 24 * 6).toISOString(),
        created_at: new Date(Date.now() - 3600000 * 24 * 6).toISOString()
      },
      {
        id: 'telecom-news-movicel-4',
        operator_name: 'Movicel',
        title: 'Movicel Atualiza Centrais Telefónicas e Estabilidade de Sinal em Cahama e Cuvelai',
        summary: 'Trabalhos de manutenção preventiva em estações rádio reforçam a comunicação contínua nas zonas rurais e eixos viários do Cunene.',
        content: 'Foram concluídas intervenções técnicas nas torres de transmissão que servem as localidades de Cahama e Cuvelai, restaurando a qualidade das chamadas de voz e dados móveis após manutenções nos sistemas solares e geradores das estações remotas.',
        image_url: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=800&auto=format&fit=crop&q=80',
        badge: 'Manutenção de Rede',
        municipality: 'Cahama / Cuvelai',
        source_url: 'https://www.movicel.co.ao',
        likes_count: 22,
        views_count: 290,
        is_featured: false,
        published_at: new Date(Date.now() - 3600000 * 24 * 8).toISOString(),
        created_at: new Date(Date.now() - 3600000 * 24 * 8).toISOString()
      }
    ];
  },

  getTelecomNews(): TelecomNewsItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TELECOM_NEWS);
    if (!raw) return this.getDefaultTelecomNews();
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      return this.getDefaultTelecomNews();
    } catch {
      return this.getDefaultTelecomNews();
    }
  },

  async fetchTelecomNews(): Promise<{ news: TelecomNewsItem[]; likedIds: string[] }> {
    const localNews = this.getTelecomNews();
    let likedIds: string[] = [];
    const localLikedKey = 'vagas_cunene_telecom_news_liked_ids';

    try {
      const rawLiked = localStorage.getItem(localLikedKey);
      if (rawLiked) {
        const parsed = JSON.parse(rawLiked);
        if (Array.isArray(parsed)) likedIds = parsed;
      }
    } catch {}

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: likesData } = await supabase
          .from('telecom_news_likes')
          .select('news_id')
          .eq('user_id', user.id);
        if (likesData && likesData.length > 0) {
          const remoteLiked = likesData.map(l => l.news_id);
          likedIds = Array.from(new Set([...likedIds, ...remoteLiked]));
          safeSetItem(localLikedKey, JSON.stringify(likedIds));
        }
      }
    } catch {}

    try {
      // 1. Consultar a tabela nativa 'telecom_news' no Supabase
      const { data, error } = await supabase
        .from('telecom_news')
        .select('*')
        .order('published_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return { news: localNews, likedIds };
      }

      // 2. Mesclar posts remotos e garantir integridade
      const remoteMap = new Map<string, TelecomNewsItem>();
      data.forEach(item => {
        remoteMap.set(item.id, {
          id: item.id,
          operator_name: item.operator_name || 'Telecom',
          title: item.title || 'Notícia de Telecomunicações',
          summary: item.summary || '',
          content: item.content || '',
          image_url: item.image_url || undefined,
          badge: item.badge || 'Notícia',
          municipality: item.municipality || 'Cunene',
          source_url: item.source_url || undefined,
          company_id: item.company_id || undefined,
          author_name: item.author_name || undefined,
          likes_count: typeof item.likes_count === 'number' ? item.likes_count : 0,
          views_count: typeof item.views_count === 'number' ? item.views_count : 0,
          is_featured: !!item.is_featured,
          published_at: item.published_at || item.created_at || new Date().toISOString(),
          created_at: item.created_at || new Date().toISOString()
        });
      });

      // Incluir apenas itens locais autênticos (criados pelo utilizador), sem duplicar dados mock
      const remoteTitles = new Set(Array.from(remoteMap.values()).map(r => r.title.toLowerCase().trim()));
      localNews.forEach(item => {
        const isLegacyMock = item.id.startsWith('telecom-news-');
        const isDuplicateTitle = remoteTitles.has(item.title.toLowerCase().trim());
        if (!remoteMap.has(item.id) && !isLegacyMock && !isDuplicateTitle) {
          remoteMap.set(item.id, item);
        }
      });

      const merged = Array.from(remoteMap.values());
      return { news: merged, likedIds };
    } catch {
      return { news: localNews, likedIds };
    }
  },

  async addTelecomNews(newsData: Omit<TelecomNewsItem, 'id' | 'created_at' | 'published_at' | 'likes_count' | 'views_count'>): Promise<TelecomNewsItem> {
    const currentUser = this.getCurrentUser();
    let userId = currentUser?.id || 'emp-' + Date.now();
    let authorName = newsData.author_name || currentUser?.full_name || currentUser?.company_name || 'Empresa';

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        authorName = newsData.author_name || user.email?.split('@')[0] || authorName;
      }
    } catch {
      // Ignorar e usar store user
    }

    const newsUuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : (
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      })
    );

    const now = new Date().toISOString();
    const createdItem: TelecomNewsItem = {
      ...newsData,
      id: newsUuid,
      company_id: newsData.company_id || userId,
      author_name: authorName,
      likes_count: 0,
      views_count: 1,
      is_featured: false,
      published_at: now,
      created_at: now
    };

    // Tentar gravar no Supabase (se falhar por RLS, persistimos localmente com sucesso)
    try {
      await supabase.from('telecom_news').insert([{
        id: createdItem.id,
        operator_name: createdItem.operator_name,
        title: createdItem.title,
        summary: createdItem.summary,
        content: createdItem.content,
        image_url: createdItem.image_url || null,
        badge: createdItem.badge,
        municipality: createdItem.municipality,
        source_url: createdItem.source_url || null,
        company_id: createdItem.company_id,
        author_name: createdItem.author_name
      }]);
    } catch {
      // Ignorar falha de rede/RLS para garantir que a publicação nunca falha para o utilizador
    }

    // Persistir no localStorage
    const existing = this.getTelecomNews();
    const updated = [createdItem, ...existing];
    safeSetItem(STORAGE_KEYS.TELECOM_NEWS, JSON.stringify(updated));

    return createdItem;
  },

  async toggleLikeTelecomNews(newsId: string, isCurrentlyLiked: boolean): Promise<{ success: boolean; likes_count?: number; action: 'liked' | 'unliked' }> {
    const localLikedKey = 'vagas_cunene_telecom_news_liked_ids';
    let likedIds: string[] = [];
    try {
      const rawLiked = localStorage.getItem(localLikedKey);
      if (rawLiked) {
        const parsed = JSON.parse(rawLiked);
        if (Array.isArray(parsed)) likedIds = parsed;
      }
    } catch {}

    if (isCurrentlyLiked) {
      likedIds = likedIds.filter(id => id !== newsId);
    } else {
      if (!likedIds.includes(newsId)) likedIds.push(newsId);
    }
    safeSetItem(localLikedKey, JSON.stringify(likedIds));

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!authError && user) {
        if (isCurrentlyLiked) {
          await supabase.from('telecom_news_likes').delete().eq('news_id', newsId).eq('user_id', user.id);
        } else {
          await supabase.from('telecom_news_likes').insert([{ news_id: newsId, user_id: user.id }]);
        }
      }
    } catch {}

    let likes_count = undefined;
    try {
      const { data: newsData } = await supabase
        .from('telecom_news')
        .select('likes_count')
        .eq('id', newsId)
        .maybeSingle();
      if (newsData && typeof newsData.likes_count === 'number') {
        likes_count = newsData.likes_count;
      }
    } catch {}

    return {
      success: true,
      likes_count,
      action: isCurrentlyLiked ? 'unliked' : 'liked'
    };
  },

  async likeTelecomNews(newsId: string): Promise<TelecomNewsItem | null> {
    // Mantido para compatibilidade caso algum componente chame diretamente
    try {
      const res = await this.toggleLikeTelecomNews(newsId, false);
      const { data } = await supabase.from('telecom_news').select('*').eq('id', newsId).maybeSingle();
      if (data) {
        return {
          id: data.id,
          operator_name: data.operator_name,
          title: data.title,
          summary: data.summary,
          content: data.content,
          image_url: data.image_url || undefined,
          badge: data.badge,
          municipality: data.municipality,
          source_url: data.source_url || undefined,
          company_id: data.company_id,
          author_name: data.author_name,
          likes_count: data.likes_count || 0,
          views_count: data.views_count || 1,
          is_featured: !!data.is_featured,
          published_at: data.published_at,
          created_at: data.created_at
        };
      }
    } catch {}
    return null;
  },

  // ==========================================
  // GESTÃO DE EMPRESAS E NEGÓCIOS EM DESTAQUE (CAMPANHAS)
  // ==========================================
  getFeaturedCampaigns(): import('./types').FeaturedCampaign[] {
    try {
      const raw = localStorage.getItem('vagas_cunene_featured_campaigns');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const now = new Date();
          return parsed.map((c: any): import('./types').FeaturedCampaign => {
            let status = c.status;
            if (status === 'active' && new Date(c.end_date) < now) {
              status = 'expired';
            }
            return {
              ...c,
              status: status as 'active' | 'expired' | 'suspended'
            };
          });
        }
      }
    } catch {}
    return [];
  },

  saveFeaturedCampaign(campaign: import('./types').FeaturedCampaign): import('./types').FeaturedCampaign[] {
    const list = this.getFeaturedCampaigns();
    const index = list.findIndex(c => c.id === campaign.id);
    let updated: import('./types').FeaturedCampaign[];
    if (index >= 0) {
      updated = list.map(c => c.id === campaign.id ? campaign : c);
    } else {
      updated = [campaign, ...list];
    }
    safeSetItem('vagas_cunene_featured_campaigns', JSON.stringify(updated));
    try {
      window.dispatchEvent(new CustomEvent('cunene_campaigns_updated', { detail: { campaigns: updated } }));
    } catch {}
    return updated;
  },

  deleteFeaturedCampaign(id: string): import('./types').FeaturedCampaign[] {
    const list = this.getFeaturedCampaigns();
    const updated = list.filter(c => c.id !== id);
    safeSetItem('vagas_cunene_featured_campaigns', JSON.stringify(updated));
    try {
      window.dispatchEvent(new CustomEvent('cunene_campaigns_updated', { detail: { campaigns: updated } }));
    } catch {}
    return updated;
  },

  toggleCampaignStatus(id: string): import('./types').FeaturedCampaign[] {
    const list = this.getFeaturedCampaigns();
    const updated = list.map((c): import('./types').FeaturedCampaign => {
      if (c.id === id) {
        const nextStatus = (c.status === 'active' ? 'suspended' : 'active') as 'active' | 'suspended';
        return { ...c, status: nextStatus };
      }
      return c;
    });
    safeSetItem('vagas_cunene_featured_campaigns', JSON.stringify(updated));
    try {
      window.dispatchEvent(new CustomEvent('cunene_campaigns_updated', { detail: { campaigns: updated } }));
    } catch {}
    return updated;
  },

  // ==========================================
  // GESTÃO DE PAGAMENTOS MANUAIS
  // ==========================================
  getManualPayments(): import('./types').ManualPaymentRequest[] {
    try {
      const raw = localStorage.getItem('vagas_cunene_manual_payments');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  },

  submitManualPayment(payment: Omit<import('./types').ManualPaymentRequest, 'id' | 'status' | 'created_at'>): import('./types').ManualPaymentRequest[] {
    const list = this.getManualPayments();
    const newReq: import('./types').ManualPaymentRequest = {
      ...payment,
      id: 'mp-' + Date.now(),
      status: 'pending',
      created_at: new Date().toISOString()
    };
    const updated = [newReq, ...list];
    safeSetItem('vagas_cunene_manual_payments', JSON.stringify(updated));
    return updated;
  },

  approveManualPayment(paymentId: string): import('./types').ManualPaymentRequest[] {
    const list = this.getManualPayments();
    const updated = list.map(p => {
      if (p.id === paymentId) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        try {
          const currentUser = this.getCurrentUser();
          if (currentUser && currentUser.id === p.user_id) {
            currentUser.marketplace_unlocked = true;
            if (currentUser.company) currentUser.company.marketplace_unlocked = true;
            this.setCurrentUser(currentUser);
          }
        } catch {}
        return {
          ...p,
          status: 'approved' as const,
          approved_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString()
        };
      }
      return p;
    });
    safeSetItem('vagas_cunene_manual_payments', JSON.stringify(updated));
    return updated;
  },

  rejectManualPayment(paymentId: string): import('./types').ManualPaymentRequest[] {
    const list = this.getManualPayments();
    const updated = list.map(p => p.id === paymentId ? { ...p, status: 'rejected' as const } : p);
    safeSetItem('vagas_cunene_manual_payments', JSON.stringify(updated));
    return updated;
  }
};


