import { useEffect, useMemo, useState } from 'react';
import {
  adminListUsers,
  adminUpdateUserPlan,
  adminUpdateUserRole,
  adminSuspendUser,
  adminGetUserActivity,
} from '../lib/admin';
import { Spinner } from '../components/ui/index.jsx';
import { useT } from '../lib/i18n';
import { useAuthStore } from '../store/authStore';

// pendingAction shape: { type: 'plan'|'role'|'suspend', user, newValue, reason? }
// Cuando un dropdown/boton dispara una accion, NO se aplica al instante:
// se setea pendingAction y aparece el ConfirmActionModal. Recien al "Confirmar"
// se llama la RPC. Esto evita misclicks que demoten/suspendan usuarios sin
// querer (cualquier accion queda registrada en audit_log y es auditable, pero
// mejor evitar el ruido).

export default function AdminUsers() {
  const t = useT();
  const meId = useAuthStore(s => s.user?.id);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [openUserId, setOpenUserId] = useState(null);
  const [activityCache, setActivityCache] = useState({});
  const [pendingAction, setPendingAction] = useState(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const list = await adminListUsers();
      setUsers(list || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return users.filter(u => {
      if (planFilter !== 'all' && u.plan !== planFilter) return false;
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (s) {
        const hay = [u.email, u.display_name].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [users, search, planFilter, roleFilter]);

  function requestPlanChange(user, newPlan) {
    if (newPlan === user.plan) return;
    setPendingAction({ type: 'plan', user, newValue: newPlan });
  }
  function requestRoleChange(user, newRole) {
    if (newRole === user.role) return;
    setPendingAction({ type: 'role', user, newValue: newRole });
  }
  function requestSuspendToggle(user) {
    const willSuspend = !user.suspended_at;
    setPendingAction({ type: 'suspend', user, newValue: willSuspend, reason: '' });
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;
    const { type, user, newValue, reason } = pendingAction;
    try {
      if (type === 'plan') {
        await adminUpdateUserPlan(user.user_id, newValue);
      } else if (type === 'role') {
        await adminUpdateUserRole(user.user_id, newValue);
      } else if (type === 'suspend') {
        await adminSuspendUser(user.user_id, newValue, reason || null);
      }
      setPendingAction(null);
      await reload();
    } catch (e) {
      // Mantener el modal abierto y mostrar el error ahi.
      setPendingAction(p => p ? { ...p, error: e.message } : null);
    }
  }

  async function toggleDetails(userId) {
    if (openUserId === userId) {
      setOpenUserId(null);
      return;
    }
    setOpenUserId(userId);
    if (!activityCache[userId]) {
      try {
        const act = await adminGetUserActivity(userId);
        setActivityCache(c => ({ ...c, [userId]: act }));
      } catch (e) {
        setActivityCache(c => ({ ...c, [userId]: { error: e.message } }));
      }
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error) return <div className="text-sm text-red-600 p-4 bg-red-50 rounded">⚠️ {error}</div>;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('admin_users_search_ph')}
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-black/10 text-sm"
        />
        <select
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-black/10 text-sm bg-white"
        >
          <option value="all">{t('admin_filter_all_plans')}</option>
          <option value="free">free</option>
          <option value="pro">pro</option>
          <option value="admin">admin</option>
        </select>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-black/10 text-sm bg-white"
        >
          <option value="all">{t('admin_filter_all_roles')}</option>
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        <button
          onClick={reload}
          className="px-3 py-2 rounded-lg border border-black/10 text-sm bg-white hover:bg-[var(--cream2)] cursor-pointer"
        >
          ↻ {t('admin_users_refresh')}
        </button>
      </div>

      <div className="text-xs text-[var(--ink3)]">
        {t('admin_users_count', { shown: filtered.length, total: users.length })}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[var(--cream2)]/40 border-b border-black/10">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">{t('admin_col_email')}</th>
              <th className="text-left px-3 py-2 font-semibold">{t('admin_col_plan')}</th>
              <th className="text-left px-3 py-2 font-semibold">{t('admin_col_role')}</th>
              <th className="text-left px-3 py-2 font-semibold">{t('admin_col_signup')}</th>
              <th className="text-left px-3 py-2 font-semibold">{t('admin_col_last_seen')}</th>
              <th className="text-right px-3 py-2 font-semibold">{t('admin_col_actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <UserRow
                key={u.user_id}
                u={u}
                isMe={u.user_id === meId}
                expanded={openUserId === u.user_id}
                activity={activityCache[u.user_id]}
                onRequestPlan={p => requestPlanChange(u, p)}
                onRequestRole={r => requestRoleChange(u, r)}
                onRequestSuspend={() => requestSuspendToggle(u)}
                onToggle={() => toggleDetails(u.user_id)}
                t={t}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-[var(--ink3)] text-xs">
                  {t('admin_users_no_results')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pendingAction && (
        <ConfirmActionModal
          action={pendingAction}
          onChange={(patch) => setPendingAction(p => ({ ...p, ...patch }))}
          onConfirm={confirmPendingAction}
          onCancel={() => setPendingAction(null)}
          t={t}
        />
      )}
    </div>
  );
}

function UserRow({ u, isMe, expanded, activity, onRequestPlan, onRequestRole, onRequestSuspend, onToggle, t }) {
  const isSuspended = !!u.suspended_at;
  return (
    <>
      <tr className={`border-b border-black/5 hover:bg-[var(--cream2)]/20 ${isSuspended ? 'opacity-60' : ''}`}>
        <td className="px-3 py-2">
          <button
            onClick={onToggle}
            className="text-left bg-transparent border-none cursor-pointer hover:underline"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs">{expanded ? '▼' : '▶'}</span>
              <span className="font-mono text-xs">{u.email}</span>
              {isMe && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[var(--mint3)] text-[var(--mint)]">{t('admin_label_you')}</span>}
              {isSuspended && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[var(--coral2)] text-[var(--coral)]">{t('admin_label_suspended')}</span>}
            </div>
            {u.display_name && <div className="text-xs text-[var(--ink3)] mt-0.5 ml-5">{u.display_name}</div>}
          </button>
        </td>
        <td className="px-3 py-2">
          <select
            value={u.plan}
            onChange={e => onRequestPlan(e.target.value)}
            className="px-2 py-1 rounded border border-black/10 text-xs bg-white"
            disabled={isSuspended}
          >
            <option value="free">free</option>
            <option value="pro">pro</option>
            <option value="admin">admin</option>
          </select>
        </td>
        <td className="px-3 py-2">
          <select
            value={u.role}
            onChange={e => onRequestRole(e.target.value)}
            className="px-2 py-1 rounded border border-black/10 text-xs bg-white"
            disabled={isMe || isSuspended}
            title={isMe ? t('admin_cannot_change_own_role') : ''}
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </td>
        <td className="px-3 py-2 text-xs text-[var(--ink3)]">{formatDate(u.created_at)}</td>
        <td className="px-3 py-2 text-xs text-[var(--ink3)]">{formatDate(u.last_sign_in_at) || '—'}</td>
        <td className="px-3 py-2 text-right">
          <button
            onClick={onRequestSuspend}
            disabled={isMe}
            className={`text-xs px-2 py-1 rounded border cursor-pointer ${
              isSuspended
                ? 'border-[var(--mint)] text-[var(--mint)] hover:bg-[var(--mint3)]'
                : 'border-[var(--coral)] text-[var(--coral)] hover:bg-[var(--coral2)]/40'
            } ${isMe ? 'opacity-30 cursor-not-allowed' : ''}`}
            title={isMe ? t('admin_cannot_suspend_self') : ''}
          >
            {isSuspended ? t('admin_action_unsuspend') : t('admin_action_suspend')}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-[var(--cream2)]/20">
          <td colSpan={6} className="px-3 py-3">
            {!activity ? <div className="flex justify-center"><Spinner /></div>
              : activity.error ? <div className="text-xs text-red-600">⚠️ {activity.error}</div>
              : <ActivityDetail activity={activity} t={t} />
            }
          </td>
        </tr>
      )}
    </>
  );
}

// Modal de confirmacion. Muestra un resumen de la accion (de qué a qué) y
// pide click explicito en "Confirmar". Si la RPC falla, queda visible el
// error en el modal sin cerrarlo (asi el usuario sabe qué pasó).
function ConfirmActionModal({ action, onChange, onConfirm, onCancel, t }) {
  const { type, user, newValue, reason, error } = action;
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  }

  let title, body, confirmLabel, danger;
  if (type === 'plan') {
    title = t('admin_confirm_plan_title');
    body = t('admin_confirm_plan_body', { email: user.email, from: user.plan, to: newValue });
    confirmLabel = t('admin_confirm_apply');
    danger = (user.plan === 'pro' || user.plan === 'admin') && newValue === 'free';
  } else if (type === 'role') {
    title = t('admin_confirm_role_title');
    body = t('admin_confirm_role_body', { email: user.email, from: user.role, to: newValue });
    confirmLabel = t('admin_confirm_apply');
    danger = user.role === 'admin' && newValue === 'user';
  } else if (type === 'suspend') {
    title = newValue ? t('admin_confirm_suspend_title') : t('admin_confirm_unsuspend_title');
    body = t(newValue ? 'admin_confirm_suspend_body' : 'admin_confirm_unsuspend_body', { email: user.email });
    confirmLabel = newValue ? t('admin_action_suspend') : t('admin_action_unsuspend');
    danger = newValue;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={() => !submitting && onCancel()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-xl text-[var(--ink)] mb-3">
          {danger && '⚠️ '}{title}
        </h3>
        <p className="text-sm text-[var(--ink2)] leading-relaxed mb-4">{body}</p>

        {type === 'suspend' && newValue && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[var(--ink3)] mb-1">
              {t('admin_suspend_reason_label')}
            </label>
            <textarea
              value={reason || ''}
              onChange={e => onChange({ reason: e.target.value })}
              placeholder={t('admin_suspend_reason_ph')}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-black/10 text-sm resize-y"
              disabled={submitting}
            />
            <p className="text-[10px] text-[var(--ink3)] mt-1">
              {t('admin_suspend_reason_hint')}
            </p>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-600 p-3 bg-red-50 rounded-lg mb-4">⚠️ {error}</div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 rounded-lg border border-black/10 text-sm font-semibold bg-white hover:bg-[var(--cream2)] cursor-pointer disabled:opacity-50"
          >
            {t('admin_confirm_cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className={`px-4 py-2 rounded-lg text-sm font-bold border-none cursor-pointer disabled:opacity-50 ${
              danger
                ? 'bg-[var(--coral)] text-white hover:opacity-90'
                : 'bg-[var(--ink)] text-[var(--cream)] hover:opacity-90'
            }`}
          >
            {submitting ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivityDetail({ activity, t }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
      <ActStat label={t('admin_act_recipes')}     value={activity.recipes_count} />
      <ActStat label={t('admin_act_ingredients')} value={activity.ingredients_count} />
      <ActStat label={t('admin_act_productions')} value={activity.productions_count} />
      <ActStat label={t('admin_act_plans')}       value={activity.plans_count} />
      <ActStat label={t('admin_act_inventory')}   value={activity.inventory_movements_count} />
      {activity.last_recipe_update && (
        <div className="col-span-2 md:col-span-5 text-[10px] text-[var(--ink3)] mt-1">
          {t('admin_act_last_recipe')}: {formatDate(activity.last_recipe_update)} · {t('admin_act_last_inventory')}: {formatDate(activity.last_inventory_update) || '—'}
        </div>
      )}
    </div>
  );
}

function ActStat({ label, value }) {
  return (
    <div className="bg-white rounded-lg p-2 border border-black/5">
      <div className="text-[10px] uppercase tracking-wider text-[var(--ink3)]">{label}</div>
      <div className="font-display text-lg text-[var(--ink)]">{value ?? 0}</div>
    </div>
  );
}

function formatDate(s) {
  if (!s) return null;
  try {
    const d = new Date(s);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return s;
  }
}
