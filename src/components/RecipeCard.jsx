import { calcStats, overallVerdict } from '../lib/icecreamCalc';
import { useT } from '../lib/i18n';

const TYPE_CFG = {
  helado:  { lbl: 'Helado',  color: '#1a5c3a' },
  gelato:  { lbl: 'Gelato',  color: '#6a1b9a' },
  sorbete: { lbl: 'Sorbete', color: '#0d5c6e' },
};

const COMP_COLORS = ['#3b8fd4','#f5c842','#e07b39','#1a5c3a','#bdbdbd'];

export default function RecipeCard({ recipe, ingredients, onEdit, onDuplicate, onDelete, selected = false, onToggleSelect }) {
  const t = useT();
  const typeLbl = { helado: t('ice_cream'), gelato: t('gelato'), sorbete: t('sorbet') };
  const tc = TYPE_CFG[recipe.type] || TYPE_CFG.helado;

  // Enrich recipe ingredients with full ingredient data from the ingredients array
  const items = (recipe.ingredients || []).map(ri => {
    const ing = (ingredients || []).find(i => i.id === ri.ingredient_id);
    return { qty_grams: ri.qty_grams, ingredient: ing || {} };
  });

  const s = items.length ? calcStats(items) : null;
  const verdict = s ? overallVerdict(s, recipe.type, recipe.subtype || 'base') : null;

  const ingCount = (recipe.ingredients || []).length;

  const compBars = s && s.T > 0 ? [
    s.agua / s.T, s.grasa / s.T, s.azucar / s.T, s.sng / s.T, s.otros / s.T,
  ] : [];

  // El card entero abre la receta. Para teclado/lector de pantalla:
  // role+tabIndex+onKeyDown lo hacen activable con Enter/Espacio. Los botones
  // internos (checkbox, edit, duplicate, delete) hacen stopPropagation así que
  // no se dispara el onClick del card cuando el usuario interactúa con ellos.
  const handleCardKey = (e) => {
    if (e.target !== e.currentTarget) return; // ignora eventos burbujeados
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onEdit(recipe.id);
    }
  };
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={recipe.name || t('untitled_recipe')}
      className={`bg-white rounded-xl border cursor-pointer
                 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg
                 focus-visible:outline-2 focus-visible:outline-[var(--mint)] focus-visible:outline-offset-2
                 flex flex-col overflow-hidden group relative
                 ${selected ? 'border-[var(--mint)] ring-2 ring-[var(--mint3)]' : 'border-black/10 hover:border-[var(--mint2)]'}`}
      onClick={() => onEdit(recipe.id)}
      onKeyDown={handleCardKey}
    >
      {/* Checkbox para seleccion multiple (visible al hover o cuando esta seleccionada) */}
      {onToggleSelect && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
          className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs cursor-pointer transition-all
            ${selected
              ? 'bg-[var(--mint)] border-[var(--mint)] text-white opacity-100'
              : 'bg-white/80 border-black/20 text-transparent opacity-0 group-hover:opacity-100 hover:border-[var(--mint)]'}`}
          title={selected ? 'Quitar de selección' : 'Seleccionar para reporte'}
          aria-pressed={selected}
        >
          ✓
        </button>
      )}
      {/* Color bar */}
      <div className="h-1.5 w-full" style={{ background: tc.color }} />

      <div className="p-4 flex flex-col flex-1">
        {/* Badges */}
        <div className="flex gap-1 mb-3">
          <span className="inline-block text-[10px] font-bold uppercase tracking-wider
                           text-white rounded px-2 py-0.5"
                style={{ background: tc.color }}>
            {typeLbl[recipe.type] || tc.lbl}
          </span>
          {recipe.is_sub_recipe && (
            <span className="inline-block text-[10px] font-bold tracking-wider
                             rounded px-2 py-0.5 bg-[#f3e5f5] text-[#6a1b9a]"
                  title={t('is_sub_recipe_label')}>
              📋 {t('sub_recipe_badge')}
            </span>
          )}
        </div>

        <h3 className="font-display text-base text-[var(--ink)] leading-snug mb-1">
          {recipe.name || t('untitled_recipe')}
        </h3>

        <p className="text-[11px] text-[var(--ink3)] mb-3">
          {ingCount} {t('ingredients_count')}{s ? ` · ${Math.round(s.T)}g` : ''}
        </p>

        {/* Composition bar */}
        {compBars.length > 0 && (
          <div className="flex h-1 rounded overflow-hidden gap-px mb-3">
            {compBars.map((v, i) => (
              <div key={i} style={{ flex: v, background: COMP_COLORS[i] }} />
            ))}
          </div>
        )}

        {/* Tech chips */}
        {s && (
          <div className="flex flex-wrap gap-1 mb-3">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full
                             bg-[var(--mint3)] text-[#0d3d22]">
              {t('total_fat')} {(s.pGrasa * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full
                             bg-[var(--gold2)] text-[#5c3d00]">
              {t('total_sugar')} {(s.pAzucar * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full
                             bg-[var(--teal2)] text-[#073a47]">
              FPD {s.fpd.toFixed(2)}°C
            </span>
            {verdict === 'bad' && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full
                               bg-[var(--coral2)] text-[var(--coral)]">
                {t('adjustment')}
              </span>
            )}
          </div>
        )}

        {/* Tags */}
        {Array.isArray(recipe.tags) && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {recipe.tags.slice(0, 4).map(tag => (
              <span key={tag} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[var(--mint3)] text-[var(--mint)]">
                #{tag}
              </span>
            ))}
            {recipe.tags.length > 4 && (
              <span className="text-[9px] text-[var(--ink3)]">+{recipe.tags.length - 4}</span>
            )}
          </div>
        )}

        {/* Actions - visible on hover (desktop) y siempre en mobile/tablet
            donde no hay hover real. También al hacer focus-within con teclado.
            Antes solo mostraban en hover, lo que dejaba inalcanzables las
            acciones para usuarios touch y teclado. */}
        <div className="flex gap-2 mt-auto pt-3 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 max-md:opacity-100 transition-opacity">
          <button
            className="btn-secondary text-xs py-1 px-3"
            onClick={e => { e.stopPropagation(); onEdit(recipe.id); }}
          >{t('edit')}</button>
          <button
            className="btn-secondary text-xs py-1 px-3"
            onClick={e => { e.stopPropagation(); onDuplicate(recipe.id); }}
          >{t('duplicate')}</button>
          <button
            className="btn-danger text-xs py-1 px-3 ml-auto"
            onClick={e => { e.stopPropagation(); onDelete(recipe.id); }}
          >{t('delete')}</button>
        </div>
      </div>
    </div>
  );
}
