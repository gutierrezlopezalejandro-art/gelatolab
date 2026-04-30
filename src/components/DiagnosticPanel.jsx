import { useT } from '../lib/i18n';
import { getParams, rateParam, rateFpd, getFpdRange } from '../lib/icecreamCalc';

function getDiag(t) {
  return {
    pGrasa: {
      lbl: t('diag_fat'),
      hi: { efecto: t('diag_fat_hi_effect'), accion: t('diag_fat_hi_action') },
      lo: { efecto: t('diag_fat_lo_effect'), accion: t('diag_fat_lo_action') },
    },
    pSng: {
      lbl: t('diag_sng'),
      hi: { efecto: t('diag_sng_hi_effect'), accion: t('diag_sng_hi_action') },
      lo: { efecto: t('diag_sng_lo_effect'), accion: t('diag_sng_lo_action') },
    },
    pAzucar: {
      lbl: t('diag_sugar'),
      hi: { efecto: t('diag_sugar_hi_effect'), accion: t('diag_sugar_hi_action') },
      lo: { efecto: t('diag_sugar_lo_effect'), accion: t('diag_sugar_lo_action') },
    },
    pAgua: {
      lbl: t('diag_water'),
      hi: { efecto: t('diag_water_hi_effect'), accion: t('diag_water_hi_action') },
      lo: { efecto: t('diag_water_lo_effect'), accion: t('diag_water_lo_action') },
    },
    pSolids: {
      lbl: t('diag_solids'),
      hi: { efecto: t('diag_solids_hi_effect'), accion: t('diag_solids_hi_action') },
      lo: { efecto: t('diag_solids_lo_effect'), accion: t('diag_solids_lo_action') },
    },
    pProtein: {
      lbl: t('diag_protein'),
      hi: { efecto: t('diag_protein_hi_effect'), accion: t('diag_protein_hi_action') },
      lo: { efecto: t('diag_protein_lo_effect'), accion: t('diag_protein_lo_action') },
    },
    pStab: {
      lbl: t('diag_stab'),
      hi: { efecto: t('diag_stab_hi_effect'), accion: t('diag_stab_hi_action') },
      lo: { efecto: t('diag_stab_lo_effect'), accion: t('diag_stab_lo_action') },
    },
    pacPct: {
      lbl: t('diag_pac'),
      hi: { efecto: t('diag_pac_hi_effect'), accion: t('diag_pac_hi_action') },
      lo: { efecto: t('diag_pac_lo_effect'), accion: t('diag_pac_lo_action') },
    },
    pod: {
      lbl: t('diag_pod'),
      hi: { efecto: t('diag_pod_hi_effect'), accion: t('diag_pod_hi_action') },
      lo: { efecto: t('diag_pod_lo_effect'), accion: t('diag_pod_lo_action') },
    },
    fpd: {
      lbl: t('diag_fpd'),
      hi: { efecto: t('diag_fpd_hi_effect'), accion: t('diag_fpd_hi_action') },
      lo: { efecto: t('diag_fpd_lo_effect'), accion: t('diag_fpd_lo_action') },
    },
    ts: {
      lbl: t('diag_ts'),
      hi: { efecto: t('diag_ts_hi_effect'), accion: t('diag_ts_hi_action') },
      lo: { efecto: t('diag_ts_lo_effect'), accion: t('diag_ts_lo_action') },
    },
  };
}

export default function DiagnosticPanel({ stats, type = 'helado', subtype = 'base' }) {
  const t = useT();
  if (!stats) return null;

  const DIAG = getDiag(t);

  const params  = getParams(type, subtype);
  const fpdR    = getFpdRange(type);

  const alerts = [];

  for (const p of params) {
    const val    = stats[p.k];
    const rating = rateParam(val, p);
    if (rating === 'opt') continue;
    const diag = DIAG[p.k];
    if (!diag) continue;
    const isHi   = val > p.oHi;
    const detail  = isHi ? diag.hi : diag.lo;
    alerts.push({
      key: p.k, severity: rating, lbl: diag.lbl,
      valor: p.fmt(val), rango: p.rangeLbl,
      dir: isHi ? `↑ ${t('diag_high')}` : `↓ ${t('diag_low')}`,
      ...detail,
    });
  }

  if (stats.fpd !== 0) {
    const fpdRating = rateFpd(stats.fpd, type);
    if (fpdRating !== 'opt') {
      const isHi  = stats.fpd > fpdR.opt_hi;
      const detail = isHi ? DIAG.fpd.hi : DIAG.fpd.lo;
      alerts.push({
        key: 'fpd', severity: fpdRating, lbl: DIAG.fpd.lbl,
        valor: `${stats.fpd.toFixed(2)}°C`,
        rango: `${t('optimal')} ${fpdR.opt_lo} ${t('diag_to')} ${fpdR.opt_hi}°C`,
        dir: isHi ? `↑ ${t('diag_high')}` : `↓ ${t('diag_low')}`,
        ...detail,
      });
    }
  }

  const sevCfg = {
    bad: { border:'#c0392b', bg:'#fdecea', icon:'⚠️', label: t('out_of_range_label') },
    acc: { border:'#b8860b', bg:'#fff8e1', icon:'ℹ️', label: t('acceptable_review') },
  };

  if (alerts.length === 0) {
    return (
      <div className="card p-4 flex items-center gap-3 border-l-4"
           style={{ borderLeftColor:'var(--mint)' }}>
        <span className="text-xl">✅</span>
        <div>
          <div className="font-semibold text-sm text-[var(--mint)]">{t('balanced')}</div>
          <div className="text-xs text-[var(--ink3)]">
            {t('all_params_optimal')} {t(type === 'helado' ? 'ice_cream' : type === 'gelato' ? 'gelato' : 'sorbet')}.
          </div>
        </div>
      </div>
    );
  }

  alerts.sort((a, b) => (a.severity === 'bad' ? -1 : 1));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display text-sm text-[var(--ink)]">
          {t('diag_title')}
        </h3>
        <span className="text-[10px] text-[var(--ink3)]">
          {alerts.filter(a => a.severity === 'bad').length} {t('diag_critical')} ·{' '}
          {alerts.filter(a => a.severity === 'acc').length} {t('diag_review')}
        </span>
      </div>

      {alerts.map(alert => {
        const cfg = sevCfg[alert.severity] || sevCfg.acc;
        return (
          <div key={alert.key} className="rounded-xl border-l-4 p-3"
               style={{ borderLeftColor: cfg.border, background: cfg.bg }}>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-base leading-none">{cfg.icon}</span>
                <span className="text-xs font-bold text-[var(--ink)]">{alert.lbl}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/70"
                      style={{ color: cfg.border }}>
                  {alert.dir} · {alert.valor}
                </span>
              </div>
              <span className="text-[9px] text-[var(--ink3)] whitespace-nowrap flex-shrink-0">
                {alert.rango}
              </span>
            </div>

            <div className="mb-1.5">
              <span className="text-[10px] font-semibold text-[var(--ink2)] uppercase tracking-wide">
                {t('effect')}{' '}
              </span>
              <span className="text-[11px] text-[var(--ink2)]">{alert.efecto}</span>
            </div>

            <div className="flex items-start gap-1.5 bg-white/60 rounded-lg px-2 py-1.5">
              <span className="text-xs flex-shrink-0">💡</span>
              <span className="text-[11px] text-[var(--ink)]">{alert.accion}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
