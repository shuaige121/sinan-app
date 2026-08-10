const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const WIDTH = 1284;
const HEIGHT = 2778;
const SCREEN_X = 112;
const SCREEN_Y = 690;
const SCREEN_WIDTH = 1060;
const CORNER_RADIUS = 46;

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(
  root,
  'build/releases/20260807-v1-final/store-assets/iphone-6.9',
);
const outputDir = path.join(
  root,
  'build/releases/20260807-v1-final/store-assets/iphone-6.5-v2',
);

const slides = [
  {
    input: '01-today.png',
    output: '01-today-v2.png',
    section: '黄历',
    headline: '每日黄历，一眼明了',
    subhead: '节气 · 宜忌 · 时卦 · 日照',
    crop: { left: 0, top: 0, width: 1320, height: 2868 },
  },
  {
    input: '02-compass.png',
    output: '02-compass-v2.png',
    section: '罗盘',
    headline: '二十四山，掌中罗盘',
    subhead: '方位 · 堪舆 · 地形分析',
    crop: { left: 0, top: 190, width: 1320, height: 2548 },
  },
  {
    input: '03-bazi.png',
    output: '03-bazi-v2.png',
    section: '八字',
    headline: '四柱五行，清晰排盘',
    subhead: '命盘结构 · 五行强弱 · 逐层解读',
    crop: { left: 65, top: 520, width: 1190, height: 2230 },
  },
  {
    input: '04-books.png',
    output: '04-books-v2.png',
    section: '古籍',
    headline: '典籍原文，逐句可溯',
    subhead: '45 部古籍 · 原文 · 译注 · 检索',
    crop: { left: 0, top: 190, width: 1320, height: 2548 },
  },
];

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function backgroundSvg(slide, index, screenHeight) {
  const safeSection = escapeXml(slide.section);
  const safeHeadline = escapeXml(slide.headline);
  const safeSubhead = escapeXml(slide.subhead);
  const frameY = SCREEN_Y - 12;
  const frameHeight = screenHeight + 24;

  return Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glow" cx="86%" cy="8%" r="92%">
          <stop offset="0%" stop-color="#3b3015"/>
          <stop offset="36%" stop-color="#17140d"/>
          <stop offset="100%" stop-color="#090907"/>
        </radialGradient>
        <linearGradient id="goldLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#735d18" stop-opacity="0"/>
          <stop offset="50%" stop-color="#d6b938" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="#735d18" stop-opacity="0"/>
        </linearGradient>
        <filter id="shadow" x="-30%" y="-20%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="22"/>
          <feOffset dy="18"/>
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .72 0"/>
          <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
      <g fill="none" stroke="#b99524" opacity="0.10">
        <circle cx="1110" cy="495" r="300" stroke-width="2"/>
        <circle cx="1110" cy="495" r="238" stroke-width="1"/>
        <circle cx="1110" cy="495" r="176" stroke-width="1"/>
        <path d="M810 495h600M1110 195v600M898 283l424 424M1322 283L898 707" stroke-width="1"/>
      </g>
      <path d="M76 624H1208" stroke="url(#goldLine)" stroke-width="2"/>

      <g font-family="PingFang SC, Hiragino Sans GB, Helvetica Neue, sans-serif">
        <rect x="76" y="78" width="104" height="104" rx="30" fill="#c7a82c"/>
        <text x="128" y="151" text-anchor="middle" font-family="Songti SC, STSong, serif" font-size="58" font-weight="700" fill="#111008">司</text>
        <text x="202" y="121" font-size="32" font-weight="600" letter-spacing="8" fill="#eee6d0">司南</text>
        <text x="202" y="164" font-size="20" font-weight="500" letter-spacing="4" fill="#9f946f">SINAN COMPASS</text>
        <text x="1208" y="141" text-anchor="end" font-size="28" font-weight="600" letter-spacing="6" fill="#bea735">0${index + 1} · ${safeSection}</text>

        <text x="76" y="355" font-size="92" font-weight="700" letter-spacing="2" fill="#f5edda">${safeHeadline}</text>
        <text x="79" y="441" font-size="38" font-weight="500" letter-spacing="4" fill="#c8b98e">${safeSubhead}</text>

        <rect x="100" y="${frameY}" width="1084" height="${frameHeight}" rx="60" fill="#050504" stroke="#8f7723" stroke-width="3" filter="url(#shadow)"/>
      </g>
    </svg>
  `);
}

function roundedMask(width, height, radius) {
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" rx="${radius}" fill="white"/>
    </svg>
  `);
}

async function buildSlide(slide, index) {
  const inputPath = path.join(sourceDir, slide.input);
  const outputPath = path.join(outputDir, slide.output);
  const cropped = sharp(inputPath).extract(slide.crop);
  const screenHeight = Math.round((slide.crop.height / slide.crop.width) * SCREEN_WIDTH);
  const screen = await cropped
    .resize({ width: SCREEN_WIDTH })
    .png()
    .composite([
      {
        input: roundedMask(SCREEN_WIDTH, screenHeight, CORNER_RADIUS),
        blend: 'dest-in',
      },
    ])
    .toBuffer();

  await sharp(backgroundSvg(slide, index, screenHeight))
    .composite([{ input: screen, left: SCREEN_X, top: SCREEN_Y }])
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  return outputPath;
}

async function buildContactSheet(outputs) {
  const thumbWidth = 321;
  const thumbHeight = Math.round((HEIGHT / WIDTH) * thumbWidth);
  const thumbs = await Promise.all(
    outputs.map((output) =>
      sharp(output).resize(thumbWidth, thumbHeight).png().toBuffer(),
    ),
  );

  await sharp({
    create: {
      width: thumbWidth * outputs.length,
      height: thumbHeight,
      channels: 3,
      background: '#090907',
    },
  })
    .composite(thumbs.map((input, index) => ({ input, left: index * thumbWidth, top: 0 })))
    .png({ compressionLevel: 9 })
    .toFile(path.join(outputDir, 'contact-sheet-v2.png'));
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const outputs = [];
  for (const [index, slide] of slides.entries()) {
    outputs.push(await buildSlide(slide, index));
  }
  await buildContactSheet(outputs);
  console.log(outputs.join('\n'));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
