const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const W = 1122;
const H = 1402;
const cream = '#F5F2E9';
const paper = '#FCFAF4';
const green = '#3D6B4F';
const ink = '#27231D';
const muted = '#777066';

const foods = [
  ['SHRIMP', '105'],
  ['WHEY ISOLATE', '100–125'],
  ['TUNA', '115'],
  ['EGG WHITES', '120'],
  ['WHITE FISH', '120'],
  ['TURKEY BREAST', '120'],
  ['PORK TENDERLOIN', '140'],
  ['CHICKEN BREAST', '135'],
  ['0% GREEK YOGURT', '125–155'],
];

async function main() {
  const source = path.join(__dirname, 'food-photo-grid.png');
  const logo = fs.readFileSync('/Users/tien/trak/assets/images/splash-icon.png').toString('base64');
  const meta = await sharp(source).metadata();
  const cellW = Math.floor(meta.width / 3);
  const cellH = Math.floor(meta.height / 3);
  const photos = [];

  for (let i = 0; i < 9; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const tile = await sharp(source)
      .extract({ left: col * cellW, top: row * cellH, width: cellW, height: cellH })
      .resize(292, 142, { fit: 'cover' })
      .png()
      .toBuffer();
    photos.push(tile.toString('base64'));
  }

  const cards = foods.map((item, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 56 + col * 342;
    const y = 357 + row * 302;
    const clip = `photo${i}`;
    return `
      <clipPath id="${clip}"><rect x="${x + 15}" y="${y + 15}" width="292" height="142" rx="20"/></clipPath>
      <rect x="${x}" y="${y}" width="322" height="276" rx="28" fill="${paper}" stroke="#DED8CC" stroke-width="2"/>
      <image href="data:image/png;base64,${photos[i]}" x="${x + 15}" y="${y + 15}" width="292" height="142" clip-path="url(#${clip})" preserveAspectRatio="xMidYMid slice"/>
      <text x="${x + 161}" y="${y + 193}" text-anchor="middle" font-family="Arial" font-size="18" font-weight="800" letter-spacing="1.1" fill="${ink}">${item[0]}</text>
      <text x="${x + 161}" y="${y + 250}" text-anchor="middle" font-family="Georgia" font-size="46" font-weight="700" fill="${green}">${item[1]}</text>`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${cream}"/>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="9"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .03"/></feComponentTransfer></filter>
    <rect width="${W}" height="${H}" filter="url(#grain)" opacity=".4"/>

    <image href="data:image/png;base64,${logo}" x="56" y="29" width="52" height="52"/>
    <text x="122" y="75" font-family="Georgia" font-size="46" font-weight="700" fill="${ink}">Trak</text>
    <text x="56" y="177" font-family="Georgia" font-size="67" font-weight="700" fill="${ink}">Calorie-efficient</text>
    <text x="56" y="252" font-family="Georgia" font-size="67" font-weight="700" fill="${green}">protein sources.</text>

    <text x="56" y="318" font-family="Arial" font-size="25" fill="${ink}">Approximate calories needed to reach <tspan font-weight="800" fill="${green}">25g Protein.</tspan></text>

    ${cards}

    <text x="56" y="1327" font-family="Arial" font-size="17" fill="${muted}">Values vary by brand and preparation.</text>
  </svg>`;

  await sharp(Buffer.from(svg)).png().toFile(path.join(__dirname, 'trak-protein-sources-v2.png'));
}

main().catch((error) => { console.error(error); process.exit(1); });
