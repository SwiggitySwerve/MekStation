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

const outside1 = r.allResults.filter(u => Math.abs(u.percentDiff) > 1)
  .sort((a, b) => Math.abs(b.percentDiff) - Math.abs(a.percentDiff));
const under = outside1.filter(u => u.percentDiff < 0);
const over = outside1.filter(u => u.percentDiff > 0);

console.log(`Outside 1%: ${outside1.length} (under: ${under.length}, over: ${over.length})\n`);

// Categorize by features
const features = {};
function addFeature(name, u) {
  if (!features[name]) features[name] = { under: [], over: [] };
  if (u.percentDiff < 0) features[name].under.push(u);
  else features[name].over.push(u);
}

for (const u of outside1) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  const b = u.breakdown || {};
  const crits = JSON.stringify(data.criticalSlots || {}).toLowerCase();
  const cockpit = data.cockpit || 'UNKNOWN';

  // Features
  if (crits.includes('targeting computer') || crits.includes('targcomp')) addFeature('TC', u);
  if (crits.includes('artemis')) addFeature('Artemis', u);
  if (crits.includes('mga') || crits.includes('machine gun array')) addFeature('MGA', u);
  if (crits.includes('insulator')) addFeature('LaserInsulator', u);
  if (crits.includes('apollo')) addFeature('Apollo', u);
  if (crits.includes('bombast')) addFeature('BombastLaser', u);
  if (crits.includes('capacitor') || crits.includes('ppccapacitor')) addFeature('PPCCap', u);
  if (b.techBase === 'MIXED') addFeature('MIXED', u);
  if (b.techBase === 'CLAN') addFeature('CLAN', u);
  if (b.techBase === 'INNER_SPHERE') addFeature('IS', u);
  if (cockpit === 'INTERFACE') addFeature('Interface', u);
  if (cockpit === 'COMMAND_CONSOLE') addFeature('CmdConsole', u);
  if (cockpit === 'SMALL') addFeature('SmallCockpit', u);
  if (cockpit === 'TORSO_MOUNTED') addFeature('TorsoMounted', u);
  if (data.criticalSlots && (data.criticalSlots.FRONT_LEFT_LEG || data.criticalSlots.REAR_LEFT_LEG)) addFeature('Quad', u);
  if (crits.includes('oneshot') || crits.includes('one-shot') || crits.includes('(os)')) addFeature('OneShot', u);

  // Check for unresolved weapons
  if ((u.breakdown?.issues || []).some(i => i.includes('unresolved'))) addFeature('Unresolved', u);
}

console.log('Feature breakdown (under / over / total):');
const sorted = Object.entries(features).sort((a, b) => (b[1].under.length + b[1].over.length) - (a[1].under.length + a[1].over.length));
for (const [name, data] of sorted) {
  const total = data.under.length + data.over.length;
  const pct = ((total / outside1.length) * 100).toFixed(0);
  console.log(`  ${name}: ${data.under.length} under / ${data.over.length} over / ${total} total (${pct}%)`);
}

// Check: how many overcalculated units have TC? What's the average overcalculation for TC vs non-TC?
const overTC = over.filter(u => {
  const data = unitMap.get(u.unitId);
  if (!data) return false;
  const crits = JSON.stringify(data.criticalSlots || {}).toLowerCase();
  return crits.includes('targeting computer') || crits.includes('targcomp');
});
const overNoTC = over.filter(u => !overTC.includes(u));
const avgOverTC = overTC.length > 0 ? overTC.reduce((s, u) => s + u.percentDiff, 0) / overTC.length : 0;
const avgOverNoTC = overNoTC.length > 0 ? overNoTC.reduce((s, u) => s + u.percentDiff, 0) / overNoTC.length : 0;
console.log(`\nOvercalc with TC: ${overTC.length} (avg +${avgOverTC.toFixed(2)}%)`);
console.log(`Overcalc no TC: ${overNoTC.length} (avg +${avgOverNoTC.toFixed(2)}%)`);

// Interface cockpit analysis - all 5 overcalculated
console.log('\n=== Interface cockpit units ===');
const interfaceUnits = r.allResults.filter(u => {
  const data = unitMap.get(u.unitId);
  return data && data.cockpit === 'INTERFACE';
});
for (const u of interfaceUnits) {
  console.log(`  ${u.chassis} ${u.model}: ${u.percentDiff.toFixed(2)}% ref=${u.indexBV} calc=${u.calculatedBV}`);
}
console.log(`Avg: ${(interfaceUnits.reduce((s,u)=>s+u.percentDiff,0)/interfaceUnits.length).toFixed(2)}%`);
