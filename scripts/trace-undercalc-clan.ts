import * as fs from 'fs';
import * as path from 'path';
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// Focus on undercalculated Clan units in minor range
const underClan = r.allResults.filter((x: any) =>
  x.percentDiff < -1 && x.percentDiff >= -5 && x.breakdown
).map((res: any) => {
  const ie = idx.units.find((e: any) => e.id === res.unitId);
  if (!ie?.path) return null;
  try {
    const d = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));
    return { ...res, unit: d, indexBV: ie.bv };
  } catch { return null; }
}).filter(Boolean);

console.log(`Undercalculated minor units: ${underClan.length}`);

// Check where the reference BV comes from
// Look at first 5 units: compare index BV vs calculated vs reference
console.log('\n=== REFERENCE BV SOURCE CHECK ===');
for (const u of underClan.slice(0, 10)) {
  const unitBV = u.unit.bv;  // BV in the unit JSON
  console.log(`${u.unitId}: calc=${u.calculatedBV} indexBV=${u.indexBV} unitJsonBV=${unitBV} diff=${u.difference}`);
  // Which reference produced the diff?
  const implied = u.calculatedBV - u.difference;
  console.log(`  implied ref=${implied}`);
}

// Check what equipment undercalculated Clan units share
console.log('\n=== EQUIPMENT PATTERNS (undercalculated) ===');
const equipCounts: Record<string, number> = {};
const critEquip: Record<string, number> = {};
for (const u of underClan) {
  // Equipment from equipment array
  for (const eq of u.unit.equipment) {
    const eid = eq.id.toLowerCase();
    equipCounts[eid] = (equipCounts[eid] || 0) + 1;
  }
  // Equipment from crit slots that might not be in equipment array
  for (const [loc, slots] of Object.entries(u.unit.criticalSlots || {})) {
    for (const s of (slots as string[])) {
      if (!s) continue;
      const sLo = s.toLowerCase();
      // Skip standard components
      if (['endosteel','ferrofibrous','engine','gyro','life support','sensor','cockpit',
           'shoulder','upper arm','lower arm','hand','hip','upper leg','lower leg','foot',
           'endo steel','ferro fibrous','double heat sink','jump jet','improved jump jet',
           'heat sink'].some(sk => sLo.includes(sk))) continue;
      // Skip weapons we already count from equipment
      if (sLo.includes('laser') || sLo.includes('ppc') || sLo.includes('ac/') || sLo.includes('lrm') ||
          sLo.includes('srm') || sLo.includes('machine gun') || sLo.includes('gauss') || sLo.includes('atm') ||
          sLo.includes('pulse') || sLo.includes('ultra') || sLo.includes('lb ') || sLo.includes('flamer') ||
          sLo.includes('streak') || sLo.includes('narc') || sLo.includes('tag') || sLo.includes('mml') ||
          sLo.includes('anti-missile')) continue;
      critEquip[sLo] = (critEquip[sLo] || 0) + 1;
    }
  }
}
const sorted = Object.entries(critEquip).sort((a, b) => b[1] - a[1]).filter(([_, c]) => c >= 3);
console.log('From crit slots (non-weapon, ≥3 occurrences):');
for (const [eid, count] of sorted.slice(0, 20)) {
  console.log(`  ${eid}: ${count}`);
}

// Check the specific gap composition for undercalculated Clan FF units
const clanFF = underClan.filter((u: any) => u.unit.armor?.type?.toUpperCase().includes('FERRO') && u.unit.techBase === 'CLAN');
console.log(`\n=== CLAN FF UNDERCALCULATED (${clanFF.length}) ===`);
let totalGap = 0;
for (const u of clanFF.sort((a: any, b: any) => a.difference - b.difference).slice(0, 10)) {
  totalGap += u.difference;
  const b = u.breakdown;
  console.log(`${u.unitId}: gap=${u.difference} def=${b.defensiveBV.toFixed(0)} off=${b.offensiveBV.toFixed(0)} wep=${b.weaponBV} spd=${b.speedFactor}`);
}
console.log(`Avg gap: ${(totalGap / Math.min(clanFF.length, 10)).toFixed(0)}`);
