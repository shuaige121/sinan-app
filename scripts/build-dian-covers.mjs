#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const registry = JSON.parse(readFileSync(path.join(root, 'www/dian/data/registry.json'), 'utf8'));
const outputDir = path.join(root, 'www/dian/img/covers/books-generated');
const svgDir = path.join(tmpdir(), 'sinan-dian-cover-svg');
const cjkFont = '/System/Library/Fonts/Supplemental/Songti.ttc';
mkdirSync(outputDir, { recursive: true });
mkdirSync(svgDir, { recursive: true });

const palettes = {
  jingyi:   ['#211814', '#8e402c', '#d3a366', '#efe0bd'],
  zhexue:   ['#101f1d', '#3e6b61', '#97aa90', '#e8eddd'],
  mingli:   ['#20151a', '#84394b', '#c08a59', '#eed9bb'],
  kanyu:    ['#102321', '#2f6258', '#ad9255', '#e5e9d5'],
  liqi:     ['#271b12', '#94562e', '#cfaa68', '#efdfbf'],
  sanshi:   ['#101c29', '#365a70', '#a48d5c', '#dce4df'],
  bushi:    ['#261a0e', '#76512e', '#bf955b', '#efe2c6'],
  xiangshu: ['#241922', '#684e60', '#ae8375', '#ebded8'],
  zeri:     ['#291411', '#92392e', '#cca363', '#f0e1c8'],
  tianwen:  ['#0d1a29', '#2d5771', '#a89868', '#dfe5e3'],
  bencao:   ['#142416', '#4d6b3e', '#a29a5d', '#e5ead6'],
  daozang:  ['#0d2226', '#2c5960', '#ad925a', '#dfe6da'],
};

const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
const hashBytes = value => createHash('sha256').update(value).digest();
const n = (bytes, index, min, max) => min + (bytes[index % bytes.length] / 255) * (max - min);
const line = (x1, y1, x2, y2, color, width = 4, opacity = .72) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" stroke-opacity="${opacity}" stroke-linecap="round"/>`;
const circle = (cx, cy, r, color, width = 4, opacity = .7, fill = 'none') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${color}" stroke-width="${width}" stroke-opacity="${opacity}"/>`;

function motifType(title, category) {
  const rules = [
    ['mirror', /鉴|镜|照神|冰鉴/],
    ['calendar', /历|月令|岁时|择日|时日|候|玉匣|协纪|日要/],
    ['stars', /星|天文|天官|宿曜|北斗|观物|皇极|开元占经|乙巳占/],
    ['house', /宅|营造|鲁班|房内|阳宅/],
    ['terrain', /地理|龙|山|青囊|葬|砂|水龙|堪舆|入地眼|玉尺/],
    ['botanical', /本草|医|素问|灵枢|难经|药|素女/],
    ['figure', /相法|神相|人物|人伦|许负|柳庄|命书|子平|三命|星命/],
    ['turtle', /龟|策|灵棋/],
    ['strategy', /奇门|遁甲|六壬|太乙|兵|金口诀/],
    ['hexagram', /易|卦|爻|筮|河洛|太玄|火珠林|梅花/],
    ['alchemy', /丹|黄庭|悟真|入药|内炼|还丹|参同契/],
    ['cloud', /道|太上|仙|灵宝|清静|真诰|抱朴|云笈|阴符/],
    ['manuscript', /礼|史|书|文|论|传|注|集|志|经/],
  ];
  return (rules.find(([, re]) => re.test(title)) || [category === 'bencao' ? 'botanical' : category === 'tianwen' ? 'stars' : 'manuscript'])[0];
}

function stars(b, c) {
  const points = Array.from({ length: 9 }, (_, i) => [n(b, i * 2, 120, 680), n(b, i * 2 + 1, 170, 930)]);
  return `${points.slice(1).map((p, i) => line(points[i][0], points[i][1], p[0], p[1], c, 3, .52)).join('')}${points.map((p, i) => circle(p[0], p[1], 4 + b[i] % 10, c, 2, .85, i === b[0] % points.length ? c : 'none')).join('')}${circle(n(b, 19, 220, 580), n(b, 20, 350, 720), n(b, 21, 150, 310), c, 3, .28)}`;
}

