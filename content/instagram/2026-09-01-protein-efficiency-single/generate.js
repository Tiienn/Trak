const sharp = require('sharp');
const path = require('path');

const W = 1122;
const H = 1402;
const cream = '#F5F2E9';
const paper = '#FCF9F1';
const green = '#3D6B4F';
const sage = '#DDE8D4';
const ink = '#27231D';
const muted = '#706A60';

const foods = [
  ['SHRIMP', '≈105'],
  ['WHEY ISOLATE', '≈100–125'],
  ['TUNA', '≈115'],
  ['EGG WHITES', '≈120'],
  ['WHITE FISH', '≈120'],
  ['TURKEY BREAST', '≈120'],
  ['PORK TENDERLOIN', '≈140'],
  ['CHICKEN BREAST', '≈135'],
  ['0% GREEK YOGURT', '≈125–155'],
];

const icons = ['S', 'W', 'T', 'E', 'F', 'T', 'P', 'C', 'Y'];

function card(item, i) {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const x = 56 + col * 342;
  const y = 446 + row * 264;
  return `
    <rect x="${x}" y="${y}" width="322" height="232" rx="28" fill="${paper}" stroke="#DDD7C9" stroke-width="2"/>
    <circle cx="${x + 161}" cy="${y + 66}" r="39" fill="${sage}"/>
    <text x="${x + 161}" y="${y + 78}" text-anchor="middle" font-family="Georgia" font-size="34" font-weight="700" fill="${green}">${icons[i]}</text>
    <text x="${x + 161}" y="${y + 132}" text-anchor="middle" font-family="Arial" font-size="18" font-weight="800" letter-spacing="1.3" fill="${ink}">${item[0]}</text>
    <text x="${x + 161}" y="${y + 190}" text-anchor="middle" font-family="Georgia" font-size="47" font-weight="700" fill="${green}">${item[1]}</text>
    <text x="${x + 161}" y="${y + 216}" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" letter-spacing="1.5" fill="${muted}">CALORIES</text>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${cream}"/>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="9"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .035"/></feComponentTransfer></filter>
  <rect width="${W}" height="${H}" filter="url(#grain)" opacity=".45"/>

  <text x="56" y="76" font-family="Georgia" font-size="46" font-weight="700" fill="${ink}">Trak</text>
  <text x="1066" y="74" text-anchor="end" font-family="Arial" font-size="18" font-weight="800" letter-spacing="3" fill="${green}">PROTEIN, MADE PRACTICAL</text>

  <text x="56" y="188" font-family="Georgia" font-size="69" font-weight="700" fill="${ink}">Calorie-efficient</text>
  <text x="56" y="268" font-family="Georgia" font-size="69" font-weight="700" fill="${green}">protein sources.</text>
  <text x="56" y="326" font-family="Arial" font-size="27" fill="${ink}">Approximate calories needed to reach</text>
  <rect x="571" y="294" width="235" height="48" rx="24" fill="${sage}"/>
  <text x="689" y="326" text-anchor="middle" font-family="Arial" font-size="24" font-weight="800" fill="${green}">25 G PROTEIN</text>
  <text x="56" y="382" font-family="Arial" font-size="18" fill="${muted}">Plain, lean preparations. Brands and cooking methods vary.</text>

  ${foods.map(card).join('')}

  <rect x="56" y="1263" width="1010" height="62" rx="20" fill="${sage}"/>
  <text x="561" y="1302" text-anchor="middle" font-family="Arial" font-size="19" font-weight="700" fill="${green}">LEAN PROTEIN IS A USEFUL TOOL — NOT A FOOD RANKING</text>
  <text x="56" y="1365" font-family="Arial" font-size="19" fill="${ink}">@trakwithyou</text>
  <text x="1066" y="1365" text-anchor="end" font-family="Arial" font-size="18" font-weight="700" fill="${ink}">SAVE FOR LATER</text>
</svg>`;

sharp(Buffer.from(svg)).png().toFile(path.join(__dirname, 'trak-protein-sources.png'));
