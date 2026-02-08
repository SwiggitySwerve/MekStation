// Find units that have quad armor locations but non-quad configuration
const fs = require('fs');
const path = require('path');

const idx = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs/index.json'), 'utf8'));
const report = require('../validation-output/bv-validation-report.json');

const quadLocIndicators = ['FLL', 'FRL', 'RLL', 'RRL', 'FRONT_LEFT_LEG', 'FRONT_RIGHT_LEG', 'REAR_LEFT_LEG', 'REAR_RIGHT_LEG'];

let misconfigs = [];
let correctQuads = [];

for (const entry of idx.units) {
  const unitPath = path.join(__dirname, '../public/data/units/battlemechs', entry.path);
  try {
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    const armorKeys = unit.armor?.allocation ? Object.keys(unit.armor.allocation) : [];
    const hasQuadLocs = armorKeys.some(k => quadLocIndicators.includes(k.toUpperCase()));
    const critKeys = unit.criticalSlots ? Object.keys(unit.criticalSlots) : [];
    const hasQuadCrits = critKeys.some(k => quadLocIndicators.includes(k.toUpperCase()));

    const isDataQuad = hasQuadLocs || hasQuadCrits;
    const configQuad = unit.configuration?.toLowerCase() === 'quad';

    if (isDataQuad && !configQuad) {
      const r = report.allResults.find(x => x.unitId === entry.id);
      misconfigs.push({
        id: entry.id,
        config: unit.configuration,
        tonnage: unit.tonnage,
        diff: r ? r.difference : 'N/A',
        pct: r ? r.percentDiff?.toFixed(2) : 'N/A',
        status: r ? r.status : 'excluded'
      });
    }
    if (isDataQuad && configQuad) {
      correctQuads.push(entry.id);
    }
  } catch (e) { /* skip */ }
}

console.log(`=== Misconfigured Quads (data=quad, config!=quad): ${misconfigs.length} ===`);
for (const m of misconfigs) {
  console.log(`  ${m.id.padEnd(40)} config="${m.config}" tonnage=${m.tonnage} diff=${m.diff} (${m.pct}%) ${m.status}`);
}

console.log(`\n=== Correctly configured Quads: ${correctQuads.length} ===`);
for (const q of correctQuads) {
  console.log(`  ${q}`);
}
