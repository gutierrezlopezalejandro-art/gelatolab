import { useEffect, useRef } from 'react';
import { useT } from '../../lib/i18n';

/**
 * Hoja de detalle. Es el recipiente de todo lo que sale de las tablas.
 *
 * POR QUE EXISTE
 * --------------
 * La regla del proyecto es que todas las funciones esten en el iPhone y que
 * el iPad solo agregue espacio. Las tablas de muchas columnas no cumplen eso:
 * en un telefono no caben, y esconderlas por CSS es justo lo que habia que
 * revertir.
 *
 * La salida es mostrar en la fila los dos o tres datos con los que se
 * trabaja, y poner el resto aca. Nada se elimina: deja de mostrarse siempre.
 *
 * COMPORTAMIENTO
 * --------------
 * - En telefono sube desde abajo y ocupa como mucho el 85% del alto, para que
 *   se siga viendo de donde salio.
 * - En pantalla grande es un dialogo centrado.
 * - Se cierra con Escape, con el boton, o tocando fuera.
 * - Mientras esta abierta el fondo no hace scroll.
 */
export function DetailSheet({ open, onClose, title, subtitle, children, footer }) {
  const t = useT();
  const panelRef = useRef(null);

  // Escape cierra, y el fondo no debe desplazarse mientras esta abierta.
  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflowPrevio;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  // El foco entra al panel al abrirse, para que el teclado y los lectores de
  // pantalla no se queden atras en la fila que la abrio.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[400] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={e => e.stopPropagation()}
        className="bg-white w-full sm:max-w-lg sm:mx-4 rounded-t-2xl sm:rounded-2xl shadow-2xl
                   max-h-[85vh] sm:max-h-[80vh] flex flex-col outline-none
                   animate-[slideUp_0.18s_ease-out]"
      >
        {/* Barra de arrastre: pista visual de que la hoja sube desde abajo.
            Solo en telefono, donde ese gesto tiene sentido. */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 flex-shrink-0" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-black/15" />
        </div>

        <div className="flex items-start gap-3 px-5 pt-3 sm:pt-5 pb-3 border-b border-black/10 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-base text-[var(--ink)] truncate">{title}</h2>
            {subtitle && <p className="text-xs text-[var(--ink3)] mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="w-11 h-11 -mr-2 -mt-2 flex items-center justify-center text-xl leading-none
                       text-[var(--ink3)] hover:text-[var(--ink)] cursor-pointer bg-transparent
                       border-none flex-shrink-0"
          >×</button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>

        {footer && (
          <div className="px-5 py-3 border-t border-black/10 flex-shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Fila de dato para usar dentro de la hoja: etiqueta a la izquierda, valor a
 * la derecha. Es el formato en el que se leen los desgloses.
 */
export function DetailRow({ label, value, hint, tone }) {
  const color = tone === 'alto' ? 'var(--coral)'
              : tone === 'ok'   ? 'var(--mint)'
              : 'var(--ink)';
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 border-b border-black/5 last:border-0">
      <div className="min-w-0">
        <div className="text-xs text-[var(--ink2)]">{label}</div>
        {hint && <div className="text-[10px] text-[var(--ink3)] mt-0.5">{hint}</div>}
      </div>
      <div className="text-sm font-semibold tabular-nums flex-shrink-0" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
