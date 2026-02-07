#!/usr/bin/env npx tsx
/**
 * Find the TRULY vanilla undercalculated units:
 * - No ammo
 * - No special equipment (C3, TAG, spikes, vibroblades, etc.)
 * - No gyro mismatch
 * - Standard engine, standard armor, standard structure
 * - No AES
 */
import * as fs from 'fs';
import * as path from 'path';

const index = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));
const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

const undercalc = report.allResults.filter((r: any) => {
  const pct = Math.abs(r.percentDiff);
  return pct > 1 && pct <= 5 && r.difference < 0;
});

const specialPatterns = /c3|tag|vibro|lance|retract|shield|spike|drill|saw|welder|flail|backhoe|combine|pile|rock.*cut|wrecking|blue.?shield|aes|partial.?wing|coolant|harjel|supercharger|masc|tsm|targeting.?comp|ecm|bap|probe|stealth|null.?sig|chameleon|drone|radical/i;

for (const r of undercalc) {
  const b = r.breakdown;
  if (!b) continue;
  if (b.ammoBV > 0) continue; // Skip ammo units

  const iu = index.units.find((u: any) => u.id === r.unitId);
  if (!iu) continue;

  try {
    const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));

    // Skip non-standard engine (allow LIGHT, XL, CLAN_XL)
    if (!['FUSION', 'LIGHT', 'XL', 'CLAN_XL', 'COMPACT'].includes(unit.engine.type)) continue;
    // Allow common armor types
    if (!['STANDARD', 'FERRO_FIBROUS', 'FERRO_FIBROUS_CLAN', 'LIGHT_FERRO_FIBROUS'].includes(unit.armor.type)) continue;
    // Allow common structure types
    if (!['STANDARD', 'ENDO_STEEL', 'ENDO_STEEL_CLAN'].includes(unit.structure.type)) continue;
    // Skip non-standard gyro
    if ((unit.gyro?.type || 'STANDARD') !== 'STANDARD') continue;

    if (!unit.criticalSlots) continue;

    // Check gyro crit count
    const ctSlots = unit.criticalSlots.CENTER_TORSO || [];
    const gyroCount = ctSlots.filter((s: any) => s && typeof s === 'string' && (s as string).toLowerCase().includes('gyro')).length;
    if (gyroCount !== 4) continue;

    // Check for ammo or special equipment in crits
    let hasSpecial = false;
    for (const [, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (!s || typeof s !== 'string') continue;
        const lo = (s as string).toLowerCase();
        if (lo.includes('ammo') && !lo.includes('ammo feed')) { hasSpecial = true; break; }
        if (specialPatterns.test(s as string)) { hasSpecial = true; break; }
      }
      if (hasSpecial) break;
    }
    if (hasSpecial) continue;

    const gap = r.indexBV - r.calculatedBV;
    console.log(`${r.unitId.padEnd(40).slice(0, 40)} ${unit.tonnage}t  MUL=${r.indexBV}  calc=${r.calculatedBV}  gap=${gap} (${(gap/r.calculatedBV*100).toFixed(1)}%)`);
    console.log(`  W=${unit.movement.walk} J=${unit.movement.jump || 0} HS=${unit.heatSinks.count}x${unit.heatSinks.type}`);
    console.log(`  DefBV=${b.defensiveBV.toFixed(1)} OffBV=${b.offensiveBV.toFixed(1)} WBV=${b.weaponBV} SF=${b.speedFactor.toFixed(2)}`);
    console.log(`  Equipment: [${unit.equipment.map((e: any) => e.id).join(', ')}]`);
    console.log('');
  } catch {}
}
