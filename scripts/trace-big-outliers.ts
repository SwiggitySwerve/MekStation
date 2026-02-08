/**
 * Trace the biggest outliers to find the BV calculation errors.
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

// Pick specific big outliers to trace
const ids = [
  'jackalope-jlp-kb', 'jenner-jr7-d-webster', 'hatamoto-chi-htm-27t-lowenbrau',
  'thunderbolt-tdr-5l', 'barghest-bgs-3t', 'stag-ii-st-24g', 'great-turtle-gtr-1',
  'koshi-a', 'uller-c', 'celerity-clr-03-oe',
];

for (const unitId of ids) {
  const result = report.allResults.find((x: any) => x.unitId === unitId);
  const unit = loadUnit(unitId);
  if (!result || !unit) { console.log(`${unitId}: not found`); continue; }

  const b = result.breakdown || {};
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${unitId} — ${unit.chassis} ${unit.model}`);
  console.log(`  ref=${result.indexBV} calc=${result.calculatedBV} diff=${result.difference} (${result.percentDiff?.toFixed(1)}%)`);
  console.log(`  tonnage=${unit.tonnage} techBase=${unit.techBase} engine=${unit.engine?.type}`);
  console.log(`  walk=${unit.movement?.walk} jump=${unit.movement?.jump || 0}`);
  console.log(`  armor=${unit.armor?.type} structure=${unit.structure?.type || 'standard'}`);
  console.log(`  heatSinks: ${unit.heatSinks?.count}x ${unit.heatSinks?.type}`);
  console.log(`  cockpit: ${unit.cockpit || '(not set)'}`);

  // List ALL equipment
  console.log(`  --- Equipment ---`);
  for (const eq of unit.equipment || []) {
    console.log(`    ${eq.id} @ ${eq.location}`);
  }

  // Check critical slots for special items
  const specialItems: string[] = [];
  for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (!s || typeof s !== 'string') continue;
      const lo = s.toLowerCase();
      if (lo.includes('c3') || lo.includes('narc') || lo.includes('tag') ||
          lo.includes('tsm') || lo.includes('null') || lo.includes('stealth') ||
          lo.includes('chameleon') || lo.includes('nova') || lo.includes('void') ||
          lo.includes('angel') || lo.includes('artemis') || lo.includes('apollo') ||
          lo.includes('drone') || lo.includes('boosted') || lo.includes('coolant') ||
          lo.includes('targeting computer') || lo.includes('targeting-computer') ||
          lo.includes('partial wing') || lo.includes('partial-wing') ||
          lo.includes('blue shield') || lo.includes('blue-shield') ||
          lo.includes('bap') || lo.includes('beagle') || lo.includes('active-probe') ||
          lo.includes('watchdog')) {
        specialItems.push(`${s} @ ${loc}`);
      }
    }
  }
  if (specialItems.length > 0) {
    console.log(`  --- Special Crit Items ---`);
    for (const si of specialItems) console.log(`    ${si}`);
  }

  // BV breakdown
  console.log(`  --- BV ---`);
  console.log(`  armorBV=${b.armorBV?.toFixed(1)} structBV=${b.structureBV?.toFixed(1)} gyroBV=${b.gyroBV?.toFixed(1)}`);
  console.log(`  defEqBV=${b.defEquipBV?.toFixed(1)} expPen=${b.explosivePenalty?.toFixed(1)}`);
  console.log(`  DF=${b.defensiveFactor} DEF=${b.defensiveBV?.toFixed(1)}`);
  console.log(`  weaponBV=${b.weaponBV?.toFixed(1)} ammoBV=${b.ammoBV} physBV=${b.physicalWeaponBV?.toFixed(1)}`);
  console.log(`  wtBonus=${b.weightBonus?.toFixed(1)} offEqBV=${b.offEquipBV?.toFixed(1)}`);
  console.log(`  HE=${b.heatEfficiency} SF=${b.speedFactor} OFF=${b.offensiveBV?.toFixed(1)}`);
  console.log(`  cockpitMod=${b.cockpitModifier}`);

  // Show weapon details if available
  if (b.weapons?.length) {
    console.log(`  --- Weapons Detail ---`);
    for (const w of b.weapons) {
      console.log(`    ${(w.name||w.id).padEnd(35)} heat=${String(w.heat).padStart(2)} bv=${String(w.bv).padStart(4)} ${w.rear?'(R)':''}`);
    }
  }
}
