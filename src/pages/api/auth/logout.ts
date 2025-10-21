import type { APIRoute } from 'astro';

// Usamos GET porque el botón simplemente nos redirige (es un request GET)
export const GET: APIRoute = ({ cookies, redirect }) => {
  // 1. Le decimos a Astro que borre la cookie "session"
  cookies.delete("session", {
    path: "/",
  });

  // 2. Enviamos al usuario de vuelta a la página de login
  return redirect("/login");
};