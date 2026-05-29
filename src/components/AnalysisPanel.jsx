import { useEffect, useRef } from 'react';
import { useT } from '../lib/i18n';
import {
  calcStats, getParams, rateParam, overallVerdict,
  rateFpd, getFpdRange, calcServingTemp, tempForFrozenPct,
  calcDensity, calcLactoseSaturation, calcNPAC, calcStabiliserConc,
} from '../lib/icecreamCalc';

function getVerdictCfg(t) {
  return {
    opt: { bg:'#c8e8d4', fg:'#0d3d22', lbl:`✓ ${t('formulation_optimal')}`   },
    acc: { bg:'#f5e6a0', fg:'#5c3d00', lbl:`~ ${t('formulation_acceptable')}` },
    bad: { bg:'#fdecea', fg:'#c0392b', lbl:`⚠ ${t('needs_adjustment')}`       },
  };
}
const BADGE     = { opt:'badge-opt', acc:'badge-acc', bad:'badge-bad', na:'badge-na' };
const BADGE_LBL = { opt:'ÓPT', acc:'OK', bad:'⚠', na:'—' };
const BAR_CLR   = { opt:'var(--mint)', acc:'var(--gold)', bad:'var(--coral)' };

// TYPE_LBL removed — translated via t() inside the component
const COMP_COLORS = {
  agua:'#3b8fd4', grasa:'#f5c842', azucar:'#e07b39', sng:'#1a5c3a', otros:'#bdbdbd',
};
function getCompKeys(t) {
  return [
    { k:'agua', lbl: t('water') }, { k:'grasa', lbl: t('total_fat') },
    { k:'azucar', lbl: t('total_sugar') }, { k:'sng', lbl: t('sng') }, { k:'otros', lbl: t('others_col') },
  ];
}

function DonutChart({ stats }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx = 36, cy = 36, r = 28, inner = 17;
    const total = stats.T || 1;
    const slices = [
      { val:stats.agua,   color:COMP_COLORS.agua   },
      { val:stats.grasa,  color:COMP_COLORS.grasa  },
      { val:stats.azucar, color:COMP_COLORS.azucar },
      { val:stats.sng,    color:COMP_COLORS.sng    },
      { val:stats.otros,  color:COMP_COLORS.otros  },
    ].filter(s => s.val > 0);
    ctx.clearRect(0, 0, 72, 72);
    let angle = -Math.PI / 2;
    slices.forEach(sl => {
      const sweep = (sl.val / total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + sweep);
      ctx.closePath(); ctx.fillStyle = sl.color; ctx.fill();
      angle += sweep;
    });
    ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
  }, [stats]);
  return <canvas ref={ref} width={72} height={72} style={{ flexShrink:0 }} />;
}

// Barra compacta con zona óptima
function MiniBar({ value, lo, hi, optLo, optHi, color }) {
  const span  = hi - lo || 1;
  const pct   = Math.max(0, Math.min(100, ((value - lo) / span) * 100));
  const oLPct = Math.max(0, ((optLo - lo) / span) * 100);
  const oHPct = Math.min(100, ((optHi - lo) / span) * 100);
  return (
    <div className="relative h-1.5 rounded-full bg-[var(--cream2)] overflow-hidden">
      <div className="absolute top-0 h-full opacity-30 rounded"
           style={{ left:`${oLPct}%`, width:`${oHPct-oLPct}%`, background:'var(--mint)' }} />
      <div className="absolute top-0 h-full w-1.5 rounded-full transition-all duration-300"
           style={{ left:`calc(${pct}% - 3px)`, background: color }} />
    </div>
  );
}

