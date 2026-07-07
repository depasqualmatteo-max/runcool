import { Jimp } from 'jimp';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const SKIN_DIR = 'C:\\Users\\Andrea\\runcool\\assets\\skin maiali';
const TOLERANCE = 50;

function colorDist(r1, g1, b1, r2, g2, b2) {
  return Math.abs(r1-r2) + Math.abs(g1-g2) + Math.abs(b1-b2);
}

// Raccoglie tutti i colori opachi di una fascia di bordo, trova il più frequente
function findBgColorByMode(data, width, height) {
  const colorMap = new Map();

  const addSample = (x, y) => {
    const i = (y * width + x) * 4;
    if (data[i+3] < 200) return;
    // Clamp e bucket a 16 livelli per raggruppare simili
    const r = Math.min(255, Math.round(data[i] / 16) * 16);
    const g = Math.min(255, Math.round(data[i+1] / 16) * 16);
    const b = Math.min(255, Math.round(data[i+2] / 16) * 16);
    const key = `${r},${g},${b}`;
    colorMap.set(key, (colorMap.get(key) ?? 0) + 1);
  };

  // Campiona border esterno (2px) per avere più campioni
  for (let x = 0; x < width; x++) { addSample(x, 0); addSample(x, 1); addSample(x, height-1); addSample(x, height-2); }
  for (let y = 2; y < height-2; y++) { addSample(0, y); addSample(1, y); addSample(width-1, y); addSample(width-2, y); }

  // Se il bordo esterno è tutto trasparente, cerca in fasce più interne
  if (colorMap.size === 0) {
    const innerRings = [5, 10, 20, 40, 80];
    for (const ring of innerRings) {
      if (ring >= Math.min(width, height) / 2) break;
      for (let x = ring; x < width - ring; x++) {
        addSample(x, ring); addSample(x, height - 1 - ring);
      }
      for (let y = ring + 1; y < height - ring - 1; y++) {
        addSample(ring, y); addSample(width - 1 - ring, y);
      }
      if (colorMap.size > 0) break;
    }
  }

  if (colorMap.size === 0) return null;

  // Trova il colore più frequente
  let bestKey = '', bestCount = 0;
  for (const [k, c] of colorMap) {
    if (c > bestCount) { bestKey = k; bestCount = c; }
  }

  return bestKey.split(',').map(Number);
}

async function processFile(filePath) {
  const img = await Jimp.read(filePath);
  const { width, height, data } = img.bitmap;

  const bg = findBgColorByMode(data, width, height);
  if (!bg) {
    console.log('skip (bordo già tutto trasparente):', filePath.split('skin maiali')[1]);
    return;
  }

  const [bgR, bgG, bgB] = bg;

  // Flood-fill:
  // Seed = tutti i pixel del bordo esterno (2px) che sono trasparenti O corrispondono allo sfondo
  const visited = new Uint8Array(width * height);
  const stack = [];

  const tryAdd = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    const i = idx * 4;
    const a = data[i+3];
    // Semina se: trasparente (già rimosso da passate precedenti) o colore sfondo
    if (a === 0 || colorDist(data[i], data[i+1], data[i+2], bgR, bgG, bgB) <= TOLERANCE) {
      visited[idx] = 1;
      stack.push([x, y]);
    }
  };

  for (let x = 0; x < width; x++) { tryAdd(x, 0); tryAdd(x, 1); tryAdd(x, height-1); tryAdd(x, height-2); }
  for (let y = 2; y < height-2; y++) { tryAdd(0, y); tryAdd(1, y); tryAdd(width-1, y); tryAdd(width-2, y); }

  while (stack.length > 0) {
    const [x, y] = stack.pop();
    const idx = y * width + x;
    const pidx = idx * 4;
    const a = data[pidx+3];

    if (a > 0) {
      // Opaco: rimuovi solo se corrisponde allo sfondo
      if (colorDist(data[pidx], data[pidx+1], data[pidx+2], bgR, bgG, bgB) > TOLERANCE) continue;
      data[pidx+3] = 0;
    }
    // Propaga in tutte le 4 direzioni (anche da pixel già trasparenti)
    for (const [nx, ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) {
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const nidx = ny * width + nx;
      if (visited[nidx]) continue;
      visited[nidx] = 1;
      stack.push([nx, ny]);
    }
  }

  await img.write(filePath);
  console.log(`✓ bg=(${bgR},${bgG},${bgB})`, filePath.split('skin maiali')[1]);
}

function findPngs(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...findPngs(full));
    else if (entry.endsWith('.png')) files.push(full);
  }
  return files;
}

const pngs = findPngs(SKIN_DIR);
console.log(`Elaboro ${pngs.length} PNG...`);
for (const f of pngs) await processFile(f);
console.log('Done!');
