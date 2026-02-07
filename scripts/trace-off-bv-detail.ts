/**
 * Trace offensive BV for simple undercalculated units to identify the gap source.
 */
import * as fs from 'fs';
import * as path from 'path';

const reportPath = path.resolve(__dirname, '../validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

console.log("=== OFFENSIVE BV TRACE FOR UNDERCALCULATED UNITS ===\n");

// Focus on units where defensive BV gap is minimal (units we traced earlier)
const targetIds = [
  'albatross-alb-5u',   // 95t, -3.0%, no def equip
  'barghest-bgs-4t',    // 70t, -1.7%, no def equip
  'battle-cobra-i',     // 40t, -1.8%, no def equip
  'deimos-2',           // 85t, -2.9%, Clan XL
];

for (const targetId of targetIds) {
  const u = report.allResults.find((v: any) => v.unitId === targetId);
  if (!u) continue;

  const bd = u.breakdown;
  console.log(`=== ${targetId} ===`);
  console.log(`  Index BV: ${u.indexBV}, Calculated: ${u.calculatedBV}, Gap: ${u.difference} (${u.percentDiff.toFixed(1)}%)`);
  console.log(`  DefBV: ${bd.defensiveBV.toFixed(2)}, OffBV: ${bd.offensiveBV.toFixed(2)}`);
  console.log(`  WeaponBV: ${bd.weaponBV.toFixed(2)}, AmmoBV: ${bd.ammoBV.toFixed(2)}`);
  console.log(`  SpeedFactor: ${bd.speedFactor.toFixed(4)}`);
  console.log(`  CockpitMod: ${bd.cockpitModifier || 1.0}`);
  console.log(`  DefEquipBV: ${bd.defensiveEquipBV}, ExplPenalty: ${bd.explosivePenalty}`);

  // Back-compute: what weaponBV + ammoBV would be needed to match index?
  const cockpitMod = bd.cockpitModifier || 1.0;
  const neededTotal = u.indexBV / cockpitMod; // def + off before cockpit mod
  const neededOff = neededTotal - bd.defensiveBV;
  const neededBaseOff = neededOff / bd.speedFactor; // weaponBV + ammoBV + physWpn + weightBonus + offEquipBV
  const ourBaseOff = bd.offensiveBV / bd.speedFactor;

  console.log(`  Needed OffBV (to match index): ${neededOff.toFixed(2)}`);
  console.log(`  Needed baseOff (before speed factor): ${neededBaseOff.toFixed(2)}`);
  console.log(`  Our baseOff (before speed factor): ${ourBaseOff.toFixed(2)}`);
  console.log(`  Base offensive gap: ${(neededBaseOff - ourBaseOff).toFixed(2)}`);
  console.log(`  This gap * speedFactor = ${((neededBaseOff - ourBaseOff) * bd.speedFactor).toFixed(2)}`);
  console.log('');
}

// Now check if the gap correlates with number of weapons (suggesting per-weapon BV error)
console.log("\n=== GAP vs WEAPON COUNT CORRELATION ===\n");

const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf-8'));
const unitPathMap = new Map<string, string>();
for (const u of indexData.units) {
  unitPathMap.set(u.id, path.join(unitsDir, u.path));
}

const underUnits = report.allResults.filter((u: any) => u.percentDiff < -1 && u.percentDiff > -5);

let weaponCountData: Array<{ id: string; wpnCount: number; gapPct: number; gap: number; offBV: number }> = [];

for (const u of underUnits) {
  const unitPath = unitPathMap.get(u.unitId);
  if (!unitPath || !fs.existsSync(unitPath)) continue;

  try {
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
    if (!unit.criticalSlots) continue;

    // Count weapons (non-ammo, non-equipment items)
    let wpnCount = 0;
    const wpnSet = new Set<string>();
    for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      let prev = '';
      for (const slot of slots) {
        if (!slot || typeof slot !== 'string') continue;
        const lo = slot.replace(/\s*\(omnipod\)/gi, '').replace(/\s*\(R\)/g, '').trim().toLowerCase();
        if (lo.includes('engine') || lo.includes('gyro') || lo.includes('actuator') ||
            lo.includes('shoulder') || lo.includes('hip') || lo.includes('foot') ||
            lo.includes('cockpit') || lo.includes('sensor') || lo.includes('life support') ||
            lo.includes('heat sink') || lo.includes('endo') || lo.includes('ferro') ||
            lo.includes('ammo') || lo.includes('stealth') || lo.includes('case') ||
            lo.includes('jump jet') || lo.includes('masc') || lo.includes('tsm') ||
            lo.includes('supercharger') || lo.includes('targeting') || lo.includes('ecm') ||
            lo.includes('beagle') || lo.includes('bloodhound') || lo.includes('probe') ||
            lo.includes('shield') || lo.includes('pod') || lo.includes('partial wing') ||
            lo.includes('artemis') || lo.includes('apollo') || lo.includes('capacitor') ||
            lo.includes('coolant') || lo.includes('tag') || lo.includes('c3') ||
            lo.includes('null sig') || lo.includes('void sig') || lo.includes('chameleon') ||
            lo.includes('umu') || lo.includes('aes') || lo.includes('mga') ||
            lo.includes('harjel') || lo.includes('blue-shield')) continue;
        // Each unique weapon type per location counts once (multi-slot weapons span multiple crits)
        const key = lo + '@' + loc;
        if (lo !== prev) {
          wpnCount++;
          wpnSet.add(lo);
        }
        prev = lo;
      }
    }

    weaponCountData.push({
      id: u.unitId,
      wpnCount,
      gapPct: u.percentDiff,
      gap: u.difference,
      offBV: u.breakdown?.offensiveBV ?? 0,
    });
  } catch { /* skip */ }
}

