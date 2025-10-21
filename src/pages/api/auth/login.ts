// Importamos el tipo APIRoute para que Astro sepa que esto es un endpoint
import type { APIRoute } from 'astro';

// --- COPIAMOS TU LÓGICA DE USUARIOS ---
// ¡Este es el mismo array de tu archivo "inicio_sesion.js"!
// Más adelante, esto vendrá de una base de datos.
const cuentas = [
  { usuario: "admin", password: "admin123", rol: "admin" },
  { usuario: "cajero1", password: "1234", rol: "usuario" },
  { usuario: "cajero2", password: "5678", rol: "usuario" },
];
// --- FIN DE TU LÓGICA ---

// Astro busca una función "POST" porque tu formulario usa method="POST"
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  // 1. Leemos los datos que envió el formulario
  const formData = await request.formData();
  const username = formData.get("username")?.toString().trim();
  const password = formData.get("password")?.toString().trim();

  // 2. Validamos que los campos no estén vacíos
  if (!username || !password) {
    // Si están vacíos, redirigimos de vuelta al login con un mensaje
    // (Este ?error=... es un "query param" que podemos leer en login.astro)
    return redirect("/login?error=Campos requeridos");
  }

  // 3. Buscamos la cuenta (¡igual que en tu código viejo!)
  const cuenta = cuentas.find(
    (c) => c.usuario === username && c.password === password
  );

  // 4. Si no se encuentra la cuenta...
  if (!cuenta) {
    // Redirigimos de vuelta al login con un error
    return redirect("/login?error=Usuario o contraseña incorrectos");
  }

  // 5. ¡ÉXITO! El usuario es válido.
  // Ahora, en lugar de localStorage, creamos una "cookie" de sesión.
  cookies.set("session", JSON.stringify(cuenta), {
    path: "/",          // La cookie es válida en todo el sitio
    httpOnly: true,     // El JavaScript del navegador NO puede leerla (¡seguro!)
    secure: Boolean((import.meta as any).env?.PROD), // Solo enviar por HTTPS en producción
    maxAge: 60 * 60 * 24, // Expira en 1 día
  });

  // 6. Redirigimos al usuario a su panel correspondiente
  if (cuenta.rol === "admin") {
    return redirect("/admin/dashboard"); // Aún no creamos esta página
  } else {
    return redirect("/ventas/dashboard"); // Aún no creamos esta página
  }
};

// tsconfig settings were removed from this endpoint file.
// Move the following to your tsconfig.json at the project root if needed:
//
// {
//   "compilerOptions": {
//     // ...otras opciones...
//     "types": ["astro/env"]
//   }
// }

