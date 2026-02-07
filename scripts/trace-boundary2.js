const r = require('../validation-output/bv-validation-report.json');
const idx = require('../public/data/units/battlemechs/index.json');
const fs = require('fs');
const path = require('path');

function loadUnit(id) {
  const ie = idx.units.find(e => e.id === id);
  if (!ie || !ie.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = r.allResults.filter(x => x.status !== 'error' && x.percentDiff !== null && x.breakdown);
const boundary = valid.filter(x => Math.abs(x.percentDiff) > 1 && Math.abs(x.percentDiff) <= 2);
const under = boundary.filter(x => x.percentDiff < 0);

// Check for equipment that might contribute to offensive BV  
console.log('=== EQUIPMENT IN UNDERCALCULATED BOUNDARY UNITS ===');
const equipFreq = {};
for (const u of under) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const crits = JSON.stringify(unit.criticalSlots || {}).toLowerCase();
  const equips = [];
  if (crits.includes('c3')) equips.push('C3');
  if (crits.includes('tag') && !crits.includes('stage')) equips.push('TAG');
  if (crits.includes('narc')) equips.push('NARC');
  if (crits.includes('streak')) equips.push('Streak');
  if (crits.includes('artemis')) equips.push('Artemis');
  if (crits.includes('targeting computer') || crits.includes('istc') || crits.includes('cltargetingcomputer')) equips.push('TC');
  if (crits.includes('apollo') || crits.includes('fcs')) equips.push('Apollo/FCS');
  if (crits.includes('ppc capacitor') || crits.includes('ppccapacitor')) equips.push('PPCCap');
  if (crits.includes('rotary')) equips.push('Rotary');
  if (crits.includes('ultra')) equips.push('Ultra');
  if (crits.includes('lb ') || crits.includes('lb-') || crits.includes('lbx') || crits.includes('lb x')) equips.push('LBX');
  
  for (const e of equips) equipFreq[e] = (equipFreq[e] || 0) + 1;
  
  if (equips.length > 0) {
    console.log('  ' + u.unitId.padEnd(40) + u.percentDiff.toFixed(2).padStart(7) + '% gap=' + u.difference.toString().padStart(4) + ' equip=' + equips.join(','));
  } else {
    console.log('  ' + u.unitId.padEnd(40) + u.percentDiff.toFixed(2).padStart(7) + '% gap=' + u.difference.toString().padStart(4) + ' [no special equip]');
  }
}
console.log('\nEquipment frequency in undercalculated boundary:', JSON.stringify(equipFreq, null, 2));

// Now do the same for overcalculated boundary
console.log('\n=== EQUIPMENT IN OVERCALCULATED BOUNDARY UNITS ===');
const over = boundary.filter(x => x.percentDiff > 0);
const overEquipFreq = {};
for (const u of over) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const crits = JSON.stringify(unit.criticalSlots || {}).toLowerCase();
  const equips = [];
  if (crits.includes('c3')) equips.push('C3');
  if (crits.includes('tag') && !crits.includes('stage')) equips.push('TAG');
  if (crits.includes('narc')) equips.push('NARC');
  if (crits.includes('streak')) equips.push('Streak');
  if (crits.includes('artemis')) equips.push('Artemis');
  if (crits.includes('targeting computer') || crits.includes('istc') || crits.includes('cltargetingcomputer')) equips.push('TC');
  if (crits.includes('ppc capacitor') || crits.includes('ppccapacitor')) equips.push('PPCCap');
  if (crits.includes('rotary')) equips.push('Rotary');
  if (crits.includes('ultra')) equips.push('Ultra');
  if (crits.includes('lb ') || crits.includes('lb-') || crits.includes('lbx') || crits.includes('lb x')) equips.push('LBX');
  
  for (const e of equips) overEquipFreq[e] = (overEquipFreq[e] || 0) + 1;
  
  if (equips.length > 0) {
    console.log('  ' + u.unitId.padEnd(40) + u.percentDiff.toFixed(2).padStart(7) + '% gap=' + u.difference.toString().padStart(4) + ' equip=' + equips.join(','));
  }
}
console.log('\nEquipment frequency in overcalculated boundary:', JSON.stringify(overEquipFreq, null, 2));
