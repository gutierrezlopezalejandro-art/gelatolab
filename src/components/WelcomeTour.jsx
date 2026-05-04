import { useEffect, useState, useLayoutEffect, useRef } from 'react';
import { useT } from '../lib/i18n';
import { useEscapeKey } from '../lib/hooks';
import { track } from '../lib/analytics';
import { MarcoAvatar } from './MarcoAvatar';

const TOUR_KEY = 'gelatolab-tour-seen';

export function hasSeenTour() {
  try { return localStorage.getItem(TOUR_KEY) === '1'; } catch { return false; }
}
export function markTourSeen() {
  try { localStorage.setItem(TOUR_KEY, '1'); } catch { /* tolerable */ }
}
export function resetTour() {
  try { localStorage.removeItem(TOUR_KEY); } catch { /* tolerable */ }
}

// Cada paso apunta a un elemento por anchor (selector CSS) o al centro de la
// pantalla. El popover se posiciona automaticamente respecto al ancla.
function buildSteps(t) {
  return [
    {
      anchor: null, // centrado en pantalla — Marco se presenta grande
      marco: true,
      title: t('tour_welcome_title'),
      body: t('tour_welcome_body'),
    },
    {
      anchor: 'a[href="/recipes"], a[href="#/recipes"]',
      emoji: '📝',
      title: t('tour_recipes_title'),
      body: t('tour_recipes_body'),
    },
    {
      anchor: 'a[href="/plan"], a[href="#/plan"]',
      emoji: '📊',
      title: t('tour_plan_title'),
      body: t('tour_plan_body'),
    },
    {
      anchor: 'a[href="/production"], a[href="#/production"]',
      emoji: '🏭',
      title: t('tour_production_title'),
      body: t('tour_production_body'),
    },
    {
      anchor: 'a[href="/ingredients"], a[href="#/ingredients"]',
      emoji: '📦',
      title: t('tour_inventory_title'),
      body: t('tour_inventory_body'),
    },
    {
      anchor: 'a[href="/help"], a[href="#/help"]',
      emoji: '❓',
      title: t('tour_help_title'),
      body: t('tour_help_body'),
    },
    {
      anchor: '[data-tour="user-menu"]',
      emoji: '👤',
      title: t('tour_account_title'),
      body: t('tour_account_body'),
    },
  ];
}

