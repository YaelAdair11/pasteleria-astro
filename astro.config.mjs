import { defineConfig } from 'astro/config';
import supabase from 'astro-supabase'; // <-- AÑADE ESTA LÍNEA

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [supabase()] // <-- AÑADE ESTA LÍNEA DENTRO DE []
});