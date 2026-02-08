const fs = require('fs');
const path = require('path');

const unitId = process.argv[2] || 'boreas-d';
const idx = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs/index.json'), 'utf8'));
const entry = idx.units.find(u => u.id === unitId);
if (!entry) { console.log('Unit not found:', unitId); process.exit(1); }

const unitPath = path.join(__dirname, '../public/data/units/battlemechs', entry.path);
const u = JSON.parse(fs.readFileSync(unitPath, 'utf8'));

console.log('=== ' + unitId + ' ===');
console.log('Keys:', Object.keys(u).join(', '));
console.log('Tonnage:', u.tonnage || u.mass);
console.log('Tech:', u.techBase);
console.log('Engine:', u.engine);
console.log('Movement:', JSON.stringify(u.movement));
console.log('Armor type:', u.armorType);
console.log('Structure:', u.structureType);
console.log('Cockpit:', u.cockpit);
console.log('Gyro:', u.gyro);

if (u.criticalSlots) {
  console.log('\nCritical Slots:');
  for (const [loc, slots] of Object.entries(u.criticalSlots)) {
    const items = slots.filter(s => s && s !== '-Empty-');
    if (items.length) console.log('  ' + loc + ': ' + items.join(', '));
  }
}

if (u.equipment) {
  console.log('\nEquipment:', JSON.stringify(u.equipment));
}

if (u.weapons) {
  console.log('\nWeapons:', JSON.stringify(u.weapons));
}
