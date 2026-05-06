import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRecipeStore } from '../store/recipeStore';
import { useProductionStore } from '../store/productionStore';
import { useIngredientStore } from '../store/ingredientStore';
import { usePlanStore } from '../store/planStore';
import { getLowStock } from '../store/inventoryStore';
import { useT, useI18nStore, useIngredientName, useLocale } from '../lib/i18n';
import { useFormatters } from '../lib/format';
// BackupReminder se renderiza desde App.jsx para que aparezca en todas las
// pantallas autenticadas (no solo Dashboard). El riesgo de pérdida de datos
// sin backup es transversal — un usuario que entra directo a /recipes nunca
// vería el recordatorio si solo viviera en Dashboard.
import { WelcomeTour, hasSeenTour } from '../components/WelcomeTour';
import { useBusinessStore } from '../store/businessStore';
import { useEffect, useState } from 'react';

const TYPE_KEY = { helado: 'ice_cream', gelato: 'gelato', sorbete: 'sorbet' };
const TYPE_COLOR = { helado: '#1a5c3a', gelato: '#6a1b9a', sorbete: '#0d5c6e' };
const TYPE_BG = { helado: '#c8e8d4', gelato: '#ede7f6', sorbete: '#d4eef5' };

function isoDate(d) { return d.toISOString().slice(0, 10); }
function startOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function prevMonthYM(date) {
  const d = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function thisMonthYM(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Render a green/red delta vs last month next to a stat value.
function Delta({ now, prev, format = 'pct' }) {
  if (prev == null || prev === 0) return null;
  const change = ((now - prev) / prev) * 100;
  if (Math.abs(change) < 0.5) return null;
  const up = change > 0;
  return (
    <span className="text-[10px] font-semibold tabular-nums ml-1"
          style={{ color: up ? 'var(--mint)' : 'var(--coral)' }}>
      {up ? '↑' : '↓'} {Math.abs(change).toFixed(0)}%
    </span>
  );
}

function StatCardWithDelta({ label, value, delta, sub }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] font-semibold text-[var(--ink3)] uppercase tracking-widest mb-1">{label}</div>
      <div className="text-3xl font-bold text-[var(--ink)] tabular-nums flex items-baseline">
        <span>{value}</span>
        {delta}
      </div>
      {sub && <div className="text-xs text-[var(--ink3)] mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const t          = useT();
  const tIng       = useIngredientName();
  const lang       = useI18nStore(s => s.lang);
  const locale     = useLocale();
  const { fmtCurrency } = useFormatters();
  const navigate   = useNavigate();
  // Tour de bienvenida (Marco): solo se muestra la primera vez. El usuario
  // puede cerrarlo o marcar "no volver a mostrar" — el flag vive en
  // localStorage. Espera a que el OnboardingWizard de configuración del
  // negocio (pais, nombre fantasia) este completo para no superponerse —
  // el wizard usa overlay propio y darken background, y dos modales
  // simultaneos hacian la pantalla ilegible.
  const businessCompleted = useBusinessStore(s => s.completed);
  const [showTour, setShowTour] = useState(false);
  useEffect(() => {
    if (!businessCompleted) return;     // espera a que termine la config inicial
    if (hasSeenTour()) return;           // ya lo vio antes
    const timer = setTimeout(() => setShowTour(true), 600);
    return () => clearTimeout(timer);
  }, [businessCompleted]);
  const recipes    = useRecipeStore(s => s.recipes);
  const ingredients = useIngredientStore(s => s.ingredients);
  const prodLog    = useProductionStore(s => s.log);
  const monthlyStats = useProductionStore(s => s.monthlyStats);
  const plans      = usePlanStore(s => s.plans);

  const lowStock = getLowStock(ingredients);
  const now = new Date();
  const today = isoDate(now);

  // Stats this month + last month for delta
  const mStats = monthlyStats(thisMonthYM(now));
  const pStats = monthlyStats(prevMonthYM(now));

  // Recent batches (last 5 produced, sorted by date desc)
  const recentBatches = useMemo(() => {
    return [...prodLog]
      .filter(e => e.prod_date <= today)
      .sort((a, b) =>
        b.prod_date.localeCompare(a.prod_date) ||
        (b.lote_num || 0) - (a.lote_num || 0))
      .slice(0, 5);
  }, [prodLog, today]);

  // Upcoming productions: planned dates in the next 7 days (today included)
  const upcomingPlans = useMemo(() => {
    const sevenDaysFromNow = isoDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
    return Object.entries(plans || {})
      .filter(([date, plan]) => date >= today && date <= sevenDaysFromNow && plan?.items?.length > 0)
      .map(([date, plan]) => ({
        date,
        plan_name: plan.plan_name || '',
        items: plan.items || [],
        liters: plan.items.reduce((s, i) => s + (parseFloat(i.liters) || 0), 0),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [plans, today]);

  // Liters produced per day, last 14 days (oldest → newest)
  const dailyLiters = useMemo(() => {
    const buckets = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = isoDate(d);
      const sum = prodLog
        .filter(e => e.prod_date === key)
        .reduce((s, e) => s + (parseFloat(e.liters) || 0), 0);
      buckets.push({ date: key, liters: sum, label: d.getDate() });
    }
    return buckets;
  }, [prodLog]);
  const maxDailyLiters = Math.max(...dailyLiters.map(b => b.liters), 1);

  // Top 5 flavors (by liters produced this month)
  const topFlavors = useMemo(() => {
    const ym = thisMonthYM(now);
    const acc = {};
    prodLog
      .filter(e => e.prod_date.startsWith(ym))
      .forEach(e => {
        const key = e.recipe_id;
        if (!acc[key]) acc[key] = { id: key, name: e.recipe_name, type: e.recipe_type, liters: 0, batches: 0 };
        acc[key].liters += parseFloat(e.liters) || 0;
        acc[key].batches += 1;
      });
    return Object.values(acc).sort((a, b) => b.liters - a.liters).slice(0, 5);
  }, [prodLog]);
  const topMaxLiters = Math.max(...topFlavors.map(f => f.liters), 1);

  // Recipes by type (existing chart)
  const byType = recipes.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl text-[var(--ink)]">{t('dashboard')}</h1>
          <p className="text-sm text-[var(--ink2)] mt-1">{t('dashboard_subtitle')}</p>
        </div>
        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate('/recipes/new')}
            className="btn-primary text-xs">
            + {t('new_recipe')}
          </button>
          <button
            onClick={() => navigate('/plan')}
            className="text-xs px-3 py-2 rounded-lg border border-black/10 hover:border-[var(--mint2)] text-[var(--ink2)] font-semibold cursor-pointer bg-white transition-colors">
            📋 {t('dash_plan_today')}
          </button>
          <button
            onClick={() => navigate('/production')}
            className="text-xs px-3 py-2 rounded-lg border border-black/10 hover:border-[var(--mint2)] text-[var(--ink2)] font-semibold cursor-pointer bg-white transition-colors">
            🏭 {t('dash_view_production')}
          </button>
        </div>
      </div>

      {/* Stats row with deltas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCardWithDelta
          label={t('total_recipes')}
          value={recipes.length}
        />
        <StatCardWithDelta
          label={t('batches_this_month')}
          value={mStats.count}
          delta={<Delta now={mStats.count} prev={pStats.count} />}
          sub={t('this_month')}
        />
        <StatCardWithDelta
          label={t('liters_this_month')}
          value={mStats.liters.toFixed(1)}
          delta={<Delta now={mStats.liters} prev={pStats.liters} />}
          sub={t('this_month')}
        />
        <StatCardWithDelta
          label={t('cost_this_month')}
          value={fmtCurrency(Math.round(mStats.cost))}
          delta={<Delta now={mStats.cost} prev={pStats.cost} />}
          sub={t('this_month')}
        />
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div className="card p-5 mb-6 border-l-4 border-[var(--coral)]">
          <div className="flex items-baseline justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">⚠</span>
              <h3 className="font-display text-base text-[var(--coral)]">
                {t('low_stock_alert_title')} ({lowStock.length})
              </h3>
            </div>
            <Link to="/ingredients" className="text-xs text-[var(--mint)] hover:text-[var(--mint2)] underline">
              {t('low_stock_go_manage')}
            </Link>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {lowStock.slice(0, 8).map(i => {
              const stock = parseFloat(i.stock_g) || 0;
              const min   = parseFloat(i.min_stock_g) || 0;
              return (
                <li key={i.id} className="flex justify-between items-center text-sm">
                  <span className="text-[var(--ink)] truncate">{tIng(i.name)}</span>
                  <span className="text-xs whitespace-nowrap">
                    <span className="text-[var(--coral)] font-semibold">{stock.toLocaleString(locale)} g</span>
                    <span className="text-[var(--ink3)]"> / mín {min.toLocaleString(locale)} g</span>
                  </span>
                </li>
              );
            })}
          </ul>
          {lowStock.length > 8 && (
            <p className="text-xs text-[var(--ink3)] italic mt-2">
              {t('low_stock_and_more', { count: lowStock.length - 8 })}
            </p>
          )}
        </div>
      )}

      {/* Production trend (14 days) — full width */}
      <div className="card p-5 mb-6">
        <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-display text-base text-[var(--ink)]">{t('dash_production_trend')}</h3>
          <span className="text-[10px] text-[var(--ink3)] uppercase tracking-widest">{t('dash_last_14_days')}</span>
        </div>
        {dailyLiters.every(b => b.liters === 0) ? (
          <p className="text-xs text-[var(--ink3)] text-center py-6">{t('dash_no_production_yet')}</p>
        ) : (
          <div className="flex items-end gap-1.5 h-24 border-b border-black/10">
            {dailyLiters.map((b, i) => {
              const heightPct = (b.liters / maxDailyLiters) * 100;
              const isToday = b.date === today;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end min-w-0" title={`${b.date}: ${b.liters.toFixed(1)} L`}>
                  <div className="text-[9px] text-[var(--ink3)] tabular-nums leading-none mb-0.5"
                       style={{ visibility: b.liters > 0 ? 'visible' : 'hidden' }}>
                    {b.liters.toFixed(1)}
                  </div>
                  <div className="w-full rounded-t transition-all duration-500"
                       style={{
                         height: `${Math.max(heightPct, b.liters > 0 ? 4 : 0)}%`,
                         minHeight: b.liters > 0 ? 4 : 0,
                         background: isToday ? 'var(--gold)' : 'var(--mint)',
                       }} />
                </div>
              );
            })}
          </div>
        )}
        <div className="flex gap-1.5 mt-1">
          {dailyLiters.map((b, i) => (
            <div key={i} className="flex-1 text-[9px] text-[var(--ink3)] text-center tabular-nums">
              {b.label}
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Upcoming productions */}
        <div className="card p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="font-display text-base text-[var(--ink)]">{t('dash_upcoming')}</h3>
            <Link to="/plan" className="text-[10px] text-[var(--mint)] hover:text-[var(--mint2)] underline">
              {t('dash_open_plan')}
            </Link>
          </div>
          {upcomingPlans.length === 0 ? (
            <p className="text-sm text-[var(--ink3)] text-center py-6">{t('dash_no_upcoming')}</p>
          ) : (
            <ul className="space-y-2">
              {upcomingPlans.map(p => (
                <li key={p.date} className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--cream)] transition-colors">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--ink)]">
                      {new Date(p.date + 'T12:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}
                      {p.date === today && (
                        <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#e8b920] text-[var(--ink)]">
                          {t('dash_today')}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--ink3)] truncate">
                      {p.items.length} {t('dash_recipes_count')} · {p.liters.toFixed(1)} L
                      {p.plan_name && ` · ${p.plan_name}`}
                    </div>
                  </div>
                  <Link to="/plan" className="text-xs text-[var(--mint)] underline whitespace-nowrap ml-3">
                    {t('view')}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent batches */}
        <div className="card p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="font-display text-base text-[var(--ink)]">{t('dash_recent_batches')}</h3>
            <Link to="/production" className="text-[10px] text-[var(--mint)] hover:text-[var(--mint2)] underline">
              {t('dash_open_production')}
            </Link>
          </div>
          {recentBatches.length === 0 ? (
            <p className="text-sm text-[var(--ink3)] text-center py-6">{t('dash_no_batches')}</p>
          ) : (
            <ul className="space-y-2">
              {recentBatches.map(b => (
                <li key={b.id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-[var(--cream)] transition-colors">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white whitespace-nowrap"
                          style={{ background: TYPE_COLOR[b.recipe_type] || '#888' }}>
                      {b.lote_str}
                    </span>
                    <span className="text-sm text-[var(--ink)] truncate">{b.recipe_name}</span>
                  </div>
                  <div className="text-xs text-[var(--ink3)] whitespace-nowrap">
                    {parseFloat(b.liters || 0).toFixed(1)} L · {b.prod_date.slice(5)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Top flavors this month */}
        <div className="card p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="font-display text-base text-[var(--ink)]">{t('dash_top_flavors')}</h3>
            <span className="text-[10px] text-[var(--ink3)] uppercase tracking-widest">{t('this_month')}</span>
          </div>
          {topFlavors.length === 0 ? (
            <p className="text-sm text-[var(--ink3)] text-center py-6">{t('dash_no_top_flavors')}</p>
          ) : (
            <ul className="space-y-3">
              {topFlavors.map((f, idx) => {
                const widthPct = (f.liters / topMaxLiters) * 100;
                return (
                  <li key={f.id}>
                    <div className="flex items-baseline justify-between text-sm mb-1">
                      <span className="text-[var(--ink2)] truncate">
                        <span className="text-[var(--ink3)] mr-1.5 font-mono">{idx + 1}.</span>
                        {f.name}
                      </span>
                      <span className="font-semibold text-[var(--ink)] whitespace-nowrap ml-2">
                        {f.liters.toFixed(1)} L · {f.batches} {t('dash_batches_short')}
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--cream2)] rounded overflow-hidden">
                      <div className="h-full transition-all duration-700"
                           style={{ width: `${widthPct}%`, background: TYPE_COLOR[f.type] || '#888' }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Recipes by type */}
        <div className="card p-5">
          <div className="text-sm font-semibold text-[var(--ink)] mb-4">{t('recipes_by_type')}</div>
          <div className="space-y-4">
            {[
              { type: 'helado',  lbl: t('ice_cream'), color: TYPE_COLOR.helado },
              { type: 'gelato',  lbl: t('gelato'),    color: TYPE_COLOR.gelato },
              { type: 'sorbete', lbl: t('sorbet'),    color: TYPE_COLOR.sorbete },
            ].map(({ type, lbl, color }) => {
              const count = byType[type] || 0;
              const total = recipes.length || 1;
              return (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--ink2)]">{lbl}</span>
                    <span className="font-semibold text-[var(--ink)]">{count}</span>
                  </div>
                  <div className="h-2 bg-[var(--cream2)] rounded overflow-hidden">
                    <div className="h-full rounded transition-all duration-700"
                         style={{ width: `${(count / total) * 100}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-black/10 flex items-baseline justify-between">
            <div>
              <div className="text-2xl font-display text-[var(--ink)]">{recipes.length}</div>
              <div className="text-xs text-[var(--ink3)]">{t('recipes_total')}</div>
            </div>
            <Link to="/recipes" className="text-xs text-[var(--mint)] hover:text-[var(--mint2)] underline">
              {t('dash_view_all')}
            </Link>
          </div>
        </div>
      </div>

      {showTour && <WelcomeTour onClose={() => setShowTour(false)} />}
    </div>
  );
}
