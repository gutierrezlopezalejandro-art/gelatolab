import { useEffect, useState } from 'react';
import { adminGetAuditLog } from '../lib/admin';
import { Spinner } from '../components/ui/index.jsx';
import { useT } from '../lib/i18n';

const PAGE_SIZE = 50;

export default function AdminAuditLog() {
  const t = useT();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  async function load(pageOffset) {
    setLoading(true);
    setError(null);
    try {
      const data = await adminGetAuditLog({ limit: PAGE_SIZE, offset: pageOffset });
      setEntries(data || []);
      setHasMore((data || []).length === PAGE_SIZE);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(offset); }, [offset]);

  return (
    <div className="space-y-4">
      <div className="text-xs text-[var(--ink3)]">
        {t('admin_audit_caption')}
      </div>

      {loading && entries.length === 0 ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : error ? (
        <div className="text-sm text-red-600 p-4 bg-red-50 rounded">⚠️ {error}</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-[var(--ink3)] text-xs">
          {t('admin_audit_empty')}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-black/10 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[var(--cream2)]/40 border-b border-black/10">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">{t('admin_audit_col_when')}</th>
                <th className="text-left px-3 py-2 font-semibold">{t('admin_audit_col_admin')}</th>
                <th className="text-left px-3 py-2 font-semibold">{t('admin_audit_col_action')}</th>
                <th className="text-left px-3 py-2 font-semibold">{t('admin_audit_col_target')}</th>
                <th className="text-left px-3 py-2 font-semibold">{t('admin_audit_col_details')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} className="border-b border-black/5 hover:bg-[var(--cream2)]/20">
                  <td className="px-3 py-2 text-xs font-mono text-[var(--ink3)]">{formatDateTime(e.created_at)}</td>
                  <td className="px-3 py-2 text-xs font-mono">{e.admin_email || '—'}</td>
                  <td className="px-3 py-2"><ActionBadge action={e.action} t={t} /></td>
                  <td className="px-3 py-2 text-xs font-mono">{e.target_email || '—'}</td>
                  <td className="px-3 py-2 text-xs">
                    <DetailsCell details={e.details} action={e.action} t={t} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginacion simple */}
      {(offset > 0 || hasMore) && (
        <div className="flex justify-between items-center pt-2">
          <button
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0 || loading}
            className="text-xs px-3 py-2 rounded-lg border border-black/10 bg-white hover:bg-[var(--cream2)] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← {t('admin_audit_prev')}
          </button>
          <span className="text-xs text-[var(--ink3)]">
            {t('admin_audit_page', { from: offset + 1, to: offset + entries.length })}
          </span>
          <button
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={!hasMore || loading}
            className="text-xs px-3 py-2 rounded-lg border border-black/10 bg-white hover:bg-[var(--cream2)] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {t('admin_audit_next')} →
          </button>
        </div>
      )}
    </div>
  );
}

function ActionBadge({ action, t }) {
  const map = {
    plan_change: { fg: 'var(--mint)',  bg: 'var(--mint3)',  label: t('admin_audit_action_plan') },
    role_change: { fg: '#a87a00',      bg: '#fdf3d4',       label: t('admin_audit_action_role') },
    suspend:     { fg: 'var(--coral)', bg: 'var(--coral2)', label: t('admin_audit_action_suspend') },
    unsuspend:   { fg: 'var(--mint)',  bg: 'var(--mint3)',  label: t('admin_audit_action_unsuspend') },
    manual:      { fg: 'var(--ink3)',  bg: '#f0f0f0',       label: action },
  };
  const v = map[action] || map.manual;
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
      style={{ background: v.bg, color: v.fg }}
    >
      {v.label}
    </span>
  );
}

function DetailsCell({ details, action, t }) {
  if (!details || Object.keys(details).length === 0) return <span className="text-[var(--ink3)]">—</span>;
  if (action === 'plan_change' || action === 'role_change') {
    return <span className="font-mono">{details.from || '—'} → <strong>{details.to}</strong>{details.expires_at ? ` (exp ${formatDateTime(details.expires_at)})` : ''}</span>;
  }
  if (action === 'suspend') {
    return <span>{details.reason || t('admin_audit_no_reason')}</span>;
  }
  return <code className="text-[10px]">{JSON.stringify(details)}</code>;
}

function formatDateTime(s) {
  if (!s) return '';
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}
