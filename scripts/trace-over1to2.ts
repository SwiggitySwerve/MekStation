/**
 * Trace overcalculated 1-2% units to find systematic patterns.
 * Focus on what makes us calculate too high.
 */
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const over1to2 = valid.filter((x: any) => x.percentDiff > 1 && x.percentDiff <= 2 && x.breakdown);

console.log(`=== OVERCALCULATED 1-2%: ${over1to2.length} units ===\n`);

// Check: is the excess in defensive or offensive BV?
let defExcess = 0;
let offExcess = 0;
let mixedExcess = 0;
const excessDetails: any[] = [];

for (const u of over1to2) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;
  const cockpit = b.cockpitModifier ?? 1;
  const refBase = u.indexBV / cockpit;

  // If ref is 100% correct, excess = calc - ref
  // Attribute excess to def vs off based on proportion
  // Simple: compute what offBV SHOULD be if def is correct
  const expectedOff = refBase - b.defensiveBV;
  const offExcessBV = b.offensiveBV - expectedOff;

  // And what defBV SHOULD be if off is correct
  const expectedDef = refBase - b.offensiveBV;
  const defExcessBV = b.defensiveBV - expectedDef;

  if (offExcessBV > 5) {
    offExcess++;
    excessDetails.push({ unitId: u.unitId, type: 'off', excess: offExcessBV, diff: u.difference, pct: u.percentDiff, b, unit });
  } else if (defExcessBV > 5) {
    defExcess++;
    excessDetails.push({ unitId: u.unitId, type: 'def', excess: defExcessBV, diff: u.difference, pct: u.percentDiff, b, unit });
  } else {
    mixedExcess++;
    excessDetails.push({ unitId: u.unitId, type: 'mixed', excess: offExcessBV + defExcessBV, diff: u.difference, pct: u.percentDiff, b, unit });
  }
}

console.log(`Excess in offense: ${offExcess}`);
console.log(`Excess in defense: ${defExcess}`);
console.log(`Mixed/small: ${mixedExcess}\n`);

// Check for common patterns among overcalculated
// 1. Check if many have wrong explosive penalty
console.log('=== EXPLOSIVE PENALTY CHECK ===');
let hasExplPenalty = 0;
let noExplPenalty = 0;
let hasAmmoButNoPenalty = 0;
for (const u of over1to2) {
  const b = u.breakdown;
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  if (b.explosivePenalty > 0) hasExplPenalty++;
  else noExplPenalty++;

  // Check if unit has ammo but no penalty (possible missing penalty)
  if (b.explosivePenalty === 0 && b.ammoBV > 0) {
    // Check if all ammo locations have CASE or CASE II
    let allProtected = true;
    // Count ammo in crits
    const ammoLocs = new Set<string>();
    if (unit.criticalSlots) {
      for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
        if (!Array.isArray(slots)) continue;
        for (const s of slots) {
          if (s && typeof s === 'string' && (s as string).toLowerCase().includes('ammo') &&
              !(s as string).toLowerCase().includes('ams')) {
            ammoLocs.add(loc.toUpperCase());
          }
        }
      }
    }
    // For each ammo location, check if it has CASE
    for (const loc of ammoLocs) {
      const hasCaseII = unit.criticalSlots?.[loc]?.some?.((s: any) =>
        s && typeof s === 'string' && (s.toLowerCase().includes('case ii') || s.toLowerCase().includes('caseii')));
      const hasCase = unit.criticalSlots?.[loc]?.some?.((s: any) =>
        s && typeof s === 'string' && s.toLowerCase().includes('case') && !s.toLowerCase().includes('case ii'));
      if (!hasCaseII && !hasCase) {
        allProtected = false;
      }
    }
    if (!allProtected) {
      hasAmmoButNoPenalty++;
    }
  }
}
console.log(`  Has explosive penalty: ${hasExplPenalty}`);
console.log(`  No explosive penalty: ${noExplPenalty}`);
console.log(`  Ammo without protection + no penalty: ${hasAmmoButNoPenalty}`);

// Check: heat efficiency and heat tracking
console.log('\n=== HEAT EFFICIENCY ANALYSIS ===');
let halvedSome = 0;
let halvedNone = 0;
for (const u of over1to2) {
  const b = u.breakdown;
  if ((b.halvedWeaponCount ?? 0) > 0) halvedSome++;
  else halvedNone++;
}
console.log(`  Units with halved weapons: ${halvedSome}`);
console.log(`  Units without halving: ${halvedNone}`);

// Show top 20 overcalculated 1-2% units with details
console.log('\n=== TOP 20 OVERCALCULATED 1-2% ===');
const sorted = [...excessDetails].sort((a: any, b: any) => b.diff - a.diff);
for (const u of sorted.slice(0, 20)) {
  const b = u.b;
  console.log(`${u.unitId.padEnd(45)} +${u.diff} (+${u.pct.toFixed(1)}%) ${u.type} excess=${u.excess.toFixed(0)} tech=${u.unit?.techBase}`);
  console.log(`  defBV=${b.defensiveBV?.toFixed(0)} offBV=${b.offensiveBV?.toFixed(0)} SF=${b.speedFactor} cockpit=${b.cockpitModifier}`);
  console.log(`  weapBV=${b.weaponBV?.toFixed(0)} ammoBV=${b.ammoBV} wt=${b.weightBonus?.toFixed(0)} halved=${b.halvedWeaponCount}/${b.weaponCount}`);
  console.log(`  expl=${b.explosivePenalty} armorBV=${b.armorBV?.toFixed(0)} structBV=${b.structureBV?.toFixed(0)} gyroBV=${b.gyroBV?.toFixed(0)} DF=${b.defensiveFactor} TMM=${b.maxTMM}`);
}
