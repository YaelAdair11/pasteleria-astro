import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const formData = await request.formData();
  const username = formData.get('username')?.toString();
  const password = formData.get('password')?.toString();

  if (!username || !password) {
    return redirect('/staff-login?error=Usuario y contraseña requeridos');
  }

  // 1. Buscar el usuario en la tabla 'profiles' por su USERNAME
  const { data: profile, error: profileError } = await locals.supabase
    .from('profiles')
    .select('id, rol') // Necesitamos el ID para obtener el email
    .eq('username', username)
    .in('rol', ['admin', 'usuario']) // Solo buscar entre roles de staff
    .single();

  if (profileError || !profile) {
    console.error("Error buscando perfil staff:", profileError);
    return redirect('/staff-login?error=Usuario no encontrado o no es staff');
  }

  // 2. Obtener el EMAIL del usuario desde Supabase Auth usando el ID
  // ¡IMPORTANTE! Esto requiere permisos de admin en Supabase.
  // Necesitaremos usar la 'service_role' key para esto.
  // O, alternativamente, guardar el email también en la tabla 'profiles'.
  // Vamos a elegir guardar el email en 'profiles' por simplicidad y seguridad.

  // *** AJUSTE NECESARIO: Guardaremos email en profiles también ***
  // Vuelve al Paso 1 y añade 'email text' a la tabla 'profiles'
  // y asegúrate de poblarlo al crear usuarios staff manualmente.

  // ASUMIENDO QUE AÑADISTE EMAIL A PROFILES Y LO PROBASTE:
   const { data: profileWithEmail, error: emailError } = await locals.supabase
    .from('profiles')
    .select('id, rol, email') // Ahora pedimos el email
    .eq('username', username)
    .in('rol', ['admin', 'usuario']) 
    .single();

   if (emailError || !profileWithEmail || !profileWithEmail.email) {
     console.error("Error buscando email del staff:", emailError);
     return redirect('/staff-login?error=No se pudo obtener el email del usuario');
   }


  // 3. Autenticar con Supabase usando el EMAIL recuperado y la CONTRASEÑA dada
  const { error: signInError } = await locals.supabase.auth.signInWithPassword({
    email: profileWithEmail.email, // Usamos el email encontrado
    password: password,
  });

  if (signInError) {
    return redirect('/staff-login?error=Contraseña incorrecta');
  }

  // 4. Redirigir según el ROL (ya lo teníamos del primer query)
  if (profileWithEmail.rol === 'admin') {
    return redirect('/admin/dashboard');
  } 
  // Si no es admin, asumimos que es 'usuario' (cajero) porque filtramos antes
  return redirect('/ventas/dashboard'); 
};