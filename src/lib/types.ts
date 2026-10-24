export type UserRole = 'candidate' | 'employer' | 'admin';

export interface ExperienceItem {
  id: string;
  title: string;
  company: string;
  period: string;
  description?: string;
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  year: string;
}

// ==========================================
// 1. PERFIL CANDIDATO (EXCLUSIVO DO CANDIDATO)
// ==========================================
export interface CandidateProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  whatsapp?: string;
  municipality: string;
  birth_date?: string;
  gender?: string;
  bio?: string;
  profession?: string;
  education?: string;
  skills?: string[];
  languages?: string[];
  certificates?: string[];
  cv_url?: string;
  cover_url?: string;
  availability?: string;
  headline?: string;
  experience_years?: number;
  experiences?: ExperienceItem[];
  educations?: EducationItem[];
  created_at: string;
  is_email_verified?: boolean;
  email_confirmed_at?: string | null;
}

// ==========================================
// 2. PERFIL EMPRESA (EXCLUSIVO DA EMPRESA)
// ==========================================
export interface CompanyProfile {
  id: string;
  user_id: string;
  name: string;
  logo_url?: string;
  cover_url?: string;
  industry: string;
  municipality: string;
  description: string;
  nif?: string;
  slogan?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  email?: string;
  website?: string;
  services: string[];
  followers_count?: number;
  marketplace_unlocked?: boolean; // Unlocked via PayPal
  created_at: string;
}

// ==========================================
// 3. CONTA DO USUÁRIO (SESSÃO SUPABASE)
// ==========================================
export interface UserProfile extends CandidateProfile {
  role: UserRole;
  company?: CompanyProfile;

  // Compatibilidade com componentes existentes
  company_name?: string;
  company_logo?: string;
  industry?: string;
  website?: string;
  nif?: string;
  address?: string;
  services?: string[];
  followers_count?: number;
  following_count?: number;
  cover_url?: string;
  marketplace_unlocked?: boolean;
  is_admin?: boolean;
  is_partner?: boolean;
  partner_title?: string;
  is_email_verified?: boolean;
  email_confirmed_at?: string | null;
}

export interface CompanyRating {
  id: string;
  company_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  rating: number; // 1 to 5
  comment?: string;
  created_at: string;
}

export interface PlatformPartner {
  id: string;
  user_id: string; // The mentioned platform user or company id
  user_name: string;
  user_email?: string;
  role: 'employer' | 'candidate' | string;
  partner_title: string; // e.g. "Parceiro Estratégico", "Parceiro Oficial de Tecnologia"
  description?: string;
  badge_label?: string; // e.g. "Parceiro Oficial"
  avatar_url?: string;
  municipality?: string;
  created_at: string;
}

export interface ExamQuestion {
  id: string;
  exam_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correct_answer: string;
  explanation?: string;
  points: number;
  is_required: boolean;
}

export interface Exam {
  id: string;
  job_id: string;
  title: string;
  description: string;
  time_limit_minutes: number;
  passing_score: number;
  max_attempts: number;
  is_required: boolean; // Added
  is_simulated?: boolean; // True para simulados/testes preparatórios de treino
  questions: ExamQuestion[];
  created_at: string;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  candidate_id: string;
  candidate_name?: string;
  job_id: string; // Added for easier filtering
  job_title?: string;
  application_id?: string; // Added link to application
  score: number;
  total_points: number;
  percentage: number;
  passed: boolean;
  time_spent_seconds: number;
  status: 'completed' | 'in_progress';
  is_simulated?: boolean; // True para testes simulados (não contabilizados em relatórios reais)
  created_at: string;
  exam?: Exam;
  answers?: Record<string, string>;
}

export interface Job {
  id: string;
  employer_id: string; // auth.users.id
  company_id?: string;
  title: string;
  company_name: string;
  company_logo?: string;
  municipality: string;
  location?: string;
  category: string;
  contract_type: string; // Simplified for flexibility
  experience_level: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency: string;
  description: string;
  requirements: string[];
  benefits: string[];
  vacancies_count: number;
  deadline?: string;
  whatsapp?: string;
  email?: string;
  status: 'active' | 'paused' | 'closed' | 'draft';
  has_exam: boolean;
  exam?: Exam;
  created_at: string;
  employer?: UserProfile;
}

export interface JobApplication {
  id: string;
  job_id: string;
  candidate_id: string;
  status: 'Enviada' | 'Em análise' | 'Selecionada para exame' | 'Exame realizado' | 'Aprovada' | 'Rejeitada' | 'Contratada';
  cover_letter?: string;
  cv_url?: string;
  exam_score?: number;
  exam_passed?: boolean;
  created_at: string;
  job?: Job;
  candidate?: CandidateProfile;
  exam_result?: ExamAttempt; // Added result integration
}

