/**
 * Check 5%+ undercalculated units for fixable issues.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV } from '../src/utils/construction/equipmentBVResolver';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null && x.breakdown);
const under5plus = valid.filter((x: any) => x.percentDiff < -5);

console.log(`=== 5%+ UNDERCALCULATED (${under5plus.length} units) ===\n`);

// Categorize issues
const categories: Record<string, any[]> = {
  zeroWeapon: [],
  zeroAmmo: [],
  unresolved: [],
  missingDefEquip: [],
  dataIssue: [],
  unknown: [],
};

for (const u of under5plus.sort((a: any, b: any) => a.percentDiff - b.percentDiff)) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;

  // Check for issues
  const unresolvedW: string[] = [];
  for (const eq of (unit.equipment || [])) {
    const res = resolveEquipmentBV(eq.id);
    if (!res.resolved && !eq.id.includes('targeting-computer') && !eq.id.includes('tsm')) {
      unresolvedW.push(eq.id);
    }
  }

  // Check for missing ammo in units with ammo-using weapons
  const hasAmmoWeapons = (unit.equipment || []).some((eq: any) => {
    const lo = eq.id.toLowerCase();
    return lo.includes('gauss') || lo.includes('lrm') || lo.includes('srm') || lo.includes('ac/') ||
           lo.includes('ac-') || lo.includes('ultra-ac') || lo.includes('lb-') || lo.includes('mml') ||
           lo.includes('atm') || lo.includes('lrt') || lo.includes('srt');
  });

  // Check crits for ammo
  let hasAmmoInCrits = false;
  if (unit.criticalSlots) {
    for (const [, slots] of Object.entries(unit.criticalSlots)) {
      if (Array.isArray(slots)) for (const s of slots as string[]) {
        if (s && s.toLowerCase().includes('ammo') && !s.toLowerCase().includes('ammo feed')) {
          hasAmmoInCrits = true;
        }
      }
    }
  }

  const tags: string[] = [];
  if (unit.techBase === 'CLAN') tags.push('clan');
  else if (unit.techBase === 'MIXED') tags.push('mixed');
  else tags.push('IS');
  if (b.weaponBV === 0 || (b.weaponBV && b.weaponBV < 10)) tags.push('ZERO-WEAP');
  if (hasAmmoWeapons && b.ammoBV === 0 && !hasAmmoInCrits) tags.push('NO-AMMO-DATA');
  if (hasAmmoWeapons && b.ammoBV === 0 && hasAmmoInCrits) tags.push('AMMO-UNRESOLVED');
  if (unresolvedW.length > 0) tags.push(`UNRESOLVED(${unresolvedW.join(',')})`);

  console.log(`  ${u.unitId.padEnd(42)} ${u.percentDiff.toFixed(1)}% diff=${u.difference} weap=${b.weaponBV?.toFixed(0)} ammo=${b.ammoBV} defEq=${b.defEquipBV?.toFixed(0)} SF=${b.speedFactor} [${tags.join(',')}]`);
}
