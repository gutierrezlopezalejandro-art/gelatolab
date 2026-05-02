import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from './idbStorage';

// ── Diccionarios ────────────────────────────────────────────
import esDict from './locales/es';

// Loaded language dictionaries. Spanish is eager (default); others arrive
// asynchronously when the user switches via setLang(). Until a language is
// loaded, getTranslation() falls back to ES.
const loadedDicts = { es: esDict };

// Map of lazy loaders. Vite turns each `() => import('./locales/xx.js')`
// into its own chunk so non-default languages stay out of the main bundle.
//
// Idiomas desactivados temporalmente: ja, ko (cobertura ~33% — solo claves
// viejas, falta traducir todo el contenido nuevo de landing/Marco/guias).
// Reactivar cuando esten las traducciones completas.
const loaders = {
  es: () => Promise.resolve(esDict),
  en: () => import('./locales/en.js').then(m => m.default),
  pt: () => import('./locales/pt.js').then(m => m.default),
  fr: () => import('./locales/fr.js').then(m => m.default),
  de: () => import('./locales/de.js').then(m => m.default),
  it: () => import('./locales/it.js').then(m => m.default),
};

async function loadLanguage(code) {
  if (loadedDicts[code]) return loadedDicts[code];
  const loader = loaders[code];
  if (!loader) return null;
  try {
    const dict = await loader();
    loadedDicts[code] = dict;
    return dict;
  } catch (e) {
    console.warn('i18n: failed to load locale', code, e);
    return null;
  }
}

// Fallback: si una clave no existe en el idioma actual, usa español
function getTranslation(lang, key) {
  return loadedDicts[lang]?.[key] ?? loadedDicts.es[key] ?? key;
}

// ── Store ───────────────────────────────────────────────────
// `dictsLoaded` es un contador que se incrementa cada vez que termina de
// cargar un diccionario. Sirve para forzar el re-render de useT cuando el
// chunk async de un idioma llega DESPUES de haber cambiado `lang`. Sin
// este tick, React no se entera de que `loadedDicts` se populo y la UI
// queda en español por fallback. Solo hay que suscribirse a este valor
// desde useT para que la lectura via getTranslation se rehaga.
export const useI18nStore = create(
  persist(
    (set, get) => ({
      lang: 'es',
      dictsLoaded: 1, // arranca en 1 (es ya esta cargado)
      setLang: (lang) => {
        // Cambiamos `lang` ya para que el badge del selector y los
        // formateadores reaccionen al instante. Si el dict esta cargado, los
        // strings tambien cambian al toque; si no, al resolver loadLanguage
        // bumpeamos dictsLoaded y se hace el re-render con los strings reales.
        set({ lang });
        loadLanguage(lang).then((dict) => {
          if (!dict) return;
          // Solo bumpeamos si el lang sigue siendo el mismo (evita flicker
          // cuando el usuario clickea rapido entre idiomas).
          if (get().lang === lang) {
            set({ dictsLoaded: get().dictsLoaded + 1 });
          }
        });
      },
    }),
    {
      name: 'heladeria-lang',
      storage: createJSONStorage(() => idbStorage),
      // Solo persistimos `lang`. `dictsLoaded` es estado en memoria, no tiene
      // sentido guardarlo (los dicts arrancan vacios al abrir la app).
      partialize: (state) => ({ lang: state.lang }),
      // After rehydrating, ensure the persisted language is actually loaded —
      // otherwise the UI would render in ES until the user touches the
      // language selector. Si el lang persistido es uno que desactivamos
      // (ej. ja/ko), volvemos a es y limpiamos el flag.
      onRehydrateStorage: () => (state) => {
        if (!state?.lang) return;
        if (!loaders[state.lang]) {
          // Idioma deshabilitado — forzar a es.
          state.lang = 'es';
          return;
        }
        if (state.lang !== 'es') {
          loadLanguage(state.lang).then(() => {
            useI18nStore.setState((s) => ({ dictsLoaded: s.dictsLoaded + 1 }));
          });
        }
      },
    }
  )
);

// Hook reactivo: re-renderiza cuando cambia el idioma O cuando termina de
// cargarse un diccionario async. La suscripcion a `dictsLoaded` es el truco
// que hace que la UI se actualice cuando el chunk del idioma llega despues
// del cambio de `lang`.
export function useT() {
  const lang = useI18nStore(s => s.lang);
  // Subscripcion para forzar re-render cuando carga un dict nuevo.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _tick = useI18nStore(s => s.dictsLoaded);
  return (key, params) => {
    let text = getTranslation(lang, key);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v);
      });
    }
    return text;
  };
}

