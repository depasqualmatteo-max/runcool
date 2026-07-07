import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const API_KEY = '5jAaQKjnj4tx2qs6SvfCEKdS';
const SKIN_DIR = 'C:\\Users\\Andrea\\runcool\\assets\\skin maiali';

function findPngs(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...findPngs(full));
    else if (entry.toLowerCase().endsWith('.png')) files.push(full);
  }
  return files;
}

async function processFile(filePath, retries = 3) {
  const name = filePath.split('skin maiali')[1];
  const imageData = readFileSync(filePath);

  const formData = new FormData();
  formData.append('image_file', new Blob([imageData], { type: 'image/png' }), 'image.png');
  formData.append('size', 'auto');

  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': API_KEY },
      body: formData,
    });

    if (res.status === 429) {
      console.log(`  rate limit, aspetto 10s... (tentativo ${attempt}/${retries})`);
      await new Promise(r => setTimeout(r, 10000));
      continue;
    }
    if (!res.ok) {
      const err = await res.text();
      console.log(`✗ ${name}: ${res.status} ${err}`);
      return false;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(filePath, buf);
    console.log(`✓ ${name}`);
    return true;
  }
  console.log(`✗ ${name}: fallito dopo ${retries} tentativi`);
  return false;
}

const pngs = findPngs(SKIN_DIR);
console.log(`Elaboro ${pngs.length} PNG con remove.bg...`);
for (const f of pngs) {
  await processFile(f);
  await new Promise(r => setTimeout(r, 2000)); // 2s tra ogni richiesta
}
console.log('Done!');
