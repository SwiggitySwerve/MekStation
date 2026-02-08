#!/usr/bin/env npx tsx
/**
 * Find the simplest undercalculated units that do NOT have gyro issues.
 * Score units by simplicity: standard everything, energy only, no special equipment.
 */
import * as fs from 'fs';
import * as path from 'path';

const index = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));
const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

const undercalc = report.allResults.filter((r: any) => {
  const pct = Math.abs(r.percentDiff);
  return pct > 1 && pct <= 5 && r.difference < 0;
});

// Units to skip (known gyro mismatch from fluff)
const gyroMismatchIds = new Set([
  'xanthos-xnt-4o', 'grand-titan-t-it-n13m', 'vanquisher-vqr-5v', 'king-crab-kgc-009',
  'vanquisher-vqr-7v', 'battlemaster-blr-k4', 'albatross-alb-5w-dantalion',
  'atlas-ii-as7-d-h-devlin', 'battlemaster-blr-10s', 'thunderbolt-tdr-17s',
  'ostroc-osr-4k', 'thunderbolt-tdr-11s', 'thunderbolt-tdr-7s', 'thunderbolt-iic-2',
  'griffin-grf-5k', 'hunchback-hbk-5ss', 'vanquisher-vqr-7v-pravuil',
]);

interface SimpleScore {
  id: string;
  score: number; // lower = simpler
  details: string;
  gap: number;
  gapPct: number;
  defBV: number;
  offBV: number;
  weaponBV: number;
  tonnage: number;
  engine: string;
  walk: number;
  jump: number;
}

const scored: SimpleScore[] = [];

for (const r of undercalc) {
  if (gyroMismatchIds.has(r.unitId)) continue;
  const iu = index.units.find((u: any) => u.id === r.unitId);
  if (!iu) continue;

  try {
    const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    if (!unit.criticalSlots) continue;

    let score = 0;
    const details: string[] = [];

    // Penalize for non-standard components
    if (unit.engine.type !== 'FUSION') { score += 1; details.push(unit.engine.type); }
    if (unit.armor.type !== 'STANDARD') { score += 1; details.push(unit.armor.type); }
    if (unit.structure.type !== 'STANDARD') { score += 1; details.push(unit.structure.type); }
    if ((unit.gyro?.type || 'STANDARD') !== 'STANDARD') { score += 2; details.push(unit.gyro.type); }
    if (unit.heatSinks.type !== 'DOUBLE' && unit.heatSinks.type !== 'SINGLE') { score += 1; details.push(unit.heatSinks.type); }
    if (unit.movement.jump > 0) { score += 1; details.push(`JJ=${unit.movement.jump}`); }

    // Check for ammo
    let hasAmmo = false;
    for (const [, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (s && typeof s === 'string' && (s as string).toLowerCase().includes('ammo') && !(s as string).toLowerCase().includes('ammo feed')) {
          hasAmmo = true;
        }
      }
    }
    if (hasAmmo) { score += 2; details.push('ammo'); }

    // Check for special equipment
    const specialEquip: string[] = [];
    for (const [, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (!s || typeof s !== 'string') continue;
        const lo = (s as string).toLowerCase();
        if (lo.includes('supercharger') || lo.includes('masc') || lo.includes('tsm') ||
            lo.includes('targeting computer') || lo.includes('ecm') || lo.includes('probe') ||
            lo.includes('stealth') || lo.includes('null sig') || lo.includes('spike') ||
            lo.includes('aes') || lo.includes('partial wing') || lo.includes('coolant') ||
            lo.includes('harjel') || lo.includes('blue shield') || lo.includes('chameleon')) {
          const clean = (s as string).replace(/\s*\(omnipod\)/gi, '').trim();
          if (!specialEquip.includes(clean)) specialEquip.push(clean);
        }
      }
    }
    if (specialEquip.length > 0) { score += specialEquip.length * 2; details.push(specialEquip.join(',')); }

    // Check for gyro crit count mismatch
    const ctSlots = unit.criticalSlots.CENTER_TORSO;
    if (Array.isArray(ctSlots)) {
      const gyroCount = ctSlots.filter((s: any) => s && typeof s === 'string' && (s as string).toLowerCase().includes('gyro')).length;
      if (gyroCount !== 4) { score += 3; details.push(`gyro×${gyroCount}`); }
    }

    // Number of equipment entries (fewer = simpler)
    score += unit.equipment.length;

    const gap = r.indexBV - r.calculatedBV;
    scored.push({
      id: r.unitId,
      score,
      details: details.join(', ') || 'vanilla',
      gap,
      gapPct: gap / r.calculatedBV * 100,
      defBV: r.breakdown?.defensiveBV ?? 0,
      offBV: r.breakdown?.offensiveBV ?? 0,
      weaponBV: r.breakdown?.weaponBV ?? 0,
      tonnage: unit.tonnage,
      engine: unit.engine.type,
      walk: unit.movement.walk,
      jump: unit.movement.jump || 0,
    });
  } catch {}
}

scored.sort((a, b) => a.score - b.score);

console.log(`=== Simplest Undercalculated Units (no gyro mismatch) ===`);
console.log(`Total: ${scored.length}\n`);
for (const s of scored.slice(0, 30)) {
  console.log(`${s.id.padEnd(40).slice(0, 40)} ${s.tonnage}t  gap=${String(s.gap).padStart(4)} (${s.gapPct.toFixed(1)}%)  def=${s.defBV.toFixed(0)} off=${s.offBV.toFixed(0)} w=${s.weaponBV}  score=${s.score}  [${s.details}]`);
}
