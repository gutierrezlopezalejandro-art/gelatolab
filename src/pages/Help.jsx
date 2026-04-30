import { useState, useMemo } from 'react';
import { HELP_CATEGORIES, HELP_ARTICLES } from '../data/helpContent';
import { useT } from '../lib/i18n';

/**
 * Help center: searchable knowledge base with categories on the left and
 * the chosen article on the right. Content lives in src/data/helpContent.js
 * so it's easy to update without touching this component.
 */
export default function Help() {
  const t = useT();
  const [activeId, setActiveId] = useState(HELP_ARTICLES[0]?.id);
  const [query, setQuery] = useState('');

  // Filter articles by free-text query against title, intro, and section bodies.
  const matchedIds = useMemo(() => {
    if (!query.trim()) return new Set(HELP_ARTICLES.map(a => a.id));
    const q = query.trim().toLowerCase();
    const ids = new Set();
    for (const a of HELP_ARTICLES) {
      const haystack = [
        a.title, a.intro || '',
        ...(a.sections || []).flatMap(s => [s.h || '', s.p || '', ...(s.bullets || [])]),
        ...(a.tips || []),
      ].join(' ').toLowerCase();
      if (haystack.includes(q)) ids.add(a.id);
    }
    return ids;
  }, [query]);

  const articlesByCategory = useMemo(() => {
    const m = {};
    HELP_ARTICLES.forEach(a => {
      if (!matchedIds.has(a.id)) return;
      if (!m[a.category]) m[a.category] = [];
      m[a.category].push(a);
    });
    return m;
  }, [matchedIds]);

  const active = HELP_ARTICLES.find(a => a.id === activeId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-[var(--ink)]">{t('help_title')}</h1>
        <p className="text-sm text-[var(--ink2)] mt-1">{t('help_subtitle')}</p>
      </div>

      <input
        type="search"
        className="input mb-5"
        placeholder={t('help_search_placeholder')}
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        {/* TOC sidebar */}
        <aside className="space-y-4">
          {HELP_CATEGORIES.map(cat => {
            const items = articlesByCategory[cat.id] || [];
            if (items.length === 0) return null;
            return (
              <div key={cat.id}>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink3)] mb-1.5 flex items-center gap-1.5">
                  <span aria-hidden="true">{cat.icon}</span>
                  <span>{cat.title}</span>
                </h3>
                <ul className="space-y-0.5">
                  {items.map(a => (
                    <li key={a.id}>
                      <button
                        onClick={() => setActiveId(a.id)}
                        className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer
                                    border-none bg-transparent
                                    ${activeId === a.id
                                      ? 'bg-[var(--mint3)] text-[var(--mint)] font-semibold'
                                      : 'text-[var(--ink2)] hover:bg-[var(--cream2)]'}`}
                      >
                        {a.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {Object.keys(articlesByCategory).length === 0 && (
            <p className="text-xs text-[var(--ink3)] italic">{t('help_no_results')}</p>
          )}
        </aside>

        {/* Article content */}
        <article className="card p-6 md:p-8 max-w-3xl">
          {active && matchedIds.has(active.id) ? (
            <ArticleView article={active} />
          ) : (
            <p className="text-sm text-[var(--ink3)] py-12 text-center">{t('help_select_article')}</p>
          )}
        </article>
      </div>
    </div>
  );
}

// Render an article's structured content with inline markdown-lite (bold).
function ArticleView({ article }) {
  return (
    <div>
      <h2 className="font-display text-2xl text-[var(--ink)] mb-2">{article.title}</h2>
      {article.intro && (
        <p className="text-[var(--ink2)] text-base leading-relaxed mb-6 italic border-l-4 border-[var(--mint2)] pl-4">
          {article.intro}
        </p>
      )}

      {article.sections?.map((s, i) => (
        <section key={i} className="mb-6">
          {s.h && <h3 className="font-display text-lg text-[var(--ink)] mb-2">{s.h}</h3>}
          {s.p && <p className="text-sm text-[var(--ink2)] leading-relaxed mb-2"><Inline text={s.p} /></p>}
          {s.bullets && (
            <ul className="list-disc pl-6 space-y-1 text-sm text-[var(--ink2)] leading-relaxed">
              {s.bullets.map((b, j) => <li key={j}><Inline text={b} /></li>)}
            </ul>
          )}
        </section>
      ))}

      {article.tips && article.tips.length > 0 && (
        <aside className="mt-8 rounded-lg border-l-4 border-[var(--gold)] bg-[var(--gold2)]/40 p-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-[#5c3d00] mb-2">💡 Tips</h4>
          <ul className="text-sm text-[#3d2800] space-y-1.5">
            {article.tips.map((tip, i) => <li key={i}>• <Inline text={tip} /></li>)}
          </ul>
        </aside>
      )}
    </div>
  );
}

// Tiny inline renderer for **bold** markdown without pulling in a parser.
function Inline({ text }) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i} className="text-[var(--ink)] font-semibold">{p.slice(2, -2)}</strong>;
    }
    return <span key={i}>{p}</span>;
  });
}
