import * as fs from 'fs';

const data = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const mulCache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf8'));

// Exact-match MUL overcalculated
const overCalc = data.allResults.filter((d: any) => {
  if (d.difference <= 0 || d.percentDiff < 4 || d.percentDiff > 7) return false;
  const entry = mulCache.entries?.[d.unitId];
  return entry && entry.mulBV > 0 && entry.matchType === 'exact';
});

// The magic 0.95 multiplier fits almost perfectly.
// Let me check: in MegaMek BV calculation, is there a rounding step at the end?
// MegaMek: totalBV = defensiveBV + offensiveBV
// Then: adjustedBV = Math.round(totalBV * cockpitModifier * pilotModifier)
// The pilotModifier for 4/5 is 1.0.
// cockpitModifier for standard is 1.0.

// BUT WAIT: MegaMek's MUL BV values might use a different pilot skill!
// The MUL (Master Unit List) standard is to show BV for a 4/5 pilot.
// MegaMek calculates base BV with NO pilot modifier (raw BV).
// Then the pilot modifier is applied separately.

// Actually in MegaMek, the "base BV" shown on the unit record IS the BV without
// pilot skill modifier. The pilot skill modifier (1.0 for 4/5) is then applied.
// So MUL BV should equal rawBV * 1.0 = rawBV for default pilot.

// Hmm, BUT maybe MegaMek has some unit-level modifiers we're missing?
// Let me check a few specific BV values more carefully.

// The Archangel units are almost all overcalculated by exactly 5-6%.
// These are Celestial OmniMechs from the Word of Blake.
// They use the "Celestial" chassis which might have some special modifier.

// Actually, let me try a DIFFERENT hypothesis:
// What if the MUL uses "alternate BV" that accounts for C3 networks?
// C3 Connected BV = baseBV * 0.95 (when in C3 network, pilot skill modifier may differ)

// OR: What if MegaMek's processWeapon() applies a modifier we're missing?
// Let me check specifically: heatSorter in MegaMek uses the MODIFIED weapon BV.
// The weapon BV after applying all modifiers is then sorted.
// If we're sorting differently, the heat efficiency cutoff changes.

// Let me check another angle: the "6 + heatDissipation - moveHeat" heat efficiency
// The "6" comes from base heat capacity. But is it always 6?
// MegaMek: bvHeat = entity.heatCapacity(true, false) + 6
// where heatCapacity() returns the number of heat sinks * dissipation per HS
// So heatEfficiency = heatDissipation + 6 - moveHeat

// Actually, let me check if MegaMek's heatCapacity includes or excludes engine heat sinks.
// For DHS: 10 DHS total → heatCapacity = 20
// bvHeat = 20 + 6 = 26
// moveHeat = max(runningHeat, jumpHeat)
// heatEfficiency = bvHeat - moveHeat = 26 - max(2, 7) = 19

// That matches our calculation. So heat efficiency isn't the issue.

// Let me try one more thing: check if the issue is in how we calculate the
// FINAL offensive BV. In MegaMek:
// processWeapons() → gives us weapon BV
// processAmmo() → ammo BV
// processWeight() → weight bonus
// processOffensiveSpeedFactor() → speed factor
// The speed factor is applied to (weaponBV + ammoBV + weightBonus + offEquipBV + physBV)

// Wait... in MegaMek, I need to check if weight bonus is added BEFORE or AFTER
// the heat-based weapon BV halving.

// MegaMek order:
// 1. Process weapons (with heat efficiency halving) → weaponBV
// 2. Process ammo → ammoBV
// 3. processWeight() → adds tonnage to offensive BV
// 4. processOffensiveSpeedFactor() → multiplies by speed factor
// 5. Sum = (weaponBV + ammoBV + tonnage + physBV + offEquipBV) * speedFactor

// Our code does the same thing. Let me verify...

// Actually, let me check MegaMek more carefully on processWeight.
// Looking at MekBVCalculator.processWeight():
//   double dbv = entity.getWeight();
//   if (entity.hasTSM()) dbv *= 1.5;
//   // ... AES modifiers ...
//   offensiveValue += dbv;