// Traducir nombre de ingrediente
export function useIngredientName() {
  const lang = useI18nStore(s => s.lang);
  return (name) => {
    if (lang === 'es') return name;
    return ingredientNames[lang]?.[name] ?? name;
  };
}

// Traducir categoria de ingrediente
const categoryNames = {
  en: { Lacteo:'Dairy', Azucar:'Sugar', Fruta:'Fruit', Chocolate:'Chocolate', Huevo:'Egg', Pasta:'Paste', Estabilizante:'Stabilizer', Otro:'Other', Liquido:'Liquid' },
  pt: { Lacteo:'Lácteos', Azucar:'Açúcar', Fruta:'Fruta', Chocolate:'Chocolate', Huevo:'Ovo', Pasta:'Pasta', Estabilizante:'Estabilizante', Otro:'Outro', Liquido:'Líquido' },
  fr: { Lacteo:'Laitier', Azucar:'Sucre', Fruta:'Fruit', Chocolate:'Chocolat', Huevo:'Oeuf', Pasta:'Pate', Estabilizante:'Stabilisant', Otro:'Autre', Liquido:'Liquide' },
  de: { Lacteo:'Milch', Azucar:'Zucker', Fruta:'Frucht', Chocolate:'Schokolade', Huevo:'Ei', Pasta:'Paste', Estabilizante:'Stabilisator', Otro:'Andere', Liquido:'Fluessig' },
  it: { Lacteo:'Latticino', Azucar:'Zucchero', Fruta:'Frutta', Chocolate:'Cioccolato', Huevo:'Uovo', Pasta:'Pasta', Estabilizante:'Stabilizzante', Otro:'Altro', Liquido:'Liquido' },
  ko: { Lacteo:'유제품', Azucar:'설탕류', Fruta:'과일', Chocolate:'초콜릿', Huevo:'달걀', Pasta:'페이스트', Estabilizante:'안정제', Otro:'기타', Liquido:'액체' },
  ja: { Lacteo:'乳製品', Azucar:'糖類', Fruta:'果物', Chocolate:'チョコレート', Huevo:'卵', Pasta:'ペースト', Estabilizante:'安定剤', Otro:'その他', Liquido:'液体' },
};

export function useCategoryName() {
  const lang = useI18nStore(s => s.lang);
  return (cat) => {
    if (lang === 'es') return cat;
    return categoryNames[lang]?.[cat] ?? cat;
  };
}

// Helper para obtener el locale actual para formateo de numeros/fechas
const LOCALE_MAP = { es:'es-CL', en:'en-US', pt:'pt-BR', fr:'fr-FR', de:'de-DE', it:'it-IT', ko:'ko-KR', ja:'ja-JP' };
export function useLocale() {
  const lang = useI18nStore(s => s.lang);
  return LOCALE_MAP[lang] || 'es-CL';
}

// Idiomas activos en el selector. ja y ko desactivados temporalmente
// (cobertura ~33%, ver loaders arriba).
export const LANGUAGES = [
  { code: 'es', label: 'ES', name: 'Espanol' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'pt', label: 'PT', name: 'Portugues' },
  { code: 'fr', label: 'FR', name: 'Francais' },
  { code: 'de', label: 'DE', name: 'Deutsch' },
  { code: 'it', label: 'IT', name: 'Italiano' },
];

