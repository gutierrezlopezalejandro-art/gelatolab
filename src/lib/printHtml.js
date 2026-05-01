import { Capacitor } from '@capacitor/core';

// Tauri runtime detection: la app de escritorio inyecta estos globals.
// Necesario porque en Tauri 2 `window.open()` no abre una ventana real
// (CSP + WebView), por lo que el approach web silenciosamente falla.
function isTauri() {
  if (typeof window === 'undefined') return false;
  return !!(window.__TAURI_INTERNALS__ || window.__TAURI__);
}

/**
 * Cross-platform print utility.
 * En Tauri (Win/Mac/Linux nativo) y Capacitor (iOS) usa un iframe oculto
 * porque `window.open` esta bloqueado o silenciado. En navegadores reales
 * usa `window.open` que mantiene la URL/encabezado del documento.
 *
 * Si el popup blocker bloquea `window.open` aun en navegador, caemos al
 * iframe automaticamente para no romper la accion.
 */
export function printHtml(html, { width = 350, height = 500 } = {}) {
  const useIframe = Capacitor.isNativePlatform() || isTauri();

  function withIframe() {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try { iframe.contentWindow.focus(); } catch { /* ignore */ }
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1500);
    }, 300);
  }

  if (useIframe) {
    withIframe();
    return;
  }

  // Web: window.open. Si el popup blocker bloquea, caemos al iframe.
  const w = window.open('', '_blank', `width=${width},height=${height}`);
  if (!w) {
    withIframe();
    return;
  }
  w.document.write(html);
  w.document.close();
  setTimeout(() => {
    try { w.focus(); } catch { /* ignore */ }
    w.print();
  }, 300);
}
