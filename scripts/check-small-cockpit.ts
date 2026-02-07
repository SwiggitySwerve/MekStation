import * as fs from 'fs';
import * as path from 'path';

const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));
const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

let smallCockpitByField = 0;
let standardCockpitByField = 0;
let smallCockpitByCrit = 0; // HEAD has "Small Cockpit" crit
let mismatch = 0;
const mismatchUnits: string[] = [];

for (const entry of index.units) {
  if (!entry.file) continue;
  try {
    const unitData = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.file), 'utf8'));
    const cockpitField = (unitData.cockpit || 'STANDARD').toUpperCase();
    const isSmallByField = cockpitField.includes('SMALL');

    // Check HEAD crits for "Small Cockpit"
    const headSlots = unitData.criticalSlots?.HEAD;
    let isSmallByCrit = false;
    if (Array.isArray(headSlots)) {
      for (const s of headSlots) {
        if (s && typeof s === 'string' && s.toLowerCase().includes('small cockpit')) {
          isSmallByCrit = true;
          break;
        }
      }
    }

    if (isSmallByField) smallCockpitByField++;
    if (cockpitField === 'STANDARD' || cockpitField === '') standardCockpitByField++;
    if (isSmallByCrit) smallCockpitByCrit++;

    if (isSmallByCrit && !isSmallByField) {
      mismatch++;
      mismatchUnits.push(entry.id);
    }
  } catch { /* skip */ }
}

console.log(`Units with cockpit field containing SMALL: ${smallCockpitByField}`);
console.log(`Units with cockpit field = STANDARD: ${standardCockpitByField}`);
console.log(`Units with "Small Cockpit" in HEAD crits: ${smallCockpitByCrit}`);
console.log(`Mismatch (small in crits, not in field): ${mismatch}`);
if (mismatchUnits.length > 0) {
  console.log('\nMismatched units:');
  for (const u of mismatchUnits.slice(0, 20)) {
    const r = report.allResults.find((x: any) => x.unitId === u);
    if (r) {
      console.log(`  ${u}: indexBV=${r.indexBV} calcBV=${r.calculatedBV} gap=${r.difference} (${r.percentDiff?.toFixed(2)}%)`);
    } else {
      console.log(`  ${u}: not in validation report`);
    }
  }
}

// Also check: how many overcalculated units have cockpit STANDARD but could be small?
// Small cockpit modifier = 0.95, so overcalculation of ~5.26% points to this
const overcalcBySmallCockpit = report.allResults.filter((r: any) => {
  if (!r.difference || r.difference <= 0) return false;
  const pct = r.percentDiff;
  return pct > 4.5 && pct < 6.5; // ~5.26% band
});

console.log(`\nOvercalculated units in 4.5-6.5% band (potential small cockpit): ${overcalcBySmallCockpit.length}`);
for (const r of overcalcBySmallCockpit.slice(0, 10)) {
  console.log(`  ${r.unitId}: gap=${r.difference} (${r.percentDiff?.toFixed(2)}%)`);
}

// More targeted: check all overcalculated units to see if they have "Small Cockpit" in HEAD crits
let smallCockpitOvercalc = 0;
for (const r of report.allResults) {
  if (r.difference <= 0) continue; // skip undercalculated
  const entry = index.units.find((u: any) => u.id === r.unitId);
  if (!entry?.file) continue;
  try {
    const unitData = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.file), 'utf8'));
    const headSlots = unitData.criticalSlots?.HEAD;
    let isSmallByCrit = false;
    if (Array.isArray(headSlots)) {
      for (const s of headSlots) {
        if (s && typeof s === 'string' && s.toLowerCase().includes('small cockpit')) {
          isSmallByCrit = true;
          break;
        }
      }
    }
    const cockpitField = (unitData.cockpit || 'STANDARD').toUpperCase();
    if (isSmallByCrit && !cockpitField.includes('SMALL')) {
      smallCockpitOvercalc++;
    }
  } catch { /* skip */ }
}
console.log(`Overcalculated units with small cockpit in crits but not in field: ${smallCockpitOvercalc}`);
