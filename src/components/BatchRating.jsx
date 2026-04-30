import { useT } from '../lib/i18n';

/**
 * Multi-dimensional rating for a produced batch. Inspired by IceCreamCalc 4
 * which tracks rating, ratingTexture, ratingBody, ratingTaste, ratingColor.
 *
 * Each dimension is a 1-5 star scale. Click a star to set; click the same
 * star again to clear. Onchange returns the full rating object.
 */
const DIMS = [
  { key: 'overall', icon: '⭐', tKey: 'rating_overall' },
  { key: 'texture', icon: '✨', tKey: 'rating_texture' },
  { key: 'body',    icon: '💪', tKey: 'rating_body' },
  { key: 'taste',   icon: '👅', tKey: 'rating_taste' },
  { key: 'color',   icon: '🎨', tKey: 'rating_color' },
];

function StarRow({ value = 0, onChange, label, icon }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-sm" aria-hidden="true">{icon}</span>
      <span className="flex-1 text-xs text-[var(--ink2)]">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? 0 : n)}
            className="text-base leading-none px-0.5 cursor-pointer bg-transparent border-none transition-colors"
            style={{ color: n <= value ? '#f5c842' : '#d0d0d0' }}
            aria-label={`${n} stars`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

export function BatchRating({ rating = {}, onChange }) {
  const t = useT();
  function setDim(key, val) {
    const next = { ...rating, [key]: val };
    onChange(next);
  }
  return (
    <div>
      <h4 className="text-xs font-semibold text-[var(--ink2)] mb-1">
        {t('batch_rating_title')}
      </h4>
      <p className="text-[10px] text-[var(--ink3)] mb-2">
        {t('batch_rating_sub')}
      </p>
      <div className="border border-black/10 rounded-lg p-2 bg-white">
        {DIMS.map(d => (
          <StarRow
            key={d.key}
            label={t(d.tKey)}
            icon={d.icon}
            value={rating[d.key] || 0}
            onChange={v => setDim(d.key, v)}
          />
        ))}
      </div>
    </div>
  );
}
