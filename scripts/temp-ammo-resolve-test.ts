import fs from 'fs';
import path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

// Build the same ammo lookup as validate-bv.ts
let ammoLookup: Map<string, { bv: number; weaponType: string }> | null = null;

function normalizeWeaponKey(id: string): string {
  return id.toLowerCase().replace(/^(is|clan|cl)-?/, '').replace(/-/g, '-');
}

function extractWeaponTypeFromAmmoId(id: string): string {
  return id.replace(/-ammo.*$/, '').replace(/^ammo-/, '');
}

function buildAmmoLookup(): Map<string, { bv: number; weaponType: string }> {
  if (ammoLookup) return ammoLookup;
  ammoLookup = new Map();
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
  } catch { /* ignore */ }
  return ammoLookup;
}

// Test the top ammo types
const topAmmo = [
  'IS Gauss Ammo', 'IS Ammo LRM-15', 'Clan Ammo LRM-15', 'IS Ammo SRM-6',
  'Clan Ammo LRM-20', 'Clan Gauss Ammo', 'IS Ammo LRM-20', 'IS Ammo LRM-10',
  'ISPlasmaRifleAmmo', 'Clan Streak SRM 6 Ammo', 'Clan Ultra AC/10 Ammo',
  'Clan Ammo SRM-6', 'ISRotaryAC5 Ammo', 'IS Ammo SRM-4', 'ISAMS Ammo',
  'Clan Ammo LRM-10', 'IS Ammo LRM-5', 'Clan Ultra AC/20 Ammo', 'IS Ammo AC/10',
  'IS LB 10-X AC Ammo', 'CLPlasmaCannonAmmo', 'IS LB 10-X Cluster Ammo',
  'IS Ammo AC/20', 'IS Streak SRM 6 Ammo', 'Hyper-Assault Gauss Rifle/20 Ammo',
  'IS Ammo MG - Full', 'IS Ammo LAC/5', 'IS Streak SRM 2 Ammo',
  'IS Machine Gun Ammo - Half', 'IS Ultra AC/10 Ammo', 'Clan Ammo ATM-6',
  'IS Ammo SRM-2', 'Clan Ammo ATM-9', 'IS Light Gauss Ammo',
  'Clan Streak SRM 4 Ammo', 'ISLRM15 Ammo', 'IS Ammo AC/5',
  'Hyper-Assault Gauss Rifle/40 Ammo', 'CLAMS Ammo', 'CLAPGaussRifle Ammo',
  'IS Ammo MML-7 LRM', 'CLRotaryAC5 Ammo', 'ISGauss Ammo', 'ISHeavyGauss Ammo',
  'IS Ammo MML-7 SRM', 'IS Ammo MML-5 SRM', 'Clan Ammo SRM-4',
  'IS Ammo MML-5 LRM', 'Clan LB 10-X AC Ammo', 'Clan Ultra AC/5 Ammo',
  'Clan Machine Gun Ammo - Half', 'Clan Ammo LRM-5', 'Clan LB 20-X AC Ammo',
  'HAG/20 Ammo', 'CLArrowIVAmmo', 'Clan LB 10-X Cluster Ammo',
  'IS Streak SRM 4 Ammo', 'Clan Streak LRM 15 Ammo', 'Clan Ultra AC/2 Ammo',
  'IS Ammo MML-9 LRM', 'ISSRM6 Ammo', 'ISImprovedHeavyGauss Ammo',
  'ISLBXAC10 Ammo', 'Hyper-Assault Gauss Rifle/30 Ammo', 'IS Ammo MML-9 SRM',
  'IS Ultra AC/20 Ammo', 'IS LB 20-X AC Ammo', 'ISLRM5 Ammo',
  'Clan Ammo ATM-3', 'IS LB 20-X Cluster Ammo', 'Clan LB 20-X Cluster Ammo',
  'HAG/30 Ammo', 'Clan Ammo ATM-12', 'IS Ammo Extended LRM-15',
  'Clan Ammo ATM-6 ER', 'Clan Ammo ATM-6 HE', 'IS MRM 40 Ammo',
  'Clan Ammo ATM-9 HE', 'ISFluidGun Ammo', 'Clan Ammo ATM-9 ER',
  // Additional common ones
  'ISLBXAC5 CL Ammo', 'ISLBXAC20 CL Ammo', 'ISLBXAC2 CL Ammo',
  'Clan LB 5-X AC Ammo', 'Clan LB 5-X Cluster Ammo', 'Clan LB 2-X AC Ammo',
  'Clan LB 2-X Cluster Ammo', 'IS Ammo AC/2', 'IS Ultra AC/5 Ammo',
  'IS Ultra AC/2 Ammo', 'IS Ultra AC/20 Ammo', 'ISStreakSRM6 Ammo',
  'ISStreakSRM4 Ammo', 'ISStreakSRM2 Ammo', 'Taser Ammo',
  'CLMediumChemLaserAmmo', 'ISArrowIV Ammo', 'ISLRT15 Ammo', 'ISSRT4 Ammo',
  'ISMagshotGR Ammo', 'ISSniperCannonAmmo', 'Clan Heavy Machine Gun Ammo - Half',
  'IS Ammo LRTorpedo-5', 'IS Ammo LRTorpedo-10', 'IS Ammo LRTorpedo-15',
  'IS Ammo SRTorpedo-2', 'IS Ammo SRTorpedo-4', 'IS Ammo SRTorpedo-6',
  'Clan Ammo LRTorpedo-5', 'Clan Ammo LRTorpedo-10', 'Clan Ammo SRTorpedo-6',
  'IS Ammo HVAC/2', 'IS Ammo HVAC/5', 'IS Ammo HVAC/10',
  'IS MRM 10 Ammo', 'IS MRM 20 Ammo', 'IS MRM 30 Ammo',
  'ISEnhancedLRM5 Ammo', 'ISEnhancedLRM10 Ammo', 'ISEnhancedLRM15 Ammo', 'ISEnhancedLRM20 Ammo',
  'IS Ammo Extended LRM-5', 'IS Ammo Extended LRM-10', 'IS Ammo Extended LRM-20',
  'IS Ammo Thunderbolt-5', 'IS Ammo Thunderbolt-10', 'IS Ammo Thunderbolt-15', 'IS Ammo Thunderbolt-20',
  'ISThunderbolt5 Ammo', 'ISThunderbolt10 Ammo', 'ISThunderbolt15 Ammo', 'ISThunderbolt20 Ammo',
  'IS Ammo iNarc', 'IS Ammo Narc', 'Clan Ammo Narc',
  'ISiNarcAmmo', 'ISNarcAmmo',
  'IS Ammo SC Mortar-1', 'IS Ammo SC Mortar-2', 'IS Ammo SC Mortar-4', 'IS Ammo SC Mortar-8',
  'Clan Ammo SC Mortar-1', 'Clan Ammo SC Mortar-2', 'Clan Ammo SC Mortar-4', 'Clan Ammo SC Mortar-8',
];

