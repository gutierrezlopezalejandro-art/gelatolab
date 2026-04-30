import { useEffect, useRef, useState } from 'react';
import { useT } from '../lib/i18n';
import { useEscapeKey } from '../lib/hooks';

/**
 * Modal de escaneo de codigos de barra basado en la camara del dispositivo.
 * Funciona en cualquier navegador con getUserMedia (Chrome, Edge, Safari iOS,
 * Tauri webview, etc.).
 *
 * Estrategia para iOS Safari:
 *   1. Llamar getUserMedia con facingMode 'environment' para pedir permiso
 *      Y obtener la camara trasera de un solo gesto.
 *   2. Solo DESPUES de obtener permiso podemos enumerar dispositivos para
 *      mostrar el selector (en iOS, las labels y deviceIds quedan vacios
 *      hasta que el usuario otorga permiso al menos una vez).
 */
export function BarcodeScannerModal({ onDetected, onClose }) {
  const t = useT();
  useEscapeKey(onClose);
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState('');
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState('');
  const [starting, setStarting] = useState(true);
  const [facingMode] = useState('environment'); // arrancar siempre con trasera

  useEffect(() => {
    let cancelled = false;
    let reader = null;

    async function start() {
      setStarting(true);
      setError('');
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        if (cancelled) return;
        reader = new BrowserMultiFormatReader();

        // Construye los constraints: si ya elegimos un device especifico, lo
        // forzamos; si no, pedimos la trasera ('environment') que iOS y
        // Android entienden directo.
        const constraints = deviceId
          ? { video: { deviceId: { exact: deviceId } } }
          : { video: { facingMode: { ideal: facingMode } } };

        controlsRef.current = await reader.decodeFromConstraints(
          constraints,
          videoRef.current,
          (result, err) => {
            if (result) {
              try { controlsRef.current?.stop(); } catch {}
              controlsRef.current = null;
              onDetected(result.getText());
            }
            if (err && err.name && err.name !== 'NotFoundException') {
              console.debug('zxing decode err:', err.name);
            }
          }
        );

        // Despues de obtener permiso, ahora si podemos enumerar para mostrar
        // selector si hay mas de una camara.
        try {
          const list = await BrowserMultiFormatReader.listVideoInputDevices();
          if (!cancelled && list.length > 1) setDevices(list);
        } catch { /* no critico */ }

        if (cancelled) {
          try { controlsRef.current?.stop(); } catch {}
        }
      } catch (e) {
        if (cancelled) return;
        const name = e?.name || '';
        if (name === 'NotAllowedError') setError(t('scan_perm_denied'));
        else if (name === 'NotFoundError' || name === 'OverconstrainedError') setError(t('scan_no_camera'));
        else setError(t('scan_failed') + ': ' + (e?.message || name));
      } finally {
        if (!cancelled) setStarting(false);
      }
    }

    start();
    return () => {
      cancelled = true;
      try { controlsRef.current?.stop(); } catch {}
      controlsRef.current = null;
    };
  }, [deviceId, facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="scanner-modal-title"
         className="fixed inset-0 bg-black z-[400] flex flex-col" onClick={onClose}>
      <div className="bg-[var(--ink)] text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div id="scanner-modal-title" className="text-sm font-semibold">📷 {t('scan_title')}</div>
        <button onClick={onClose} aria-label={t('close')} className="text-2xl text-white/80 hover:text-white cursor-pointer bg-transparent border-none">×</button>
      </div>

      <div className="flex-1 relative bg-black flex items-center justify-center" onClick={e => e.stopPropagation()}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted
          playsInline
        />
        {/* Mira / overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[80%] max-w-md aspect-[4/3] border-2 border-[var(--gold)] rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
            <div className="relative w-full h-full">
              <span className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[var(--gold)] rounded-tl-2xl"></span>
              <span className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[var(--gold)] rounded-tr-2xl"></span>
              <span className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[var(--gold)] rounded-bl-2xl"></span>
              <span className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[var(--gold)] rounded-br-2xl"></span>
            </div>
          </div>
        </div>

        {starting && (
          <div className="absolute bottom-12 left-0 right-0 text-center text-white text-sm">
            {t('scan_starting')}
          </div>
        )}
        {error && (
          <div className="absolute bottom-0 left-0 right-0 bg-[var(--coral)] text-white px-4 py-3 text-sm text-center">
            ⚠ {error}
          </div>
        )}
      </div>

      {devices.length > 1 && (
        <div className="bg-[var(--ink)] text-white px-4 py-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <label className="text-xs flex items-center gap-2">
            <span>{t('scan_camera_label')}:</span>
            <select
              className="flex-1 text-xs bg-white/10 text-white border border-white/20 rounded px-2 py-1"
              value={deviceId}
              onChange={e => setDeviceId(e.target.value)}
            >
              <option value="">{t('scan_camera_default') || 'Auto (trasera)'}</option>
              {devices.map(d => (
                <option key={d.deviceId} value={d.deviceId} className="text-black">
                  {d.label || `Camara ${d.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="bg-[var(--ink)] text-white/70 text-[11px] text-center px-4 py-2 flex-shrink-0">
        {t('scan_hint')}
      </div>
    </div>
  );
}