export interface MarketplaceProduct {
  id: string;
  seller_id: string; // auth.users.id
  company_id?: string;
  company_name?: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: 'Agricultura' | 'Serviços' | 'Veículos' | 'Tecnologia' | 'Imóveis' | 'Outros';
  municipality: string;
  image_url?: string;
  contact_phone: string;
  condition?: 'Novo' | 'Usado' | 'Bom estado';
  status: 'available' | 'sold';
  is_active?: boolean;
  created_at: string;
  seller?: UserProfile;
}

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  created_at: string;
  parent_id?: string;
  replies?: PostComment[];
  likes_count?: number;
  liked_by_user?: boolean;
}

export type PostReactionType = 'like' | 'love' | 'haha' | 'wow' | 'celebrate' | 'sad';

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // array de IDs de utilizadores
}

export interface PostPoll {
  options: PollOption[];
  expires_at?: string;
  total_votes?: number;
}

export interface CommunityPost {
  id: string;
  author_id: string; // auth.users.id
  author_type?: 'candidate' | 'employer';
  post_type?: 'candidate' | 'employer';
  author_name: string;
  author_avatar?: string;
  author?: UserProfile;
  company_id?: string;
  content: string;
  image_url?: string;
  poll?: PostPoll; // Added support for polls
  category?: 'Emprego' | 'Negócios' | 'Dicas' | 'Formação' | 'Empresas' | 'Marketplace' | 'Geral';
  likes_count: number;
  comments_count: number;
  comments?: PostComment[];
  reactions?: Record<string, PostReactionType>;
  user_reaction?: PostReactionType;
  is_edited?: boolean; // Added
  reports_count?: number; // Added for moderation
  created_at: string;
  liked_by_user?: boolean;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  link?: string;
  sender_name?: string; // e.g. "Notificação do Sistema"
  is_system?: boolean;
}

export interface FollowerItem {
  id: string; // Follower user ID
  name: string;
  avatar_url?: string;
  role: UserRole;
  municipality?: string;
  profession?: string;
  target_id: string; // Target company or user ID
  target_name?: string;
  created_at: string;
}

export const CUNENE_MUNICIPALITIES = [
  'Ondjiva',
  'Cuanhama',
  'Ombadja',
  'Namacunde',
  'Cahama',
  'Cuvelai'
];

export const JOB_CATEGORIES = [
  'Tecnologia e TI',
  'Agricultura e Pecuária',
  'Comércio e Vendas',
  'Educação e Formação',
  'Saúde e Enfermagem',
  'Construção e Engenharia',
  'Turismo e Hotelaria',
  'Transportes e Logística',
  'Administração e Finanças',
  'Outros'
];

export const COMMUNITY_CATEGORIES = [
  'Todos',
  'Emprego',
  'Negócios',
  'Dicas',
  'Formação',
  'Empresas',
  'Marketplace'
] as const;

export interface PlatformUserInfo {
  id: string;
  name: string;
  email: string;
  role: 'candidate' | 'employer' | 'admin' | string;
  municipality?: string;
  avatar_url?: string;
  whatsapp?: string;
  created_at?: string;
}

export interface PlatformStats {
  totalUsers: number;
  totalCandidates: number;
  totalEmployers: number;
  totalPosts: number;
  totalJobs: number;
  totalProducts: number;
  totalExams: number;
  users: PlatformUserInfo[];
}

export interface TelecomNewsItem {
  id: string;
  operator_name: string; // 'UNITEL' | 'Africell' | 'Movicel' | 'Angola Telecom' | 'Zap Fibra' | string;
  title: string;
  summary: string;
  content: string;
  image_url?: string;
  badge?: string; // 'Cobertura 4G/5G' | 'Expansão de Rede' | 'Fibra Óptica' | 'Tarifários' | 'Comunicado'
  municipality?: string;
  source_url?: string;
  company_id?: string;
  author_name?: string;
  likes_count?: number;
  views_count?: number;
  is_featured?: boolean;
  published_at: string;
  created_at: string;
}

export interface FeaturedCampaign {
  id: string;
  type: 'company' | 'product';
  target_id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'suspended' | 'expired';
  is_sponsored: boolean;
  created_by: string;
  created_at: string;
}

export interface ManualPaymentRequest {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  amount: string;
  reference: string;
  proof_note: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_at?: string;
  expires_at?: string;
}


