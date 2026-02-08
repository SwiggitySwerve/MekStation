#!/usr/bin/env npx tsx
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';
console.warn = () => {};

const ids = ['ams', 'ISAntiMissileSystem', 'BeagleActiveProbe', 'beagle-active-probe'];
for (const id of ids) {
  const r = resolveEquipmentBV(id);
  const n = normalizeEquipmentId(id);
  const dedup = id.toLowerCase().replace(/^\d+-/, '').replace(/^(?:is|cl|clan)\s*/i, '').replace(/[^a-z0-9]/g, '');
  console.log(`${id.padEnd(30)} norm=${n.padEnd(25)} dedup="${dedup}" BV=${r.battleValue} resolved=${r.resolved}`);
}
