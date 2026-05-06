import { useState, useEffect } from 'react';
import { useT } from '../lib/i18n';

/**
 * Aviso amigable en pantallas chicas (≤640px) en páginas con muchos
 * controles que están pensados para escritorio. No bloquea el uso, solo
 * sugiere usar desktop o telefono en horizontal para mejor experiencia.
 *
 * El usuario puede cerrarlo y queda guardado por sesión, así no molesta
 * en cada navegación.
 */
const DISMISS_KEY_PREFIX = '__gelatolab_mobile_hint_dismissed_';

export function MobileDesktopHint({ pageId }) {
  const t = useT();
  const dismissKey = DISMISS_KEY_PREFIX + (pageId || 'global');
  const [isMobile, setIsMobile] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(dismissKey) === '1'; } catch { return false; }
  });

  useEffect(() => {
    function check() { setIsMobile(window.matchMedia('(max-width: 640px)').matches); }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!isMobile || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try { sessionStorage.setItem(dismissKey, '1'); } catch {}
  }

  return (
    <div className="rounded-xl p-3 mb-4 text-xs flex items-start gap-2 border"
         style={{ background: 'var(--gold2)', borderColor: 'var(--gold)', color: '#5c3d00' }}>
      <span className="text-base flex-shrink-0" aria-hidden="true">💡</span>
      <div className="flex-1">
        <p className="font-semibold mb-0.5">{t('mobile_hint_title')}</p>
        <p className="leading-snug">{t('mobile_hint_body')}</p>
      </div>
      <button onClick={dismiss}
              className="text-base text-[#8a6d00] hover:text-[#5c3d00] cursor-pointer bg-transparent border-none flex-shrink-0 -mt-1"
              aria-label="Cerrar aviso">✕</button>
    </div>
  );
}
