/**
 * Find simple energy-only units in the 1-2% band (no ammo, no special equipment)
 * to isolate what component of BV calculation is off.
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
const near = valid.filter((x: any) => Math.abs(x.percentDiff) > 1 && Math.abs(x.percentDiff) <= 5);

// Find "simple" units: energy only, no ammo, standard everything
const simple: any[] = [];
for (const u of near) {
  const b = u.breakdown;
  if (!b || b.ammoBV !== 0) continue;
  if (b.defEquipBV > 0) continue; // no defensive equipment
  if (b.offEquipBV > 0) continue; // no offensive equipment
  if (b.cockpitModifier !== 1) continue; // standard cockpit
  if (b.physicalWeaponBV > 0) continue; // no physical weapons

  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  if (unit.techBase !== 'INNER_SPHERE') continue; // IS only for simplicity
  if (unit.engine?.type !== 'FUSION' && unit.engine?.type !== 'XL' && unit.engine?.type !== 'LIGHT') continue;

  const eqs = (unit.equipment || []).map((e: any) => e.id.toLowerCase());
  const hasSpecial = eqs.some((e: string) =>
    e.includes('tsm') || e.includes('masc') || e.includes('supercharger') ||
    e.includes('c3') || e.includes('ecm') || e.includes('bap') || e.includes('stealth') ||
    e.includes('targeting') || e.includes('artemis') || e.includes('narc')
  );
  if (hasSpecial) continue;

  simple.push({ ...u, unit });
}

console.log(`Simple energy-only IS mechs in 1-5% band: ${simple.length}\n`);

// Sort by absolute diff
simple.sort((a, b) => Math.abs(b.percentDiff) - Math.abs(a.percentDiff));

for (const u of simple.slice(0, 20)) {
  const b = u.breakdown;
  const unit = u.unit;

  // Manually compute what each component SHOULD be
  const armorBV = b.armorBV;
  const structBV = b.structureBV;
  const gyroBV = b.gyroBV;
  const df = b.defensiveFactor;
  const expPen = b.explosivePenalty || 0;
  const baseDef = armorBV + structBV + gyroBV - expPen;
  const defBV = baseDef * df;

  const weapBV = b.weaponBV;
  const wtBonus = b.weightBonus;
  const sf = b.speedFactor;
  const baseOff = weapBV + wtBonus;
  const offBV = baseOff * sf;

  const total = Math.round(defBV + offBV);
  const ref = u.indexBV;
  const needed = ref - total;

  // How much would each component need to change?
  const defNeeded = needed / df; // base def adjustment needed
  const offNeeded = needed / sf; // base off adjustment needed

  console.log(`${u.unitId}`);
  console.log(`  ref=${ref} calc=${u.calculatedBV} diff=${u.difference} (${u.percentDiff.toFixed(1)}%)`);
  console.log(`  ${unit.tonnage}t ${unit.engine.type} walk=${unit.movement.walk} jump=${unit.movement.jump||0}`);
  console.log(`  armor=${unit.armor.type} struct=${unit.structure?.type||'STANDARD'} HS=${unit.heatSinks.count}x${unit.heatSinks.type}`);
  console.log(`  DEF: armor=${armorBV.toFixed(0)} struct=${structBV.toFixed(0)} gyro=${gyroBV.toFixed(0)} exp=${expPen} base=${baseDef.toFixed(0)} DF=${df} → ${defBV.toFixed(0)}`);
  console.log(`  OFF: weap=${weapBV.toFixed(0)} wt=${wtBonus.toFixed(0)} HE=${b.heatEfficiency} base=${baseOff.toFixed(0)} SF=${sf} → ${offBV.toFixed(0)}`);
  console.log(`  Need ${needed>=0?'+':''}${needed.toFixed(0)} BV. If DEF: ${defNeeded>=0?'+':''}${defNeeded.toFixed(0)} base. If OFF: ${offNeeded>=0?'+':''}${offNeeded.toFixed(0)} base.`);

  // Show weapons
  if (b.weapons?.length) {
    const weapList = b.weapons.map((w: any) => `${w.name||w.id}(h=${w.heat},bv=${w.bv}${w.rear?' R':''})`).join(', ');
    console.log(`  weapons: ${weapList}`);
  }
  console.log('');
}
