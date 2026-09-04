const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = __dirname;
const W = 1122;
const H = 1402;
const cream = '#F5F2E9';
const paper = '#FBF8F0';
const green = '#3D6B4F';
const sage = '#DCE7D2';
const ink = '#27231D';
const muted = '#6B665D';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const lines = (items, x, y, size, gap, opts = {}) => items.map((t, i) =>
  `<text x="${x}" y="${y + i * gap}" font-family="${opts.font || 'Georgia'}" font-size="${size}" font-weight="${opts.weight || 700}" fill="${opts.fill || ink}" ${opts.anchor ? `text-anchor="${opts.anchor}"` : ''}>${esc(t)}</text>`
).join('');

const header = (section, n) => `
  <text x="58" y="78" font-family="Georgia" font-size="46" font-weight="700" fill="${ink}">Trak</text>
  <text x="1064" y="76" text-anchor="end" font-family="Arial" font-size="19" font-weight="700" letter-spacing="3" fill="${green}">${esc(section.toUpperCase())}</text>
  <text x="58" y="1342" font-family="Arial" font-size="20" fill="${ink}">@trakwithyou</text>
  <text x="1064" y="1342" text-anchor="end" font-family="Arial" font-size="20" font-weight="700" fill="${ink}">${String(n).padStart(2, '0')} / 08  →</text>`;

const bg = () => `<rect width="${W}" height="${H}" fill="${cream}"/><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="2" seed="7"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .035"/></feComponentTransfer></filter><rect width="${W}" height="${H}" filter="url(#grain)" opacity=".45"/>`;

const wrap = (text, max) => {
  const words = text.split(/\s+/); const out = []; let row = '';
  for (const word of words) { const next = row ? `${row} ${word}` : word; if (next.length > max && row) { out.push(row); row = word; } else row = next; }
  if (row) out.push(row); return out;
};

const foodRow = (y, index, name, calories, note) => `
  <rect x="58" y="${y}" width="1006" height="214" rx="30" fill="${paper}" stroke="#DDD8CB"/>
  <circle cx="126" cy="${y + 70}" r="31" fill="${sage}"/><text x="126" y="${y + 78}" text-anchor="middle" font-family="Arial" font-size="22" font-weight="800" fill="${green}">0${index}</text>
  <text x="181" y="${y + 78}" font-family="Georgia" font-size="43" font-weight="700" fill="${ink}">${esc(name)}</text>
  <text x="181" y="${y + 128}" font-family="Arial" font-size="20" fill="${muted}">${esc(note)}</text>
  <text x="1006" y="${y + 87}" text-anchor="end" font-family="Georgia" font-size="65" font-weight="700" fill="${green}">${esc(calories)}</text>
  <text x="1006" y="${y + 130}" text-anchor="end" font-family="Arial" font-size="19" font-weight="700" letter-spacing="2" fill="${muted}">KCAL / 25 G PROTEIN</text>`;

async function render(name, body) {
  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(OUT, name));
}

