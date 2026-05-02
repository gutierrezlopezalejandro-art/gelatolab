import { useState, cloneElement, isValidElement, Children } from 'react';
import { useEntitlement } from '../lib/entitlement';
import { UpgradeModal } from './UpgradeModal';
import { useT } from '../lib/i18n';

/**
 * Two ways to use:
 *
 *   1) <ProGate feature="labels"><LabelingPanel /></ProGate>
 *      — If user can't access, replaces children with a locked card.
 *
 *   2) <ProGate feature="recipe_compare" mode="intercept">
 *        <button onClick={openCompare}>Comparar</button>
 *      </ProGate>
 *      — Renders children but intercepts onClick to show upgrade modal.
 *      Only intercepts the FIRST click target child.
 *
 * Uses entitlement.useEntitlement() for the plan check.
 */
export function ProGate({ feature, mode = 'replace', children, fallback = null }) {
  const t = useT();
  const ent = useEntitlement();
  const [showModal, setShowModal] = useState(false);

  if (ent.can(feature)) return children;

  // Intercept mode: render children but trap the first click anywhere on
  // the wrapper. Used for action buttons where we want the user to *see*
  // the feature exists but get prompted to upgrade.
  if (mode === 'intercept') {
    return (
      <>
        <span
          onClickCapture={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowModal(true);
          }}
          style={{ display: 'contents' }}
        >
          {children}
        </span>
        <UpgradeModal
          open={showModal}
          featureKey={feature}
          onClose={() => setShowModal(false)}
        />
      </>
    );
  }

  // Default replace mode: shows a locked card instead of the gated UI.
  if (fallback) return fallback;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="block w-full text-left rounded-2xl border-2 border-dashed border-[#e8b920] bg-[#fdf3d4]/40 p-6 cursor-pointer hover:bg-[#fdf3d4]/70 transition-colors"
      >
        <div className="flex items-start gap-3">
          <span className="text-3xl shrink-0" aria-hidden="true">⭐</span>
          <div className="flex-1">
            <div className="font-display text-base text-[var(--ink)] mb-1">
              {t('progate_locked_title')}
            </div>
            <p className="text-sm text-[var(--ink2)] leading-relaxed mb-2">
              {t(`upgrade_feature_${feature}`)}
            </p>
            <span className="inline-flex items-center text-xs font-bold text-[#a87a00]">
              {t('progate_unlock')} →
            </span>
          </div>
        </div>
      </button>
      <UpgradeModal
        open={showModal}
        featureKey={feature}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}

/**
 * Small inline badge "PRO" — para etiquetar features Pro en menus,
 * tooltips, etc. sin bloquearlas. Por ejemplo en BusinessSettings al
 * mostrar "Mantecador adicional" se le pone <ProBadge /> al lado.
 */
export function ProBadge({ className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-[#e8b920] text-[var(--ink)] ${className}`}
      aria-label="Pro"
    >
      Pro
    </span>
  );
}
