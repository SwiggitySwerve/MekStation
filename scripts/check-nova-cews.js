// Check NovaCEWS units and their BV impact
const fs = require('fs');
const path = require('path');
const r = require('../validation-output/bv-validation-report.json');
const idx = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs/index.json'), 'utf8'));
function loadUnit(id) {
  const e = idx.units.find(x => x.id === id);
  if (!e) return null;
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs', e.path), 'utf8')); }
  catch (err) { return null; }
}

const all = r.allResults.filter(u => u.breakdown);
let novaUnits = [];
for (const u of all) {
  const unit = loadUnit(u.unitId);
  if (!unit || !unit.criticalSlots) continue;
  const crits = Object.values(unit.criticalSlots).flat().filter(s => s && typeof s === 'string');
  if (crits.some(s => /nova.?cews/i.test(s))) {
    novaUnits.push({ id: u.unitId, diff: u.difference, pct: u.percentDiff, status: u.status, defEq: u.breakdown.defEquipBV, offEq: u.breakdown.offEquipBV });
  }
}
console.log('Units with NovaCEWS (' + novaUnits.length + '):');
novaUnits.sort((a, b) => a.pct - b.pct);
for (const u of novaUnits) {
  console.log('  ' + u.id.padEnd(45) + 'diff=' + String(u.diff).padStart(5) + ' (' + (u.pct || 0).toFixed(2) + '%) defEq=' + u.defEq + ' ' + u.status);
}

// Check: how many units with regular ECM have defEq issues?
let ecmStats = { total: 0, under: 0, over: 0, exact: 0 };
for (const u of all) {
  const unit = loadUnit(u.unitId);
  if (!unit || !unit.criticalSlots) continue;
  const crits = Object.values(unit.criticalSlots).flat().filter(s => s && typeof s === 'string');
  const hasECM = crits.some(s => /ecm|guardian|angel|watchdog|nova.?cews/i.test(s) && !/ammo/i.test(s));
  if (!hasECM) continue;
  ecmStats.total++;
  if (u.status === 'exact' || u.status === 'within1') ecmStats.exact++;
  else if (u.difference < 0) ecmStats.under++;
  else ecmStats.over++;
}
console.log('\nAll ECM units: total=' + ecmStats.total + ' within1=' + ecmStats.exact + ' under=' + ecmStats.under + ' over=' + ecmStats.over);
