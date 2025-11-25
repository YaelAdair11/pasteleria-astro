import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- LOGS DE DEPURACIÓN ---
    console.log("--- INICIANDO DEPURACIÓN DE 'crear-empleado' ---");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("Valor de SUPABASE_URL:", supabaseUrl ? "Encontrada" : "¡NO ENCONTRADA!");
    console.log("Valor de SUPABASE_SERVICE_ROLE_KEY:", serviceKey ? "Encontrada" : "¡NO ENCONTRADA!");
    console.log("--- FIN DE DEPURACIÓN ---");

    const payload = await req.json();
    console.log("Payload recibido:", payload);
    

    const { email, password, username, rol } = payload;

    if (!email || !password || !username || !rol) {
      return new Response(
        JSON.stringify({ error: "Email, password, username y rol son campos requeridos." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    console.log("1. Intentando crear usuario en Supabase Auth...");
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    });

    if (authError) {
      console.error("!!! ERROR EN SUPABASE AUTH AL CREAR USUARIO:", JSON.stringify(authError, null, 2));
      const status = (authError as any).status || 500;
      return new Response(
        JSON.stringify({ error: `Auth Error: ${authError.message}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: status }
      );
    }

    if (!authData.user) {
      throw new Error("Auth devolvió un usuario nulo sin un error explícito.");
    }

    const userId = authData.user.id;
    console.log(`Usuario de Auth creado con éxito. ID: ${userId}`);

    console.log("2. Intentando insertar perfil en la tabla 'perfiles'...");
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("perfiles")
      .insert({
        id: userId,
        username: username,
        rol: rol,
        email: email,
      
      })
      .select()
      .single();

    if (profileError) {
      console.error("!!! ERROR AL INSERTAR EN LA TABLA 'perfiles':", JSON.stringify(profileError, null, 2));
      
      console.log(`Iniciando rollback. Borrando usuario de Auth con ID: ${userId}`);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      
      const status = (profileError as any).code === '23505' ? 409 : 500; // 409 Conflict for unique violation
      const message = (profileError as any).code === '23505' ? "El nombre de usuario ya existe." : `Profile Error: ${profileError.message}`;

      return new Response(
        JSON.stringify({ error: message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: status }
      );
    }

    console.log("Perfil creado e insertado con éxito.");
    return new Response(JSON.stringify({ message: "Empleado creado correctamente", data: profileData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("!!! ERROR INESPERADO EN LA FUNCIÓN 'crear-empleado':", error);
    return new Response(JSON.stringify({ error: "Error interno del servidor.", details: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});