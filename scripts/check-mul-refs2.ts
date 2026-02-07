import * as fs from 'fs';
const mulCache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf8'));
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// Check actual cache structure
console.log('Cache top-level keys:', Object.keys(mulCache).slice(0, 5));
const entries = mulCache.entries || mulCache;
console.log('First 3 entries:', Object.keys(entries).slice(0, 3));

// Check specific units
const underIds = ['osteon-d', 'osteon-c', 'mad-cat-u', 'loki-mk-ii-a', 'cougar-t'];
for (const uid of underIds) {
  const entry = entries[uid];
  const ie = idx.units.find((u: any) => u.id === uid);
  const res = r.allResults.find((x: any) => x.unitId === uid);
  console.log(`\n${uid}:`);
  console.log(`  Index bv: ${ie?.bv}`);
  if (entry) {
    console.log(`  Cache: name="${entry.mulName}" bv=${entry.mulBV} match=${entry.matchType}`);
  } else {
    console.log(`  Cache: NOT FOUND`);
  }
  if (res) {
    console.log(`  Result: indexBV=${res.indexBV} calc=${res.calculatedBV} diff=${res.difference}`);
  }
}

// Check how many units have entries in the cache but aren't loaded into mulBVMap
// (because they're fuzzy matches that fail the strict check)
let exactMatch = 0, fuzzyAccepted = 0, fuzzyRejected = 0, notFound = 0, noEntry = 0;
for (const u of idx.units) {
  const entry = entries[u.id];
  if (!entry) { noEntry++; continue; }
  if (entry.matchType === 'exact' && entry.mulBV > 0) { exactMatch++; continue; }
  if (entry.matchType === 'not-found') { notFound++; continue; }
  if (entry.matchType === 'fuzzy' && entry.mulBV > 0 && entry.mulName) {
    const mulStripped = entry.mulName.toLowerCase().trim()
      .replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
    const expected = (u.chassis + ' ' + u.model).toLowerCase().trim();
    if (mulStripped === expected) { fuzzyAccepted++; }
    else { fuzzyRejected++; }
  } else {
    notFound++;
  }
}
console.log(`\n=== MUL CACHE STATS ===`);
console.log(`  Exact: ${exactMatch}`);
console.log(`  Fuzzy accepted: ${fuzzyAccepted}`);
console.log(`  Fuzzy rejected: ${fuzzyRejected}`);
console.log(`  Not found: ${notFound}`);
console.log(`  No entry: ${noEntry}`);
console.log(`  Total: ${exactMatch + fuzzyAccepted + fuzzyRejected + notFound + noEntry}`);

// So the units with no cache entry AND matchType undefined will use index BV
// How many validated units have no MUL reference?
const validated = r.allResults.filter((x: any) => x.status !== 'error');
let withMul = 0, withoutMul = 0;
for (const v of validated) {
  const entry = entries[v.unitId];
  if (entry && (entry.matchType === 'exact' || (entry.matchType === 'fuzzy' && entry.mulBV > 0))) {
    withMul++;
  } else {
    withoutMul++;
  }
}
console.log(`\nValidated: ${validated.length}`);
console.log(`  With MUL entry: ${withMul}`);
console.log(`  Without MUL entry: ${withoutMul}`);
