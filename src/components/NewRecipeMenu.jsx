import { useT } from '../lib/i18n';
import { useEscapeKey } from '../lib/hooks';

/**
 * Modal con 3 opciones para empezar una receta nueva: desde cero, desde una
 * plantilla balanceada, o paso a paso con asistente.
 */
export function NewRecipeMenu({ onScratch, onTemplate, onWizard, onClose }) {
  const t = useT();
  useEscapeKey(onClose);

  const cards = [
    {
      key: 'scratch', icon: '📝', color: '#1a5c3a',
      title: t('new_from_scratch'),
      sub: t('new_from_scratch_sub'),
      onClick: onScratch,
    },
    {
      key: 'template', icon: '✨', color: '#0d5c6e',
      title: t('templates_btn'),
      sub: t('new_from_template_sub'),
      onClick: onTemplate,
    },
    {
      key: 'wizard', icon: '🪄', color: '#6a1b9a',
      title: t('wiz_btn'),
      sub: t('new_from_wizard_sub'),
      onClick: onWizard,
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="newrecipe-modal-title" className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-black/10 flex items-baseline justify-between">
          <h2 id="newrecipe-modal-title" className="font-display text-lg text-[var(--ink)]">{t('new_recipe_menu_title')}</h2>
          <button onClick={onClose} aria-label={t('close')} className="text-2xl text-[var(--ink3)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-none">×</button>
        </div>
        <div className="p-4 space-y-2">
          {cards.map(c => (
            <button
              key={c.key}
              type="button"
              onClick={() => { c.onClick(); onClose(); }}
              className="w-full text-left p-4 rounded-xl border border-black/10 hover:border-[var(--mint2)] hover:shadow-md transition-all cursor-pointer bg-white flex items-start gap-3"
            >
              <span className="text-2xl flex-shrink-0" aria-hidden="true">{c.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[var(--ink)]" style={{ color: c.color }}>{c.title}</div>
                <div className="text-xs text-[var(--ink3)] mt-0.5">{c.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
