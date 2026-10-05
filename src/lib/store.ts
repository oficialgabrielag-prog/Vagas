import { Job, JobApplication, MarketplaceProduct, CommunityPost, UserProfile, CandidateProfile, CompanyProfile, Exam, ExamAttempt, NotificationItem, PostComment, UserRole, PostReactionType } from './types';
import { supabase, signInWithPassword, signUp, signOut, resetPasswordForEmail } from './supabase';

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
  NOTIFICATIONS: 'vagas_cunene_notifications'
};

export const StoreService = {
  // Current User Session
  getCurrentUser(): UserProfile | null {
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
      
      // Ativação Pro permanente automática para o Administrador oficial
      if (parsed.email === 'oficialgabrielag@gmail.com') {
        parsed.marketplace_unlocked = true;
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
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
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
    localStorage.setItem(`${STORAGE_KEYS.USER}_rich_${userId}`, JSON.stringify(updated));
    if (updated.email) {
      localStorage.setItem(`${STORAGE_KEYS.USER}_rich_${updated.email}`, JSON.stringify(updated));
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

  // Restore full rich user session from Supabase Auth across any device
  async restoreUserFromSession(authUser: any): Promise<UserProfile | null> {
    if (!authUser) return null;
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
      marketplace_unlocked: companyObj?.marketplace_unlocked || cachedRich.marketplace_unlocked || (authUser.email === 'oficialgabrielag@gmail.com')
    };

    this.setCurrentUser(mergedUser);
    localStorage.setItem(`${STORAGE_KEYS.USER}_rich_${authUser.id}`, JSON.stringify(mergedUser));
    return mergedUser;
  },

  // Real Supabase Auth Login
  async loginWithSupabase(email: string, password: string): Promise<UserProfile> {
    const { data, error } = await signInWithPassword(email, password);
    if (error) {
      throw new Error(error.message || 'Erro ao iniciar sessão. Verifique o email e palavra-passe.');
    }

    const authUser = data.user;
    if (!authUser) throw new Error('Utilizador não encontrado.');

    return (await this.restoreUserFromSession(authUser)) || this.getCurrentUser()!;
  },

  // Real Supabase Auth Register
  async registerWithSupabase(
    email: string,
    password: string,
    fullName: string,
    role: 'candidate' | 'employer',
    companyName?: string
  ): Promise<UserProfile> {
    const { data, error } = await signUp(email, password);
    if (error) {
      throw new Error(error.message || 'Erro ao criar conta no Supabase.');
    }

    const authUser = data.user;
    const userId = authUser ? authUser.id : 'user-' + Date.now();

    // 1. Create Isolated Candidate Profile
    const candidateProfile: CandidateProfile = {
      id: userId,
      email,
      full_name: fullName,
      municipality: 'Ondjiva',
      phone: '',
      whatsapp: '',
      skills: [],
      certificates: [],
      experiences: [],
      educations: [],
      created_at: new Date().toISOString()
    };

    // Save strictly valid columns to profiles table in Supabase
    await supabase.from('profiles').upsert([{
      id: userId,
      full_name: fullName,
      role: role === 'employer' ? 'empresa' : 'candidato',
      municipio: 'Ondjiva'
    }]);

    // 2. If Employer, create Isolated Company Profile
    let companyProfile: CompanyProfile | undefined;
    if (role === 'employer') {
      companyProfile = {
        id: 'comp-' + userId,
        user_id: userId,
        name: companyName || fullName,
        industry: 'Comércio e Serviços',
        municipality: 'Ondjiva',
        description: '',
        services: [],
        created_at: new Date().toISOString()
      };
      await supabase.from('companies').upsert([{
        id: userId,
        descricao: companyName || fullName
      }]);
    }

    const newUser: UserProfile = {
      ...candidateProfile,
      role,
      company: companyProfile,
      company_name: companyProfile?.name,
      industry: companyProfile?.industry
    };

    this.setCurrentUser(newUser);
    // Cache rich data
    localStorage.setItem(`${STORAGE_KEYS.USER}_rich_${userId}`, JSON.stringify(newUser));
    localStorage.setItem(`${STORAGE_KEYS.USER}_rich_${email}`, JSON.stringify(newUser));

    return newUser;
  },

  // Password Reset with Supabase
  async resetPassword(email: string): Promise<void> {
    const { error } = await resetPasswordForEmail(email);
    if (error) {
      throw new Error(error.message || 'Erro ao enviar email de recuperação.');
    }
  },

  // ==========================================================
  // CANDIDATE PROFILE UPDATE (AFFECTS CANDIDATE ONLY)
  // ==========================================================
  updateCandidateProfile(userId: string, updates: Partial<CandidateProfile>): UserProfile {
    const current = this.getCurrentUser();
    if (!current) throw new Error('Utilizador não autenticado.');

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
    localStorage.setItem(`${STORAGE_KEYS.USER}_rich_${userId}`, JSON.stringify(updatedCandidate));
    if (updatedCandidate.email) {
      localStorage.setItem(`${STORAGE_KEYS.USER}_rich_${updatedCandidate.email}`, JSON.stringify(updatedCandidate));
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
    if (updates.company_name || updates.role === 'employer') {
      this.updateCompanyProfile(userId, {
        name: updates.company_name,
        industry: updates.industry,
        municipality: updates.municipality,
        phone: updates.phone,
        whatsapp: updates.whatsapp,
        description: updates.bio
      });
    }
    return this.updateCandidateProfile(userId, updates);
  },

  // ==========================================================
  // COMPANY PROFILE UPDATE (AFFECTS COMPANY ONLY)
  // ==========================================================
  updateCompanyProfile(userId: string, updates: Partial<CompanyProfile>): CompanyProfile {
    const current = this.getCurrentUser();
    if (!current) throw new Error('Utilizador não autenticado.');

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
      company: updatedCompany,
      company_name: updatedCompany.name,
      company_logo: updatedCompany.logo_url,
      industry: updatedCompany.industry,
      website: updatedCompany.website,
      nif: updatedCompany.nif,
      address: updatedCompany.address,
      services: updatedCompany.services,
      cover_url: updatedCompany.cover_url,
      marketplace_unlocked: updatedCompany.marketplace_unlocked,
      avatar_url: current.avatar_url // STRICT ISOLATION: Preserves personal candidate avatar!
    };

    this.setCurrentUser(updatedUser);

    // Save rich profile persistently in local storage
    localStorage.setItem(`${STORAGE_KEYS.USER}_rich_${userId}`, JSON.stringify(updatedUser));
    if (updatedUser.email) {
      localStorage.setItem(`${STORAGE_KEYS.USER}_rich_${updatedUser.email}`, JSON.stringify(updatedUser));
    }

    // Persist full company profile in Supabase cloud (user_metadata) across all devices
    supabase.auth.updateUser({
      data: {
        profile_data: current,
        company_data: updatedCompany,
        avatar_url: current.avatar_url,
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

    return updatedCompany;
  },

  // Follow / Unfollow Company
  getFollowedCompanies(userId: string): string[] {
    const raw = localStorage.getItem(`${STORAGE_KEYS.FOLLOWED_COMPANIES}_${userId}`);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
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
    localStorage.setItem(`${STORAGE_KEYS.FOLLOWED_COMPANIES}_${userId}`, JSON.stringify(updated));
    return updated;
  },

  // Fetch real registered companies from Supabase (combining users, companies, and profiles tables)
  async fetchCompanies(): Promise<UserProfile[]> {
    try {
      const allCompaniesMap = new Map<string, UserProfile>();

      // 1. Fetch from users table (where users have company_name or role=employer)
      try {
        const { data: usersData } = await supabase.from('users').select('*');
        if (usersData && usersData.length > 0) {
          usersData.forEach(u => {
            const isEmp = u.role === 'employer' || u.role === 'empresa' || u.company_name || u.logo_url;
            if (isEmp) {
              const compName = u.company_name || u.full_name || 'Empresa Local';
              const logo = u.logo_url || u.company_logo || u.avatar_url || '';
              const cover = u.cover_url || '';
              allCompaniesMap.set(u.id, {
                id: u.id,
                email: u.email || '',
                full_name: compName,
                role: 'employer',
                avatar_url: logo,
                company_logo: logo,
                cover_url: cover,
                company_name: compName,
                industry: u.industry || 'Comércio e Serviços',
                municipality: u.municipality || 'Ondjiva',
                phone: u.phone || '',
                whatsapp: u.whatsapp || '',
                address: u.address || '',
                website: u.website || '',
                services: u.services || [],
                bio: u.bio || '',
                skills: [],
                certificates: [],
                experiences: [],
                educations: [],
                company: {
                  id: u.id,
                  user_id: u.id,
                  name: compName,
                  logo_url: logo,
                  cover_url: cover,
                  industry: u.industry || 'Comércio e Serviços',
                  municipality: u.municipality || 'Ondjiva',
                  description: u.bio || '',
                  services: u.services || [],
                  nif: u.nif || '000000000',
                  phone: u.phone || '',
                  whatsapp: u.whatsapp || '',
                  address: u.address || '',
                  website: u.website || '',
                  email: u.email || '',
                  created_at: u.created_at || new Date().toISOString()
                },
                created_at: u.created_at || new Date().toISOString()
              });
            }
          });
        }
      } catch (err) {
        console.log('Fetch users error in fetchCompanies:', err);
      }

      // 2. Check companies table
      try {
        const { data: companiesData } = await supabase.from('companies').select('*');
        if (companiesData && companiesData.length > 0) {
          companiesData.forEach(c => {
            const id = c.user_id || c.id;
            if (!allCompaniesMap.has(id)) {
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
                } catch {
                  // ignore
                }
              }

              const compName = compNameMeta || c.name || 'Empresa Local';
              const finalLogo = logo || c.logo_url || '';

              allCompaniesMap.set(id, {
                id,
                email: email || c.email || '',
                full_name: compName,
                role: 'employer',
                avatar_url: finalLogo,
                company_logo: finalLogo,
                cover_url: cover || c.cover_url || '',
                company_name: compName,
                industry: c.setor || c.industry || 'Comércio e Serviços',
                municipality: c.municipality || 'Ondjiva',
                phone: phone || c.phone || '',
                whatsapp: whatsapp || c.whatsapp || '',
                address: address || c.address || '',
                website: website || c.website || '',
                services: services.length > 0 ? services : (c.services || []),
                bio: cleanDesc,
                skills: [],
                certificates: [],
                experiences: [],
                educations: [],
                company: {
                  id,
                  user_id: id,
                  name: compName,
                  logo_url: finalLogo,
                  cover_url: cover || c.cover_url || '',
                  industry: c.setor || c.industry || 'Comércio e Serviços',
                  municipality: c.municipality || 'Ondjiva',
                  description: cleanDesc,
                  services: services.length > 0 ? services : (c.services || []),
                  nif: c.nif || '000000000',
                  phone: phone || c.phone || '',
                  whatsapp: whatsapp || c.whatsapp || '',
                  address: address || c.address || '',
                  website: website || c.website || '',
                  email: email || c.email || '',
                  created_at: c.created_at || new Date().toISOString()
                },
                created_at: c.created_at || new Date().toISOString()
              });
            }
          });
        }
      } catch (err) {
        console.log('Fetch companies table error:', err);
      }

      return Array.from(allCompaniesMap.values());
    } catch {
      return [];
    }
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
      localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));

      const posts = this.getPosts().filter(p => {
        if (currentUser && p.author_id === currentUser.id) return true;
        return !fakeKeywords.some(k => p.author_name?.toLowerCase().includes(k));
      });
      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
      
    const products = this.getProducts().filter(p => {
        if (currentUser && p.seller_id === currentUser.id) return true;
        return !fakeKeywords.some(k => p.title.toLowerCase().includes(k) || p.description.toLowerCase().includes(k));
      });
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch {
      // ignore
    }
  },

  // Fetch fresh jobs directly from Supabase
  async fetchJobs(): Promise<Job[]> {
    const localJobs = this.getJobs();
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) {
        return localJobs;
      }

      // Fetch company profiles to enrich company names
      const companyIds = data.map(j => j.company_id).filter(Boolean);
      const profileMap = new Map<string, any>();
      if (companyIds.length > 0) {
        try {
          const { data: profs } = await supabase.from('profiles').select('*').in('id', companyIds);
          if (profs) profs.forEach(p => profileMap.set(p.id, p));
        } catch {
          // ignore
        }
      }

      const remoteJobs = data.map(rj => {
        const prof = profileMap.get(rj.company_id);
        const compName = prof?.full_name || 'Empresa Registada';

        return {
          ...rj,
          id: rj.id,
          employer_id: rj.company_id || '',
          title: rj.titulo || rj.title || 'Vaga de Emprego',
          description: rj.descricao || rj.description || '',
          municipality: rj.municipio || rj.municipality || 'Ondjiva',
          requirements: Array.isArray(rj.requisitos) ? rj.requisitos : (rj.requirements || []),
          benefits: rj.benefits || [],
          vacancies_count: rj.vacancies_count || 1,
          contract_type: rj.tipo_contrato || rj.contract_type || 'Tempo Inteiro',
          experience_level: rj.experience_level || 'Intermédio',
          salary_currency: rj.salary_currency || 'AOA',
          status: 'active',
          has_exam: !!rj.has_exam,
          company_name: compName,
          created_at: rj.created_at || new Date().toISOString()
        } as Job;
      });

      const remoteIds = new Set(remoteJobs.map(j => j.id));
      const localOnly = localJobs.filter(j => !remoteIds.has(j.id));
      const merged = [...localOnly, ...remoteJobs];

      localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(merged));
      return merged;
    } catch {
      return localJobs;
    }
  },

  // Fetch fresh products directly from Supabase
  async fetchProducts(): Promise<MarketplaceProduct[]> {
    const localProducts = this.getProducts();
    try {
      const [resMarketplace, resProdutos] = await Promise.allSettled([
        supabase.from('marketplace').select('*').order('created_at', { ascending: false }),
        supabase.from('produtos').select('*').order('created_at', { ascending: false })
      ]);

      let rawData: any[] = [];
      if (resMarketplace.status === 'fulfilled' && Array.isArray(resMarketplace.value.data) && resMarketplace.value.data.length > 0) {
        rawData = resMarketplace.value.data;
      }
      if (resProdutos.status === 'fulfilled' && Array.isArray(resProdutos.value.data) && resProdutos.value.data.length > 0) {
        const existingIds = new Set(rawData.map(p => p.id));
        resProdutos.value.data.forEach(p => {
          if (!existingIds.has(p.id)) {
            rawData.push(p);
          }
        });
      }

      if (rawData.length > 0) {
        const remoteProds = rawData.map(rp => {
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
            } catch {
              // ignore
            }
          }

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
            status: 'available',
            is_active: true,
            created_at: rp.created_at || new Date().toISOString()
          } as MarketplaceProduct;
        });

        // Merge: keep all remote products + any local products that might not be synced yet
        const remoteIds = new Set(remoteProds.map(p => p.id));
        const localOnly = localProducts.filter(p => !remoteIds.has(p.id));
        const merged = [...remoteProds, ...localOnly];

        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(merged));
        return merged;
      }
      return localProducts;
    } catch {
      return localProducts;
    }
  },

  // Fetch applications
  async fetchApplications(): Promise<JobApplication[]> {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) {
        return this.getApplications();
      }

      if (Array.isArray(data)) {
        localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(data));
        return data as JobApplication[];
      }
      return this.getApplications();
    } catch {
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
        this.fetchApplications()
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

  saveJob(jobData: Omit<Job, 'id' | 'created_at'>): Job {
    const jobs = this.getJobs();
    const jobId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : (
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      })
    );
    const newJob: Job = {
      ...jobData,
      id: jobId,
      created_at: new Date().toISOString()
    };
    if (newJob.exam) {
      newJob.exam.job_id = jobId;
    }
    const updated = [newJob, ...jobs];
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(updated));

    const cleanCompanyId = (newJob.employer_id && !newJob.employer_id.startsWith('comp-'))
      ? newJob.employer_id
      : null;

    const dbJob: any = {
      id: newJob.id,
      titulo: newJob.title,
      descricao: newJob.description || '',
      municipio: newJob.municipality || 'Ondjiva',
      requisitos: newJob.requirements || [],
      company_id: cleanCompanyId,
      tipo_contrato: newJob.contract_type || 'Tempo Inteiro',
      created_at: newJob.created_at
    };

    // Persist to both table aliases ('jobs' and 'vagas') for absolute database compatibility
    supabase.from('jobs').insert([dbJob]).then(({ error }) => {
      if (error) console.log('Supabase jobs insert note:', error.message);
    });
    supabase.from('vagas').insert([dbJob]).then(({ error }) => {
      if (error) console.log('Supabase vagas insert note:', error.message);
    });

    return newJob;
  },

  updateJob(jobId: string, updates: Partial<Job>): Job | null {
    const jobs = this.getJobs();
    let updatedJob: Job | null = null;
    const updated = jobs.map(j => {
      if (j.id === jobId) {
        updatedJob = { ...j, ...updates };
        return updatedJob;
      }
      return j;
    });
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(updated));

    supabase.from('jobs').update(updates).eq('id', jobId).then(({ error }) => {
      if (error) console.log('Supabase jobs update note:', error.message);
    });

    return updatedJob;
  },

  deleteJob(jobId: string): void {
    const jobs = this.getJobs();
    const updated = jobs.filter(j => j.id !== jobId);
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(updated));

    supabase.from('jobs').delete().eq('id', jobId).then(({ error }) => {
      if (error) console.log('Supabase jobs delete note:', error.message);
    });
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
    localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(updated));

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
    const newAttempt: ExamAttempt = {
      ...attemptData,
      id: 'attempt-' + Date.now(),
      created_at: new Date().toISOString()
    };
    const updated = [newAttempt, ...attempts];
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(updated));

    this.addNotification({
      id: 'notif-' + Date.now(),
      user_id: attemptData.candidate_id,
      title: 'Resultado do Exame',
      message: `O seu exame foi concluído com ${attemptData.percentage}% (${attemptData.passed ? 'Aprovado' : 'Não Aprovado'}).`,
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

  applyToJob(jobId: string, candidate: CandidateProfile, coverLetter?: string, cvUrl?: string): JobApplication {
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
      const updated = apps.map(a => a.id === existing.id ? updatedExisting : a);
      localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(updated));

      supabase.from('applications').update({
        cover_letter: updatedExisting.cover_letter,
        cv_url: updatedExisting.cv_url,
        candidate: updatedExisting.candidate
      }).eq('id', existing.id).then(({ error }) => {
        if (error) console.log('Supabase applications update note:', error.message);
      });

      return updatedExisting;
    }

    const newApp: JobApplication = {
      id: 'app-' + Date.now(),
      job_id: jobId,
      candidate_id: candidate.id,
      status: 'Enviada',
      cover_letter: coverLetter,
      cv_url: cvUrl || candidate.cv_url,
      created_at: new Date().toISOString(),
      candidate: { ...candidate }
    };
    const updated = [newApp, ...apps];
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(updated));

    // Persist to unified table name 'applications'
    supabase.from('applications').insert([newApp]).then(({ error }) => {
      if (error) console.log('Supabase applications insert note:', error.message);
    });

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
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(updated));

    supabase.from('applications').update({
      status: 'Exame realizado',
      exam_score: percentage,
      exam_passed: passed
    }).eq('id', appId).then(({ error }) => {
      if (error) console.log('Supabase application exam result update note:', error.message);
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
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(updated));

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
    localStorage.setItem(STORAGE_KEYS.SAVED_JOBS + '_' + candidateId, JSON.stringify(updated));
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
      localStorage.setItem('cunene_saved_products_' + userId, JSON.stringify(productIds));
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
    localStorage.setItem('cunene_saved_products_' + userId, JSON.stringify(updated));

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
    // 1. Validar limite de produtos
    const products = this.getProducts();
    const userProducts = products.filter(p => p.seller_id === productData.seller_id);
    
    // Verificar se é premium
    const transactions = await this.fetchTransactions(productData.seller_id);
    const isPremium = transactions.some(t => t.resource_type === 'marketplace_unlocked' && t.status === 'completed');

    if (userProducts.length >= 3 && !isPremium) {
      throw new Error('LIMIT_REACHED');
    }

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
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));

    // Persist to unified table name 'marketplace' with sanitized matching columns
    const cleanCompanyId = (productData.company_id && !productData.company_id.startsWith('comp-')) 
      ? productData.company_id 
      : productData.seller_id;

    const metaHeader = `<!--META:${JSON.stringify({
      cat: newProd.category,
      mun: newProd.municipality,
      tel: newProd.contact_phone
    })}-->\n`;
    const fullDesc = `${metaHeader}${newProd.description || ''}`;

    const dbPayload: any = {
      id: newProd.id,
      titulo: newProd.title,
      descricao: fullDesc,
      preco: Number(newProd.price || 0),
      imagem_url: newProd.image_url || null,
      company_id: cleanCompanyId
    };

    const dbPayloadProdutos: any = {
      id: newProd.id,
      title: newProd.title,
      description: fullDesc,
      price: Number(newProd.price || 0),
      currency: 'AOA',
      category: newProd.category,
      municipality: newProd.municipality,
      contact_phone: newProd.contact_phone,
      image_url: newProd.image_url || null,
      status: 'available',
      is_active: true,
      seller_id: newProd.seller_id,
      company_id: cleanCompanyId,
      created_at: newProd.created_at
    };

    const safeInsert = async (tableName: string, payload: any) => {
      let { error } = await supabase.from(tableName).insert([payload]);
      if (error && payload.company_id) {
        console.warn(`Inserção com company_id em ${tableName} falhou: ${error.message}. Tentando sem company_id...`);
        const fallback = { ...payload };
        delete fallback.company_id;
        let { error: err2 } = await supabase.from(tableName).insert([fallback]);
        if (err2) {
          console.error(`Inserção sem company_id em ${tableName} também falhou:`, err2.message);
        } else {
          console.log(`Inserção sem company_id em ${tableName} efetuada com sucesso!`);
        }
      } else if (!error) {
        console.log(`Inserção em ${tableName} concluída com sucesso!`);
      }
    };

    try {
      await Promise.allSettled([
        safeInsert('marketplace', dbPayload),
        safeInsert('produtos', dbPayloadProdutos)
      ]);
    } catch (err) {
      console.log('Supabase product insert exception:', err);
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
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));

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
    const products = this.getProducts();
    const updated = products.filter(p => p.id !== productId);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));

    supabase.from('marketplace').delete().eq('id', productId).then(({ error }) => {
      if (error) console.log('Supabase marketplace delete note:', error.message);
    });
  },

  // Community Posts (Fonte de Verdade: SUPABASE + Cache Local para Performance)
  async fetchPosts(): Promise<CommunityPost[]> {
    const localPosts = this.getPosts();
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) {
        return localPosts;
      }

      // Ensure all posts have the necessary structure
      const remotePosts = (data || []).map(p => ({
        ...p,
        comments: Array.isArray(p.comments) ? p.comments : [],
        reactions: p.reactions && typeof p.reactions === 'object' ? p.reactions : {},
        likes_count: typeof p.likes_count === 'number' ? p.likes_count : 0,
        comments_count: typeof p.comments_count === 'number' ? p.comments_count : (Array.isArray(p.comments) ? p.comments.length : 0)
      })) as CommunityPost[];

      // Merge: preserve all remote posts + any local posts that might not be synced yet
      const remoteIds = new Set(remotePosts.map(p => p.id));
      const localOnly = localPosts.filter(p => !remoteIds.has(p.id));
      const merged = [...localOnly, ...remotePosts];

      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(merged));
      return merged;
    } catch {
      return localPosts;
    }
  },

  getPosts(): CommunityPost[] {
    const raw = localStorage.getItem(STORAGE_KEYS.POSTS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch {
      return [];
    }
  },

  async addPost(postData: Omit<CommunityPost, 'id' | 'created_at' | 'likes_count' | 'comments_count'>): Promise<CommunityPost> {
    const newPost: CommunityPost = {
      ...postData,
      id: 'post-' + Date.now(),
      likes_count: 0,
      comments_count: 0,
      comments: [],
      reactions: {},
      created_at: new Date().toISOString()
    };

    // 1. Optimistic Update (Immediate display and persistence)
    const posts = this.getPosts();
    const updated = [newPost, ...posts];
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updated));

    // 2. Persist in Supabase (Sanitize for DB)
    const dbPost: any = {
      id: newPost.id,
      author_id: newPost.author_id,
      author_type: newPost.author_type,
      author_name: newPost.author_name || 'Utilizador',
      author_avatar: newPost.author_avatar || '',
      company_id: (newPost.company_id && !newPost.company_id.startsWith('comp-')) ? newPost.company_id : null,
      content: newPost.content,
      image_url: newPost.image_url || null,
      category: newPost.category || 'Emprego',
      likes_count: 0,
      comments_count: 0,
      comments: [],
      created_at: newPost.created_at
    };

    const safeInsertPost = async (tableName: string, payload: any) => {
      let { error } = await supabase.from(tableName).insert([payload]);
      if (error && payload.company_id) {
        const fallback = { ...payload, company_id: null };
        await supabase.from(tableName).insert([fallback]);
      }
    };

    try {
      await Promise.allSettled([
        safeInsertPost('community_posts', dbPost),
        safeInsertPost('posts', dbPost)
      ]);
    } catch (err) {
      console.warn('Supabase post insert error:', err);
    }

    return newPost;
  },

  async reactToPost(postId: string, reactionType: PostReactionType, userId: string): Promise<CommunityPost | null> {
    const posts = this.getPosts();
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return null;

    const targetPost = { ...posts[postIndex] };
    const reactions = { ...(targetPost.reactions || {}) };
    const current = reactions[userId];

    // Regra: UM utilizador só pode ter UMA reação por post.
    // Ao tocar novamente na reação ativa: remover a reação.
    if (current === reactionType) {
      delete reactions[userId];
    } else {
      reactions[userId] = reactionType;
    }

    const updatedPost: CommunityPost = {
      ...targetPost,
      reactions,
      likes_count: Object.keys(reactions).length,
      user_reaction: reactions[userId]
    };

    const updatedPosts = [...posts];
    updatedPosts[postIndex] = updatedPost;

    // 1. Optimistic Update
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));

    // 2. Persist in Supabase
    const { error } = await supabase
      .from('community_posts')
      .update({ 
        likes_count: updatedPost.likes_count
      })
      .eq('id', postId);

    if (error) {
      console.warn('Sincronização de reação falhou no servidor:', error.message);
      // We keep local state for responsiveness, but a refresh will revert if truly failed
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
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(newPosts));

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
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updated));
  },

  deletePost(postId: string): void {
    const posts = this.getPosts();
    const updated = posts.filter(p => p.id !== postId);
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updated));

    supabase.from('community_posts').delete().eq('id', postId).then(({ error }) => {
      if (error) console.log('Supabase post delete note:', error.message);
    });
  },

  // Exams - PRODUCTION SECURE LOGIC
  async submitExamAttempt(attemptData: Omit<ExamAttempt, 'id' | 'created_at' | 'passed' | 'percentage' | 'score' | 'total_points'>, answers: Record<string, string>, job: Job): Promise<ExamAttempt> {
    if (!job.exam) throw new Error('Exame não encontrado para esta vaga.');

    let score = 0;
    let totalPoints = 0;

    job.exam.questions.forEach(q => {
      totalPoints += q.points;
      const userAns = (answers[q.id] || '').trim().toLowerCase();
      
      let correctAns = '';
      try {
        correctAns = decodeURIComponent(atob(q.correct_answer || '')).trim().toLowerCase();
      } catch {
        correctAns = (q.correct_answer || '').trim().toLowerCase();
      }
      
      if (userAns === correctAns) {
        score += q.points;
      }
    });

    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const passed = percentage >= job.exam.passing_score;
    
    const newAttempt: ExamAttempt = {
      ...attemptData,
      id: 'att-' + Date.now(),
      score,
      total_points: totalPoints,
      percentage,
      passed,
      created_at: new Date().toISOString(),
      exam: {
        ...job.exam,
        questions: job.exam.questions.map(q => ({ ...q, correct_answer: 'HIDDEN' }))
      }
    };

    supabase.from('exam_attempts').insert([newAttempt]).then(({ error }) => {
      if (error) console.log('Exam attempt save note:', error.message);
    });

    const currentAttempts = this.getExamAttempts();
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify([newAttempt, ...currentAttempts]));

    this.addNotification({
      id: 'notif-' + Date.now(),
      user_id: attemptData.candidate_id,
      title: 'Resultado do Exame',
      message: `Concluiu o exame para ${job.title} com ${percentage}% (${passed ? 'Aprovado' : 'Não Aprovado'}).`,
      read: false,
      created_at: new Date().toISOString()
    });

    return newAttempt;
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
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS + '_' + userId, JSON.stringify(notifs));
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
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS + '_' + notif.user_id, JSON.stringify(updated));

    // Try persistence to Supabase
    supabase.from('notifications').insert([notif]).then(({ error }) => {
      if (error) console.log('Notifications persistence limited (missing table in Supabase).');
    });
  },

  markNotificationAsRead(userId: string, notifId: string): void {
    const notifs = this.getNotifications(userId);
    const updated = notifs.map(n => n.id === notifId ? { ...n, read: true } : n);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS + '_' + userId, JSON.stringify(updated));

    supabase.from('notifications').update({ read: true }).eq('id', notifId).then(({ error }) => {
      if (error) console.log('Read status sync limited.');
    });
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
    localStorage.setItem(`${STORAGE_KEYS.USER}_rich_${userId}`, JSON.stringify(updated));
    if (updated.email) {
      localStorage.setItem(`${STORAGE_KEYS.USER}_rich_${updated.email}`, JSON.stringify(updated));
    }

    return updated;
  }
};
