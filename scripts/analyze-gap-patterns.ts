/**
 * Systematic analysis of the 323 units outside 1% accuracy.
 * Group by pattern to find the highest-impact fixes.
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
const outside1 = valid.filter((x: any) => Math.abs(x.percentDiff) > 1 && x.breakdown);

console.log(`=== ${outside1.length} UNITS OUTSIDE 1% ===\n`);

// Classify each unit by likely cause
interface Pattern {
  name: string;
  units: string[];
  totalDiff: number;
}
const patterns: Record<string, Pattern> = {};

function addToPattern(name: string, unitId: string, diff: number) {
  if (!patterns[name]) patterns[name] = { name, units: [], totalDiff: 0 };
  patterns[name].units.push(unitId);
  patterns[name].totalDiff += Math.abs(diff);
}

for (const u of outside1) {
  const unit = loadUnit(u.unitId);
  if (!unit) { addToPattern('unit-not-found', u.unitId, u.difference); continue; }
  const b = u.breakdown;
  const isOver = u.percentDiff > 0;
  const isUnder = u.percentDiff < 0;
  const pctAbs = Math.abs(u.percentDiff);

  // Check for unresolved weapons
  const unresolvedWeapons = (b.unresolvedWeapons || []);
  if (unresolvedWeapons.length > 0 && isUnder) {
    addToPattern('unresolved-weapons', u.unitId, u.difference);
  }

  // Check if unit has Clan weapons on IS chassis (mixed tech)
  if (unit.techBase === 'MIXED') {
    addToPattern('mixed-tech', u.unitId, u.difference);
  }

  // Check for specific equipment
  let hasATM = false;
  let hasHAG = false;
  let hasMRM = false;
  let hasLRM = false;
  let hasSRM = false;
  let hasMPod = false;
  let hasBPod = false;
  let hasStreak = false;
  let hasAPod = false;
  let hasTorpedo = false;
  let hasTaser = false;
  let hasPlasma = false;
  let hasMASC = false;
  let hasSC = false;
  let hasTSM = false;
  let hasTC = false;
  let hasBlueshield = false;
  let hasArtemis = false;
  let hasAPWeapon = false;
  let hasLBX = false;
  let hasUAC = false;
  let hasRAC = false;

  if (unit.criticalSlots) {
    for (const slots of Object.values(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (!s || typeof s !== 'string') continue;
        const lo = (s as string).replace(/\s*\(omnipod\)/gi, '').trim().toLowerCase();
        if (lo.includes('atm')) hasATM = true;
        if (lo.includes('hag')) hasHAG = true;
        if (lo.includes('mrm')) hasMRM = true;
        if (lo.includes('lrm') || lo.includes('enhanced lrm')) hasLRM = true;
        if (lo.includes('srm') && !lo.includes('streak')) hasSRM = true;
        if (lo.includes('m-pod')) hasMPod = true;
        if (lo.includes('b-pod')) hasBPod = true;
        if (lo.includes('streak')) hasStreak = true;
        if (lo.includes('a-pod')) hasAPod = true;
        if (lo.includes('torpedo') || lo.includes('srt') || lo.includes('lrt')) hasTorpedo = true;
        if (lo.includes('taser')) hasTaser = true;
        if (lo.includes('plasma')) hasPlasma = true;
        if (lo.includes('masc') && !lo.includes('ammo')) hasMASC = true;
        if (lo.includes('supercharger') || lo.includes('super charger')) hasSC = true;
        if (lo === 'tsm' || lo.includes('triple strength') || lo.includes('triple-strength')) hasTSM = true;
        if (lo.includes('targeting computer')) hasTC = true;
        if (lo.includes('blue shield')) hasBlueshield = true;
        if (lo.includes('artemis')) hasArtemis = true;
        if (lo.includes('light auto cannon') || lo.includes('lac/') || lo.includes('light ac/')) hasAPWeapon = true;
        if (lo.includes('lb ') || lo.includes('lb-') || lo.includes('lbx') || lo.includes('lb x')) hasLBX = true;
        if (lo.includes('ultra ac') || lo.includes('uac') || lo.includes('u-ac')) hasUAC = true;
        if (lo.includes('rotary ac') || lo.includes('rac')) hasRAC = true;
      }
    }
  }

  // Categorize by equipment patterns
  if (hasATM) addToPattern('has-atm', u.unitId, u.difference);
  if (hasTorpedo) addToPattern('has-torpedo', u.unitId, u.difference);
  if (hasTaser) addToPattern('has-taser', u.unitId, u.difference);
  if (hasMPod) addToPattern('has-mpod', u.unitId, u.difference);
  if (hasBPod) addToPattern('has-bpod', u.unitId, u.difference);
  if (hasAPod) addToPattern('has-apod', u.unitId, u.difference);
  if (hasBlueshield) addToPattern('has-blueshield', u.unitId, u.difference);
  if (hasPlasma) addToPattern('has-plasma', u.unitId, u.difference);
  if (hasHAG) addToPattern('has-hag', u.unitId, u.difference);
  if (hasRAC) addToPattern('has-rac', u.unitId, u.difference);
  if (hasMASC || hasSC) addToPattern('has-masc-or-sc', u.unitId, u.difference);
  if (hasTSM) addToPattern('has-tsm', u.unitId, u.difference);
  if (hasTC) addToPattern('has-tc', u.unitId, u.difference);

  // Categorize by direction + band
  const band = pctAbs <= 2 ? '1-2%' : pctAbs <= 5 ? '2-5%' : '5%+';
  addToPattern(`${isOver ? 'over' : 'under'}-${band}`, u.unitId, u.difference);

  // Check Clan tech base
  if (unit.techBase === 'CLAN') addToPattern('clan-tech', u.unitId, u.difference);
  if (unit.techBase === 'IS') addToPattern('is-tech', u.unitId, u.difference);

  // Check for specific ammo issues
  if (b.ammoBV === 0) {
    // Check if unit has ammo in crits
    let hasAmmo = false;
    if (unit.criticalSlots) {
      for (const slots of Object.values(unit.criticalSlots)) {
        if (!Array.isArray(slots)) continue;
        for (const s of slots) {
          if (s && typeof s === 'string' && (s as string).toLowerCase().includes('ammo') &&
              !(s as string).toLowerCase().includes('ams')) hasAmmo = true;
        }
      }
    }
    if (hasAmmo && isUnder) addToPattern('zero-ammo-bv-but-has-ammo', u.unitId, u.difference);
  }

  // Check explosive penalty -- overcalculated units that should have penalty but don't
  if (isOver && b.explosivePenalty === 0 && b.ammoBV > 0) {
    // Check for unprotected ammo
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
    for (const loc of ammoLocs) {
      const hasCase = unit.criticalSlots?.[loc]?.some?.((s: any) =>
        s && typeof s === 'string' && s.toLowerCase().includes('case'));
      if (!hasCase) {
        addToPattern('missing-explosive-penalty', u.unitId, u.difference);
        break;
      }
    }
  }

  // Check for heat efficiency issues -- high weapon heat units
  if (b.heatEfficiency !== undefined && b.halvedWeaponCount > 0) {
    addToPattern('has-halved-weapons', u.unitId, u.difference);
  }
}

// Sort patterns by unit count
const sorted = Object.values(patterns).sort((a, b) => b.units.length - a.units.length);

console.log('=== PATTERNS BY FREQUENCY ===\n');
for (const p of sorted) {
  const overCount = p.units.filter(uid => {
    const r = outside1.find((x: any) => x.unitId === uid);
    return r && r.percentDiff > 0;
  }).length;
  const underCount = p.units.length - overCount;
  console.log(`${p.name.padEnd(35)} ${p.units.length} units (${overCount} over, ${underCount} under) totalDiff=${p.totalDiff.toFixed(0)}`);
}

// Now focus on the 1-2% band which is easiest to fix
console.log('\n=== 1-2% BAND DETAIL (easiest to bring within 1%) ===');
const band1to2 = outside1.filter((x: any) => Math.abs(x.percentDiff) > 1 && Math.abs(x.percentDiff) <= 2);

// For these units, compute the exact BV gap needed
let totalGapNeeded = 0;
const under1to2 = band1to2.filter((x: any) => x.percentDiff < -1);
const over1to2 = band1to2.filter((x: any) => x.percentDiff > 1);
console.log(`\n  Undercalculated 1-2%: ${under1to2.length} units`);
console.log(`  Overcalculated 1-2%: ${over1to2.length} units`);

// For undercalculated: what's the gap in base offensive BV?
console.log('\n  === UNDERCALCULATED 1-2% BASE OFFENSIVE GAPS ===');
const offGaps: { unitId: string; gap: number; details: string }[] = [];
for (const u of under1to2) {
  const b = u.breakdown;
  const cockpit = b.cockpitModifier ?? 1;
  const refBase = u.indexBV / cockpit;
  const baseOff = (b.weaponBV ?? 0) + (b.ammoBV ?? 0) + (b.weightBonus ?? 0) + (b.physicalWeaponBV ?? 0) + (b.offEquipBV ?? 0);
  const neededBaseOff = (refBase - b.defensiveBV) / b.speedFactor;
  const gap = neededBaseOff - baseOff;
  offGaps.push({ unitId: u.unitId, gap, details: `weapBV=${b.weaponBV?.toFixed(0)} ammoBV=${b.ammoBV} wt=${b.weightBonus?.toFixed(0)} SF=${b.speedFactor}` });
}
offGaps.sort((a, b) => b.gap - a.gap);
for (const g of offGaps.slice(0, 20)) {
  console.log(`  ${g.unitId.padEnd(40)} baseGap=${g.gap.toFixed(1)} ${g.details}`);
}

// For overcalculated: what's the excess in base offensive BV?
console.log('\n  === OVERCALCULATED 1-2% BASE OFFENSIVE EXCESS ===');
const offExcesses: { unitId: string; excess: number; details: string }[] = [];
for (const u of over1to2) {
  const b = u.breakdown;
  const cockpit = b.cockpitModifier ?? 1;
  const refBase = u.indexBV / cockpit;
  const baseOff = (b.weaponBV ?? 0) + (b.ammoBV ?? 0) + (b.weightBonus ?? 0) + (b.physicalWeaponBV ?? 0) + (b.offEquipBV ?? 0);
  const neededBaseOff = (refBase - b.defensiveBV) / b.speedFactor;
  const excess = baseOff - neededBaseOff;
  offExcesses.push({ unitId: u.unitId, excess, details: `weapBV=${b.weaponBV?.toFixed(0)} ammoBV=${b.ammoBV} wt=${b.weightBonus?.toFixed(0)} SF=${b.speedFactor} expl=${b.explosivePenalty}` });
}
offExcesses.sort((a, b) => b.excess - a.excess);
for (const e of offExcesses.slice(0, 20)) {
  console.log(`  ${e.unitId.padEnd(40)} baseExcess=${e.excess.toFixed(1)} ${e.details}`);
}

// Check: how many 1-2% undercalculated have unresolved weapons?
console.log('\n=== UNRESOLVED WEAPON ANALYSIS (under 1-2%) ===');
let withUnresolved = 0;
let withoutUnresolved = 0;
for (const u of under1to2) {
  const b = u.breakdown;
  if ((b.unresolvedWeapons || []).length > 0) withUnresolved++;
  else withoutUnresolved++;
}
console.log(`  With unresolved weapons: ${withUnresolved}`);
console.log(`  Without unresolved weapons: ${withoutUnresolved}`);
