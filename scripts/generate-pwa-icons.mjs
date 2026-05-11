// Genera las variantes PNG de iconos PWA + Apple Touch Icons a partir del
// PNG master cuadrado. Re-ejecutar cada vez que cambia el master:
//   node scripts/generate-pwa-icons.mjs
//
// Source: public/icons/icon-master.png (1024x1024 cuadrado, generado por
// prepare-icon-master.mjs a partir del PNG original en docs/).
//
// Notas:
//   - El icono actual ya tiene fondo opaco propio (gradiente morado/lila),
//     asi que NO necesitamos agregar bg color para apple-touch-icons.
//   - iOS va a aplicar su propia mascara redondeada encima — si el icono
//     ya tiene esquinas redondeadas se notara doble pero es aceptable.
//   - Los maskable icons llevan padding 10% para safe area (Android puede
//     recortarlos en cualquier forma).

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SOURCE_PATH = path.join(ROOT, 'scripts', 'icon-source', 'icon-master.png');
const OUT_DIR = path.join(ROOT, 'public', 'icons');

// Brand background para maskable icon (Android puede recortar en mascara, ese
// fondo se ve si el recorte expone area sin pixel). Usamos morado que matchea
// el icono.
const BRAND_BG = '#5b3a7e';

// Lista de variantes a generar.
// El icono master ya tiene su propio fondo opaco (gradiente morado/lila),
// asi que NO agregamos bg para apple-touch-icons. iOS redondea encima.
const VARIANTS = [
  // Apple Touch Icons
  { name: 'apple-touch-icon-180.png', size: 180 },
  { name: 'apple-touch-icon-167.png', size: 167 },
  { name: 'apple-touch-icon-152.png', size: 152 },
  { name: 'apple-touch-icon-120.png', size: 120 },
  // Default que iOS busca si no encuentra link explicito
  { name: 'apple-touch-icon.png', size: 180 },

  // PWA standard icons
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },

  // Maskable icon: Android puede recortar en cualquier forma. Padding 10%
  // interno + fondo brand morado para que el recorte de cualquier mascara
  // (circle, squircle, teardrop) se vea OK.
  { name: 'icon-maskable-512.png', size: 512, bg: BRAND_BG, padding: 0.10 },
];

async function generateOne({ name, size, bg, padding = 0 }) {
  const outPath = path.join(OUT_DIR, name);
  const inner = Math.round(size * (1 - padding * 2));
  const offset = Math.round((size - inner) / 2);

  // Resize del PNG master al tamano interior (con padding si aplica)
  const resized = await sharp(SOURCE_PATH)
    .resize(inner, inner, { kernel: sharp.kernel.lanczos3, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  let canvas;
  if (bg) {
    canvas = sharp({
      create: { width: size, height: size, channels: 4, background: bg },
    });
  } else {
    canvas = sharp({
      create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    });
  }

  await canvas
    .composite([{ input: resized, top: offset, left: offset }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  const stats = await sharp(outPath).metadata();
  return { name, dim: `${stats.width}x${stats.height}`, bytes: stats.size };
}

async function main() {
  console.log(`Source: ${SOURCE_PATH}`);
  console.log(`Generating ${VARIANTS.length} variants in ${OUT_DIR}\n`);

  for (const variant of VARIANTS) {
    try {
      const result = await generateOne(variant);
      const sizeKb = (result.bytes / 1024).toFixed(1);
      console.log(`  ${result.name.padEnd(32)} ${result.dim.padEnd(10)} ${sizeKb} KB`);
    } catch (err) {
      console.error(`  ${variant.name} FAILED: ${err.message}`);
      process.exitCode = 1;
    }
  }

  console.log('\nDone. Recordatorio: hace commit de los PNG generados.');
}

main();
