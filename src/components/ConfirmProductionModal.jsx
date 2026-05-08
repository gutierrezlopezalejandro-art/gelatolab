import { useState, useMemo } from 'react';
import { useT } from '../lib/i18n';
import { useEscapeKey } from '../lib/hooks';
import { confirmProduction } from '../store/inventoryStore';
import { BatchRating } from './BatchRating';

/**
 * Modal de confirmación explícita de producción + rating de cata (v1.0.13).
 *
 * Reemplaza el flujo anterior donde el inventario se descontaba
 * silenciosamente al llegar la prod_date. Ahora cuando una producción
 * llega a "hoy" se marca como pending_confirmation, y el usuario debe
 * confirmar via este modal.
 *
 * Soporta wizard: si hay varias pendientes (entries.length > 1) las muestra
 * una tras otra. Cada confirmación dispara confirmProduction() que
 * atómicamente: actualiza fecha si cambió, descuenta inventario, marca
 * deducted, guarda rating + comentario.
 *
 * Pasos por entry:
 *   step 1 — confirmar fecha real (default hoy, editable)
 *   step 2 — BatchRating (5 dimensiones × 1-5 estrellas) + comentario opcional
 *
 * El user puede saltar el rating (botón "Saltar"). La fecha es obligatoria.
 */
export function ConfirmProductionModal({ entries, onClose }) {
  const t = useT();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState(1);
  const [date, setDate] = useState(today);
  const [rating, setRating] = useState({});
  const [comment, setComment] = useState('');
  const [error, setError] = useState(null);

  useEscapeKey(() => onClose());

  if (!entries || entries.length === 0) return null;
  const entry = entries[idx];
  const total = entries.length;
  const isLast = idx === total - 1;

  function nextEntry() {
    if (isLast) {
      onClose();
      return;
    }
    setIdx(idx + 1);
    setStep(1);
    setDate(today);
    setRating({});
    setComment('');
    setError(null);
  }

  function handleConfirmDate() {
    if (!date) {
      setError(t('confirm_prod_date_required'));
      return;
    }
    setError(null);
    setStep(2);
  }

  function handleSaveRating() {
    try {
      confirmProduction(entry.id, {
        rating: Object.keys(rating).length > 0 ? rating : undefined,
        comment: comment.trim() || undefined,
        actualDate: date !== entry.prod_date ? date : undefined,
      });
      nextEntry();
    } catch (e) {
      setError(String(e?.message || e));
    }
  }

  function handleSkipRating() {
    try {
      // Skip rating: confirma la producción solo con la fecha (sin rating)
      confirmProduction(entry.id, {
        actualDate: date !== entry.prod_date ? date : undefined,
      });
      nextEntry();
    } catch (e) {
      setError(String(e?.message || e));
    }
  }

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        role="dialog" aria-modal="true" aria-labelledby="confirm-prod-title"
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-[var(--mint)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header con progreso si hay multiples */}
        <div className="flex items-center justify-between mb-3">
          <h2 id="confirm-prod-title" className="font-display text-xl text-[var(--ink)]">
            {t('confirm_prod_title')}
          </h2>
          {total > 1 && (
            <span className="text-xs font-semibold text-[var(--ink3)] bg-black/5 px-2 py-1 rounded-lg">
              {idx + 1} / {total}
            </span>
          )}
        </div>

        {/* Info del lote */}
        <div className="mb-5 p-3 rounded-lg bg-[var(--cream)] border border-black/10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--ink)] text-[var(--cream)]">
              {entry.lote_str}
            </span>
            <span className="font-display text-sm text-[var(--ink)]">{entry.recipe_name}</span>
          </div>
          <div className="mt-1 text-xs text-[var(--ink3)]">
            {parseFloat(entry.liters || 0).toFixed(1)} L
            {entry.prod_date && ` · ${t('confirm_prod_planned_for')} ${entry.prod_date}`}
          </div>
        </div>

        {/* Step 1 — confirmar fecha real */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="actual-date" className="block text-xs font-semibold text-[var(--ink2)] mb-1.5">
                {t('confirm_prod_actual_date_label')}
              </label>
              <input
                id="actual-date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="input w-full"
                max={today}
              />
              <p className="mt-1 text-[10px] text-[var(--ink3)]">
                {t('confirm_prod_actual_date_hint')}
              </p>
            </div>

            {error && (
              <p className="text-xs text-[var(--coral)]">{error}</p>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button onClick={onClose}
                      className="text-sm font-semibold px-4 py-2 rounded-lg bg-white border border-black/10 hover:bg-black/5 cursor-pointer">
                {t('confirm_prod_later')}
              </button>
              <button onClick={handleConfirmDate}
                      className="text-sm font-bold px-4 py-2 rounded-lg bg-[var(--mint)] text-white hover:opacity-90 cursor-pointer border-none">
                {t('confirm_prod_continue')} →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — rating + comentario */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--ink2)] leading-relaxed">
              {t('confirm_prod_rating_intro')}
            </p>

            <BatchRating
              rating={rating}
              onChange={setRating}
            />

            <div>
              <label htmlFor="rating-comment" className="block text-xs font-semibold text-[var(--ink2)] mb-1.5">
                {t('confirm_prod_comment_label')}
              </label>
              <textarea
                id="rating-comment"
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                placeholder={t('confirm_prod_comment_placeholder')}
                className="input w-full text-sm resize-none"
              />
            </div>

            {error && (
              <p className="text-xs text-[var(--coral)]">{error}</p>
            )}

            <div className="flex gap-2 justify-between pt-2">
              <button onClick={handleSkipRating}
                      className="text-sm font-semibold px-4 py-2 rounded-lg bg-white border border-black/10 hover:bg-black/5 cursor-pointer">
                {t('confirm_prod_skip_rating')}
              </button>
              <button onClick={handleSaveRating}
                      className="text-sm font-bold px-4 py-2 rounded-lg bg-[var(--mint)] text-white hover:opacity-90 cursor-pointer border-none">
                {isLast ? t('confirm_prod_done') : t('confirm_prod_next')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
