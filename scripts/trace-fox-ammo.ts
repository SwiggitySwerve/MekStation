import { normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

// Simulate what validate-bv.ts does for ammo resolution
const ammoNames = [
  'ClanImprovedLRM15Ammo',
  'IS Machine Gun Ammo - Half',
  'IS Streak SRM 2 Ammo',
];

for (const name of ammoNames) {
  const clean = name.replace(/\s*\(omnipod\)/gi, '').trim();
  const lo = clean.toLowerCase();

  console.log(`\n=== ${name} ===`);
  console.log(`clean: "${clean}"`);
  console.log(`lo: "${lo}"`);
  console.log(`lo.includes('ammo'): ${lo.includes('ammo')}`);

  // Simulate resolveAmmoByPattern
  const cleaned = clean
    .replace(/\s*\((?:Clan|IS)\)\s*(?:Artemis(?:\s*V)?|Narc)-?[Cc]apable/gi, '')
    .replace(/\s*(?:Artemis(?:\s*V)?|Narc)-?[Cc]apable/gi, '')
    .replace(/\|.*/g, '')
    .trim();
  console.log(`after cleanup: "${cleaned}"`);

  const norm = normalizeEquipmentId(cleaned);
  console.log(`normalizeEquipmentId: "${norm}"`);

  const canon = norm.replace(/[^a-z0-9]/g, '');
  console.log(`canonical: "${canon}"`);

  // Check IS Streak SRM intercept
  const isStreakMatch = cleaned.match(/^IS\s+Streak\s+SRM\s+(\d+)\s+Ammo$/i);
  if (isStreakMatch) {
    console.log(`IS Streak SRM intercept matched! size=${isStreakMatch[1]}, key=is-streak-srm-${isStreakMatch[1]}-ammo`);
  }

  // Check patterns
  const stripped = lo
    .replace(/\s*\((?:clan|is)\)\s*/g, '')
    .replace(/\s*-\s*(?:full|half|proto)\s*$/g, '')
    .replace(/\s*\(\d+\)\s*$/g, '')
    .trim();
  console.log(`stripped: "${stripped}"`);

  // Check Clan improved LRM pattern
  const clanImprovedLRM = stripped.match(/^cl(?:an)?\s*improved\s*lrm(\d+)\s*ammo$/);
  if (clanImprovedLRM) {
    console.log(`Clan Improved LRM pattern matched! size=${clanImprovedLRM[1]}`);
  } else {
    console.log(`Clan Improved LRM pattern: NO MATCH (tested against "${stripped}")`);
  }

  // Check MG patterns
  const mgHalf = stripped.match(/^(?:is\s*)?(?:light\s*)?machine\s*gun\s*ammo\s*-\s*half$/);
  if (mgHalf) console.log(`MG ammo half pattern matched!`);
}
