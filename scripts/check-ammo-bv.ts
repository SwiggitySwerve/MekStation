import * as fs from 'fs';
import * as path from 'path';

// Load ammo catalog
const ammoPath = path.resolve(__dirname, '../public/data/equipment/official/ammunition.json');
const ammoData = JSON.parse(fs.readFileSync(ammoPath, 'utf8'));

// Flatten if nested
let ammoItems: any[] = [];
if (Array.isArray(ammoData)) {
  ammoItems = ammoData;
} else if (ammoData.items) {
  ammoItems = ammoData.items;
} else {
  // Try to iterate all values
  for (const key of Object.keys(ammoData)) {
    const val = ammoData[key];
    if (Array.isArray(val)) ammoItems.push(...val);
  }
}

console.log(`Total ammo items: ${ammoItems.length}`);

// Find LRM-related ammo
const lrmAmmo = ammoItems.filter((a: any) => {
  const name = (a.name || a.id || '').toLowerCase();
  return name.includes('lrm') && name.includes('20');
});

console.log(`\nLRM-20 ammo entries:`);
for (const a of lrmAmmo) {
  console.log(`  ${a.id} | ${a.name} | BV=${a.battleValue} | techBase=${a.techBase} | shots=${a.shotsPerTon}`);
}

// Find Streak SRM-4 ammo
const streakAmmo = ammoItems.filter((a: any) => {
  const name = (a.name || a.id || '').toLowerCase();
  return name.includes('streak') && name.includes('srm') && name.includes('4');
});

console.log(`\nStreak SRM-4 ammo entries:`);
for (const a of streakAmmo) {
  console.log(`  ${a.id} | ${a.name} | BV=${a.battleValue} | techBase=${a.techBase} | shots=${a.shotsPerTon}`);
}

// Now check what ammo BV values are used for the Archer C 2 in the validation
// The crit slots for this unit have "Clan Ammo LRM-20 (Clan) Artemis-capable" and "Clan Streak SRM 4 Ammo"
// Let's find matches in catalog
const critNames = ['Clan Ammo LRM-20 (Clan) Artemis-capable', 'Clan Streak SRM 4 Ammo'];
for (const critName of critNames) {
  const clean = critName.toLowerCase().replace(/\(omnipod\)/g, '').trim();
  // Try to find by searching
  const matches = ammoItems.filter((a: any) => {
    const id = (a.id || '').toLowerCase();
    const name = (a.name || '').toLowerCase();
    return id.includes(clean.split(' ')[1]) || name.includes(clean.split(' ')[2]);
  });
  console.log(`\nMatches for "${critName}": ${matches.length}`);
  for (const m of matches.slice(0, 5)) {
    console.log(`  ${m.id} | ${m.name} | BV=${m.battleValue}`);
  }
}

// Check what Clan LRM-20 ammo BV should be according to TechManual:
// IS LRM-20 ammo = 27 BV/ton (per TM)
// Clan LRM-20 ammo = 27 BV/ton (same BV, different shots per ton)
console.log('\n=== Expected ammo BV per ton ===');
console.log('IS LRM-20 ammo: 27 BV/ton (per TechManual)');
console.log('Clan LRM-20 ammo: 27 BV/ton (per TechManual)');
console.log('IS Streak SRM-4 ammo: 16 BV/ton');
console.log('Clan Streak SRM-4 ammo: 16 BV/ton');
console.log('\nIf using 27 BV/ton for 6 tons of LRM-20 ammo: 162');
console.log('If using 23 BV/ton for 6 tons of LRM-20 ammo: 138');
console.log('If using 16 BV/ton for 2 tons of Streak SRM-4 ammo: 32');
console.log('Total with 27: 162 + 32 = 194');
console.log('Total with 23: 138 + 32 = 170');
console.log('Report says ammoBV = 158');
