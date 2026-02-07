#!/usr/bin/env npx tsx
/**
 * Replicate the EXACT ammo resolution path from validate-bv.ts for specific test names.
 * We replicate resolveAmmoByPattern's logic inline since it's not exported.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveAmmoBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

// Build ammo lookup (same as validator's buildAmmoLookup)
const ammoLookup = new Map<string, { bv: number; weaponType: string }>();

function normalizeWeaponKey(id: string): string {
  return id.toLowerCase().replace(/^clan-/, '').replace(/^cl(?!uster)/, '').replace(/^\d+-/, '');
}

function extractWeaponTypeFromAmmoId(ammoId: string): string {
  return ammoId.replace(/-ammo$/, '').replace(/^ammo-/, '');
}

const ammoFile = path.resolve('public/data/equipment/official/ammunition.json');
const d = JSON.parse(fs.readFileSync(ammoFile, 'utf8'));
for (const item of d.items || []) {
  const wt = item.compatibleWeaponIds?.[0]
    ? normalizeWeaponKey(item.compatibleWeaponIds[0])
    : extractWeaponTypeFromAmmoId(item.id);
  ammoLookup.set(item.id, { bv: item.battleValue, weaponType: wt });
  const canon = item.id.replace(/[^a-z0-9]/g, '');
  if (!ammoLookup.has(canon)) ammoLookup.set(canon, { bv: item.battleValue, weaponType: wt });
}

// Add hardcoded entries (just a few key ones for testing)
const hc: Array<[string, number, string]> = [
  ['ammo-srm-2', 3, 'srm-2'], ['ammo-srm-4', 5, 'srm-4'], ['ammo-srm-6', 7, 'srm-6'],
  ['ammo-lrm-5', 6, 'lrm-5'], ['ammo-lrm-10', 11, 'lrm-10'], ['ammo-lrm-15', 17, 'lrm-15'], ['ammo-lrm-20', 23, 'lrm-20'],
  ['clan-medium-chemical-laser-ammo', 5, 'medium-chemical-laser'],
  ['plasma-rifle-ammo', 26, 'plasma-rifle'], ['isplasmarifleammo', 26, 'plasma-rifle'],
];
for (const [id, bv, wt] of hc) {
  if (!ammoLookup.has(id)) ammoLookup.set(id, { bv, weaponType: wt });
  const canon = id.replace(/[^a-z0-9]/g, '');
  if (!ammoLookup.has(canon)) ammoLookup.set(canon, { bv, weaponType: wt });
}

const testNames = [
  'IS Ammo SRM-6',
  'IS Ammo LRM-15',
  'ISPlasmaRifleAmmo',
  'Clan Gauss Ammo',
  'Clan Ammo LRM-15',
  'IS Ammo LRM-10',
  'ISRotaryAC5 Ammo',
  'Clan Streak SRM 6 Ammo',
  'Clan Ultra AC/10 Ammo',
  'ISAMS Ammo',
  'IS Ammo LRM-15 Artemis-capable',
  'IS Ammo AC/10',
  'IS Ammo AC/20',
  'CLMediumChemLaserAmmo',
  'HAG/20 Ammo',
  'CLAPGaussRifle Ammo',
  'ISHeavyGauss Ammo',
  'ISGauss Ammo',
  'IS Ammo MG - Full',
];

for (const rawName of testNames) {
  // Step 1: clean (same as validator)
  const clean = rawName
    .replace(/\s*\(omnipod\)/gi, '')
    .replace(/\s*\((?:Clan|IS)\)\s*(?:Artemis(?:\s*V)?|Narc)-?[Cc]apable/gi, '')
    .replace(/\s*(?:Artemis(?:\s*V)?|Narc)-?[Cc]apable/gi, '')
    .replace(/\|.*/g, '')
    .trim();

  // Step 2: normalize via equipmentBVResolver
  const norm = normalizeEquipmentId(clean);

  // Step 3: direct lookup
  let directHit = ammoLookup.get(norm);
  let directAmmoHit = !directHit ? ammoLookup.get(norm + '-ammo') : null;

  if (directHit || directAmmoHit) {
    const hit = (directHit || directAmmoHit)!;
    console.log(`OK "${rawName}" → norm="${norm}" → direct bv=${hit.bv}`);
    continue;
  }

  // Step 4: regex path
  const lo = clean.toLowerCase();
  const stripped = lo
    .replace(/\s*\((?:clan|is)\)\s*/g, '')
    .replace(/\s*-\s*(?:full|half|proto)\s*$/g, '')
    .replace(/\s*\(\d+\)\s*$/g, '')
    .trim();

  // Test just a few key rules
  const rules: Array<{ re: RegExp; ids: (m: RegExpMatchArray) => string[] }> = [
    { re: /^(?:is\s*)?ammo\s+srm-(\d+)$/, ids: m => [`ammo-srm-${m[1]}`] },
    { re: /^(?:is\s*)?ammo\s+lrm-(\d+)$/, ids: m => [`ammo-lrm-${m[1]}`] },
    { re: /^(?:is\s*)?ammo\s+ac[/-](\d+)$/, ids: m => [`ac-${m[1]}-ammo`] },
    { re: /^cl(?:an)?\s*mediumchemlaser\s*ammo$/, ids: _ => [`clan-medium-chemical-laser-ammo`] },
    { re: /^(?:is\s*)?plasmarifle?\s*ammo$/, ids: _ => [`plasma-rifle-ammo`, `isplasmarifleammo`] },
    { re: /^cl(?:an)?\s*gauss\s*ammo$/, ids: _ => [`gauss-ammo`] },
    { re: /^cl(?:an)?\s*ammo\s+lrm-(\d+)$/, ids: m => [`ammo-lrm-${m[1]}`] },
    { re: /^(?:is\s*)?gauss\s*ammo$/, ids: _ => [`gauss-ammo`] },
    { re: /^(?:is\s*)?heavy\s*gauss\s*ammo$/, ids: _ => [`heavy-gauss-ammo`] },
    { re: /^(?:is\s*)?ams\s*ammo$/, ids: _ => [`ams-ammo`] },
    { re: /^hag[/-](\d+)\s*ammo$/, ids: m => [`hag-${m[1]}-ammo`, `gauss-ammo`] },
    { re: /^(?:is\s*)?ammo\s+mg$/, ids: _ => [`mg-ammo`, `ammo-mg-full`] },
    { re: /^(?:is\s*)?(?:light\s*)?mg\s*ammo$/, ids: _ => [`mg-ammo`, `ammo-mg-full`] },
    { re: /^(?:is\s*)?rotaryac(\d+)\s*ammo$/, ids: m => [`rotaryac${m[1]}`] },
  ];

  let matched = false;
  for (const rule of rules) {
    const m = stripped.match(rule.re);
    if (m) {
      const ids = rule.ids(m);
      for (const id of ids) {
        const found = ammoLookup.get(id);
        if (found) {
          console.log(`OK "${rawName}" → stripped="${stripped}" → regex → ${id} → bv=${found.bv}`);
          matched = true;
          break;
        }
      }
      if (!matched) {
        console.log(`MISS "${rawName}" → stripped="${stripped}" → regex matched ${rule.re.source} → ids=${ids.join(',')} but NONE in lookup`);
        matched = true;
      }
      break;
    }
  }
  if (!matched) {
    // Step 5: canon fallback
    const canonKey = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
    const ce = ammoLookup.get(canonKey);
    if (ce) {
      console.log(`OK "${rawName}" → canon="${canonKey}" → bv=${ce.bv}`);
    } else {
      console.log(`FAIL "${rawName}" → norm="${norm}" stripped="${stripped}" canon="${canonKey}" → NOT FOUND`);
    }
  }
}
