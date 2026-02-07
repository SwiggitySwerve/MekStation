import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const shields = ['ISMediumShield', 'ISLargeShield', 'ISSmallShield', 'medium-shield', 'large-shield', 'small-shield'];
for (const s of shields) {
  const norm = normalizeEquipmentId(s);
  const r = resolveEquipmentBV(s);
  console.log(`${s.padEnd(25)} norm=${norm.padEnd(20)} bv=${String(r.battleValue).padEnd(5)} heat=${r.heat} resolved=${r.resolved}`);
}
