import { useState } from 'react';
import { useT } from '../lib/i18n';
import { calcNutritionalValues, calcRecipeAllergensDetailed } from '../lib/icecreamCalc';
import { calcLabelSeals } from '../lib/countryRegulations';
import { useCountryStore } from '../store/countryStore';
import { Flag } from './CountrySelector';

// Octagon labels — text shown inside each black octagon. The prefix
// (ALTO EN / EXCESO EN / EXCESO) is set per-country via the regulation
// definition, so here we only declare the nutrient half.
const NUTRIENT_LABELS = {
  energy:   'CALORÍAS',
  sugars:   'AZÚCARES',
  satfat:   'GRASAS\nSATURADAS',
  transfat: 'GRASAS\nTRANS',
  sodium:   'SODIO',
  totalfat: 'GRASAS\nTOTALES',
};

function Seal({ prefix, nutrient }) {
  const text = `${prefix}\n${NUTRIENT_LABELS[nutrient] || nutrient.toUpperCase()}`;
  return (
    <div
      className="relative inline-flex items-center justify-center text-white text-center font-bold"
      style={{
        width: 88, height: 88,
        background: '#000',
        clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
        fontSize: 9,
        lineHeight: 1.1,
        letterSpacing: 0.3,
        padding: 6,
      }}
      role="img"
      aria-label={text.replace(/\n/g, ' ')}
    >
      <span style={{ whiteSpace: 'pre-line' }}>{text}</span>
    </div>
  );
}

// Brazilian "lupa" magnifying-glass seal — black rounded rectangle with a
// circular handle hanging off the bottom-right (stylised magnifying glass).
function MagnifyingGlassSeal({ prefix, nutrient }) {
  const text = `${prefix}\n${NUTRIENT_LABELS[nutrient] || nutrient.toUpperCase()}`;
  return (
    <div className="relative inline-block" style={{ width: 100, height: 96 }}
         role="img" aria-label={text.replace(/\n/g, ' ')}>
      {/* Body of the magnifying glass: rounded rectangle */}
      <div className="absolute bg-black text-white text-center font-bold flex items-center justify-center"
           style={{
             top: 0, left: 0, width: 80, height: 70,
             borderRadius: 8,
             fontSize: 9, lineHeight: 1.1, letterSpacing: 0.3, padding: 4,
           }}>
        <span style={{ whiteSpace: 'pre-line' }}>{text}</span>
      </div>
      {/* "Handle" — circle that overlaps bottom-right corner */}
      <div className="absolute bg-black"
           style={{
             bottom: 0, right: 0, width: 32, height: 32,
             borderRadius: '50%',
             border: '4px solid #fff',
             boxShadow: '0 0 0 1.5px #000',
           }} />
    </div>
  );
}

