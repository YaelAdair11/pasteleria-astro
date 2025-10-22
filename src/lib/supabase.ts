import { createClient } from '@supabase/supabase-js';

// ✅ Usa las variables con el prefijo PUBLIC_
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