async function main() {
  const hero = fs.readFileSync(path.join(OUT, 'protein-flatlay.png')).toString('base64');

  await render('01-cover.png', `${bg()}
    <clipPath id="photo"><rect x="0" y="690" width="1122" height="712"/></clipPath>
    <image href="data:image/png;base64,${hero}" x="0" y="0" width="1122" height="1402" preserveAspectRatio="xMidYMid slice" clip-path="url(#photo)"/>
    <rect x="0" y="650" width="1122" height="125" fill="url(#fade)" opacity=".8"/>
    <defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${cream}"/><stop offset="1" stop-color="${cream}" stop-opacity="0"/></linearGradient></defs>
    ${header('Protein, made practical', 1)}
    ${lines(['9 protein sources', 'that give you more', 'protein per calorie.'], 58, 244, 78, 91, {fill: ink})}
    <rect x="58" y="558" width="561" height="60" rx="30" fill="${sage}"/><text x="338" y="597" text-anchor="middle" font-family="Arial" font-size="23" font-weight="700" fill="${green}">COMPARED AT 25 G PROTEIN</text>`);

  await render('02-what-it-means.png', `${bg()}${header('First, the definition', 2)}
    ${lines(['“Protein-efficient”', 'simply means…'], 58, 255, 79, 92)}
    <rect x="58" y="490" width="1006" height="330" rx="36" fill="${green}"/>
    <text x="561" y="604" text-anchor="middle" font-family="Arial" font-size="23" font-weight="700" letter-spacing="3" fill="${sage}">THE COMPARISON</text>
    <text x="561" y="702" text-anchor="middle" font-family="Georgia" font-size="70" font-weight="700" fill="#FFFDF8">Calories needed</text>
    <text x="561" y="785" text-anchor="middle" font-family="Georgia" font-size="70" font-weight="700" fill="#FFFDF8">to reach 25 g protein</text>
    ${lines(wrap('It does not mean “healthier.” It is just a useful way to compare protein sources when your calorie budget is tighter.', 53), 58, 950, 31, 45, {font:'Arial', weight:400, fill:ink})}
    <rect x="58" y="1162" width="1006" height="76" rx="20" fill="${sage}"/><text x="561" y="1210" text-anchor="middle" font-family="Arial" font-size="23" font-weight="700" fill="${green}">VALUES ARE TYPICAL — BRANDS + PREPARATION VARY</text>`);

  await render('03-seafood.png', `${bg()}${header('01 — Seafood', 3)}
    ${lines(['Big protein.', 'Relatively few calories.'], 58, 220, 72, 84)}
    ${foodRow(455, 1, 'Shrimp', '≈105', 'cooked, plain')}
    ${foodRow(695, 2, 'Tuna', '≈115', 'canned in water, drained')}
    ${foodRow(935, 3, 'White fish', '≈120', 'tilapia or similar, cooked')}`);

  await render('04-poultry-pork.png', `${bg()}${header('02 — Poultry + pork', 4)}
    ${lines(['Lean cuts make', 'the difference.'], 58, 220, 72, 84)}
    ${foodRow(455, 4, 'Turkey breast', '≈120', 'skinless, cooked')}
    ${foodRow(695, 5, 'Chicken breast', '≈135', 'skinless, cooked')}
    ${foodRow(935, 6, 'Pork tenderloin', '≈140', 'lean, cooked')}`);

  await render('05-easy-staples.png', `${bg()}${header('03 — Easy staples', 5)}
    ${lines(['Fast, flexible', 'protein options.'], 58, 220, 72, 84)}
    ${foodRow(455, 7, 'Egg whites', '≈120', 'cooked without added oil')}
    ${foodRow(695, 8, 'Whey isolate', '≈100–125', 'depends on brand + flavour')}
    ${foodRow(935, 9, '0% Greek yogurt', '≈125–155', 'depends on brand + thickness')}`);

  await render('06-why-numbers-change.png', `${bg()}${header('Why the numbers change', 6)}
    ${lines(['Fat matters.', 'But it is not', 'the whole story.'], 58, 220, 72, 84)}
    <text x="58" y="555" font-family="Georgia" font-size="112" font-weight="700" fill="${green}">9</text><text x="145" y="555" font-family="Arial" font-size="25" font-weight="700" fill="${ink}">kcal per gram of fat</text>
    <text x="58" y="677" font-family="Georgia" font-size="112" font-weight="700" fill="${ink}">4</text><text x="145" y="677" font-family="Arial" font-size="25" font-weight="700" fill="${ink}">kcal per gram of protein or carbohydrate</text>
    <line x1="58" y1="744" x2="1064" y2="744" stroke="#CFC8BA"/>
    <text x="58" y="817" font-family="Arial" font-size="22" font-weight="700" letter-spacing="2" fill="${green}">ALSO CHANGES THE TOTAL</text>
    ${lines(['• the cut and fat content', '• water lost during cooking', '• added oil, sauces and breading', '• the specific brand or recipe'], 58, 885, 31, 62, {font:'Arial', weight:400})}
    <rect x="58" y="1172" width="1006" height="84" rx="22" fill="${sage}"/><text x="561" y="1225" text-anchor="middle" font-family="Arial" font-size="23" font-weight="700" fill="${green}">COMPARE LIKE WITH LIKE: RAW WITH RAW, COOKED WITH COOKED</text>`);

  await render('07-build-meals.png', `${bg()}${header('Use the list — do not obey it', 7)}
    ${lines(['Build meals.', 'Not food rankings.'], 58, 220, 79, 92)}
    <rect x="58" y="494" width="1006" height="476" rx="38" fill="${paper}" stroke="#DDD8CB"/>
    <circle cx="175" cy="622" r="63" fill="${green}"/><text x="175" y="637" text-anchor="middle" font-family="Georgia" font-size="52" font-weight="700" fill="#FFF">1</text><text x="276" y="618" font-family="Georgia" font-size="42" font-weight="700" fill="${ink}">Choose a protein</text><text x="276" y="661" font-family="Arial" font-size="23" fill="${muted}">one you enjoy and can afford</text>
    <circle cx="175" cy="770" r="63" fill="${sage}"/><text x="175" y="785" text-anchor="middle" font-family="Georgia" font-size="52" font-weight="700" fill="${green}">2</text><text x="276" y="766" font-family="Georgia" font-size="42" font-weight="700" fill="${ink}">Add plants + carbs</text><text x="276" y="809" font-family="Arial" font-size="23" fill="${muted}">for fibre, energy and volume</text>
    <circle cx="175" cy="918" r="63" fill="#EADCCB"/><text x="175" y="933" text-anchor="middle" font-family="Georgia" font-size="52" font-weight="700" fill="${ink}">3</text><text x="276" y="914" font-family="Georgia" font-size="42" font-weight="700" fill="${ink}">Add flavour + fats</text><text x="276" y="957" font-family="Arial" font-size="23" fill="${muted}">and count them when useful</text>
    ${lines(wrap('Lean protein is a tool, not a rule. Salmon, eggs, tofu, beans and higher-fat meats can all belong in a balanced diet.', 56), 58, 1090, 29, 43, {font:'Arial', weight:400})}`);

  await render('08-takeaway.png', `${bg()}${header('The practical takeaway', 8)}
    ${lines(['Pick 2–3', 'protein staples', 'you actually like.'], 58, 240, 82, 95)}
    <rect x="58" y="597" width="1006" height="282" rx="36" fill="${green}"/>
    <text x="561" y="684" text-anchor="middle" font-family="Arial" font-size="22" font-weight="700" letter-spacing="3" fill="${sage}">WHEN COMPARING LABELS</text>
    <text x="561" y="779" text-anchor="middle" font-family="Georgia" font-size="57" font-weight="700" fill="#FFFDF8">More protein for similar</text>
    <text x="561" y="846" text-anchor="middle" font-family="Georgia" font-size="57" font-weight="700" fill="#FFFDF8">calories = more efficient</text>
    ${lines(['Save this for your next grocery shop.', 'Send it to someone building higher-protein meals.'], 58, 1030, 32, 54, {font:'Arial', weight:500})}
    <rect x="58" y="1190" width="365" height="58" rx="29" fill="${sage}"/><text x="241" y="1227" text-anchor="middle" font-family="Arial" font-size="21" font-weight="700" fill="${green}">SAVE + SHARE</text>`);
}

main().catch((error) => { console.error(error); process.exit(1); });
