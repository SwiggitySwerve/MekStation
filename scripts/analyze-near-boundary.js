const fs = require('fs');
const path = require('path');
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

function findJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findJsonFiles(full));
    else if (entry.name.endsWith('.json') && entry.name !== 'index.json') results.push(full);
  }
  return results;
}

const files = findJsonFiles('public/data/units/battlemechs');
const unitMap = new Map();
for (const f of files) {
  try { const d = JSON.parse(fs.readFileSync(f, 'utf8')); unitMap.set(d.id, d); } catch {}
}

// Near-boundary undercalculated (1.0-1.5%)
const nearUnder = r.allResults.filter(u => u.percentDiff < -1 && u.percentDiff >= -1.5)
  .sort((a, b) => a.percentDiff - b.percentDiff);

console.log('=== Undercalculated 1.0-1.5% (' + nearUnder.length + ' units) ===\n');

// Group by common patterns
let mgaCount = 0, mixedCount = 0, clanCount = 0, isCount = 0;
let hasArtCount = 0, hasTCCount = 0;
const weaponPatterns = {};

for (const u of nearUnder) {
  const b = u.breakdown || {};
  const data = unitMap.get(u.unitId);
  if (!data) continue;

  const crits = JSON.stringify(data.criticalSlots || {}).toLowerCase();
  const hasMGA = crits.includes('mga') || crits.includes('machine gun array');
  const hasArt = crits.includes('artemis');
  const hasTC = crits.includes('targeting computer') || crits.includes('targcomp');

  if (hasMGA) mgaCount++;
  if (hasArt) hasArtCount++;
  if (hasTC) hasTCCount++;
  if (b.techBase === 'MIXED') mixedCount++;
  else if (b.techBase === 'CLAN') clanCount++;
  else isCount++;

  console.log(`${u.chassis} ${u.model}: ${u.percentDiff.toFixed(2)}% gap=${u.difference} ref=${u.indexBV} tech=${b.techBase} sf=${b.speedFactor} df=${b.defensiveFactor} wBV=${b.rawWeaponBV} aBV=${b.ammoBV}${hasMGA ? ' [MGA]' : ''}${hasArt ? ' [ART]' : ''}${hasTC ? ' [TC]' : ''}`);
}

console.log('\nSummary:');
console.log('  MGA:', mgaCount);
console.log('  Artemis:', hasArtCount);
console.log('  TC:', hasTCCount);
console.log('  MIXED:', mixedCount, 'CLAN:', clanCount, 'IS:', isCount);

// Also check overcalculated 1.0-1.5%
const nearOver = r.allResults.filter(u => u.percentDiff > 1 && u.percentDiff <= 1.5)
  .sort((a, b) => b.percentDiff - a.percentDiff);

console.log('\n=== Overcalculated 1.0-1.5% (' + nearOver.length + ' units) ===\n');
let overMGA = 0, overArt = 0, overTC = 0;
for (const u of nearOver) {
  const b = u.breakdown || {};
  const data = unitMap.get(u.unitId);
  if (!data) continue;

  const crits = JSON.stringify(data.criticalSlots || {}).toLowerCase();
  const hasMGA = crits.includes('mga') || crits.includes('machine gun array');
  const hasArt = crits.includes('artemis');
  const hasTC = crits.includes('targeting computer') || crits.includes('targcomp');

  if (hasMGA) overMGA++;
  if (hasArt) overArt++;
  if (hasTC) overTC++;

  console.log(`${u.chassis} ${u.model}: +${u.percentDiff.toFixed(2)}% gap=${u.difference} ref=${u.indexBV} tech=${b.techBase} sf=${b.speedFactor}${hasMGA ? ' [MGA]' : ''}${hasArt ? ' [ART]' : ''}${hasTC ? ' [TC]' : ''}`);
}
console.log('\nOver summary: MGA:', overMGA, 'ART:', overArt, 'TC:', overTC);
