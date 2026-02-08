/**
 * Systematic gap analysis: break down ALL undercalculated units
 * to identify which BV component is responsible for the gap.
 */
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// ALL wrong units (>1% off)
const wrong = report.allResults
  .filter((r: any) => r.status !== 'error' && r.percentDiff !== null && Math.abs(r.percentDiff) > 1);

const underc = wrong.filter((x: any) => x.percentDiff < 0);
const overc = wrong.filter((x: any) => x.percentDiff > 0);

// By tech base
const byTech: Record<string, { under: number; over: number; underGap: number; overGap: number }> = {};
for (const u of wrong) {
  const ie = idx.units.find((e: any) => e.id === u.unitId);
  if (!ie?.path) continue;
  try {
    const unit = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));
    const tb = unit.techBase || 'UNKNOWN';
    if (!byTech[tb]) byTech[tb] = { under: 0, over: 0, underGap: 0, overGap: 0 };
    if (u.percentDiff < 0) { byTech[tb].under++; byTech[tb].underGap += u.difference; }
    else { byTech[tb].over++; byTech[tb].overGap += u.difference; }
  } catch {}
}

console.log('=== WRONG UNITS BY TECH BASE ===');
for (const [tb, stats] of Object.entries(byTech).sort((a, b) => b[1].under - a[1].under)) {
  console.log(`  ${tb}: ${stats.under} under (total gap: ${stats.underGap}), ${stats.over} over (total gap: +${stats.overGap})`);
}

// Analyze the gap components more carefully
// For each undercalculated unit, compute what adjustment would fix it
console.log('\n=== UNDERCALCULATED UNITS - WHAT COULD FIX THEM ===');

let fixByWeaponBV = 0;
let fixByAmmo = 0;
let fixByDefensive = 0;
let fixBySpeedFactor = 0;
let fixByOther = 0;
let fixByCockpit = 0;

// Track units with issues
const issuePatterns: Record<string, number> = {};

for (const u of underc) {
  const b = u.breakdown;
  if (!b) continue;

  // The gap = indexBV - calculatedBV (positive when undercalculated)
  const gap = Math.abs(u.difference);

  // Check if issues mention anything
  for (const issue of u.issues || []) {
    const key = issue.substring(0, 50);
    issuePatterns[key] = (issuePatterns[key] || 0) + 1;
  }

  // Check if the BV is close enough that a small weapon BV increase would fix it
  const defBV = b.defensiveBV;
  const offBV = b.offensiveBV;
  const sf = b.speedFactor;
  const wBV = b.weaponBV;
  const aBV = b.ammoBV;

  const ie = idx.units.find((e: any) => e.id === u.unitId);
  if (!ie?.path) continue;
  try {
    const unit = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));
    const tonnage = unit.tonnage;

    // What offensive BV is needed?
    // total = defBV + offBV, need total + gap
    // If defensive is correct, offBV needs to increase by gap
    // offBV = (wBV + aBV + tonnage + offEquipBV) * sf
    // needed offBV = offBV + gap
    // needed base = (offBV + gap) / sf
    // weapon BV increase needed = needed base - (aBV + tonnage)
    const neededBase = (offBV + gap) / sf;
    const weaponBVIncrease = neededBase - wBV - aBV - tonnage;

    // Is the weapon BV increase plausible?
    if (weaponBVIncrease > 0 && weaponBVIncrease < wBV * 0.5) {
      fixByWeaponBV++;
    } else if (gap < defBV * 0.1) {
      fixByDefensive++;
    } else {
      fixByOther++;
    }
  } catch {}
}

console.log(`\nUnits fixable by small weapon BV increase: ${fixByWeaponBV}`);
console.log(`Units fixable by small defensive BV increase: ${fixByDefensive}`);
console.log(`Other: ${fixByOther}`);

// Most common issues
console.log('\n=== ISSUE PATTERNS ===');
for (const [issue, count] of Object.entries(issuePatterns).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
  console.log(`  ${count}× "${issue}"`);
}

// Check: how many undercalculated units have 0 ammoBV despite having ammo?
let zeroAmmoWithAmmo = 0;
let lowAmmoBV = 0;
for (const u of underc) {
  const b = u.breakdown;
  if (!b) continue;
  const ie = idx.units.find((e: any) => e.id === u.unitId);
  if (!ie?.path) continue;
  try {
    const unit = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));
    const hasAmmo = unit.criticalSlots && Object.values(unit.criticalSlots).some((slots: any) =>
      Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('ammo') && !s.toLowerCase().includes('ams'))
    );
    if (hasAmmo && b.ammoBV === 0) zeroAmmoWithAmmo++;
    if (hasAmmo && b.ammoBV < 10) lowAmmoBV++;
  } catch {}
}
console.log(`\nUndercalculated units with ammo but ammoBV=0: ${zeroAmmoWithAmmo}`);
console.log(`Undercalculated units with ammo but ammoBV<10: ${lowAmmoBV}`);

// Check: what proportion of undercalculated units have defEquipBV=0?
let zeroDefEquip = 0;
let hasDefEquipWithEquip = 0;
for (const u of underc) {
  const b = u.breakdown;
  if (!b) continue;
  if (b.defensiveEquipBV === 0) zeroDefEquip++;
  else hasDefEquipWithEquip++;
}
console.log(`\nUndercalculated units with defEquipBV=0: ${zeroDefEquip}`);
console.log(`Undercalculated units with defEquipBV>0: ${hasDefEquipWithEquip}`);

// Now the KEY analysis: for each undercalculated unit, what % of the gap
// would be closed by various fixes?
console.log('\n=== WHAT-IF ANALYSIS ===');

// Check: what if Clan weapon BV was 50% higher on average for CLAN/MIXED units?
// This tests whether weapon BV is the main driver
let clanMixedUnder = 0;
let clanMixedGap = 0;
let isUnder = 0;
let isGap = 0;
for (const u of underc) {
  const ie = idx.units.find((e: any) => e.id === u.unitId);
  if (!ie?.path) continue;
  try {
    const unit = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));
    if (unit.techBase === 'CLAN' || unit.techBase === 'MIXED') {
      clanMixedUnder++;
      clanMixedGap += Math.abs(u.difference);
    } else {
      isUnder++;
      isGap += Math.abs(u.difference);
    }
  } catch {}
}
console.log(`CLAN/MIXED undercalculated: ${clanMixedUnder} units, total gap: ${clanMixedGap} BV`);
console.log(`IS undercalculated: ${isUnder} units, total gap: ${isGap} BV`);
console.log(`Average gap per CLAN/MIXED unit: ${(clanMixedGap / clanMixedUnder).toFixed(0)} BV`);
console.log(`Average gap per IS unit: ${(isGap / isUnder).toFixed(0)} BV`);

// Check overcalculated units too
let clanOverc = 0, isOverc = 0, clanOverGap = 0, isOverGap = 0;
for (const u of overc) {
  const ie = idx.units.find((e: any) => e.id === u.unitId);
  if (!ie?.path) continue;
  try {
    const unit = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));
    if (unit.techBase === 'CLAN' || unit.techBase === 'MIXED') {
      clanOverc++;
      clanOverGap += u.difference;
    } else {
      isOverc++;
      isOverGap += u.difference;
    }
  } catch {}
}
console.log(`\nCLAN/MIXED overcalculated: ${clanOverc} units, total gap: +${clanOverGap} BV`);
console.log(`IS overcalculated: ${isOverc} units, total gap: +${isOverGap} BV`);
