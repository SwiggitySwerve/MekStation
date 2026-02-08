#!/usr/bin/env npx tsx
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';
const tests = [
  'er-medium-pulse-laser', 'er-large-pulse-laser', 'er-small-pulse-laser',
  'clan-er-medium-pulse-laser', 'clan-er-large-pulse-laser', 'clan-er-small-pulse-laser',
  'improved-heavy-medium-laser', 'improved-heavy-large-laser', 'improved-heavy-small-laser',
  'rotary-ac-5', 'rotary-ac-2',
  'clan-rotary-ac-5', 'clan-rotary-ac-2',
];
for (const t of tests) {
  const norm = normalizeEquipmentId(t);
  const res = resolveEquipmentBV(t);
  console.log(`${t.padEnd(35)} norm=${norm.padEnd(30)} BV=${res.battleValue} resolved=${res.resolved}`);
}
