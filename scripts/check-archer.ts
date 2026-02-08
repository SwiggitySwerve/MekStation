import * as fs from 'fs';
import * as path from 'path';
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));
const ie = idx.units.find((e: any) => e.id === 'archer-arc-6w');
const unit = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));
console.log('Armor:', JSON.stringify(unit.armor));
console.log('Engine:', unit.engine);
console.log('Structure:', unit.structure);
console.log('Cockpit:', unit.cockpit);
console.log('Gyro:', unit.gyro);
console.log('Movement:', unit.movement);
console.log('HeatSinks:', unit.heatSinks);
let total = 0;
for (const [k,v] of Object.entries(unit.armor.allocation)) {
  if (typeof v === 'number') total += v as number;
  else if (v && typeof v === 'object') total += ((v as any).front || 0) + ((v as any).rear || 0);
}
console.log('Total armor:', total);
console.log('Equipment:', (unit.equipment || []).map((e: any) => e.id + '@' + e.location).join(', '));
// List all crit slots
for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
  const filtered = (slots as any[]).filter((s: any) => s && typeof s === 'string' && !['Shoulder', 'Upper Arm Actuator', 'Lower Arm Actuator', 'Hand Actuator', 'Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator', 'Life Support', 'Sensors', 'Cockpit', 'Gyro', 'Fusion Engine'].includes(s));
  if (filtered.length > 0) console.log(`  [${loc}] ${filtered.join(', ')}`);
}
