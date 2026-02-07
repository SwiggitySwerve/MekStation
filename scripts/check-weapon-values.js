const fs = require('fs');
const path = require('path');
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

function findJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findJsonFiles(full));
    else if (entry.name.endsWith('.json') && entry.name !== 'index.json') results.push(full);
  }
  return results;
}

// Load all weapon catalogs
const weaponMap = new Map();
for (const f of findJsonFiles('public/data/equipment/official/weapons')) {
  try {
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const item of (data.items || [])) {
      weaponMap.set(item.id, item);
    }
  } catch {}
}

// Load misc catalog
for (const f of findJsonFiles('public/data/equipment/official/miscellaneous')) {
  try {
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const item of (data.items || [])) {
      weaponMap.set(item.id, item);
    }
  } catch {}
}

// Check specific weapons vs MegaMek expected values
// Source: MegaMek weapon files
const expected = {
  // Improved Heavy Lasers
  'improved-heavy-medium-laser': { bv: 93, heat: 7 },
  'improved-heavy-large-laser': { bv: 163, heat: 18 },
  'improved-heavy-small-laser': { bv: 15, heat: 3 },
  // ER Medium Laser variants
  'er-medium-laser': { bv: 62, heat: 5 },
  'clan-er-medium-laser': { bv: 108, heat: 5 },
  // ER Small Laser
  'er-small-laser': { bv: 17, heat: 2 },
  'clan-er-small-laser': { bv: 31, heat: 2 },
  // Machine guns
  'machine-gun': { bv: 5, heat: 0 },
  'clan-machine-gun': { bv: 5, heat: 0 },
  'heavy-machine-gun': { bv: 6, heat: 0 },
  'clan-heavy-machine-gun': { bv: 6, heat: 0 },
  'light-machine-gun': { bv: 5, heat: 0 },
  'clan-light-machine-gun': { bv: 5, heat: 0 },
  // Magshot
  'magshot': { bv: 15, heat: 1 },
  // Medium Pulse
  'medium-pulse-laser': { bv: 48, heat: 4 },
  'clan-medium-pulse-laser': { bv: 111, heat: 4 },
  // SRM-6
  'srm-6': { bv: 59, heat: 4 },
  'clan-srm-6': { bv: 59, heat: 4 },
  // Streak SRM-4
  'streak-srm-4': { bv: 79, heat: 3 },
  'clan-streak-srm-4': { bv: 79, heat: 3 },
  // Light PPC
  'light-ppc': { bv: 88, heat: 5 },
  // Snub-Nose PPC
  'snub-nose-ppc': { bv: 165, heat: 10 },
  // Silver Bullet Gauss Rifle
  'silver-bullet-gauss-rifle': { bv: 198, heat: 1 },
  // HAG variants
  'hag-20': { bv: 267, heat: 8 },
  'hag-30': { bv: 401, heat: 12 },
  'hag-40': { bv: 535, heat: 16 },
  // Ultra AC
  'ultra-ac-10': { bv: 210, heat: 4 },
  'ultra-ac-20': { bv: 281, heat: 8 },
  // Large Pulse Laser
  'large-pulse-laser': { bv: 119, heat: 10 },
  'clan-large-pulse-laser': { bv: 265, heat: 10 },
  // ER Large Laser
  'er-large-laser': { bv: 163, heat: 12 },
  'clan-er-large-laser': { bv: 249, heat: 12 },
  // ER PPC
  'er-ppc': { bv: 229, heat: 15 },
  'clan-er-ppc': { bv: 412, heat: 15 },
  // Rotary AC
  'rotary-ac-5': { bv: 247, heat: 1 },
  'rotary-ac-2': { bv: 118, heat: 1 },
  // Large X-Pulse
  'large-x-pulse-laser': { bv: 178, heat: 14 },
  'medium-x-pulse-laser': { bv: 71, heat: 6 },
};

console.log('=== Weapon BV/Heat Comparison (catalog vs expected) ===\n');
let mismatchCount = 0;
for (const [id, exp] of Object.entries(expected)) {
  const entry = weaponMap.get(id);
  if (!entry) {
    console.log(`  ${id}: NOT IN CATALOG`);
    continue;
  }
  const bvMatch = entry.battleValue === exp.bv;
  const heatMatch = entry.heat === exp.heat;
  if (!bvMatch || !heatMatch) {
    mismatchCount++;
    console.log(`  ${id}: catalog BV=${entry.battleValue} heat=${entry.heat} | expected BV=${exp.bv} heat=${exp.heat} ${!bvMatch ? '[BV MISMATCH]' : ''} ${!heatMatch ? '[HEAT MISMATCH]' : ''}`);
  }
}
console.log(`\nMismatches: ${mismatchCount}/${Object.keys(expected).length}`);
