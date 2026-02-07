import * as fs from 'fs';
import * as path from 'path';

const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

const cockpitCounts: Record<string, number> = {};
let noCockpitField = 0;

for (const entry of index.units) {
  if (!entry.file) continue;
  try {
    const unitData = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.file), 'utf8'));
    const cockpit = unitData.cockpit || '<missing>';
    cockpitCounts[cockpit] = (cockpitCounts[cockpit] || 0) + 1;
    if (!unitData.cockpit) noCockpitField++;
  } catch { /* skip */ }
}

console.log('=== COCKPIT FIELD VALUES ===');
for (const [val, count] of Object.entries(cockpitCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${val}: ${count}`);
}
console.log(`\nUnits with no cockpit field: ${noCockpitField}`);

// Also check HEAD crit slot contents
const headCritCounts: Record<string, number> = {};
for (const entry of index.units) {
  if (!entry.file) continue;
  try {
    const unitData = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.file), 'utf8'));
    const headSlots = unitData.criticalSlots?.HEAD;
    if (Array.isArray(headSlots)) {
      for (const s of headSlots) {
        if (s && typeof s === 'string') {
          headCritCounts[s] = (headCritCounts[s] || 0) + 1;
        }
      }
    }
  } catch { /* skip */ }
}

console.log('\n=== HEAD CRIT SLOT VALUES (top 20) ===');
for (const [val, count] of Object.entries(headCritCounts).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  console.log(`  ${val}: ${count}`);
}
