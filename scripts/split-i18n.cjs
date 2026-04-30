// One-shot script to split src/lib/i18n.js into per-language locale files.
// Reads the existing dictionaries object, writes each language to
// src/lib/locales/<lang>.js as a default export, then rewrites i18n.js to
// load Spanish eagerly and other languages lazily on demand.
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src', 'lib', 'i18n.js');
const LOCALES_DIR = path.join(__dirname, '..', 'src', 'lib', 'locales');

const text = fs.readFileSync(SRC, 'utf8');

// Find the line numbers where each language section starts and ends.
// Each language section starts with a line "  <code>: {" at the top level
// of the dictionaries object. We look for lines like "  es: {", "  en: {", etc.
const lines = text.split('\n');
const langs = ['es', 'en', 'fr', 'de', 'it', 'ko', 'ja'];
const startLines = {};

for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^  ([a-z]{2}): \{$/);
  if (m && langs.includes(m[1]) && startLines[m[1]] == null) {
    startLines[m[1]] = i;
  }
}
console.log('Language section starts:', startLines);

// Find matching close: walk forward, tracking brace depth starting from 1
function findCloseLine(startLine) {
  let depth = 0;
  let inString = false;
  let stringChar = null;
  let inLineComment = false;
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    inLineComment = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      const next = line[j + 1];
      if (inLineComment) break;
      if (inString) {
        if (ch === '\\') { j++; continue; }
        if (ch === stringChar) inString = false;
        continue;
      }
      if (ch === '/' && next === '/') { inLineComment = true; continue; }
      if (ch === "'" || ch === '"' || ch === '`') { inString = true; stringChar = ch; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return i; // closing brace line of this language object
      }
    }
  }
  return -1;
}

// Extract content of each language object (between first { and matching })
const sections = {};
for (const lang of langs) {
  const startLine = startLines[lang];
  if (startLine == null) { console.warn(`No start for ${lang}`); continue; }
  const closeLine = findCloseLine(startLine);
  if (closeLine === -1) { console.warn(`No close for ${lang}`); continue; }
  // body is lines between startLine+1 and closeLine-1 inclusive
  const body = lines.slice(startLine + 1, closeLine).join('\n');
  sections[lang] = body;
  console.log(`${lang}: lines ${startLine + 1}-${closeLine + 1} (${body.length} chars)`);
}

// Write each locale file
if (!fs.existsSync(LOCALES_DIR)) fs.mkdirSync(LOCALES_DIR, { recursive: true });
for (const [lang, body] of Object.entries(sections)) {
  const out = `// Auto-extracted from i18n.js by scripts/split-i18n.cjs.\n` +
              `// Edit translations by editing this file directly.\n` +
              `export default {\n${body}\n};\n`;
  fs.writeFileSync(path.join(LOCALES_DIR, `${lang}.js`), out);
}

console.log('Wrote locale files. Total sizes:');
for (const lang of langs) {
  const p = path.join(LOCALES_DIR, `${lang}.js`);
  if (fs.existsSync(p)) console.log(`  ${lang}: ${fs.statSync(p).size} bytes`);
}
