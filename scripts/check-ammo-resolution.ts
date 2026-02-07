/**
 * Check actual ammo BV resolution in the 1-2% undercalculated band.
 * Compare ammoBV in breakdown vs what we'd expect.
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
const under1to2 = valid.filter((x: any) => x.percentDiff >= -2 && x.percentDiff < -1 && x.breakdown);

// Check for units where ammoBV = 0 but unit has ammo in crits
console.log('=== UNITS WITH ZERO AMMO BV BUT HAS AMMO ===\n');
let zeroAmmoCount = 0;
for (const u of under1to2) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;
  if (b.ammoBV > 0) continue;

  // Check if unit has ammo in crits
  let ammoCount = 0;
  const ammoNames: string[] = [];
  if (unit.criticalSlots) {
    for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (s && typeof s === 'string' && (s as string).toLowerCase().includes('ammo')) {
          ammoCount++;
          ammoNames.push(`[${loc}] ${s}`);
        }
      }
    }
  }

  if (ammoCount > 0) {
    zeroAmmoCount++;
    console.log(`${u.unitId.padEnd(40)} ammoBV=0 but ${ammoCount} ammo slots diff=${u.difference}`);
    for (const a of ammoNames) console.log(`  ${a}`);
    console.log('');
  }
}
console.log(`Total with zero ammoBV but has ammo: ${zeroAmmoCount}\n`);

// Show ammoBV for all units in the band
console.log('=== AMMO BV DISTRIBUTION ===');
const ammoBuckets: Record<string, number> = { '0': 0, '1-20': 0, '21-50': 0, '51-100': 0, '100+': 0 };
for (const u of under1to2) {
  const b = u.breakdown;
  const abv = b.ammoBV ?? 0;
  if (abv === 0) ammoBuckets['0']++;
  else if (abv <= 20) ammoBuckets['1-20']++;
  else if (abv <= 50) ammoBuckets['21-50']++;
  else if (abv <= 100) ammoBuckets['51-100']++;
  else ammoBuckets['100+']++;
}
for (const [range, count] of Object.entries(ammoBuckets)) {
  console.log(`  ammoBV ${range}: ${count} units`);
}

// Now let's look at exactly what's missing for each unit
console.log('\n=== DETAILED GAP ANALYSIS (top 20 by gap) ===');
const sorted = [...under1to2].sort((a: any, b: any) => a.difference - b.difference);

for (const u of sorted.slice(0, 20)) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;

  const cockpit = b.cockpitModifier ?? 1;
  const refBase = u.indexBV / cockpit;
  const defGap = 0; // assume defense is correct
  const neededOff = refBase - b.defensiveBV;
  const actualBaseOff = (b.weaponBV ?? 0) + (b.ammoBV ?? 0) + (b.weightBonus ?? 0) + (b.physicalWeaponBV ?? 0) + (b.offEquipBV ?? 0);
  const neededBaseOff = neededOff / b.speedFactor;
  const baseGap = neededBaseOff - actualBaseOff;

  console.log(`${u.unitId.padEnd(40)} diff=${u.difference} baseGap=${baseGap.toFixed(0)} tech=${unit.techBase}`);
  console.log(`  weapBV=${b.weaponBV?.toFixed(0)} ammoBV=${b.ammoBV} wt=${b.weightBonus?.toFixed(0)} phys=${b.physicalWeaponBV?.toFixed(0)} offEq=${b.offEquipBV}`);
  console.log(`  SF=${b.speedFactor} HE=${b.heatEfficiency} halved=${b.halvedWeaponBV?.toFixed(0)} halvedCt=${b.halvedWeaponCount}/${b.weaponCount}`);

  // Check for (T) turret-mounted weapons that might not be resolving
  let hasTurret = false;
  if (unit.criticalSlots) {
    for (const slots of Object.values(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (s && typeof s === 'string' && (s as string).includes(' (T)')) {
          hasTurret = true;
        }
      }
    }
  }
  if (hasTurret) console.log(`  *** HAS TURRET-MOUNTED WEAPONS ***`);

  // Check if there's an IOS weapon (one-shot)
  let hasIOS = false;
  if (unit.criticalSlots) {
    for (const slots of Object.values(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (s && typeof s === 'string' && ((s as string).includes('IOS') || (s as string).includes('(OS)'))) {
          hasIOS = true;
        }
      }
    }
  }
  if (hasIOS) console.log(`  *** HAS ONE-SHOT WEAPONS ***`);

  console.log('');
}

// Overall: how much of the gap is in weapon BV vs ammo vs weight bonus?
console.log('=== GAP ATTRIBUTION ===');
let totalWeapGap = 0;
let totalAmmoGap = 0;
let countUnits = 0;
for (const u of under1to2) {
  const b = u.breakdown;
  if (!b) continue;
  countUnits++;
  // We can't separate weapon gap from ammo gap without knowing the correct values,
  // but we can check: does gap correlate with ammoBV?
}
console.log(`  ${countUnits} units analyzed`);
