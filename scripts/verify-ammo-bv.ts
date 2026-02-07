import * as fs from 'fs';
import * as path from 'path';

// MegaMek ammo BV values per ton, derived from TechManual BV 2.0 tables
// Formula: ammo BV = weapon BV * (shots_per_ton / total_weapon_capability_per_10_turns)
// BUT actually MegaMek just stores them directly. Let's check our values against known reference.

// Known correct BV values per ton from TechManual / MegaMek:
const MEGAMEK_AMMO_BV: Record<string, number> = {
  // AC (already in our catalog as individual entries)
  'ac-2': 5,
  'ac-5': 9,
  'ac-10': 15,
  'ac-20': 22,
  // UAC (already in our catalog)
  'uac-2': 8,
  'uac-5': 15,
  'uac-10': 26,
  'uac-20': 35,
  // LB-X (already in our catalog)
  'lb-2-x': 6,
  'lb-5-x': 12,
  'lb-10-x': 19,
  'lb-20-x': 30,
  // Gauss (already in our catalog)
  'gauss': 25,
  'light-gauss': 20,
  'heavy-gauss': 22, // per TM
  // LRM - these are the ones we need to verify
  'lrm-5': 6,
  'lrm-10': 11,
  'lrm-15': 17,
  'lrm-20': 23,
  // SRM
  'srm-2': 3,
  'srm-4': 5,
  'srm-6': 7,
  // Streak SRM
  'streak-srm-2': 5,
  'streak-srm-4': 10,
  'streak-srm-6': 15,
  // MRM
  'mrm-10': 5,
  'mrm-20': 11,
  'mrm-30': 16,
  'mrm-40': 22,
};

// Our catalog values
const ammoPath = path.resolve(__dirname, '../public/data/equipment/official/ammunition.json');
const ammoCatalog = JSON.parse(fs.readFileSync(ammoPath, 'utf8'));

// Build lookup from our catalog
const ourValues: Record<string, number> = {};

// Size-specific entries
for (const item of ammoCatalog.items) {
  ourValues[item.id] = item.battleValue;
}

console.log('=== AMMO BV COMPARISON: Our Catalog vs MegaMek Expected ===');
console.log('');
console.log('Per-size LRM ammo:');
for (const size of [5, 10, 15, 20]) {
  const ourBV = ourValues[`ammo-lrm-${size}`];
  const expected = MEGAMEK_AMMO_BV[`lrm-${size}`];
  const status = ourBV === expected ? 'OK' : `MISMATCH (ours=${ourBV}, expected=${expected})`;
  console.log(`  LRM-${size}: catalog=${ourBV ?? 'MISSING'} expected=${expected} ${status}`);
}

console.log('\nPer-size SRM ammo:');
for (const size of [2, 4, 6]) {
  const ourBV = ourValues[`ammo-srm-${size}`];
  const expected = MEGAMEK_AMMO_BV[`srm-${size}`];
  const status = ourBV === expected ? 'OK' : `MISMATCH`;
  console.log(`  SRM-${size}: catalog=${ourBV ?? 'MISSING'} expected=${expected} ${status}`);
}

console.log('\nGeneric (flat) entries vs size-specific:');
console.log(`  lrm-ammo (generic): BV=${ourValues['lrm-ammo']} -- used when size can't be determined`);
console.log(`  srm-ammo (generic): BV=${ourValues['srm-ammo']} -- used when size can't be determined`);
console.log(`  streak-srm-ammo (generic): BV=${ourValues['streak-srm-ammo']} -- used when size can't be determined`);
console.log(`  mrm-ammo (generic): BV=${ourValues['mrm-ammo']} -- used when size can't be determined`);

// Now the key question: Does the validation script correctly resolve per-size ammo?
// Check what happens when we look up "ammo-lrm-20" in the ammoLookup

console.log('\n=== RESOLUTION PATH TEST ===');
// Simulate the lookup: keys come from the rules like `ammo-lrm-${m[1]}`
// These should be found in the catalog since we have entries like `ammo-lrm-5`, etc.
for (const key of ['ammo-lrm-5', 'ammo-lrm-10', 'ammo-lrm-15', 'ammo-lrm-20',
                     'ammo-srm-2', 'ammo-srm-4', 'ammo-srm-6']) {
  const found = ammoCatalog.items.find((i: any) => i.id === key);
  console.log(`  ${key}: ${found ? `FOUND in catalog (BV=${found.battleValue})` : 'NOT FOUND'}`);
}

// Check Gauss values
console.log('\nGauss ammo:');
const gaussEntries = ['gauss-ammo', 'light-gauss-ammo', 'heavy-gauss-ammo'];
for (const id of gaussEntries) {
  console.log(`  ${id}: BV=${ourValues[id]}`);
}

