/* 全球出生地三级数据加载器：国家/地区 → 州/省 → 城市。按国家延迟加载。 */
(function (global) {
  'use strict';

  const BASE = 'data/places';
  let countriesPromise;
  const countryPromises = new Map();

  async function fetchJson(path) {
    const response = await fetch(path, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Place data request failed: ${response.status}`);
    return response.json();
  }

  global.SinanBirthPlaces = Object.freeze({
    version: 1,
    loadCountries() {
      if (!countriesPromise) countriesPromise = fetchJson(`${BASE}/countries.json`).then(data => data.countries || []);
      return countriesPromise;
    },
    loadCountry(code) {
      const safeCode = String(code || '').toUpperCase();
      if (!/^[A-Z]{2}$/.test(safeCode)) return Promise.reject(new Error('Invalid country code'));
      if (!countryPromises.has(safeCode)) {
        countryPromises.set(safeCode, fetchJson(`${BASE}/${safeCode}.json`));
      }
      return countryPromises.get(safeCode);
    }
  });
})(window);
