#!/usr/bin/env node
/**
 * 从 full-body 抠图重建 portraits 半身像。
 *
 * 为什么不直接用原来的 portraits：原始 10 张构图不统一（4 张是 292x537 头肩裁切、
 * 6 张是 600x800 大半身），同一排卡片里脸的大小差一倍；庚/辛 底部还留着相邻人物的残片。
 * full-body 那套是干净且构图一致的立绘，从它裁半身可以一次解决三件事。
 *
 * 画幅锚点是「头部横向重心」而非包围盒中心：癸举着伞、甲展开双臂，
 * 按包围盒居中会把脸推到画面边缘。
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'www/img/ten-archetypes/human/v8/full-body');
const OUT_DIR = path.join(ROOT, 'www/img/ten-archetypes/human/v8/portraits');

const OUT_W = 600;
const OUT_H = 800;            // 3:4 竖版
const CROP_RATIO = 0.34;      // 取人形高度的 34% —— 头到胸腹，脸在卡片里够大
const HEADROOM = 0.030;       // 头顶留白，占人形高度
const HEAD_BAND = 0.12;       // 用最上 12% 当作「头」来求横向重心
const ALPHA_CUT = 30;         // alpha 阈值（0-255），低于此当作背景

/** 人形包围盒：逐像素扫 alpha，避开 trim 对半透明边缘的敏感。 */
async function figureBox(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width * channels;
    for (let x = 0; x < width; x++) {
      if (data[row + x * channels + 3] < ALPHA_CUT) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error(`${path.basename(file)}: 整张图没有不透明像素`);
  return { data, width, height, channels, x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** 头部横向重心：在最上 HEAD_BAND 区间内按 alpha 加权求 x 均值。 */
function headCenterX(box) {
  const { data, width, channels } = box;
  const bandBottom = box.y + Math.max(1, Math.round(box.h * HEAD_BAND));
  let sum = 0;
  let weight = 0;
  for (let y = box.y; y < bandBottom; y++) {
    const row = y * width * channels;
    for (let x = box.x; x < box.x + box.w; x++) {
      const a = data[row + x * channels + 3];
      if (a < ALPHA_CUT) continue;
      sum += x * a;
      weight += a;
    }
  }
  return weight ? sum / weight : box.x + box.w / 2;
}

async function buildOne(file) {
  const name = path.basename(file, '.png');
  const box = await figureBox(file);
  const cropH = Math.round(box.h * CROP_RATIO);
  const cropW = Math.round(cropH * (OUT_W / OUT_H));
  const cx = headCenterX(box);
  const top = Math.round(box.y - box.h * HEADROOM);
  const left = Math.round(cx - cropW / 2);

  // 裁切窗口可能越界，先用透明像素把画布补够，再按平移后的坐标 extract。
  const padLeft = Math.max(0, -left);
  const padTop = Math.max(0, -top);
  const padRight = Math.max(0, left + cropW - box.width);
  const padBottom = Math.max(0, top + cropH - box.height);

  const padded = await sharp(file)
    .ensureAlpha()
    .extend({
      left: padLeft, top: padTop, right: padRight, bottom: padBottom,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  const out = path.join(OUT_DIR, `${name}.png`);
  await sharp(padded)
    .extract({ left: left + padLeft, top: top + padTop, width: cropW, height: cropH })
    .resize(OUT_W, OUT_H, { fit: 'fill', kernel: 'lanczos3' })
    .png({ compressionLevel: 9, palette: false })
    .toFile(out);

  return { name, figure: `${box.w}x${box.h}`, crop: `${cropW}x${cropH}+${left}+${top}`, out };
}

async function main() {
  const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.png')).sort()
    .map(f => path.join(SRC_DIR, f));
  if (!files.length) throw new Error(`${SRC_DIR} 里没有 png 源`);
  for (const file of files) {
    const r = await buildOne(file);
    console.log(`${r.name.padEnd(12)} figure=${r.figure.padEnd(10)} crop=${r.crop}`);
  }
  console.log(`\n${files.length} 张已写入 ${OUT_DIR}`);
}

main().catch(err => { console.error(err); process.exitCode = 1; });
