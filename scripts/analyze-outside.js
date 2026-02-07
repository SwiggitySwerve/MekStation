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

const outside = r.allResults.filter(u => Math.abs(u.percentDiff) > 1);
console.log('=== ' + outside.length + ' units outside 1% ===\n');

// Group by overcalc/undercalc
const over = outside.filter(u => u.percentDiff > 0).sort((a, b) => b.percentDiff - a.percentDiff);
const under = outside.filter(u => u.percentDiff < 0).sort((a, b) => a.percentDiff - b.percentDiff);
console.log('Overcalculated:', over.length);
console.log('Undercalculated:', under.length);

// Analyze overcalculated for common equipment/tags
console.log('\n=== TOP OVERCALCULATED (our BV too high) ===');
for (const u of over.slice(0, 25)) {
  const data = unitMap.get(u.unitId);
  const b = u.breakdown || {};
  const flags = [];
  if (data) {
    const crits = Object.values(data.criticalSlots || {}).flat().filter(Boolean);
    if (data.techBase === 'MIXED') flags.push('MIXED');
    if (data.type === 'QUAD') flags.push('QUAD');
    if (b.cockpitType && b.cockpitType !== 'standard') flags.push('cockpit:' + b.cockpitType);
    if (crits.some(s => s.toLowerCase().includes('supercharger'))) flags.push('SC');
    if (crits.some(s => s.toLowerCase().includes('targeting computer'))) flags.push('TC');
    if (crits.some(s => s.toLowerCase().includes('prototype'))) flags.push('PROTO');
    if (crits.some(s => s.toLowerCase().includes('re-engineered') || s.toLowerCase().includes('reengineered'))) flags.push('RE-ENG');
    if (crits.some(s => s.toLowerCase().includes('radical'))) flags.push('RADICAL');
    if (crits.some(s => s.toLowerCase().includes('stealth'))) flags.push('STEALTH');
    if (crits.some(s => s.toLowerCase().includes('null'))) flags.push('NSS');
    if (crits.some(s => s.toLowerCase().includes('void'))) flags.push('VSS');
    if (crits.some(s => s.toLowerCase().includes('chameleon'))) flags.push('CHAMELEON');
    if (crits.some(s => s.toLowerCase().includes('composite') && !s.toLowerCase().includes('structure'))) flags.push('COMP');
    if (data.structure && data.structure.type === 'COMPOSITE') flags.push('COMP-STRUCT');
    if (data.gyro && data.gyro.type === 'NONE') flags.push('NO-GYRO');
    if (data.gyro && data.gyro.type === 'SUPERHEAVY') flags.push('SH-GYRO');
  }
  console.log(`  ${u.percentDiff > 0 ? '+' : ''}${u.percentDiff.toFixed(2)}%  ${u.chassis} ${u.model} (gap=${u.difference > 0 ? '+' : ''}${u.difference}) [${flags.join(', ')}]`);
}

console.log('\n=== TOP UNDERCALCULATED (our BV too low) ===');
for (const u of under.slice(0, 25)) {
  const data = unitMap.get(u.unitId);
  const b = u.breakdown || {};
  const flags = [];
  if (data) {
    const crits = Object.values(data.criticalSlots || {}).flat().filter(Boolean);
    if (data.techBase === 'MIXED') flags.push('MIXED');
    if (data.type === 'QUAD') flags.push('QUAD');
    if (b.cockpitType && b.cockpitType !== 'standard') flags.push('cockpit:' + b.cockpitType);
    if (crits.some(s => s.toLowerCase().includes('supercharger'))) flags.push('SC');
    if (crits.some(s => s.toLowerCase().includes('targeting computer'))) flags.push('TC');
    if (crits.some(s => s.toLowerCase().includes('artemis'))) flags.push('ARTEMIS');
    if (crits.some(s => s.toLowerCase().includes('apollo'))) flags.push('APOLLO');
    if (crits.some(s => s.toLowerCase().includes('ppc capacitor'))) flags.push('PPC-CAP');
    if (crits.some(s => s.toLowerCase().includes('stealth'))) flags.push('STEALTH');
    if (data.armor && data.armor.type && data.armor.type !== 'STANDARD') flags.push('armor:' + data.armor.type);
  }
  console.log(`  ${u.percentDiff.toFixed(2)}%  ${u.chassis} ${u.model} (gap=${u.difference}) [${flags.join(', ')}]`);
}

// Analyze by gap magnitude: how many are close to threshold?
const barely = outside.filter(u => Math.abs(u.percentDiff) <= 1.5);
console.log('\n=== BARELY OUTSIDE 1% (between 1-1.5%): ' + barely.length + ' units ===');
for (const u of barely.sort((a,b) => Math.abs(a.percentDiff) - Math.abs(b.percentDiff))) {
  const data = unitMap.get(u.unitId);
  const flags = [];
  if (data) {
    if (data.techBase === 'MIXED') flags.push('MIX');
    if (data.type === 'QUAD') flags.push('Q');
    const crits = Object.values(data.criticalSlots || {}).flat().filter(Boolean);
    if (crits.some(s => s.toLowerCase().includes('supercharger'))) flags.push('SC');
    if (crits.some(s => s.toLowerCase().includes('targeting computer'))) flags.push('TC');
    if (crits.some(s => s.toLowerCase().includes('artemis'))) flags.push('ART');
  }
  console.log(`  ${u.percentDiff > 0 ? '+' : ''}${u.percentDiff.toFixed(2)}%  ${u.chassis} ${u.model} (${u.difference > 0 ? '+' : ''}${u.difference}) [${flags.join(',')}]`);
}
