import { useState } from 'react';
import { useT } from '../lib/i18n';

/**
 * Input compacto de tags. Cada tag es un string libre normalizado a minusculas
 * y sin espacios extra. El usuario los crea escribiendo y presionando Enter
 * o coma; se quitan con la X de cada chip.
 *
 * Sugerencias: pasa `suggestions` con los tags ya usados en otras recetas
 * para autocomplete.
 */
function normalize(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, '-');
}

export function TagInput({ tags = [], suggestions = [], onChange }) {
  const t = useT();
  const [draft, setDraft] = useState('');

  function add(value) {
    const v = normalize(value);
    if (!v) return;
    if (tags.includes(v)) { setDraft(''); return; }
    onChange([...tags, v]);
    setDraft('');
  }

  function remove(tag) {
    onChange(tags.filter(t => t !== tag));
  }

  function onKey(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      remove(tags[tags.length - 1]);
    }
  }

  const filteredSuggestions = suggestions
    .filter(s => !tags.includes(s) && (!draft || s.includes(normalize(draft))))
    .slice(0, 6);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 border border-black/10 rounded-lg px-2 py-1.5 bg-white focus-within:border-[var(--mint2)] transition-colors">
        {tags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--mint3)] text-[var(--mint)]">
            #{tag}
            <button type="button" onClick={() => remove(tag)}
                    className="text-[var(--mint)] hover:text-[var(--coral)] cursor-pointer bg-transparent border-none px-0.5 leading-none"
                    aria-label={t('tag_remove')}>×</button>
          </span>
        ))}
        <input
          type="text"
          className="flex-1 min-w-[80px] text-xs outline-none border-none bg-transparent"
          placeholder={tags.length === 0 ? t('tag_placeholder') : ''}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => draft.trim() && add(draft)}
        />
      </div>
      {filteredSuggestions.length > 0 && draft && (
        <div className="flex flex-wrap gap-1 mt-1">
          {filteredSuggestions.map(s => (
            <button key={s} type="button"
                    onClick={() => add(s)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--cream2)] text-[var(--ink2)] hover:bg-[var(--mint3)] hover:text-[var(--mint)] cursor-pointer border-none transition-colors">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
