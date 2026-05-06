import { useEffect, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { tRaw } from './i18n';

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

/**
 * Envuelve onClose con confirmación si hay cambios sin guardar. Si dirty=false
 * cierra directo. Si dirty=true muestra confirm() antes de cerrar.
 *
 * También wirea Escape automáticamente, así que NO uses useEscapeKey junto
 * con esto — duplicaría handlers.
 *
 * Uso:
 *   const requestClose = useDirtyClose(onClose, formIsDirty);
 *   <div onClick={requestClose}>     // backdrop
 *
 * Para mensajes custom: useDirtyClose(onClose, dirty, t('mi_mensaje'))
 */
export function useDirtyClose(onClose, dirty, message) {
  const close = useCallback(async () => {
    if (!dirty) {
      onClose?.();
      return;
    }
    const msg = message ?? tRaw('discard_changes_warning');
    const ok = await useAppStore.getState().confirm(msg);
    if (ok) onClose?.();
  }, [onClose, dirty, message]);

  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Escape') return;
      // Si ya hay un ConfirmModal abierto (porque el usuario está respondiendo
      // "¿Descartar cambios?"), dejamos que ese modal maneje su propio Escape.
      // Sin esto se forma un loop: parent fires close() → opens confirm → user
      // hits Esc → confirm resolves false + parent fires close() again → opens
      // another confirm.
      if (useAppStore.getState().modal) return;
      e.stopPropagation();
      close();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close]);

  return close;
}
