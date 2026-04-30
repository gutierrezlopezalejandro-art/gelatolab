import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot, ResponsiveContainer, Legend } from 'recharts';
import { useT } from '../lib/i18n';
import { calcFreezingCurve, tempForFrozenPct, FREEZING_TARGETS } from '../lib/icecreamCalc';

const SERIES = [
  { key: 'frozenPct',    color: '#3b8fd4', tKey: 'fc_frozen_water' },
  { key: 'icePct',       color: '#1a5c3a', tKey: 'fc_ice_pct' },
  { key: 'freeWaterPct', color: '#7cb342', tKey: 'fc_free_water', dashed: true },
];

export default function FreezingCurve({ stats, servingTemp }) {
  const t = useT();
  const [show, setShow] = useState({ frozenPct: true, icePct: true, freeWaterPct: true });

  if (!stats) return null;
  const points = calcFreezingCurve(stats, 28);
  if (!points || points.length === 0) return null;

  // Calcular marcadores de extraccion / servicio cruzando la curva con cada
  // %FW objetivo. Devuelve { x: tempC, y: frozenPct } para ReferenceDot.
  const markers = Object.entries(FREEZING_TARGETS).map(([key, cfg]) => {
    const temp = tempForFrozenPct(stats, cfg.pct);
    if (temp == null) return null;
    return { key, label: t('fc_target_' + key), temp, pct: cfg.pct, color: cfg.color };
  }).filter(Boolean);

  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-display text-base text-[var(--ink)]">
          ❄ {t('freezing_curve_data')}
        </h3>
        <span className="text-[10px] text-[var(--ink3)]">
          FPD = {stats.fpd?.toFixed(2)} °C
        </span>
      </div>

      {/* Toggles de series */}
      <div className="flex flex-wrap gap-3 mb-2 text-[11px]">
        {SERIES.map(s => (
          <label key={s.key} className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={show[s.key]}
              onChange={e => setShow(prev => ({ ...prev, [s.key]: e.target.checked }))}
              className="cursor-pointer"
            />
            <span className="inline-block w-3 h-0.5" style={{ background: s.color, borderTop: s.dashed ? `2px dashed ${s.color}` : 'none' }} />
            <span className="text-[var(--ink2)]">{t(s.tKey)}</span>
          </label>
        ))}
      </div>

      {/* Chart: X = temperatura, Y = % */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={points} margin={{ top: 12, right: 24, left: 0, bottom: 22 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="temp" type="number"
            domain={['dataMin', 'dataMax']} reversed
            label={{ value: `${t('temperature')} (°C)`, position: 'insideBottom', offset: -10, style: { fontSize: 11, fill: '#666' } }}
            tick={{ fontSize: 10 }}
            tickFormatter={v => `${Number(v).toFixed(0)}`}
          />
          <YAxis
            type="number" domain={[0, 100]}
            label={{ value: '%', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11, fill: '#666' } }}
            tick={{ fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
            labelFormatter={(temp) => `${Number(temp).toFixed(1)} °C`}
            formatter={(v, name) => [`${Number(v).toFixed(1)}%`, t(name)]}
          />
          {SERIES.filter(s => show[s.key]).map(s => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.tKey}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? '5 4' : undefined}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
          {/* Marcadores de extraccion / servicio sobre la curva de frozenPct */}
          {show.frozenPct && markers.map(m => (
            <ReferenceDot
              key={m.key}
              x={m.temp}
              y={m.pct}
              r={5}
              fill={m.color}
              stroke="white"
              strokeWidth={2}
              label={{ value: `${m.label} ${m.temp}°`, position: 'top', style: { fontSize: 10, fill: m.color, fontWeight: 600 } }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Resumen de marcadores */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
        {markers.map(m => (
          <div key={m.key} className="rounded-lg p-2 text-xs flex items-center justify-between"
               style={{ background: m.color + '15', borderLeft: `3px solid ${m.color}` }}>
            <span className="font-semibold" style={{ color: m.color }}>{m.label}</span>
            <span className="text-[var(--ink)] font-bold">{m.temp}°C</span>
          </div>
        ))}
      </div>

      {/* Data table extendida */}
      <details className="mt-4">
        <summary className="text-xs text-[var(--ink3)] cursor-pointer hover:text-[var(--ink)] select-none">
          {t('fc_show_data_table')}
        </summary>
        <table className="tbl w-full mt-2 text-xs">
          <thead>
            <tr>
              <th className="text-left py-1 px-2 border-b font-semibold text-[var(--ink2)]">{t('temp_col')}</th>
              <th className="text-right py-1 px-2 border-b font-semibold text-[var(--ink2)]" style={{ color: '#3b8fd4' }}>%FW</th>
              <th className="text-right py-1 px-2 border-b font-semibold text-[var(--ink2)]" style={{ color: '#1a5c3a' }}>Ice%</th>
              <th className="text-right py-1 px-2 border-b font-semibold text-[var(--ink2)]" style={{ color: '#7cb342' }}>FreeW%</th>
            </tr>
          </thead>
          <tbody>
            {points.slice(0, 20).map((pt, i) => (
              <tr key={i} className="border-b border-black/5">
                <td className="py-1 px-2 text-[var(--ink)]">{pt.temp.toFixed(2)}</td>
                <td className="py-1 px-2 text-right text-[var(--ink)] tabular-nums">{pt.frozenPct.toFixed(1)}%</td>
                <td className="py-1 px-2 text-right text-[var(--ink)] tabular-nums">{pt.icePct.toFixed(1)}%</td>
                <td className="py-1 px-2 text-right text-[var(--ink)] tabular-nums">{pt.freeWaterPct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
