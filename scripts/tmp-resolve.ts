#!/usr/bin/env npx tsx
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const tests = [
  'er-medium-laser',
  'clan-er-medium-laser',
  'er-large-laser',
  'clan-er-large-laser',
  'er-small-laser',
  'clan-er-small-laser',
  'streak-srm-6',
  'clan-streak-srm-6',
  'ultra-autocannon-5',
  'clan-ultra-autocannon-5',
  'lrm-20',
  'clan-lrm-20',
  'large-pulse-laser',
  'clan-large-pulse-laser',
  'medium-pulse-laser',
  'clan-medium-pulse-laser',
];

for (const id of tests) {
  const res = resolveEquipmentBV(id);
  const norm = normalizeEquipmentId(id);
  console.log(`${id.padEnd(30)} norm=${norm.padEnd(25)} BV=${String(res.battleValue).padStart(4)} Heat=${String(res.heat).padStart(2)} Resolved=${res.resolved}`);
}
