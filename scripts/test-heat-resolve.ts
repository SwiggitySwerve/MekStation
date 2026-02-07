import { resolveEquipmentBV } from '../src/utils/construction/equipmentBVResolver';

const testWeapons = [
  'streak-srm-2', 'streak-srm-4', 'streak-srm-6',
  'clan-streak-srm-2', 'clan-streak-srm-4', 'clan-streak-srm-6',
  'uac-2', 'uac-5', 'uac-10', 'uac-20',
  'clan-uac-2', 'clan-uac-5', 'clan-uac-10', 'clan-uac-20',
  'rac-2', 'rac-5', 'clan-rac-2', 'clan-rac-5',
  'streak-lrm-5', 'streak-lrm-10', 'streak-lrm-15', 'streak-lrm-20',
  'iatm-3', 'iatm-6', 'iatm-9', 'iatm-12',
  'medium-laser', 'er-ppc', 'ppc',
  'thunderbolt-5', 'thunderbolt-10', 'thunderbolt-15', 'thunderbolt-20',
  // Test common crit-slot names
  'isstreaksrm2', 'clstreaksrm4', 'isultraac5', 'clultraac10',
  'isrotaryac5', 'clrotaryac2',
  'streaklrm10', 'clstreaklrm15',
];

console.log('Weapon ID'.padEnd(35) + 'BV'.padStart(5) + '  Heat'.padStart(7) + ' Resolved');
console.log('-'.repeat(60));
for (const id of testWeapons) {
  const r = resolveEquipmentBV(id);
  console.log(id.padEnd(35) + r.battleValue.toString().padStart(5) + r.heat.toFixed(1).padStart(7) + ' ' + (r.resolved ? 'YES' : 'NO'));
}
