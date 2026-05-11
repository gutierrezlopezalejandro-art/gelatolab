// Prepara el icono master cuadrado a partir del PNG no-cuadrado fuente.
// Padea con transparencia para llevarlo a un cuadrado del tamano del lado mayor.
// Output: public/icons/icon-master.png (1024x1024 upscale para max calidad).
//
// Uso: node scripts/prepare-icon-master.mjs

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'docs', 'Icono GelatoLab.png');
const OUT = path.join(ROOT, 'scripts', 'icon-source', 'icon-master.png');

const TARGET_SIZE = 1024;

async function main() {
  console.log(`Source: ${SOURCE}`);
  const img = sharp(SOURCE);
  const meta = await img.metadata();
  console.log(`Source dims: ${meta.width}x${meta.height}, format: ${meta.format}`);

  // Cuadrar: si el lado largo es L, padeamos a LxL con transparente.
  const side = Math.max(meta.width, meta.height);
  const offsetX = Math.floor((side - meta.width) / 2);
  const offsetY = Math.floor((side - meta.height) / 2);

  // Componemos sobre canvas transparente cuadrado
  const squared = await sharp({
    create: {
      width: side,
      height: side,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: SOURCE, top: offsetY, left: offsetX }])
    .png()
    .toBuffer();

  // Upscale a TARGET_SIZE con lanczos3 para preservar detalle
  await sharp(squared)
    .resize(TARGET_SIZE, TARGET_SIZE, { kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toFile(OUT);

  const final = await sharp(OUT).metadata();
  console.log(`\nMaster guardado en: ${OUT}`);
  console.log(`Final dims: ${final.width}x${final.height}, size: ${(final.size / 1024).toFixed(1)} KB`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
