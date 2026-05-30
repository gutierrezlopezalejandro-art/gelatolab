// ===========================================================================
// Edge Function: admin-send-email
// ---------------------------------------------------------------------------
// Permite al panel admin enviar emails transaccionales a usuarios via Resend.
// Solo accesible por usuarios con role='admin'.
//
// Flujo:
//   1) Cliente envia POST con Bearer <jwt_del_admin> en Authorization
//   2) Verificamos el JWT y chequeamos que profiles.role = 'admin'
//   3) Enviamos el email via Resend API
//   4) Registramos la accion en audit_log
//
// Variables de entorno requeridas (configurar en Supabase Dashboard):
//   - SUPABASE_URL              (auto)
//   - SUPABASE_ANON_KEY         (auto)
//   - SUPABASE_SERVICE_ROLE_KEY (auto, secret)
//   - RESEND_API_KEY            (configurar manualmente)
//
// POST body: { to: string, subject: string, html: string, target_user_id?: string }
// ===========================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar JWT del caller
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar que el caller es admin
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parsear body
    const { to, subject, html, target_user_id } = await req.json();
    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, html' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enviar via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'GelatoLab <noreply@gelatolab.app>',
        to: [to],
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json();
    if (!resendRes.ok) {
      return new Response(JSON.stringify({ error: 'Resend error', details: resendData }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Registrar en audit_log
    await adminClient.from('audit_log').insert({
      admin_id: user.id,
      admin_email: user.email,
      action: 'manual',
      target_user_id: target_user_id ?? null,
      target_email: to,
      details: { type: 'email', subject, resend_id: resendData.id },
    });

    return new Response(JSON.stringify({ ok: true, resend_id: resendData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
