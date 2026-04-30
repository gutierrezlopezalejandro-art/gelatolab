import { useState, useMemo } from 'react';
import templates from '../data/templates.json';
import { useT } from '../lib/i18n';
import { useEscapeKey } from '../lib/hooks';

const TYPE_BG = { helado: '#c8e8d4', gelato: '#ede7f6', sorbete: '#d4eef5' };
const TYPE_COLOR = { helado: '#1a5c3a', gelato: '#6a1b9a', sorbete: '#0d5c6e' };

/**
 * Browse the curated recipe templates and instantiate one as a new recipe.
 * Templates live in src/data/templates.json and are static — distinct from
 * the user's saved recipes and the seed recipes that ship in recipes.json.
 */
export function TemplateModal({ onPick, onClose }) {
  const t = useT();
  useEscapeKey(onClose);
  const [filter, setFilter] = useState('todos'); // todos | helado | gelato | sorbete
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    return templates.filter(tpl => {
      const matchType = filter === 'todos' || tpl.type === filter;
      const matchQ = !q || tpl.name.toLowerCase().includes(q.toLowerCase())
                   || tpl.description?.toLowerCase().includes(q.toLowerCase());
      return matchType && matchQ;
    });
  }, [filter, q]);

  const grouped = useMemo(() => {
    const m = {};
    filtered.forEach(tpl => {
      const cat = tpl.category || 'Otros';
      if (!m[cat]) m[cat] = [];
      m[cat].push(tpl);
    });
    return m;
  }, [filtered]);

  const tabs = [
    { k: 'todos',   lbl: t('all'),       emoji: '🍨' },
    { k: 'helado',  lbl: t('ice_cream'), emoji: '🍦' },
    { k: 'gelato',  lbl: t('gelato'),    emoji: '🇮🇹' },
    { k: 'sorbete', lbl: t('sorbet'),    emoji: '🍋' },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog" aria-modal="true" aria-labelledby="template-modal-title"
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/10 flex items-baseline justify-between flex-wrap gap-3">
          <div>
            <h2 id="template-modal-title" className="font-display text-lg text-[var(--ink)]">{t('templates_title')}</h2>
            <p className="text-xs text-[var(--ink3)]">{t('templates_subtitle')}</p>
          </div>
          <button onClick={onClose} aria-label={t('close')} className="text-2xl text-[var(--ink3)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-none">×</button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-black/10 flex gap-2 flex-wrap items-center">
          <input
            className="input max-w-[200px]"
            placeholder={t('templates_search')}
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <div className="flex gap-1.5 flex-wrap">
            {tabs.map(tb => (
              <button
                key={tb.k}
                onClick={() => setFilter(tb.k)}
                className={'text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ' +
                  (filter === tb.k
                    ? 'bg-[var(--ink)] text-white border-[var(--ink)]'
                    : 'bg-white border-black/10 text-[var(--ink2)] hover:border-[var(--mint2)]')}
              >
                {tb.emoji} {tb.lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Grid grouped by category */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-[var(--ink3)] text-center py-8">{t('templates_no_results')}</p>
          ) : (
            Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} className="mb-6">
                <h3 className="text-xs font-semibold text-[var(--ink2)] uppercase tracking-widest mb-2">
                  {cat}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => onPick(tpl)}
                      className="text-left p-4 rounded-xl border border-black/10 hover:border-[var(--mint2)]
                                 hover:shadow-md transition-all cursor-pointer bg-white"
                    >
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="font-display text-sm text-[var(--ink)]">{tpl.name}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
                              style={{ background: TYPE_COLOR[tpl.type] || '#888' }}>
                          {tpl.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--ink3)] leading-snug">{tpl.description}</p>
                      <div className="text-[10px] text-[var(--ink3)] mt-2">
                        {tpl.ingredients.length} {t('templates_ingredients_count')}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