function terrain(b, c) {
  const paths = Array.from({ length: 7 }, (_, i) => {
    const y = 250 + i * 105 + n(b, i, -35, 35);
    return `<path d="M -40 ${y} C 150 ${y - n(b, i + 2, 30, 150)}, 240 ${y + n(b, i + 6, 20, 120)}, 400 ${y - n(b, i + 10, 20, 130)} S 680 ${y + n(b, i + 14, 20, 120)}, 850 ${y - n(b, i + 18, 15, 100)}" fill="none" stroke="${c}" stroke-width="${i === b[0] % 7 ? 8 : 3}" stroke-opacity="${i === b[0] % 7 ? .72 : .34}"/>`;
  }).join('');
  return `${paths}<path d="M 90 1000 Q 300 770 405 870 T 730 720" fill="none" stroke="${c}" stroke-width="10" stroke-opacity=".62"/>`;
}

function botanical(b, c) {
  const lean = n(b, 2, -90, 90);
  const leaves = Array.from({ length: 6 }, (_, i) => {
    const y = 860 - i * 105; const side = (b[i] % 2 ? 1 : -1); const x = 400 + lean * (1 - y / 1000);
    return `<path d="M ${x} ${y} Q ${x + side * n(b, i + 8, 80, 170)} ${y - 85}, ${x + side * n(b, i + 14, 55, 130)} ${y + 25} Q ${x + side * 35} ${y + 45}, ${x} ${y}" fill="${c}" fill-opacity="${.12 + (b[i] % 4) * .06}" stroke="${c}" stroke-width="3" stroke-opacity=".65"/>`;
  }).join('');
  return `<path d="M 410 1040 Q ${350 + lean} 710, ${420 + lean} 220" fill="none" stroke="${c}" stroke-width="8" stroke-opacity=".76"/>${leaves}${circle(420 + lean, 220, 22, c, 4, .8)}`;
}

function hexagram(b, c) {
  return Array.from({ length: 8 }, (_, i) => {
    const y = 230 + i * 105; const broken = (b[i] & 1) === 1; const w = i === b[9] % 8 ? 15 : 8;
    return broken
      ? `${line(135, y, 335, y, c, w, .7)}${line(465, y, 665, y, c, w, .7)}`
      : line(135, y, 665, y, c, w, .7);
  }).join('');
}

function house(b, c) {
  const split = n(b, 2, 310, 490); const top = n(b, 3, 260, 390);
  return `<path d="M 110 980 L 110 ${top} L 400 150 L 690 ${top} L 690 980 Z" fill="none" stroke="${c}" stroke-width="8" stroke-opacity=".7"/>${line(split, top + 40, split, 980, c, 4, .4)}<rect x="${n(b,4,180,270)}" y="${n(b,5,560,720)}" width="${n(b,6,90,160)}" height="${n(b,7,190,270)}" fill="${c}" fill-opacity=".18" stroke="${c}" stroke-opacity=".7" stroke-width="4"/><rect x="${n(b,8,470,540)}" y="${n(b,9,470,590)}" width="105" height="105" fill="none" stroke="${c}" stroke-opacity=".55" stroke-width="4"/>`;
}

function figure(b, c) {
  const x = n(b, 2, 300, 500); const facing = b[3] % 2 ? 1 : -1;
  return `${circle(x, 365, 130, c, 6, .64)}<path d="M ${x - 105 * facing} 405 Q ${x + 15 * facing} 440, ${x + 65 * facing} 510 Q ${x + 5 * facing} 570, ${x + 135 * facing} 635" fill="none" stroke="${c}" stroke-width="7" stroke-opacity=".76"/><path d="M 180 1040 Q ${x} 700, 630 1040" fill="${c}" fill-opacity=".13" stroke="${c}" stroke-width="5" stroke-opacity=".48"/>${line(120, n(b,4,190,900), 680, n(b,5,190,900), c, 2, .2)}`;
}

function calendar(b, c) {
  const cx = n(b, 2, 300, 500); const cy = n(b, 3, 430, 610); const r = n(b, 4, 190, 270);
  return `${circle(cx, cy, r, c, 5, .64)}${Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return line(cx+Math.cos(a)*(r-25),cy+Math.sin(a)*(r-25),cx+Math.cos(a)*r,cy+Math.sin(a)*r,c,4,.55)}).join('')}${line(cx,cy,cx+n(b,6,-150,150),cy+n(b,7,-180,180),c,10,.78)}<path d="M 100 930 Q 400 ${n(b,8,780,900)}, 700 930" fill="none" stroke="${c}" stroke-width="6" stroke-opacity=".35"/>`;
}

