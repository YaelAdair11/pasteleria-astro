export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const username = formData.get('username')?.toString();
  const password = formData.get('password')?.toString();

  if (!username || !password) {
    return redirect('/login?error=Faltan datos');
  }

  // 1️⃣ Buscar usuario por username
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email, rol')
    .eq('username', username)
    .maybeSingle();

  if (profileError || !profile) {
    console.error(profileError || 'No se encontró el usuario');
    return redirect('/login?error=Usuario no encontrado');
  }

  // 2️⃣ Intentar iniciar sesión con email + contraseña
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password,
  });

  if (signInError) {
    console.error(signInError);
    return redirect('/login?error=Credenciales incorrectas');
  }

  // 3️⃣ Redirigir según rol
  if (profile.rol === 'admin') {
    return redirect('/admin/dashboard');
  } else {
    return redirect('/ventas/dashboard');
  }
};
