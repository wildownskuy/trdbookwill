// lib/supabase.js
// Supabase browser client (singleton) untuk frontend Next.js
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://plydqdoqbrjbhntpwcca.supabase.co';
export const supabaseAnonKey = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBseWRxZG9xYnJqYmhudHB3Y2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NTUzMDMsImV4cCI6MjEwNDQzMTMwM30.MAFJxDK767DjNTR2pmhrl2gjKgoF32V4WxajOeUfUcY';

// Singleton client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;