function alchemy(b, c) {
  const x = n(b, 2, 300, 500);
  return `<path d="M ${x - 170} 850 Q ${x - 210} 650, ${x - 115} 580 L ${x + 115} 580 Q ${x + 210} 650, ${x + 170} 850 Q ${x} 990, ${x - 170} 850 Z" fill="${c}" fill-opacity=".13" stroke="${c}" stroke-width="7" stroke-opacity=".68"/>${line(x-100,580,x-70,480,c,6,.58)}${line(x+100,580,x+70,480,c,6,.58)}<path d="M ${x} 500 C ${x - 120} 390, ${x + 130} 320, ${x} 185" fill="none" stroke="${c}" stroke-width="8" stroke-opacity=".5"/>${circle(x,770,n(b,6,35,80),c,4,.7,c)}`;
}

function cloud(b, c) {
  return Array.from({length:5},(_,i)=>{const y=270+i*145;const bend=n(b,i+2,90,210);return `<path d="M 80 ${y} C ${180+bend} ${y-100}, ${290-bend} ${y+115}, 400 ${y} S ${610+bend/2} ${y-90}, 750 ${y+20}" fill="none" stroke="${c}" stroke-width="${i===b[0]%5?9:4}" stroke-opacity="${i===b[0]%5?.68:.3}"/>`}).join('');
}

function mirror(b, c) {
  const x=n(b,2,330,470), y=n(b,3,390,530), rx=n(b,4,150,230), ry=n(b,5,220,330);
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" fill-opacity=".08" stroke="${c}" stroke-width="9" stroke-opacity=".7"/>${line(x,y+ry,x+n(b,6,-80,80),1000,c,12,.6)}<path d="M ${x-rx+30} ${y-30} Q ${x} ${y-ry+60}, ${x+rx-25} ${y+20}" fill="none" stroke="${c}" stroke-width="4" stroke-opacity=".36"/>`;
}

function strategy(b, c) {
  const size=120, ox=n(b,2,105,165), oy=n(b,3,220,310);
  return `${Array.from({length:5},(_,r)=>Array.from({length:5},(_,q)=>{const hot=(r*5+q)===b[4]%25;return `<rect x="${ox+q*size}" y="${oy+r*size}" width="${size-8}" height="${size-8}" fill="${hot?c:'none'}" fill-opacity="${hot?.35:0}" stroke="${c}" stroke-width="${hot?7:2}" stroke-opacity="${hot?.75:.24}"/>`}).join('')).join('')}${circle(ox+(b[5]%5)*size+56,oy+(b[6]%5)*size+56,22,c,4,.8,c)}`;
}

function turtle(b, c) {
  const x=n(b,2,330,470),y=n(b,3,500,640),r=n(b,4,190,260);
  return `<path d="M ${x-r} ${y} Q ${x-r*.7} ${y-r}, ${x} ${y-r*1.2} Q ${x+r*.7} ${y-r}, ${x+r} ${y} Q ${x+r*.65} ${y+r}, ${x} ${y+r*1.15} Q ${x-r*.65} ${y+r}, ${x-r} ${y} Z" fill="${c}" fill-opacity=".08" stroke="${c}" stroke-width="7" stroke-opacity=".62"/>${Array.from({length:6},(_,i)=>line(x,y,x+Math.cos(i*Math.PI/3)*r*.8,y+Math.sin(i*Math.PI/3)*r*.8,c,3,.36)).join('')}${circle(x,y,r*.34,c,3,.38)}`;
}

function manuscript(b, c) {
  const count=3+b[2]%4, shift=n(b,3,-50,50);
  return `${Array.from({length:count},(_,i)=>`<rect x="${120+i*22+shift}" y="${190+i*34}" width="${500-i*38}" height="${690-i*45}" rx="${b[i]%2?0:12}" fill="${c}" fill-opacity="${.03+i*.015}" stroke="${c}" stroke-width="${i===count-1?7:3}" stroke-opacity="${.2+i*.08}"/>`).join('')}${Array.from({length:6},(_,i)=>line(210+shift,390+i*70,560-shift,390+i*70,c,3,i===b[5]%6?.72:.25)).join('')}`;
}

const motifs = { stars, terrain, botanical, hexagram, house, figure, calendar, alchemy, cloud, mirror, strategy, turtle, manuscript };

const categoryLabels = Object.fromEntries((registry.categories || []).map(category => [category.id, category.label]));

