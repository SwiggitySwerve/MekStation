#!/usr/bin/env npx tsx
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';
console.warn = () => {};

const tests = [
  ['large-pulse-laser', 'CLAN'],
  ['medium-pulse-laser', 'CLAN'],
  ['srm-6', 'CLAN'],
  ['clan-large-pulse-laser', 'CLAN'],
  ['clan-medium-pulse-laser', 'CLAN'],
  ['clan-srm-6', 'CLAN'],
  ['large-pulse-laser', 'IS'],
  ['medium-pulse-laser', 'IS'],
];

for (const [id, tech] of tests) {
  const r = resolveEquipmentBV(id);
  const n = normalizeEquipmentId(id);
  console.log(`${id.padEnd(30)} [${tech}] norm=${n.padEnd(30)} BV=${r.battleValue} heat=${r.heat}`);
}
