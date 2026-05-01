// Busqueda en el centro de ayuda. No usamos embeddings ni dependencia externa
// — un scoring simple por matches de palabras es suficiente para ~30 articulos.
//
// helpContent.js es ~80 KB (1500+ lineas de texto). Lo cargamos lazy para no
// inflar el bundle principal — solo cuando el usuario abre el asistente.

let cachedArticles = null;
let cachedCategories = null;

async function loadHelpContent() {
  if (cachedArticles) return { articles: cachedArticles, categories: cachedCategories };
  const mod = await import('../data/helpContent');
  cachedArticles = mod.HELP_ARTICLES;
  cachedCategories = mod.HELP_CATEGORIES;
  return { articles: cachedArticles, categories: cachedCategories };
}

// Quita acentos, baja a minusculas, colapsa espacios. Asi una busqueda
// "balance" matchea "Balance", "Balanceo automatico" y "balanceá".
function normalize(s) {
  if (!s) return '';
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Indexa cada articulo a un blob de texto buscable. Cacheado modulo-level.
let searchIndex = null;
function buildIndex(articles) {
  if (searchIndex) return searchIndex;
  searchIndex = articles.map(a => {
    const sections = (a.sections || []).map(s => {
      const parts = [s.h || '', s.p || '', (s.bullets || []).join(' ')];
      return parts.join(' ');
    }).join(' ');
    const tips = (a.tips || []).join(' ');
    return {
      article: a,
      title_n: normalize(a.title),
      intro_n: normalize(a.intro),
      sections_n: normalize(sections),
      tips_n: normalize(tips),
    };
  });
  return searchIndex;
}

/**
 * Busca articulos relevantes a una query. Devuelve array ordenado por score
 * descendente (max maxResults). Async — la primera llamada carga helpContent.
 */
export async function searchHelp(query, maxResults = 8) {
  const q = normalize(query);
  if (!q || q.length < 2) return [];
  const tokens = q.split(' ').filter(t => t.length >= 2);
  if (tokens.length === 0) return [];

  const { articles } = await loadHelpContent();
  const idx = buildIndex(articles);
  const scored = idx.map(entry => {
    let score = 0;
    for (const tok of tokens) {
      if (entry.title_n.includes(tok)) score += 5;
      if (entry.intro_n.includes(tok)) score += 2;
      if (entry.sections_n.includes(tok)) score += 1;
      if (entry.tips_n.includes(tok)) score += 1;
    }
    if (entry.title_n.includes(q)) score += 5;
    return { article: entry.article, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(s => s.article);
}

/**
 * Devuelve articulos sugeridos para la ruta actual del usuario. Usa la
 * categoria de cada articulo para emparejar con el path. Async como searchHelp.
 */
const ROUTE_CATEGORY_MAP = {
  '/dashboard':    ['getting-started'],
  '/recipes':      ['recipes', 'ai'],
  '/recipes/new':  ['recipes', 'ai'],
  '/plan':         ['production', 'recipes'],
  '/production':   ['production', 'labeling'],
  '/ingredients':  ['ingredients', 'inventory'],
  '/haccp':        ['production'],
  '/help':         ['getting-started'],
};

export async function suggestForRoute(pathname, maxResults = 5) {
  let categories = ROUTE_CATEGORY_MAP[pathname];
  if (!categories) {
    const prefix = Object.keys(ROUTE_CATEGORY_MAP).find(p => p !== '/' && pathname.startsWith(p));
    categories = prefix ? ROUTE_CATEGORY_MAP[prefix] : ['getting-started'];
  }
  const { articles } = await loadHelpContent();
  return articles.filter(a => categories.includes(a.category)).slice(0, maxResults);
}

/**
 * Construye un texto plano con los articulos seleccionados, listo para
 * enviar como contexto a un LLM. Limita el largo total para no explotar
 * tokens — solo titulo + intro + bullets clave de cada uno.
 */
export function buildArticlesContext(articles, maxChars = 6000) {
  const parts = [];
  let total = 0;
  for (const a of articles) {
    const sections = (a.sections || []).map(s => {
      const bullets = (s.bullets || []).map(b => `- ${b}`).join('\n');
      return [s.h ? `## ${s.h}` : '', s.p, bullets].filter(Boolean).join('\n');
    }).join('\n\n');
    const tips = (a.tips || []).map(t => `- ${t}`).join('\n');
    const block = [
      `# ${a.title}`,
      a.intro,
      sections,
      tips ? `### Tips\n${tips}` : '',
    ].filter(Boolean).join('\n\n');
    if (total + block.length > maxChars) break;
    parts.push(block);
    total += block.length;
  }
  return parts.join('\n\n---\n\n');
}
