#!/usr/bin/env npx tsx
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';
console.warn = () => {};
const tests = ['watchdog-cews', 'Watchdog CEWS', 'angel-ecm', 'guardian-ecm', 'clan-active-probe', 'beagle-active-probe', 'clan-light-active-probe'];
for (const t of tests) {
  const r = resolveEquipmentBV(t);
  const n = normalizeEquipmentId(t);
  console.log(`${t.padEnd(30)} norm=${n.padEnd(25)} BV=${r.battleValue} resolved=${r.resolved}`);
}
