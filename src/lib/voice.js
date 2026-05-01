/**
 * Wrapper sobre Web Speech API para que Marco pueda hablar. Caracteristicas:
 *
 * - Opt-in: se activa con `setVoiceEnabled(true)` y persiste en localStorage.
 *   Por default esta apagado para no sorprender al usuario.
 * - Selecciona la mejor voz disponible para un idioma. Soporta es/en/pt
 *   y tambien italiano para frases especificas como "Buongiorno!".
 * - Cancela la utterance previa si llega una nueva (no se solapan).
 * - Notifica callbacks cuando empieza/termina de hablar para que el UI
 *   pueda mostrar feedback (ej. cambiar el icono del boton 🔊 a ⏸️).
 */

const VOICE_KEY = 'gelatolab-voice-enabled';

export function isVoiceSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function isVoiceEnabled() {
  try { return localStorage.getItem(VOICE_KEY) === '1'; } catch { return false; }
}

export function setVoiceEnabled(enabled) {
  try {
    if (enabled) localStorage.setItem(VOICE_KEY, '1');
    else localStorage.removeItem(VOICE_KEY);
  } catch { /* tolerable */ }
}

// Cache de las voces. Algunos navegadores (Chrome) las cargan async despues
// del primer getVoices(). Por eso escuchamos voiceschanged.
let voicesCache = [];
let initialized = false;

export function ensureVoicesLoaded() {
  if (!isVoiceSupported() || initialized) return;
  initialized = true;
  voicesCache = window.speechSynthesis.getVoices();
  if (typeof window.speechSynthesis.addEventListener === 'function') {
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      voicesCache = window.speechSynthesis.getVoices();
    });
  }
}

// Heuristica para inferir genero por el nombre de la voz. La Web Speech API
// no expone genero, asi que matcheamos contra una lista curada de nombres
// comunes. Funciona bien en macOS, Windows e iOS donde las voces tienen
// nombres tipo "Diego", "Jorge", "Pablo" (M) o "Helena", "Monica" (F).
const MALE_NAME_KEYWORDS = [
  // Spanish
  'diego', 'jorge', 'juan', 'carlos', 'pablo', 'enrique', 'miguel',
  'antonio', 'rafael', 'jose', 'manuel', 'francisco',
  // Italian
  'cosimo', 'luca', 'marco', 'paolo', 'rocco', 'giovanni', 'matteo',
  // English / generic
  'alex', 'daniel', 'thomas', 'fred', 'reed', 'ralph', 'eddy', 'oliver',
  'tom', 'james', 'george', 'aaron', 'arthur', 'ricky', 'rishi', 'gordon',
  // Portuguese
  'felipe', 'ricardo', 'henrique',
  // Generic markers
  'male', 'masculino', ' man ', '(m)',
];
const FEMALE_NAME_KEYWORDS = [
  'marisol', 'helena', 'elsa', 'monica', 'paulina', 'mercedes', 'maria',
  'lucia', 'sabina', 'esperanza', 'federica', 'alice', 'karen', 'amelie',
  'tessa', 'susan', 'mary', 'sandy', 'allison', 'angelica', 'veena',
  'samantha', 'fiona', 'victoria', 'kate', 'serena', 'moira', 'tessa',
  'paulina', 'soledad', 'female', 'femenino', ' woman ', '(f)',
];
function isLikelyMale(name) {
  const n = ' ' + name.toLowerCase() + ' ';
  return MALE_NAME_KEYWORDS.some(k => n.includes(k.toLowerCase()));
}
function isLikelyFemale(name) {
  const n = ' ' + name.toLowerCase() + ' ';
  return FEMALE_NAME_KEYWORDS.some(k => n.includes(k.toLowerCase()));
}

/**
 * Devuelve la mejor voz disponible para Marco. Sistema de scoring:
 *
 *   - +100 si lang exacto (es-ES === es-ES)
 *   - +70  si lang prefix matcha (es- → es-MX)
 *   - +30  si nombre sugiere masculino (preferGender='male' por default)
 *   - -25  si nombre sugiere femenino (cuando queremos masculino)
 *   - +15  si la voz tiene "Premium"/"Enhanced"/"Natural"/"Neural"
 *   - +5   si es una voz Apple (suelen ser mejor calidad)
 *
 * Devuelve la voz con mayor score, o null si nada matchea.
 */
