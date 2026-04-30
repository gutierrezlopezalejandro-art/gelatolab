/**
 * Barcode scanning helper con tres backends:
 *   1. Capacitor MLKit (iOS nativo): la opcion mas precisa, lectura
 *      instantanea via la API nativa de la camara.
 *   2. Web getUserMedia + ZXing: funciona en cualquier navegador moderno
 *      con camara (Chrome, Edge, Firefox, Safari iOS, Tauri webview, etc.).
 *      Se carga vista perezosa via el componente BarcodeScannerModal.
 *   3. Sin camara: la funcion no esta disponible.
 *
 * Para web/Tauri/iOS Safari NO usamos esta funcion directamente — el caller
 * monta <BarcodeScannerModal/> y obtiene el resultado por callback. Esta
 * funcion solo cubre el flujo nativo Capacitor.
 */
import { Capacitor } from '@capacitor/core';

// Capacitor nativo: iOS / Android instalado.
export function isCapacitorNative() {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

// Web con camara accesible: cualquier browser moderno con getUserMedia.
export function isWebcamAvailable() {
  if (typeof navigator === 'undefined') return false;
  return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
}

// Disponibilidad general: true si cualquiera de los dos funciona.
export const isBarcodeAvailable = () => isCapacitorNative() || isWebcamAvailable();

/**
 * Escanea un codigo via Capacitor MLKit nativo. Resuelve al primer codigo.
 * Solo llamar si isCapacitorNative() === true. Para web/desktop usa el
 * componente <BarcodeScannerModal/>.
 */
export async function scanBarcode() {
  if (!isCapacitorNative()) {
    const e = new Error('Native scan requires Capacitor — use BarcodeScannerModal in web');
    e.code = 'NOT_AVAILABLE';
    throw e;
  }

  const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');

  const perm = await BarcodeScanner.requestPermissions();
  if (perm.camera !== 'granted' && perm.camera !== 'limited') {
    const e = new Error('Camera permission denied');
    e.code = 'PERMISSION_DENIED';
    throw e;
  }

  const result = await BarcodeScanner.scan();
  const code = result?.barcodes?.[0]?.rawValue || '';
  if (!code) {
    const e = new Error('Scan cancelled');
    e.code = 'CANCELLED';
    throw e;
  }
  return code;
}
