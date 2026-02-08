// Verify weapon BV values for near-threshold units by resolving each weapon independently
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

// Build full weapon catalog
const weaponDir = path.join(__dirname, '../public/data/equipment/official/weapons');
const allWeapons = {};
for (const f of fs.readdirSync(weaponDir)) {
  if (!f.endsWith('.json')) continue;
  try {
    const data = JSON.parse(fs.readFileSync(path.join(weaponDir, f), 'utf8'));
    for (const item of (data.items || [])) {
      allWeapons[item.id] = { name: item.name, bv: item.battleValue, heat: item.heat, tb: item.techBase };
    }
  } catch(e) {}
}

// Check non-weapon equipment IDs filter
const nw = ['heatsink','heat-sink','endo','ferro','case','artemis','targeting-computer','targeting computer','ecm','bap','probe','c3','masc','tsm','jump-jet','jump jet','harjel','umu','shield','sword','hatchet','mace','a-pod','b-pod','apod','bpod','blue-shield','null-signature','chameleon','coolant-pod','coolantpod','supercharger','drone','improved-sensors','beagle','angel-ecm','guardian-ecm','light-active-probe','bloodhound','apollo','tag','machine-gun-array','light-machine-gun-array','heavy-machine-gun-array','mga','lmga','hmga','lift-hoist','lifthoist','retractable-blade','remote-sensor','partial-wing','partialwing','searchlight','tracks','cargo','spikes','minesweeper'];
function isWeaponId(id) {
  const lo = id.toLowerCase();
  if (lo.includes('ammo')) return false;
  for (const n of nw) if (lo.includes(n)) return false;
  return true;
}

const targets = ['werewolf-wer-lf-005', 'sarath-srth-1ob', 'perseus-p1e', 'kodiak-cale', 'marauder-c', 'epimetheus-prime', 'violator-vt-u1', 'night-stalker-nsr-k1'];
for (const id of targets) {
  const u = r.allResults.find(x => x.unitId === id);
  if (!u) continue;
  const unit = loadUnit(id);
  if (!unit) continue;
  const b = u.breakdown;

  console.log(`\n=== ${id} (gap=${u.difference}, ${(u.percentDiff||0).toFixed(2)}%) ===`);
  console.log(`  Tech base: ${unit.techBase}`);

  let totalCatalogBV = 0;
  const weaponEqs = (unit.equipment || []).filter(e => isWeaponId(e.id));
  for (const eq of weaponEqs) {
    // Try to find in catalog
    const direct = allWeapons[eq.id];
    // Also try with prefixes stripped
    const stripped = eq.id.replace(/^\d+-/, '').replace(/^(is|cl|clan)/, '');
    const alt = allWeapons[stripped];

    if (direct) {
      totalCatalogBV += direct.bv;
      console.log(`  ${eq.id.padEnd(35)} BV=${String(direct.bv).padStart(4)} (${direct.name}, ${direct.tb})`);
    } else if (alt) {
      totalCatalogBV += alt.bv;
      console.log(`  ${eq.id.padEnd(35)} BV=${String(alt.bv).padStart(4)} (via ${stripped}: ${alt.name})`);
    } else {
      console.log(`  ${eq.id.padEnd(35)} *** NOT RESOLVED ***`);
    }
  }
  console.log(`  Total catalog weapon BV: ${totalCatalogBV}`);
  console.log(`  Reported raw weapon BV: ${b.rawWeaponBV} (halved: ${b.halvedWeaponBV})`);
  console.log(`  Reported final weapon BV: ${b.weaponBV}`);

  // Check ammo
  const ammoEqs = (unit.equipment || []).filter(e => e.id.toLowerCase().includes('ammo'));
  console.log(`  Ammo items: ${ammoEqs.map(a => a.id).join(', ')}`);
  console.log(`  Reported ammo BV: ${b.ammoBV}`);
}
