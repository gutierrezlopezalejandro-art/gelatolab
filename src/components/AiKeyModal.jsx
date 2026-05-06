import { useState } from 'react';
import { useAiStore } from '../store/aiStore';
import { useT } from '../lib/i18n';
import { useDirtyClose } from '../lib/hooks';

export function AiKeyModal({ onClose }) {
  const t = useT();
  const { apiKey, model, setApiKey, setModel, clear } = useAiStore();
  const [draft, setDraft] = useState(apiKey || '');
  const [draftModel, setDraftModel] = useState(model || 'gpt-4o-mini');
  const [show, setShow] = useState(false);

  // Dirty cuando los valores del draft no coinciden con lo guardado.
  const dirty = draft !== (apiKey || '') || draftModel !== (model || 'gpt-4o-mini');
  const requestClose = useDirtyClose(onClose, dirty);

  function save() {
    setApiKey(draft);
    setModel(draftModel);
    onClose?.();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center backdrop-blur-sm" onClick={requestClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="aikey-modal-title" className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 id="aikey-modal-title" className="font-display text-lg text-[var(--ink)] mb-1">{t('ai_settings_title')}</h2>
        <p className="text-xs text-[var(--ink3)] mb-4">{t('ai_settings_subtitle')}</p>

        <label className="text-xs font-semibold text-[var(--ink2)] mb-1 block">{t('ai_key_label')}</label>
        <div className="flex gap-2 mb-1">
          <input
            type={show ? 'text' : 'password'}
            className="input flex-1 font-mono text-xs"
            placeholder="sk-..."
            value={draft}
            onChange={e => setDraft(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" onClick={() => setShow(s => !s)}
            className="btn-secondary text-xs px-3"
            aria-label={show ? t('ai_key_hide') : t('ai_key_show')}
            title={show ? t('ai_key_hide') : t('ai_key_show')}>
            {show ? '🙈' : '👁'}
          </button>
        </div>
        <p className="text-[10px] text-[var(--ink3)] mb-4">{t('ai_key_help')}</p>

        <label className="text-xs font-semibold text-[var(--ink2)] mb-1 block">{t('ai_model_label')}</label>
        <select className="select w-full mb-2" value={draftModel} onChange={e => setDraftModel(e.target.value)}>
          <option value="gpt-4o-mini">gpt-4o-mini ({t('ai_model_cheap')})</option>
          <option value="gpt-4o">gpt-4o ({t('ai_model_quality')})</option>
        </select>
        <p className="text-[10px] text-[var(--ink3)] mb-5">{t('ai_model_help')}</p>

        <div className="flex justify-between gap-2">
          {apiKey && (
            <button className="text-xs text-[var(--coral)] hover:underline cursor-pointer bg-transparent border-none"
              onClick={() => { clear(); onClose?.(); }}>
              {t('ai_clear_key')}
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button className="btn-secondary text-xs" onClick={requestClose}>{t('cancel')}</button>
            <button className="btn-primary text-xs" onClick={save} disabled={!draft.trim()}>
              {t('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
