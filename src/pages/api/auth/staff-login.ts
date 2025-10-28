export const prerender = false;
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const formData = await request.formData();
  const username = formData.get('username')?.toString();
  const password = formData.get('password')?.toString();

  if (!username || !password) {
    return redirect('/staff-login?error=Usuario y contraseña requeridos');
  }

  // 1️⃣ Buscar el usuario
  const { data: profile, error: profileError } = await locals.supabase
    .from('perfiles')
    .select('email, rol')
    .eq('username', username)
    .maybeSingle();

  if (profileError || !profile) {
    console.error('Error buscando perfil staff:', profileError);
    return redirect('/staff-login?error=Usuario no encontrado');
  }

  // 2️⃣ Iniciar sesión (esto ahora guarda la cookie)
  const { error: signInError } = await locals.supabase.auth.signInWithPassword({
    email: profile.email,
    password,
  });

  if (signInError) {
    console.error(signInError);
    return redirect('/staff-login?error=Contraseña incorrecta');
  }

  // 3️⃣ Redirigir según rol
  if (profile.rol === 'admin') {
    return redirect('/admin/dashboard');
  } else {
    return redirect('/ventas/dashboard');
  }
};
