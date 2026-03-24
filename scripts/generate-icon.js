const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets', 'images');

// ─── DESIGN: corridore a sinistra + bicchiere a destra ──────────────────────
const designElements = `
  <!-- ===== CORRIDORE ===== -->
  <circle cx="270" cy="210" r="58" fill="#FFD700"/>
  <line x1="270" y1="268" x2="238" y2="510" stroke="#FFD700" stroke-width="46" stroke-linecap="round"/>
  <line x1="258" y1="360" x2="150" y2="445" stroke="#FFD700" stroke-width="37" stroke-linecap="round"/>
  <line x1="258" y1="350" x2="378" y2="295" stroke="#FFD700" stroke-width="37" stroke-linecap="round"/>
  <line x1="238" y1="510" x2="160" y2="655" stroke="#FFD700" stroke-width="41" stroke-linecap="round"/>
  <line x1="160" y1="655" x2="140" y2="790" stroke="#FFD700" stroke-width="37" stroke-linecap="round"/>
  <line x1="238" y1="510" x2="328" y2="650" stroke="#FFD700" stroke-width="41" stroke-linecap="round"/>
  <line x1="328" y1="650" x2="425" y2="740" stroke="#FFD700" stroke-width="37" stroke-linecap="round"/>

  <!-- ===== BICCHIERE ===== -->
  <path d="M548,240 L732,240 L672,790 L608,790 Z" fill="#FFD700" opacity="0.4"/>
  <path d="M542,185 L738,185 L672,790 L608,790 Z" fill="none" stroke="#FFD700" stroke-width="27" stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="578" cy="174" r="30" fill="#FFD700"/>
  <circle cx="607" cy="159" r="37" fill="#FFD700"/>
  <circle cx="640" cy="152" r="40" fill="#FFD700"/>
  <circle cx="673" cy="159" r="35" fill="#FFD700"/>
  <circle cx="702" cy="173" r="27" fill="#FFD700"/>
  <path d="M736,372 Q848,372 848,482 Q848,592 736,592" fill="none" stroke="#FFD700" stroke-width="29" stroke-linecap="round"/>
`;

// ─── ICONA PRINCIPALE (sfondo nero arrotondato) ──────────────────────────────
const iconSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" rx="200" fill="#111111"/>
  ${designElements}
</svg>`;

// ─── ANDROID FOREGROUND (sfondo trasparente, design ridotto per safe zone) ──
const androidFgSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(128,128) scale(0.75)">
    ${designElements}
  </g>
</svg>`;

// ─── ANDROID BACKGROUND (nero pieno) ────────────────────────────────────────
const androidBgSvg = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="#111111"/>
</svg>`;

// ─── SPLASH ICON (sfondo trasparente, per centrare su splash screen) ─────────
const splashSvg = `<svg width="512" height="512" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  ${designElements}
</svg>`;

// ─── FAVICON ─────────────────────────────────────────────────────────────────
const faviconSvg = `<svg width="64" height="64" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" rx="200" fill="#111111"/>
  ${designElements}
</svg>`;

// ─── GENERA PNG ──────────────────────────────────────────────────────────────
function generatePNG(svgContent, outputPath, size) {
  const resvg = new Resvg(svgContent, {
    fitTo: { mode: 'width', value: size },
  });
  const rendered = resvg.render();
  fs.writeFileSync(outputPath, rendered.asPng());
  console.log(`✅  ${path.basename(outputPath)} (${size}x${size}px)`);
}

console.log('\n🎨 Generazione icone RunCool...\n');

generatePNG(iconSvg,       path.join(assetsDir, 'icon.png'),                        1024);
generatePNG(androidFgSvg,  path.join(assetsDir, 'android-icon-foreground.png'),     1024);
generatePNG(androidBgSvg,  path.join(assetsDir, 'android-icon-background.png'),     1024);
generatePNG(iconSvg,       path.join(assetsDir, 'android-icon-monochrome.png'),     1024);
generatePNG(splashSvg,     path.join(assetsDir, 'splash-icon.png'),                  512);
generatePNG(faviconSvg,    path.join(assetsDir, 'favicon.png'),                       64);

console.log('\n✅ Tutte le icone generate!\n');
