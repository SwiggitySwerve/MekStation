/**
 * Analyze remaining units outside 1% to identify fixable patterns.
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
const outside1 = valid.filter((x: any) => Math.abs(x.percentDiff) > 1);
const under = outside1.filter((x: any) => x.percentDiff < -1);
const over = outside1.filter((x: any) => x.percentDiff > 1);

console.log(`=== REMAINING OUTSIDE 1%: ${outside1.length} ===`);
console.log(`  Under: ${under.length}, Over: ${over.length}\n`);

// Bucket by percent range
for (const [label, min, max] of [['1-2%', 1, 2], ['2-3%', 2, 3], ['3-5%', 3, 5], ['5-10%', 5, 10], ['10%+', 10, 200]] as [string, number, number][]) {
  const uc = under.filter((x: any) => Math.abs(x.percentDiff) >= min && Math.abs(x.percentDiff) < max).length;
  const oc = over.filter((x: any) => Math.abs(x.percentDiff) >= min && Math.abs(x.percentDiff) < max).length;
  console.log(`  ${label}: under=${uc} over=${oc} total=${uc+oc}`);
}

// For the 1-2% band (most fixable), check common patterns
console.log('\n=== 1-2% UNDERCALCULATED BAND ===');
const under1to2 = under.filter((x: any) => Math.abs(x.percentDiff) >= 1 && Math.abs(x.percentDiff) < 2);
const techCounts: Record<string, number> = {};
const weaponGaps: number[] = [];
let noHalvedCount = 0;

for (const u of under1to2) {
  const unit = loadUnit(u.unitId);
  const tb = unit?.techBase || 'UNKNOWN';
  techCounts[tb] = (techCounts[tb] || 0) + 1;

  const b = u.breakdown;
  if (b) {
    if ((b.halvedWeaponBV ?? 0) === 0) noHalvedCount++;
    const cockpit = b.cockpitModifier ?? 1;
    const refBase = u.indexBV / cockpit;
    const offGap = (refBase - b.defensiveBV) - b.offensiveBV;
    const baseGap = offGap / b.speedFactor;
    weaponGaps.push(baseGap);
  }
}

console.log(`  Count: ${under1to2.length}`);
console.log(`  No halved weapons: ${noHalvedCount}`);
for (const [tb, count] of Object.entries(techCounts)) {
  console.log(`  ${tb}: ${count}`);
}
if (weaponGaps.length > 0) {
  const avg = weaponGaps.reduce((s, g) => s + g, 0) / weaponGaps.length;
  console.log(`  Avg base offensive gap: ${avg.toFixed(1)}`);
}

// For 1-2% overcalculated band
console.log('\n=== 1-2% OVERCALCULATED BAND ===');
const over1to2 = over.filter((x: any) => Math.abs(x.percentDiff) >= 1 && Math.abs(x.percentDiff) < 2);
const overTech: Record<string, number> = {};

for (const u of over1to2) {
  const unit = loadUnit(u.unitId);
  const tb = unit?.techBase || 'UNKNOWN';
  overTech[tb] = (overTech[tb] || 0) + 1;
}
console.log(`  Count: ${over1to2.length}`);
for (const [tb, count] of Object.entries(overTech)) {
  console.log(`  ${tb}: ${count}`);
}

// Check for Targeting Computer impact
console.log('\n=== TARGETING COMPUTER ANALYSIS ===');
let tcUnder = 0;
let tcOver = 0;
let tcWithin = 0;
for (const u of valid) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const hasTC = (unit.equipment || []).some((eq: any) => {
    const id = eq.id.toLowerCase();
    return id.includes('targeting-computer') || id === 'istc' || id === 'cltc' ||
           id.includes('targetingcomputer');
  }) || (unit.criticalSlots && Object.values(unit.criticalSlots).some((slots: any) =>
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' &&
      s.toLowerCase().includes('targeting computer'))
  ));

  if (hasTC) {
    if (Math.abs(u.percentDiff) <= 1) tcWithin++;
    else if (u.percentDiff < -1) tcUnder++;
    else tcOver++;
  }
}
console.log(`  TC units: within1%=${tcWithin} under=${tcUnder} over=${tcOver}`);

// Check for CASE II impact
console.log('\n=== CASE II ANALYSIS ===');
let caseIIUnder = 0;
let caseIIOver = 0;
let caseIIWithin = 0;
for (const u of valid) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const hasCaseII = unit.criticalSlots && Object.values(unit.criticalSlots).some((slots: any) =>
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' &&
      (s.toLowerCase().includes('case ii') || s.toLowerCase().includes('caseii')))
  );
  if (hasCaseII) {
    if (Math.abs(u.percentDiff) <= 1) caseIIWithin++;
    else if (u.percentDiff < -1) caseIIUnder++;
    else caseIIOver++;
  }
}
console.log(`  CASE II units: within1%=${caseIIWithin} under=${caseIIUnder} over=${caseIIOver}`);

// Check for Blue Shield impact
console.log('\n=== BLUE SHIELD ANALYSIS ===');
let bsUnder = 0;
let bsOver = 0;
let bsWithin = 0;
for (const u of valid) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const hasBS = (unit.equipment || []).some((eq: any) => eq.id.toLowerCase().includes('blue-shield')) ||
    (unit.criticalSlots && Object.values(unit.criticalSlots).some((slots: any) =>
      Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' &&
        s.toLowerCase().includes('blue shield'))
    ));
  if (hasBS) {
    if (Math.abs(u.percentDiff) <= 1) bsWithin++;
    else if (u.percentDiff < -1) bsUnder++;
    else bsOver++;
  }
}
console.log(`  Blue Shield units: within1%=${bsWithin} under=${bsUnder} over=${bsOver}`);

// Check for common unresolved weapon types in undercalculated units
console.log('\n=== WEAPON PATTERNS IN UNDERCALCULATED 1-5% ===');
const under1to5 = under.filter((x: any) => Math.abs(x.percentDiff) >= 1 && Math.abs(x.percentDiff) < 5);
const equipPatterns: Record<string, number> = {};

for (const u of under1to5) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  // Check crit slots for weapon-like entries
  if (unit.criticalSlots) {
    for (const slots of Object.values(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (!s || typeof s !== 'string') continue;
        const lo = (s as string).toLowerCase();
        if (lo.includes('m-pod') || lo.includes('mpod')) equipPatterns['M-Pod'] = (equipPatterns['M-Pod'] || 0) + 1;
        if (lo.includes('fluid gun')) equipPatterns['Fluid Gun'] = (equipPatterns['Fluid Gun'] || 0) + 1;
        if (lo.includes('nail') || lo.includes('rivet gun')) equipPatterns['Nail/Rivet'] = (equipPatterns['Nail/Rivet'] || 0) + 1;
        if (lo.includes('one-shot') || lo.includes('(os)')) equipPatterns['One-Shot'] = (equipPatterns['One-Shot'] || 0) + 1;
        if (lo.includes('targeting computer')) equipPatterns['TC-crit'] = (equipPatterns['TC-crit'] || 0) + 1;
        if (lo.includes('blue shield')) equipPatterns['BlueShield-crit'] = (equipPatterns['BlueShield-crit'] || 0) + 1;
        if (lo.includes('plasma')) equipPatterns['Plasma'] = (equipPatterns['Plasma'] || 0) + 1;
        if (lo.includes('mml')) equipPatterns['MML'] = (equipPatterns['MML'] || 0) + 1;
        if (lo.includes('atm')) equipPatterns['ATM'] = (equipPatterns['ATM'] || 0) + 1;
        if (lo.includes('rac') || lo.includes('rotary')) equipPatterns['RAC/Rotary'] = (equipPatterns['RAC/Rotary'] || 0) + 1;
        if (lo.includes('snub') && lo.includes('ppc')) equipPatterns['Snub-PPC'] = (equipPatterns['Snub-PPC'] || 0) + 1;
        if (lo.includes('thunderbolt')) equipPatterns['Thunderbolt'] = (equipPatterns['Thunderbolt'] || 0) + 1;
      }
    }
  }
}

console.log('  Crit patterns in under 1-5%:');
for (const [name, count] of Object.entries(equipPatterns).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${name}: ${count}`);
}

// List the 15 biggest undercalculated units outside 1% with their issues field
console.log('\n=== TOP 15 UNDERCALCULATED (sorted by absolute gap) ===');
const sortedUnder = [...under].sort((a: any, b: any) => a.difference - b.difference);
for (const u of sortedUnder.slice(0, 15)) {
  const unit = loadUnit(u.unitId);
  const b = u.breakdown;
  console.log(`  ${u.unitId.padEnd(45)} diff=${u.difference} (${u.percentDiff.toFixed(1)}%) tech=${unit?.techBase} wt=${unit?.tonnage}`);
  if (b) {
    console.log(`    defBV=${b.defensiveBV?.toFixed(0)} offBV=${b.offensiveBV?.toFixed(0)} SF=${b.speedFactor} cockpit=${b.cockpitModifier}`);
  }
}

// List the 15 biggest overcalculated units
console.log('\n=== TOP 15 OVERCALCULATED (sorted by absolute gap) ===');
const sortedOver = [...over].sort((a: any, b: any) => b.difference - a.difference);
for (const u of sortedOver.slice(0, 15)) {
  const unit = loadUnit(u.unitId);
  const b = u.breakdown;
  console.log(`  ${u.unitId.padEnd(45)} diff=+${u.difference} (+${u.percentDiff.toFixed(1)}%) tech=${unit?.techBase} wt=${unit?.tonnage}`);
  if (b) {
    console.log(`    defBV=${b.defensiveBV?.toFixed(0)} offBV=${b.offensiveBV?.toFixed(0)} SF=${b.speedFactor} cockpit=${b.cockpitModifier}`);
  }
}
