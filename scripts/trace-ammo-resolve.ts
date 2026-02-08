/**
 * Trace ammo resolution for specific failing entries.
 */
import * as fs from 'fs';
import * as path from 'path';
import { normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

// Load ammunition catalog (same as buildAmmoLookup)
const ammoLookup = new Map<string, { bv: number; weaponType: string }>();

function normalizeWeaponKey(id: string): string {
  let s = id.toLowerCase().replace(/^clan-/, '').replace(/^cl(?!uster)/, '').replace(/^\d+-/, '').replace(/prototype-?/g, '');
  const aliases: [RegExp, string][] = [
    [/^(?:is)?ultra-?ac-?(\d+)$/, 'uac-$1'], [/^(?:is)?ultraac(\d+)$/, 'uac-$1'],
    [/^(?:is)?lb-?(\d+)-?x-?ac$/, 'lb-$1-x-ac'], [/^(?:is)?lbxac(\d+)$/, 'lb-$1-x-ac'],
    [/^(?:is)?autocannon-?(\d+)$/, 'ac-$1'], [/^(?:is)?ac-?(\d+)$/, 'ac-$1'],
  ];
  for (const [re, rep] of aliases) { if (re.test(s)) return s.replace(re, rep); }
  return s;
}

function extractWeaponTypeFromAmmoId(ammoId: string): string {
  let s = ammoId.replace(/-ammo$/, '').replace(/ammo$/, '').replace(/^ammo-/, '').replace(/^clan-ammo-/, '').replace(/^clan-/, '');
  s = s.replace(/-(standard|er|he|iiw|imp|cluster|ap|precision|fragmentation|inferno|swarm|tandem-charge|thunder|explosive|ecm|haywire|nemesis|pods)$/, '');
  s = s.replace(/-half$/, '').replace(/-full$/, '');
  return normalizeWeaponKey(s);
}

try {
  const d = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'public/data/equipment/official/ammunition.json'), 'utf-8'));
  for (const item of d.items || []) {
    const wt = item.compatibleWeaponIds?.[0]
      ? normalizeWeaponKey(item.compatibleWeaponIds[0])
      : extractWeaponTypeFromAmmoId(item.id);
    ammoLookup.set(item.id, { bv: item.battleValue, weaponType: wt });
    const canon = item.id.replace(/[^a-z0-9]/g, '');
    if (!ammoLookup.has(canon)) ammoLookup.set(canon, { bv: item.battleValue, weaponType: wt });
  }
} catch(e) { console.error('Failed to load catalog:', e); }

console.log(`Ammo lookup has ${ammoLookup.size} entries`);

// Check if key entries exist
const checkKeys = [
  'uac-10-ammo', 'clan-uac-10-ammo',
  'lb-10-x-ammo', 'lb-10-x-cluster-ammo', 'is-lb-10-x-ammo', 'is-lb-10-x-cluster-ammo',
  'clan-medium-chemical-laser-ammo',
  'heavy-mg-ammo', 'heavy-machine-gun-ammo-full',
  'ams-ammo',
  'magshotgr-ammo', 'taser-ammo',
];
console.log('\n=== KEY ENTRIES IN AMMO LOOKUP ===');
for (const k of checkKeys) {
  const v = ammoLookup.get(k);
  console.log(`  ${k.padEnd(40)} → ${v ? `BV=${v.bv}, wt=${v.weaponType}` : 'NOT FOUND'}`);
}

// Test specific ammo names through the resolution path
const testNames = [
  'Clan Ultra AC/10 Ammo',
  'IS LB 10-X Cluster Ammo',
  'IS LB 10-X AC Ammo',
  'CLMediumChemLaserAmmo',
  'Clan Heavy Machine Gun Ammo - Half',
  'ISAMS Ammo',
];

for (const name of testNames) {
  console.log(`\n=== Testing: "${name}" ===`);

  const clean = name.replace(/\s*\(omnipod\)/gi, '').trim();

  // Step 1: normalizeEquipmentId
  const norm = normalizeEquipmentId(clean);
  console.log(`  normalizeEquipmentId → "${norm}"`);
  console.log(`  lu.get(norm) → ${JSON.stringify(ammoLookup.get(norm))}`);
  console.log(`  lu.get(norm + '-ammo') → ${JSON.stringify(ammoLookup.get(norm + '-ammo'))}`);

  // Step 2: stripped form
  const lo = clean.toLowerCase();
  const stripped = lo
    .replace(/\s*\((?:clan|is)\)\s*/g, '')
    .replace(/\s*-\s*(?:full|half|proto)\s*$/g, '')
    .replace(/\s*\(\d+\)\s*$/g, '')
    .trim();
  console.log(`  stripped → "${stripped}"`);

  // Step 3: Test key regexes
  const tests: [string, RegExp, (m: RegExpMatchArray) => string[]][] = [
    ['line853-lbx-ammo', /^(?:is\s*)?lb\s*(\d+)-x\s*(?:ac\s*)?ammo$/, m => [`is-lb-${m[1]}-x-ammo`, `lb-${m[1]}-x-ammo`]],
    ['line854-lbx-cluster', /^(?:is\s*)?lb\s*(\d+)-x\s*(?:ac\s*)?cluster\s*ammo$/, m => [`is-lb-${m[1]}-x-cluster-ammo`, `lb-${m[1]}-x-cluster-ammo`]],
    ['line921-clan-uac', /^cl(?:an)?\s*ultra\s*ac[/-](\d+)\s*ammo$/, m => [`clan-uac-${m[1]}-ammo`, `uac-${m[1]}-ammo`]],
    ['line944-cl-chemlas', /^cl(?:an)?\s*mediumchemlaser\s*ammo$/, _ => [`clan-medium-chemical-laser-ammo`]],
    ['line937-cl-hmg', /^cl(?:an)?\s*heavy\s*machine\s*gun\s*ammo$/, _ => [`heavy-mg-ammo`, `heavy-machine-gun-ammo-full`]],
    ['line880-ams', /^(?:is\s*)?ams\s*ammo$/, _ => [`ams-ammo`]],
  ];

  for (const [label, re, idsFn] of tests) {
    const m = stripped.match(re);
    if (m) {
      const ids = idsFn(m);
      console.log(`  ${label} MATCHED! → candidates: ${JSON.stringify(ids)}`);
      for (const id of ids) {
        const found = ammoLookup.get(id);
        console.log(`    lu.get('${id}') → ${found ? `BV=${found.bv}, wt=${found.weaponType}` : 'NOT FOUND'}`);
      }
    }
  }

  // Step 4: canonical lookup
  const canonKey = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
  console.log(`  canonical key → "${canonKey}"`);
  console.log(`  lu.get(canonKey) → ${JSON.stringify(ammoLookup.get(canonKey))}`);
}
