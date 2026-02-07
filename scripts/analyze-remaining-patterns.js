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

const outside1 = r.allResults.filter(u => Math.abs(u.percentDiff) > 1);
console.log('=== OUTSIDE 1% ANALYSIS ===');
console.log('Total:', outside1.length);
console.log('Overcalculated:', outside1.filter(u => u.difference > 0).length);
console.log('Undercalculated:', outside1.filter(u => u.difference < 0).length);

// Check for common features
const features = {};
for (const u of outside1) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  const crits = Object.values(data.criticalSlots || {}).flat().filter(Boolean).map(s => s.toLowerCase().replace(/\s*\(omnipod\)/g, ''));
  const equip = (data.equipment || []).map(e => e.id.toLowerCase());

  const tags = [];

  // Tech base
  if (data.techBase === 'CLAN') tags.push('CLAN');
  if (data.techBase === 'MIXED') tags.push('MIXED');

  // Structure
  if (crits.some(s => s.includes('endo steel') || s.includes('endosteel'))) tags.push('ENDO');
  if (crits.some(s => s.includes('endo-composite') || s.includes('endocomposite'))) tags.push('ENDO-COMP');

  // Armor
  if (data.armor?.type === 'FERRO_FIBROUS' || crits.some(s => s.includes('ferro-fibrous') && !s.includes('light') && !s.includes('heavy'))) tags.push('FF');
  if (crits.some(s => s.includes('light ferro'))) tags.push('LFF');
  if (crits.some(s => s.includes('heavy ferro'))) tags.push('HFF');
  if (crits.some(s => s.includes('stealth') && s.includes('armor'))) tags.push('STEALTH');
  if (crits.some(s => s.includes('reactive') && s.includes('armor'))) tags.push('REACTIVE');
  if (crits.some(s => s.includes('reflective') && s.includes('armor'))) tags.push('REFLECTIVE');
  if (crits.some(s => s.includes('hardened') && s.includes('armor'))) tags.push('HARDENED');

  // Engine
  if (data.engine?.type === 'XL') tags.push('XL');
  if (data.engine?.type === 'LIGHT') tags.push('LIGHT_ENG');
  if (data.engine?.type === 'XXL') tags.push('XXL');
  if (data.engine?.type === 'COMPACT') tags.push('COMPACT_ENG');

  // Gyro
  if (data.gyro?.type === 'COMPACT') tags.push('COMPACT_GYRO');
  if (data.gyro?.type === 'HEAVY_DUTY') tags.push('HD_GYRO');
  if (data.gyro?.type === 'XL') tags.push('XL_GYRO');

  // Cockpit
  if (data.cockpit === 'SMALL') tags.push('SMALL_COCKPIT');
  if (data.cockpit === 'TORSO_MOUNTED') tags.push('TORSO_COCKPIT');

  // Special equipment
  if (crits.some(s => s.includes('targeting computer'))) tags.push('TC');
  if (crits.some(s => s.includes('artemis iv'))) tags.push('ART4');
  if (crits.some(s => s.includes('artemis v') || s.includes('artemisv'))) tags.push('ART5');
  if (crits.some(s => s.includes('apollo'))) tags.push('APOLLO');
  if (crits.some(s => s.includes('supercharger'))) tags.push('SC');
  if (crits.some(s => s.includes('masc'))) tags.push('MASC');
  if (crits.some(s => s.includes('triple strength myomer'))) tags.push('TSM');
  if (crits.some(s => s.includes('case ii'))) tags.push('CASE2');
  if (equip.some(e => e.includes('one-shot'))) tags.push('ONESHOT');
  if (crits.some(s => s.includes('thunderbolt'))) tags.push('TBOLT');
  if (crits.some(s => s.includes('capacitor') || s.includes('ppc capacitor'))) tags.push('PPC_CAP');
  if (crits.some(s => s.includes('streak'))) tags.push('STREAK');
  if (crits.some(s => s.includes('lrt') || s.includes('srt'))) tags.push('TORPEDO');
  if (crits.some(s => s.includes('ultra ac') || s.includes('ultra autocannon'))) tags.push('UAC');
  if (crits.some(s => s.includes('rotary ac') || s.includes('rotary autocannon'))) tags.push('RAC');
  if (crits.some(s => s.includes('lb') && s.includes('-x'))) tags.push('LBX');
  if (crits.some(s => s.includes('radical heat'))) tags.push('RADICAL_HS');
  if (crits.some(s => s.includes('partial wing'))) tags.push('PARTIAL_WING');
  if (crits.some(s => s.includes('coolant pod'))) tags.push('COOLANT_POD');
  if (crits.some(s => s.includes('prototype'))) tags.push('PROTOTYPE');
  if (crits.some(s => s.includes('light ppc') || s.includes('er ppc') || s.includes('snub-nose') || s.includes('heavy ppc'))) tags.push('PPC_VARIANT');
  if (crits.some(s => s.includes('mml'))) tags.push('MML');
  if (crits.some(s => s.includes('narc') || s.includes('inarc'))) tags.push('NARC');
  if (crits.some(s => s.includes('c3') && !s.includes('ac'))) tags.push('C3');
  if (crits.some(s => s.includes('tag'))) tags.push('TAG');
  if (crits.some(s => s.includes('ecm'))) tags.push('ECM');
  if (crits.some(s => s.includes('bap') || s.includes('bloodhound') || s.includes('active probe'))) tags.push('PROBE');
  if (data.movement?.jump > 0) tags.push('JUMP');

  for (const tag of tags) {
    if (!features[tag]) features[tag] = { over: 0, under: 0, totalAbsDiff: 0, units: [] };
    features[tag].totalAbsDiff += Math.abs(u.difference);
    if (u.difference > 0) features[tag].over++;
    else features[tag].under++;
    features[tag].units.push(`${u.chassis} ${u.model} (${u.difference > 0 ? '+' : ''}${u.percentDiff.toFixed(1)}%)`);
  }
}

