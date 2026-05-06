// ===========================================================================
// Detección de plataforma — utilidades cross-cutting para diferenciar
// behaviour según donde corre la app (web, Tauri desktop, Capacitor iOS,
// Capacitor Android).
//
// Casos típicos de uso:
//   - Compliance Apple App Store (no mostrar pricing/payment en iOS)
//   - Workarounds específicos por plataforma (cache, permissions)
//   - Features condicionales (por ej. barcode scanner usa MLKit en iOS
//     nativo y ZXing en web)
// ===========================================================================

let _capacitorChecked = false;
let _isCapacitorNative = false;
let _capacitorPlatform = null; // 'ios' | 'android' | 'web' | null

function checkCapacitor() {
  if (_capacitorChecked) return;
  _capacitorChecked = true;
  try {
    // import dinamico para no romper en Tauri/web donde Capacitor no existe
    if (typeof window !== 'undefined' && window.Capacitor) {
      _isCapacitorNative = !!window.Capacitor.isNativePlatform?.();
      _capacitorPlatform = window.Capacitor.getPlatform?.() || null;
    }
  } catch { /* tolerable */ }
}

/** True si corremos dentro de Capacitor en device nativo (iOS o Android) */
export function isCapacitorNative() {
  checkCapacitor();
  return _isCapacitorNative;
}

/** True solo si estamos en Capacitor iOS — usado para compliance Apple */
export function isCapacitorIOS() {
  checkCapacitor();
  return _isCapacitorNative && _capacitorPlatform === 'ios';
}

/** True solo si estamos en Capacitor Android */
export function isCapacitorAndroid() {
  checkCapacitor();
  return _isCapacitorNative && _capacitorPlatform === 'android';
}

/** True si corremos dentro de Tauri desktop (Windows/Mac/Linux) */
export function isTauriDesktop() {
  if (typeof window === 'undefined') return false;
  return !!(window.__TAURI_INTERNALS__ || window.__TAURI__);
}

/** True si es navegador web (no Tauri ni Capacitor) */
export function isWebBrowser() {
  if (typeof window === 'undefined') return false;
  return !isCapacitorNative() && !isTauriDesktop();
}

/**
 * True si en este contexto las suscripciones/pagos in-app deben ocultarse
 * (Apple App Store Review Guidelines 3.1.1 prohíben llevar al usuario a
 * payments externos desde la app iOS, y obligan a usar IAP nativo).
 *
 * Estrategia actual: web-only payments. En iOS la app es Free de hecho —
 * para upgrade a Pro el usuario va a gelatolab.app desde un browser.
 * Esto evita pagar 30% a Apple y simplifica enormemente el desarrollo.
 *
 * Si en el futuro decidimos implementar IAP nativo, esta función pasaría
 * a devolver false y mostraríamos un flow distinto en iOS.
 */
export function shouldHidePricingUI() {
  return isCapacitorIOS();
}
