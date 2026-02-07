/**
 * Analyze undercalculated units for fixable clusters.
 * Group by chassis and by equipment patterns.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null && x.breakdown);
const under = valid.filter((x: any) => x.percentDiff < -1).sort((a: any, b: any) => a.percentDiff - b.percentDiff);

console.log(`=== ${under.length} UNDERCALCULATED UNITS (>1%) ===\n`);

// Group by chassis
const byChassis = new Map<string, any[]>();
for (const u of under) {
  const chassis = u.chassis;
  if (!byChassis.has(chassis)) byChassis.set(chassis, []);
  byChassis.get(chassis)!.push(u);
}

console.log('=== CHASSIS CLUSTERS ===');
const clusters = [...byChassis.entries()].filter(([, v]) => v.length >= 2).sort((a, b) => b[1].length - a[1].length);
for (const [chassis, units] of clusters) {
  const avgPct = units.reduce((s: number, u: any) => s + u.percentDiff, 0) / units.length;
  console.log(`  ${chassis} (${units.length} units, avg ${avgPct.toFixed(1)}%): ${units.map((u: any) => u.model).join(', ')}`);
}

// Find unresolved equipment across all undercalculated units
console.log('\n=== UNRESOLVED EQUIPMENT IN UNDERCALCULATED UNITS ===');
const unresolvedCounts = new Map<string, { count: number; units: string[] }>();
for (const u of under) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;

  // Check all equipment
  for (const eq of (unit.equipment || [])) {
    const res = resolveEquipmentBV(eq.id);
    if (!res.resolved) {
      const key = eq.id;
      if (!unresolvedCounts.has(key)) unresolvedCounts.set(key, { count: 0, units: [] });
      const entry = unresolvedCounts.get(key)!;
      entry.count++;
      if (!entry.units.includes(u.unitId)) entry.units.push(u.unitId);
    }
  }

  // Check crit slots for weapons not in equipment list
  if (unit.criticalSlots) {
    for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots as string[]) {
        if (!s || typeof s !== 'string') continue;
        const lo = s.toLowerCase();
        // Skip non-weapon entries
        if (lo.includes('actuator') || lo.includes('engine') || lo.includes('gyro') ||
            lo.includes('life support') || lo.includes('sensors') || lo.includes('cockpit') ||
            lo.includes('heat sink') || lo.includes('endo') || lo.includes('ferro') ||
            lo.includes('structure') || lo === 'hip' || lo.includes('shoulder') ||
            lo.includes('ammo') || lo.includes('case') || lo.includes('jump jet') ||
            lo.includes('foot') || lo.includes('armored')) continue;
      }
    }
  }
}

// Sort by unit count
const sorted = [...unresolvedCounts.entries()].sort((a, b) => b[1].units.length - a[1].units.length);
for (const [id, info] of sorted.slice(0, 30)) {
  console.log(`  ${id.padEnd(40)} ${info.units.length} units (${info.count} instances)`);
}

// Check what percentage of undercalculated units have specific characteristics
console.log('\n=== CHARACTERISTICS OF UNDERCALCULATED UNITS ===');
let clanCount = 0, isCount = 0, mixedCount = 0;
let hasUnresolvedWeapon = 0, allEnergy = 0, hasStreakOrPulse = 0;
let avgHEOver = 0, avgHEUnder = 0;

for (const u of under) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;

  if (unit.techBase === 'CLAN') clanCount++;
  else if (unit.techBase === 'MIXED') mixedCount++;
  else isCount++;

  // Check if any equipment is unresolved
  let hasUnresolved = false;
  let hasNonEnergy = false;
  for (const eq of (unit.equipment || [])) {
    const lo = eq.id.toLowerCase();
    if (lo.includes('ammo') || lo.includes('heat-sink') || lo.includes('case') ||
        lo.includes('tsm') || lo.includes('jump-jet') || lo.includes('masc') ||
        lo.includes('targeting-computer') || lo.includes('ecm') || lo.includes('probe') ||
        lo.includes('c3') || lo.includes('tag') || lo.includes('narc')) continue;
    const res = resolveEquipmentBV(eq.id);
    if (!res.resolved) hasUnresolved = true;
    if (lo.includes('ac') || lo.includes('gauss') || lo.includes('lrm') || lo.includes('srm') ||
        lo.includes('mml') || lo.includes('atm') || lo.includes('mg') || lo.includes('rl') ||
        lo.includes('mrm') || lo.includes('thunderbolt')) hasNonEnergy = true;
  }
  if (hasUnresolved) hasUnresolvedWeapon++;
  if (!hasNonEnergy) allEnergy++;
}

console.log(`  Tech: IS=${isCount} Clan=${clanCount} Mixed=${mixedCount}`);
console.log(`  Unresolved weapons: ${hasUnresolvedWeapon}`);
console.log(`  All-energy: ${allEnergy}`);

// Check ammo resolution in undercalculated units
console.log('\n=== AMMO BV IN UNDERCALCULATED (ammoBV=0 with ammo-using weapons) ===');
let zeroAmmoBV = 0;
for (const u of under) {
  const b = u.breakdown;
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const hasAmmoWeapons = (unit.equipment || []).some((eq: any) => {
    const lo = eq.id.toLowerCase();
    return lo.includes('ac') || lo.includes('gauss') || lo.includes('lrm') || lo.includes('srm') ||
           lo.includes('mml') || lo.includes('atm') || lo.includes('mrm');
  });
  if (hasAmmoWeapons && (b.ammoBV || 0) === 0) {
    zeroAmmoBV++;
    if (zeroAmmoBV <= 10) {
      console.log(`  ${u.unitId.padEnd(40)} ${u.percentDiff.toFixed(1)}% ammoBV=${b.ammoBV} weapBV=${b.weaponBV?.toFixed(0)}`);
    }
  }
}
console.log(`  Total: ${zeroAmmoBV} units with ammo weapons but ammoBV=0`);

// Deep trace top 10 undercalculated
console.log('\n=== TOP 10 UNDERCALCULATED DEEP TRACE ===');
for (const u of under.slice(0, 10)) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;

  console.log(`\n${u.unitId} ref=${u.indexBV} calc=${u.calculatedBV} (${u.percentDiff.toFixed(1)}%) tech=${unit.techBase}`);
  console.log(`  DEF=${b.defensiveBV?.toFixed(0)} OFF=${b.offensiveBV?.toFixed(0)} cockpit=${b.cockpitModifier}`);
  console.log(`  weap=${b.weaponBV?.toFixed(0)} rawWeap=${b.rawWeaponBV?.toFixed(0)} halved=${b.halvedWeaponCount}/${b.weaponCount} HE=${b.heatEfficiency} ammo=${b.ammoBV} wt=${b.weightBonus?.toFixed(0)} SF=${b.speedFactor}`);

  // Unresolved equipment
  const unresolved: string[] = [];
  for (const eq of (unit.equipment || [])) {
    const res = resolveEquipmentBV(eq.id);
    if (!res.resolved) unresolved.push(`${eq.id}(${res.battleValue})`);
  }
  if (unresolved.length > 0) console.log(`  UNRESOLVED: ${unresolved.join(', ')}`);

  // Expected off/def
  const total = u.indexBV / (b.cockpitModifier || 1);
  const deficit = total - (b.defensiveBV + b.offensiveBV);
  console.log(`  Expected base=${total.toFixed(0)} deficit=${deficit.toFixed(0)}`);
}
