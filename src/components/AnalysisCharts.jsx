import { useState } from 'react';
import { useT, useIngredientName } from '../lib/i18n';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine,
  ScatterChart, Scatter, LabelList,
} from 'recharts';
import { calcStats, calcFreezingCurve, tempForFrozenPct, FREEZING_TARGETS } from '../lib/icecreamCalc';
import { useRecipeStore } from '../store/recipeStore';
import { useIngredientStore } from '../store/ingredientStore';

const COLORS_PIE = [
  '#3b8fd4', '#f5c842', '#e07b39', '#1a5c3a', '#bdbdbd',
  '#6a1b9a', '#c0392b', '#0d5c6e', '#8d6e63', '#00bcd4',
  '#ff7043', '#66bb6a', '#ab47bc', '#ffa726',
];

const CURVE_COLORS = [
  '#3b8fd4', '#e07b39', '#1a5c3a', '#c0392b', '#6a1b9a', '#f5c842',
];

// ── Balance de acidos grasos ────────────────────────────────
function FattyAcidsBalance({ stats }) {
  const t = useT();
  if (!stats || stats.grasa === 0) return null;

  const saturated = stats.T > 0 ? (stats.satfat / stats.grasa) * 100 : 0;
  const unsaturated = 100 - saturated;

  const data = [
    { name: t('saturated'), value: parseFloat(saturated.toFixed(1)) },
    { name: t('unsaturated'), value: parseFloat(unsaturated.toFixed(1)) },
  ];
  const colors = ['#757174', '#ff7c52'];

  return (
    <div className="card p-5">
      <div className="font-display text-base text-[var(--ink)] mb-4">
        {t('fatty_acids_balance')}
      </div>
      <div className="grid grid-cols-[1fr_180px] gap-4 items-center">
        <table className="tbl text-xs">
          <thead>
            <tr><th className="text-left">{t('type')}</th><th>{t('percentage')}</th></tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={d.name}>
                <td>
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ background: colors[i] }} aria-hidden="true" />
                    <span>{d.name}</span>
                  </span>
                </td>
                <td>{d.value}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie data={data} dataKey="value" cx="50%" cy="80%" startAngle={180} endAngle={0}
                 innerRadius={30} outerRadius={60}>
              {data.map((_, i) => <Cell key={i} fill={colors[i]} />)}
            </Pie>
            <Tooltip formatter={(v) => `${v}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Balance de solidos ──────────────────────────────────────
function SolidsBalance({ stats }) {
  const t = useT();
  if (!stats || stats.T === 0) return null;

  const solidsPct = ((stats.T - stats.agua) / stats.T) * 100;
  const waterPct = (stats.agua / stats.T) * 100;

  const data = [
    { name: t('solids'), value: parseFloat(solidsPct.toFixed(1)) },
    { name: t('water'), value: parseFloat(waterPct.toFixed(1)) },
  ];
  const colors = ['#336600', '#36a2eb'];

  return (
    <div className="card p-5">
      <div className="font-display text-base text-[var(--ink)] mb-4">
        {t('solids_balance')}
      </div>
      <div className="grid grid-cols-[1fr_180px] gap-4 items-center">
        <table className="tbl text-xs">
          <thead>
            <tr><th className="text-left">{t('type')}</th><th>{t('percentage')}</th></tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={d.name}>
                <td>
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ background: colors[i] }} aria-hidden="true" />
                    <span>{d.name}</span>
                  </span>
                </td>
                <td>{d.value}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie data={data} dataKey="value" cx="50%" cy="80%" startAngle={180} endAngle={0}
                 innerRadius={30} outerRadius={60}>
              {data.map((_, i) => <Cell key={i} fill={colors[i]} />)}
            </Pie>
            <Tooltip formatter={(v) => `${v}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Incidencia de precios por ingrediente ────────────────────
function PriceIncidence({ items }) {
  const t = useT();
  const tIng = useIngredientName();
  if (!items || items.length === 0) return null;

  const totalCost = items.reduce((s, r) => {
    const g = parseFloat(r.qty_grams) || 0;
    const c = parseFloat(r.ingredient?.cost_per_kg) || 0;
    return s + (g * c / 1000);
  }, 0);

  if (totalCost === 0) return null;

  const data = items
    .filter(r => r.ingredient && parseFloat(r.qty_grams) > 0)
    .map(r => {
      const g = parseFloat(r.qty_grams);
      const cost = g * (r.ingredient.cost_per_kg || 0) / 1000;
      return {
        name: tIng(r.ingredient.name),
        value: parseFloat(((cost / totalCost) * 100).toFixed(1)),
      };
    })
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="card p-5">
      <div className="font-display text-base text-[var(--ink)] mb-4">
        {t('price_incidence')}
      </div>
      <div className="grid grid-cols-[1fr_200px] gap-4 items-start">
        <table className="tbl text-xs">
          <thead>
            <tr><th className="text-left">{t('ingredient')}</th><th>{t('incidence')}</th></tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={d.name}>
                <td>
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ background: COLORS_PIE[i % COLORS_PIE.length] }} aria-hidden="true" />
                    <span>{d.name}</span>
                  </span>
                </td>
                <td>{d.value}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} dataKey="value" cx="50%" cy="50%"
                 outerRadius={80} startAngle={180} endAngle={-180}>
              {data.map((_, i) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => `${v}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Comparacion de curvas de congelamiento ───────────────────
function FreezingCurveComparison({ currentStats, currentName }) {
  const t = useT();
  const recipes = useRecipeStore(s => s.recipes);
  const allIngredients = useIngredientStore(s => s.ingredients);
  const ingMap = Object.fromEntries(allIngredients.map(i => [String(i.id), i]));

  const [selectedIds, setSelectedIds] = useState([]);

  function toggleRecipe(id) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id].slice(-5)
    );
  }

  // Build curves. Cada curva trae ademas las temperaturas de extraccion /
  // servicio gelato / servicio helado (cruce con %FW objetivo de Corvitto).
  function buildCurve(stats, name, color) {
    const points = calcFreezingCurve(stats);
    const targets = Object.fromEntries(
      Object.entries(FREEZING_TARGETS).map(([k, cfg]) => [k, tempForFrozenPct(stats, cfg.pct)])
    );
    return { name, points, color, targets, fpd: stats.fpd };
  }
  const curves = [];

  // Current recipe curve
  if (currentStats && currentStats.fpd !== 0) {
    curves.push(buildCurve(currentStats, currentName || 'Actual', CURVE_COLORS[0]));
  }

  // Selected recipes
  selectedIds.forEach((rid, idx) => {
    const recipe = recipes.find(r => r.id === rid);
    if (!recipe) return;
    const enriched = (recipe.ingredients || [])
      .filter(ri => ri.ingredient_id && ri.qty_grams > 0)
      .map(ri => ({ qty_grams: ri.qty_grams, ingredient: ingMap[String(ri.ingredient_id)] }))
      .filter(ri => ri.ingredient);
    if (enriched.length === 0) return;
    const s = calcStats(enriched);
    if (s.fpd === 0) return;
    curves.push(buildCurve(s, recipe.name, CURVE_COLORS[(idx + 1) % CURVE_COLORS.length]));
  });

  // Merge all points into scatter data
  const scatterData = [];
  curves.forEach(c => {
    c.points.forEach(p => {
      scatterData.push({ x: p.frozenPct, y: p.temp, name: c.name });
    });
  });

  return (
    <div className="card p-5">
      <div className="font-display text-base text-[var(--ink)] mb-4">
        {t('freezing_curve_comparison')}
      </div>

      {/* Recipe selector */}
      <div className="mb-4">
        <div className="text-xs text-[var(--ink3)] mb-2">{t('select_recipes_to_compare')}</div>
        <div className="flex flex-wrap gap-1.5">
          {recipes.map(r => {
            const sel = selectedIds.includes(r.id);
            return (
              <button key={r.id}
                className={`text-[10px] px-2 py-1 rounded-full border transition-all cursor-pointer
                  ${sel
                    ? 'bg-[var(--mint)] text-white border-[var(--mint)]'
                    : 'bg-white text-[var(--ink2)] border-black/10 hover:border-[var(--mint2)]'}`}
                onClick={() => toggleRecipe(r.id)}>
                {r.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      {curves.length > 0 ? (
        <>
          {/* Custom legend rendered above the chart so it never collides with the axis title. */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-[11px]">
            {curves.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded" style={{ background: c.color }} aria-hidden="true" />
                <span className="text-[var(--ink2)]">{c.name}</span>
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 36, left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--cream3)" />
              <XAxis type="number" dataKey="x" name={t('pct_frozen_water')}
                     domain={[0, 'dataMax + 5']}
                     label={{ value: t('pct_frozen_water'), position: 'insideBottom', offset: -10, fontSize: 11, fill: 'var(--ink3)' }}
                     tick={{ fontSize: 10 }}
                     tickFormatter={v => `${v}%`} />
              <YAxis type="number" dataKey="y" name={t('temperature')}
                     label={{ value: `${t('temperature')} (°C)`, angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: 'var(--ink3)' }}
                     tick={{ fontSize: 10 }}
                     tickFormatter={v => `${v}°`} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(v, name) => name === 'x' ? [`${Number(v).toFixed(1)}%`, t('pct_frozen_water')] : [`${Number(v).toFixed(1)} °C`, t('temperature')]}
                contentStyle={{ fontSize: 11, borderRadius: 6 }}
              />
              {curves.map((c, i) => (
                <Scatter key={i} name={c.name}
                         data={c.points.map(p => ({ x: p.frozenPct, y: p.temp, label: `${p.temp.toFixed(1)}°` }))}
                         fill={c.color} line={{ stroke: c.color, strokeWidth: 2 }}>
                  <LabelList
                    dataKey="label"
                    position={i % 2 === 0 ? 'top' : 'bottom'}
                    offset={10}
                    style={{ fontSize: 9, fill: c.color, fontWeight: 600 }}
                  />
                </Scatter>
              ))}
            </ScatterChart>
          </ResponsiveContainer>

          {/* Tabla resumen: temperaturas de extraccion / servicio por receta */}
          <div className="mt-4 overflow-x-auto">
            <table className="tbl text-xs w-full">
              <thead>
                <tr>
                  <th className="text-left">{t('fc_recipe_col')}</th>
                  <th>FPD</th>
                  <th style={{ color: FREEZING_TARGETS.extraction.color }}>{t('fc_target_extraction')}<br/><span className="font-normal text-[10px] opacity-70">({FREEZING_TARGETS.extraction.pct}% FW)</span></th>
                  <th style={{ color: FREEZING_TARGETS.gelato.color }}>{t('fc_target_gelato')}<br/><span className="font-normal text-[10px] opacity-70">({FREEZING_TARGETS.gelato.pct}% FW)</span></th>
                  <th style={{ color: FREEZING_TARGETS.iceCream.color }}>{t('fc_target_iceCream')}<br/><span className="font-normal text-[10px] opacity-70">({FREEZING_TARGETS.iceCream.pct}% FW)</span></th>
                </tr>
              </thead>
              <tbody>
                {curves.map((c, i) => (
                  <tr key={i}>
                    <td>
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-sm" style={{ background: c.color }} aria-hidden="true" />
                        <span className="font-semibold">{c.name}</span>
                      </span>
                    </td>
                    <td className="tabular-nums">{c.fpd?.toFixed(2)} °C</td>
                    <td className="tabular-nums">{c.targets.extraction != null ? `${c.targets.extraction} °C` : '—'}</td>
                    <td className="tabular-nums">{c.targets.gelato != null ? `${c.targets.gelato} °C` : '—'}</td>
                    <td className="tabular-nums">{c.targets.iceCream != null ? `${c.targets.iceCream} °C` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-[var(--ink3)] mt-2 leading-relaxed">
              ℹ {t('fc_targets_legend')}
            </p>
          </div>
        </>
      ) : (
        <p className="text-sm text-[var(--ink3)] text-center py-4">
          {t('add_ingredients_to_see')}
        </p>
      )}
    </div>
  );
}

// ── Export principal ─────────────────────────────────────────
export default function AnalysisCharts({ stats, items, recipeName, type, overrunPct }) {
  const t = useT();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FattyAcidsBalance stats={stats} />
        <SolidsBalance stats={stats} />
      </div>
      <PriceIncidence items={items} />
      <FreezingCurveComparison
        currentStats={stats}
        currentName={recipeName || t('current_recipe')}
      />
    </div>
  );
}