export function WelcomeTour({ onClose }) {
  const t = useT();
  const [stepIdx, setStepIdx] = useState(0);
  const [doNotShowAgain, setDoNotShowAgain] = useState(true);
  const [anchorRect, setAnchorRect] = useState(null);
  const popoverRef = useRef(null);

  const steps = buildSteps(t);
  const step = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;
  const isFirst = stepIdx === 0;

  useEscapeKey(handleClose);

  // Posiciona el popover respecto al ancla (si hay) o centrado.
  useLayoutEffect(() => {
    if (!step.anchor) {
      setAnchorRect(null);
      return;
    }
    const el = document.querySelector(step.anchor);
    if (!el) {
      setAnchorRect(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setAnchorRect({
      top: rect.top, left: rect.left, width: rect.width, height: rect.height,
    });
    // Scroll suave hasta el ancla si no se ve.
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }, [stepIdx]);

  useEffect(() => {
    track('tour_step_viewed', { step: stepIdx + 1, total: steps.length });
  }, [stepIdx, steps.length]);

  function handleNext() {
    if (isLast) handleClose();
    else setStepIdx(i => i + 1);
  }
  function handlePrev() {
    if (!isFirst) setStepIdx(i => i - 1);
  }
  function handleSkip() {
    track('tour_skipped', { at_step: stepIdx + 1 });
    handleClose();
  }
  function handleClose() {
    if (doNotShowAgain) markTourSeen();
    onClose?.();
  }

  // Calcular posicion del popover. Si hay ancla y abajo, va abajo;
  // si esta cerca del borde inferior, va arriba.
  const popoverStyle = (() => {
    if (!anchorRect) {
      return {
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      };
    }
    const POPOVER_HEIGHT = 220; // estimado
    const margin = 12;
    const wantTop = anchorRect.top + anchorRect.height + margin;
    const wouldOverflow = wantTop + POPOVER_HEIGHT > window.innerHeight;
    if (wouldOverflow) {
      return {
        top: anchorRect.top - POPOVER_HEIGHT - margin,
        left: Math.max(16, Math.min(anchorRect.left, window.innerWidth - 360 - 16)),
      };
    }
    return {
      top: wantTop,
      left: Math.max(16, Math.min(anchorRect.left, window.innerWidth - 360 - 16)),
    };
  })();

  return (
    <>
      {/* Cuando NO hay ancla (paso intro de Marco), un overlay leve enfoca
          la atencion en el modal sin tapar todo. */}
      {!anchorRect && (
        <div
          className="fixed inset-0 z-[450] pointer-events-auto"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          aria-hidden="true"
        />
      )}

      {/* Cuando HAY ancla: solo el highlight, que con su box-shadow extendido
          oscurece todo menos el elemento resaltado — efecto "spotlight" sin
          apilar overlays. Captura clicks fuera para que el usuario solo pueda
          interactuar con el tour (Saltar/Siguiente). */}
      {anchorRect && (
        <>
          <div
            className="fixed inset-0 z-[450] pointer-events-auto"
            aria-hidden="true"
          />
          <div
            className="fixed z-[451] pointer-events-none rounded-lg"
            style={{
              top: anchorRect.top - 6,
              left: anchorRect.left - 6,
              width: anchorRect.width + 12,
              height: anchorRect.height + 12,
              boxShadow: '0 0 0 4px var(--gold), 0 0 0 9999px rgba(0,0,0,0.45)',
              transition: 'all 0.3s ease',
            }}
            aria-hidden="true"
          />
        </>
      )}

      {/* Popover */}
      <div
        ref={popoverRef}
        role="dialog" aria-modal="true" aria-labelledby="tour-popover-title"
        className={`fixed z-[452] bg-white rounded-2xl shadow-2xl ${step.marco ? 'w-[460px] p-7' : 'w-[360px] p-5'} max-w-[calc(100vw-32px)] border-2 border-[var(--gold)]`}
        style={popoverStyle}
      >
        {/* Header */}
        {step.marco ? (
          <div className="flex flex-col items-center text-center mb-4">
            <MarcoAvatar size="lg" talking animated />
            <div className="mt-2 text-[10px] font-mono text-[var(--ink3)]">
              {stepIdx + 1} / {steps.length}
            </div>
          </div>
        ) : (
          <div className="flex items-baseline justify-between mb-3">
            <div className="text-3xl" aria-hidden="true">{step.emoji}</div>
            <div className="text-xs font-mono text-[var(--ink3)]">
              {stepIdx + 1} / {steps.length}
            </div>
          </div>
        )}

        <h3 id="tour-popover-title"
            className={`font-display text-[var(--ink)] mb-2 ${step.marco ? 'text-2xl text-center' : 'text-xl'}`}>
          {step.title}
        </h3>
        <p className={`text-[var(--ink2)] leading-relaxed mb-4 ${step.marco ? 'text-base text-center' : 'text-sm'}`}>
          {step.body}
        </p>

        {/* Progreso visual: barra de pasos */}
        <div className="flex gap-1 mb-4">
          {steps.map((_, i) => (
            <div key={i}
                 className="flex-1 h-1 rounded-full transition-colors"
                 style={{ background: i <= stepIdx ? 'var(--gold)' : 'var(--cream2)' }} />
          ))}
        </div>

        {/* Checkbox "no volver a mostrar" + acciones */}
        <label className="flex items-start gap-2 text-xs text-[var(--ink2)] cursor-pointer mb-3 select-none">
          <input
            type="checkbox"
            checked={doNotShowAgain}
            onChange={e => setDoNotShowAgain(e.target.checked)}
            className="mt-0.5 cursor-pointer"
          />
          <span>{t('tour_dont_show_again')}</span>
        </label>

        <div className="flex items-center justify-between gap-2">
          <button onClick={handleSkip}
                  className="text-xs font-semibold text-[var(--ink3)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-none">
            {t('tour_skip')}
          </button>
          <div className="flex gap-2">
            {!isFirst && (
              <button onClick={handlePrev}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-black/10 hover:bg-black/5 cursor-pointer">
                ← {t('tour_prev')}
              </button>
            )}
            <button onClick={handleNext}
                    className="text-xs font-bold px-4 py-1.5 rounded-lg bg-[#e8b920] text-[var(--ink)] hover:opacity-90 cursor-pointer border-none">
              {isLast ? t('tour_finish') : t('tour_next')} →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
