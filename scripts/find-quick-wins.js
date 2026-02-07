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

const outside1 = r.allResults.filter(u => Math.abs(u.percentDiff) > 1);

// Check: units with unresolved weapons
console.log('=== Units with unresolved weapons ===');
let unresolvedCount = 0;
for (const u of outside1) {
  const issues = u.issues || [];
  const unresolved = issues.filter(i => i.includes('nresolved'));
  if (unresolved.length > 0) {
    unresolvedCount++;
    console.log(`  ${u.chassis} ${u.model}: ${u.percentDiff.toFixed(2)}% - ${unresolved.join('; ')}`);
  }
}
console.log(`Total with unresolved: ${unresolvedCount}`);

// Check: units at -1.0% to -1.5% boundary (just barely outside)
console.log('\n=== Units barely outside 1% (1.0-1.5%) ===');
const barely = outside1.filter(u => Math.abs(u.percentDiff) > 1 && Math.abs(u.percentDiff) <= 1.5);
console.log(`Count: ${barely.length} (${barely.filter(u=>u.percentDiff<0).length} under, ${barely.filter(u=>u.percentDiff>0).length} over)`);

// Check: what weapons are most common in overcalculated units?
const weaponFreq = {};
for (const u of outside1.filter(x => x.percentDiff > 1)) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  for (const eq of data.equipment) {
    const id = eq.id.toLowerCase();
    if (id.includes('ammo') || id.includes('heat-sink') || id.includes('jump-jet')) continue;
    weaponFreq[id] = (weaponFreq[id] || 0) + 1;
  }
}
console.log('\n=== Most common weapons in overcalculated units ===');
const topWeapons = Object.entries(weaponFreq).sort((a, b) => b[1] - a[1]).slice(0, 15);
for (const [w, c] of topWeapons) console.log(`  ${w}: ${c}`);

// Check: PPC Capacitor pattern
console.log('\n=== PPC Capacitor units ===');
for (const u of outside1) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  const crits = JSON.stringify(data.criticalSlots || {}).toLowerCase();
  if (crits.includes('capacitor') || crits.includes('ppccapacitor')) {
    console.log(`  ${u.chassis} ${u.model}: ${u.percentDiff.toFixed(2)}% ref=${u.indexBV} calc=${u.calculatedBV} gap=${u.difference}`);
  }
}

// Check: command console
console.log('\n=== Command Console units (all, not just outside 1%) ===');
const ccUnits = r.allResults.filter(u => {
  const data = unitMap.get(u.unitId);
  return data && data.cockpit === 'COMMAND_CONSOLE';
}).sort((a, b) => a.percentDiff - b.percentDiff);
console.log(`Total: ${ccUnits.length}, avg: ${(ccUnits.reduce((s,u)=>s+u.percentDiff,0)/ccUnits.length).toFixed(2)}%`);
for (const u of ccUnits.filter(x => Math.abs(x.percentDiff) > 1)) {
  console.log(`  ${u.chassis} ${u.model}: ${u.percentDiff.toFixed(2)}%`);
}
