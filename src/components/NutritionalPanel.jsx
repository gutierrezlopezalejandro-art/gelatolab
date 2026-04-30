import { useT } from '../lib/i18n';
import { calcNutritionalValues } from '../lib/icecreamCalc';

function getRows(t) {
  return [
    { key: 'energyKJ',      label: t('energy_kj'),        unit: 'kJ',  dec: 1 },
    { key: 'energyKcal',    label: t('energy_kcal'),      unit: 'kcal',dec: 1 },
    { key: 'totalFat',      label: t('total_fats'),       unit: 'g',   dec: 2 },
    { key: 'saturatedFat',  label: t('saturated_fats'),   unit: 'g',   dec: 2 },
    { key: 'carbs',         label: t('carbohydrates'),    unit: 'g',   dec: 2 },
    { key: 'carbsEU',       label: t('carbs_eu'),         unit: 'g',   dec: 2 },
    { key: 'sugars',        label: t('sugars'),           unit: 'g',   dec: 2 },
    { key: 'polyols',       label: t('sugar_alcohols'),   unit: 'g',   dec: 2 },
    { key: 'fibers',        label: t('dietary_fiber'),    unit: 'g',   dec: 2 },
    { key: 'protein',       label: t('proteins'),         unit: 'g',   dec: 2 },
    { key: 'salt',          label: t('salt'),             unit: 'g',   dec: 3 },
  ];
}

export default function NutritionalPanel({ stats }) {
  const t = useT();

  if (!stats) return null;

  const nv = calcNutritionalValues(stats);
  if (!nv) return null;

  const ROWS = getRows(t);

  return (
    <div className="card p-4">
      <h3 className="font-display text-sm text-[var(--ink)] mb-3">
        {t('nutritional_values')}
      </h3>

      <table className="tbl w-full text-xs">
        <thead>
          <tr>
            <th className="text-left py-1 px-2 border-b font-semibold text-[var(--ink2)]">{t('nutrient_col')}</th>
            <th className="text-right py-1 px-2 border-b font-semibold text-[var(--ink2)]">{t('value')}</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map(row => (
            <tr key={row.key} className="border-b border-black/5">
              <td className="py-1 px-2 text-[var(--ink)]">{row.label}</td>
              <td className="py-1 px-2 text-right text-[var(--ink)]">
                {(nv[row.key] || 0).toFixed(row.dec)} {row.unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 pt-3 border-t border-black/10 text-xs text-[var(--ink2)] space-y-1">
        <div>{t('energy_from_protein')}: {nv.energyFromProtein.toFixed(1)}%</div>
        <div>{t('energy_from_fat')}: {nv.energyFromFat.toFixed(1)}%</div>
      </div>
    </div>
  );
}
