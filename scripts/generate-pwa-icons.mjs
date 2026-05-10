// Genera las variantes PNG de iconos PWA + Apple Touch Icons a partir del
// SVG fuente. Re-ejecutar cada vez que cambia public/icons/icon.svg:
//   node scripts/generate-pwa-icons.mjs
//
// Por que importa el background opaco para iOS:
//   iOS aplica su propia mascara redondeada al apple-touch-icon. Si el PNG
//   tiene transparencia, queda con un fondo blanco/raro detras. Por eso
//   los apple-touch-icon-* tienen background del color brand. Los icon-*
//   normales (Android/PWA) si pueden ir transparentes (los usa solo el
//   manifest, navegador no aplica mascara).

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SVG_PATH = path.join(ROOT, 'public', 'icons', 'icon.svg');
const OUT_DIR = path.join(ROOT, 'public', 'icons');

// Color brand para fondos opacos (verde oscuro del logo, hex del SVG)
const BRAND_BG = '#1a5c3a';

// Lista de variantes a generar
const VARIANTS = [
  // Apple Touch Icons (con fondo opaco — iOS los redondea)
  { name: 'apple-touch-icon-180.png', size: 180, bg: BRAND_BG },
  { name: 'apple-touch-icon-167.png', size: 167, bg: BRAND_BG },
  { name: 'apple-touch-icon-152.png', size: 152, bg: BRAND_BG },
  { name: 'apple-touch-icon-120.png', size: 120, bg: BRAND_BG },
  // El default apple-touch-icon.png que iOS busca si no encuentra link explicito
  { name: 'apple-touch-icon.png', size: 180, bg: BRAND_BG },

  // PWA standard icons (transparentes — Android los pone en cualquier launcher)
  { name: 'icon-192.png', size: 192, bg: null },
  { name: 'icon-512.png', size: 512, bg: null },

  // Maskable icon: Android puede recortarlo en cualquier forma. Necesita
  // safe area de ~10% padding interno para que el logo no quede cortado.
  // Usamos fondo brand para que el recorte se vea bien en cualquier mascara.
  { name: 'icon-maskable-512.png', size: 512, bg: BRAND_BG, padding: 0.10 },
];

async function generateOne(svgBuffer, { name, size, bg, padding = 0 }) {
  const outPath = path.join(OUT_DIR, name);
  const inner = Math.round(size * (1 - padding * 2));
  const offset = Math.round((size - inner) / 2);

  let pipeline = sharp(svgBuffer, { density: 384 })
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });

  const renderedSvg = await pipeline.png().toBuffer();

  let canvas;
  if (bg) {
    canvas = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: bg,
      },
    });
  } else {
    canvas = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    });
  }

  await canvas
    .composite([{ input: renderedSvg, top: offset, left: offset }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  const stats = await sharp(outPath).metadata();
  return { name, dim: `${stats.width}x${stats.height}`, bytes: stats.size };
}

async function main() {
  console.log(`Reading SVG: ${SVG_PATH}`);
  const svgBuffer = await readFile(SVG_PATH);
  console.log(`Generating ${VARIANTS.length} variants in ${OUT_DIR}\n`);

  for (const variant of VARIANTS) {
    try {
      const result = await generateOne(svgBuffer, variant);
      const sizeKb = (result.bytes / 1024).toFixed(1);
      console.log(`  ${result.name.padEnd(32)} ${result.dim.padEnd(10)} ${sizeKb} KB`);
    } catch (err) {
      console.error(`  ${variant.name} FAILED: ${err.message}`);
      process.exitCode = 1;
    }
  }

  console.log('\nDone. Recordatorio: si cambiaste el SVG, hace commit de los PNG generados.');
}

main();
