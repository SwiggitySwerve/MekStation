const fs = require('fs');
const path = require('path');

function findJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findJsonFiles(full));
    else if (entry.name.endsWith('.json') && entry.name !== 'index.json') results.push(full);
  }
  return results;
}

const unitDir = 'public/data/units/battlemechs';
const files = findJsonFiles(unitDir);
const missing = [];

for (const f of files) {
  try {
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (data.configuration !== 'Quad') continue;
    const crits = data.criticalSlots || {};
    const hasRearLegs = crits.REAR_LEFT_LEG || crits.REAR_RIGHT_LEG || crits.RearLeftLeg || crits.RearRightLeg;
    const hasFrontLegs = crits.FRONT_LEFT_LEG || crits.FRONT_RIGHT_LEG || crits.FrontLeftLeg || crits.FrontRightLeg;
    if (!hasRearLegs && !hasFrontLegs) {
      missing.push({ file: path.relative(unitDir, f), id: data.id, chassis: data.chassis, model: data.model, tonnage: data.tonnage });
    }
  } catch {}
}

console.log('Quad mechs missing leg data:', missing.length);
missing.sort((a, b) => a.chassis.localeCompare(b.chassis) || a.model.localeCompare(b.model));
for (const m of missing) {
  console.log(`  ${m.chassis} ${m.model} (${m.tonnage}t) - ${m.file}`);
}
