
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, updates } = await req.json();
    if (!user_id || !updates) {
      throw new Error("Se requieren el ID de usuario (user_id) y los datos a actualizar (updates).");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Separar los datos de autenticación de los datos del perfil
    const { email, password, ...profileUpdates } = updates;
    const authUpdates: { email?: string; password?: string } = {};

    if (email) authUpdates.email = email;
    if (password) authUpdates.password = password; // Permitir actualización de contraseña

    // 1. Actualizar el usuario en Supabase Auth si hay cambios de email o contraseña
    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        authUpdates
      );
      if (authError) throw authError;
    }

    // 2. Actualizar el perfil en la tabla 'perfiles' si hay otros cambios
    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from("perfiles")
        .update(profileUpdates)
        .eq("id", user_id);
      if (profileError) throw profileError;
    }

    // Devolver una respuesta exitosa
    return new Response(JSON.stringify({ message: "Empleado actualizado correctamente" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
