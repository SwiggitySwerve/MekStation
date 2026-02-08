const r = require('../validation-output/bv-validation-report.json');
const fs = require('fs');
const path = require('path');

const unitIdx = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs/index.json'), 'utf8'));
const unitMap = {};
for (const u of unitIdx.units) unitMap[u.id] = u;

// Known offensive equipment in MegaMek (with BV values)
const offensiveEquipPatterns = [
  { pattern: /\bc3\s*slave/i, name: 'C3 Slave', bv: 0 }, // C3 slave doesn't add own BV
  { pattern: /\bc3\s*master/i, name: 'C3 Master', bv: 0 },
  { pattern: /\bc3i/i, name: 'C3i', bv: 0 },
  { pattern: /\bnarc\b/i, name: 'NARC', bv: 0 },  // NARC is weapon, already counted
  { pattern: /\btag\b/i, name: 'TAG', bv: 0 },     // TAG=0 BV per MegaMek
  { pattern: /\bbap\b|active\s*probe|beagle/i, name: 'Active Probe/BAP', bv: 0 },
  { pattern: /\becm\b|guardian\s*ecm|angel\s*ecm/i, name: 'ECM', bv: 0 }, // defensive
  { pattern: /\bap\s*pods?\b|\bb-?pods?\b/i, name: 'A-Pod/B-Pod', bv: 0 },
];

// Check all boundary units
const boundary = r.allResults.filter(x => x.status === 'within5');
console.log('=== OFFENSIVE EQUIPMENT IN BOUNDARY UNITS ===\n');

// Focus: find equipment that should add BV but doesn't
// In MegaMek, these items have positive offensive BV:
// - NARC: counted as weapon already
// - Targeting Computer: already handled via hasTC
// - C3 Slave/Master: affects BV indirectly through C3 network bonus, NOT as direct offensive BV

// Check what breakdown shows for offEquipBV
let withOffEquip = 0;
for (const b of boundary) {
  if (b.breakdown && (b.breakdown.offEquipBV > 0 || b.breakdown.offensiveEquipmentBV > 0)) {
    withOffEquip++;
    console.log(`  ${b.unitId}: offEquipBV=${b.breakdown.offEquipBV || b.breakdown.offensiveEquipmentBV}`);
  }
}
console.log(`Units with offEquipBV > 0: ${withOffEquip}/${boundary.length}`);

// Check what equipment these units have
console.log('\n=== EQUIPMENT FOUND IN BOUNDARY UNIT CRITS ===');
const equipFreq = {};
for (const b of boundary) {
  const unit = unitMap[b.unitId];
  if (!unit || !unit.criticalSlots) continue;
  for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
    for (const s of slots) {
      if (!s || s === '-Empty-') continue;
      const lo = s.toLowerCase();
      // Skip common structure
      if (lo.includes('endo') || lo.includes('ferro') || lo.includes('engine') ||
          lo.includes('gyro') || lo.includes('actuator') || lo.includes('life support') ||
          lo.includes('sensors') || lo.includes('cockpit') || lo === 'shoulder' ||
          lo === 'upper arm actuator' || lo === 'lower arm actuator' || lo === 'hand actuator' ||
          lo === 'hip' || lo === 'upper leg actuator' || lo === 'lower leg actuator' ||
          lo === 'foot actuator' || lo.includes('heat sink') || lo.includes('ammo')) continue;
      // Check if weapon
      if (lo.includes('laser') || lo.includes('ppc') || lo.includes('ac/') || lo.includes('autocannon') ||
          lo.includes('lrm') || lo.includes('srm') || lo.includes('mrm') || lo.includes('streak') ||
          lo.includes('ultra') || lo.includes('rotary') || lo.includes('gauss') || lo.includes('flamer') ||
          lo.includes('machine gun') || lo.includes('thunderbolt') || lo.includes('mml') || lo.includes('atm') ||
          lo.includes('narc') || lo.includes('tag') || lo.includes('plasma') || lo.includes('er ') ||
          lo.includes('pulse')) continue;
      if (!equipFreq[lo]) equipFreq[lo] = { count: 0, under: 0, over: 0, units: [] };
      if (!equipFreq[lo].units.includes(b.unitId)) {
        equipFreq[lo].count++;
        if (b.difference < 0) equipFreq[lo].under++;
        else equipFreq[lo].over++;
        equipFreq[lo].units.push(b.unitId);
      }
    }
  }
}

const sorted = Object.entries(equipFreq).sort((a, b) => b[1].count - a[1].count);
console.log('Equipment'.padEnd(40) + 'Count  Under  Over');
for (const [eq, data] of sorted.slice(0, 40)) {
  console.log(`  ${eq.padEnd(38)} ${String(data.count).padStart(5)} ${String(data.under).padStart(6)} ${String(data.over).padStart(5)}`);
}

// Now specifically check units with C3 systems
console.log('\n=== C3 SYSTEM UNITS ===');
for (const b of boundary) {
  const unit = unitMap[b.unitId];
  if (!unit || !unit.criticalSlots) continue;
  const allSlots = [];
  for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
    for (const s of slots) {
      if (s) allSlots.push(s.toLowerCase());
    }
  }
  const hasC3 = allSlots.some(s => s.includes('c3') && !s.includes('c3 ammo'));
  if (hasC3) {
    const c3items = allSlots.filter(s => s.includes('c3') && !s.includes('c3 ammo'));
    const sign = b.difference > 0 ? '+' : '';
    console.log(`  ${b.unitId.padEnd(40)} ${sign}${b.percentDiff.toFixed(2)}%  C3: ${[...new Set(c3items)].join(', ')}`);
  }
}
