/**
 * Deep trace of the biggest undercalculated units (5%+) to find fixable patterns.
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

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null && x.breakdown);
const big = valid.filter((x: any) => x.percentDiff < -5).sort((a: any, b: any) => a.percentDiff - b.percentDiff);

console.log(`=== UNDERCALCULATED 5%+ (${big.length} units) ===\n`);

// Classify by pattern
const patterns: Record<string, string[]> = {};

for (const u of big) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;

  // Check unresolved weapons
  const unresolvedWeapons: string[] = [];
  for (const eq of (unit.equipment || [])) {
    if (eq.id.toLowerCase().includes('ammo') || eq.id.toLowerCase().includes('targeting-computer') ||
        eq.id.toLowerCase().includes('heat-sink') || eq.id.toLowerCase().includes('case') ||
        eq.id.toLowerCase().includes('tsm') || eq.id.toLowerCase().includes('jump-jet') ||
        eq.id.toLowerCase().includes('masc') || eq.id.toLowerCase().includes('ecm') ||
        eq.id.toLowerCase().includes('probe') || eq.id.toLowerCase().includes('c3')) continue;
    const res = resolveEquipmentBV(eq.id);
    if (!res.resolved || res.battleValue === 0) unresolvedWeapons.push(`${eq.id}(bv=${res.battleValue})`);
  }

  // Check for specific patterns
  const tags: string[] = [];
  if (unit.techBase === 'CLAN') tags.push('clan');
  else if (unit.techBase === 'MIXED') tags.push('mixed');
  else tags.push('IS');
  if (b.halvedWeaponCount > b.weaponCount / 2) tags.push('many-halved');
  if (b.weaponCount > 0 && b.weaponBV === 0) tags.push('zero-weapon-bv');
  if (unresolvedWeapons.length > 0) tags.push('unresolved-weapons');
  if (b.ammoBV === 0 && b.weaponCount > 2) tags.push('zero-ammo-maybe');
  if ((b.heatEfficiency ?? 0) < 10) tags.push('low-heat-eff');

  // Check if all weapons are energy (no ammo expected)
  const weapons = (unit.equipment || []).filter((eq: any) => {
    const lo = eq.id.toLowerCase();
    return !lo.includes('ammo') && !lo.includes('targeting') && !lo.includes('heat-sink') &&
           !lo.includes('case') && !lo.includes('tsm') && !lo.includes('jump') &&
           !lo.includes('masc') && !lo.includes('ecm') && !lo.includes('probe') &&
           !lo.includes('c3') && !lo.includes('sword') && !lo.includes('hatchet') &&
           !lo.includes('shield') && resolveEquipmentBV(lo).resolved;
  });
  const hasBallisticOrMissile = weapons.some((w: any) => {
    const lo = w.id.toLowerCase();
    return lo.includes('ac') || lo.includes('gauss') || lo.includes('lrm') || lo.includes('srm') ||
           lo.includes('mml') || lo.includes('atm') || lo.includes('mg') || lo.includes('rl') ||
           lo.includes('mrm');
  });
  if (!hasBallisticOrMissile && weapons.length > 0) tags.push('all-energy');

  for (const t of tags) {
    if (!patterns[t]) patterns[t] = [];
    patterns[t].push(u.unitId);
  }

  console.log(`${u.unitId.padEnd(42)} ${u.percentDiff.toFixed(1)}% diff=${u.difference} tech=${unit.techBase}`);
  console.log(`  DEF: ${b.defensiveBV?.toFixed(0)}  OFF: ${b.offensiveBV?.toFixed(0)}  weap=${b.weaponBV?.toFixed(0)} ammo=${b.ammoBV} HE=${b.heatEfficiency} halved=${b.halvedWeaponCount}/${b.weaponCount}`);
  if (unresolvedWeapons.length > 0) console.log(`  UNRESOLVED: ${unresolvedWeapons.join(', ')}`);
}

console.log('\n=== PATTERN SUMMARY ===');
for (const [k, v] of Object.entries(patterns).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${k}: ${v.length} units`);
}
