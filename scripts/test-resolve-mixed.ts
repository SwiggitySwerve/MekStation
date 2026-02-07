import { normalizeEquipmentId, resolveEquipmentBV } from '../src/utils/construction/equipmentBVResolver';

const ids = ['ultra-ac-20', 'lrm-20', 'streak-srm-6', 'er-medium-laser', 'er-ppc', 'small-pulse-laser', 'er-flamer', 'medium-laser', 'mech-mortar-4'];
for (const id of ids) {
  const norm = normalizeEquipmentId(id);
  const isRes = resolveEquipmentBV(id);
  const clanRes = resolveEquipmentBV('clan-' + norm);
  const clanRes2 = resolveEquipmentBV('clan-' + id);
  console.log(`${id} → norm:${norm} → IS: bv=${isRes.battleValue} heat=${isRes.heat} (${isRes.resolved?'OK':'MISS'}) → Clan(norm): bv=${clanRes.battleValue} (${clanRes.resolved?'OK':'MISS'}) → Clan(raw): bv=${clanRes2.battleValue} (${clanRes2.resolved?'OK':'MISS'})`);
}
