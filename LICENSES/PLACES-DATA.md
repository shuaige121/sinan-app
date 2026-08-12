# Place data

The generated files under `www/data/places/` use the following sources:

- Countries, first-level administrative divisions, cities, coordinates, and translations: [Countries States Cities Database](https://github.com/dr5hn/countries-states-cities-database), release `v3.2-export.7`, licensed under the Open Database License (ODbL) 1.0.
- Mainland China province and prefecture hierarchy/names: [Administrative-divisions-of-China](https://github.com/modood/Administrative-divisions-of-China), licensed under WTFPL 2.0.

The build script reduces the source data to the display names and longitude required by the true-solar-time selector. Please preserve this attribution and the applicable share-alike terms when redistributing the derived place database.
