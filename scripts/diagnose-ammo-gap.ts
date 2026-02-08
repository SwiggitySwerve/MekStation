/**
 * Deep ammo BV diagnosis: for each undercalculated unit with ammo,
 * compute how much of the base gap would be explained by ammo BV.
 * Also check for "data quality" issues: units with ammo-consuming weapons
 * but zero ammo entries.
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
const under = valid.filter((x: any) => x.percentDiff < -1 && x.breakdown);

// Check for units with ballistic/missile weapons that need ammo but have zero ammo
console.log('=== MISSING AMMO CHECK ===');
const ammoNeeding = ['ac-', 'uac-', 'lb-', 'lrm-', 'srm-', 'mrm-', 'mml-', 'atm-', 'iatm-', 'streak-', 'hag-',
  'gauss', 'rac-', 'thunderbolt', 'arrow-iv', 'narc', 'sniper', 'long-tom', 'thumper',
  'rotary-ac', 'hvac-', 'light-ac-', 'machine-gun', 'mg'];
let missingAmmoUnits = 0;
const missingAmmoExamples: string[] = [];

for (const u of under) {
  const unit = loadUnit(u.unitId);
  if (!unit?.equipment) continue;

  const ammoWeapons: string[] = [];
  for (const eq of unit.equipment) {
    const lo = eq.id.toLowerCase().replace(/^\d+-/, '');
    if (lo.includes('ammo')) continue;
    for (const pat of ammoNeeding) {
      if (lo.includes(pat) || lo.replace(/^(?:is|cl|clan)-?/, '').includes(pat)) {
        ammoWeapons.push(eq.id);
        break;
      }
    }
  }

  const hasAmmo = unit.equipment.some((eq: any) => eq.id.toLowerCase().includes('ammo'));

  let critAmmo = false;
  if (unit.criticalSlots) {
    for (const [, slots] of Object.entries(unit.criticalSlots)) {
      if (Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('ammo'))) {
        critAmmo = true;
        break;
      }
    }
  }

  if (ammoWeapons.length > 0 && !hasAmmo && !critAmmo) {
    missingAmmoUnits++;
    const b = u.breakdown;
    const cockpit = b.cockpitModifier ?? 1.0;
    const neededTotal = u.indexBV / cockpit;
    const neededOff = neededTotal - b.defensiveBV;
    const neededBase = neededOff / b.speedFactor;
    const currentBase = b.weaponBV + b.ammoBV + b.weightBonus + (b.physicalWeaponBV ?? 0) + (b.offEquipBV ?? 0);
    const baseGap = neededBase - currentBase;
    if (missingAmmoExamples.length < 20) {
      missingAmmoExamples.push(`${u.unitId}: weapons=[${ammoWeapons.join(', ')}] ammo=NONE gap=${Math.round(baseGap)}`);
    }
  }
}
console.log(`Units with ammo-needing weapons but NO ammo: ${missingAmmoUnits}/${under.length}`);
for (const e of missingAmmoExamples) console.log(`  ${e}`);

// Check for units where ammoBV is 0 but they have ammo in crits
console.log('\n=== ZERO AMMO BV WITH AMMO IN CRITS ===');
let zeroBVWithAmmo = 0;
const zeroBVExamples: string[] = [];
for (const u of under) {
  const unit = loadUnit(u.unitId);
  if (!unit?.criticalSlots) continue;
  const b = u.breakdown;
  if (b.ammoBV > 0) continue;

  let critAmmoCount = 0;
  const ammoTypes: string[] = [];
  for (const [, slots] of Object.entries(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (s && typeof s === 'string' && s.toLowerCase().includes('ammo')) {
        critAmmoCount++;
        if (!ammoTypes.includes(s)) ammoTypes.push(s);
      }
    }
  }

  if (critAmmoCount > 0) {
    zeroBVWithAmmo++;
    const cockpit = b.cockpitModifier ?? 1.0;
    const neededTotal = u.indexBV / cockpit;
    const neededOff = neededTotal - b.defensiveBV;
    const neededBase = neededOff / b.speedFactor;
    const currentBase = b.weaponBV + b.ammoBV + b.weightBonus + (b.physicalWeaponBV ?? 0) + (b.offEquipBV ?? 0);
    const baseGap = neededBase - currentBase;
    if (zeroBVExamples.length < 20) {
      zeroBVExamples.push(`${u.unitId}: ammoBV=0 critAmmoSlots=${critAmmoCount} types=[${ammoTypes.slice(0, 3).join('; ')}] gap=${Math.round(baseGap)}`);
    }
  }
}
console.log(`Units with ammoBV=0 but ammo in crits: ${zeroBVWithAmmo}/${under.length}`);
for (const e of zeroBVExamples) console.log(`  ${e}`);

// Check ammo BV as fraction of gap
console.log('\n=== AMMO BV vs GAP ANALYSIS ===');
let ammoExplainsAll = 0;
let ammoExplainsMost = 0;
let ammoExplainsSome = 0;
let ammoExplainsNone = 0;
for (const u of under) {
  const b = u.breakdown;
  const cockpit = b.cockpitModifier ?? 1.0;
  const neededTotal = u.indexBV / cockpit;
  const neededOff = neededTotal - b.defensiveBV;
  const neededBase = neededOff / b.speedFactor;
  const currentBase = b.weaponBV + b.ammoBV + b.weightBonus + (b.physicalWeaponBV ?? 0) + (b.offEquipBV ?? 0);
  const baseGap = neededBase - currentBase;

  if (baseGap <= 0) { ammoExplainsNone++; continue; }

  if (b.ammoBV === 0) { ammoExplainsNone++; continue; }

  const ammoPctOfGap = b.ammoBV / baseGap;
  if (ammoPctOfGap >= 1.0) ammoExplainsAll++;
  else if (ammoPctOfGap >= 0.5) ammoExplainsMost++;
  else if (ammoPctOfGap >= 0.1) ammoExplainsSome++;
  else ammoExplainsNone++;
}
console.log(`  Ammo >= 100% of gap: ${ammoExplainsAll}`);
console.log(`  Ammo 50-99% of gap: ${ammoExplainsMost}`);
console.log(`  Ammo 10-49% of gap: ${ammoExplainsSome}`);
console.log(`  Ammo < 10% or none: ${ammoExplainsNone}`);

// FINAL: For each undercalculated unit, compute how much the gap could be closed
// by increasing weaponBV by a fixed percentage
console.log('\n=== IF WEAPON BV INCREASED BY X%, HOW MANY UNITS FIXED? ===');
for (const pctIncrease of [2, 5, 10, 15, 20]) {
  let fixed = 0;
  for (const u of under) {
    const b = u.breakdown;
    const cockpit = b.cockpitModifier ?? 1.0;
    const newWeaponBV = b.weaponBV * (1 + pctIncrease / 100);
    const newBase = newWeaponBV + b.ammoBV + b.weightBonus + (b.physicalWeaponBV ?? 0) + (b.offEquipBV ?? 0);
    const newOff = newBase * b.speedFactor;
    const newBV = Math.round((b.defensiveBV + newOff) * cockpit);
    if (Math.abs(newBV - u.indexBV) / u.indexBV * 100 <= 1) fixed++;
  }
  console.log(`  +${pctIncrease}% weaponBV: ${fixed}/${under.length} units fixed`);
}

// Check how many units have ammo in crits but NOT in equipment list
console.log('\n=== AMMO IN CRITS BUT NOT IN EQUIPMENT ===');
let critOnlyAmmo = 0;
const critOnlyExamples: string[] = [];
for (const u of under) {
  const unit = loadUnit(u.unitId);
  if (!unit?.criticalSlots) continue;

  const equipAmmoIds = new Set<string>();
  for (const eq of unit.equipment || []) {
    if (eq.id.toLowerCase().includes('ammo')) {
      equipAmmoIds.add(eq.id.toLowerCase());
    }
  }

  const critAmmoTypes = new Set<string>();
  for (const [, slots] of Object.entries(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (s && typeof s === 'string' && s.toLowerCase().includes('ammo')) {
        critAmmoTypes.add(s.replace(/\s*\(omnipod\)/gi, '').trim());
      }
    }
  }

  if (critAmmoTypes.size > 0 && equipAmmoIds.size === 0) {
    critOnlyAmmo++;
    if (critOnlyExamples.length < 15) {
      critOnlyExamples.push(`${u.unitId}: critAmmo=[${[...critAmmoTypes].slice(0, 3).join(', ')}] equipAmmo=NONE`);
    }
  }
}
console.log(`Units with ammo in crits but NOT in equipment: ${critOnlyAmmo}/${under.length}`);
for (const e of critOnlyExamples) console.log(`  ${e}`);
