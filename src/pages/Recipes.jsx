import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipeStore } from '../store/recipeStore';
import { useIngredientStore } from '../store/ingredientStore';
import { useAppStore } from '../store/appStore';
import RecipeCard from '../components/RecipeCard';
import { TemplateModal } from '../components/TemplateModal';
import { RecipeWizard } from '../components/RecipeWizard';
import { NewRecipeMenu } from '../components/NewRecipeMenu';
import { RecipeComparisonModal } from '../components/RecipeComparisonModal';
import { EmptyState } from '../components/ui/index.jsx';
import { useT } from '../lib/i18n';
import { track } from '../lib/analytics';
import { printRecipesReport } from '../lib/recipeReport';
import { useBusinessStore } from '../store/businessStore';

const TYPE_TAB_KEYS = [
  { k: 'todos',   i18nKey: 'all',       emoji: '🍨' },
  { k: 'helado',  i18nKey: 'ice_cream', emoji: '🍦' },
  { k: 'gelato',  i18nKey: 'gelato',    emoji: '🇮🇹' },
  { k: 'sorbete', i18nKey: 'sorbet',    emoji: '🍋' },
];

export default function Recipes() {
  const t           = useT();
  const navigate    = useNavigate();
  const { showToast, confirm } = useAppStore();
  const recipes     = useRecipeStore(s => s.recipes);
  const create      = useRecipeStore(s => s.create);
  const duplicate   = useRecipeStore(s => s.duplicate);
  const remove      = useRecipeStore(s => s.remove);
  const ingredients = useIngredientStore(s => s.ingredients);

  const [filter, setFilter]         = useState('todos');
  const [q, setQ]                   = useState('');
  const [activeTags, setActiveTags] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const businessName = useBusinessStore(s => s.fantasy_name);
  function toggleSelect(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function clearSelection() { setSelectedIds([]); }
  function handleGenerateReport() {
    const chosen = recipes.filter(r => selectedIds.includes(r.id));
    if (chosen.length === 0) return;
    printRecipesReport(chosen, ingredients, businessName, t);
    track('report_generated', { count: chosen.length });
  }
  // Tags presentes en al menos una receta. Ordenados por frecuencia.
  const allTags = (() => {
    const counts = new Map();
    (recipes || []).forEach(r => (r.tags || []).forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1)));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  })();
  function toggleTag(tag) {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }
  const [showTemplates, setShowTpl] = useState(false);
  const [showWizard,    setShowWizard] = useState(false);
  const [showNewMenu,   setShowNewMenu] = useState(false);
  const [showCompare,   setShowCompare] = useState(false);

  function handlePickTemplate(tpl) {
    // Strip template-only fields and let the store assign a new id + dates.
    const { id: _ignore, category: _c, description: _d, ...payload } = tpl;
    const created = create(payload);
    setShowTpl(false);
    track('template_used', { template: tpl.id });
    showToast(t('template_created', { name: tpl.name }));
    if (created?.id) navigate(`/recipes/${created.id}`);
  }

  async function handleDelete(id) {
    const recipe = recipes.find(r => r.id === id);
    const ok = await confirm(t('confirm_delete', { name: recipe?.name }));
    if (ok) {
      remove(id);
      showToast(t('recipe_deleted'));
    }
  }

  function handleDuplicate(id) {
    const dup = duplicate(id);
    if (dup) showToast(t('recipe_duplicated'));
  }

  // Filtrado local
  const filtered = recipes.filter(r => {
    const matchType = filter === 'todos' || r.type === filter;
    const matchQ    = !q || r.name.toLowerCase().includes(q.toLowerCase());
    const matchTags = activeTags.length === 0
      || activeTags.every(tag => Array.isArray(r.tags) && r.tags.includes(tag));
    return matchType && matchQ && matchTags;
  });

  const counts = TYPE_TAB_KEYS.reduce((acc, tab) => {
    acc[tab.k] = tab.k === 'todos' ? recipes.length : recipes.filter(r => r.type === tab.k).length;
    return acc;
  }, {});

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-4xl text-[var(--ink)]">{t('recipes')}</h1>
          <p className="text-sm text-[var(--ink2)] mt-1">{t('click_to_edit')}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            className="input max-w-[200px]"
            placeholder={t('search_recipes')}
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <button data-tour="recipe-new-btn"
                  className="btn-primary inline-flex items-center gap-1.5"
                  onClick={() => setShowNewMenu(true)}>
            <span className="text-base leading-none">＋</span> {t('new_recipe')}
          </button>
        </div>
      </div>

      {/* Template picker */}
      {showTemplates && (
        <TemplateModal
          onPick={handlePickTemplate}
          onClose={() => setShowTpl(false)}
        />
      )}

      {/* Step-by-step wizard */}
      {showWizard && <RecipeWizard onClose={() => setShowWizard(false)} />}

      {/* New recipe menu (3 options) */}
      {showNewMenu && (
        <NewRecipeMenu
          onScratch={() => navigate('/recipes/new')}
          onTemplate={() => setShowTpl(true)}
          onWizard={() => setShowWizard(true)}
          onClose={() => setShowNewMenu(false)}
        />
      )}

      {/* Filtro por tags (si hay alguno) */}
      {allTags.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-[var(--ink3)] uppercase tracking-wider">🏷 {t('tags_filter_label')}</span>
          {allTags.map(tag => {
            const active = activeTags.includes(tag);
            return (
              <button key={tag} type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer
                        ${active ? 'bg-[var(--mint)] text-white border-[var(--mint)]' : 'bg-white text-[var(--ink2)] border-black/10 hover:border-[var(--mint2)]'}`}>
                #{tag}
              </button>
            );
          })}
          {activeTags.length > 0 && (
            <button type="button"
                    onClick={() => setActiveTags([])}
                    className="text-[11px] text-[var(--coral)] hover:underline cursor-pointer bg-transparent border-none">
              {t('tags_filter_clear')}
            </button>
          )}
        </div>
      )}

      {/* Tabs tipo */}
      <div className="flex gap-2 flex-wrap mb-6">
        {TYPE_TAB_KEYS.map(tab => (
          <button
            key={tab.k}
            onClick={() => setFilter(tab.k)}
            className={`flex items-center gap-2 px-4 py-2 rounded-3xl text-sm font-medium
                        border transition-all duration-200
                        ${filter === tab.k
                          ? 'bg-[var(--ink)] text-white border-[var(--ink)]'
                          : 'bg-white border-black/10 text-[var(--ink2)] hover:border-[var(--mint2)]'
                        }`}
          >
            <span>{tab.emoji} {t(tab.i18nKey)}</span>
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full
                              ${filter === tab.k ? 'bg-white/20' : 'bg-[var(--cream2)] text-[var(--ink3)]'}`}>
              {counts[tab.k]}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title={t('no_recipes_yet')}
          description={q ? t('no_search_results') : t('create_first_recipe')}
          action={!q && (
            <button className="btn-primary" onClick={() => navigate('/recipes/new')}>
              + {t('create_first_recipe')}
            </button>
          )}
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
          {filtered.map(r => (
            <RecipeCard
              key={r.id}
              recipe={r}
              ingredients={ingredients}
              selected={selectedIds.includes(r.id)}
              onToggleSelect={() => toggleSelect(r.id)}
              onEdit={id => navigate(`/recipes/${id}`)}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Action bar flotante para generar reporte / comparar varias recetas */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[var(--ink)] text-white rounded-full shadow-2xl px-5 py-3 flex items-center gap-3 max-w-[90vw]">
          <span className="text-sm font-semibold">{t('report_selected', { n: selectedIds.length })}</span>
          <button
            type="button"
            onClick={handleGenerateReport}
            className="text-xs font-bold px-4 py-1.5 rounded-full bg-white text-[var(--ink)] hover:bg-[var(--cream)] cursor-pointer border-none transition-colors"
          >
            📄 {t('report_generate')}
          </button>
          <button
            data-tour="compare-btn"
            type="button"
            onClick={() => { setShowCompare(true); track('recipes_compared', { count: selectedIds.length }); }}
            disabled={selectedIds.length < 2}
            className="text-xs font-bold px-4 py-1.5 rounded-full bg-[#e8b920] text-[var(--ink)] hover:opacity-90 cursor-pointer border-none transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            title={selectedIds.length < 2 ? t('compare_need_two') : t('compare_btn_tooltip')}
          >
            ⚖️ {t('compare_btn')}
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="text-white/70 hover:text-white cursor-pointer bg-transparent border-none px-1 text-base"
            aria-label={t('report_clear')}
          >×</button>
        </div>
      )}

      {showCompare && selectedIds.length >= 2 && (
        <RecipeComparisonModal
          recipes={recipes.filter(r => selectedIds.includes(r.id))}
          ingredients={ingredients}
          allRecipes={recipes}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  );
}
