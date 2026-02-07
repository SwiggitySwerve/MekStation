import * as fs from 'fs';
import * as path from 'path';

const data = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const mulCache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf8'));
const indexData = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// Get the exact 1.0527 units
const exactFive = data.allResults.filter((d: any) => {
  if (d.difference <= 0) return false;
  const entry = mulCache.entries?.[d.unitId];
  if (!entry || entry.mulBV <= 0 || entry.matchType !== 'exact') return false;
  const ratio = d.calculatedBV / d.indexBV;
  return ratio >= 1.051 && ratio <= 1.054;
});

console.log('=== CHECKING HEAD SLOTS FOR SMALL COCKPIT ===');
console.log('Total exact-1.0527 units:', exactFive.length);
console.log('');

// A standard cockpit has: Life Support, Sensors, Cockpit, Sensors, ?, Life Support
// HEAD slot 1 = Life Support, slot 2 = Sensors, slot 3 = Cockpit, slot 4 = Sensors
// slots 5-6 = Life Support (standard) or other equipment (small cockpit)
// Small cockpit has only 1 Life Support in HEAD (slot 1), freeing slot 6.

let smallCockpitCount = 0;
let standardCockpitCount = 0;
let unknownCount = 0;

for (const d of exactFive) {
  const iu = indexData.units.find((u: any) => u.id === d.unitId);
  if (!iu) continue;
  try {
    const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    const headSlots = (unit.criticalSlots?.HEAD || []) as (string | null)[];
    const lifeSupCount = headSlots.filter(s => s && s.toLowerCase().includes('life support')).length;
    const cockpitField = unit.cockpit || 'STANDARD';

    // A small cockpit has only 1 Life Support in HEAD
    // A standard cockpit has 2 Life Support entries in HEAD (positions 1 and 6)
    const isSmallByLifeSupport = lifeSupCount === 1;

    // Check fluff text for "small cockpit" mention
    const fluff = JSON.stringify(unit.fluff || {}).toLowerCase();
    const fluffMentionsSmall = fluff.includes('small cockpit');

    if (isSmallByLifeSupport) {
      smallCockpitCount++;
      if (cockpitField.toUpperCase() !== 'SMALL') {
        console.log(`  MISLABELED: ${d.unitId}: cockpit="${cockpitField}" but head has ${lifeSupCount} Life Support`);
        console.log(`    HEAD: [${headSlots.join(', ')}]`);
        if (fluffMentionsSmall) console.log(`    FLUFF mentions small cockpit`);
      }
    } else if (lifeSupCount === 2) {
      standardCockpitCount++;
    } else {
      unknownCount++;
      console.log(`  UNUSUAL: ${d.unitId}: cockpit="${cockpitField}" head has ${lifeSupCount} Life Support`);
      console.log(`    HEAD: [${headSlots.join(', ')}]`);
    }
  } catch {}
}

console.log('');
console.log('=== SUMMARY ===');
console.log('Small cockpit (by HEAD Life Support count = 1):', smallCockpitCount);
console.log('Standard cockpit (Life Support count = 2):', standardCockpitCount);
console.log('Unknown:', unknownCount);
console.log('');
console.log('If ALL exact-1.0527 units have small cockpits (mislabeled as STANDARD),');
console.log('the 0.95 factor is simply the small cockpit modifier not being applied.');
console.log('');
console.log('Predicted: smallCockpitCount should be', exactFive.length);
