/**
 * Test script: Verify weapon resolution for Clan and mixed-tech weapons
 *
 * Tests resolveEquipmentBV and normalizeEquipmentId against a set of
 * weapon IDs commonly found on MIXED and CLAN tech-base units.
 */

import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const TEST_IDS = [
  'er-large-laser',
  'clan-er-large-laser',
  'large-pulse-laser',
  'clan-large-pulse-laser',
  'ultra-ac-20',
  'clan-uac-20',
  'rotary-ac-5',
  'clan-rac-5',
  'hag-20',
  'hag20',
  'lrt-15',
  'clan-lrt-15',
  'srt-4',
  'er-flamer',
  'clan-er-flamer',
  'heavy-small-laser',
  'clan-heavy-small-laser',
  'heavy-large-laser',
  'clan-heavy-large-laser',
  'improved-heavy-small-laser',
  'streak-lrm-15',
  'streak-lrm-20',
  'machine-gun-array',
  'srm-2-i-os',
  'srm-6-i-os',
  'medium-chem-laser',
  'anti-battlearmor-pods-b-pods',
  'm-pod',
  'flamer',
  'clan-flamer',
  'protomech-ac-8',
];

console.log('=== Weapon Resolution Test (CLAN / MIXED units) ===\n');
console.log(
  'ID'.padEnd(38) +
  'Normalized'.padEnd(32) +
  'BV'.padStart(6) +
  'Heat'.padStart(6) +
  '  Resolved'
);
console.log('-'.repeat(95));

let resolvedCount = 0;
let unresolvedCount = 0;

for (const id of TEST_IDS) {
  const normalized = normalizeEquipmentId(id);
  const result = resolveEquipmentBV(id);

  if (result.resolved) {
    resolvedCount++;
  } else {
    unresolvedCount++;
  }

  console.log(
    id.padEnd(38) +
    normalized.padEnd(32) +
    String(result.battleValue).padStart(6) +
    String(result.heat).padStart(6) +
    '  ' +
    (result.resolved ? 'YES' : '** NO **')
  );
}

console.log('-'.repeat(95));
console.log(`\nTotal: ${TEST_IDS.length} | Resolved: ${resolvedCount} | Unresolved: ${unresolvedCount}`);

if (unresolvedCount > 0) {
  console.log('\n*** UNRESOLVED WEAPONS DETECTED ***');
  console.log('The following IDs failed to resolve:\n');
  for (const id of TEST_IDS) {
    const result = resolveEquipmentBV(id);
    if (!result.resolved) {
      const normalized = normalizeEquipmentId(id);
      console.log(`  - "${id}" => normalized to "${normalized}" (not found in catalog)`);
    }
  }
}