// Ecuador-style traffic light (3 horizontal bars).
function TrafficLight({ lights, t }) {
  const COLORS = { low: '#2e7d32', med: '#f9a825', high: '#c62828' };
  const ROWS = [
    { key: 'sugar', lbl: t('sugars'),    level: lights.sugar },
    { key: 'fat',   lbl: t('total_fats'), level: lights.fat },
    { key: 'salt',  lbl: t('salt'),      level: lights.salt },
  ];
  return (
    <div className="space-y-2">
      {ROWS.map(r => (
        <div key={r.key} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: COLORS[r.level] }}>
          <span className="text-white font-bold flex-1 uppercase tracking-wide text-sm">{r.lbl}</span>
          <span className="text-white text-xs uppercase">
            {r.level === 'low' ? t('country_ec_low') : r.level === 'med' ? t('country_ec_med') : t('country_ec_high')}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function LabelingPanel({ stats, items = [], allergenOverrides = {} }) {
  const t = useT();
  const countryCode = useCountryStore(s => s.country);
  const [portionG, setPortionG] = useState(60);

  if (!stats) return null;
  const nv = calcNutritionalValues(stats);
  if (!nv) return null;

  const { country, seals, lights } = calcLabelSeals(nv, countryCode);
  const allergensDetail = calcRecipeAllergensDetailed(items, allergenOverrides);
  const allergens = allergensDetail.contains;

  const portionFactor = portionG / 100;
  const perPortion = {
    energyKcal:  nv.energyKcal   * portionFactor,
    energyKJ:    nv.energyKJ     * portionFactor,
    protein:     nv.protein      * portionFactor,
    totalFat:    nv.totalFat     * portionFactor,
    saturatedFat:nv.saturatedFat * portionFactor,
    transFat:    nv.transFat     * portionFactor,
    carbs:       nv.carbs        * portionFactor,
    sugars:      nv.sugars       * portionFactor,
    fibers:      nv.fibers       * portionFactor,
    sodiumMg:    nv.sodiumMg     * portionFactor,
    cholesterolMg: nv.cholesterolMg * portionFactor,
    vitaminDMcg:   nv.vitaminDMcg   * portionFactor,
    calciumMg:     nv.calciumMg     * portionFactor,
    ironMg:        nv.ironMg        * portionFactor,
    potassiumMg:   nv.potassiumMg   * portionFactor,
  };
  // Solo mostramos las filas de micronutrientes si al menos un ingrediente
  // los aporta. Asi recetas viejas (sin valores) no se ensucian con ceros.
  const hasMicros =
    (nv.cholesterolMg + nv.vitaminDMcg + nv.calciumMg + nv.ironMg + nv.potassiumMg) > 0;

  const fmt = (v, dec = 1) => (Number.isFinite(v) ? v.toFixed(dec) : '0');

  return (
    <div className="space-y-4">
      {/* ── Alérgenos ── */}
      <div className="card p-5">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="font-display text-base text-[var(--ink)]">{t('allergens_title')}</h3>
        </div>
        {allergensDetail.contains.length === 0 && allergensDetail.trace.length === 0 ? (
          <div className="rounded-lg bg-[var(--mint3)] text-[var(--mint)] p-3 text-xs text-center font-medium">
            ✓ {t('allergens_none')}
          </div>
        ) : (
          <div className="space-y-3">
            {allergensDetail.contains.length > 0 && (
              <div>
                <div className="text-[11px] text-[var(--ink3)] mb-2 uppercase tracking-widest">
                  {t('allergens_contains')}:
                </div>
                <div className="flex flex-wrap gap-2">
                  {allergensDetail.contains.map(a => (
                    <span key={a}
                          className="text-xs font-semibold px-3 py-1 rounded-full text-white"
                          style={{ background: '#c0392b' }}>
                      {t('allergen_' + a)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {allergensDetail.trace.length > 0 && (
              <div>
                <div className="text-[11px] text-[var(--ink3)] mb-2 uppercase tracking-widest">
                  {t('allergens_may_contain')}:
                </div>
                <div className="flex flex-wrap gap-2">
                  {allergensDetail.trace.map(a => (
                    <span key={a}
                          className="text-xs font-semibold px-3 py-1 rounded-full"
                          style={{ background: '#fff8e1', color: '#b8860b', border: '1px dashed #b8860b' }}>
                      {t('allergen_' + a)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Etiquetado frontal según país ── */}
      <div className="card p-5">
        <div className="flex items-baseline justify-between mb-3 flex-wrap gap-1">
          <h3 className="font-display text-base text-[var(--ink)] inline-flex items-center gap-2">
            <Flag code={country.code} size={24} alt={country.name} />
            <span>{t('label_seals_title')} — {country.name}</span>
          </h3>
          <span className="text-[10px] text-[var(--ink3)] uppercase tracking-widest">
            {country.law || t('country_no_regulation_short')}
          </span>
        </div>

        {(country.system === 'octagon' || country.system === 'magnifying_glass') && (
          seals.length === 0 ? (
            <div className="rounded-lg bg-[var(--mint3)] text-[var(--mint)] p-3 text-xs text-center font-medium">
              ✓ {t('label_no_seals_country')}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 justify-center mb-3">
              {seals.map(s => (
                <div key={s.key} className="flex flex-col items-center gap-1">
                  {country.system === 'magnifying_glass'
                    ? <MagnifyingGlassSeal prefix={country.text} nutrient={s.key} />
                    : <Seal prefix={country.text} nutrient={s.key} />}
                  <span className="text-[10px] text-[var(--ink3)]">
                    {fmt(s.value)} {s.unit}
                  </span>
                  <span className="text-[9px] text-[var(--ink3)]">
                    {t('chile_limit')}: {s.limit} {s.unit}
                  </span>
                </div>
              ))}
            </div>
          )
        )}

        {country.system === 'traffic_light' && lights && (
          <TrafficLight lights={lights} t={t} />
        )}

        {country.system === 'none' && (
          <div className="rounded-lg bg-[var(--cream2)] text-[var(--ink2)] p-4 text-xs text-center">
            ℹ {t('country_no_regulation_long', { country: country.name })}
          </div>
        )}
      </div>

      {/* ── Tabla nutricional para etiquetado ── */}
      <div className="card p-5">
        <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-display text-base text-[var(--ink)]">{t('chile_label_table_title')}</h3>
          <label className="text-xs text-[var(--ink3)] flex items-center gap-2">
            {t('chile_portion_size')}:
            <input
              type="number" min="1" max="500" step="1"
              value={portionG}
              onChange={e => setPortionG(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 px-2 py-1 border border-black/10 rounded text-right"
            />
            <span>g</span>
          </label>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-black/20">
              <th className="text-left py-2 px-2 font-semibold text-[var(--ink)]">{t('nutrient_col')}</th>
              <th className="text-right py-2 px-2 font-semibold text-[var(--ink)]">{t('chile_per_100g')}</th>
              <th className="text-right py-2 px-2 font-semibold text-[var(--ink)]">{t('chile_per_portion')} ({portionG}g)</th>
            </tr>
          </thead>
          <tbody className="text-[var(--ink2)]">
            <tr className="border-b border-black/5"><td className="py-1.5 px-2">{t('energy_kcal')} (kcal)</td><td className="text-right py-1.5 px-2">{fmt(nv.energyKcal)}</td><td className="text-right py-1.5 px-2">{fmt(perPortion.energyKcal)}</td></tr>
            <tr className="border-b border-black/5"><td className="py-1.5 px-2">{t('energy_kj')} (kJ)</td><td className="text-right py-1.5 px-2">{fmt(nv.energyKJ)}</td><td className="text-right py-1.5 px-2">{fmt(perPortion.energyKJ)}</td></tr>
            <tr className="border-b border-black/5"><td className="py-1.5 px-2">{t('proteins')} (g)</td><td className="text-right py-1.5 px-2">{fmt(nv.protein, 2)}</td><td className="text-right py-1.5 px-2">{fmt(perPortion.protein, 2)}</td></tr>
            <tr className="border-b border-black/5"><td className="py-1.5 px-2">{t('total_fats')} (g)</td><td className="text-right py-1.5 px-2">{fmt(nv.totalFat, 2)}</td><td className="text-right py-1.5 px-2">{fmt(perPortion.totalFat, 2)}</td></tr>
            <tr className="border-b border-black/5"><td className="py-1.5 px-2 pl-6 italic">{t('saturated_fats')} (g)</td><td className="text-right py-1.5 px-2">{fmt(nv.saturatedFat, 2)}</td><td className="text-right py-1.5 px-2">{fmt(perPortion.saturatedFat, 2)}</td></tr>
            <tr className="border-b border-black/5"><td className="py-1.5 px-2 pl-6 italic">{t('trans_fats')} (g)</td><td className="text-right py-1.5 px-2">{fmt(nv.transFat, 2)}</td><td className="text-right py-1.5 px-2">{fmt(perPortion.transFat, 2)}</td></tr>
            <tr className="border-b border-black/5"><td className="py-1.5 px-2">{t('carbohydrates')} (g)</td><td className="text-right py-1.5 px-2">{fmt(nv.carbs, 2)}</td><td className="text-right py-1.5 px-2">{fmt(perPortion.carbs, 2)}</td></tr>
            <tr className="border-b border-black/5"><td className="py-1.5 px-2 pl-6 italic">{t('sugars')} (g)</td><td className="text-right py-1.5 px-2">{fmt(nv.sugars, 2)}</td><td className="text-right py-1.5 px-2">{fmt(perPortion.sugars, 2)}</td></tr>
            <tr className="border-b border-black/5"><td className="py-1.5 px-2">{t('dietary_fiber')} (g)</td><td className="text-right py-1.5 px-2">{fmt(nv.fibers, 2)}</td><td className="text-right py-1.5 px-2">{fmt(perPortion.fibers, 2)}</td></tr>
            <tr className={hasMicros ? 'border-b border-black/5' : ''}><td className="py-1.5 px-2">{t('sodium')} (mg)</td><td className="text-right py-1.5 px-2">{fmt(nv.sodiumMg)}</td><td className="text-right py-1.5 px-2">{fmt(perPortion.sodiumMg)}</td></tr>
            {hasMicros && (<>
              <tr className="border-b border-black/5"><td className="py-1.5 px-2">{t('micro_cholesterol')} (mg)</td><td className="text-right py-1.5 px-2">{fmt(nv.cholesterolMg)}</td><td className="text-right py-1.5 px-2">{fmt(perPortion.cholesterolMg)}</td></tr>
              <tr className="border-b border-black/5"><td className="py-1.5 px-2">{t('micro_vitamind')} (µg)</td><td className="text-right py-1.5 px-2">{fmt(nv.vitaminDMcg, 2)}</td><td className="text-right py-1.5 px-2">{fmt(perPortion.vitaminDMcg, 2)}</td></tr>
              <tr className="border-b border-black/5"><td className="py-1.5 px-2">{t('micro_calcium')} (mg)</td><td className="text-right py-1.5 px-2">{fmt(nv.calciumMg)}</td><td className="text-right py-1.5 px-2">{fmt(perPortion.calciumMg)}</td></tr>
              <tr className="border-b border-black/5"><td className="py-1.5 px-2">{t('micro_iron')} (mg)</td><td className="text-right py-1.5 px-2">{fmt(nv.ironMg, 2)}</td><td className="text-right py-1.5 px-2">{fmt(perPortion.ironMg, 2)}</td></tr>
              <tr><td className="py-1.5 px-2">{t('micro_potassium')} (mg)</td><td className="text-right py-1.5 px-2">{fmt(nv.potassiumMg)}</td><td className="text-right py-1.5 px-2">{fmt(perPortion.potassiumMg)}</td></tr>
            </>)}
          </tbody>
        </table>

        <p className="mt-4 text-[10px] text-[var(--ink3)] leading-relaxed">
          ⚠ {t('chile_label_disclaimer')}
        </p>
      </div>
    </div>
  );
}
