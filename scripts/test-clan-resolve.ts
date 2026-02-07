/**
 * Test Clan weapon resolution through resolveEquipmentBV and resolveWeaponForUnit.
 */
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

// Test direct resolution of Clan-prefixed IDs
const testIds = [
  'clan-er-large-laser',
  'clan-large-pulse-laser',
  'clan-er-ppc',
  'clan-er-medium-laser',
  'clan-medium-laser',
  'clan-hag-20', 'clan-hag-30', 'clan-hag-40',
  'hag20', 'hag30', 'hag40',
  'clan-lrt-5', 'clan-lrt-15',
  'lrtorpedo5', 'lrtorpedo15',
  'clan-improved-heavy-medium-laser',
  'clan-improved-heavy-large-laser',
  'improved-heavy-medium-laser',
  'improved-heavy-large-laser',
  'iatm-3', 'iatm-6', 'iatm-9', 'iatm-12',
  'iatm3', 'iatm6', 'iatm9', 'iatm12',
  'clan-iatm-3', 'clan-iatm-12',
  'er-large-laser',
  'large-pulse-laser',
  'er-ppc',
];

console.log('=== DIRECT RESOLUTION ===');
for (const id of testIds) {
  const res = resolveEquipmentBV(id);
  const norm = normalizeEquipmentId(id);
  console.log(`  ${id.padEnd(40)} → norm="${norm}" bv=${res.battleValue} heat=${res.heat} ${res.resolved ? 'OK' : 'FAIL'}`);
}

// Now test what resolveWeaponForUnit would try for CLAN units
console.log('\n=== SIMULATING resolveWeaponForUnit FOR CLAN TECH ===');
const clanWeapons = ['er-large-laser', 'large-pulse-laser', 'er-ppc', 'er-medium-laser', 'medium-laser',
  'hag-20', 'hag-30', 'hag-40', 'lrt-5', 'lrt-15', 'iatm-3', 'iatm-12',
  'improved-heavy-medium-laser', 'improved-heavy-large-laser'];

for (const wid of clanWeapons) {
  const isResult = resolveEquipmentBV(wid);
  const normalizedIS = normalizeEquipmentId(wid);
  const candidates: string[] = [];
  if (!normalizedIS.startsWith('clan-')) candidates.push('clan-' + normalizedIS);
  if (wid !== normalizedIS && !wid.startsWith('clan-')) candidates.push('clan-' + wid);

  let clanResult: any = null;
  for (const cid of candidates) {
    const cr = resolveEquipmentBV(cid);
    if (cr.resolved && cr.battleValue > 0) {
      if (!isResult.resolved || cr.battleValue > isResult.battleValue) {
        clanResult = { id: cid, ...cr };
        break;
      }
    }
  }

  console.log(`  ${wid.padEnd(35)} IS: bv=${isResult.battleValue} ${isResult.resolved ? 'OK' : 'FAIL'}`);
  console.log(`    candidates: [${candidates.join(', ')}]`);
  if (clanResult) {
    console.log(`    → CLAN: bv=${clanResult.battleValue} via "${clanResult.id}" (delta=${clanResult.battleValue - isResult.battleValue})`);
  } else {
    console.log(`    → NO CLAN UPGRADE FOUND`);
  }
}
