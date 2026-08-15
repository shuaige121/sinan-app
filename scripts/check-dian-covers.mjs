#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const registry = JSON.parse(readFileSync(join(root, 'www/dian/data/registry.json'), 'utf8'));
const bespokeDir = join(root, 'www/dian/img/covers/books-v2');
const generatedDir = join(root, 'www/dian/img/covers/books-generated');

function coverFor(book) {
  const bespoke = join(bespokeDir, `${book.id}.webp`);
  if (existsSync(bespoke)) return { path: bespoke, kind: 'bespoke' };
  const generated = join(generatedDir, `${book.id}.webp`);
  if (existsSync(generated)) return { path: generated, kind: 'generated' };
  return null;
}

function dHash(path) {
  const result = spawnSync('magick', [path, '-colorspace', 'Gray', '-filter', 'point', '-resize', '17x16!', 'gray:-'], { encoding: null });
  if (result.status !== 0 || result.stdout.length !== 272) {
    throw new Error(`无法读取封面像素：${path}`);
  }
  let hash = 0n;
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 16; col++) {
      hash = (hash << 1n) | BigInt(result.stdout[row * 17 + col] > result.stdout[row * 17 + col + 1]);
    }
  }
  return hash;
}

function distance(a, b) {
  let value = a ^ b;
  let count = 0;
  while (value) { count += Number(value & 1n); value >>= 1n; }
  return count;
}

const covers = [];
const missing = [];
for (const book of registry.books || []) {
  const cover = coverFor(book);
  if (!cover) { missing.push(book.id); continue; }
  const bytes = readFileSync(cover.path);
  covers.push({ id: book.id, ...cover, sha256: createHash('sha256').update(bytes).digest('hex'), dhash: dHash(cover.path) });
}

const exactGroups = [...Map.groupBy(covers, cover => cover.sha256).values()].filter(group => group.length > 1);
const nearPairs = [];
for (let left = 0; left < covers.length; left++) {
  for (let right = left + 1; right < covers.length; right++) {
    const score = distance(covers[left].dhash, covers[right].dhash);
    if (score <= 8) nearPairs.push([covers[left].id, covers[right].id, score]);
  }
}

const result = {
  books: (registry.books || []).length,
  covered: covers.length,
  bespoke: covers.filter(cover => cover.kind === 'bespoke').length,
  generated: covers.filter(cover => cover.kind === 'generated').length,
  missing,
  exactDuplicateGroups: exactGroups.map(group => group.map(cover => cover.id)),
  perceptuallyNearPairsAtDistance8: nearPairs,
};
console.log(JSON.stringify(result, null, 2));
if (missing.length || exactGroups.length || nearPairs.length) process.exitCode = 1;
