import { useT } from '../lib/i18n';
import { ALLERGEN_IDS, calcRecipeAllergens } from '../lib/icecreamCalc';

/**
 * Editor de declaracion de alergenos con 3 estados (EU Reg. 1169 / Codex):
 *   contains  — declarar ("Contiene: ...")
 *   trace     — trazas por contaminacion cruzada ("Puede contener trazas de: ...")
 *   none      — no declarar
 *
 * Por defecto cada alergeno detectado en los ingredientes esta en 'contains'.
 * El usuario puede degradarlo a 'trace' o 'none', o subir 'none' a 'trace'
 * para alergenos no presentes en la formula pero manipulados en la cocina.
 */
const STATE_CFG = {
  contains: { color: '#c0392b', bg: '#fdecea', icon: '✓' },
  trace:    { color: '#b8860b', bg: '#fff8e1', icon: '⚠' },
  none:     { color: '#777',    bg: '#f5f5f5', icon: '—' },
};

export function AllergensEditor({ items, overrides, onChange }) {
  const t = useT();
  const detected = new Set(calcRecipeAllergens(items || []));

  function setState(allergen, state) {
    const next = { ...overrides };
    const auto = detected.has(allergen) ? 'contains' : 'none';
    if (state === auto) {
      // Borra el override si vuelve al default automatico
      delete next[allergen];
    } else {
      next[allergen] = state;
    }
    onChange(next);
  }

  function effectiveState(id) {
    if (overrides?.[id]) return overrides[id];
    return detected.has(id) ? 'contains' : 'none';
  }

  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between mb-3 gap-2 flex-wrap">
        <div>
          <div className="font-display text-sm text-[var(--ink)]">
            🚨 {t('allergens_panel_title')}
          </div>
          <div className="text-[11px] text-[var(--ink3)]">
            {t('allergens_panel_sub')}
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        {ALLERGEN_IDS.map(id => {
          const state = effectiveState(id);
          const isAuto = !overrides?.[id];
          const detectedAuto = detected.has(id);
          return (
            <div key={id} className="flex items-center gap-2 py-1 border-b border-black/5 last:border-b-0">
              <span className="flex-1 text-xs font-medium text-[var(--ink)]">
                {t('allergen_' + id)}
                {detectedAuto && (
                  <span className="ml-1.5 text-[9px] uppercase tracking-wider text-[var(--ink3)]">
                    {t('allergens_in_ingredients')}
                  </span>
                )}
              </span>
              <div className="flex gap-0.5">
                {(['contains', 'trace', 'none']).map(opt => {
                  const cfg = STATE_CFG[opt];
                  const active = state === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setState(id, opt)}
                      className={`text-[10px] font-semibold px-2 py-1 rounded transition-all border cursor-pointer ${active ? 'border-current' : 'border-transparent opacity-50 hover:opacity-100 bg-transparent'}`}
                      style={active ? { color: cfg.color, background: cfg.bg } : { color: '#999' }}
                      title={t('allergens_state_' + opt)}
                    >
                      {cfg.icon} {t('allergens_state_' + opt)}
                    </button>
                  );
                })}
              </div>
              {!isAuto && (
                <span className="text-[9px] text-[#6a1b9a] font-bold uppercase ml-1" title={t('allergens_overridden')}>·</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-[var(--ink3)] mt-3 leading-relaxed">
        {t('allergens_panel_legend')}
      </p>
    </div>
  );
}
