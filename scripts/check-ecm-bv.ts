import * as fs from 'fs';
import * as path from 'path';

// Check equipment BV resolver for ECM, probes, etc.
const { resolveEquipmentBV } = require('../src/utils/construction/equipmentBVResolver');

const equipIds = [
  'CLECMSuite', 'ISECMSuite', 'CLAngelECMSuite', 'ISAngelECMSuite',
  'CLActiveProbe', 'ISActiveProbe', 'BeagleActiveProbe', 'CLLightActiveProbe',
  'CLBloodhoundActiveProbe', 'ISBloodhoundActiveProbe',
  'CLWatchdogCEWS', 'Watchdog CEWS', 'NovaCEWS', 'CLNovaCEWS',
  'Guardian ECM Suite', 'Clan ECM Suite', 'Angel ECM Suite',
  'guardian-ecm-suite', 'clan-ecm-suite', 'angel-ecm-suite',
  'ecm-suite', 'active-probe', 'beagle-active-probe', 'light-active-probe',
  'nova-cews', 'watchdog-cews',
  // Also check TC BV
  'targeting-computer', 'CLTargeting Computer', 'ISTargeting Computer',
];

for (const eid of equipIds) {
  const result = resolveEquipmentBV(eid);
  if (result.battleValue > 0 || result.resolved) {
    console.log(`${eid}: BV=${result.battleValue} resolved=${result.resolved}`);
  }
}

// Read the Osteon D and check ALL crit items and their BV
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));
const ie = idx.units.find((u: any) => u.id === 'osteon-d');
const d = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));

console.log('\n=== Osteon-D Armor Allocation ===');
let totalArmor = 0;
for (const [loc, val] of Object.entries(d.armor.allocation)) {
  if (typeof val === 'number') { totalArmor += val; console.log(`  ${loc}: ${val}`); }
  else { const v = val as any; const sum = (v.front || 0) + (v.rear || 0); totalArmor += sum; console.log(`  ${loc}: front=${v.front || 0} rear=${v.rear || 0} total=${sum}`); }
}
console.log(`Total armor points: ${totalArmor}`);
console.log(`Armor type: ${d.armor.type}`);

console.log('\n=== Osteon-D Crit Slots ===');
for (const [loc, slots] of Object.entries(d.criticalSlots || {})) {
  const items = (slots as string[]).filter(s => s != null);
  console.log(`${loc}: ${items.join(', ')}`);
}

console.log('\n=== Osteon-D Equipment ===');
console.log(JSON.stringify(d.equipment, null, 2));

console.log('\n=== Osteon-D Engine/Heat/Movement ===');
console.log(`Engine: ${d.engine.type} ${d.engine.rating}`);
console.log(`HeatSinks: ${d.heatSinks.type} count=${d.heatSinks.count}`);
console.log(`Movement: walk=${d.movement.walk} jump=${d.movement.jump || 0}`);
console.log(`Structure: ${d.structure.type}`);
console.log(`Cockpit: ${d.cockpit}`);
console.log(`Tonnage: ${d.tonnage}`);
