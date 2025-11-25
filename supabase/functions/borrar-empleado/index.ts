import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

// Headers CORS para permitir solicitudes desde cualquier origen
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Manejar la solicitud OPTIONS (pre-flight) para CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- LOGS DE DEPURACIÓN ---
    console.log("--- INICIANDO DEPURACIÓN DE VARIABLES DE ENTORNO ---");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("Valor de SUPABASE_URL:", supabaseUrl ? "Encontrada" : "¡NO ENCONTRADA!");
    console.log("Valor de SUPABASE_SERVICE_ROLE_KEY:", serviceKey ? "Encontrada" : "¡NO ENCONTRADA!");

    if (serviceKey) {
      console.log(`- Longitud de la Service Key: ${serviceKey.length}`);
      console.log(`- La Service Key comienza con: ${serviceKey.substring(0, 5)}...`);
    }
    console.log("--- FIN DE DEPURACIÓN ---");
    
    console.log("Función 'borrar-empleado' invocada.");
    console.log("Headers:", Object.fromEntries(req.headers.entries()));

    const bodyText = await req.text();
    console.log("Cuerpo de la solicitud (texto):", bodyText);

    if (!bodyText) {
      return new Response(JSON.stringify({ error: "El cuerpo de la solicitud está vacío." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    let payload;
    try {
      payload = JSON.parse(bodyText);
    } catch (e) {
      console.error("Error al parsear JSON:", e);
      return new Response(JSON.stringify({ error: "JSON malformado.", details: e.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("Payload parseado:", payload);
    const { user_id } = payload;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "El ID del usuario (user_id) es requerido en el payload." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // --- ORDEN DE BORRADO ---

    // 1. Borrar registros de las tablas que hacen referencia al usuario.
    // Ignoramos los errores por si el usuario no tiene registros en alguna de ellas.
    console.log(`Iniciando limpieza de registros para el usuario: ${user_id}`);

    await supabaseAdmin.from('agenda_turnos').delete().eq('empleado_id', user_id);
    await supabaseAdmin.from('peticiones').delete().eq('empleado_id', user_id);
    await supabaseAdmin.from('cortes_caja').delete().eq('usuario_id', user_id);
    await supabaseAdmin.from('ventas').delete().eq('usuario_id', user_id);
    
    // El perfil es el último antes del usuario de auth.
    const { error: profileError } = await supabaseAdmin.from("perfiles").delete().eq("id", user_id);
    if (profileError) {
      console.error(`Error al borrar el perfil: ${profileError.message}`);

    }
    
    console.log("Limpieza finalizada. Procediendo a borrar el usuario de Auth.");

    // 2. Ahora, borrar el usuario del sistema de autenticación.
    const { data, error: authError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (authError) {
      const status = (authError as any).status || 500;
      console.error(`Error en deleteUser (status: ${status}):`, authError.message);
      return new Response(JSON.stringify({ error: `Fallo al borrar el usuario de Auth: ${authError.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: status,
      });
    }

    console.log("Usuario y todos sus datos relacionados eliminados correctamente.");
    return new Response(JSON.stringify({ message: "Usuario eliminado con éxito de todo el sistema" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    console.error("Error inesperado en la función 'borrar-empleado':", error);
    return new Response(JSON.stringify({ error: "Error interno del servidor.", details: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});