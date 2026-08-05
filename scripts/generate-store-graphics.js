/**
 * Trak store-listing graphics generator.
 *
 * Renders the marketing images the app stores ask for (a 512x512 icon and a
 * 1024x500 feature graphic) using the same "Ring" brand mark as the app icon.
 * Re-run any time the brand geometry or copy changes — output is idempotent:
 *
 *   node scripts/generate-store-graphics.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', 'store-assets');

const BG = '#0C1210'; // near-black brand background
const GREEN = '#10B981'; // Trak brand green

/**
 * The ring glyph, centered on a square canvas.
 * Geometry designed on a 400pt grid: ring r=118, stroke 38, a 295° arc rotated
 * -12.5° leaving a gap at the top-right, and the "Trak dot" (r=19) in the gap.
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

/**
 * The 1024x500 feature graphic: near-black canvas, the ring mark left-of-center,
 * and the "Trak" wordmark + tagline to its right. The ring is drawn on its own
 * transparent square SVG (reusing the shared geometry) and composited so the
 * mark stays crisp; the wordmark uses a system sans via SVG <text>.
 */
function featureGraphicSvg() {
  const W = 1024;
  const H = 500;
  const cy = H / 2;
  // Ring block: ~200px, left-of-center with a comfortable left margin.
  const ringSize = 200;
  const ringX = 96;
  const ringY = cy - ringSize / 2;
  // Text block sits to the right of the ring.
  const textX = ringX + ringSize + 64;
  const fontStack = "system-ui, -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif";
  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <g transform="translate(${ringX},${ringY})">
    ${ringInner(ringSize)}
  </g>
  <text x="${textX}" y="${cy - 8}" font-family="${fontStack}" font-size="120" font-weight="700"
    fill="#FFFFFF" dominant-baseline="alphabetic">Trak</text>
  <text x="${textX}" y="${cy + 56}" font-family="${fontStack}" font-size="34" font-weight="400"
    fill="#9CA3AF" dominant-baseline="alphabetic">Point. Shoot. Tracked.</text>
</svg>`);
}

/** Ring glyph markup (no outer <svg>/background) for compositing into a scene. */
function ringInner(size) {
  const s = size / 400;
  const r = 118 * s;
  const stroke = 38 * s;
  const dotPos = 83.5 * s;
  const dotR = 19 * s;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const arc = circumference * (295 / 360);
  const gap = circumference - arc;
  return `<g transform="translate(${c},${c})">
    <circle r="${r}" fill="none" stroke="${GREEN}" stroke-width="${stroke}"
      stroke-linecap="round" stroke-dasharray="${arc} ${gap}" transform="rotate(-12.5)"/>
    <circle cx="${dotPos}" cy="${-dotPos}" r="${dotR}" fill="${GREEN}"/>
  </g>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  // 1. Store icon — the app icon artwork at 512x512, solid background, no alpha.
  const iconPath = path.join(OUT, 'icon-512.png');
  await sharp(ringSvg({ size: 512, color: GREEN, dotColor: GREEN, background: BG }))
    .resize(512, 512)
    .png()
    .toFile(iconPath);
  console.log('✓', iconPath, '512x512');

  // 2. Feature graphic — 1024x500 marketing banner.
  const featurePath = path.join(OUT, 'feature-graphic.png');
  await sharp(featureGraphicSvg()).png().toFile(featurePath);
  console.log('✓', featurePath, '1024x500');

  console.log('Store graphics generated in', OUT);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
