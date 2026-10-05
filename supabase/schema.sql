-- ========================================================
-- CUNENEVAGAS & MARKETPLACE — SUPABASE DATABASE SCHEMA
-- ARQUITETURA ISOLADA: CANDIDATO ↔ EMPRESA
-- ========================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1A. CANDIDATE PROFILES (DADOS EXCLUSIVOS DO CANDIDATO)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  role text not null check (role in ('candidate', 'employer', 'admin')) default 'candidate',
  avatar_url text,
  phone text,
  whatsapp text,
  municipality text default 'Ondjiva',
  birth_date text,
  gender text,
  bio text,
  profession text,
  education text,
  skills jsonb default '[]'::jsonb,
  languages jsonb default '[]'::jsonb,
  certificates jsonb default '[]'::jsonb,
  cv_url text,
  availability text,
  headline text,
  experience_years numeric default 0,
  experiences jsonb default '[]'::jsonb,
  educations jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone" 
on public.profiles for select using (true);

create policy "Users can insert their own profile" 
on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile" 
on public.profiles for update using (auth.uid() = id);


-- 1B. COMPANIES TABLE (DADOS EXCLUSIVOS DA EMPRESA - NUNCA SOBRESCREVEM O CANDIDATO)
create table if not exists public.companies (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  name text not null,
  logo_url text,
  cover_url text,
  industry text not null default 'Comércio e Serviços',
  municipality text not null default 'Ondjiva',
  description text default '',
  nif text,
  phone text,
  whatsapp text,
  address text,
  email text,
  website text,
  services jsonb default '[]'::jsonb,
  followers_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for companies
alter table public.companies enable row level security;

create policy "Companies are viewable by everyone" 
on public.companies for select using (true);

create policy "Users can insert their own company" 
on public.companies for insert with check (auth.uid() = user_id);

create policy "Users can update their own company" 
on public.companies for update using (auth.uid() = user_id);

create policy "Users can delete their own company" 
on public.companies for delete using (auth.uid() = user_id);


-- 2. JOBS TABLE (PERTENCEM EXCLUSIVAMENTE À EMPRESA)
create table if not exists public.jobs (
  id text primary key,
  employer_id uuid references auth.users(id) on delete cascade not null,
  company_id text references public.companies(id) on delete set null,
  title text not null,
  company_name text not null,
  company_logo text,
  municipality text not null,
  location text,
  category text not null,
  contract_type text not null,
  experience_level text not null,
  salary_min numeric,
  salary_max numeric,
  salary_currency text default 'AOA',
  description text not null,
  requirements jsonb default '[]'::jsonb,
  benefits jsonb default '[]'::jsonb,
  vacancies_count integer default 1,
  deadline text,
  whatsapp text,
  email text,
  status text check (status in ('active', 'paused', 'closed', 'draft')) default 'active',
  has_exam boolean default false,
  exam jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for jobs
alter table public.jobs enable row level security;

create policy "Jobs are viewable by everyone" 
on public.jobs for select using (true);

create policy "Employers can create jobs" 
on public.jobs for insert with check (auth.uid() = employer_id);

create policy "Employers can update their own jobs" 
on public.jobs for update using (auth.uid() = employer_id);

create policy "Employers can delete their own jobs" 
on public.jobs for delete using (auth.uid() = employer_id);


-- 3. MARKETPLACE PRODUCTS TABLE (PERTENCEM EXCLUSIVAMENTE À EMPRESA/LOJA)
create table if not exists public.marketplace_products (
  id text primary key,
  seller_id uuid references auth.users(id) on delete cascade not null,
  company_id text references public.companies(id) on delete set null,
  company_name text,
  title text not null,
  description text not null,
  price numeric not null,
  currency text default 'AOA',
  category text not null,
  municipality text not null,
  image_url text,
  contact_phone text not null,
  condition text default 'Novo',
  status text check (status in ('available', 'sold')) default 'available',
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for marketplace_products
alter table public.marketplace_products enable row level security;

create policy "Products are viewable by everyone" 
on public.marketplace_products for select using (true);

create policy "Users can insert their own products" 
on public.marketplace_products for insert with check (auth.uid() = seller_id);

create policy "Users can update their own products" 
on public.marketplace_products for update using (auth.uid() = seller_id);

create policy "Users can delete their own products" 
on public.marketplace_products for delete using (auth.uid() = seller_id);


-- 4. COMMUNITY POSTS TABLE (SEPARAÇÃO RIGOROSA: 'candidate' vs 'employer')
create table if not exists public.community_posts (
  id text primary key,
  author_id uuid references auth.users(id) on delete cascade not null,
  author_type text not null check (author_type in ('candidate', 'employer')) default 'candidate',
  author_name text not null,
  author_avatar text,
  company_id text,
  content text not null,
  image_url text,
  category text default 'Emprego',
  likes_count integer default 0,
  comments_count integer default 0,
  comments jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for community_posts
alter table public.community_posts enable row level security;

create policy "Posts are viewable by everyone" 
on public.community_posts for select using (true);

create policy "Users can create posts" 
on public.community_posts for insert with check (auth.uid() = author_id);

create policy "Users can update their own posts" 
on public.community_posts for update using (auth.uid() = author_id);

create policy "Users can delete their own posts" 
on public.community_posts for delete using (auth.uid() = author_id);


-- 5. JOB APPLICATIONS TABLE
create table if not exists public.job_applications (
  id text primary key,
  job_id text references public.jobs(id) on delete cascade not null,
  candidate_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'Enviada',
  cover_letter text,
  cv_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for job_applications
alter table public.job_applications enable row level security;

create policy "Candidates can view their own applications" 
on public.job_applications for select 
using (
  auth.uid() = candidate_id 
  or 
  exists (select 1 from public.jobs where jobs.id = job_applications.job_id and jobs.employer_id = auth.uid())
);

create policy "Candidates can insert applications" 
on public.job_applications for insert with check (auth.uid() = candidate_id);

create policy "Employers can update status of applications for their jobs" 
on public.job_applications for update using (
  exists (select 1 from public.jobs where jobs.id = job_applications.job_id and jobs.employer_id = auth.uid())
);


-- ==========================================
-- 6. PAYMENT TRANSACTIONS TABLE (PAGAMENTOS PAYPAL)
-- ==========================================
create table if not exists public.payment_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  company_id text references public.companies(id) on delete cascade not null,
  resource_type text not null check (resource_type in ('marketplace_unlocked')),
  amount numeric not null,
  currency text not null default 'USD',
  paypal_order_id text unique not null,
  paypal_capture_id text,
  status text not null check (status in ('pending', 'approved', 'completed', 'failed', 'cancelled')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.payment_transactions enable row level security;

create policy "Users can view their own payment transactions"
on public.payment_transactions for select using (auth.uid() = user_id);

create policy "Users can insert their own transactions"
on public.payment_transactions for insert with check (auth.uid() = user_id);

create policy "Users can update their own transactions"
on public.payment_transactions for update using (auth.uid() = user_id);

