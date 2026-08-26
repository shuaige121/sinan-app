#!/usr/bin/env node

/*
 * Build the compact, country-lazy birth-place dataset used by the Bazi form.
 *
 * Inputs are intentionally kept out of git under tmp/place-data/:
 *   - world.json and translations.csv.gz from dr5hn v3.2-export.7
 *   - china-pca.json from modood/Administrative-divisions-of-China
 *
 * The emitted database contains only display names and longitude. This keeps
 * the browser payload small while retaining the full country/state/city tree.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import readline from 'node:readline';

const root = path.resolve(import.meta.dirname, '..');
const inputDir = path.join(root, 'tmp', 'place-data');
const outputDir = path.join(root, 'www', 'data', 'places');
const worldPath = path.join(inputDir, 'world.json');
const translationsPath = path.join(inputDir, 'translations.csv.gz');
const chinaPath = path.join(inputDir, 'china-pca.json');

for (const input of [worldPath, translationsPath, chinaPath]) {
  if (!fs.existsSync(input)) throw new Error(`Missing input: ${input}`);
}

function parseCsvLine(line) {
  const out = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      out.push(value); value = '';
    } else value += char;
  }
  out.push(value);
  return out;
}

async function loadChineseTranslations() {
  const translations = new Map();
  const quality = new Map();
  const ranks = new Map([['zh-CN', 3], ['zh-Hans', 2], ['zh', 1]]);
  const stream = fs.createReadStream(translationsPath).pipe(zlib.createGunzip());
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let first = true;
  for await (const line of lines) {
    if (first) { first = false; continue; }
    const [placeId, placeType, language, translation] = parseCsvLine(line);
    const rank = ranks.get(language);
    if (!rank || !['country', 'state', 'city'].includes(placeType)) continue;
    const key = `${placeType}:${placeId}`;
    if (rank > (quality.get(key) || 0)) {
      quality.set(key, rank);
      translations.set(key, translation);
    }
  }
  return translations;
}

const stripCnSuffix = name => String(name || '')
  .replace(/[·\s]/g, '')
  .replace(/(壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|自治州|地区|自治县|林区|新区|盟|省|市|区|县)$/u, '');

const roundLongitude = value => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 10000) / 10000 : null;
};

const slug = value => String(value || '').toLowerCase().normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function makeChinaStates(country, translations, chinaTree) {
  const byIso = new Map(country.states.map(state => [state.iso2, state]));
  const prefixToIso = {
    11: 'BJ', 12: 'TJ', 13: 'HE', 14: 'SX', 15: 'NM', 21: 'LN', 22: 'JL', 23: 'HL',
    31: 'SH', 32: 'JS', 33: 'ZJ', 34: 'AH', 35: 'FJ', 36: 'JX', 37: 'SD', 41: 'HA',
    42: 'HB', 43: 'HN', 44: 'GD', 45: 'GX', 46: 'HI', 50: 'CQ', 51: 'SC', 52: 'GZ',
    53: 'YN', 54: 'XZ', 61: 'SN', 62: 'GS', 63: 'QH', 64: 'NX', 65: 'XJ'
  };

  function candidates(state, names) {
    const wanted = new Set(names.map(stripCnSuffix).filter(Boolean));
    return state.cities.filter(city => {
      const translated = translations.get(`city:${city.id}`);
      return translated && wanted.has(stripCnSuffix(translated));
    });
  }

  return chinaTree.map(province => {
    const iso = prefixToIso[province.code];
    const sourceState = byIso.get(iso);
    if (!sourceState) throw new Error(`No world state match for China province ${province.name}`);
    const cities = [];
    const seen = new Set();
    for (const prefecture of province.children || []) {
      const direct = /直辖县级行政区划/.test(prefecture.name);
      const municipal = /^(11|12|31|50)$/.test(province.code);
      const entries = direct
        ? (prefecture.children || []).map(area => ({ code: area.code, name: area.name, children: [area] }))
        : municipal
          ? (cities.length ? [] : [{ code: `${province.code}00`, name: province.name, children: prefecture.children || [] }])
          : [prefecture];
      for (const entry of entries) {
        if (seen.has(entry.name)) continue;
        seen.add(entry.name);
        let matches = candidates(sourceState, [entry.name]);
        if (!matches.length) matches = candidates(sourceState, (entry.children || []).map(area => area.name));
        let longitude;
        if (matches.length) {
          const values = matches.map(city => Number(city.longitude)).filter(Number.isFinite).filter(value => value !== 0);
          if (values.length) longitude = values.reduce((sum, value) => sum + value, 0) / values.length;
        }
        if (!Number.isFinite(longitude)) longitude = Number(sourceState.longitude || country.longitude);
        cities.push([entry.code, entry.name, entry.name, roundLongitude(longitude)]);
      }
    }
    return [iso, sourceState.name, province.name, cities];
  });
}

const world = JSON.parse(fs.readFileSync(worldPath, 'utf8'));
const chinaTree = JSON.parse(fs.readFileSync(chinaPath, 'utf8'));
const translations = await loadChineseTranslations();
const countryZhOverrides = { CN: '中国大陆', HK: '中国香港', MO: '中国澳门', TW: '中国台湾' };
const usStateCodes = new Set(['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']);

fs.mkdirSync(outputDir, { recursive: true });
let stateCount = 0;
let cityCount = 0;
const countries = [];

for (const country of world) {
  const countryZh = countryZhOverrides[country.iso2] || translations.get(`country:${country.id}`) || country.native || country.name;
  let states;
  if (country.iso2 === 'CN') {
    states = makeChinaStates(country, translations, chinaTree);
  } else {
    states = country.states.map(state => {
      let stateZh = translations.get(`state:${state.id}`) || state.native || state.name;
      if (country.iso2 === 'US' && usStateCodes.has(state.iso2) && !/州$/u.test(stateZh)) stateZh += '州';
      let cities = state.cities.map(city => [
        String(city.id), city.name, translations.get(`city:${city.id}`) || city.name,
        roundLongitude(city.longitude) ?? roundLongitude(state.longitude) ?? roundLongitude(country.longitude)
      ]).filter(city => city[3] !== null);
      if (!cities.length) {
        cities = [[`s-${country.iso2}-${state.iso2 || slug(state.name)}`, state.name, stateZh, roundLongitude(state.longitude || country.longitude)]];
      }
      return [state.iso2 || slug(state.name), state.name, stateZh, cities];
    });
    if (!states.length) {
      const cityName = country.capital || country.name;
      states = [['ALL', 'Entire country / region', '全境', [[`c-${country.iso2}`, cityName, countryZh, roundLongitude(country.longitude)]]]];
    }
  }

  const file = { v: 1, c: country.iso2, n: country.name, z: countryZh, s: states };
  fs.writeFileSync(path.join(outputDir, `${country.iso2}.json`), JSON.stringify(file));
  const citiesInCountry = states.reduce((sum, state) => sum + state[3].length, 0);
  countries.push([country.iso2, country.name, countryZh, states.length, citiesInCountry]);
  stateCount += states.length;
  cityCount += citiesInCountry;
}

countries.sort((a, b) => a[1].localeCompare(b[1], 'en'));
fs.writeFileSync(path.join(outputDir, 'countries.json'), JSON.stringify({
  v: 1,
  source: 'dr5hn/countries-states-cities-database v3.2-export.7',
  countries
}));

console.log(JSON.stringify({ countries: countries.length, states: stateCount, cities: cityCount, outputDir }, null, 2));
