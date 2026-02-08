// Trace IS Streak SRM ammo BV resolution
const fs = require('fs');
const path = require('path');

// Build ammo lookup exactly as validate-bv.ts does
const ammoLookup = new Map();

// Load ammunition catalog (same as buildAmmoLookup)
try {
  const d = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'public/data/equipment/official/ammunition.json'), 'utf-8'));
  for (const item of (d.items || [])) {
    ammoLookup.set(item.id, { bv: item.battleValue, src: 'catalog-id' });
    const canon = item.id.replace(/[^a-z0-9]/g, '');
    if (!ammoLookup.has(canon)) ammoLookup.set(canon, { bv: item.battleValue, src: 'catalog-canon:' + item.id });
  }
} catch (e) { console.error('Failed to load catalog:', e.message); }

console.log('=== Catalog entries for streak SRM ===');
for (const [k, v] of ammoLookup) {
  if (k.includes('streak') && k.includes('srm')) {
    console.log(`  "${k}" => bv=${v.bv} (${v.src})`);
  }
}

// Add hardcoded entries (same order as validate-bv.ts)
const hc = [
  ['streak-srm-ammo', 17, 'streak-srm-2'],
  ['clan-streak-srm-2-ammo', 5, 'streak-srm-2'], ['clan-streak-srm-4-ammo', 10, 'streak-srm-4'], ['clan-streak-srm-6-ammo', 15, 'streak-srm-6'],
  ['streak-srm-2-ammo', 4, 'streak-srm-2'], ['streak-srm-4-ammo', 7, 'streak-srm-4'], ['streak-srm-6-ammo', 11, 'streak-srm-6'],
  ['is-streak-srm-2-ammo', 4, 'streak-srm-2'], ['is-streak-srm-4-ammo', 7, 'streak-srm-4'], ['is-streak-srm-6-ammo', 11, 'streak-srm-6'],
];

console.log('\n=== Hardcoded entries for IS Streak SRM ===');
for (const [id, bv, wt] of hc) {
  const exists = ammoLookup.has(id);
  const canon = id.replace(/[^a-z0-9]/g, '');
  const canonExists = ammoLookup.has(canon);
  if (!exists) ammoLookup.set(id, { bv, src: 'hc-id' });
  if (!canonExists) ammoLookup.set(canon, { bv, src: 'hc-canon:' + id });
  console.log(`  "${id}" (canon: "${canon}"): bv=${bv}, existed=${exists}, canonExisted=${canonExists}`);
}

// Check what the regex rule would produce
const testSlots = ['IS Streak SRM 6 Ammo', 'IS Streak SRM 4 Ammo', 'IS Streak SRM 2 Ammo'];
for (const slot of testSlots) {
  const clean = slot.replace(/\s*\(omnipod\)/gi, '').trim();
  const lo = clean.toLowerCase();
  const stripped = lo
    .replace(/\s*\((?:clan|is)\)\s*/g, '')
    .replace(/\s*-\s*(?:full|half|proto)\s*$/g, '')
    .replace(/\s*\(\d+\)\s*$/g, '')
    .trim();

  const re = /^(?:is\s*)?streak\s*srm\s*(\d+)\s*ammo$/;
  const m = stripped.match(re);
  if (m) {
    const ids = [`is-streak-srm-${m[1]}-ammo`, `streak-srm-${m[1]}-ammo`, `streak-srm-ammo`];
    console.log(`\n"${slot}" => stripped: "${stripped}" => matches regex, ids: ${JSON.stringify(ids)}`);
    for (const id of ids) {
      const found = ammoLookup.get(id);
      if (found) { console.log(`  lu.get("${id}") => bv=${found.bv} (${found.src})`); break; }
      console.log(`  lu.get("${id}") => NOT FOUND`);
    }
  } else {
    console.log(`\n"${slot}" => stripped: "${stripped}" => NO REGEX MATCH`);
  }

  // Also test the canonKey fallback
  const canonKey = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
  const ce = ammoLookup.get(canonKey);
  console.log(`  canonKey fallback: "${canonKey}" => ${ce ? `bv=${ce.bv} (${ce.src})` : 'NOT FOUND'}`);
}