// Sort by weapon count and show correlation
weaponCountData.sort((a, b) => a.wpnCount - b.wpnCount);

// Group by weapon count quartile
const wpnQ1 = weaponCountData.slice(0, Math.floor(weaponCountData.length / 4));
const wpnQ2 = weaponCountData.slice(Math.floor(weaponCountData.length / 4), Math.floor(weaponCountData.length / 2));
const wpnQ3 = weaponCountData.slice(Math.floor(weaponCountData.length / 2), Math.floor(weaponCountData.length * 3 / 4));
const wpnQ4 = weaponCountData.slice(Math.floor(weaponCountData.length * 3 / 4));

function avgField(arr: typeof weaponCountData, field: 'wpnCount' | 'gapPct' | 'gap') {
  return arr.reduce((a, b) => a + b[field], 0) / arr.length;
}

console.log("Quartile | Avg Wpn Count | Avg Gap% | Avg Gap BV");
console.log("---------|--------------|---------|----------");
console.log(`Q1 (few) | ${avgField(wpnQ1, 'wpnCount').toFixed(1).padStart(12)} | ${avgField(wpnQ1, 'gapPct').toFixed(2)}% | ${avgField(wpnQ1, 'gap').toFixed(1)}`);
console.log(`Q2       | ${avgField(wpnQ2, 'wpnCount').toFixed(1).padStart(12)} | ${avgField(wpnQ2, 'gapPct').toFixed(2)}% | ${avgField(wpnQ2, 'gap').toFixed(1)}`);
console.log(`Q3       | ${avgField(wpnQ3, 'wpnCount').toFixed(1).padStart(12)} | ${avgField(wpnQ3, 'gapPct').toFixed(2)}% | ${avgField(wpnQ3, 'gap').toFixed(1)}`);
console.log(`Q4 (many)| ${avgField(wpnQ4, 'wpnCount').toFixed(1).padStart(12)} | ${avgField(wpnQ4, 'gapPct').toFixed(2)}% | ${avgField(wpnQ4, 'gap').toFixed(1)}`);

// Also check: gap vs tech base
console.log("\n=== GAP vs TECH BASE ===\n");
const techBaseGroups = new Map<string, { count: number; totalGapPct: number }>();
for (const u of underUnits) {
  const unitPath = unitPathMap.get(u.unitId);
  if (!unitPath || !fs.existsSync(unitPath)) continue;
  try {
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
    const tb = unit.techBase || 'UNKNOWN';
    const entry = techBaseGroups.get(tb) || { count: 0, totalGapPct: 0 };
    entry.count++;
    entry.totalGapPct += u.percentDiff;
    techBaseGroups.set(tb, entry);
  } catch { /* skip */ }
}

for (const [tb, data] of techBaseGroups) {
  console.log(`${tb}: ${data.count} units, avg gap: ${(data.totalGapPct / data.count).toFixed(2)}%`);
}