// Sort by total impact
const sorted = Object.entries(features).sort((a, b) => b[1].totalAbsDiff - a[1].totalAbsDiff);
console.log('\n=== FEATURE IMPACT (sorted by total BV gap) ===');
for (const [tag, data] of sorted) {
  const total = data.over + data.under;
  const bias = data.over > data.under ? 'OVER' : data.under > data.over ? 'UNDER' : 'MIXED';
  console.log(`${tag}: ${total} units (${data.over} over, ${data.under} under) totalGap=${data.totalAbsDiff} bias=${bias}`);
}

// Show units with specific interesting features
console.log('\n=== PROTOTYPE UNITS ===');
if (features.PROTOTYPE) features.PROTOTYPE.units.forEach(u => console.log('  ' + u));

console.log('\n=== TORPEDO UNITS ===');
if (features.TORPEDO) features.TORPEDO.units.forEach(u => console.log('  ' + u));

console.log('\n=== TBOLT UNITS ===');
if (features.TBOLT) features.TBOLT.units.forEach(u => console.log('  ' + u));

console.log('\n=== PPC_CAP UNITS ===');
if (features.PPC_CAP) features.PPC_CAP.units.forEach(u => console.log('  ' + u));

console.log('\n=== RADICAL_HS UNITS ===');
if (features.RADICAL_HS) features.RADICAL_HS.units.forEach(u => console.log('  ' + u));

console.log('\n=== PARTIAL_WING UNITS ===');
if (features.PARTIAL_WING) features.PARTIAL_WING.units.forEach(u => console.log('  ' + u));

console.log('\n=== COOLANT_POD UNITS ===');
if (features.COOLANT_POD) features.COOLANT_POD.units.forEach(u => console.log('  ' + u));

console.log('\n=== SC (Supercharger) UNITS ===');
if (features.SC) features.SC.units.forEach(u => console.log('  ' + u));

console.log('\n=== APOLLO UNITS ===');
if (features.APOLLO) features.APOLLO.units.forEach(u => console.log('  ' + u));

// Check unresolved equipment
console.log('\n=== UNRESOLVED WEAPONS IN OUTSIDE-1% UNITS ===');
const unresolvedCount = {};
for (const u of outside1) {
  if (u.issues && u.issues.length > 0) {
    for (const issue of u.issues) {
      if (issue.includes('unresolved') || issue.includes('UNRESOLVED')) {
        unresolvedCount[issue] = (unresolvedCount[issue] || 0) + 1;
      }
    }
  }
}
for (const [issue, count] of Object.entries(unresolvedCount).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${count}x: ${issue}`);
}
