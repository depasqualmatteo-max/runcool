/**
 * Inietta i meta tag iOS PWA nell'index.html generato da Expo.
 */
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../dist/index.html');

if (!fs.existsSync(htmlPath)) {
  console.error('❌  dist/index.html non trovato. Esegui prima expo export.');
  process.exit(1);
}

const iosTags = `
  <!-- iOS PWA standalone (rimuove barre Safari) -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="RunCool" />
  <link rel="apple-touch-icon" href="/assets/images/icon.png" />
  <meta name="mobile-web-app-capable" content="yes" />`;

let html = fs.readFileSync(htmlPath, 'utf-8');

if (html.includes('apple-mobile-web-app-capable')) {
  console.log('✅  Meta tag iOS già presenti, nessuna modifica.');
  process.exit(0);
}

html = html.replace('</head>', `${iosTags}\n</head>`);
fs.writeFileSync(htmlPath, html);
console.log('✅  Meta tag iOS iniettati in dist/index.html');
