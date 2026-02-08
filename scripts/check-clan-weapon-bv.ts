import * as fs from 'fs';

// Load weapon catalogs
const energy = JSON.parse(fs.readFileSync('public/data/equipment/official/weapons/energy.json', 'utf8'));
const ballistic = JSON.parse(fs.readFileSync('public/data/equipment/official/weapons/ballistic.json', 'utf8'));
const missile = JSON.parse(fs.readFileSync('public/data/equipment/official/weapons/missile.json', 'utf8'));

const allWeapons = [...(energy.items || energy.weapons || []), ...(ballistic.items || ballistic.weapons || []), ...(missile.items || missile.weapons || [])];

// Known correct MegaMek BV values for Clan weapons
const MEGAMEK_BV: Record<string, number> = {
  // Energy
  'clan-er-large-laser': 248,
  'clan-er-medium-laser': 108,
  'clan-er-small-laser': 31,
  'clan-er-micro-laser': 7,
  'clan-large-pulse-laser': 265,
  'clan-medium-pulse-laser': 111,
  'clan-small-pulse-laser': 24,
  'clan-er-large-pulse-laser': 272,
  'clan-er-medium-pulse-laser': 161,
  'clan-er-small-pulse-laser': 36,
  'clan-heavy-large-laser': 244,
  'clan-heavy-medium-laser': 76,
  'clan-heavy-small-laser': 15,
  'clan-er-ppc': 412,
  'clan-er-flamer': 16,
  'clan-flamer': 6,
  // Ballistic
  'clan-ultra-ac-2': 62,
  'clan-ultra-ac-5': 122,
  'clan-ultra-ac-10': 210,
  'clan-ultra-ac-20': 335,
  'clan-lb-2-x-ac': 42,
  'clan-lb-5-x-ac': 93,
  'clan-lb-10-x-ac': 148,
  'clan-lb-20-x-ac': 237,
  'clan-ap-gauss-rifle': 21,
  'clan-gauss-rifle': 267,
  'clan-hyper-assault-gauss-20': 267,
  'clan-hyper-assault-gauss-30': 401,
  'clan-hyper-assault-gauss-40': 535,
  'clan-machine-gun': 5,
  'clan-light-machine-gun': 5,
  'clan-heavy-machine-gun': 6,
  // Missile
  'clan-streak-srm-2': 40,
  'clan-streak-srm-4': 79,
  'clan-streak-srm-6': 119,
  'clan-lrm-5': 55,
  'clan-lrm-10': 109,
  'clan-lrm-15': 164,
  'clan-lrm-20': 220,
  'clan-srm-2': 21,
  'clan-srm-4': 39,
  'clan-srm-6': 59,
  'clan-atm-3': 53,
  'clan-atm-6': 105,
  'clan-atm-9': 147,
  'clan-atm-12': 212,
  'clan-streak-lrm-5': 69,
  'clan-streak-lrm-10': 138,
  'clan-streak-lrm-15': 207,
  'clan-streak-lrm-20': 276,
  'clan-narc': 30,
};

console.log('=== CLAN WEAPON BV COMPARISON ===');
let mismatchCount = 0;
let checkedCount = 0;
for (const [id, expectedBV] of Object.entries(MEGAMEK_BV)) {
  const weapon = allWeapons.find((w: any) => w.id === id);
  checkedCount++;
  if (!weapon) {
    console.log(`  ${id}: NOT IN CATALOG (expected BV=${expectedBV})`);
    mismatchCount++;
    continue;
  }
  if (weapon.battleValue !== expectedBV) {
    console.log(`  ${id}: catalog=${weapon.battleValue} expected=${expectedBV} (diff=${weapon.battleValue - expectedBV})`);
    mismatchCount++;
  }
}
console.log(`\nChecked: ${checkedCount}, Mismatches: ${mismatchCount}`);

// Also check all clan-* weapons in catalog for obviously wrong values
console.log('\n=== ALL CLAN WEAPONS IN CATALOG ===');
const clanWeapons = allWeapons.filter((w: any) => w.id.startsWith('clan-'));
for (const w of clanWeapons) {
  // Find corresponding IS weapon
  const isId = w.id.replace('clan-', '');
  const isWeapon = allWeapons.find((x: any) => x.id === isId);
  const flag = isWeapon && isWeapon.battleValue === w.battleValue ? ' [SAME AS IS]' : '';
  console.log(`  ${w.id}: BV=${w.battleValue} heat=${w.heat}${flag}`);
}
