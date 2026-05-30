import { useEffect, useState } from 'react';
import { adminGetStats, adminGetChurn30d, adminGetUpgrades30d } from '../lib/admin';
import { Spinner } from '../components/ui/index.jsx';
import { useT } from '../lib/i18n';

export default function AdminDashboard() {
  const t = useT();
  const [stats, setStats] = useState(null);
  const [churn, setChurn] = useState({});
  const [upgrades, setUpgrades] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      adminGetStats(),
      adminGetChurn30d().catch(() => ({})),
      adminGetUpgrades30d().catch(() => ({})),
    ]).then(([s, c, u]) => {
      if (cancelled) return;
      setStats(s);
      setChurn(c || {});
      setUpgrades(u || {});
      setLoading(false);
    }).catch(e => {
      if (!cancelled) { setError(e.message); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error) return <div className="text-sm text-red-600 p-4 bg-red-50 rounded">⚠️ {error}</div>;
  if (!stats) return null;

  const byPlan = stats.by_plan || {};
  const byRole = stats.by_role || {};
  const proUsers = (byPlan.pro || 0) + (byPlan.admin || 0);
  const conversionRate = stats.total_users > 0
    ? Math.round((proUsers / stats.total_users) * 100)
    : 0;
  const totalChurn = Object.values(churn).reduce((a, b) => a + b, 0);
  const totalUpgrades = Object.values(upgrades).reduce((a, b) => a + b, 0);
  const netGrowth = totalUpgrades - totalChurn;

  return (
    <div className="space-y-8">
      {/* Tiles principales */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--ink3)] mb-3">
          {t('admin_stats_overview')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label={t('admin_stat_total_users')}  value={stats.total_users} />
          <StatCard label={t('admin_stat_active_7d')}    value={stats.active_7d}  hint={t('admin_stat_active_7d_hint')} />
          <StatCard label={t('admin_stat_active_30d')}   value={stats.active_30d} />
          <StatCard label={t('admin_stat_suspended')}    value={stats.suspended}  warn={stats.suspended > 0} />
        </div>
      </section>

      {/* Por plan + conversión */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--ink3)] mb-3">
          {t('admin_stats_by_plan')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label={t('admin_plan_free')}  value={byPlan.free  || 0} muted />
          <StatCard label={t('admin_plan_pro')}   value={byPlan.pro   || 0} highlight />
          <StatCard label={t('admin_plan_admin')} value={byPlan.admin || 0} />
          <StatCard
            label="Conversión Pro"
            value={`${conversionRate}%`}
            hint={`${proUsers} de ${stats.total_users} usuarios`}
            highlight={conversionRate > 0}
          />
        </div>
      </section>

      {/* KPIs 30 días */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--ink3)] mb-3">
          Últimos 30 días
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="Upgrades (free→pro)"
            value={totalUpgrades}
            highlight={totalUpgrades > 0}
          />
          <StatCard
            label="Churn (pro→free)"
            value={totalChurn}
            warn={totalChurn > 0}
          />
          <StatCard
            label="Crecimiento neto"
            value={netGrowth >= 0 ? `+${netGrowth}` : String(netGrowth)}
            highlight={netGrowth > 0}
            warn={netGrowth < 0}
          />
        </div>
      </section>

      {/* Chart: Signups por día */}
      {stats.signups_last_30d && Object.keys(stats.signups_last_30d).length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--ink3)] mb-3">
            {t('admin_stats_signups_30d')}
          </h2>
          <DayChart
            data={stats.signups_last_30d}
            color="var(--mint)"
            label="nuevos usuarios"
          />
        </section>
      )}

      {/* Chart: Upgrades por día */}
      {Object.keys(upgrades).length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--ink3)] mb-3">
            Upgrades a Pro — últimos 30 días
          </h2>
          <DayChart
            data={upgrades}
            color="#e8b920"
            label="upgrades"
          />
        </section>
      )}

      {/* Chart: Churn por día */}
      {Object.keys(churn).length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--ink3)] mb-3">
            Churn (Pro→Free) — últimos 30 días
          </h2>
          <DayChart
            data={churn}
            color="var(--coral)"
            label="downgrades"
          />
        </section>
      )}

      {/* Por role */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--ink3)] mb-3">
          {t('admin_stats_by_role')}
        </h2>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <StatCard label={t('admin_role_user')}  value={byRole.user  || 0} muted />
          <StatCard label={t('admin_role_admin')} value={byRole.admin || 0} />
        </div>
      </section>
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

function DayChart({ data, color, label }) {
  const [tooltip, setTooltip] = useState(null);
  const days = Object.keys(data).sort();
  const counts = days.map(d => data[d]);
  const max = Math.max(...counts, 1);
  const total = counts.reduce((a, b) => a + b, 0);

  // Mostrar solo primero y ultimo label del eje X
  const showLabel = (i) => i === 0 || i === days.length - 1 || i === Math.floor(days.length / 2);

  return (
    <div className="border border-black/10 rounded-xl p-4 bg-white relative">
      <div className="flex items-end gap-1 h-28 mb-1">
        {days.map((d, i) => {
          const c = counts[i];
          const h = Math.max(2, Math.round((c / max) * 100));
          return (
            <div
              key={d}
              className="flex-1 flex flex-col justify-end items-center relative group"
              style={{ height: '100%' }}
              onMouseEnter={() => setTooltip({ day: d, count: c })}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Tooltip */}
              {tooltip?.day === d && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--ink)] text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                  {d}: {c} {label}
                </div>
              )}
              <div
                className="w-full rounded-t transition-opacity hover:opacity-70"
                style={{ height: `${h}%`, background: color }}
              />
            </div>
          );
        })}
      </div>
      {/* Eje X */}
      <div className="flex justify-between text-[9px] text-[var(--ink3)] mt-1">
        <span>{days[0]?.slice(5)}</span>
        <span className="font-semibold">{total} {label}</span>
        <span>{days[days.length - 1]?.slice(5)}</span>
      </div>
    </div>
  );
}
