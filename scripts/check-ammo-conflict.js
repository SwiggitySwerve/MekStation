const fs = require('fs');
const path = require('path');

// Load all ammo catalog files
const ammoDir = 'public/data/equipment/official/ammunition';
const catalogBV = new Map();
for (const f of fs.readdirSync(ammoDir)) {
  if (!f.endsWith('.json')) continue;
  try {
    const data = JSON.parse(fs.readFileSync(path.join(ammoDir, f), 'utf8'));
    for (const item of (data.items || [])) {
      if (item.id && item.battleValue !== undefined) {
        catalogBV.set(item.id, item.battleValue);
        const canon = item.id.replace(/[^a-z0-9]/g, '');
        if (!catalogBV.has(canon)) catalogBV.set(canon, item.battleValue);
      }
    }
  } catch {}
}

// Hardcoded table from validate-bv.ts (just the key conflicts)
const hc = [
  ['mml-3-lrm-ammo', 4], ['mml-3-srm-ammo', 4],
  ['mml-5-lrm-ammo', 6], ['mml-5-srm-ammo', 6],
  ['mml-7-lrm-ammo', 8], ['mml-7-srm-ammo', 8],
  ['mml-9-lrm-ammo', 11], ['mml-9-srm-ammo', 11],
  ['plasma-rifle-ammo', 26], ['isplasmarifleammo', 26],
  ['clan-plasma-cannon-ammo', 21], ['clplasmacannonammo', 21],
  ['streak-srm-ammo', 17],
  ['clan-streak-srm-2-ammo', 5], ['clan-streak-srm-4-ammo', 10], ['clan-streak-srm-6-ammo', 15],
  ['streak-srm-2-ammo', 4], ['streak-srm-4-ammo', 7], ['streak-srm-6-ammo', 11],
  ['is-streak-srm-2-ammo', 4], ['is-streak-srm-4-ammo', 7], ['is-streak-srm-6-ammo', 11],
  ['clan-ammo-lrm-5', 7], ['clan-ammo-lrm-10', 14], ['clan-ammo-lrm-15', 21], ['clan-ammo-lrm-20', 27],
  ['clan-ammo-srm-2', 3], ['clan-ammo-srm-4', 5], ['clan-ammo-srm-6', 7],
  ['mrm-10-ammo', 7], ['mrm-20-ammo', 14], ['mrm-30-ammo', 21], ['mrm-40-ammo', 28],
  ['hag-20-ammo', 33], ['hag-30-ammo', 50], ['hag-40-ammo', 67],
  ['rac-2-ammo', 15], ['rac-5-ammo', 31],
  ['clan-rac-2-ammo', 20], ['clan-rac-5-ammo', 43], ['clan-rac-20-ammo', 59],
  ['clanimprovedlrm5ammo', 7], ['clanimprovedlrm10ammo', 14],
  ['clanimprovedlrm15ammo', 21], ['clanimprovedlrm20ammo', 27],
];

console.log('Conflicts (catalog BV != hardcoded BV):');
let conflicts = 0;
for (const [id, hcBV] of hc) {
  const catBV = catalogBV.get(id);
  if (catBV !== undefined && catBV !== hcBV) {
    conflicts++;
    console.log(`  ${id}: catalog=${catBV}, hardcoded=${hcBV}, diff=${hcBV - catBV}`);
  }
}
console.log(`Total conflicts: ${conflicts}`);
