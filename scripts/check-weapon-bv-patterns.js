const fs = require('fs');
const path = require('path');
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

function findJsonFiles(dir) {
  const results = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) results.push(...findJsonFiles(f));
    else if (e.name.endsWith('.json') && e.name !== 'index.json') results.push(f);
  }
  return results;
}
const files = findJsonFiles('public/data/units/battlemechs');
const unitMap = new Map();
for (const f of files) { try { const d = JSON.parse(fs.readFileSync(f, 'utf8')); unitMap.set(d.id, d); } catch {} }

const resultMap = new Map();
for (const u of r.allResults) resultMap.set(u.unitId, u);

// For each weapon type, compute: how many units use it, what % are outside 1%, avg diff direction
const weaponStats = {};
for (const [id, data] of unitMap) {
  if (!data.equipment) continue;
  const u = resultMap.get(id);
  if (!u) continue;

  const outside = Math.abs(u.percentDiff) > 1;
  const over = u.percentDiff > 1;
  const under = u.percentDiff < -1;

  for (const eq of data.equipment) {
    const wid = eq.id.toLowerCase();
    if (wid.includes('ammo') || wid.includes('heat') || wid.includes('endo') || wid.includes('ferro') || wid.includes('case')) continue;

    if (!weaponStats[wid]) weaponStats[wid] = { total: 0, outside: 0, over: 0, under: 0, sumDiff: 0 };
    weaponStats[wid].total++;
    if (outside) {
      weaponStats[wid].outside++;
      if (over) weaponStats[wid].over++;
      if (under) weaponStats[wid].under++;
    }
    weaponStats[wid].sumDiff += u.percentDiff;
  }
}

// Sort by outside % (descending), but only show weapons used by at least 5 units
console.log('=== WEAPONS WITH HIGHEST OUTSIDE-1% RATE (min 5 units) ===');
const entries = Object.entries(weaponStats)
  .filter(([, s]) => s.total >= 5)
  .sort((a, b) => (b[1].outside / b[1].total) - (a[1].outside / a[1].total));

for (const [wid, s] of entries.slice(0, 40)) {
  const rate = (100 * s.outside / s.total).toFixed(1);
  const avgDiff = (s.sumDiff / s.total).toFixed(2);
  const dir = s.over > s.under ? 'OVER' : s.under > s.over ? 'UNDER' : 'MIXED';
  if (s.outside > 0) {
    console.log(`  ${wid}: ${s.total} units, ${s.outside} outside (${rate}%), ${s.over} over/${s.under} under [${dir}] avgDiff=${avgDiff}%`);
  }
}

// Also check: weapons ONLY appearing in outside-1% units (might be resolution issue)
console.log('\n=== WEAPONS ONLY IN OUTSIDE-1% UNITS ===');
for (const [wid, s] of Object.entries(weaponStats)) {
  if (s.total <= 3 && s.outside === s.total && s.total > 0) {
    console.log(`  ${wid}: ${s.total} units, ALL outside 1%`);
  }
}