export default function AnalysisPanel({
  items, type = 'helado', subtype = 'base', overrunPct = 30, servingTemp,
  onExportPDF, onOverrunChange,
}) {
  const t = useT();

  if (!items || !items.length) {
    return (
      <div className="card p-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink3)] mb-3">
          {t('recipe_balance')}
        </div>
        <p className="text-sm text-[var(--ink3)] text-center py-4">
          {t('add_ingredients_to_see')}
        </p>
      </div>
    );
  }

  const s       = calcStats(items);
  const params  = getParams(type, subtype);
  const verdict = overallVerdict(s, type, subtype);
  const VERDICT_CFG = getVerdictCfg(t);
  const vc      = VERDICT_CFG[verdict];
  const COMP_KEYS = getCompKeys(t);

  const fpdRange  = getFpdRange(type);
  const fpdRating = rateFpd(s.fpd, type);
  // Temperatura de servicio = T° a la que el % objetivo del agua está
  // congelada, leído de la curva ICC4. Misma fórmula para los 3 tipos,
  // sólo cambia el target % frozen (75 helado/sorbete, 69 gelato).
  const targetFwPct = type === 'gelato' ? 69 : 75;
  const tsCalc    = calcServingTemp(s, type);
  // tsCorvitto se mantiene como alias del mismo cálculo para no romper
  // referencias en el resto del componente; ambos valores ahora coinciden
  // por diseño (el viejo método tabla-PAC fue reemplazado).
  const tsCorvitto = tsCalc;
  const tsDesired = servingTemp;
  const deviation = (tsCalc != null && tsDesired != null) ? (tsDesired - tsCalc) : null;
  const devAbs    = deviation != null ? Math.abs(deviation) : null;
  const devOk     = devAbs != null && devAbs <= 1.5;

  // Additional metrics from Demo calc engine
  const density       = calcDensity(s);
  const lactoseSat    = calcLactoseSaturation(s);
  const stabiliserConc = calcStabiliserConc(s);
  const npac          = calcNPAC(s);

  return (
    <div className="card p-4 space-y-3 overflow-hidden">

      {/* -- Cabecera -- */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink3)] shrink-0">
          {t(type === 'helado' ? 'ice_cream' : type === 'gelato' ? 'gelato' : 'sorbet')}
        </span>
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-xs font-semibold px-2 py-0.5 rounded-full truncate"
               style={{ background: vc.bg, color: vc.fg }}>
            {vc.lbl}
          </div>
          {onExportPDF && (
            <button
              className="text-[10px] font-semibold px-2 py-1 rounded-md text-white border-none
                         cursor-pointer transition-colors"
              style={{ background: 'var(--teal)' }}
              onClick={onExportPDF}
              title={t('export')}
            >
              ↓ {t('export')}
            </button>
          )}
        </div>
      </div>

      {/* -- FPD + T° servicio lado a lado -- */}
      <div className="grid grid-cols-2 gap-2">
        {/* FPD */}
        <div className="rounded-xl p-3 text-center" style={{ background:'var(--mint3)' }}>
          <div className="text-[10px] text-[var(--ink3)] mb-0.5">{t('freezing_fpd')}</div>
          <div className="font-display text-2xl text-[var(--mint)] leading-none">
            {s.fpd !== 0 ? s.fpd.toFixed(1) : '—'}°C
          </div>
          <div className="mt-1">
            <span className={BADGE[fpdRating]} style={{ fontSize:9 }}>
              {fpdRating === 'opt' ? t('optimal') : fpdRating === 'acc' ? t('acceptable') : t('out_of_range')}
            </span>
          </div>
          <MiniBar
            value={s.fpd}
            lo={fpdRange.acc_lo} hi={fpdRange.acc_hi}
            optLo={fpdRange.opt_lo} optHi={fpdRange.opt_hi}
            color={BAR_CLR[fpdRating]}
          />
          <div className="text-[9px] text-[var(--ink3)] mt-0.5">
            {t('optimal')} {fpdRange.opt_lo} {t('diag_to')} {fpdRange.opt_hi}°C
          </div>
        </div>

        {/* T° servicio: principal por curva FPD + secundario Corvitto */}
        <div className="rounded-xl p-3 text-center" style={{ background:'#e8f0ff' }}>
          <div className="text-[10px] text-[#3d5090] mb-0.5">
            {t('serving_temp')}
            <span className="ml-1 text-[9px] font-semibold opacity-70">
              ({targetFwPct}% FW)
            </span>
          </div>
          <div className="font-display text-2xl leading-none" style={{ color:'#1a2c6e' }}>
            {tsCalc != null ? tsCalc : '—'}°C
          </div>
          {tsCorvitto != null && (
            <div className="text-[9px] text-[#3d5090] opacity-75 mt-0.5"
                 title={t('ts_corvitto_tooltip')}>
              {t('ts_corvitto_label')}: {tsCorvitto}°C
            </div>
          )}
          {/* Barra grafica: desviacion entre calculada y deseada */}
          {tsCalc != null && tsDesired != null && (() => {
            const lo = Math.min(tsCalc, tsDesired) - 3;
            const hi = Math.max(tsCalc, tsDesired) + 3;
            const span = hi - lo || 1;
            const calcPct = ((tsCalc - lo) / span) * 100;
            const desPct  = ((tsDesired - lo) / span) * 100;
            const minPct = Math.min(calcPct, desPct);
            const maxPct = Math.max(calcPct, desPct);
            return (
              <div className="mt-2">
                <div className="relative h-2 rounded-full bg-white/50 overflow-visible">
                  <div className="absolute top-0 h-full rounded-full opacity-30"
                       style={{ left:`${minPct}%`, width:`${maxPct-minPct}%`,
                                background: devOk ? 'var(--mint)' : 'var(--coral)' }} />
                  <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2"
                       style={{ left:`calc(${calcPct}% - 4px)`, borderColor:'#3b64d4', background:'white' }}
                       title={`${t('serving_temp')}: ${tsCalc}°C`} />
                  <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                       style={{ left:`calc(${desPct}% - 4px)`,
                                background: devOk ? 'var(--mint)' : 'var(--coral)' }}
                       title={`${t('ts_desired')}: ${tsDesired}°C`} />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[8px] text-[#3d5090]">
                    {t('ts_desired')}: {tsDesired}°C
                  </span>
                  <span className={`text-[9px] font-bold ${devOk ? 'text-[#0d3d22]' : 'text-[#c0392b]'}`}>
                    Δ{deviation > 0 ? '+' : ''}{deviation.toFixed(1)}°C
                  </span>
                </div>
              </div>
            );
          })()}
          {(tsDesired == null || tsCalc == null) && (
            <div className="text-[9px] text-[#3d5090] mt-1">{t('ts_from_formula')}</div>
          )}
        </div>
      </div>

      {/* -- Composición compacta -- */}
      <div className="flex items-center gap-3">
        <DonutChart stats={s} />
        <div className="flex-1 space-y-0.5">
          {COMP_KEYS.map(({ k, lbl }) => {
            const pct = s.T > 0 ? (s[k] / s.T * 100) : 0;
            return (
              <div key={k} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm flex-shrink-0"
                      style={{ background:COMP_COLORS[k] }} />
                <span className="text-[10px] text-[var(--ink3)] w-10">{lbl}</span>
                <div className="flex-1 h-1 rounded bg-[var(--cream2)] overflow-hidden">
                  <div className="h-full rounded"
                       style={{ width:`${Math.min(pct*1.2, 100)}%`, background:COMP_COLORS[k], opacity:0.7 }} />
                </div>
                <span className="text-[10px] font-semibold text-[var(--ink2)] w-8 text-right">
                  {pct.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-black/10" />

      {/* -- Parámetros técnicos compactos -- */}
      <div className="space-y-2">
        {params.map(p => {
          const val    = s[p.k];
          const rating = rateParam(val, p);
          return (
            <div key={p.k} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] text-[var(--ink3)] truncate">{t(p.lbl)}</span>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                    <span className="text-xs font-bold text-[var(--ink)]">{p.fmt(val)}</span>
                    <span className={BADGE[rating]}>{BADGE_LBL[rating]}</span>
                  </div>
                </div>
                <div className="h-1 rounded bg-[var(--cream2)] overflow-hidden">
                  <div className="h-full rounded transition-all duration-300"
                       style={{ width:`${Math.min(val/p.max,1)*100}%`, background:BAR_CLR[rating] }} />
                </div>
                <div className="text-[9px] text-[var(--ink3)] mt-0.5">{p.rangeLbl}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-black/10" />

      {/* -- Parámetros adicionales (Demo-enhanced) -- */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink3)] mb-2">
          {t('additional_params')}
        </div>
        <div className="space-y-1.5">
          {/* Densidad */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-[var(--ink3)]">{t('density_label')}</span>
            <span className="text-xs font-semibold text-[var(--ink)]">
              {density != null ? `${density.toFixed(4)} g/mL` : '—'}
            </span>
          </div>

          {/* Saturación lactosa */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-[var(--ink3)]">{t('lactose_sat_label')}</span>
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-[var(--ink)]">
                {lactoseSat != null ? `${lactoseSat.toFixed(1)}%` : '—'}
              </span>
              {lactoseSat != null && lactoseSat > 10 && (
                <span className="text-[9px] font-bold text-[var(--coral)] bg-[#fdecea] px-1 rounded">
                  {t('high_warning')}
                </span>
              )}
            </div>
          </div>

          {/* Concentración estabilizantes */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-[var(--ink3)]">{t('stab_conc_label')}</span>
            <span className="text-xs font-semibold text-[var(--ink)]">
              {stabiliserConc != null ? `${stabiliserConc.toFixed(2)}%` : '—'}
            </span>
          </div>

          {/* NPAC */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-[var(--ink3)]">NPAC</span>
            <span className="text-xs font-semibold text-[var(--ink)]">
              {npac != null ? npac.toFixed(2) : '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-black/10" />

      {/* -- Resumen en grid 2x3 -- */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {[
          { lbl: t('total_mix'),      val:`${Math.round(s.T)} g` },
          { lbl: t('cost_total'),     val:`$${Math.round(s.cost).toLocaleString('es-CL')}` },
          { lbl: t('scoops_120g'),    val: Math.floor(s.T / 120) },
          { lbl: t('cost_per_scoop'), val: s.T > 0 ? `$${Math.round(s.cost/s.T*120).toLocaleString('es-CL')}` : '—' },
          { lbl:'FPD',                val: s.fpd !== 0 ? `${s.fpd.toFixed(2)}°C` : '—' },
          { lbl: t('serving_temp'),   val: tsCalc != null ? `${tsCalc}°C` : '—' },
        ].map(({ lbl, val, hi }) => (
          <div key={lbl}>
            <div className="text-[9px] text-[var(--ink3)] uppercase tracking-wide">{lbl}</div>
            <div className={`text-sm font-bold ${hi ? 'text-[#1a2c6e]' : 'text-[var(--ink)]'}`}>{val}</div>
          </div>
        ))}
      </div>

    </div>
  );
}
