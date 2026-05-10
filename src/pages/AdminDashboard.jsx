import { useEffect, useState } from 'react';
import { adminGetStats } from '../lib/admin';
import { Spinner } from '../components/ui/index.jsx';
import { useT } from '../lib/i18n';

export default function AdminDashboard() {
  const t = useT();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    adminGetStats()
      .then(s => { if (!cancelled) { setStats(s); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error) return <div className="text-sm text-red-600 p-4 bg-red-50 rounded">⚠️ {error}</div>;
  if (!stats) return null;

  const byPlan = stats.by_plan || {};
  const byRole = stats.by_role || {};

  return (
    <div className="space-y-8">
      {/* Tiles principales */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--ink3)] mb-3">{t('admin_stats_overview')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label={t('admin_stat_total_users')}  value={stats.total_users} />
          <StatCard label={t('admin_stat_active_7d')}    value={stats.active_7d}  hint={t('admin_stat_active_7d_hint')} />
          <StatCard label={t('admin_stat_active_30d')}   value={stats.active_30d} />
          <StatCard label={t('admin_stat_suspended')}    value={stats.suspended}  warn={stats.suspended > 0} />
        </div>
      </section>

      {/* Por plan */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--ink3)] mb-3">{t('admin_stats_by_plan')}</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label={t('admin_plan_free')}  value={byPlan.free  || 0} muted />
          <StatCard label={t('admin_plan_pro')}   value={byPlan.pro   || 0} highlight />
          <StatCard label={t('admin_plan_admin')} value={byPlan.admin || 0} />
        </div>
      </section>

      {/* Por role */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--ink3)] mb-3">{t('admin_stats_by_role')}</h2>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <StatCard label={t('admin_role_user')}  value={byRole.user  || 0} muted />
          <StatCard label={t('admin_role_admin')} value={byRole.admin || 0} />
        </div>
      </section>

      {/* Signups ultimos 30 dias — sparkline simple */}
      {stats.signups_last_30d && Object.keys(stats.signups_last_30d).length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--ink3)] mb-3">{t('admin_stats_signups_30d')}</h2>
          <SignupsBar data={stats.signups_last_30d} t={t} />
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, hint, highlight, warn, muted }) {
  const base = 'rounded-xl border-2 p-4';
  const variant = warn
    ? 'border-[var(--coral)] bg-[var(--coral2)]/40'
    : highlight
      ? 'border-[var(--gold)] bg-[#fdf3d4]/60'
      : muted
        ? 'border-black/10 bg-[var(--cream2)]/40'
        : 'border-black/10 bg-white';
  return (
    <div className={`${base} ${variant}`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-[var(--ink3)] mb-1">{label}</div>
      <div className="font-display text-3xl text-[var(--ink)]">{value}</div>
      {hint && <div className="text-[10px] text-[var(--ink3)] mt-1">{hint}</div>}
    </div>
  );
}

// Bar chart minimo (sin libreria) para signups por dia. Cada barra = 1 dia.
function SignupsBar({ data, t }) {
  const days = Object.keys(data).sort();
  const counts = days.map(d => data[d]);
  const max = Math.max(...counts, 1);
  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <div className="border border-black/10 rounded-xl p-4 bg-white">
      <div className="flex items-end gap-1 h-24 mb-2">
        {days.map((d, i) => {
          const c = counts[i];
          const h = Math.max(2, Math.round((c / max) * 90));
          return (
            <div
              key={d}
              className="flex-1 bg-[var(--mint)] rounded-t hover:opacity-80 transition-opacity"
              style={{ height: `${h}%` }}
              title={`${d}: ${c}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-[var(--ink3)]">
        <span>{days[0]}</span>
        <span>{t('admin_stat_total_signups', { count: total })}</span>
        <span>{days[days.length - 1]}</span>
      </div>
    </div>
  );
}
