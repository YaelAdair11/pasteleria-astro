/// <reference types="astro/client" />

// Añade esto para decirle a TypeScript cómo es 'locals.supabase'
declare namespace App {
  interface Locals {
    supabase: import('@supabase/supabase-js').SupabaseClient;
    getSession: () => Promise<import('@supabase/supabase-js').Session | null>;
    // Puedes añadir más cosas a locals si las necesitas
  }
}