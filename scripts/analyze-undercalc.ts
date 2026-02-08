#!/usr/bin/env npx tsx
/**
 * Analyze energy-only undercalculated units to find systematic issues.
 * Focus on units with NO ammo at all - simplest case.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const results: any[] = JSON.parse(fs.readFileSync('./validation-output/bv-all-results.json', 'utf-8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
const basePath = 'public/data/units/battlemechs';

// Energy-only units that are 1-5% undercalculated
const under = results.filter(r => r.pct < -1 && r.pct >= -5 && (r.ammoBV || 0) === 0);

console.log(`Energy-only undercalculated units (1-5%): ${under.length}`);
console.log('\nDetailed analysis:');

for (const r of under.slice(0, 25)) {
  const iu = idx.units.find((u: any) => `${u.chassis} ${u.model}` === r.name);
  if (!iu) continue;
  let ud: any;
  try { ud = JSON.parse(fs.readFileSync(path.join(basePath, iu.path), 'utf-8')); } catch { continue; }

  const gap = r.ref - r.calc;
  const gapPreSF = gap / r.sf;

  // Check if any equipment is being filtered out
  const allEquip = ud.equipment || [];
  const crits = ud.criticalSlots || {};
  const allCrits = Object.values(crits).flat().filter((s): s is string => !!s && typeof s === 'string');

  // Check for flamer (which is a weapon but some might be filtered)
  const hasFlamer = allCrits.some((s: string) => s.toLowerCase().includes('flamer'));
  const hasTag = allEquip.some((eq: any) => eq.id.toLowerCase().includes('tag'));
  const hasNarc = allEquip.some((eq: any) => eq.id.toLowerCase().includes('narc'));

  // Count weapons in equipment list
  const weaponEquip = allEquip.filter((eq: any) => {
    const lo = eq.id.toLowerCase();
    return !lo.includes('ammo') && !lo.includes('heatsink') && !lo.includes('heat-sink') &&
           !lo.includes('case') && !lo.includes('endo') && !lo.includes('ferro') &&
           !lo.includes('artemis') && !lo.includes('targeting') && !lo.includes('ecm') &&
           !lo.includes('bap') && !lo.includes('probe') && !lo.includes('c3') &&
           !lo.includes('masc') && !lo.includes('tsm') && !lo.includes('jump') &&
           !lo.includes('tag') && !lo.includes('shield') && !lo.includes('pod') &&
           !lo.includes('harjel') && !lo.includes('coolant') && !lo.includes('supercharger') &&
           !lo.includes('null-sig') && !lo.includes('chameleon') && !lo.includes('blue-shield') &&
           !lo.includes('umu') && !lo.includes('cargo') && !lo.includes('searchlight') &&
           !lo.includes('improved-sensors') && !lo.includes('partial-wing') && !lo.includes('tracks');
  });

  // Try to resolve each weapon
  let totalWeapBV = 0;
  const weaponDetails: string[] = [];
  for (const eq of weaponEquip) {
    const lo = eq.id.toLowerCase();
    let res = resolveEquipmentBV(eq.id);
    // Try Clan resolution
    if (ud.techBase === 'CLAN' || ud.techBase === 'MIXED') {
      const norm = normalizeEquipmentId(lo);
      const clanRes = resolveEquipmentBV('clan-' + norm);
      if (clanRes.resolved && clanRes.battleValue > res.battleValue) res = clanRes;
    }
    totalWeapBV += res.battleValue;
    if (!res.resolved || res.battleValue === 0) {
      weaponDetails.push(`  UNRESOLVED: "${eq.id}"`);
    }
  }

  // Count weapons in critical slots (non-equipment path)
  const critWeapons = allCrits.filter((s: string) => {
    const lo = s.toLowerCase();
    return !lo.includes('ammo') && !lo.includes('heat sink') && !lo.includes('double heat') &&
           !lo.includes('engine') && !lo.includes('gyro') && !lo.includes('actuator') &&
           !lo.includes('shoulder') && !lo.includes('hip') && !lo.includes('life support') &&
           !lo.includes('sensors') && !lo.includes('cockpit') && !lo.includes('endo') &&
           !lo.includes('ferro') && !lo.includes('case') && !lo.includes('jump') &&
           !lo.includes('artemis') && !lo.includes('targeting') && !lo.includes('ecm') &&
           !lo.includes('bap') && !lo.includes('probe') && !lo.includes('tsm') &&
           !lo.includes('masc') && !lo.includes('c3') && !lo.includes('tag') &&
           !lo.includes('narc') && !lo.includes('ams') && !lo.includes('anti-missile') &&
           !lo.includes('shield') && !lo.includes('ballistic-reinforced') &&
           !lo.includes('reactive') && !lo.includes('reflective') && !lo.includes('stealth') &&
           !lo.includes('harjel') && !lo.includes('coolant') && !lo.includes('supercharger') &&
           !lo.includes('null-sig') && !lo.includes('chameleon') && !lo.includes('blue-shield') &&
           !lo.includes('partial-wing') && !lo.includes('hand') && !lo.includes('foot') &&
           !lo.includes('omnipod') && lo.length > 2;
  });

  console.log(`\n  ${r.name.padEnd(40)} ref=${r.ref} calc=${r.calc} gap=${gap} gapPreSF=${gapPreSF.toFixed(0)} SF=${r.sf}`);
  console.log(`    Tech: ${ud.techBase} | ${weaponEquip.length} equip weapons | totalWeapBV=${totalWeapBV}`);
  if (weaponDetails.length > 0) for (const d of weaponDetails) console.log(`    ${d}`);
  if (hasFlamer) console.log('    Has flamer');
  if (hasTag) console.log('    Has TAG');
  if (hasNarc) console.log('    Has NARC');
}
