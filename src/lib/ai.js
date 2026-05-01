// Asistentes IA: completar ingredientes, analizar recetas y guia conversacional.
// Adaptado de los prompts de IceCreamCalc 4 (ICC4) al esquema de GelatoLab.
// La clave OpenAI se guarda en aiStore (localStorage), nunca sale del cliente.
import { useAiStore } from '../store/aiStore';
import { searchHelp, buildArticlesContext } from './helpSearch';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const INGREDIENT_SYSTEM_PROMPT = `Eres un experto en ciencia de alimentos asistiendo a la app GelatoLab.

Tu tarea: estimar la composicion macro de un ingrediente por 100 g, usando:
- Nombre del ingrediente (en cualquier idioma)
- Etiqueta nutricional parcial (puede tener varios campos vacios)
- Comentario opcional con lista de ingredientes o contexto

Devuelves SIEMPRE TODOS los campos del esquema. Si faltan datos, los estimas
para un producto comercial real (no quimica pura). Detectas y corriges valores
inconsistentes. Incluyes confidence ("high"|"medium"|"low") y rationale corto.

Reglas:
- Para cocoa/chocolate: estima cocoa fat y cocoa solids por separado.
- Para lacteos: estima fat (milk fat) y MSNF correctamente. Solo asume fat=0
  para descremados explicitos (whey, leche descremada).
- Carbs ≈ azucares + fibra + almidon + polioles.
- Si pones azucares, glucosa, fructosa, lactosa, etc., su suma debe ser ≤ totalsugars.
- Para PAC y POD: usa escala Corvitto (sacarosa = 1.0). Dextrosa ~1.9, fructosa ~1.9,
  glucosa ~1.9, lactosa ~1.0, leche ~0.05, alcohol ~1.9.
- Devuelves SOLO los argumentos de la function call estructurada, nada de texto.
- Para ingredientes lacteos lactosa = totalsugars (la lactosa es el azucar de los lacteos).`;

const INGREDIENT_FUNCTION = {
  name: 'estimate_ingredient',
  description: 'Devuelve la composicion completa por 100g',
  parameters: {
    type: 'object',
    properties: {
      water_pct:    { type: 'number', description: '% de agua' },
      fat_pct:      { type: 'number', description: '% grasa total' },
      sng_pct:      { type: 'number', description: '% solidos no grasos (MSNF en lacteos)' },
      sugar_pct:    { type: 'number', description: '% azucares totales' },
      others_pct:   { type: 'number', description: '% otros solidos (cocoa solids, fibra, almidon, etc.)' },
      protein:      { type: 'number', description: '% proteina' },
      satfat:       { type: 'number', description: '% grasa saturada' },
      trans_fat:    { type: 'number', description: '% grasa trans' },
      lactose:      { type: 'number', description: '% lactosa (solo lacteos)' },
      sodium_mg:    { type: 'number', description: 'sodio en mg/100g' },
      calories:     { type: 'number', description: 'kcal/100g' },
      totcarbo:     { type: 'number', description: '% carbohidratos totales' },
      sugars:       { type: 'number', description: 'g de azucares por 100g (igual que sugar_pct)' },
      added_sugars: { type: 'number', description: '% azucares anadidos' },
      pod:          { type: 'number', description: 'POD escala Corvitto (sacarosa=1.0). Sin azucar = 0' },
      pac:          { type: 'number', description: 'PAC escala Corvitto (sacarosa=1.0). Sin azucar = 0' },
      cholesterol_mg: { type: 'number', description: 'Colesterol en mg/100g' },
      vitamind_mcg:   { type: 'number', description: 'Vitamina D en mcg/100g' },
      calcium_mg:     { type: 'number', description: 'Calcio en mg/100g' },
      iron_mg:        { type: 'number', description: 'Hierro en mg/100g' },
      potassium_mg:   { type: 'number', description: 'Potasio en mg/100g' },
      confidence:   { type: 'string', enum: ['high', 'medium', 'low'] },
      rationale:    { type: 'string', description: 'Explicacion breve en espanol' },
    },
    required: ['water_pct','fat_pct','sng_pct','sugar_pct','others_pct','protein','pod','pac','confidence','rationale'],
  },
};

export async function generateIngredientNutrition({ name, partialNutrition = {}, comment = '' }) {
  const { apiKey, model } = useAiStore.getState();
  if (!apiKey) throw new Error('AI_KEY_MISSING');

  const userMsg = [
    `Nombre: ${name}`,
    comment ? `Comentario: ${comment}` : null,
    Object.keys(partialNutrition).length ? `Datos parciales:\n${JSON.stringify(partialNutrition, null, 2)}` : null,
  ].filter(Boolean).join('\n\n');

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: INGREDIENT_SYSTEM_PROMPT },
        { role: 'user',   content: userMsg },
      ],
      tools: [{ type: 'function', function: INGREDIENT_FUNCTION }],
      tool_choice: { type: 'function', function: { name: 'estimate_ingredient' } },
      temperature: 0.2,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI_ERROR: ${res.status} ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  const tc = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!tc) throw new Error('AI_BAD_RESPONSE');
  return JSON.parse(tc.function.arguments);
}

