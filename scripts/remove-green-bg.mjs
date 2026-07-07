import { Jimp } from 'jimp';
import { readdirSync, statSync, mkdirSync } from 'fs';
import { join } from 'path';

const SRC_DIR = 'C:\\Users\\Andrea\\runcool\\assets\\skin maiali\\da togliere sfondo';
const OUT_DIR = SRC_DIR; // sovrascrive in place, poi le spostiamo

// Verde acceso target: ~ (0-150, 200-255, 0-150), ma usiamo distanza dal verde puro
function isGreenish(r, g, b) {
  // Il verde deve dominare chiaramente su rosso e blu
  return g > 120 && g > r * 1.4 && g > b * 1.4;
}

function findPngs(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) continue;
    if (entry.toLowerCase().endsWith('.png')) files.push(full);
  }
  return files;
}

async function processFile(filePath) {
  const name = filePath.split('da togliere sfondo')[1];
  const img = await Jimp.read(filePath);
  const { width, height, data } = img.bitmap;

  // Passo 1: rimuovi pixel pienamente verdi
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i+1], b = data[i+2];
    if (isGreenish(r, g, b)) {
      data[i+3] = 0;
    }
  }

  // Passo 2: despill — sui pixel ai bordi del personaggio (semi-trasparenti per via
  // dell'antialiasing), riduci la componente verde residua per evitare l'alone verde
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i+3];
    if (a === 0) continue;
    const r = data[i], g = data[i+1], b = data[i+2];
    if (g > r && g > b) {
      const avg = (r + b) / 2;
      data[i+1] = Math.round(avg + (g - avg) * 0.3); // attenua il verde residuo
    }
  }

  await img.write(filePath);
  console.log(`✓ ${name}`);
}

const pngs = findPngs(SRC_DIR);
console.log(`Elaboro ${pngs.length} PNG con chroma-key verde...`);
for (const f of pngs) await processFile(f);
console.log('Done!');
