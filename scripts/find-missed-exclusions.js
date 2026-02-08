// Find units that should be excluded from BV validation but aren't
const fs = require('fs');
const path = require('path');
const r = require('../validation-output/bv-validation-report.json');
const idx = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs/index.json'), 'utf8'));

function loadUnit(id) {
  const entry = idx.units.find(x => x.id === id);
  if (!entry) return null;
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs', entry.path), 'utf8')); }
  catch (e) { return null; }
}

// Check ALL validated units for Blue Shield in crits
let blueShieldInCrits = [];
let commandConsoleUnits = [];
let partialWingUnits = [];
let remSensorUnits = [];
let mineDispenserUnits = [];

for (const u of r.allResults) {
  const unit = loadUnit(u.unitId);
  if (!unit || !unit.criticalSlots) continue;
  const crits = Object.values(unit.criticalSlots).flat().filter(s => s && typeof s === 'string');

  const hasBlueShield = crits.some(s => /blue.?shield/i.test(s));
  const hasCommandConsole = crits.some(s => /command.?console/i.test(s));
  const hasPartialWing = crits.some(s => /partial.?wing/i.test(s));
  const hasRemSensor = crits.some(s => /remote.?sensor/i.test(s));
  const hasMineDisp = crits.some(s => /mine.?dispenser/i.test(s));

  if (hasBlueShield) {
    blueShieldInCrits.push({ id: u.unitId, diff: u.difference, pct: u.percentDiff, status: u.status });
  }
  if (hasCommandConsole) {
    commandConsoleUnits.push({ id: u.unitId, diff: u.difference, pct: u.percentDiff, status: u.status,
      cockpit: u.breakdown?.cockpitType });
  }
  if (hasPartialWing && u.status !== 'exact' && u.status !== 'within1') {
    partialWingUnits.push({ id: u.unitId, diff: u.difference, pct: u.percentDiff, status: u.status });
  }
  if (hasRemSensor && u.status !== 'exact' && u.status !== 'within1') {
    remSensorUnits.push({ id: u.unitId, diff: u.difference, pct: u.percentDiff, status: u.status });
  }
  if (hasMineDisp && u.status !== 'exact' && u.status !== 'within1') {
    mineDispenserUnits.push({ id: u.unitId, diff: u.difference, pct: u.percentDiff, status: u.status });
  }
}

console.log('=== Blue Shield units in validated set ===');
for (const u of blueShieldInCrits) {
  console.log(`  ${u.id.padEnd(45)} diff=${String(u.diff).padStart(5)} (${(u.pct||0).toFixed(2)}%) ${u.status}`);
}
console.log(`Total: ${blueShieldInCrits.length}\n`);

console.log('=== Command Console units ===');
for (const u of commandConsoleUnits) {
  console.log(`  ${u.id.padEnd(45)} diff=${String(u.diff).padStart(5)} (${(u.pct||0).toFixed(2)}%) ${u.status} cockpit=${u.cockpit}`);
}
console.log(`Total: ${commandConsoleUnits.length}\n`);

console.log('=== Partial Wing outlier units ===');
for (const u of partialWingUnits) {
  console.log(`  ${u.id.padEnd(45)} diff=${String(u.diff).padStart(5)} (${(u.pct||0).toFixed(2)}%) ${u.status}`);
}
console.log(`Total: ${partialWingUnits.length}\n`);

console.log('=== Remote Sensor Dispenser outlier units ===');
for (const u of remSensorUnits) {
  console.log(`  ${u.id.padEnd(45)} diff=${String(u.diff).padStart(5)} (${(u.pct||0).toFixed(2)}%) ${u.status}`);
}

console.log('=== Mine Dispenser outlier units ===');
for (const u of mineDispenserUnits) {
  console.log(`  ${u.id.padEnd(45)} diff=${String(u.diff).padStart(5)} (${(u.pct||0).toFixed(2)}%) ${u.status}`);
}
