import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const tests = [
  'mech-mortar-8', 'clan-mech-mortar-8', 'CLMekMortar8', 'ISMekMortar8', 'mortar-8',
  'ISElectronicWarfareEquipment', 'electronicwarfare', 'electronic-warfare-equipment',
  'vehicular-mine-dispenser', 'ISVehicularMineDispenser', 'VehicularMineDispenser',
  'ISBloodhoundActiveProbe', 'bloodhound-active-probe',
  'Clan Mech Mortar/8', 'ClanMechMortar8',
];
for (const id of tests) {
  const stripped = id.replace(/^\d+-/, '');
  const norm = normalizeEquipmentId(stripped);
  const r = resolveEquipmentBV(stripped);
  console.log(`${id.padEnd(40)} norm=${norm.padEnd(30)} bv=${String(r.battleValue).padEnd(5)} heat=${r.heat} resolved=${r.resolved}`);
}