// Check what the buildAmmoLookup function actually builds
// The catalog loader runs: normalizeWeaponKey(item.compatibleWeaponIds[0]) for weaponType
// For items with empty compatibleWeaponIds, it uses extractWeaponTypeFromAmmoId
console.log('\n=== KEY: Does buildAmmoLookup find per-size entries? ===');
console.log('Per-size entries exist in catalog:');
const perSizeIds = ammoCatalog.items.filter((i: any) => /^ammo-(lrm|srm)-\d+$/.test(i.id));
for (const e of perSizeIds) {
  // The canon key is id without non-alphanumeric
  const canon = e.id.replace(/[^a-z0-9]/g, '');
  console.log(`  ${e.id} (canon: ${canon}) BV=${e.battleValue}`);
}

// Now check: Does the validation script's rule for "ammo lrm-20" map to the key "ammo-lrm-20"
// which exists in the catalog? YES! The entry is there.
console.log('\n=== ACTUAL ISSUE: Generic ammo entry shadows per-size entry ===');
console.log('When buildAmmoLookup runs, it loads catalog items FIRST.');
console.log('The generic "lrm-ammo" entry gets keyed by item.id = "lrm-ammo"');
console.log('The per-size "ammo-lrm-20" entry gets keyed by item.id = "ammo-lrm-20" and canon "ammolrm20"');
console.log('');
console.log('QUESTION: When a crit slot says "IS Ammo LRM-20", which key does it resolve to?');
console.log('Rule: /^(?:is\\s*)?ammo\\s+lrm-(\\d+)$/ => ammo-lrm-${m[1]} => "ammo-lrm-20"');
console.log('Catalog HAS "ammo-lrm-20" with BV=23');
console.log('');
console.log('So the per-size resolution SHOULD work. Let me check if the BV values are correct...');
console.log('');

// The real question: are our per-size ammo BV values correct?
// LRM-20 weapon BV = 220 (from catalog)
// LRM-20 ammo: 6 shots/ton, TM says BV = 23 per ton
// But wait - checking actual MegaMek BV calculations for specific units...

// Load report
const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

// Find units with ONLY LRM-20 as missile weapon to isolate the ammo BV impact
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Pick some simple LRM-heavy units
const lrmUnits = ['archer-arc-2r', 'longbow-lgb-0w', 'catapult-cplt-c1', 'trebuchet-tbt-5n'];
console.log('=== LRM-HEAVY UNIT ANALYSIS ===');
for (const uid of lrmUnits) {
  const result = report.allResults.find((r: any) => r.unitId === uid);
  if (!result) continue;

  const entry = index.units.find((u: any) => u.id === uid);
  if (!entry?.file) continue;

  const unitData = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.file), 'utf8'));

  // Count ammo slots
  const ammoSlots: string[] = [];
  if (unitData.criticalSlots) {
    for (const [loc, slots] of Object.entries(unitData.criticalSlots)) {
      if (Array.isArray(slots)) {
        for (const s of slots) {
          if (s && typeof s === 'string' && s.toLowerCase().includes('ammo'))
            ammoSlots.push(s);
        }
      }
    }
  }

  console.log(`\n${uid} (${unitData.tonnage}t)`);
  console.log(`  Index BV: ${result.indexBV}  Calc: ${result.calculatedBV}  Gap: ${result.difference} (${result.percentDiff?.toFixed(2)}%)`);
  console.log(`  AmmoBV reported: ${result.breakdown?.ammoBV}`);
  console.log(`  Ammo slots: ${ammoSlots.join(' | ')}`);
}

// Also run a targeted test: check Archer C 2 which we traced before
console.log('\n=== ARCHER C 2 (traced unit from earlier) ===');
const archer = report.allResults.find((r: any) => r.unitId === 'archer-c-2');
if (archer) {
  console.log(`  Index BV: ${archer.indexBV}  Calc: ${archer.calculatedBV}  Gap: ${archer.difference}`);
  console.log(`  AmmoBV: ${archer.breakdown?.ammoBV}  WeaponBV: ${archer.breakdown?.weaponBV}`);
  console.log(`  SF: ${archer.breakdown?.speedFactor}`);

  // If ammo BV should be higher, compute impact
  // Archer C 2 has 6 tons of LRM-20 ammo and 2 tons of Streak SRM-4 ammo
  const currentAmmoBV = archer.breakdown?.ammoBV || 0;
  // Our values: LRM-20 = 23, Streak SRM-4 = 10  => 6*23 + 2*10 = 138 + 20 = 158
  // If LRM-20 should be 27: 6*27 + 2*10 = 162 + 20 = 182 => diff = 24 more BV
  // With SF: 24 * SF = extra offensive BV
  const sf = archer.breakdown?.speedFactor || 1;
  console.log(`  Current ammo: 6 tons LRM-20 (BV=23) + 2 tons Streak SRM-4 (BV=10) = ${6*23 + 2*10}`);
  console.log(`  If LRM-20=27: 6*27 + 2*10 = ${6*27 + 2*10}, diff = ${6*27 + 2*10 - (6*23 + 2*10)}`);
  console.log(`  With SF=${sf}: extra = ${((6*27 + 2*10 - (6*23 + 2*10)) * sf).toFixed(1)} => new gap would be ${archer.difference + Math.round((6*27 + 2*10 - (6*23 + 2*10)) * sf)}`);
}
