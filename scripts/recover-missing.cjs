// Extracts the 9 ingredients that were lost during the merge,
// from the previous production bundle, and writes them to a JSON file.
const fs = require('fs');
const path = require('path');

const bundle = fs.readFileSync(
  path.join(__dirname, '..', 'dist', 'assets', 'index-BLPNsDxy.js'),
  'utf8'
);

const missingNames = [
  'Pasta de pistacho',
  'Pralinosa avellana 50%',
  'Pistacho en pasta',
  'Crema fresca (panna fresca)',
  'Pasta de fior di latte',
  'Pasta de nocciola (Piemonte)',
  'Pasta de tiramisú',
  'Extracto de vainilla Madagascar',
  'Pasta de limón (siciliana)',
];

// All ingredient objects in the bundle have this shape:
// {id:N,name:"...",category:"...",cost_per_kg:N,water_pct:N,...,is_custom:!0|!1}
// Find each by looking at name, then capture the full balanced braces.
function extractAt(start) {
  if (bundle[start] !== '{') return null;
  let depth = 0;
  for (let i = start; i < bundle.length; i++) {
    const ch = bundle[i];
    if (ch === '"' || ch === "'") {
      // skip string
      const quote = ch;
      i++;
      while (i < bundle.length && bundle[i] !== quote) {
        if (bundle[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return bundle.substring(start, i + 1);
    }
  }
  return null;
}

function jsObjectToJson(s) {
  // {key:value,...} -> {"key":value,...}
  let out = s.replace(/([{,])\s*([A-Za-z_][\w]*)\s*:/g, '$1"$2":');
  out = out.replace(/!1/g, 'false').replace(/!0/g, 'true');
  // .08 -> 0.08 (JSON requires leading zero)
  out = out.replace(/(:|,)\s*\.(\d)/g, '$10.$2');
  // 2e3 -> 2000 (JSON allows exponent but to be safe expand it)
  out = out.replace(/(\d+)e(\d+)/g, (_, base, exp) => String(Number(base) * Math.pow(10, Number(exp))));
  return out;
}

const recovered = [];
for (const name of missingNames) {
  const idx = bundle.indexOf(`name:"${name}"`);
  if (idx < 0) { console.warn('Not found:', name); continue; }
  // Find the opening brace before this name
  let start = idx;
  while (start > 0 && bundle[start] !== '{') start--;
  const objStr = extractAt(start);
  if (!objStr) { console.warn('Could not extract object for:', name); continue; }
  try {
    const obj = JSON.parse(jsObjectToJson(objStr));
    recovered.push(obj);
  } catch (e) {
    console.warn('Parse failed for:', name, e.message);
    console.log('Object string was:', objStr.substring(0, 200));
  }
}

console.log('Recovered', recovered.length, 'of', missingNames.length, 'ingredients');
const outPath = path.join(__dirname, '..', 'src', 'data', '_missing-ingredients.json');
fs.writeFileSync(outPath, JSON.stringify(recovered, null, 2));
console.log('Wrote', outPath);
