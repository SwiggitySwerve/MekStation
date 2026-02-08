// Find all units with physical weapons not being detected
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

// Known physical weapon crit patterns
const knownPhysical = [
  /^hatchet$/i, /^sword$/i, /^mace$/i, /^lance$/i, /^is lance$/i,
  /^retractable blade/i, /^(is|cl|clan)?claw/i, /^claws$/i, /^talons$/i,
  /^(is )?flail$/i, /^(is )?wrecking ball$/i, /^chain whip$/i,
  /^(is |clan )?buzzsaw$/i, /vibroblade/i
];

// Potential physical weapons we might be missing
const potentialPhysical = [
  { pattern: /dual.?saw/i, name: 'Dual Saw' },
  { pattern: /mining.?drill/i, name: 'Mining Drill' },
  { pattern: /rock.?cutter/i, name: 'Rock Cutter' },
  { pattern: /spot.?welder/i, name: 'Spot Welder' },
  { pattern: /combine/i, name: 'Combine' },
  { pattern: /pile.?driver/i, name: 'Pile Driver' },
  { pattern: /backhoe/i, name: 'Backhoe' },
  { pattern: /salvage.?arm/i, name: 'Salvage Arm' },
];

const all = r.allResults.filter(u => u.breakdown);
const missingPhysWeapons = {};

for (const u of all) {
  const unit = loadUnit(u.unitId);
  if (!unit || !unit.criticalSlots) continue;
  const crits = Object.values(unit.criticalSlots).flat().filter(s => s && typeof s === 'string');

  for (const crit of crits) {
    const lo = crit.toLowerCase().replace(/\s*\(omnipod\)/gi, '').trim();
    // Skip known physical weapons
    if (knownPhysical.some(p => p.test(lo))) continue;

    for (const { pattern, name } of potentialPhysical) {
      if (pattern.test(lo)) {
        if (!missingPhysWeapons[name]) missingPhysWeapons[name] = [];
        if (!missingPhysWeapons[name].find(x => x.id === u.unitId)) {
          missingPhysWeapons[name].push({
            id: u.unitId, diff: u.difference, pct: u.percentDiff, status: u.status,
            physBV: u.breakdown.physicalWeaponBV, tonnage: unit.tonnage
          });
        }
      }
    }
  }
}

for (const [name, units] of Object.entries(missingPhysWeapons)) {
  console.log(`\n=== ${name} (${units.length} units) ===`);
  const outsideThreshold = units.filter(u => u.status !== 'exact' && u.status !== 'within1');
  console.log(`  Outside 1%: ${outsideThreshold.length}`);
  units.sort((a, b) => a.pct - b.pct);
  for (const u of units) {
    const marker = (u.status !== 'exact' && u.status !== 'within1') ? ' ***' : '';
    console.log(`  ${u.id.padEnd(45)} diff=${String(u.diff).padStart(5)} (${(u.pct||0).toFixed(2)}%) phys=${u.physBV} ton=${u.tonnage}${marker}`);
  }
}