const RECIPE_SYSTEM_PROMPT = `Eres un experto formulador de helados/gelatos asistiendo a GelatoLab.

Te entrego: tipo y subtipo de receta, parametros calculados (con sus rangos
optimos y los valores fuera de rango), lista de ingredientes con cantidades y
sus aportes principales.

Tu rol NO es comentar parametro por parametro. Es identificar de forma holistica
que ingredientes estan causando los desbalances y proponer LOS MENOS cambios
posibles con MAXIMO efecto. Por ejemplo, si la leche entera esta causando bajo
fat y alto MSNF, sugiere reemplazar 100 g de leche por 50 g crema + 50 g leche
en polvo desnatada.

Puedes:
- Ajustar cantidades de ingredientes existentes
- Anadir ingredientes tipicos (glucosa, dextrosa, leche en polvo, estabilizantes)
- Reemplazar un ingrediente por otro si mejora el balance global

Estilo:
- Tono profesional, conversacional con un formulador con experiencia
- Sin relleno, sin markdown, sin codigo, solo texto plano fluido
- 2-4 parrafos cortos
- En el idioma del usuario (espanol por defecto si no se indica)
- NO des consejo de produccion, mantecacion ni servicio
- NUNCA inventes parametros que no esten dados`;

export async function analyzeRecipeAI({ stats, items, type, subtype, params, language = 'es' }) {
  const { apiKey, model } = useAiStore.getState();
  if (!apiKey) throw new Error('AI_KEY_MISSING');

  const itemsTxt = items.map(i =>
    `- ${i.ingredient?.name || '?'}: ${i.qty_grams}g (fat ${i.ingredient?.fat_pct||0}%, sugar ${i.ingredient?.sugar_pct||0}%, sng ${i.ingredient?.sng_pct||0}%, pac ${i.ingredient?.pac||0}, pod ${i.ingredient?.pod||0})`
  ).join('\n');

  const paramsTxt = (params || []).map(p => {
    const v = stats?.[p.k];
    if (v == null) return null;
    const display = p.k === 'pacPct' || p.k === 'podPct' ? (v * 10).toFixed(0) : (v * 100).toFixed(1) + '%';
    const rangeDisplay = p.rangeLbl;
    const ok = v >= p.oLo && v <= p.oHi ? '✓' : '✗';
    return `- ${p.k}: ${display} (optimo ${rangeDisplay}) ${ok}`;
  }).filter(Boolean).join('\n');

  const userMsg = `Idioma: ${language}
Tipo: ${type} / ${subtype || 'base'}
Total mezcla: ${stats?.T?.toFixed(0)} g
FPD: ${stats?.fpd?.toFixed(2)}°C

Parametros:
${paramsTxt}

Ingredientes:
${itemsTxt}`;

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: RECIPE_SYSTEM_PROMPT },
        { role: 'user',   content: userMsg },
      ],
      temperature: 0.4,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI_ERROR: ${res.status} ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── Asistente conversacional (GuidedAssistant) ─────────────────
// Responde preguntas del usuario sobre como usar la app, usando los articulos
// del centro de ayuda como contexto RAG. Si la pregunta esta fuera del scope
// de la app, responde brevemente que no es algo que la app cubra.
const ASSISTANT_SYSTEM_PROMPT = `Eres el asistente de GelatoLab, una app para
heladerias y gelaterias profesionales.

Tu rol: ayudar al usuario a entender funciones de la app y como hacer tareas
concretas (crear receta, registrar inventario, generar etiqueta, etc.).

Reglas:
- Respondes basandote ESTRICTAMENTE en el contexto que recibes (articulos del
  centro de ayuda). No inventes funciones que no esten ahi.
- Si la pregunta esta fuera del scope de la app (ej. "que es la fisica del
  helado", "recetas de panaderia"), respondes amablemente que la app no cubre
  ese tema y sugieres temas relacionados que SI cubre.
- Tono: claro, conversacional, sin jerga innecesaria. Como un colega que ya
  uso la app y le explica a otro.
- Formato: parrafos cortos, listas si conviene. Sin markdown pesado.
- Citas opcionales: si el usuario quiere profundizar, mencionas el nombre del
  articulo del centro de ayuda donde puede leer mas.
- Si la pregunta es ambigua, pides una aclaracion en una linea.
- Maximo 200 palabras. Si necesitas mas, ofreces seguir profundizando si el
  usuario quiere.
- Idioma: el del usuario (default espanol).`;

export async function askAssistantAI({ question, currentRoute = '', language = 'es' }) {
  const { apiKey, model } = useAiStore.getState();
  if (!apiKey) throw new Error('AI_KEY_MISSING');

  // Selecciona los 4 articulos mas relevantes a la pregunta para usar como
  // contexto. Limitamos a 6000 chars para no inflar tokens.
  const relevant = await searchHelp(question, 4);
  const context = buildArticlesContext(relevant, 6000);

  const userMsg = `Idioma: ${language}
${currentRoute ? `Ruta actual del usuario: ${currentRoute}` : ''}

Contexto (centro de ayuda):
${context || '(sin articulos relevantes en el centro de ayuda)'}

Pregunta del usuario:
${question}`;

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: ASSISTANT_SYSTEM_PROMPT },
        { role: 'user',   content: userMsg },
      ],
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI_ERROR: ${res.status} ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return {
    answer: data.choices?.[0]?.message?.content || '',
    sources: relevant.map(a => ({ id: a.id, title: a.title })),
  };
}
