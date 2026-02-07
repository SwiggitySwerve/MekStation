import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

// Black Knight BLK-NT-3A weapons
const weapons = [
  { id: 'er-medium-laser', loc: 'RIGHT_TORSO' },
  { id: 'er-medium-laser', loc: 'RIGHT_ARM' },
  { id: 'er-medium-laser', loc: 'LEFT_ARM' },
  { id: 'er-medium-laser', loc: 'LEFT_TORSO' },
  { id: 'er-small-laser', loc: 'LEFT_TORSO' },
  { id: 'er-small-laser', loc: 'RIGHT_TORSO' },
  { id: 'er-large-laser', loc: 'LEFT_ARM' },
  { id: 'er-large-laser', loc: 'RIGHT_ARM' },
  { id: 'flamer', loc: 'LEFT_ARM' },
];

let totalBV = 0;
for (const w of weapons) {
  const r = resolveEquipmentBV(w.id);
  const norm = normalizeEquipmentId(w.id);
  console.log(`${w.id.padEnd(20)} loc=${w.loc.padEnd(15)} norm=${norm.padEnd(25)} bv=${String(r.battleValue).padEnd(5)} heat=${r.heat} resolved=${r.resolved}`);
  totalBV += r.battleValue;
}
console.log(`\nTotal weapon BV: ${totalBV}`);