// entity.getWeight() returns the mech tonnage. So weight bonus = tonnage.
// This is what our code does.

// HYPOTHESIS: Is MegaMek applying a C3 modifier that reduces BV?
// C3 systems in BV 2.0:
// Per TechManual, C3 equipment doesn't directly modify base BV.
// But the TAG weapon and C3 network bonuses DO affect BV when in a network.
// For STANDALONE BV (no network), C3 has no effect.
// The MUL should show standalone BV.

// Let me check if there's a TAG issue:
// TAG contributes 0 BV as a weapon but enables guided munitions.
// If we're counting TAG as a weapon with nonzero BV, that would overcalculate.

console.log('=== TAG WEAPON CHECK ===');
console.log('Checking if TAG is contributing nonzero weapon BV...');

// Check TAG BV resolution
const { resolveEquipmentBV } = require('../src/utils/construction/equipmentBVResolver');
console.log('TAG BV:', resolveEquipmentBV('tag'));
console.log('Light TAG BV:', resolveEquipmentBV('light-tag'));
console.log('Clan Light TAG BV:', resolveEquipmentBV('clan-light-tag'));
console.log('');

// Check iNarc
console.log('iNarc BV:', resolveEquipmentBV('inarc'));
console.log('iNarc (IS):', resolveEquipmentBV('improved-narc'));
console.log('Narc:', resolveEquipmentBV('narc'));
console.log('Narc beacon:', resolveEquipmentBV('narc-beacon'));
console.log('');

// Let me now try the EXACT MegaMek formula more carefully
// for a simple unit to see if I can reproduce the reference BV.

// Take the Assassin ASN-109 (from the overcalculated list)
// It's a simple IS unit with known MUL BV.
console.log('=== Assassin ASN-109 detailed trace ===');
const assassinResult = data.allResults.find((d: any) => d.unitId === 'assassin-asn-109');
if (assassinResult) {
  console.log('Reference BV:', assassinResult.indexBV);
  console.log('Calculated BV:', assassinResult.calculatedBV);
  console.log('Breakdown:', JSON.stringify(assassinResult.breakdown));
  console.log('Ratio:', (assassinResult.calculatedBV / assassinResult.indexBV).toFixed(4));
  console.log('');
  console.log('If * 0.95:', Math.round(assassinResult.calculatedBV * 0.95));
}

// Check an Archangel variant
console.log('');
console.log('=== Archangel C-ANG-OB Infernus ===');
const archResult = data.allResults.find((d: any) => d.unitId === 'archangel-c-ang-ob-infernus');
if (archResult) {
  console.log('Reference BV:', archResult.indexBV);
  console.log('Calculated BV:', archResult.calculatedBV);
  console.log('Breakdown:', JSON.stringify(archResult.breakdown));
  console.log('Ratio:', (archResult.calculatedBV / archResult.indexBV).toFixed(4));
  console.log('If * 0.95:', Math.round(archResult.calculatedBV * 0.95));
}

// Let's see if the Archangel has a special cockpit or other modifier
const indexData = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));
const archIU = indexData.units.find((u: any) => u.id === 'archangel-c-ang-ob-infernus');
if (archIU) {
  const path2 = require('path');
  const unit = JSON.parse(fs.readFileSync(path2.resolve('public/data/units/battlemechs', archIU.path), 'utf8'));
  console.log('Cockpit:', unit.cockpit);
  console.log('Gyro:', unit.gyro?.type);
  console.log('Config:', unit.configuration);
  console.log('');

  // Check if cockpit is small
  const allCrits: string[] = Object.values(unit.criticalSlots || {}).flat().filter((s: any) => s) as string[];
  const allCritsLo = allCrits.map((s: string) => s.toLowerCase());
  console.log('Has Small Cockpit:', allCritsLo.some(s => s.includes('small cockpit')));
  console.log('Has Command Console:', allCritsLo.some(s => s.includes('command console')));
  console.log('Has C3:', allCritsLo.some(s => s.includes('c3')));
  console.log('Head crits:', unit.criticalSlots?.HEAD);
}
