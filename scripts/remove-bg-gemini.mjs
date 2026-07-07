import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { Jimp } from 'jimp';

const API_KEY = process.env.GEMINI_API_KEY ?? '';
const SKIN_DIR = 'C:\\Users\\Andrea\\runcool\\assets\\skin maiali';

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

function findPngs(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...findPngs(full));
    else if (entry.toLowerCase().endsWith('.png')) files.push(full);
  }
  return files;
}

// Chiedi a Gemini il colore di sfondo dell'immagine
async function getBgColorFromGemini(filePath) {
  const imageData = readFileSync(filePath);
  const base64 = imageData.toString('base64');

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: 'image/png',
        data: base64,
      },
    },
    `Questa immagine ha un personaggio (maiale cartoon) su uno sfondo solido.
Dimmi SOLO il colore RGB dello sfondo, nel formato esatto: R,G,B
Esempio: 191,191,191
Rispondi solo con i tre numeri separati da virgola, nient'altro.`,
  ]);

  const text = result.response.text().trim();
  const match = text.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!match) throw new Error(`Risposta inattesa: ${text}`);
  return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
}

function colorDist(r1, g1, b1, r2, g2, b2) {
  return Math.abs(r1-r2) + Math.abs(g1-g2) + Math.abs(b1-b2);
}

async function processFile(filePath) {
  const name = filePath.split('skin maiali')[1];

  // Ottieni il colore sfondo da Gemini
  let bgColor;
  try {
    bgColor = await getBgColorFromGemini(filePath);
  } catch (e) {
    console.log(`✗ Errore Gemini per ${name}: ${e.message}`);
    return;
  }

  const [bgR, bgG, bgB] = bgColor;
  console.log(`  Gemini bg=(${bgR},${bgG},${bgB}) per ${name}`);

  const TOLERANCE = 45;

  const img = await Jimp.read(filePath);
  const { width, height, data } = img.bitmap;

  // Flood-fill dai bordi + attraverso pixel già trasparenti
  const visited = new Uint8Array(width * height);
  const stack = [];

  const tryAdd = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    const i = idx * 4;
    const a = data[i+3];
    if (a === 0 || colorDist(data[i], data[i+1], data[i+2], bgR, bgG, bgB) <= TOLERANCE) {
      visited[idx] = 1;
      stack.push([x, y]);
    }
  };

  for (let x = 0; x < width; x++) { tryAdd(x, 0); tryAdd(x, 1); tryAdd(x, height-1); tryAdd(x, height-2); }
  for (let y = 2; y < height-2; y++) { tryAdd(0, y); tryAdd(1, y); tryAdd(width-1, y); tryAdd(width-2, y); }

  // Seeding anche da fasce interne se bordo già trasparente
  const innerRings = [5, 10, 20, 40];
  for (const ring of innerRings) {
    let hadOpaque = false;
    for (let x = ring; x < width - ring; x++) {
      const i = (ring * width + x) * 4;
      if (data[i+3] > 0) { hadOpaque = true; break; }
    }
    if (hadOpaque) {
      for (let x = ring; x < width - ring; x++) { tryAdd(x, ring); tryAdd(x, height-1-ring); }
      for (let y = ring+1; y < height-ring-1; y++) { tryAdd(ring, y); tryAdd(width-1-ring, y); }
      break;
    }
  }

  while (stack.length > 0) {
    const [x, y] = stack.pop();
    const idx = y * width + x;
    const pidx = idx * 4;
    const a = data[pidx+3];

    if (a > 0) {
      if (colorDist(data[pidx], data[pidx+1], data[pidx+2], bgR, bgG, bgB) > TOLERANCE) continue;
      data[pidx+3] = 0;
    }
    for (const [nx, ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) {
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const nidx = ny * width + nx;
      if (visited[nidx]) continue;
      visited[nidx] = 1;
      stack.push([nx, ny]);
    }
  }

  await img.write(filePath);
  console.log(`✓ ${name}`);
}

const pngs = findPngs(SKIN_DIR);
console.log(`Elaboro ${pngs.length} PNG con Gemini...`);
for (const f of pngs) {
  await processFile(f);
  // Piccola pausa per non superare rate limit
  await new Promise(r => setTimeout(r, 500));
}
console.log('Done!');
