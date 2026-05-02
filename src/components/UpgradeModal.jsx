import { useT } from '../lib/i18n';
import { useEscapeKey } from '../lib/hooks';
import { track } from '../lib/analytics';

/**
 * Generic "this is a Pro feature" modal. Renders only when `open` is true.
 * `featureKey` is the entitlement feature key — used to pull a description
 * from i18n (`upgrade_feature_<key>`) and for analytics. CTA navigates to
 * `/pricing` via the URL hash so this component does not require a Router
 * context (testable + reusable in modals not under Routes).
 */
export function UpgradeModal({ open, featureKey, onClose }) {
  const t = useT();
  useEscapeKey(onClose, open);

  if (!open) return null;

  const featureLabel = t(`upgrade_feature_${featureKey}`);

  function goPricing() {
    track('upgrade_modal_cta', { feature: featureKey });
    onClose();
    if (typeof window !== 'undefined') {
      window.location.hash = '#/pricing';
    }
  }

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        role="dialog" aria-modal="true" aria-labelledby="upgrade-title"
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-7 border-2 border-[#e8b920]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl" aria-hidden="true">⭐</span>
          <h2 id="upgrade-title" className="font-display text-xl text-[var(--ink)]">
            {t('upgrade_title')}
          </h2>
        </div>
        <p className="text-sm text-[var(--ink2)] leading-relaxed mb-2">
          {t('upgrade_intro', { feature: featureLabel })}
        </p>
        <p className="text-xs text-[var(--ink3)] leading-relaxed mb-5">
          {t('upgrade_pitch')}
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose}
                  className="text-sm font-semibold px-4 py-2 rounded-lg bg-white border border-black/10 hover:bg-black/5 cursor-pointer">
            {t('upgrade_dismiss')}
          </button>
          <button onClick={goPricing}
                  className="text-sm font-bold px-4 py-2 rounded-lg bg-[#e8b920] text-[var(--ink)] hover:opacity-90 cursor-pointer border-none">
            {t('upgrade_cta')} →
          </button>
        </div>
      </div>
    </div>
  );
}
