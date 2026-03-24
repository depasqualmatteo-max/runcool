/**
 * Processa l'icona sorgente e genera tutti i file necessari per Expo.
 * L'immagine sorgente (icon-source.png) viene centrata e ritagliata a 1024x1024.
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SRC = path.join(__dirname, '../assets/images/icon-source.png');
const OUT = path.join(__dirname, '../assets/images');

if (!fs.existsSync(SRC)) {
  console.error('❌  File non trovato: assets/images/icon-source.png');
  console.error('    Salva l\'immagine lì e riprova.');
  process.exit(1);
}

async function run() {
  console.log('\n🎨  Generazione icone RunCool...\n');

  const meta = await sharp(SRC).metadata();
  console.log(`   Sorgente: ${meta.width}x${meta.height}px`);

  // Ritaglia al quadrato centrale e ridimensiona a 1024x1024
  const size = Math.min(meta.width, meta.height);
  const left = Math.floor((meta.width - size) / 2);
  const top  = Math.floor((meta.height - size) / 2);

  const base = await sharp(SRC)
    .extract({ left, top, width: size, height: size })
    .resize(1024, 1024)
    .png()
    .toBuffer();

  // icon.png principale (iOS)
  await sharp(base).toFile(path.join(OUT, 'icon.png'));
  console.log('✅  icon.png (1024x1024)');

  // Android foreground (aggiunge padding 15% per la safe zone adattiva)
  const padded = Math.round(1024 * 0.70);
  const offset = Math.round((1024 - padded) / 2);
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: await sharp(base).resize(padded, padded).png().toBuffer(), left: offset, top: offset }])
    .png()
    .toFile(path.join(OUT, 'android-icon-foreground.png'));
  console.log('✅  android-icon-foreground.png (1024x1024 con padding)');

  // Android background (nero pieno)
  await sharp({
    create: { width: 1024, height: 1024, channels: 3, background: { r: 17, g: 17, b: 17 } },
  })
    .png()
    .toFile(path.join(OUT, 'android-icon-background.png'));
  console.log('✅  android-icon-background.png (nero #111)');

  // Monocromatico Android (bianco su nero per notifiche)
  await sharp(base)
    .grayscale()
    .threshold(128)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(OUT, 'android-icon-monochrome.png'));
  console.log('✅  android-icon-monochrome.png');

  // Splash icon (più piccola, solo icona)
  await sharp(base)
    .resize(512, 512)
    .png()
    .toFile(path.join(OUT, 'splash-icon.png'));
  console.log('✅  splash-icon.png (512x512)');

  // Favicon web
  await sharp(base)
    .resize(64, 64)
    .png()
    .toFile(path.join(OUT, 'favicon.png'));
  console.log('✅  favicon.png (64x64)');

  console.log('\n🚀  Tutte le icone generate! Ora fai:\n');
  console.log('    eas update --branch main --message "nuova icona"');
  console.log('    eas build -p android --profile preview\n');
}

run().catch(err => {
  console.error('❌  Errore:', err.message);
  process.exit(1);
});
