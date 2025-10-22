// Ruta: src/pages/api/auth/register.ts (API para Clientes)
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const formData = await request.formData();
  const email = formData.get('email')?.toString();
  const password = formData.get('password')?.toString();

  // Validación básica
  if (!email || !password) {
    return redirect('/register?error=Email y contraseña son requeridos');
  }
  if (password.length < 6) {
     return redirect('/register?error=La contraseña debe tener al menos 6 caracteres');
  }

  // 1. Intentar crear el usuario en Supabase Auth
  const { data: authData, error: authError } = await locals.supabase.auth.signUp({ 
    email: email, 
    password: password 
  });

  // Manejar error de registro (ej: email ya existe)
  if (authError || !authData.user) {
    console.error("Error Supabase signUp:", authError?.message);
    return redirect(`/register?error=${authError?.message || 'Error desconocido al registrar.'}`);
  }

  // 2. Insertar el perfil del CLIENTE en nuestra tabla 'profiles'
  // Asignamos rol 'cliente' y dejamos username como null (o puedes generarlo si quieres)
  const { error: profileError } = await locals.supabase
    .from('profiles')
    .insert({ 
        id: authData.user.id, // Vincula con el usuario de Auth
        rol: 'cliente',       // Rol específico para clientes
        email: email          // Guardamos email aquí también (útil y requerido por el ajuste de staff)
        // username: null,    // Puedes omitirlo o poner null explícitamente
    }); 

  // Manejar error al crear el perfil (muy importante)
  if (profileError) {
     console.error("Error Crítico: No se pudo crear el perfil para el nuevo usuario:", profileError);
     // En un caso real, aquí deberías intentar borrar el usuario de auth.users 
     // que se creó en el paso 1 para evitar inconsistencias.
     // Ejemplo (requiere clave 'service_role' configurada o hacerlo manualmente):
     // await locals.supabase.auth.admin.deleteUser(authData.user.id);
     return redirect(`/register?error=Error interno al crear el perfil. Contacta soporte.`);
  }

  // ¡Registro Exitoso! Redirigir al login con mensaje de éxito
  return redirect('/login?message=¡Registro exitoso! Ya puedes iniciar sesión.');
};