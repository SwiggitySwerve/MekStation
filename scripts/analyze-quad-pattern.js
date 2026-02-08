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

// All quad mechs
const quads = r.allResults.filter(u => {
  const data = unitMap.get(u.unitId);
  return data && data.criticalSlots && (data.criticalSlots.FRONT_LEFT_LEG || data.criticalSlots.REAR_LEFT_LEG);
}).sort((a, b) => a.percentDiff - b.percentDiff);

console.log(`Total quad mechs: ${quads.length}`);
console.log(`Under 1%: ${quads.filter(u => u.percentDiff < -1).length}`);
console.log(`Within 1%: ${quads.filter(u => Math.abs(u.percentDiff) <= 1).length}`);
console.log(`Over 1%: ${quads.filter(u => u.percentDiff > 1).length}`);
const avg = quads.reduce((s, u) => s + u.percentDiff, 0) / quads.length;
console.log(`Average: ${avg.toFixed(2)}%\n`);

// Show all outside 1%
console.log('=== Quad mechs outside 1% ===');
for (const u of quads.filter(x => Math.abs(x.percentDiff) > 1)) {
  const data = unitMap.get(u.unitId);
  const b = u.breakdown || {};
  const cockpit = data?.cockpit || 'UNKNOWN';
  console.log(`  ${u.chassis} ${u.model}: ${u.percentDiff.toFixed(2)}% ref=${u.indexBV} calc=${u.calculatedBV} gap=${u.difference} cockpit=${cockpit} tech=${b.techBase}`);
}

// Check: what % of overcalculated units have high ammo BV?
console.log('\n=== Ammo BV analysis for overcalculated outside-1% ===');
const over = r.allResults.filter(u => u.percentDiff > 1).sort((a,b) => b.percentDiff - a.percentDiff);
let highAmmoCnt = 0;
for (const u of over.slice(0, 20)) {
  const b = u.breakdown || {};
  const ammoPct = b.ammoBV > 0 && b.rawWeaponBV > 0 ? ((b.ammoBV / b.rawWeaponBV) * 100).toFixed(0) : '0';
  const ammoInfo = b.ammoBV > 0 ? ` ammo=${b.ammoBV} (${ammoPct}% of wBV)` : '';
  if (b.ammoBV > b.rawWeaponBV * 0.3) highAmmoCnt++;
  console.log(`  ${u.chassis} ${u.model}: +${u.percentDiff.toFixed(2)}%${ammoInfo} wBV=${b.rawWeaponBV} tech=${b.techBase}`);
}
console.log(`High ammo (>30% of weapon BV): ${highAmmoCnt}/${Math.min(20, over.length)}`);
