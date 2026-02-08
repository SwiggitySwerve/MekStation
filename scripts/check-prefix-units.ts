/**
 * Find units with "1-" or other numeric prefix in equipment IDs
 * and check if ammo is missing for gauss-type weapons.
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

// Check for numeric prefix equipment IDs
let prefixCount = 0;
const prefixUnits: string[] = [];
for (const u of valid) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const hasPrefix = (unit.equipment || []).some((e: any) => /^\d+-/.test(e.id));
  if (hasPrefix) {
    prefixCount++;
    prefixUnits.push(u.unitId);
  }
}
console.log(`Units with numeric-prefix equipment IDs: ${prefixCount}`);
if (prefixUnits.length <= 20) {
  for (const id of prefixUnits) {
    const r = valid.find((x: any) => x.unitId === id);
    console.log(`  ${id.padEnd(45)} diff=${r?.percentDiff?.toFixed(1)}%`);
  }
}

// Check for ammo-needing weapons with ammoBV=0
console.log('\n=== WEAPONS NEEDING AMMO BUT ammoBV=0 ===');
const ammoWeapons = ['gauss', 'ac/', 'ac-', 'autocannon', 'lrm', 'srm', 'lbx', 'lb-', 'uac', 'ultra', 'rotary', 'rac-', 'atm', 'narc', 'mml', 'streak', 'thunderbolt', 'arrow', 'mortar', 'thumper', 'sniper', 'long-tom'];

let ammoMissingCount = 0;
const ammoMissingUnits: any[] = [];
for (const u of valid) {
  const b = u.breakdown;
  if (!b || b.ammoBV !== 0) continue;
  const unit = loadUnit(u.unitId);
  if (!unit) continue;

  const eqs = (unit.equipment || []).map((e: any) => e.id.toLowerCase());
  const hasAmmoWeapon = eqs.some((eq: string) => ammoWeapons.some(aw => eq.includes(aw)));

  if (hasAmmoWeapon) {
    // Check if there's actually ammo in crits
    let hasAmmoInCrits = false;
    for (const [, slots] of Object.entries(unit.criticalSlots || {})) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (typeof s === 'string' && s.toLowerCase().includes('ammo')) {
          hasAmmoInCrits = true;
          break;
        }
      }
      if (hasAmmoInCrits) break;
    }

    if (hasAmmoInCrits) {
      ammoMissingCount++;
      const weapons = eqs.filter(eq => ammoWeapons.some(aw => eq.includes(aw)));
      ammoMissingUnits.push({ unitId: u.unitId, diff: u.percentDiff, weapons });
    }
  }
}

console.log(`Units with ammo weapons + crit ammo but ammoBV=0: ${ammoMissingCount}`);
for (const u of ammoMissingUnits.sort((a, b) => a.diff - b.diff)) {
  console.log(`  ${u.unitId.padEnd(45)} diff=${u.diff?.toFixed(1).padStart(6)}%  weapons: ${u.weapons.join(', ')}`);
}

// Check for named variants with potentially wrong reference BV
console.log('\n=== POSSIBLE NAMED VARIANT BV MISMATCHES ===');
const namedPatterns = /\(.*\)$|-[a-z]+$/;
const bigOverNamed: any[] = [];
for (const u of valid.filter((x: any) => x.percentDiff > 5)) {
  if (u.unitId.includes('-') && (u.unitId.includes('webster') || u.unitId.includes('lowenbrau') || u.unitId.includes('grace') || u.unitId.includes('stacy') || u.unitId.includes('wendall') || u.unitId.includes('ian') || u.unitId.includes('austin'))) {
    bigOverNamed.push(u);
  }
}
for (const u of bigOverNamed) {
  console.log(`  ${u.unitId.padEnd(45)} ref=${u.indexBV} calc=${u.calculatedBV} diff=${u.percentDiff?.toFixed(1)}%`);
}

// Count how many overcalculated >5% units have named-variant patterns in their IDs
const bigOver = valid.filter((x: any) => x.percentDiff > 5);
const bigUnder = valid.filter((x: any) => x.percentDiff < -5);
console.log(`\n>5% overcalculated: ${bigOver.length}`);
console.log(`>5% undercalculated: ${bigUnder.length}`);
