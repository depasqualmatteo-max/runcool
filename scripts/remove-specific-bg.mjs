import { Jimp } from 'jimp';

const TOLERANCE = 40;
function dist(r1,g1,b1,r2,g2,b2){ return Math.abs(r1-r2)+Math.abs(g1-g2)+Math.abs(b1-b2); }

async function floodFillRemove(filePath, bgColor) {
  const img = await Jimp.read(filePath);
  const { width, height, data } = img.bitmap;
  const [bgR, bgG, bgB] = bgColor;

  const visited = new Uint8Array(width * height);
  const stack = [];
  const tryAdd = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    const i = idx * 4;
    if (dist(data[i], data[i+1], data[i+2], bgR, bgG, bgB) <= TOLERANCE) {
      visited[idx] = 1;
      stack.push([x, y]);
    }
  };
  for (let x = 0; x < width; x++) { tryAdd(x, 0); tryAdd(x, height-1); }
  for (let y = 1; y < height-1; y++) { tryAdd(0, y); tryAdd(width-1, y); }

  while (stack.length) {
    const [x, y] = stack.pop();
    const idx = y * width + x;
    const pidx = idx * 4;
    if (dist(data[pidx], data[pidx+1], data[pidx+2], bgR, bgG, bgB) > TOLERANCE) continue;
    data[pidx+3] = 0;
    for (const [nx, ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) {
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const nidx = ny * width + nx;
      if (visited[nidx]) continue;
      visited[nidx] = 1;
      stack.push([nx, ny]);
    }
  }
  await img.write(filePath);
  console.log('✓', filePath);
}

const DIR = 'C:\\Users\\Andrea\\runcool\\assets\\skin maiali\\da togliere sfondo\\';
await floodFillRemove(DIR + 'nerdpro.png', [254, 1, 249]);       // magenta
await floodFillRemove(DIR + 'nerdprooro.png', [254, 1, 249]);    // magenta
await floodFillRemove(DIR + 'coniglioprooro.png', [255, 255, 255]); // bianco
console.log('Done!');
