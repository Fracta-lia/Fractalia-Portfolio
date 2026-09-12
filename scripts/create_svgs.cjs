const fs = require('fs');
const path = require('path');

function createSvg(title, subtitle, width, height, dark = false) {
  const bg = dark ? '#141414' : '#F9F9F9';
  const textCol = dark ? '#F5F5F5' : '#1A1A1A';
  const subCol = dark ? '#8E8E8E' : '#737373';
  const borderCol = dark ? '#2E2E2E' : '#E5E5E5';
  const innerBg = dark ? '#1F1F1F' : '#F0F0F0';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="${bg}"/>
  <rect x="30" y="30" width="${width - 60}" height="${height - 60}" fill="none" stroke="${borderCol}" stroke-width="1"/>
  <rect x="45" y="45" width="${width - 90}" height="${height - 90}" fill="${innerBg}" opacity="0.5"/>
  <circle cx="${width / 2}" cy="${height / 2 - 30}" r="70" fill="none" stroke="${borderCol}" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="${width / 2}" y="${height / 2 - 20}" text-anchor="middle" font-family="Georgia, serif" font-size="32" font-style="italic" fill="${textCol}" letter-spacing="3">${title}</text>
  <text x="${width / 2}" y="${height / 2 + 25}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" text-transform="uppercase" fill="${subCol}" letter-spacing="5">${subtitle}</text>
  <text x="${width / 2}" y="${height - 60}" text-anchor="middle" font-family="Georgia, serif" font-size="13" font-style="italic" fill="${subCol}" letter-spacing="4">L Í A   P A Z   ·   F I N E   A R T</text>
</svg>`;
}

const list = [
  ['public/images/hero/hero-main.svg', 'Momentos Eternos', 'Wedding Live Paintings & Fine Art', 1920, 1080, true],
  ['public/images/about/lia-portrait.svg', 'Lía Paz', 'Artista Visual & Pintora', 1000, 1300, false],
  ['public/images/services/wedding-live.svg', 'Wedding Live Painting', 'Pintura en Vivo para Bodas', 1200, 800, false],
  ['public/images/services/retratos.svg', 'Retratos por Encargo', 'Óleo & Técnicas Mixtas', 1200, 800, false],
  ['public/images/gallery/wedding/wedding-1.svg', 'Votos al Atardecer', 'Wedding Live Painting · Óleo', 1200, 900, false],
  ['public/images/gallery/wedding/wedding-2.svg', 'El Primer Baile', 'Wedding Live Painting · Óleo', 1200, 900, true],
  ['public/images/gallery/wedding/wedding-3.svg', 'Ceremonia en el Jardín', 'Wedding Live Painting · Acrílico', 1200, 900, false],
  ['public/images/gallery/retratos/retrato-1.svg', 'Mirada en Claroscuro', 'Retrato · Óleo sobre lino', 1000, 1200, true],
  ['public/images/gallery/retratos/retrato-2.svg', 'Silueta Matutina', 'Retrato · Grafito & Gouache', 1000, 1200, false],
  ['public/images/gallery/retratos/retrato-3.svg', 'Retrato de Familia', 'Retrato · Óleo sobre lienzo', 1200, 900, false],
  ['public/images/gallery/otros/obra-1.svg', 'Composición No. 7', 'Estudio de Formas · Óleo', 1200, 900, false],
  ['public/images/gallery/otros/obra-2.svg', 'Atmósfera & Luz', 'Paisaje Abstracto · Óleo', 1200, 800, true]
];

for (const [relPath, title, sub, w, h, dark] of list) {
  const full = path.join(__dirname, '..', relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, createSvg(title, sub, w, h, dark), 'utf8');
}

console.log('SVGs generated successfully!');

