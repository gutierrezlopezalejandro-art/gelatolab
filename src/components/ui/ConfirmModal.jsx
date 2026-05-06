import { useEscapeKey } from '../../lib/hooks';
import { useT } from '../../lib/i18n';

export default function ConfirmModal({ modal, onResolve }) {
  const t = useT();
  useEscapeKey(() => onResolve(false));
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
      onClick={() => onResolve(false)}
    >
      <div
        role="alertdialog" aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-msg"
        className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Título accesible — invisible visualmente, sirve como nombre del
            alertdialog para lectores de pantalla. WCAG 4.1.2 requiere que
            los diálogos tengan nombre. Antes solo había aria-describedby
            apuntando al mensaje. */}
        <h2 id="confirm-modal-title" className="sr-only">{t('confirm_action')}</h2>
        <p id="confirm-modal-msg" className="text-sm text-[var(--ink)] mb-6 whitespace-pre-wrap">{modal.message}</p>
        <div className="flex gap-3 justify-end">
          <button className="btn-secondary" onClick={() => onResolve(false)}>{t('cancel')}</button>
          <button className="btn-danger" onClick={() => onResolve(true)} autoFocus>{t('confirm')}</button>
        </div>
      </div>
    </div>
  );
}
