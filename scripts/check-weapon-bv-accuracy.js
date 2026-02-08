// Check most common weapons in near-threshold units and verify their BV values
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

// Load weapon catalogs
const weaponDir = path.join(__dirname, '../public/data/equipment/official/weapons');
const weaponCatalog = {};
for (const f of fs.readdirSync(weaponDir)) {
  if (!f.endsWith('.json')) continue;
  try {
    const data = JSON.parse(fs.readFileSync(path.join(weaponDir, f), 'utf8'));
    for (const item of (data.items || [])) {
      weaponCatalog[item.id] = { name: item.name, bv: item.bv, heat: item.heat, file: f };
    }
  } catch(e) {}
}

// For near-threshold under units, find most common weapons
const under = r.allResults.filter(u => u.percentDiff < -1.0 && u.percentDiff > -3.0 && u.breakdown);
const weaponCounts = {};
for (const u of under) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  for (const eq of (unit.equipment || [])) {
    const cat = weaponCatalog[eq.id];
    if (cat) {
      const key = eq.id;
      if (!weaponCounts[key]) weaponCounts[key] = { count: 0, name: cat.name, bv: cat.bv, heat: cat.heat };
      weaponCounts[key].count++;
    }
  }
}

console.log('=== Most common weapons in undercalculated near-threshold units ===');
const sorted = Object.entries(weaponCounts).sort((a, b) => b[1].count - a[1].count).slice(0, 25);
for (const [id, info] of sorted) {
  console.log(`  ${id.padEnd(35)} ${String(info.count).padStart(3)}x  BV=${String(info.bv).padStart(4)}  Heat=${info.heat}  (${info.name})`);
}

// MegaMek reference BV values for common weapons (verified from MegaMek source/wiki)
const MEGAMEK_REFERENCE = {
  'er-medium-laser': { bv_is: 62, bv_clan: 108 },
  'medium-laser': { bv_is: 46, bv_clan: 46 },
  'er-large-laser': { bv_is: 163, bv_clan: 248 },
  'large-pulse-laser': { bv_is: 119, bv_clan: 265 },
  'streak-srm-6': { bv_is: 89, bv_clan: 89 },
  'streak-srm-4': { bv_is: 59, bv_clan: 59 },
  'streak-srm-2': { bv_is: 30, bv_clan: 30 },
  'er-small-laser': { bv_is: 17, bv_clan: 31 },
  'ultra-ac-5': { bv_is: 112, bv_clan: 112 },
  'ultra-ac-10': { bv_is: 210, bv_clan: 210 },
  'medium-pulse-laser': { bv_is: 48, bv_clan: 111 },
  'lrm-20': { bv_is: 220, bv_clan: 220 },
  'srm-6': { bv_is: 59, bv_clan: 59 },
  'gauss-rifle': { bv_is: 320, bv_clan: 320 },
  'er-flamer': { bv_is: 16, bv_clan: 16 },
  'plasma-rifle': { bv_is: 210, bv_clan: 210 },
  'lbx-ac-10': { bv_is: 148, bv_clan: 148 },
  'rotary-ac-2': { bv_is: 118, bv_clan: 118 },
};

console.log('\n=== BV comparison against MegaMek reference ===');
for (const [id, megamek] of Object.entries(MEGAMEK_REFERENCE)) {
  const cat = weaponCatalog[id];
  if (!cat) {
    console.log(`  ${id}: NOT IN CATALOG`);
    continue;
  }
  const diff = cat.bv - megamek.bv_is;
  const marker = diff !== 0 ? ' *** MISMATCH ***' : '';
  console.log(`  ${id.padEnd(30)} Catalog=${String(cat.bv).padStart(4)}  MegaMek_IS=${String(megamek.bv_is).padStart(4)}  MegaMek_CL=${String(megamek.bv_clan).padStart(4)}${marker}`);
}
