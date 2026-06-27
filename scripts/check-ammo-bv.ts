import {
  type AmmoCatalogItem,
  loadOfficialAmmoItems,
} from './bv-analysis-helpers';

const ammoItems = loadOfficialAmmoItems();

console.log(`Total ammo items: ${ammoItems.length}`);

// Find LRM-related ammo
const lrmAmmo = ammoItems.filter((a) => {
  const name = (a.name || a.id || '').toLowerCase();
  return name.includes('lrm') && name.includes('20');
});

console.log(`\nLRM-20 ammo entries:`);
for (const a of lrmAmmo) {
  console.log(
    `  ${a.id} | ${a.name} | BV=${a.battleValue} | techBase=${a.techBase} | shots=${a.shotsPerTon}`,
  );
}

// Find Streak SRM-4 ammo
const streakAmmo = ammoItems.filter((a) => {
  const name = (a.name || a.id || '').toLowerCase();
  return name.includes('streak') && name.includes('srm') && name.includes('4');
});

console.log(`\nStreak SRM-4 ammo entries:`);
for (const a of streakAmmo) {
  console.log(
    `  ${a.id} | ${a.name} | BV=${a.battleValue} | techBase=${a.techBase} | shots=${a.shotsPerTon}`,
  );
}

// Now check what ammo BV values are used for the Archer C 2 in the validation
// The crit slots for this unit have "Clan Ammo LRM-20 (Clan) Artemis-capable" and "Clan Streak SRM 4 Ammo"
// Let's find matches in catalog
const critNames = [
  'Clan Ammo LRM-20 (Clan) Artemis-capable',
  'Clan Streak SRM 4 Ammo',
];
for (const critName of critNames) {
  const clean = critName
    .toLowerCase()
    .replace(/\(omnipod\)/g, '')
    .trim();
  // Try to find by searching
  const matches = ammoItems.filter((a) => {
    const id = (a.id || '').toLowerCase();
    const name = (a.name || '').toLowerCase();
    return (
      id.includes(clean.split(' ')[1]) || name.includes(clean.split(' ')[2])
    );
  }) as AmmoCatalogItem[];
  console.log(`\nMatches for "${critName}": ${matches.length}`);
  for (const m of matches.slice(0, 5)) {
    console.log(`  ${m.id} | ${m.name} | BV=${m.battleValue}`);
  }
}

// Check what Clan LRM-20 ammo BV should be according to TechManual:
// IS LRM-20 ammo = 27 BV/ton (per TM)
// Clan LRM-20 ammo = 27 BV/ton (same BV, different shots per ton)
for (const line of [
  '\n=== Expected ammo BV per ton ===',
  'IS LRM-20 ammo: 27 BV/ton (per TechManual)',
  'Clan LRM-20 ammo: 27 BV/ton (per TechManual)',
  'IS Streak SRM-4 ammo: 16 BV/ton',
  'Clan Streak SRM-4 ammo: 16 BV/ton',
  '\nIf using 27 BV/ton for 6 tons of LRM-20 ammo: 162',
  'If using 23 BV/ton for 6 tons of LRM-20 ammo: 138',
  'If using 16 BV/ton for 2 tons of Streak SRM-4 ammo: 32',
  'Total with 27: 162 + 32 = 194',
  'Total with 23: 138 + 32 = 170',
  'Report says ammoBV = 158',
]) {
  console.log(line);
}
