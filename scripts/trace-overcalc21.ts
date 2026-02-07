import * as fs from 'fs';
import * as path from 'path';

const data = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const mulCache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf8'));
const indexData = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// Get exact 1.0527 units with 2 Life Support (the 4 outliers)
const exactFive = data.allResults.filter((d: any) => {
  if (d.difference <= 0) return false;
  const entry = mulCache.entries?.[d.unitId];
  if (!entry || entry.mulBV <= 0 || entry.matchType !== 'exact') return false;
  const ratio = d.calculatedBV / d.indexBV;
  return ratio >= 1.051 && ratio <= 1.054;
});

console.log('=== 4 OUTLIER UNITS (exact 1.0527 ratio, 2 Life Support) ===');
for (const d of exactFive) {
  const iu = indexData.units.find((u: any) => u.id === d.unitId);
  if (!iu) continue;
  const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
  const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
  const headSlots = (unit.criticalSlots?.HEAD || []) as (string | null)[];
  const lifeSupCount = headSlots.filter(s => s && s.toLowerCase().includes('life support')).length;

  if (lifeSupCount === 2) {
    console.log(`\n${d.unitId}: calc=${d.calculatedBV} ref=${d.indexBV} ratio=${(d.calculatedBV/d.indexBV).toFixed(4)}`);
    console.log(`  cockpit: ${unit.cockpit}`);
    console.log(`  HEAD: [${headSlots.join(', ')}]`);
    console.log(`  techBase: ${unit.techBase}`);
    console.log(`  tonnage: ${unit.tonnage}`);
    console.log(`  engine: ${unit.engine.type}`);

    // Check all crits for "small cockpit" entries
    const allCrits: string[] = Object.values(unit.criticalSlots || {}).flat().filter((s: any) => s) as string[];
    const critsLo = allCrits.map(s => (s as string).toLowerCase());
    const hasSmallCockpit = critsLo.some(s => s.includes('small cockpit'));
    console.log(`  Has 'small cockpit' in crits: ${hasSmallCockpit}`);
    console.log(`  Fluff has 'small cockpit': ${JSON.stringify(unit.fluff || {}).toLowerCase().includes('small cockpit')}`);

    // Check for other cockpit types
    const hasTorsoMounted = critsLo.some(s => s.includes('torso-mounted') || s.includes('torsocockpit'));
    console.log(`  Has torso-mounted: ${hasTorsoMounted}`);

    // Dump all head crit details
    console.log(`  All crits in HEAD:`);
    for (let i = 0; i < headSlots.length; i++) {
      console.log(`    slot ${i}: ${headSlots[i]}`);
    }
  }
}

// Now also count: how many units in the ENTIRE dataset have mislabeled small cockpits?
console.log('\n\n=== TOTAL MISLABELED SMALL COCKPITS IN DATASET ===');
let totalMislabeled = 0;
let totalCorrectSmall = 0;
let totalStdWith2LS = 0;

for (const iu of indexData.units) {
  try {
    const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    const headSlots = (unit.criticalSlots?.HEAD || []) as (string | null)[];
    const lifeSupCount = headSlots.filter(s => s && s.toLowerCase().includes('life support')).length;
    const cockpit = (unit.cockpit || 'STANDARD').toUpperCase();

    if (lifeSupCount === 1 && !cockpit.includes('SMALL') && !cockpit.includes('TORSO') && !cockpit.includes('INTERFACE') && !cockpit.includes('DRONE')) {
      totalMislabeled++;
    }
    if (cockpit.includes('SMALL')) totalCorrectSmall++;
    if (cockpit === 'STANDARD' && lifeSupCount === 2) totalStdWith2LS++;
  } catch {}
}

console.log('Mislabeled small cockpits (1 Life Support, cockpit=STANDARD):', totalMislabeled);
console.log('Correctly labeled SMALL cockpits:', totalCorrectSmall);
console.log('Standard cockpits with 2 Life Support (correct):', totalStdWith2LS);
