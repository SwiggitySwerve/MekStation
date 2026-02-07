#!/usr/bin/env npx tsx
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';
const tests = ['medium-pulse-laser', 'lrm-20', 'streak-srm-4', 'er-large-laser', 'small-pulse-laser', 'er-medium-laser', 'lrm-15', 'streak-srm-6', 'rotary-ac-2'];
for (const t of tests) {
  const norm = normalizeEquipmentId(t);
  const isRes = resolveEquipmentBV(t);
  const clanRes = resolveEquipmentBV('clan-' + norm);
  console.log(`${t.padEnd(25)} norm=${norm.padEnd(25)} IS=${isRes.battleValue} Clan=${clanRes.battleValue} diff=${clanRes.battleValue - isRes.battleValue}`);
}
