const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const W = 1122;
const H = 1402;
const cream = '#F5F2E9';
const paper = '#FCFAF4';
const green = '#3D6B4F';
const sage = '#DCE7D2';
const ink = '#27231D';
const muted = '#6F695F';

async function main() {
  const photo = fs.readFileSync(path.join(__dirname, 'protein-balance.png')).toString('base64');
  const practicalPhoto = fs.readFileSync(path.join(__dirname, 'protein-barbecue.png')).toString('base64');
  const logo = fs.readFileSync('/Users/tien/trak/assets/images/splash-icon.png').toString('base64');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${cream}"/>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="11"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .03"/></feComponentTransfer></filter>
    <rect width="${W}" height="${H}" filter="url(#grain)" opacity=".4"/>

    <image href="data:image/png;base64,${logo}" x="56" y="30" width="52" height="52"/>
    <text x="122" y="76" font-family="Georgia" font-size="46" font-weight="700" fill="${ink}">Trak</text>

    <rect x="56" y="131" width="520" height="62" rx="22" fill="${green}"/>
    <text x="316" y="171" text-anchor="middle" font-family="Arial" font-size="22" font-weight="800" letter-spacing="3" fill="#FFFDF8">PROTEIN: MYTH VS EVIDENCE</text>
    <text x="56" y="255" font-family="Georgia" font-size="61" font-weight="700" fill="${ink}">You may not need</text>
    <text x="56" y="322" font-family="Georgia" font-size="61" font-weight="700" fill="${green}">1g of protein per lb</text>
    <text x="56" y="389" font-family="Georgia" font-size="61" font-weight="700" fill="${ink}">to build muscle.</text>

    <clipPath id="photoClip"><rect x="56" y="425" width="1010" height="452" rx="32"/></clipPath>
    <image href="data:image/png;base64,${photo}" x="56" y="0" width="1010" height="1263" preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)"/>

    <rect x="56" y="908" width="487" height="226" rx="30" fill="${paper}" stroke="#DCD5C8" stroke-width="2"/>
    <text x="91" y="958" font-family="Arial" font-size="17" font-weight="800" letter-spacing="2" fill="${muted}">POPULAR RULE</text>
    <text x="91" y="1037" font-family="Georgia" font-size="63" font-weight="700" fill="${ink}">1.0 g/lb</text>
    <text x="91" y="1092" font-family="Arial" font-size="24" font-weight="700" fill="${muted}">2.2 g/kg per day</text>

    <rect x="579" y="908" width="487" height="226" rx="30" fill="${green}"/>
    <text x="614" y="958" font-family="Arial" font-size="17" font-weight="800" letter-spacing="2" fill="${sage}">RESEARCH ESTIMATE</text>
    <text x="614" y="1037" font-family="Georgia" font-size="63" font-weight="700" fill="#FFFDF8">0.7 g/lb</text>
    <text x="614" y="1092" font-family="Arial" font-size="24" font-weight="700" fill="${sage}">1.6 g/kg per day</text>

    <text x="56" y="1210" font-family="Georgia" font-size="29" font-weight="700" fill="${ink}">More protein is fine. <tspan fill="${green}">It may not mean more muscle.</tspan></text>
    <text x="56" y="1264" font-family="Arial" font-size="20" fill="${muted}">For many healthy adults doing consistent resistance training.</text>
    <text x="56" y="1344" font-family="Arial" font-size="16" fill="${muted}">Source: Morton et al., BJSM (2018) · PMID 28698222</text>
  </svg>`;

  await sharp(Buffer.from(svg)).png().toFile(path.join(__dirname, '01-protein-target.png'));

  const slide2 = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${cream}"/>
    <image href="data:image/png;base64,${practicalPhoto}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>
    <rect x="0" y="0" width="${W}" height="${H}" fill="#15241B" opacity=".10"/>

    <rect x="54" y="64" width="700" height="666" rx="34" fill="${green}"/>
    <text x="96" y="154" font-family="Arial" font-size="21" font-weight="800" letter-spacing="3" fill="${sage}">HOW DOES THIS APPLY?</text>

    <text x="96" y="267" font-family="Georgia" font-size="55" font-weight="700" fill="#FFFDF8">Eating 1g per lb</text>
    <text x="96" y="335" font-family="Georgia" font-size="55" font-weight="700" fill="#FFFDF8">is completely fine.</text>
    <text x="96" y="423" font-family="Georgia" font-size="43" font-weight="400" fill="${sage}">It just may not build</text>
    <text x="96" y="480" font-family="Georgia" font-size="43" font-weight="400" fill="${sage}">more muscle than</text>
    <text x="96" y="548" font-family="Georgia" font-size="61" font-weight="700" fill="#FFFDF8">0.7g per lb.</text>

    <line x1="96" y1="587" x2="712" y2="587" stroke="${sage}" stroke-width="2" opacity=".65"/>
    <text x="96" y="626" font-family="Arial" font-size="16" font-weight="800" letter-spacing="2" fill="${sage}">THE EXTRA ROOM CAN GO TO</text>
    <text x="96" y="674" font-family="Georgia" font-size="28" font-weight="700" fill="#FFFDF8">carbs, fats, fruits and vegetables.</text>
  </svg>`;

  await sharp(Buffer.from(slide2)).png().toFile(path.join(__dirname, '02-how-it-applies.png'));
}

main().catch((error) => { console.error(error); process.exit(1); });
