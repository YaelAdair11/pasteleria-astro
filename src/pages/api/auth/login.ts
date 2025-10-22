// Ruta: src/pages/api/auth/login.ts (API para Clientes)
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const formData = await request.formData();
  const email = formData.get('email')?.toString(); // Cliente usa email
  const password = formData.get('password')?.toString();

  if (!email || !password) {
    return redirect('/login?error=Email y contraseña requeridos');
  }

  // 1. Intentar iniciar sesión con Supabase Auth (usando email)
  const { data: authData, error: signInError } = await locals.supabase.auth.signInWithPassword({ 
    email: email, 
    password: password 
  });

  // Manejar error de inicio de sesión (email no existe, contraseña incorrecta)
  if (signInError || !authData.user) {
    return redirect(`/login?error=Email o contraseña incorrectos`);
  }

  // --- Verificación Opcional de Rol ---
  // Para asegurar que solo clientes usen este login
  try {
    const { data: profile, error: profileError } = await locals.supabase
      .from('profiles')
      .select('rol')
      .eq('id', authData.user.id)
      .single();

    if (profileError) throw profileError; // Lanzar error si la consulta falla

    // Si el perfil existe y NO es 'cliente', cerrar sesión y mostrar error
    if (profile && profile.rol !== 'cliente') {
       await locals.supabase.auth.signOut(); // Desloguear inmediatamente
       return redirect('/login?error=Acceso denegado. Rol no es de cliente.'); 
       // O podrías redirigir a /staff-login si quieres ser más amigable
    }
    // Si no hay perfil O es cliente, continuamos...
    // (Podrías manejar el caso sin perfil como un error si prefieres)

  } catch (error) {
    console.error("Error verificando rol de cliente:", error);
    await locals.supabase.auth.signOut(); // Asegurar cierre de sesión si hubo error
    return redirect('/login?error=Error al verificar el tipo de usuario.');
  }
  // --- Fin Verificación Opcional ---


  // 2. Redirigir al cliente a la página principal (o a su dashboard si tuviera)
  // La cookie de sesión es manejada automáticamente por `astro-supabase`
  return redirect('/'); // Redirige a la tienda/página de inicio
};