import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 
  (import.meta.env.VITE_SUPABASE_URL as string) || 
  (import.meta.env.SUPABASE_URL as string) || 
  'https://gdjyrgufdjboqkusredk.supabase.co';

const SUPABASE_ANON_KEY = 
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 
  (import.meta.env.SUPABASE_ANON_KEY as string) || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkanlyZ3VmZGpib3FrdXNyZWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NjMyMzgsImV4cCI6MjEwNjQzOTIzOH0.R5Cyg1oEEvMYDqMgY7vx7AvwzalPWZEmaYOuLrClQgo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

export const signUp = async (email: string, password: string, options?: any) => {
  return await supabase.auth.signUp({ email, password, options });
};

export const signInWithPassword = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export const resetPasswordForEmail = async (email: string) => {
  return await supabase.auth.resetPasswordForEmail(email);
};

export const getSession = async () => {
  return await supabase.auth.getSession();
};

export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};
