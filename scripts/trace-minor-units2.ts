import * as fs from 'fs';
import * as path from 'path';
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// Show ALL fields for osteon-d
const od = r.allResults.find((x: any) => x.unitId === 'osteon-d');
console.log('=== Osteon-D breakdown ALL fields ===');
console.log(JSON.stringify(od?.breakdown, null, 2));
console.log('referenceBV:', od?.referenceBV);
console.log('indexBV:', od?.indexBV);
console.log('mulBV:', od?.mulBV);

// Check ref BV source
const idxEntry = idx.units.find((u: any) => u.id === 'osteon-d');
console.log('\nIndex entry:', JSON.stringify(idxEntry));

// Read BLK-NT-3B unit data to understand shield
const bkEntry = idx.units.find((u: any) => u.id === 'black-knight-blk-nt-3b');
if (bkEntry?.path) {
  const d = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', bkEntry.path), 'utf8'));
  console.log('\n=== Black Knight BLK-NT-3B ===');
  console.log('Equipment:', d.equipment.map((e: any) => `${e.id}@${e.location}`).join(', '));
  console.log('Tonnage:', d.tonnage);
  // Find shield arm weapons
  for (const loc of Object.keys(d.criticalSlots || {})) {
    const slots: string[] = d.criticalSlots[loc] || [];
    if (slots.some(s => s && s.toLowerCase().includes('shield'))) {
      console.log(`Shield in ${loc}:`, slots.filter(s => s).join(', '));
    }
  }
}

// How many of the 57 "penalty missing" units have ammo?
const minor = r.allResults.filter((x: any) =>
  x.percentDiff > 1 && x.percentDiff <= 5 && x.breakdown && x.breakdown.explosivePenalty === 0
);

// Check which have ammo in equipment
let withAmmo = 0, withoutAmmo = 0;
for (const u of minor) {
  const ie = idx.units.find((e: any) => e.id === u.unitId);
  if (!ie?.path) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));
    const hasAmmo = d.equipment.some((e: any) => e.id.toLowerCase().includes('ammo'));
    if (hasAmmo) withAmmo++;
    else withoutAmmo++;
  } catch {}
}
console.log(`\nOvercalc no-penalty units: ${minor.length}`);
console.log(`  With ammo: ${withAmmo}`);
console.log(`  Without ammo: ${withoutAmmo}`);

// Check which have shields
let withShield = 0;
const shieldUnits: string[] = [];
for (const u of minor) {
  const ie = idx.units.find((e: any) => e.id === u.unitId);
  if (!ie?.path) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));
    const hasShield = d.equipment.some((e: any) => e.id.toLowerCase().includes('shield'));
    if (hasShield) { withShield++; shieldUnits.push(u.unitId); }
  } catch {}
}
console.log(`  With shield: ${withShield} — ${shieldUnits.join(', ')}`);
