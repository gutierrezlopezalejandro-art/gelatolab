import { supabase } from './supabase';

// Wrappers de las RPC del admin panel (definidas en migrations/004_admin_panel.sql).
// Todas validan internamente que el caller tenga role='admin'; si no lo es,
// la RPC tira "forbidden: admin role required" y aca lo propagamos como Error.

function unwrap(promise, label) {
  return promise.then(({ data, error }) => {
    if (error) {
      const msg = error.message || String(error);
      throw new Error(`${label}: ${msg}`);
    }
    return data;
  });
}

export function adminListUsers() {
  return unwrap(supabase.rpc('admin_list_users'), 'admin_list_users');
}

export function adminGetStats() {
  return unwrap(supabase.rpc('admin_get_stats'), 'admin_get_stats');
}

export function adminUpdateUserPlan(targetUserId, newPlan, expiresAt = null) {
  return unwrap(
    supabase.rpc('admin_update_user_plan', {
      p_target_user_id: targetUserId,
      p_new_plan: newPlan,
      p_expires_at: expiresAt,
    }),
    'admin_update_user_plan',
  );
}

export function adminUpdateUserRole(targetUserId, newRole) {
  return unwrap(
    supabase.rpc('admin_update_user_role', {
      p_target_user_id: targetUserId,
      p_new_role: newRole,
    }),
    'admin_update_user_role',
  );
}

export function adminSuspendUser(targetUserId, suspend, reason = null) {
  return unwrap(
    supabase.rpc('admin_suspend_user', {
      p_target_user_id: targetUserId,
      p_suspend: suspend,
      p_reason: reason,
    }),
    'admin_suspend_user',
  );
}

export function adminGetUserActivity(targetUserId) {
  return unwrap(
    supabase.rpc('admin_get_user_activity', { p_target_user_id: targetUserId }),
    'admin_get_user_activity',
  );
}

export function adminGetAuditLog({ limit = 50, offset = 0, targetUserId = null } = {}) {
  return unwrap(
    supabase.rpc('admin_get_audit_log', {
      p_limit: limit,
      p_offset: offset,
      p_target_user_id: targetUserId,
    }),
    'admin_get_audit_log',
  );
}

export async function adminSendEmail({ to, subject, html, targetUserId = null }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('adminSendEmail: no session');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-send-email`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ to, subject, html, target_user_id: targetUserId }),
    },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'adminSendEmail: error');
  return json;
}
