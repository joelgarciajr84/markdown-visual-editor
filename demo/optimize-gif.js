/**
 * Otimiza o GIF de demo:
 * 1. Redimensiona para 1100px de largura com sharp (mantém proporção)
 * 2. Roda gifsicle para reduzir cores, lossy e acelerar frames
 */

const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const sharp = require('sharp');
const gifsicle = require('gifsicle').default;

const ROOT = path.join(__dirname, '..');
const INPUT  = path.join(ROOT, 'markdown-wysiwyg-demo.gif');
const RESIZED = path.join(ROOT, 'markdown-wysiwyg-demo-resized.gif');
const OUTPUT = INPUT; // sobrescreve o original

async function main() {
  const origSize = fs.statSync(INPUT).size;
  console.log(`Original: ${(origSize / 1024 / 1024).toFixed(1)} MB  (${INPUT})`);

  // 1. Redimensiona para 1100px wide, mantendo proporção
  console.log('Redimensionando para 1100px...');
  await sharp(INPUT, { animated: true, limitInputPixels: false })
    .resize(1100, null, { kernel: 'lanczos3' })
    .gif({ effort: 10, colours: 128 })
    .toFile(RESIZED);

  // 2. gifsicle: otimiza e acelera (delay original ~10cs → 6cs = ~1.7x mais rápido)
  console.log('Rodando gifsicle...');
  execFileSync(gifsicle, [
    '--optimize=3',
    '--colors=128',
    '--delay=6',         // 6/100s por frame (~1.7x mais rápido que o padrão 10cs)
    '-o', OUTPUT,
    RESIZED,
  ]);

  fs.unlinkSync(RESIZED);

  const finalSize = fs.statSync(OUTPUT).size;
  console.log(`Final:    ${(finalSize / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Redução:  ${Math.round((1 - finalSize / origSize) * 100)}%`);
}

main().catch(err => { console.error(err); process.exit(1); });
