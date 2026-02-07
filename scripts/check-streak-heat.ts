#!/usr/bin/env npx tsx
import { resolveEquipmentBV } from '../src/utils/construction/equipmentBVResolver';

const tests = [
  'clan-streak-srm-6',
  'streak-srm-6',
  'clan-streak-srm-4',
  'streak-srm-4',
  'clan-streak-srm-2',
  'streak-srm-2',
];

for (const t of tests) {
  const r = resolveEquipmentBV(t);
  console.log(`${t.padEnd(25)} -> BV=${String(r.battleValue).padStart(3)}, heat=${r.heat}, resolved=${r.resolved}`);
}