// ── Nombres de ingredientes por idioma ──────────────────────
const ingredientNames = {
  en: {
    'Agua purificada': 'Purified water',
    'Leche entera natural': 'Whole natural milk',
    'Leche descremada': 'Skim milk',
    'Crema de leche 35%': 'Cream 35%',
    'Crema de leche 45%': 'Cream 45%',
    'Leche condensada': 'Condensed milk',
    'Leche en polvo entera': 'Whole milk powder',
    'Leche en polvo descremada': 'Skim milk powder',
    'Yogur natural': 'Plain yogurt',
    'Mascarpone': 'Mascarpone',
    'Queso crema': 'Cream cheese',
    'Mantequilla sin sal': 'Unsalted butter',
    'Sacarosa (azúcar blanca)': 'Sucrose (white sugar)',
    'Azucar rubia': 'Brown sugar',
    'Dextrosa (glucosa)': 'Dextrose (glucose)',
    'Fructosa': 'Fructose',
    'Eritritol': 'Erythritol',
    'Trehalosa': 'Trehalose',
    'Sorbitol': 'Sorbitol',
    'Inulina': 'Inulin',
    'Jarabe de glucosa 42DE': 'Glucose syrup 42DE',
    'Jarabe de glucosa 60DE': 'Glucose syrup 60DE',
    'Maltodextrina': 'Maltodextrin',
    'Pulpa frutilla': 'Strawberry pulp',
    'Pulpa frambuesa': 'Raspberry pulp',
    'Pulpa mango': 'Mango pulp',
    'Pulpa lúcuma': 'Lucuma pulp',
    'Pulpa maracuyá': 'Passion fruit pulp',
    'Zumo de limón': 'Lemon juice',
    'Zumo de naranja': 'Orange juice',
    'Pulpa arándano': 'Blueberry pulp',
    'Pulpa mora': 'Blackberry pulp',
    'Pulpa durazno': 'Peach pulp',
    'Pulpa piña': 'Pineapple pulp',
    'Pure de platano': 'Banana puree',
    'Cacao en polvo 22%': 'Cocoa powder 22%',
    'Chocolate bitter 70%': 'Dark chocolate 70%',
    'Chocolate blanco (32% cacao)': 'White chocolate (32% cocoa)',
    'Yema de huevo': 'Egg yolk',
    'Clara de huevo': 'Egg white',
    'Huevo entero': 'Whole egg',
    'Pasta avellana': 'Hazelnut paste',
    'Pasta de pistacho': 'Pistachio paste',
    'Pasta de maní': 'Peanut paste',
    'Pasta de almendra (100%)': 'Almond paste (100%)',
    'Pralinosa avellana 50%': 'Hazelnut praline 50%',
    'Neutro': 'Stabilizer',
    'Goma guar': 'Guar gum',
    'Goma xantana': 'Xanthan gum',
    'Vainilla (extracto liq.)': 'Vanilla extract (liquid)',
    'Miel de abeja': 'Honey',
    'Manjar (dulce de leche)': 'Dulce de leche',
    'Caramelo líquido': 'Liquid caramel',
    'Sal': 'Salt',
    'Acido citrico': 'Citric acid',
    'Crema de coco': 'Coconut cream',
    'Leche de coco': 'Coconut milk',
    'Café espresso líquido': 'Espresso coffee',
    'Whisky / Ron 40%': 'Whisky / Rum 40%',
    'Pulpa murtilla': 'Murtilla pulp',
    'Pulpa calafate': 'Calafate pulp',
    'Pulpa avellana chilena': 'Chilean hazelnut pulp',
    'Coco rallado': 'Shredded coconut',
    'Cúrcuma en polvo': 'Turmeric powder',
    'Té matcha en polvo': 'Matcha tea powder',
    'Pistacho en pasta': 'Pistachio paste (pure)',
    'Pasta de praliné': 'Praline paste',
    'Leche entera UHT': 'Whole UHT milk',
    'Crema fresca (panna fresca)': 'Fresh cream (panna fresca)',
    'Pasta de fior di latte': 'Fior di latte paste',
    'Pasta de pistacho siciliano': 'Sicilian pistachio paste',
    'Pasta de nocciola (Piemonte)': 'Nocciola paste (Piedmont)',
    'Pasta de tiramisú': 'Tiramisu paste',
    'Extracto de vainilla Madagascar': 'Madagascar vanilla extract',
    'Pasta de limón (siciliana)': 'Sicilian lemon paste',
    'Pectina cítrica': 'Citrus pectin',
  },
  pt: {
    'Agua purificada': 'Água purificada',
    'Leche entera natural': 'Leite integral natural',
    'Leche descremada': 'Leite desnatado',
    'Crema de leche 35%': 'Creme de leite 35%',
    'Crema de leche 45%': 'Creme de leite 45%',
    'Leche condensada': 'Leite condensado',
    'Leche en polvo entera': 'Leite em pó integral',
    'Leche en polvo descremada': 'Leite em pó desnatado',
    'Yogur natural': 'Iogurte natural',
    'Mascarpone': 'Mascarpone',
    'Queso crema': 'Cream cheese',
    'Mantequilla sin sal': 'Manteiga sem sal',
    'Sacarosa (azúcar blanca)': 'Sacarose (açúcar branco)',
    'Azucar rubia': 'Açúcar mascavo',
    'Dextrosa (glucosa)': 'Dextrose (glicose)',
    'Fructosa': 'Frutose',
    'Eritritol': 'Eritritol',
    'Trehalosa': 'Trealose',
    'Sorbitol': 'Sorbitol',
    'Inulina': 'Inulina',
    'Jarabe de glucosa 42DE': 'Xarope de glicose 42DE',
    'Jarabe de glucosa 60DE': 'Xarope de glicose 60DE',
    'Maltodextrina': 'Maltodextrina',
    'Pulpa frutilla': 'Polpa de morango',
    'Pulpa frambuesa': 'Polpa de framboesa',
    'Pulpa mango': 'Polpa de manga',
    'Pulpa lúcuma': 'Polpa de lúcuma',
    'Pulpa maracuyá': 'Polpa de maracujá',
    'Zumo de limón': 'Suco de limão',
    'Zumo de naranja': 'Suco de laranja',
    'Pulpa arándano': 'Polpa de mirtilo',
    'Pulpa mora': 'Polpa de amora',
    'Pulpa durazno': 'Polpa de pêssego',
    'Pulpa piña': 'Polpa de abacaxi',
    'Pure de platano': 'Purê de banana',
    'Cacao en polvo 22%': 'Cacau em pó 22%',
    'Chocolate bitter 70%': 'Chocolate amargo 70%',
    'Chocolate blanco (32% cacao)': 'Chocolate branco (32% cacau)',
    'Yema de huevo': 'Gema de ovo',
    'Clara de huevo': 'Clara de ovo',
    'Huevo entero': 'Ovo inteiro',
    'Pasta avellana': 'Pasta de avelã',
    'Pasta de pistacho': 'Pasta de pistache',
    'Pasta de maní': 'Pasta de amendoim',
    'Pasta de almendra (100%)': 'Pasta de amêndoa (100%)',
    'Pralinosa avellana 50%': 'Praliné de avelã 50%',
    'Neutro': 'Estabilizante',
    'Goma guar': 'Goma guar',
    'Goma xantana': 'Goma xantana',
    'Vainilla (extracto liq.)': 'Baunilha (extrato líq.)',
    'Miel de abeja': 'Mel de abelha',
    'Manjar (dulce de leche)': 'Doce de leite',
    'Caramelo líquido': 'Caramelo líquido',
    'Sal': 'Sal',
    'Acido citrico': 'Ácido cítrico',
    'Crema de coco': 'Creme de coco',
    'Leche de coco': 'Leite de coco',
    'Café espresso líquido': 'Café expresso líquido',
    'Whisky / Ron 40%': 'Whisky / Rum 40%',
    'Pulpa murtilla': 'Polpa de murtilla',
    'Pulpa calafate': 'Polpa de calafate',
    'Pulpa avellana chilena': 'Polpa de avelã chilena',
    'Coco rallado': 'Coco ralado',
    'Cúrcuma en polvo': 'Cúrcuma em pó',
    'Té matcha en polvo': 'Chá matcha em pó',
    'Pistacho en pasta': 'Pasta de pistache (pura)',
    'Pasta de praliné': 'Pasta de praliné',
    'Leche entera UHT': 'Leite integral UHT',
    'Crema fresca (panna fresca)': 'Creme fresco (panna fresca)',
    'Pasta de fior di latte': 'Pasta de fior di latte',
    'Pasta de pistacho siciliano': 'Pasta de pistache siciliano',
    'Pasta de nocciola (Piemonte)': 'Pasta de nocciola (Piemonte)',
    'Pasta de tiramisú': 'Pasta de tiramisu',
    'Extracto de vainilla Madagascar': 'Extrato de baunilha de Madagascar',
    'Pasta de limón (siciliana)': 'Pasta de limão (siciliano)',
    'Pectina cítrica': 'Pectina cítrica',
  },
  fr: {
    'Agua purificada': 'Eau purifiee',
    'Leche entera natural': 'Lait entier naturel',
    'Leche descremada': 'Lait ecreme',
    'Crema de leche 35%': 'Creme 35%',
    'Crema de leche 45%': 'Creme 45%',
    'Leche condensada': 'Lait concentre',
    'Leche en polvo entera': 'Lait en poudre entier',
    'Leche en polvo descremada': 'Lait en poudre ecreme',
    'Yogur natural': 'Yaourt nature',
    'Queso crema': 'Fromage frais',
    'Mantequilla sin sal': 'Beurre doux',
    'Sacarosa (azúcar blanca)': 'Saccharose (sucre blanc)',
    'Azucar rubia': 'Sucre roux',
    'Dextrosa (glucosa)': 'Dextrose (glucose)',
    'Fructosa': 'Fructose',
    'Eritritol': 'Erythritol',
    'Trehalosa': 'Trehalose',
    'Inulina': 'Inuline',
    'Pulpa frutilla': 'Pulpe de fraise',
    'Pulpa frambuesa': 'Pulpe de framboise',
    'Pulpa mango': 'Pulpe de mangue',
    'Pulpa lúcuma': 'Pulpe de lucuma',
    'Pulpa maracuyá': 'Pulpe de fruit de la passion',
    'Zumo de limón': 'Jus de citron',
    'Zumo de naranja': "Jus d'orange",
    'Pulpa arándano': 'Pulpe de myrtille',
    'Pulpa mora': 'Pulpe de mure',
    'Pulpa durazno': 'Pulpe de peche',
    'Pulpa piña': "Pulpe d'ananas",
    'Cacao en polvo 22%': 'Cacao en poudre 22%',
    'Chocolate bitter 70%': 'Chocolat noir 70%',
    'Chocolate blanco (32% cacao)': 'Chocolat blanc (32% cacao)',
    'Yema de huevo': "Jaune d'oeuf",
    'Clara de huevo': "Blanc d'oeuf",
    'Huevo entero': 'Oeuf entier',
    'Pasta avellana': 'Pate de noisette',
    'Pasta de maní': "Pate d'arachide",
    'Pasta de almendra (100%)': "Pate d'amande (100%)",
    'Neutro': 'Stabilisant',
    'Goma guar': 'Gomme de guar',
    'Goma xantana': 'Gomme xanthane',
    'Vainilla (extracto liq.)': 'Extrait de vanille (liquide)',
    'Miel de abeja': 'Miel',
    'Manjar (dulce de leche)': 'Confiture de lait',
    'Caramelo líquido': 'Caramel liquide',
    'Sal': 'Sel',
    'Crema de coco': 'Creme de coco',
    'Leche de coco': 'Lait de coco',
    'Café espresso líquido': 'Cafe espresso',
    'Pectina cítrica': 'Pectine citrique',
  },
  de: {
    'Agua purificada': 'Gereinigtes Wasser',
    'Leche entera natural': 'Naturliche Vollmilch',
    'Leche descremada': 'Magermilch',
    'Crema de leche 35%': 'Sahne 35%',
    'Crema de leche 45%': 'Sahne 45%',
    'Leche condensada': 'Kondensmilch',
    'Leche en polvo entera': 'Vollmilchpulver',
    'Leche en polvo descremada': 'Magermilchpulver',
    'Yogur natural': 'Naturjoghurt',
    'Queso crema': 'Frischkase',
    'Mantequilla sin sal': 'Ungesalzene Butter',
    'Sacarosa (azúcar blanca)': 'Saccharose (weisser Zucker)',
    'Azucar rubia': 'Brauner Zucker',
    'Dextrosa (glucosa)': 'Dextrose (Glukose)',
    'Fructosa': 'Fruktose',
    'Eritritol': 'Erythrit',
    'Trehalosa': 'Trehalose',
    'Pulpa frutilla': 'Erdbeerpulpe',
    'Pulpa frambuesa': 'Himbeerpulpe',
    'Pulpa mango': 'Mangopulpe',
    'Pulpa arándano': 'Heidelbeerpulpe',
    'Pulpa mora': 'Brombeerpulpe',
    'Pulpa durazno': 'Pfirsichpulpe',
    'Pulpa piña': 'Ananaspulpe',
    'Zumo de limón': 'Zitronensaft',
    'Zumo de naranja': 'Orangensaft',
    'Cacao en polvo 22%': 'Kakaopulver 22%',
    'Chocolate bitter 70%': 'Zartbitterschokolade 70%',
    'Chocolate blanco (32% cacao)': 'Weisse Schokolade (32% Kakao)',
    'Yema de huevo': 'Eigelb',
    'Clara de huevo': 'Eiweiss',
    'Huevo entero': 'Vollei',
    'Pasta avellana': 'Haselnusspaste',
    'Pasta de almendra (100%)': 'Mandelpaste (100%)',
    'Neutro': 'Stabilisator',
    'Goma guar': 'Guarkernmehl',
    'Goma xantana': 'Xanthan',
    'Vainilla (extracto liq.)': 'Vanilleextrakt (flussig)',
    'Miel de abeja': 'Honig',
    'Caramelo líquido': 'Flussiger Karamell',
    'Sal': 'Salz',
    'Crema de coco': 'Kokosnusscreme',
    'Leche de coco': 'Kokosmilch',
    'Café espresso líquido': 'Espresso-Kaffee',
    'Pectina cítrica': 'Zitruspektin',
  },
  it: {
    'Agua purificada': 'Acqua purificata',
    'Leche entera natural': 'Latte intero naturale',
    'Leche descremada': 'Latte scremato',
    'Crema de leche 35%': 'Panna 35%',
    'Crema de leche 45%': 'Panna 45%',
    'Leche condensada': 'Latte condensato',
    'Leche en polvo entera': 'Latte in polvere intero',
    'Leche en polvo descremada': 'Latte in polvere scremato',
    'Yogur natural': 'Yogurt naturale',
    'Queso crema': 'Formaggio cremoso',
    'Mantequilla sin sal': 'Burro senza sale',
    'Sacarosa (azúcar blanca)': 'Saccarosio (zucchero bianco)',
    'Azucar rubia': 'Zucchero di canna',
    'Dextrosa (glucosa)': 'Destrosio (glucosio)',
    'Fructosa': 'Fruttosio',
    'Eritritol': 'Eritritolo',
    'Trehalosa': 'Trealosio',
    'Inulina': 'Inulina',
    'Pulpa frutilla': 'Polpa di fragola',
    'Pulpa frambuesa': 'Polpa di lampone',
    'Pulpa mango': 'Polpa di mango',
    'Pulpa lúcuma': 'Polpa di lucuma',
    'Pulpa maracuyá': 'Polpa di frutto della passione',
    'Zumo de limón': 'Succo di limone',
    'Zumo de naranja': "Succo d'arancia",
    'Pulpa arándano': 'Polpa di mirtillo',
    'Pulpa mora': 'Polpa di mora',
    'Pulpa durazno': 'Polpa di pesca',
    'Pulpa piña': 'Polpa di ananas',
    'Pure de platano': 'Purea di banana',
    'Cacao en polvo 22%': 'Cacao in polvere 22%',
    'Chocolate bitter 70%': 'Cioccolato fondente 70%',
    'Chocolate blanco (32% cacao)': 'Cioccolato bianco (32% cacao)',
    'Yema de huevo': "Tuorlo d'uovo",
    'Clara de huevo': "Albume d'uovo",
    'Huevo entero': 'Uovo intero',
    'Pasta avellana': 'Pasta di nocciola',
    'Pasta de pistacho': 'Pasta di pistacchio',
    'Pasta de maní': 'Pasta di arachidi',
    'Pasta de almendra (100%)': 'Pasta di mandorle (100%)',
    'Neutro': 'Stabilizzante',
    'Goma guar': 'Gomma di guar',
    'Goma xantana': 'Gomma xantana',
    'Vainilla (extracto liq.)': 'Estratto di vaniglia (liquido)',
    'Miel de abeja': 'Miele',
    'Manjar (dulce de leche)': 'Dulce de leche',
    'Caramelo líquido': 'Caramello liquido',
    'Sal': 'Sale',
    'Crema de coco': 'Crema di cocco',
    'Leche de coco': 'Latte di cocco',
    'Café espresso líquido': 'Caffe espresso',
    'Pectina cítrica': 'Pectina di agrumi',
    'Crema fresca (panna fresca)': 'Panna fresca',
    'Pasta de fior di latte': 'Pasta fior di latte',
    'Pasta de pistacho siciliano': 'Pasta di pistacchio siciliano',
    'Pasta de nocciola (Piemonte)': 'Pasta di nocciola (Piemonte)',
    'Pasta de tiramisú': 'Pasta tiramisu',
    'Pasta de limón (siciliana)': 'Pasta di limone (siciliana)',
  },
  ko: {
    'Agua purificada': '정제수',
    'Leche entera natural': '전유 (천연)',
    'Leche descremada': '탈지유',
    'Crema de leche 35%': '크림 35%',
    'Crema de leche 45%': '크림 45%',
    'Leche condensada': '연유',
    'Leche en polvo entera': '전지분유',
    'Leche en polvo descremada': '탈지분유',
    'Yogur natural': '플레인 요거트',
    'Mascarpone': '마스카포네',
    'Queso crema': '크림치즈',
    'Mantequilla sin sal': '무염 버터',
    'Sacarosa (azúcar blanca)': '설탕 (백설탕)',
    'Azucar rubia': '갈색설탕',
    'Dextrosa (glucosa)': '포도당 (덱스트로스)',
    'Fructosa': '과당',
    'Eritritol': '에리스리톨',
    'Trehalosa': '트레할로스',
    'Sorbitol': '소르비톨',
    'Inulina': '이눌린',
    'Jarabe de glucosa 42DE': '물엿 42DE',
    'Jarabe de glucosa 60DE': '물엿 60DE',
    'Maltodextrina': '말토덱스트린',
    'Pulpa frutilla': '딸기 퓨레',
    'Pulpa frambuesa': '라즈베리 퓨레',
    'Pulpa mango': '망고 퓨레',
    'Pulpa lúcuma': '루쿠마 퓨레',
    'Pulpa maracuyá': '패션프루트 퓨레',
    'Zumo de limón': '레몬즙',
    'Zumo de naranja': '오렌지즙',
    'Pulpa arándano': '블루베리 퓨레',
    'Pulpa mora': '블랙베리 퓨레',
    'Pulpa durazno': '복숭아 퓨레',
    'Pulpa piña': '파인애플 퓨레',
    'Pure de platano': '바나나 퓨레',
    'Cacao en polvo 22%': '코코아 파우더 22%',
    'Chocolate bitter 70%': '다크 초콜릿 70%',
    'Chocolate blanco (32% cacao)': '화이트 초콜릿 (32% 카카오)',
    'Yema de huevo': '난황',
    'Clara de huevo': '난백',
    'Huevo entero': '전란',
    'Pasta avellana': '헤이즐넛 페이스트',
    'Pasta de pistacho': '피스타치오 페이스트',
    'Pasta de maní': '땅콩 페이스트',
    'Pasta de almendra (100%)': '아몬드 페이스트 (100%)',
    'Pralinosa avellana 50%': '헤이즐넛 프랄리네 50%',
    'Neutro': '안정제',
    'Goma guar': '구아검',
    'Goma xantana': '잔탄검',
    'Vainilla (extracto liq.)': '바닐라 추출액',
    'Miel de abeja': '꿀',
    'Manjar (dulce de leche)': '둘세 데 레체',
    'Caramelo líquido': '액상 카라멜',
    'Sal': '소금',
    'Acido citrico': '구연산',
    'Crema de coco': '코코넛 크림',
    'Leche de coco': '코코넛 밀크',
    'Café espresso líquido': '에스프레소 커피',
    'Whisky / Ron 40%': '위스키 / 럼 40%',
    'Pulpa murtilla': '무르티야 퓨레',
    'Pulpa calafate': '칼라파테 퓨레',
    'Pulpa avellana chilena': '칠레 헤이즐넛 퓨레',
    'Coco rallado': '코코넛 채',
    'Cúrcuma en polvo': '강황 파우더',
    'Té matcha en polvo': '말차 파우더',
    'Pistacho en pasta': '피스타치오 페이스트 (순수)',
    'Pasta de praliné': '프랄리네 페이스트',
    'Leche entera UHT': 'UHT 전유',
    'Crema fresca (panna fresca)': '생크림 (판나 프레스카)',
    'Pasta de fior di latte': '피오르 디 라떼 페이스트',
    'Pasta de pistacho siciliano': '시칠리아 피스타치오 페이스트',
    'Pasta de nocciola (Piemonte)': '노치올라 페이스트 (피에몬테)',
    'Pasta de tiramisú': '티라미수 페이스트',
    'Extracto de vainilla Madagascar': '마다가스카르 바닐라 추출액',
    'Pasta de limón (siciliana)': '시칠리아 레몬 페이스트',
    'Pectina cítrica': '시트러스 펙틴',
  },
  ja: {
    'Agua purificada': '精製水',
    'Leche entera natural': '全乳（ナチュラル）',
    'Leche descremada': '脱脂乳',
    'Crema de leche 35%': 'クリーム 35%',
    'Crema de leche 45%': 'クリーム 45%',
    'Leche condensada': '練乳',
    'Leche en polvo entera': '全脂粉乳',
    'Leche en polvo descremada': '脱脂粉乳',
    'Yogur natural': 'プレーンヨーグルト',
    'Mascarpone': 'マスカルポーネ',
    'Queso crema': 'クリームチーズ',
    'Mantequilla sin sal': '無塩バター',
    'Sacarosa (azúcar blanca)': 'ショ糖（白砂糖）',
    'Azucar rubia': 'きび砂糖',
    'Dextrosa (glucosa)': 'ブドウ糖（デキストロース）',
    'Fructosa': '果糖',
    'Eritritol': 'エリスリトール',
    'Trehalosa': 'トレハロース',
    'Sorbitol': 'ソルビトール',
    'Inulina': 'イヌリン',
    'Jarabe de glucosa 42DE': 'グルコースシロップ 42DE',
    'Jarabe de glucosa 60DE': 'グルコースシロップ 60DE',
    'Maltodextrina': 'マルトデキストリン',
    'Pulpa frutilla': 'いちごピューレ',
    'Pulpa frambuesa': 'ラズベリーピューレ',
    'Pulpa mango': 'マンゴーピューレ',
    'Pulpa lúcuma': 'ルクマピューレ',
    'Pulpa maracuyá': 'パッションフルーツピューレ',
    'Zumo de limón': 'レモン果汁',
    'Zumo de naranja': 'オレンジ果汁',
    'Pulpa arándano': 'ブルーベリーピューレ',
    'Pulpa mora': 'ブラックベリーピューレ',
    'Pulpa durazno': '桃ピューレ',
    'Pulpa piña': 'パイナップルピューレ',
    'Pure de platano': 'バナナピューレ',
    'Cacao en polvo 22%': 'ココアパウダー 22%',
    'Chocolate bitter 70%': 'ダークチョコレート 70%',
    'Chocolate blanco (32% cacao)': 'ホワイトチョコレート（カカオ32%）',
    'Yema de huevo': '卵黄',
    'Clara de huevo': '卵白',
    'Huevo entero': '全卵',
    'Pasta avellana': 'ヘーゼルナッツペースト',
    'Pasta de pistacho': 'ピスタチオペースト',
    'Pasta de maní': 'ピーナッツペースト',
    'Pasta de almendra (100%)': 'アーモンドペースト（100%）',
    'Pralinosa avellana 50%': 'ヘーゼルナッツプラリネ 50%',
    'Neutro': '安定剤',
    'Goma guar': 'グァーガム',
    'Goma xantana': 'キサンタンガム',
    'Vainilla (extracto liq.)': 'バニラエキス（液体）',
    'Miel de abeja': 'はちみつ',
    'Manjar (dulce de leche)': 'ドゥルセ・デ・レチェ',
    'Caramelo líquido': '液体キャラメル',
    'Sal': '食塩',
    'Acido citrico': 'クエン酸',
    'Crema de coco': 'ココナッツクリーム',
    'Leche de coco': 'ココナッツミルク',
    'Café espresso líquido': 'エスプレッソコーヒー',
    'Whisky / Ron 40%': 'ウイスキー / ラム 40%',
    'Pulpa murtilla': 'ムルティージャピューレ',
    'Pulpa calafate': 'カラファテピューレ',
    'Pulpa avellana chilena': 'チリ産ヘーゼルナッツピューレ',
    'Coco rallado': 'ココナッツフレーク',
    'Cúrcuma en polvo': 'ターメリックパウダー',
    'Té matcha en polvo': '抹茶パウダー',
    'Pistacho en pasta': 'ピスタチオペースト（純粋）',
    'Pasta de praliné': 'プラリネペースト',
    'Leche entera UHT': 'UHT全乳',
    'Crema fresca (panna fresca)': 'フレッシュクリーム（パンナ・フレスカ）',
    'Pasta de fior di latte': 'フィオル・ディ・ラッテペースト',
    'Pasta de pistacho siciliano': 'シチリア産ピスタチオペースト',
    'Pasta de nocciola (Piemonte)': 'ノッチョーラペースト（ピエモンテ）',
    'Pasta de tiramisú': 'ティラミスペースト',
    'Extracto de vainilla Madagascar': 'マダガスカルバニラエキス',
    'Pasta de limón (siciliana)': 'シチリアレモンペースト',
    'Pectina cítrica': 'シトラスペクチン',
  },
};
