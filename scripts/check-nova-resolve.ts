import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

// Check NovaCEWS resolution
const novaCEWS = resolveEquipmentBV('NovaCEWS');
console.log('NovaCEWS:', novaCEWS);
console.log('NovaCEWS normalized:', normalizeEquipmentId('NovaCEWS'));

// Check various ECM resolution
const ecms = ['guardian-ecm-suite', 'angel-ecm-suite', 'watchdog-cews', 'novacews', 'Nova CEWS',
  'CLAngelECMSuite', 'CLLaserAntiMissileSystem', 'clan-laser-ams',
  'CLModularArmor', 'modular-armor', 'Mek Null Signature System', 'null-signature-system',
  'Chameleon Light Polarization Shield', 'chameleon-light-polarization-shield',
  'Clan Ferro-Lamellor'];

for (const id of ecms) {
  const res = resolveEquipmentBV(id);
  const norm = normalizeEquipmentId(id);
  console.log(`${id.padEnd(45)} bv=${res.battleValue} heat=${res.heat} resolved=${res.resolved} norm=${norm}`);
}