function titleMarkup(book, b, variant, paper, lineColor) {
  const chars = Array.from(String(book.title || book.id).replace(/[《》〈〉\s·：:（）()—]/g, ''));
  const font = 'Songti SC';
  if (variant < 2) {
    const perColumn = chars.length > 12 ? 8 : 7;
    const columns = Math.ceil(chars.length / perColumn);
    const fontSize = columns > 2 ? 50 : chars.length > 8 ? 58 : 74;
    const step = fontSize * 1.12;
    const baseX = variant === 0 ? 676 : 124;
    const direction = variant === 0 ? -1 : 1;
    const pieces = chars.map((char, index) => {
      const column = Math.floor(index / perColumn);
      const row = index % perColumn;
      const x = baseX + direction * column * (fontSize + 24);
      const y = 250 + row * step;
      return `<text x="${x}" y="${y}" text-anchor="middle" font-family="${font}" font-size="${fontSize}" font-weight="600" fill="${paper}">${esc(char)}</text>`;
    }).join('');
    const ruleX = baseX + direction * (columns * (fontSize + 24) - 12);
    return `<g>${pieces}${line(ruleX, 178, ruleX, Math.min(1035, 270 + (Math.min(chars.length, perColumn) - 1) * step), lineColor, 3, .58)}</g>`;
  }
  const maxPerLine = chars.length <= 6 ? chars.length : (chars.length <= 12 ? Math.ceil(chars.length / 2) : Math.ceil(chars.length / 3));
  const rows = [];
  for (let i = 0; i < chars.length; i += maxPerLine) rows.push(chars.slice(i, i + maxPerLine).join(''));
  const fontSize = chars.length <= 6 ? 92 : chars.length <= 12 ? 66 : 50;
  const startY = variant === 2 ? 220 : 735 - (rows.length - 1) * 42;
  return `<g>${rows.map((row, index) => `<text x="400" y="${startY + index * (fontSize + 24)}" text-anchor="middle" font-family="${font}" font-size="${fontSize}" font-weight="600" letter-spacing="8" fill="${paper}">${esc(row)}</text>`).join('')}</g>`;
}

function signatureGeometry(b, accent, paper) {
  const variant = (b[27] + b[30]) % 8;
  const x = n(b, 20, 150, 650);
  const y = n(b, 21, 260, 920);
  const rot = n(b, 22, -28, 28);
  const shapes = [
    `<path d="M -80 ${y + 170} L ${x} ${y - 220} L 880 ${y - 40}" fill="none" stroke="${paper}" stroke-width="38" stroke-opacity=".055"/>`,
    `<ellipse cx="${x}" cy="${y}" rx="${n(b, 18, 180, 360)}" ry="${n(b, 19, 90, 250)}" fill="none" stroke="${paper}" stroke-width="26" stroke-opacity=".06" transform="rotate(${rot} ${x} ${y})"/>`,
    `<rect x="${x - 190}" y="${y - 190}" width="380" height="380" fill="none" stroke="${paper}" stroke-width="30" stroke-opacity=".05" transform="rotate(${rot} ${x} ${y})"/>`,
    `<path d="M ${x - 310} ${y + 190} Q ${x} ${y - 280}, ${x + 330} ${y + 150}" fill="none" stroke="${paper}" stroke-width="34" stroke-opacity=".06"/>`,
    `<path d="M ${x} ${y - 330} L ${x + 280} ${y + 230} L ${x - 290} ${y + 130} Z" fill="${accent}" fill-opacity=".12" stroke="${paper}" stroke-width="9" stroke-opacity=".05"/>`,
    `<g transform="rotate(${rot} ${x} ${y})">${Array.from({ length: 5 }, (_, i) => `<line x1="${x - 300}" y1="${y - 170 + i * 85}" x2="${x + 300 - i * 38}" y2="${y - 170 + i * 85}" stroke="${paper}" stroke-width="${i === b[17] % 5 ? 22 : 7}" stroke-opacity="${i === b[17] % 5 ? '.07' : '.035'}"/>`).join('')}</g>`,
    `<path d="M ${x - 320} ${y - 40} C ${x - 80} ${y - 260}, ${x + 80} ${y + 260}, ${x + 320} ${y + 20}" fill="none" stroke="${paper}" stroke-width="42" stroke-opacity=".055"/>`,
    `<rect x="${x - 95}" y="0" width="190" height="1200" fill="${paper}" fill-opacity=".035" transform="rotate(${rot} ${x} 600)"/>`,
  ];
  return shapes[variant];
}

