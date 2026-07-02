/**
 * Trak icon & splash asset generator.
 *
 * Renders the "Ring" brand mark (green progress ring + dot on near-black)
 * into every image the app needs. Re-run after any design tweak:
 *
 *   node scripts/generate-icon-assets.js
 */
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', 'assets', 'images');

const BG = '#0C1210'; // near-black brand background
const GREEN = '#22C55E'; // Trak brand green

/**
 * The ring glyph, centered on a square canvas.
 * Geometry was designed on a 400pt grid: ring r=118, stroke 38, a 65° gap at
 * the top-right, and the "Trak dot" (r=19) sitting in the gap.
 */
function ringSvg({ size, color, dotColor, scale = 1, background = null }) {
  const s = (size / 400) * scale;
  const r = 118 * s;
  const stroke = 38 * s;
  const dotPos = 83.5 * s;
  const dotR = 19 * s;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const arc = circumference * (295 / 360);
  const gap = circumference - arc;
  return Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  ${background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ''}
  <g transform="translate(${c},${c})">
    <circle r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
      stroke-linecap="round" stroke-dasharray="${arc} ${gap}" transform="rotate(-12.5)"/>
    <circle cx="${dotPos}" cy="${-dotPos}" r="${dotR}" fill="${dotColor}"/>
  </g>
</svg>`);
}

const solidSvg = (size, fill) =>
  Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" fill="${fill}"/></svg>`);

async function write(svg, file, size) {
  await sharp(svg).resize(size, size).png().toFile(path.join(OUT, file));
  console.log('✓', file, `${size}x${size}`);
}

(async () => {
  // Main app icon (full-bleed; stores round the corners themselves)
  const icon = ringSvg({ size: 1024, color: GREEN, dotColor: GREEN, background: BG });
  await write(icon, 'icon.png', 1024);

  // Android adaptive icon layers. The glyph is scaled to ~85% so it stays
  // inside the adaptive-icon safe zone under any launcher mask shape.
  await write(
    ringSvg({ size: 1024, color: GREEN, dotColor: GREEN, scale: 0.85 }),
    'android-icon-foreground.png',
    1024
  );
  await write(solidSvg(1024, BG), 'android-icon-background.png', 1024);
  await write(
    ringSvg({ size: 1024, color: '#FFFFFF', dotColor: '#FFFFFF', scale: 0.85 }),
    'android-icon-monochrome.png',
    1024
  );

  // Splash glyph (transparent; shown centered on the splash backgroundColor)
  await write(ringSvg({ size: 512, color: GREEN, dotColor: GREEN }), 'splash-icon.png', 512);

  // Web favicon
  await write(icon, 'favicon.png', 48);

  console.log('All Trak brand assets generated.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
