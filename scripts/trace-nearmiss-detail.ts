/**
 * Detailed breakdown of specific near-miss units to find systematic offset sources.
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

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null && x.breakdown);

// Sample units from different bands
const sampleIds = [
  // Undercalculated 1-2%
  'vandal-li-o', 'hoplite-hop-4a', 'thunderbolt-tdr-5ls', 'scorpion-scp-1n', 'goliath-gol-7k',
  // Overcalculated 1-2%
  'puma-tc', 'wolfhound-wlf-2x', 'berserker-brz-c3', 'panther-pnt-10alag', 'mantis-mts-l',
  // Undercalculated 2-5%
  'osteon-a', 'night-stalker-nsr-ka',
];

for (const sid of sampleIds) {
  const u = valid.find((x: any) => x.unitId === sid);
  if (!u) { console.log(`${sid}: NOT IN REPORT`); continue; }
  const unit = loadUnit(sid);
  if (!unit) { console.log(`${sid}: UNIT NOT FOUND`); continue; }
  const b = u.breakdown;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`${sid} | ${unit.techBase} | ${unit.tonnage}t`);
  console.log(`  REF=${u.indexBV} CALC=${u.calculatedBV} DIFF=${u.difference} (${u.percentDiff.toFixed(2)}%)`);
  console.log(`  --- Defensive ---`);
  console.log(`    armorBV=${b.armorBV?.toFixed(1)} structBV=${b.structureBV?.toFixed(1)} gyroBV=${b.gyroBV?.toFixed(1)}`);
  console.log(`    defEquipBV=${b.defEquipBV?.toFixed(1)} explosivePenalty=${b.explosivePenalty?.toFixed(1)}`);
  console.log(`    defensiveFactor=${b.defensiveFactor} defensiveBV=${b.defensiveBV?.toFixed(1)}`);
  console.log(`  --- Offensive ---`);
  console.log(`    weaponBV=${b.weaponBV?.toFixed(1)} rawWeaponBV=${b.rawWeaponBV?.toFixed(1)} ammoBV=${b.ammoBV}`);
  console.log(`    physicalWeaponBV=${b.physicalWeaponBV?.toFixed(1)} weightBonus=${b.weightBonus?.toFixed(1)} offEquipBV=${b.offEquipBV?.toFixed(1)}`);
  console.log(`    speedFactor=${b.speedFactor} offensiveBV=${b.offensiveBV?.toFixed(1)}`);
  console.log(`  --- Other ---`);
  console.log(`    heatEfficiency=${b.heatEfficiency} heatDissipation=${b.heatDissipation} moveHeat=${b.moveHeat}`);
  console.log(`    cockpitMod=${b.cockpitModifier} runMP=${b.runMP} jumpMP=${b.jumpMP}`);

  // Check TSM
  if (unit.criticalSlots) {
    const allCrits: string[] = [];
    for (const [, slots] of Object.entries(unit.criticalSlots)) {
      if (Array.isArray(slots)) for (const s of slots as string[]) if (s) allCrits.push(s);
    }
    const tsmCount = allCrits.filter(c => c.toLowerCase().includes('tsm') || c.toLowerCase().includes('triple strength')).length;
    const mascCount = allCrits.filter(c => c.toLowerCase().includes('masc')).length;
    const superCount = allCrits.filter(c => c.toLowerCase().includes('supercharger')).length;
    if (tsmCount > 0) console.log(`    TSM slots: ${tsmCount}`);
    if (mascCount > 0) console.log(`    MASC slots: ${mascCount}`);
    if (superCount > 0) console.log(`    Supercharger slots: ${superCount}`);
  }
}
