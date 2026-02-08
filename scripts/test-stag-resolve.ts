import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const ids = ['iseherppc', 'ismediumlaser', 'ismediumpulselaser', 'issmalllaser', 'enhanced-ppc', 'ISEHERPPC', '1-iseherppc'];
for (const id of ids) {
  const stripped = id.replace(/^\d+-/, '');
  const r = resolveEquipmentBV(stripped);
  console.log(`${id.padEnd(25)} → stripped=${stripped.padEnd(20)} norm=${normalizeEquipmentId(stripped).padEnd(25)} resolved=${r.resolved} bv=${r.battleValue}`);
}