const lu = buildAmmoLookup();

// Simulate resolveAmmoByPattern
function resolveAmmoByPattern(name: string): { bv: number; weaponType: string } | null {
  const clean = name
    .replace(/\s*\(omnipod\)/gi, '')
    .replace(/\s*\((?:Clan|IS)\)\s*(?:Artemis(?:\s*V)?|Narc)-?[Cc]apable/gi, '')
    .replace(/\s*(?:Artemis(?:\s*V)?|Narc)-?[Cc]apable/gi, '')
    .replace(/\|.*/g, '')
    .trim();

  const norm = normalizeEquipmentId(clean);
  let e = lu.get(norm); if (e) return e;
  e = lu.get(norm + '-ammo'); if (e) return e;

  const lo = clean.toLowerCase();
  const stripped = lo
    .replace(/\s*\((?:clan|is)\)\s*/g, '')
    .replace(/\s*-\s*(?:full|half|proto)\s*$/g, '')
    .replace(/\s*\(\d+\)\s*$/g, '')
    .trim();

  type Rule = { re: RegExp; ids: (m: RegExpMatchArray) => string[] };
  const rules: Rule[] = [
    { re: /^(?:is\s*)?ammo\s+ac[/-](\d+)$/,         ids: m => [`ac-${m[1]}-ammo`] },
    { re: /^(?:is\s*)?ac(\d+)\s*ammo$/,              ids: m => [`ac-${m[1]}-ammo`] },
    { re: /^(?:is\s*)?ammo\s+lrm-(\d+)$/,            ids: m => [`ammo-lrm-${m[1]}`] },
    { re: /^(?:is\s*)?lrm(\d+)\s*ammo$/,             ids: m => [`ammo-lrm-${m[1]}`] },
    { re: /^(?:is\s*)?ammo\s+srm-(\d+)$/,            ids: m => [`ammo-srm-${m[1]}`] },
    { re: /^(?:is\s*)?srm(\d+)\s*ammo$/,             ids: m => [`ammo-srm-${m[1]}`] },
    { re: /^(?:is\s*)?ammo\s+mml-(\d+)\s+lrm$/,      ids: m => [`mml-${m[1]}-lrm-ammo`, `ammo-lrm-${m[1]}`] },
    { re: /^(?:is\s*)?ammo\s+mml-(\d+)\s+srm$/,      ids: m => [`mml-${m[1]}-srm-ammo`, `ammo-srm-${m[1]}`] },
    { re: /^(?:is\s*)?mml(\d+)\s+lrm\s*ammo$/,       ids: m => [`mml-${m[1]}-lrm-ammo`, `ammo-lrm-${m[1]}`] },
    { re: /^(?:is\s*)?mml(\d+)\s+srm\s*ammo$/,       ids: m => [`mml-${m[1]}-srm-ammo`, `ammo-srm-${m[1]}`] },
    { re: /^(?:is\s*)?mrm(\d+)\s*ammo$/,             ids: m => [`mrm-${m[1]}`, `mrm-ammo`] },
    { re: /^(?:is\s*)?ammo\s+mrm-(\d+)$/,            ids: m => [`mrm-${m[1]}`, `mrm-ammo`] },
    { re: /^(?:is\s*)?ultraac(\d+)\s*ammo$/,          ids: m => [`uac-${m[1]}-ammo`] },
    { re: /^(?:is\s*)?ammo\s+ultra\s*ac[/-](\d+)$/,   ids: m => [`uac-${m[1]}-ammo`] },
    { re: /^(?:is\s*)?ultra\s*ac[/-](\d+)\s*ammo$/,   ids: m => [`uac-${m[1]}-ammo`] },
    { re: /^(?:is\s*)?lbxac(\d+)\s*ammo$/,           ids: m => [`lb-${m[1]}-x-ammo`] },
    { re: /^(?:is\s*)?lbxac(\d+)\s+cl\s*ammo$/,      ids: m => [`lb-${m[1]}-x-cluster-ammo`] },
    { re: /^(?:is\s*)?lb\s*(\d+)-x\s*(?:ac\s*)?ammo$/,ids: m => [`lb-${m[1]}-x-ammo`] },
    { re: /^(?:is\s*)?lb\s*(\d+)-x\s*(?:ac\s*)?cluster\s*ammo$/,ids: m => [`lb-${m[1]}-x-cluster-ammo`] },
    // IS Streak SRM (MISSING!)
    { re: /^(?:is\s*)?streaksrm(\d+)\s*ammo$/,       ids: m => [`streak-srm-${m[1]}-ammo`, `streak-srm-ammo`] },
    { re: /^(?:is\s*)?streak\s*srm\s*(\d+)\s*ammo$/,  ids: m => [`streak-srm-${m[1]}-ammo`, `streak-srm-ammo`] },
    { re: /^(?:is\s*)?ammo\s+streak\s*srm-(\d+)$/,    ids: m => [`streak-srm-${m[1]}-ammo`, `streak-srm-ammo`] },
    // Clan patterns
    { re: /^cl(?:an)?\s*streaksrm(\d+)\s*ammo$/,      ids: m => [`clan-streak-srm-${m[1]}`, `streak-srm-ammo`] },
    { re: /^cl(?:an)?\s*streak\s*srm\s*(\d+)\s*ammo$/,ids: m => [`clan-streak-srm-${m[1]}`, `streak-srm-ammo`] },
  ];

  for (const rule of rules) {
    const m = stripped.match(rule.re);
    if (m) {
      for (const id of rule.ids(m)) {
        const found = lu.get(id);
        if (found) return found;
      }
    }
  }

  const canonKey = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
  const ce = lu.get(canonKey);
  if (ce) return ce;
  return null;
}

// Test each ammo type
const unresolved: string[] = [];
const resolved: string[] = [];
for (const ammo of topAmmo) {
  const result = resolveAmmoByPattern(ammo);
  if (!result || result.bv === 0) {
    unresolved.push(ammo);
  } else {
    resolved.push(`${ammo} -> bv:${result.bv}`);
  }
}

console.log('=== UNRESOLVED AMMO ===');
for (const a of unresolved) console.log('  MISSING:', a);
console.log(`\n${unresolved.length} unresolved, ${resolved.length} resolved`);