function svgFor(book, index) {
  const b = hashBytes(`${book.id}|${book.title}|${book.author || ''}`);
  const [dark, accent, lineColor, paper] = palettes[book.category] || palettes.jingyi;
  const type = motifType(book.title, book.category);
  // hash 决定细节，书目序号再错开四种主版式，避免同类相邻书偶然落进完全相同的骨架。
  const variant = (b[1] + index) % 4;
  const cleanTitle = Array.from(String(book.title || book.id).replace(/[《》〈〉\s·：:（）()—]/g, ''));
  const focal = cleanTitle[b[2] % Math.max(1, cleanTitle.length)] || '典';
  const focalX = variant === 0 ? 245 : variant === 1 ? 565 : 400;
  const focalY = variant === 2 ? 810 : variant === 3 ? 410 : 650;
  const motifTransform = variant === 0
    ? 'translate(-95 260) scale(.70)'
    : variant === 1
      ? 'translate(345 270) scale(.66)'
      : variant === 2
        ? 'translate(115 380) scale(.72)'
        : 'translate(105 -90) scale(.73)';
  const titleShade = variant === 0
    ? '<rect x="470" y="0" width="330" height="1200" fill="#050707" fill-opacity=".48"/>'
    : variant === 1
      ? '<rect x="0" y="0" width="330" height="1200" fill="#050707" fill-opacity=".48"/>'
      : variant === 2
        ? '<rect x="0" y="0" width="800" height="430" fill="#050707" fill-opacity=".42"/>'
        : '<rect x="0" y="590" width="800" height="610" fill="#050707" fill-opacity=".44"/>';
  const sealX = variant === 1 ? 676 : 94;
  const sealY = variant === 2 ? 1050 : 105;
  const categoryLabel = categoryLabels[book.category] || '古籍';
  const accentBlock = variant === 0
    ? `<circle cx="235" cy="640" r="${n(b, 28, 260, 380)}" fill="${accent}" fill-opacity=".34"/>`
    : variant === 1
      ? `<rect x="365" y="0" width="435" height="1200" fill="${accent}" fill-opacity=".28"/>`
      : variant === 2
        ? `<path d="M 0 0 H 800 V ${n(b, 29, 360, 590)} L 0 ${n(b, 30, 570, 820)} Z" fill="${accent}" fill-opacity=".34"/>`
        : `<circle cx="400" cy="300" r="${n(b, 31, 300, 470)}" fill="${accent}" fill-opacity=".31"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200">
    <defs>
      <radialGradient id="bg" cx="${n(b,23,20,80)}%" cy="${n(b,24,20,80)}%" r="95%"><stop offset="0" stop-color="${accent}" stop-opacity=".72"/><stop offset=".62" stop-color="${dark}"/><stop offset="1" stop-color="#090b0a"/></radialGradient>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".52" numOctaves="3" seed="${b[25]}"/><feColorMatrix type="saturate" values="0"/></filter>
    </defs>
    <rect width="800" height="1200" fill="url(#bg)"/>
    ${accentBlock}
    ${signatureGeometry(b, accent, paper)}
    <text x="${focalX}" y="${focalY}" text-anchor="middle" font-family="Songti SC" font-size="430" font-weight="700" fill="${paper}" fill-opacity=".075">${esc(focal)}</text>
    <g transform="${motifTransform}" opacity=".33">${motifs[type](b, lineColor)}</g>
    ${titleShade}
    <rect width="800" height="1200" filter="url(#grain)" opacity=".035"/>
    ${titleMarkup(book, b, variant, paper, lineColor)}
    <rect x="${sealX}" y="${sealY}" width="54" height="54" rx="3" fill="#9f3025" fill-opacity=".94" stroke="${paper}" stroke-width="2" stroke-opacity=".58"/>
    <text x="${sealX + 27}" y="${sealY + 35}" text-anchor="middle" font-family="STKaiti" font-size="23" fill="#f2dfbd">典籍</text>
    <text x="${variant === 1 ? 748 : 54}" y="1140" text-anchor="${variant === 1 ? 'end' : 'start'}" font-family="Songti SC" font-size="23" letter-spacing="5" fill="${paper}" fill-opacity=".58">${esc(categoryLabel)}</text>
    <rect x="24" y="24" width="752" height="1152" fill="none" stroke="${lineColor}" stroke-width="2" stroke-opacity=".34"/>
  </svg>`;
}

let built = 0;
registry.books.forEach((book, index) => {
  if (existsSync(path.join(root, `www/dian/img/covers/books-v2/${book.id}.webp`))) return;
  const svgPath = path.join(svgDir, `${book.id}.svg`);
  const out = path.join(outputDir, `${book.id}.webp`);
  writeFileSync(svgPath, svgFor(book, index));
  execFileSync('magick', ['-font', cjkFont, svgPath, '-colorspace', 'sRGB', '-quality', '84', out], { stdio: 'inherit' });
  built += 1;
});

console.log(`Built ${built} semantic generated covers in ${outputDir}`);
