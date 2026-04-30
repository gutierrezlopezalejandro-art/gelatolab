// Replaces the inline dictionaries object in src/lib/i18n.js with
// imports/dynamic loaders for the per-language locale files. Idempotent:
// detects the new shape and exits cleanly if already refactored.
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src', 'lib', 'i18n.js');
let text = fs.readFileSync(SRC, 'utf8');

if (text.includes("from './locales/es'")) {
  console.log('Already refactored — exiting');
  process.exit(0);
}

// Find the start and end of the dictionaries declaration.
const startIdx = text.indexOf('const dictionaries = {');
if (startIdx < 0) { console.error('Could not locate dictionaries declaration'); process.exit(1); }

// Walk braces from after the `{` to find the matching `};`.
let depth = 0;
let inString = false;
let stringChar = null;
let inLineComment = false;
let endIdx = -1;
for (let i = startIdx; i < text.length; i++) {
  const ch = text[i];
  const next = text[i + 1];
  if (inLineComment) {
    if (ch === '\n') inLineComment = false;
    continue;
  }
  if (inString) {
    if (ch === '\\') { i++; continue; }
    if (ch === stringChar) inString = false;
    continue;
  }
  if (ch === '/' && next === '/') { inLineComment = true; continue; }
  if (ch === "'" || ch === '"' || ch === '`') { inString = true; stringChar = ch; continue; }
  if (ch === '{') depth++;
  else if (ch === '}') {
    depth--;
    if (depth === 0) { endIdx = i; break; }
  }
}
if (endIdx < 0) { console.error('Could not find matching close brace'); process.exit(1); }

// Include the closing `};` (semicolon after `}`)
let stopIdx = endIdx + 1;
if (text[stopIdx] === ';') stopIdx++;
// Optional trailing newline
if (text[stopIdx] === '\n') stopIdx++;

const before = text.slice(0, startIdx);
const after  = text.slice(stopIdx);

// Replacement: import ES eagerly + lazy loader infrastructure.
const replacement =
`import esDict from './locales/es';

// Loaded language dictionaries. Spanish is eager (default); others arrive
// asynchronously when the user switches via setLang(). Until a language is
// loaded, getTranslation() falls back to ES.
const loadedDicts = { es: esDict };

// Map of lazy loaders. Vite turns each \`() => import('./locales/xx.js')\`
// into its own chunk so non-default languages stay out of the main bundle.
const loaders = {
  es: () => Promise.resolve(esDict),
  en: () => import('./locales/en.js').then(m => m.default),
  fr: () => import('./locales/fr.js').then(m => m.default),
  de: () => import('./locales/de.js').then(m => m.default),
  it: () => import('./locales/it.js').then(m => m.default),
  ko: () => import('./locales/ko.js').then(m => m.default),
  ja: () => import('./locales/ja.js').then(m => m.default),
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
`;

const out = before + replacement + after;

// Also rewrite the getTranslation function and setLang to use the new map.
const out2 = out
  .replace(
    /function getTranslation\(lang, key\) \{[\s\S]*?\n\}/,
    `function getTranslation(lang, key) {
  return loadedDicts[lang]?.[key] ?? loadedDicts.es[key] ?? key;
}`
  )
  .replace(
    /setLang: \(lang\) => set\(\{ lang \}\),/,
    `setLang: (lang) => {
        // Kick off the lazy load; the store updates synchronously so the UI
        // re-renders, and getTranslation falls back to ES until the dict
        // arrives a tick later.
        loadLanguage(lang);
        set({ lang });
      },`
  );

fs.writeFileSync(SRC, out2);
console.log('OK — i18n.js refactored. Removed', stopIdx - startIdx, 'chars,', text.split('\\n').length - out2.split('\\n').length, 'lines.');
