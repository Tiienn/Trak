/**
 * Generate the 2026 Google Play phone screenshot set.
 *
 * Uses real Trak captures for the core UI panels and a code-rendered History
 * preview that mirrors src/app/history.tsx. Output: 1080x1920, 9:16, opaque PNG.
 *
 *   node scripts/generate-play-screenshots.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'store-assets', 'google-play-2026');
const SOURCE = path.join(OUT, 'source');
const W = 1080;
const H = 1920;

const colors = {
  forest: '#214B38',
  forestDark: '#122A20',
  cream: '#F5F2E9',
  ink: '#2B2721',
  terracotta: '#D97843',
  lime: '#9CB53E',
  gold: '#E6BE4C',
  white: '#FFFFFF',
  muted: '#8A8274',
};

const captures = {
  home: path.join(ROOT, 'store-assets', 'screenshots', '1-home.png'),
  chat: path.join(ROOT, 'store-assets', 'screenshots', '2-chat.png'),
  games: path.join(ROOT, 'store-assets', 'ios', '03-games.png'),
  hero: path.join(SOURCE, 'food-hero.png'),
};

function xml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function textSvg({ title, eyebrow = 'TRAK', subtitle = '', color = colors.cream, align = 'left' }) {
  const lines = title.split('\n');
  const anchor = align === 'center' ? 'middle' : 'start';
  const x = align === 'center' ? W / 2 : 78;
  const titleLines = lines
    .map((line, index) => `<text x="${x}" y="${185 + index * 82}" text-anchor="${anchor}" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="800" letter-spacing="-2" fill="${color}">${xml(line)}</text>`)
    .join('');
  const subtitleY = 185 + lines.length * 82 + 8;
  return Buffer.from(`<svg width="${W}" height="390" xmlns="http://www.w3.org/2000/svg">
    <text x="${x}" y="76" text-anchor="${anchor}" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="800" letter-spacing="5" fill="${color}" opacity="0.76">${xml(eyebrow)}</text>
    ${titleLines}
    ${subtitle ? `<text x="${x}" y="${subtitleY}" text-anchor="${anchor}" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="600" fill="${color}" opacity="0.78">${xml(subtitle)}</text>` : ''}
  </svg>`);
}

function backgroundSvg(top, bottom = top) {
  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <circle cx="980" cy="220" r="310" fill="#FFFFFF" opacity="0.035"/>
    <circle cx="75" cy="1750" r="420" fill="#000000" opacity="0.04"/>
  </svg>`);
}

async function roundedScreenshot(file, width, radius = 54, extract) {
  let image = sharp(file);
  if (extract) image = image.extract(extract);
  const metadata = await image.metadata();
  const sourceWidth = extract?.width ?? metadata.width;
  const sourceHeight = extract?.height ?? metadata.height;
  const height = Math.round((sourceHeight / sourceWidth) * width);
  const resized = await image.resize({ width }).ensureAlpha().png().toBuffer();
  const mask = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="${height}" rx="${radius}" fill="#fff"/></svg>`);
  return sharp(resized).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

function shadowSvg(x, y, width, height, radius = 54) {
  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="s" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#000" flood-opacity=".26"/></filter></defs><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="#000" opacity=".24" filter="url(#s)"/></svg>`);
}

async function standardPanel({ fileName, title, subtitle, background, background2, textColor, capture, captureWidth = 850, captureY = 395, extract }) {
  const ui = await roundedScreenshot(capture, captureWidth, 54, extract);
  const meta = await sharp(ui).metadata();
  const x = Math.round((W - captureWidth) / 2);
  await sharp({ create: { width: W, height: H, channels: 3, background } })
    .composite([
      { input: backgroundSvg(background, background2), top: 0, left: 0 },
      { input: textSvg({ title, subtitle, color: textColor }), top: 0, left: 0 },
      { input: shadowSvg(x, captureY, captureWidth, meta.height), top: 0, left: 0 },
      { input: ui, top: captureY, left: x },
    ])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, fileName));
}

function scanOverlaySvg() {
  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#08130F" stop-opacity=".90"/><stop offset=".48" stop-color="#08130F" stop-opacity=".25"/><stop offset="1" stop-color="#08130F" stop-opacity=".72"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#shade)"/>
    <g stroke="#F5F2E9" stroke-width="10" stroke-linecap="round" fill="none">
      <path d="M236 760v-92q0-36 36-36h92"/><path d="M844 760v-92q0-36-36-36h-92"/>
      <path d="M236 1240v92q0 36 36 36h92"/><path d="M844 1240v92q0 36-36 36h-92"/>
    </g>
    <rect x="256" y="1480" width="568" height="132" rx="66" fill="#F5F2E9"/>
    <circle cx="338" cy="1546" r="31" fill="#3D6B4F"/>
    <circle cx="338" cy="1546" r="12" fill="none" stroke="#F5F2E9" stroke-width="6"/>
    <text x="390" y="1565" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="800" fill="#214B38">Scan a meal</text>
  </svg>`);
}

async function heroPanel() {
  const photo = await sharp(captures.hero).resize(W, H, { fit: 'cover' }).png().toBuffer();
  await sharp(photo)
    .composite([
      { input: scanOverlaySvg(), top: 0, left: 0 },
      { input: textSvg({ title: 'Scan meals\nin seconds', subtitle: 'Camera-powered calorie and macro estimates', color: colors.cream }), top: 0, left: 0 },
    ])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, '01-scan-meals.png'));
}

function historyPreviewSvg() {
  const calendarDays = [
    ['', '', '', '', '', '1', '2'], ['3', '4', '5', '6', '7', '8', '9'],
    ['10', '11', '12', '13', '14', '15', '16'], ['17', '18', '19', '20', '21', '22', '23'],
    ['24', '25', '26', '27', '28', '29', '30'], ['31', '', '', '', '', '', ''],
  ];
  let days = '';
  calendarDays.forEach((week, row) => week.forEach((day, col) => {
    if (!day) return;
    const x = 98 + col * 90;
    const y = 245 + row * 68;
    const selected = day === '20';
    days += `${selected ? `<circle cx="${x}" cy="${y - 7}" r="27" fill="#3D6B4F"/>` : ''}<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial" font-size="23" font-weight="700" fill="${selected ? '#fff' : '#2B2721'}">${day}</text>${['4','8','12','18','20'].includes(day) ? `<circle cx="${x}" cy="${y + 19}" r="4" fill="#D97843"/>` : ''}`;
  }));
  return Buffer.from(`<svg width="820" height="1370" xmlns="http://www.w3.org/2000/svg">
    <rect width="820" height="1370" rx="58" fill="#F5F2E9"/>
    <text x="62" y="92" font-family="Georgia, serif" font-size="54" font-weight="700" fill="#2B2721">History</text>
    <rect x="56" y="130" width="708" height="550" rx="32" fill="#FFFFFF"/>
    <text x="410" y="186" text-anchor="middle" font-family="Arial" font-size="25" font-weight="800" fill="#2B2721">August 2026</text>
    <g font-family="Arial" font-size="16" font-weight="800" fill="#8A8274">${['S','M','T','W','T','F','S'].map((d,i)=>`<text x="${98+i*90}" y="220" text-anchor="middle">${d}</text>`).join('')}</g>
    ${days}
    <text x="62" y="740" font-family="Georgia, serif" font-size="36" font-weight="700" fill="#2B2721">Thursday, August 20</text>
    <rect x="56" y="774" width="708" height="200" rx="34" fill="#2C5039"/>
    <text x="96" y="825" font-family="Arial" font-size="15" font-weight="800" letter-spacing="2" fill="#D8E8DC">TRAK SCORE</text>
    <text x="94" y="927" font-family="Georgia, serif" font-size="105" font-weight="700" fill="#FFFFFF">82</text>
    <text x="714" y="860" text-anchor="end" font-family="Arial" font-size="42" font-weight="800" fill="#FFFFFF">1,840</text>
    <text x="714" y="900" text-anchor="end" font-family="Arial" font-size="20" fill="#D8E8DC">of 2,160 kcal</text>
    ${[['Protein','128g','#DE7A3D'],['Carbs','184g','#9CB53E'],['Fat','61g','#E6BE4C']].map((m,i)=>`<rect x="${56+i*241}" y="1000" width="225" height="142" rx="25" fill="#FFFFFF"/><circle cx="${84+i*241}" cy="1030" r="6" fill="${m[2]}"/><text x="${82+i*241}" y="1090" font-family="Arial" font-size="30" font-weight="800" fill="#2B2721">${m[1]}</text><text x="${82+i*241}" y="1122" font-family="Arial" font-size="16" fill="#8A8274">${m[0]}</text>`).join('')}
    <rect x="56" y="1172" width="708" height="130" rx="28" fill="#FFFFFF"/>
    <text x="105" y="1227" font-family="Arial" font-size="27" font-weight="800" fill="#3D6B4F">8/8</text><text x="105" y="1260" font-family="Arial" font-size="16" fill="#8A8274">water</text>
    <text x="355" y="1227" font-family="Arial" font-size="27" font-weight="800" fill="#3D6B4F">3/3</text><text x="355" y="1260" font-family="Arial" font-size="16" fill="#8A8274">supplements</text>
    <text x="612" y="1227" font-family="Arial" font-size="27" font-weight="800" fill="#3D6B4F">320</text><text x="612" y="1260" font-family="Arial" font-size="16" fill="#8A8274">kcal burned</text>
  </svg>`);
}

async function historyPanel() {
  const ui = await sharp(historyPreviewSvg()).png().toBuffer();
  await sharp({ create: { width: W, height: H, channels: 3, background: colors.cream } })
    .composite([
      { input: backgroundSvg(colors.cream, '#E8E1D2'), top: 0, left: 0 },
      { input: textSvg({ title: 'See progress\nby day', subtitle: 'Calendar history and personal records', color: colors.forestDark }), top: 0, left: 0 },
      { input: shadowSvg(130, 392, 820, 1370, 58), top: 0, left: 0 },
      { input: ui, top: 392, left: 130 },
    ])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, '06-history.png'));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await heroPanel();
  await standardPanel({ fileName: '02-dashboard.png', title: 'Know calories\n& macros', subtitle: 'Your daily targets at a glance', background: colors.terracotta, background2: '#B95E33', textColor: colors.cream, capture: captures.home, captureWidth: 850, captureY: 390 });
  await standardPanel({ fileName: '03-chat-log.png', title: 'Log meals in\nplain words', subtitle: 'Type what you ate—Trak estimates the rest', background: colors.forest, background2: colors.forestDark, textColor: colors.cream, capture: captures.chat, captureWidth: 850, captureY: 390 });
  await standardPanel({ fileName: '04-macro-focus.png', title: 'Stay on track\nthrough the day', subtitle: 'Score, protein, carbs and fat together', background: colors.gold, background2: '#D9A92C', textColor: colors.ink, capture: captures.home, captureWidth: 930, captureY: 405, extract: { left: 0, top: 210, width: 1080, height: 1750 } });
  await standardPanel({ fileName: '05-food-games.png', title: 'Learn portions\nby playing', subtitle: 'Practice with foods you actually eat', background: colors.lime, background2: '#718D29', textColor: colors.ink, capture: captures.games, captureWidth: 850, captureY: 390, extract: { left: 0, top: 180, width: 1320, height: 2500 } });
  await historyPanel();
  console.log(`Generated 6 Google Play screenshots in ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
