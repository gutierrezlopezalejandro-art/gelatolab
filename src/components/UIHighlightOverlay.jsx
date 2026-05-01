import { useEffect, useState, useLayoutEffect } from 'react';
import { useHighlightStore } from '../lib/uiHighlight';
import { useT } from '../lib/i18n';
import { useEscapeKey } from '../lib/hooks';

/**
 * Overlay que resalta un elemento del DOM con un ring dorado + tooltip.
 * Se activa cuando el store de highlight tiene un `pending`. Espera unos
 * milisegundos por si el target no esta listo todavia (cambio de ruta).
 */
export function UIHighlightOverlay() {
  const t = useT();
  const pending = useHighlightStore(s => s.pending);
  const clear = useHighlightStore(s => s.clear);
  const [rect, setRect] = useState(null);
  const [retries, setRetries] = useState(0);

  useEscapeKey(clear, !!pending);

  // Auto-limpia despues de 60s para no quedar pegado en pantalla.
  useEffect(() => {
    if (!pending) return;
    const timeout = setTimeout(clear, 60000);
    return () => clearTimeout(timeout);
  }, [pending, clear]);

  // Busca el elemento y obtiene su rect. Reintenta si todavia no esta en el
  // DOM (puede pasar si la pagina destino tiene lazy-load o suspense).
  useLayoutEffect(() => {
    if (!pending) { setRect(null); return; }
    const el = document.querySelector(pending.selector);
    if (el) {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      setRetries(0);
    } else if (retries < 8) {
      // Reintentamos cada 250ms hasta 2s.
      const tid = setTimeout(() => setRetries(r => r + 1), 250);
      return () => clearTimeout(tid);
    } else {
      // Si no aparece en 2s, limpiamos sin mostrar nada.
      clear();
    }
  }, [pending, retries, clear]);

  // Recalcula el rect en resize y scroll para que el highlight siga el
  // elemento si la pagina cambia layout.
  useEffect(() => {
    if (!pending || !rect) return;
    function reposition() {
      const el = document.querySelector(pending.selector);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [pending, rect]);

  if (!pending || !rect) return null;

  // Calcular posicion del tooltip: preferimos abajo, sino arriba si no cabe.
  const TOOLTIP_W = 280;
  const TOOLTIP_H = 120; // estimado
  const margin = 12;
  const wantTop = rect.top + rect.height + margin;
  const fitsBelow = wantTop + TOOLTIP_H < window.innerHeight;
  const tooltipStyle = fitsBelow
    ? {
        top: wantTop,
        left: Math.max(16, Math.min(rect.left, window.innerWidth - TOOLTIP_W - 16)),
      }
    : {
        top: rect.top - TOOLTIP_H - margin,
        left: Math.max(16, Math.min(rect.left, window.innerWidth - TOOLTIP_W - 16)),
      };

  return (
    <>
      {/* Spotlight ring + overlay oscuro alrededor del elemento */}
      <div
        className="fixed pointer-events-none rounded-lg z-[490]"
        style={{
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
          boxShadow: '0 0 0 4px var(--gold), 0 0 0 9999px rgba(0,0,0,0.18)',
          transition: 'all 0.3s ease',
        }}
        aria-hidden="true"
      />

      {/* Tooltip con el mensaje */}
      <div
        role="dialog" aria-modal="false" aria-labelledby="ui-highlight-msg"
        className="fixed z-[491] bg-white rounded-xl shadow-2xl border-2 border-[var(--gold)] p-4"
        style={{ ...tooltipStyle, width: TOOLTIP_W }}
      >
        <div className="flex items-start gap-2 mb-3">
          <span className="text-2xl shrink-0" aria-hidden="true">👆</span>
          <p id="ui-highlight-msg" className="text-sm text-[var(--ink)] leading-relaxed">
            {pending.message}
          </p>
        </div>
        <div className="flex justify-end">
          <button
            onClick={clear}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#e8b920] text-[var(--ink)] hover:opacity-90 cursor-pointer border-none"
          >
            {t('ui_highlight_got_it')}
          </button>
        </div>
      </div>
    </>
  );
}
