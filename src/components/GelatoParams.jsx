import { useT } from '../lib/i18n';
import {
  calcDensity, calcLactoseSaturation, calcNPAC,
  calcStabiliserConc, calcFrozenWaterPct,
} from '../lib/icecreamCalc';

export default function GelatoParams({ stats, type = 'helado', overrunPct = 30, servingTemp }) {
  const t = useT();

  if (!stats || stats.T === 0) {
    return (
      <div className="card p-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink3)] mb-3">
          {t('gelato_params')}
        </div>
        <p className="text-sm text-[var(--ink3)] text-center py-4">
          {t('add_ingredients_to_see')}
        </p>
      </div>
    );
  }

  const solidsPct = stats.T > 0 ? ((stats.T - stats.agua) / stats.T) * 100 : 0;
  const msnfPct = stats.T > 0 ? (stats.msnf / stats.T) * 100 : 0;
  const lactosePct = stats.T > 0 ? (stats.lactose / stats.T) * 100 : 0;
  const lacSat = calcLactoseSaturation(stats);
  const stabConc = calcStabiliserConc(stats);
  const density = calcDensity(stats);
  const npac = calcNPAC(stats);
  const ts = servingTemp;
  const absTemp = ts != null ? Math.abs(ts) : 12;
  const frozenPct = calcFrozenWaterPct(stats.waterFrac, stats.fpd, ts ?? stats.fpd - 6);

  const isWarn = (val, lo, hi) => val < lo || val > hi;

  const rows = [
    { label: t('total_solids'), value: `${solidsPct.toFixed(2)} %`, warn: isWarn(solidsPct, 30, 45) },
    { label: t('slng_msnf'), value: `${msnfPct.toFixed(2)} %` },
    { label: t('lactose'), value: `${lactosePct.toFixed(2)} %` },
    { label: t('lactose_saturation'), value: `${lacSat.toFixed(2)} %`, warn: lacSat > 12 },
    { label: t('stabiliser_conc'), value: `${stabConc.toFixed(2)} %` },
    { label: t('pac_fpdf'), value: (stats.pacPct * 10).toFixed(2) },
    { label: t('npac_label'), value: npac.toFixed(2) },
    { label: t('pod_rs'), value: (stats.podPct * 10).toFixed(2) },
    { label: t('freezing_point'), value: `${stats.fpd.toFixed(2)} C`, highlight: true },
    { label: t('set_temperature'), value: ts != null ? `${ts} C` : '--' },
    { label: t('water_fraction'), value: stats.waterFrac.toFixed(2) },
    { label: t('frozen_water_pct', { temp: ts ?? '--' }), value: `${frozenPct.toFixed(2)} %`, highlight: true },
    { label: t('density'), value: `${density.toFixed(3)} kg/l` },
  ];

  return (
    <div className="card p-5">
      <div className="font-display text-base text-[var(--ink)] mb-4">
        {t('gelato_params')} ({t(type === 'helado' ? 'ice_cream' : type === 'gelato' ? 'gelato' : 'sorbet')})
      </div>
      <table className="tbl text-xs">
        <thead>
          <tr>
            <th className="text-left">{t('parameter')}</th>
            <th>{t('value')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}
                className={r.highlight ? '' : ''}
                style={r.warn ? { background: 'var(--coral2)' } : r.highlight ? { background: 'var(--mint3)' } : {}}>
              <td>{r.label}</td>
              <td className="font-semibold">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
