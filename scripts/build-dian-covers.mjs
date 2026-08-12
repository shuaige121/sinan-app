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

function svgFor(book, index) {
  const b = hashBytes(`${book.id}|${book.title}|${book.author || ''}`);
  const [dark, accent, lineColor, paper] = palettes[book.category] || palettes.jingyi;
  const type = motifType(book.title, book.category);
  const variant = b[1] % 4;
  const colorField = variant === 0
    ? `<circle cx="${n(b,28,180,620)}" cy="${n(b,29,250,900)}" r="${n(b,30,230,430)}" fill="${accent}" fill-opacity=".24"/>`
    : variant === 1
      ? `<path d="M ${n(b,28,-180,120)} 1200 L ${n(b,29,340,620)} 0 L ${n(b,30,560,900)} 0 L ${n(b,31,170,470)} 1200 Z" fill="${accent}" fill-opacity=".2"/>`
      : variant === 2
        ? `<rect x="${n(b,28,80,470)}" y="0" width="${n(b,29,130,310)}" height="1200" fill="${accent}" fill-opacity=".2"/>`
        : `<path d="M 0 ${n(b,28,160,520)} Q ${n(b,29,280,520)} ${n(b,30,20,320)}, 800 ${n(b,31,240,720)} L 800 0 L 0 0 Z" fill="${accent}" fill-opacity=".24"/>`;
  const border = variant === 0
    ? `<rect x="46" y="42" width="708" height="1116" fill="none" stroke="${lineColor}" stroke-width="3" stroke-opacity=".42"/><rect x="72" y="68" width="656" height="1064" fill="none" stroke="${paper}" stroke-width="1" stroke-opacity=".18"/>`
    : variant === 1
      ? `<rect x="0" y="0" width="48" height="1200" fill="${accent}" fill-opacity=".9"/><line x1="79" y1="45" x2="79" y2="1155" stroke="${lineColor}" stroke-width="3" stroke-opacity=".5"/>`
      : variant === 2
        ? `<path d="M 35 115 L 35 35 L 115 35 M 685 35 L 765 35 L 765 115 M 35 1085 L 35 1165 L 115 1165 M 685 1165 L 765 1165 L 765 1085" fill="none" stroke="${lineColor}" stroke-width="5" stroke-opacity=".55"/>`
        : `<rect x="0" y="0" width="800" height="32" fill="${accent}" fill-opacity=".82"/><rect x="0" y="1168" width="800" height="32" fill="${lineColor}" fill-opacity=".55"/>`;
  const rotate = n(b, 22, -5, 5);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200">
    <defs>
      <radialGradient id="bg" cx="${n(b,23,20,80)}%" cy="${n(b,24,20,80)}%" r="90%"><stop offset="0" stop-color="${accent}" stop-opacity=".72"/><stop offset=".58" stop-color="${dark}"/><stop offset="1" stop-color="#090b0a"/></radialGradient>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".52" numOctaves="3" seed="${b[25]}"/><feColorMatrix type="saturate" values="0"/></filter>
    </defs>
    <rect width="800" height="1200" fill="url(#bg)"/>
    ${colorField}
    <rect width="800" height="1200" filter="url(#grain)" opacity=".09"/>
    <g transform="rotate(${rotate} 400 600)">${motifs[type](b, lineColor)}</g>
    <rect x="0" y="0" width="800" height="1200" fill="none" stroke="#050706" stroke-width="28" stroke-opacity=".7"/>
    ${border}
    <g fill="${paper}" fill-opacity=".48">
      ${Array.from({ length: 3 + b[26] % 5 }, (_, i) => `<rect x="${94 + i * 24}" y="92" width="${10 + b[i] % 9}" height="4"/>`).join('')}
      ${Array.from({ length: 4 + b[27] % 7 }, (_, i) => `<rect x="${94 + i * 22}" y="1110" width="${9 + b[i + 8] % 10}" height="4"/>`).join('')}
    </g>
  </svg>`;
}

let built = 0;
registry.books.forEach((book, index) => {
  if (existsSync(path.join(root, `www/dian/img/covers/books-v2/${book.id}.webp`))) return;
  const svgPath = path.join(svgDir, `${book.id}.svg`);
  const out = path.join(outputDir, `${book.id}.webp`);
  writeFileSync(svgPath, svgFor(book, index));
  execFileSync('magick', [svgPath, '-colorspace', 'sRGB', '-quality', '84', out], { stdio: 'inherit' });
  built += 1;
});

console.log(`Built ${built} semantic generated covers in ${outputDir}`);
