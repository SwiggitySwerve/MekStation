import { resolveEquipmentBV } from '../src/utils/construction/equipmentBVResolver';

const tests = ['ISAPDS', 'isapds', 'risc-apds', 'risc-advanced-point-defense-system', 'ISAngelECMSuite', 'CLActiveProbe', 'CLAntiPersonnelPod', 'ISSmallShield', 'CLTAG', 'CLECMSuite', 'ISMediumShield'];
for (const t of tests) {
  const r = resolveEquipmentBV(t);
  console.log(`${t}: resolved=${r.resolved} bv=${r.battleValue}`);
}
