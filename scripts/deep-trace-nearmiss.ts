/**
 * Deep trace a few 1-2% overcalculated and undercalculated units
 * to find the systematic source of the BV difference.
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
const near = valid.filter((x: any) => Math.abs(x.percentDiff) > 1 && Math.abs(x.percentDiff) <= 2);
const over = near.filter((x: any) => x.percentDiff > 1).sort((a: any, b: any) => b.percentDiff - a.percentDiff);
const under = near.filter((x: any) => x.percentDiff < -1).sort((a: any, b: any) => a.percentDiff - b.percentDiff);

// Pick 5 overcalculated and 5 undercalculated that are IS, no special equipment, to isolate the issue
function trace(u: any) {
  const b = u.breakdown;
  const unit = loadUnit(u.unitId);
  if (!unit) return;

  console.log(`\n${'='.repeat(70)}`);
  console.log(`${u.unitId} — ${unit.chassis} ${unit.model}`);
  console.log(`  ref=${u.indexBV} calc=${u.calculatedBV} diff=${u.difference} (${u.percentDiff.toFixed(2)}%)`);
  console.log(`  tonnage=${unit.tonnage} techBase=${unit.techBase}`);
  console.log(`  engine=${unit.engine?.type} rating=${unit.engine?.rating}`);
  console.log(`  armor=${unit.armor?.type} structure=${unit.structure?.type || 'standard'}`);
  console.log(`  heatSinks: ${unit.heatSinks?.count}x ${unit.heatSinks?.type}`);
  console.log(`  movement: walk=${unit.movement?.walk} jump=${unit.movement?.jump || 0}`);
  console.log(`  cockpit: ${unit.cockpit || 'STANDARD'}`);

  console.log(`\n  --- BV Breakdown ---`);
  console.log(`  armorBV=${b.armorBV?.toFixed(1)} structBV=${b.structureBV?.toFixed(1)} gyroBV=${b.gyroBV?.toFixed(1)}`);
  console.log(`  defEquipBV=${b.defEquipBV?.toFixed(1)} explosivePenalty=${b.explosivePenalty?.toFixed(1)}`);
  console.log(`  baseDef=${((b.armorBV||0)+(b.structureBV||0)+(b.gyroBV||0)+(b.defEquipBV||0)-(b.explosivePenalty||0)).toFixed(1)}`);
  console.log(`  DF=${b.defensiveFactor} → defensiveBV=${b.defensiveBV?.toFixed(1)}`);
  console.log(`  weaponBV=${b.weaponBV?.toFixed(1)} ammoBV=${b.ammoBV} physBV=${b.physicalWeaponBV?.toFixed(1)}`);
  console.log(`  weightBonus=${b.weightBonus?.toFixed(1)} offEquipBV=${b.offEquipBV?.toFixed(1)}`);
  console.log(`  HE=${b.heatEfficiency} run=${b.runMP} jump=${b.jumpMP}`);
  console.log(`  SF=${b.speedFactor} → offensiveBV=${b.offensiveBV?.toFixed(1)}`);
  console.log(`  cockpitMod=${b.cockpitModifier}`);
  console.log(`  raw total=${((b.defensiveBV||0) + (b.offensiveBV||0)).toFixed(1)} → cockpit → ${u.calculatedBV}`);

  // Calculate what the ref implies
  const refPreCockpit = u.indexBV / (b.cockpitModifier || 1);
  const defShare = (b.defensiveBV || 0) / ((b.defensiveBV || 0) + (b.offensiveBV || 0));
  const refDef = refPreCockpit * defShare;
  const refOff = refPreCockpit * (1 - defShare);
  const defDiff = (b.defensiveBV || 0) - refDef;
  const offDiff = (b.offensiveBV || 0) - refOff;
  console.log(`  If DEF/OFF ratio matches: refDef≈${refDef.toFixed(0)} refOff≈${refOff.toFixed(0)} defDiff≈${defDiff.toFixed(0)} offDiff≈${offDiff.toFixed(0)}`);

  // List equipment
  const eqs = (unit.equipment || []).map((e: any) => `${e.id} (${e.location})`);
  if (eqs.length > 0) {
    console.log(`  equipment: ${eqs.join(', ')}`);
  }

  // List weapons from breakdown
  if (b.weapons && b.weapons.length > 0) {
    console.log(`  --- Weapons (from breakdown) ---`);
    for (const w of b.weapons) {
      console.log(`    ${w.name || w.id}: heat=${w.heat} bv=${w.bv} ${w.rear ? '(rear)' : ''}`);
    }
  }

  // List ammo from breakdown
  if (b.ammo && b.ammo.length > 0) {
    console.log(`  --- Ammo (from breakdown) ---`);
    for (const a of b.ammo) {
      console.log(`    ${a.id || a.name}: bv=${a.bv} weaponType=${a.weaponType}`);
    }
  }
}

// Filter to IS mechs without stealth/null-sig/chameleon for cleaner analysis
function isSimple(unitId: string): boolean {
  const unit = loadUnit(unitId);
  if (!unit) return false;
  const eqStr = (unit.equipment || []).map((e: any) => e.id.toLowerCase()).join(' ');
  return !eqStr.includes('stealth') && !eqStr.includes('null-sig') && !eqStr.includes('chameleon') && !eqStr.includes('novacews');
}

console.log('===== OVERCALCULATED 1-2% (IS, simple) =====');
let count = 0;
for (const u of over) {
  if (count >= 5) break;
  if (isSimple(u.unitId)) { trace(u); count++; }
}

console.log('\n\n===== UNDERCALCULATED 1-2% (IS, simple) =====');
count = 0;
for (const u of under) {
  if (count >= 5) break;
  if (isSimple(u.unitId)) { trace(u); count++; }
}
