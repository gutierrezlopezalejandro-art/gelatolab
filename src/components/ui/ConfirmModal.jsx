import { useEscapeKey } from '../../lib/hooks';

export default function ConfirmModal({ modal, onResolve }) {
  useEscapeKey(() => onResolve(false));
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
      onClick={() => onResolve(false)}
    >
      <div
        role="alertdialog" aria-modal="true" aria-describedby="confirm-modal-msg"
        className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <p id="confirm-modal-msg" className="text-sm text-[var(--ink)] mb-6 whitespace-pre-wrap">{modal.message}</p>
        <div className="flex gap-3 justify-end">
          <button className="btn-secondary" onClick={() => onResolve(false)}>Cancelar</button>
          <button className="btn-danger" onClick={() => onResolve(true)} autoFocus>Confirmar</button>
        </div>
      </div>
    </div>
  );
}
