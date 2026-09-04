const sharp = require('sharp');
const path = require('path');

const dir = __dirname;
const W = 1080;
const H = 1350;
const cream = '#F5F2E9';
const green = '#3D6B4F';
const ink = '#27231D';
const muted = '#726B61';
const line = '#D8D1C4';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const drinks = [
  { name: 'BLACK COFFEE', each: '~5', week: '~35' },
  { name: 'CAPPUCCINO', each: '~140', week: '~980' },
  { name: 'CARAMEL MACCHIATO', each: '~250', week: '~1,750' },
  { name: 'MOCHA FRAPPUCCINO', each: '~370', week: '~2,590' },
];

async function main() {
  const photo = await sharp(path.join(dir, 'coffee-row.png'))
    .resize(970, 315, { fit: 'cover', position: 'centre' })
    .composite([{ input: Buffer.from('<svg width="970" height="315"><rect width="970" height="315" rx="28" fill="white"/></svg>'), blend: 'dest-in' }])
    .png()
    .toBuffer();

  const logo = await sharp('/Users/tien/trak/assets/images/splash-icon.png')
    .resize(44, 44)
    .png()
    .toBuffer();

  const cardX = [55, 302, 549, 796];
  const cards = drinks.map((d, i) => {
    const x = cardX[i];
    return `
      <rect x="${x}" y="710" width="229" height="360" rx="24" fill="#FBF9F3" stroke="${line}" stroke-width="2"/>
      <text x="${x + 114.5}" y="763" class="label" text-anchor="middle">${esc(d.name)}</text>
      <text x="${x + 114.5}" y="844" class="number" text-anchor="middle">${d.each}</text>
      <text x="${x + 114.5}" y="878" class="small" text-anchor="middle">CAL / CUP</text>
      <line x1="${x + 28}" y1="918" x2="${x + 201}" y2="918" stroke="${line}" stroke-width="2"/>
      <text x="${x + 114.5}" y="990" class="week" text-anchor="middle">${d.week}</text>
      <text x="${x + 114.5}" y="1024" class="small" text-anchor="middle">CAL / WEEK</text>`;
  }).join('');

  const svg = Buffer.from(`
  <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <style>
      .brand { font: 700 40px Georgia, serif; fill: ${ink}; }
      .eyebrow { font: 700 19px Arial, sans-serif; letter-spacing: 3px; fill: ${green}; }
      .title { font: 700 68px Georgia, serif; fill: ${ink}; }
      .subtitle { font: 400 25px Arial, sans-serif; fill: ${muted}; }
      .label { font: 700 17px Arial, sans-serif; letter-spacing: 1.2px; fill: ${ink}; }
      .number { font: 700 54px Georgia, serif; fill: ${green}; }
      .week { font: 700 45px Georgia, serif; fill: ${ink}; }
      .small { font: 700 14px Arial, sans-serif; letter-spacing: 1.4px; fill: ${muted}; }
      .barTitle { font: 700 30px Georgia, serif; fill: #FFFDF8; }
      .barText { font: 400 20px Arial, sans-serif; fill: #E9F0E7; }
      .footer { font: 400 17px Arial, sans-serif; fill: ${muted}; }
      .handle { font: 700 17px Arial, sans-serif; fill: ${green}; }
    </style>
    <text x="112" y="78" class="brand">Trak</text>
    <text x="55" y="153" class="eyebrow">COFFEE, MADE PRACTICAL</text>
    <text x="55" y="231" class="title">Same coffee habit.</text>
    <text x="55" y="303" class="title" fill="${green}">Very different calories.</text>
    <text x="55" y="344" class="subtitle">Starbucks Grande: 473 ml (16 fl oz).</text>
    ${cards}
    <rect x="55" y="1110" width="970" height="142" rx="28" fill="${green}"/>
    <text x="88" y="1163" class="barTitle">What goes into the cup matters.</text>
    <text x="88" y="1205" class="barText">Milk, syrup and toppings can turn coffee into a snack—or dessert.</text>
    <text x="55" y="1302" class="footer">Standard U.S. recipes. Customizations vary. 7 cups per week.</text>
    <text x="1025" y="1302" class="handle" text-anchor="end">@trakwithyou</text>
  </svg>`);

  await sharp({ create: { width: W, height: H, channels: 4, background: cream } })
    .composite([
      { input: photo, left: 55, top: 375 },
      { input: svg, left: 0, top: 0 },
      { input: logo, left: 55, top: 45 },
    ])
    .png()
    .toFile(path.join(dir, 'trak-coffee-calories.png'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
