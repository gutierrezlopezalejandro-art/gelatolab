import { useState } from 'react';
import { useT } from '../lib/i18n';
import { BusinessSettingsModal } from './BusinessSettingsModal';

/**
 * Boton de engranaje que abre la configuracion del negocio.
 *
 * Reemplaza a `UserMenu`, que se elimino junto con las cuentas. Ese menu era
 * la UNICA via de acceso a `BusinessSettingsModal`, asi que sin este boton la
 * configuracion quedaba inalcanzable. Es literalmente la rama que UserMenu ya
 * renderizaba cuando no habia nube configurada; se conserva el mismo
 * `data-tour` para no romper los anclajes del tour guiado.
 */
export function SettingsButton() {
  const t = useT();
  const [showBiz, setShowBiz] = useState(false);

  return (
    <>
      <button
        data-tour="user-menu"
        onClick={() => setShowBiz(true)}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-white/80 hover:text-white
                   hover:bg-white/10 transition-colors cursor-pointer border-none bg-transparent"
        aria-label={t('business_settings_title')}
        title={t('business_settings_title')}
      >
        ⚙
      </button>
      {showBiz && <BusinessSettingsModal onClose={() => setShowBiz(false)} />}
    </>
  );
}