function pickVoice(langPref, { preferGender = 'male' } = {}) {
  ensureVoicesLoaded();
  if (!voicesCache.length) return null;

  const langPrefix = langPref.split('-')[0].toLowerCase();
  const scored = voicesCache.map(v => {
    let score = 0;
    const vLang = (v.lang || '').toLowerCase();

    // Match de idioma
    if (v.lang === langPref) score += 100;
    else if (vLang.startsWith(langPrefix + '-')) score += 70;
    else if (vLang === langPrefix) score += 60;

    // Si no matchea idioma de ninguna forma, descartado.
    if (score === 0) return { voice: v, score: 0 };

    // Genero
    const isMale = isLikelyMale(v.name);
    const isFemale = isLikelyFemale(v.name);
    if (preferGender === 'male') {
      if (isMale) score += 30;
      else if (isFemale) score -= 25;
    } else if (preferGender === 'female') {
      if (isFemale) score += 30;
      else if (isMale) score -= 25;
    }

    // Hints de calidad — voces "Premium" / "Enhanced" / "Natural" / "Neural"
    // son las nuevas voces neurales (mucho mejor que las default robóticas).
    if (/premium|enhanced|natural|neural|online/i.test(v.name)) score += 15;

    // Apple voices (en macOS/iOS) suelen ser bastante naturales.
    if (v.localService === false) score += 3; // remote voices sometimes better
    if (typeof v.voiceURI === 'string' && /com\.apple/i.test(v.voiceURI)) score += 5;

    return { voice: v, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  return best && best.score > 0 ? best.voice : null;
}

/**
 * Lista las voces disponibles para debug. Devuelve una version compacta
 * con name, lang y un guess de genero. Util para que el usuario nos cuente
 * que voces tiene su sistema.
 */
export function listAvailableVoices() {
  ensureVoicesLoaded();
  return voicesCache.map(v => ({
    name: v.name,
    lang: v.lang,
    gender: isLikelyMale(v.name) ? 'M' : isLikelyFemale(v.name) ? 'F' : '?',
    localService: v.localService,
  }));
}

let currentUtterance = null;
const listeners = new Set();

function notify(event, data) {
  for (const fn of listeners) {
    try { fn(event, data); } catch { /* tolerable */ }
  }
}

/**
 * Suscribe a eventos de la voz. Devuelve una funcion para desuscribirse.
 * Eventos: 'start', 'end', 'cancel'. data.id es el id pasado en speak().
 */
export function subscribeVoice(handler) {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

export function isSpeaking() {
  if (!isVoiceSupported()) return false;
  return window.speechSynthesis.speaking;
}

/**
 * Reproduce un texto. Si la voz esta deshabilitada, no hace nada.
 *
 * Opciones:
 *   - lang: codigo de idioma (default 'es-ES')
 *   - rate: velocidad 0.1 a 10 (default 1)
 *   - pitch: tono 0 a 2 (default 1)
 *   - id: identificador opcional para que el UI sepa que utterance esta
 *     reproduciendo (ej. el indice del bubble del chat)
 */
export function speak(text, { lang = 'es-ES', rate = 0.95, pitch = 0.85, id = null, force = false } = {}) {
  if (!isVoiceSupported()) {
    console.warn('[voice] speechSynthesis no disponible en este navegador');
    return null;
  }
  if (!force && !isVoiceEnabled()) return null;
  if (!text || !text.trim()) return null;

  // Asegurar que las voces esten cargadas antes de hablar. En Chrome,
  // getVoices() puede retornar [] hasta que se dispare voiceschanged.
  ensureVoicesLoaded();

  // Cancelar cualquier utterance previa.
  window.speechSynthesis.cancel();

  // Workaround conocido del bug de Chrome donde speechSynthesis se "duerme"
  // tras inactividad. resume() lo despierta antes de un nuevo speak.
  if (typeof window.speechSynthesis.resume === 'function') {
    try { window.speechSynthesis.resume(); } catch { /* tolerable */ }
  }

  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang;
  utt.rate = rate;
  utt.pitch = pitch;
  const voice = pickVoice(lang, { preferGender: 'male' });
  if (voice) {
    utt.voice = voice;
    if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
      console.log(`[voice] speak: lang=${lang}, voz="${voice.name}" (${voice.lang}), text="${text.slice(0, 60)}"`);
    }
  } else {
    console.warn(`[voice] no se encontro voz para lang=${lang}. Voces disponibles:`,
      voicesCache.map(v => `${v.name} (${v.lang})`).slice(0, 15).join(', '));
  }

  utt.onstart = () => { currentUtterance = { utt, id }; notify('start', { id }); };
  utt.onend = () => { currentUtterance = null; notify('end', { id }); };
  utt.onerror = (e) => {
    console.warn('[voice] error de utterance:', e.error || e);
    currentUtterance = null;
    notify('end', { id });
  };

  window.speechSynthesis.speak(utt);

  // Verificacion: si tras 250ms no esta hablando ni en cola, algo fallo
  // silenciosamente. Notificamos para que el UI pueda reaccionar.
  setTimeout(() => {
    if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
      console.warn('[voice] speak() no produjo audio. Posibles causas: sin voces TTS instaladas, sistema en mute, o navegador bloqueando.');
    }
  }, 250);

  return utt;
}

export function stop() {
  if (!isVoiceSupported()) return;
  const id = currentUtterance?.id ?? null;
  window.speechSynthesis.cancel();
  currentUtterance = null;
  notify('cancel', { id });
}

/**
 * Mapea el codigo de idioma de la app (es/en/pt/fr/de/it/ko/ja) a un BCP-47
 * adecuado para la Web Speech API. La granularidad mayor mejora la chance de
 * encontrar una voz instalada.
 */
const VOICE_LANG_MAP = {
  es: 'es-ES', en: 'en-US', pt: 'pt-BR',
  fr: 'fr-FR', de: 'de-DE', it: 'it-IT',
  ko: 'ko-KR', ja: 'ja-JP',
};
export function langCodeForVoice(appLang) {
  return VOICE_LANG_MAP[appLang] || 'es-ES';
}
