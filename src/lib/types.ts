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
  availability?: string;
  headline?: string;
  experience_years?: number;
  experiences?: ExperienceItem[];
  educations?: EducationItem[];
  created_at: string;
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
}

export interface ExamQuestion {
  id: string;
  exam_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correct_answer: string;
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
  questions: ExamQuestion[];
  created_at: string;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  candidate_id: string;
  job_id: string; // Added for easier filtering
  application_id?: string; // Added link to application
  score: number;
  total_points: number;
  percentage: number;
  passed: boolean;
  time_spent_seconds: number;
  status: 'completed' | 'in_progress';
  created_at: string;
  exam?: Exam;
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
  category?: 'Emprego' | 'Negócios' | 'Dicas' | 'Formação' | 'Empresas' | 'Marketplace' | 'Geral';
  likes_count: number;
  comments_count: number;
  comments?: PostComment[];
  reactions?: Record<string, PostReactionType>;
  user_reaction?: PostReactionType;
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
