import { useEffect } from 'react';

/**
 * Cierra un modal cuando el usuario presiona Escape. Pasa una funcion handler
 * y opcionalmente un flag enabled para desactivarlo (ej. cuando el modal no
 * esta visible).
 *
 * Uso:
 *   useEscapeKey(onClose);
 */
export function useEscapeKey(handler, enabled = true) {
  useEffect(() => {
    if (!enabled || typeof handler !== 'function') return;
    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handler(e);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handler, enabled]);
}
