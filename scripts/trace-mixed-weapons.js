// Check MIXED tech units for weapon resolution issues
const fs = require('fs');
const path = require('path');
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json','utf8'));

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

// Load weapon catalogs
const weapPath = 'public/data/equipment/official/weapons';
const weapFiles = fs.readdirSync(weapPath).filter(f => f.endsWith('.json'));
const allWeapons = new Map();
for (const f of weapFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(weapPath, f), 'utf8'));
  for (const item of (data.items || [])) {
    allWeapons.set(item.id, item);
  }
}

// Check top 5 MIXED undercalculated units
const mixedUnits = r.allResults.filter(u => {
  const b = u.breakdown || {};
  return b.techBase === 'MIXED' && Math.abs(u.percentDiff) > 2;
}).sort((a,b) => Math.abs(b.percentDiff) - Math.abs(a.percentDiff));

for (const u of mixedUnits.slice(0, 5)) {
  const data = files.map(f => {
    try { const d = JSON.parse(fs.readFileSync(f, 'utf8')); return d.id === u.unitId ? d : null; } catch { return null; }
  }).find(x => x);

  if (!data) { console.log('NOT FOUND:', u.unitId); continue; }

  console.log('\n=== ' + u.chassis + ' ' + u.model + ' (' + u.percentDiff.toFixed(1) + '%) ===');
  console.log('Equipment:');
  for (const eq of (data.equipment || [])) {
    const weapon = allWeapons.get(eq.id);
    const clanWeap = allWeapons.get('clan-' + eq.id);
    if (weapon) {
      console.log('  ' + eq.id + ' -> IS bv=' + weapon.battleValue + (clanWeap ? ' | Clan bv=' + clanWeap.battleValue : '') + ' @ ' + eq.location);
    } else {
      console.log('  ' + eq.id + ' -> NOT FOUND in catalog @ ' + eq.location);
    }
  }

  // Check crits for Clan vs IS weapon names
  const crits = data.criticalSlots || {};
  const clanWeapons = [];
  const isWeapons = [];
  for (const [loc, slots] of Object.entries(crits)) {
    for (const slot of (slots || [])) {
      if (!slot) continue;
      const lo = slot.toLowerCase();
      if (lo.startsWith('cl') && !lo.includes('cockpit') && !lo.includes('endo') && !lo.includes('ferro')) clanWeapons.push(slot);
      else if (lo.startsWith('is') && !lo.includes('endo') && !lo.includes('ferro')) isWeapons.push(slot);
    }
  }
  if (clanWeapons.length > 0) console.log('  Clan crit items: ' + [...new Set(clanWeapons)].join(', '));
  if (isWeapons.length > 0) console.log('  IS crit items: ' + [...new Set(isWeapons)].join(', '));
}
