import { useState } from 'react';
import { useT } from '../lib/i18n';
import { unlock } from '../lib/pinLock';
import { useEscapeKey } from '../lib/hooks';

/**
 * Modal pequeno que pide el PIN para desbloquear la edicion de recetas
 * cuando hay un PIN configurado. Una vez correcto, queda desbloqueado por
 * la sesion del navegador.
 */
export function PinPromptModal({ onSuccess, onCancel }) {
  const t = useT();
  useEscapeKey(onCancel);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (unlock(pin)) {
      onSuccess();
    } else {
      setError(t('pin_wrong'));
      setPin('');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[400] flex items-center justify-center backdrop-blur-sm" onClick={onCancel}>
      <form onSubmit={handleSubmit}
            role="dialog" aria-modal="true" aria-labelledby="pin-modal-title"
            className="bg-white rounded-2xl shadow-2xl max-w-xs w-full mx-4 p-5"
            onClick={e => e.stopPropagation()}>
        <h2 id="pin-modal-title" className="font-display text-base text-[var(--ink)] mb-1">🔒 {t('pin_modal_title')}</h2>
        <p className="text-xs text-[var(--ink3)] mb-3">{t('pin_modal_sub')}</p>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          autoFocus
          className="input w-full text-center text-lg tracking-widest font-mono"
          value={pin}
          onChange={e => { setPin(e.target.value); setError(''); }}
          placeholder="••••"
        />
        {error && <p className="text-[11px] text-[var(--coral)] mt-1.5">⚠ {error}</p>}
        <div className="flex gap-2 mt-4 justify-end">
          <button type="button" className="btn-secondary text-xs" onClick={onCancel}>
            {t('cancel')}
          </button>
          <button type="submit" className="btn-primary text-xs" disabled={!pin}>
            {t('pin_unlock_btn')}
          </button>
        </div>
      </form>
    </div>
  );
}
