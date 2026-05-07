import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { tRaw } from './i18n';
import { isCapacitorNative } from './platform';

/**
 * True si el contexto actual es "mobile":
 *   - Capacitor nativo (iOS / Android instalado), o
 *   - Web con pantalla <=640px (smartphone, PWA en celular).
 *
 * Reactivo a resize: si el usuario achica la ventana del browser desktop
 * cruzando 640px, el componente que use este hook re-renderiza.
 *
 * Uso:
 *   const isMobile = useIsMobile();
 *   {isMobile && <button>Escanear</button>}
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => computeIsMobile());

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(max-width: 640px)');
    function update() { setIsMobile(computeIsMobile()); }
    // addEventListener disponible en navegadores modernos; fallback addListener
    // por compatibilidad con Safari < 14.
    if (mql.addEventListener) mql.addEventListener('change', update);
    else mql.addListener(update);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', update);
      else mql.removeListener(update);
    };
  }, []);

  return isMobile;
}

function computeIsMobile() {
  if (isCapacitorNative()) return true;
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(max-width: 640px)').matches;
}

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
