/**
 * Trace the biggest overcalculated units to find systematic patterns.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const over = valid.filter((x: any) => x.percentDiff > 1);

// Sort by gap size
const sorted = [...over].sort((a: any, b: any) => b.difference - a.difference);

console.log(`=== TOP 20 OVERCALCULATED UNITS ===\n`);
for (const u of sorted.slice(0, 20)) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;

  console.log(`${'='.repeat(70)}`);
  console.log(`${u.unitId} (${unit.techBase}, ${unit.tonnage}t) ref=${u.indexBV} calc=${u.calculatedBV} diff=+${u.difference} (+${u.percentDiff.toFixed(1)}%)`);
  console.log(`  cockpit=${unit.cockpit || 'STANDARD'} mod=${b?.cockpitModifier} gyro=${unit.gyro?.type || 'STANDARD'}`);
  console.log(`  defBV=${b?.defensiveBV?.toFixed(0)} offBV=${b?.offensiveBV?.toFixed(0)} SF=${b?.speedFactor}`);
  console.log(`  weapBV=${b?.weaponBV?.toFixed(0)} rawWeapBV=${b?.rawWeaponBV?.toFixed(0)} halvedBV=${b?.halvedWeaponBV?.toFixed(0)}`);
  console.log(`  ammoBV=${b?.ammoBV} weightBonus=${b?.weightBonus?.toFixed(0)} physBV=${b?.physicalWeaponBV?.toFixed(0)} offEquip=${b?.offEquipBV}`);
  console.log(`  HE=${b?.heatEfficiency} heatDiss=${b?.heatDissipation} moveHeat=${b?.moveHeat}`);
  console.log(`  armorBV=${b?.armorBV?.toFixed(0)} structBV=${b?.structureBV?.toFixed(0)} gyroBV=${b?.gyroBV?.toFixed(0)}`);
  console.log(`  defFactor=${b?.defensiveFactor} maxTMM=${b?.maxTMM} explPenalty=${b?.explosivePenalty}`);

  // Check what component is overcalculated
  const cockpitMod = b?.cockpitModifier ?? 1;
  const refBase = u.indexBV / cockpitMod;
  const defOver = b?.defensiveBV - (refBase - (refBase - b?.defensiveBV)); // simpl
  const offExpected = refBase - b?.defensiveBV;
  const offOver = b?.offensiveBV - offExpected;
  console.log(`  Expected offBV: ${offExpected.toFixed(0)}, actual: ${b?.offensiveBV?.toFixed(0)}, excess: ${offOver.toFixed(0)}`);

  // Equipment list (brief)
  const weapons = (unit.equipment || []).filter((eq: any) => {
    const res = resolveEquipmentBV(eq.id);
    return res.battleValue > 0 && res.type === 'weapon';
  });
  if (weapons.length > 0) {
    console.log(`  WEAPONS: ${weapons.map((w: any) => w.id).join(', ')}`);
  }

  // Check for TSM, MASC, Supercharger
  const hasTSM = (unit.equipment || []).some((eq: any) => eq.id.toLowerCase().includes('tsm'));
  const hasMASC = (unit.equipment || []).some((eq: any) => eq.id.toLowerCase().includes('masc'));
  const hasSC = (unit.equipment || []).some((eq: any) => eq.id.toLowerCase().includes('supercharger'));
  if (hasTSM || hasMASC || hasSC) {
    console.log(`  SPECIALS: TSM=${hasTSM} MASC=${hasMASC} SC=${hasSC}`);
  }

  // Movement
  console.log(`  Move: walk=${unit.movement?.walk} run=${unit.movement?.run} jump=${unit.movement?.jump || 0} runMP=${b?.runMP} jumpMP=${b?.jumpMP}`);

  console.log('');
}
