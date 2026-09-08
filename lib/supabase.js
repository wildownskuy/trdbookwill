// lib/supabase.js
// Supabase browser client (singleton) untuk frontend Next.js
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Singleton client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;