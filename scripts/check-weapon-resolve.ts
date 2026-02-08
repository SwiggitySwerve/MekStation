import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';
const tests = ['prototype-lb-10-x-autocannon', 'prototype-ultra-autocannon-10', 'medium-chem-laser', 'heavy-machine-gun'];
for (const t of tests) {
  const r = resolveEquipmentBV(t);
  const n = normalizeEquipmentId(t);
  console.log(t.padEnd(40), 'norm=' + n.padEnd(30), 'bv=' + r.battleValue, 'resolved=' + r.resolved);
}
