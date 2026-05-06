// ===========================================================================
// Edge Function: delete-account
// ---------------------------------------------------------------------------
// Cumple el requisito de Apple App Store (sección 5.1.1(v) de las Review
// Guidelines, vigente desde junio 2022): "Apps that support account creation
// must also offer account deletion within the app".
//
// Flujo:
//   1) Cliente envía POST con Bearer <jwt_del_usuario> en Authorization
//   2) Verificamos el JWT con la anon key — extrae el user_id
//   3) Con la service_role key, llamamos a auth.admin.deleteUser(user_id)
//   4) Las tablas user_recipes/user_ingredients/user_productions/user_plans/
//      profiles tienen FK con ON DELETE CASCADE, así que el borrado en
//      auth.users elimina automáticamente todos los datos del usuario.
//
// Variables de entorno (configuradas en Supabase Dashboard):
//   - SUPABASE_URL          (auto)
//   - SUPABASE_ANON_KEY     (auto)
//   - SUPABASE_SERVICE_ROLE_KEY  (auto, secret)
//
// Despliegue:
//   supabase functions deploy delete-account
//
// Test local:
//   supabase functions serve delete-account
//   curl -X POST http://localhost:54321/functions/v1/delete-account \
//     -H "Authorization: Bearer <jwt>"
// ===========================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Pre-flight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    const jwt = authHeader.replace('Bearer ', '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Cliente con anon key — SOLO para verificar el JWT del usuario
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;

    // Cliente admin — borra el usuario de auth.users. ON DELETE CASCADE
    // hace que las tablas user_recipes / user_ingredients / etc. también
    // se borren automáticamente.
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteErr) {
      return new Response(JSON.stringify({ error: deleteErr.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, deletedUserId: userId }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
