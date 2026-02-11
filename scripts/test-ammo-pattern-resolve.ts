/**
 * Test the actual resolveAmmoByPattern function for failing ammo types.
 * Imports the actual buildAmmoLookup and resolveAmmoByPattern logic.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveAmmoBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

// Replicate buildAmmoLookup from validate-bv.ts
function normalizeWeaponKey(id: string): string {
  let s = id.toLowerCase().replace(/^clan-/, '').replace(/^cl(?!uster)/, '').replace(/^\d+-/, '').replace(/prototype-?/g, '');
  const aliases: [RegExp, string][] = [
    [/^(?:is)?ultra-?ac-?(\d+)$/, 'uac-$1'], [/^(?:is)?ultraac(\d+)$/, 'uac-$1'],
    [/^(?:is)?lb-?(\d+)-?x-?ac$/, 'lb-$1-x-ac'], [/^(?:is)?lbxac(\d+)$/, 'lb-$1-x-ac'],
    [/^(?:is)?autocannon-?(\d+)$/, 'ac-$1'], [/^(?:is)?ac-?(\d+)$/, 'ac-$1'],
    [/^(?:is)?lrm-?(\d+)$/, 'lrm-$1'], [/^(?:is)?srm-?(\d+)$/, 'srm-$1'],
    [/^(?:is)?mrm-?(\d+)$/, 'mrm-$1'], [/^(?:is)?mml-?(\d+)$/, 'mml-$1'],
    [/^(?:is)?atm-?(\d+)$/, 'atm-$1'], [/^(?:is)?streak-?srm-?(\d+)$/, 'streak-srm-$1'],
    [/^(?:is)?hag-?(\d+)$/, 'hag-$1'], [/^(?:is)?gauss-?rifle$/, 'gauss-rifle'],
    [/^(?:is)?iatm-?(\d+)$/, 'iatm-$1'], [/^(?:is)?rac-?(\d+)$/, 'rac-$1'],
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

let ammoLookup: Map<string, { bv: number; weaponType: string }> | null = null;
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

  // Hardcoded entries (copy from validate-bv.ts)
  const hc: Array<[string, number, string]> = [
    ['mml-3-lrm-ammo', 4, 'mml-3'], ['mml-3-srm-ammo', 4, 'mml-3'],
    ['mml-5-lrm-ammo', 6, 'mml-5'], ['mml-5-srm-ammo', 6, 'mml-5'],
    ['mml-7-lrm-ammo', 8, 'mml-7'], ['mml-7-srm-ammo', 8, 'mml-7'],
    ['mml-9-lrm-ammo', 11, 'mml-9'], ['mml-9-srm-ammo', 11, 'mml-9'],
    ['plasma-rifle-ammo', 26, 'plasma-rifle'], ['isplasmarifleammo', 26, 'plasma-rifle'],
    ['clan-plasma-cannon-ammo', 21, 'plasma-cannon'], ['clplasmacannonammo', 21, 'plasma-cannon'],
    ['streak-srm-ammo', 17, 'streak-srm-2'],
    ['clan-streak-srm-2-ammo', 5, 'streak-srm-2'], ['clan-streak-srm-4-ammo', 10, 'streak-srm-4'], ['clan-streak-srm-6-ammo', 15, 'streak-srm-6'],
    ['streak-srm-2-ammo', 4, 'streak-srm-2'], ['streak-srm-4-ammo', 7, 'streak-srm-4'], ['streak-srm-6-ammo', 11, 'streak-srm-6'],
    ['is-streak-srm-2-ammo', 4, 'streak-srm-2'], ['is-streak-srm-4-ammo', 7, 'streak-srm-4'], ['is-streak-srm-6-ammo', 11, 'streak-srm-6'],
    ['clan-ammo-lrm-5', 7, 'lrm-5'], ['clan-ammo-lrm-10', 14, 'lrm-10'], ['clan-ammo-lrm-15', 21, 'lrm-15'], ['clan-ammo-lrm-20', 27, 'lrm-20'],
    ['clan-ammo-srm-2', 3, 'srm-2'], ['clan-ammo-srm-4', 5, 'srm-4'], ['clan-ammo-srm-6', 7, 'srm-6'],
    ['mrm-10-ammo', 7, 'mrm-10'], ['mrm-20-ammo', 14, 'mrm-20'], ['mrm-30-ammo', 21, 'mrm-30'], ['mrm-40-ammo', 28, 'mrm-40'],
    ['ammo-mrm-10', 7, 'mrm-10'], ['ammo-mrm-20', 14, 'mrm-20'], ['ammo-mrm-30', 21, 'mrm-30'], ['ammo-mrm-40', 28, 'mrm-40'],
    ['is-uac-2-ammo', 7, 'uac-2'], ['is-uac-5-ammo', 14, 'uac-5'],
    ['clan-uac-2-ammo', 8, 'uac-2'], ['clan-uac-5-ammo', 15, 'uac-5'], ['clan-uac-20-ammo', 42, 'uac-20'],
    ['is-lb-2-x-ammo', 5, 'lb-2-x-ac'], ['is-lb-5-x-ammo', 10, 'lb-5-x-ac'],
    ['clan-lb-2-x-ammo', 6, 'lb-2-x-ac'], ['clan-lb-5-x-ammo', 12, 'lb-5-x-ac'],
    ['clan-lb-2-x-cluster-ammo', 6, 'lb-2-x-ac'], ['clan-lb-5-x-cluster-ammo', 12, 'lb-5-x-ac'],
    ['hag-20-ammo', 33, 'hag-20'], ['hag-30-ammo', 50, 'hag-30'], ['hag-40-ammo', 67, 'hag-40'],
    ['rac-2-ammo', 15, 'rac-2'], ['rac-5-ammo', 31, 'rac-5'],
    ['clan-rac-2-ammo', 20, 'rac-2'], ['clan-rac-5-ammo', 43, 'rac-5'], ['clan-rac-20-ammo', 59, 'rac-20'],
    ['hvac-2-ammo', 7, 'hvac-2'], ['hvac-5-ammo', 11, 'hvac-5'], ['hvac-10-ammo', 20, 'hvac-10'],
    ['thunderbolt-5-ammo', 8, 'thunderbolt-5'], ['thunderbolt-10-ammo', 16, 'thunderbolt-10'],
    ['thunderbolt-15-ammo', 29, 'thunderbolt-15'], ['thunderbolt-20-ammo', 38, 'thunderbolt-20'],
    ['clan-improved-lrm-5-ammo', 7, 'lrm-5'], ['clan-improved-lrm-10-ammo', 14, 'lrm-10'],
    ['clan-improved-lrm-15-ammo', 21, 'lrm-15'], ['clan-improved-lrm-20-ammo', 27, 'lrm-20'],
    ['fluid-gun-ammo', 1, 'fluid-gun'],
    ['clan-streak-lrm-5-ammo', 11, 'streak-lrm-5'], ['clan-streak-lrm-10-ammo', 22, 'streak-lrm-10'],
    ['clan-streak-lrm-15-ammo', 32, 'streak-lrm-15'], ['clan-streak-lrm-20-ammo', 43, 'streak-lrm-20'],
    ['clan-protomech-ac-2-ammo', 4, 'protomech-ac-2'], ['clan-protomech-ac-4-ammo', 6, 'protomech-ac-4'], ['clan-protomech-ac-8-ammo', 8, 'protomech-ac-8'],
    ['longtomcannonammo', 41, 'long-tom'], ['islongtomcannonammo', 41, 'long-tom'],
    ['snipercannonammo', 10, 'sniper'], ['issnipercannonammo', 10, 'sniper'],
    ['thumpercannonammo', 5, 'thumper'], ['isthumpercannonammo', 5, 'thumper'],
    ['magshotgr-ammo', 2, 'magshot'],
    ['taser-ammo', 5, 'mech-taser'],
    ['impgaussammo', 40, 'improved-gauss-rifle'], ['climpgaussammo', 40, 'improved-gauss-rifle'],
    ['ammo-lrtorpedo-5', 6, 'lrm-5'], ['ammo-lrtorpedo-10', 11, 'lrm-10'],
    ['ammo-lrtorpedo-15', 17, 'lrm-15'], ['ammo-lrtorpedo-20', 23, 'lrm-20'],
    ['ammo-srtorpedo-2', 3, 'srm-2'], ['ammo-srtorpedo-4', 5, 'srm-4'], ['ammo-srtorpedo-6', 7, 'srm-6'],
    ['clan-sc-mortar-1-ammo', 1, 'mech-mortar-1'], ['clan-sc-mortar-2-ammo', 2, 'mech-mortar-2'],
    ['clan-sc-mortar-4-ammo', 4, 'mech-mortar-4'], ['clan-sc-mortar-8-ammo', 8, 'mech-mortar-8'],
    ['is-sc-mortar-1-ammo', 1, 'mech-mortar-1'], ['is-sc-mortar-2-ammo', 2, 'mech-mortar-2'],
    ['is-sc-mortar-4-ammo', 4, 'mech-mortar-4'], ['is-sc-mortar-8-ammo', 8, 'mech-mortar-8'],
    ['lb-2-x-cluster-ammo', 6, 'lb-2-x-ac'], ['lb-5-x-cluster-ammo', 12, 'lb-5-x-ac'],
    ['clan-medium-chemical-laser-ammo', 5, 'medium-chemical-laser'],
    ['clan-heavy-flamer-ammo', 1, 'heavy-flamer'], ['cl-heavy-flamer-ammo', 1, 'heavy-flamer'],
    ['clan-improved-gauss-ammo', 40, 'improved-gauss-rifle'],
    ['clanimprovedlrm5ammo', 7, 'lrm-5'], ['clanimprovedlrm10ammo', 14, 'lrm-10'],
    ['clanimprovedlrm15ammo', 21, 'lrm-15'], ['clanimprovedlrm20ammo', 27, 'lrm-20'],
    ['light-machine-gun-ammo-half', 1, 'light-machine-gun'],
    ['clan-light-machine-gun-ammo-half', 1, 'light-machine-gun'],
    ['heavy-machine-gun-ammo-half', 1, 'heavy-machine-gun'],
    ['clan-heavy-machine-gun-ammo-half', 1, 'heavy-machine-gun'],
    ['machine-gun-ammo-half', 1, 'machine-gun'],
    ['clan-machine-gun-ammo-half', 1, 'machine-gun'],
    ['inarc-ammo', 6, 'improved-narc'], ['narc-ammo', 6, 'narc-beacon'],
    ['clan-narc-ammo', 6, 'narc-beacon'],
  ];
  for (const [id, bv, wt] of hc) {
    if (!ammoLookup.has(id)) ammoLookup.set(id, { bv, weaponType: wt });
    const canon = id.replace(/[^a-z0-9]/g, '');
    if (!ammoLookup.has(canon)) ammoLookup.set(canon, { bv, weaponType: wt });
  }

  return ammoLookup;
}

// Test the top failing ammo types through the full resolve path
const failingAmmoNames = [
  "Clan Ammo iATM-12",
  "Clan Ammo iATM-9",
  "HAG/40 Ammo",
  "Clan Ultra AC/20 Ammo",
  "HAG/30 Ammo",
  "HAG/20 Ammo",
  "IS Ammo SRM-6",
  "Clan Ammo LRTorpedo-15 (Clan) Artemis V-capable",
  "Taser Ammo",
  "Clan Gauss Ammo",
  "Clan Streak SRM 6 Ammo",
  "ISMagshotGR Ammo",
  "Clan Ultra AC/10 Ammo",
  "ISLRM5 Ammo",
  "CLRotaryAC5 Ammo",
  "ISRotaryAC5 Ammo",
  "IS Ammo SRM-4",
  "Clan Ammo SC Mortar-8",
  "IS Ammo SRM-2",
  "IS Ammo LRM-15",
  "Clan Ammo SRM-6",
  "Clan Ammo LRM-10",
  "IS Machine Gun Ammo - Half",
  "CLAPGaussRifle Ammo",
  "Clan Ammo LRM-20 (Clan) Artemis V-capable",
  "IS Ammo AC/5",
  "ISLBXAC10 CL Ammo",
  "ISLBXAC10 Ammo",
  "ISLRM10 Ammo Artemis-capable",
  "Silver Bullet Gauss Ammo",
];

const lu = buildAmmoLookup();
console.log('=== FULL AMMO PATTERN RESOLUTION TEST ===');

for (const name of failingAmmoNames) {
  const clean = name.replace(/\s*\(omnipod\)/gi, '').trim();
  const norm = normalizeEquipmentId(clean);

  // Direct lookup
  let result = lu.get(norm);
  if (!result) result = lu.get(norm + '-ammo');

  // Pattern matching (replicate the stripped + rules approach)
  const lo = clean.toLowerCase();
  const stripped = lo
    .replace(/\s*\((?:clan|is)\)\s*/g, '')
    .replace(/\s*-\s*(?:full|half|proto)\s*$/g, '')
    .replace(/\s*\(\d+\)\s*$/g, '')
    .replace(/\s*(?:artemis(?:\s*v)?|narc)-?capable/gi, '')
    .trim();

  // Manually test key patterns
  let matched = false;
  let matchedId = '';
  let matchedBV = 0;

  // Check various regex patterns from validate-bv.ts
  const patterns: Array<{ re: RegExp; ids: (m: RegExpMatchArray) => string[] }> = [
    { re: /^(?:is\s*)?ammo\s+srm-(\d+)$/, ids: m => [`ammo-srm-${m[1]}`] },
    { re: /^(?:is\s*)?ammo\s+lrm-(\d+)$/, ids: m => [`ammo-lrm-${m[1]}`] },
    { re: /^(?:is\s*)?ammo\s+ac[/-](\d+)$/, ids: m => [`ac-${m[1]}-ammo`] },
    { re: /^(?:is\s*)?lrm(\d+)\s*ammo$/, ids: m => [`ammo-lrm-${m[1]}`] },
    { re: /^(?:is\s*)?lbxac(\d+)\s*ammo$/, ids: m => [`is-lb-${m[1]}-x-ammo`, `lb-${m[1]}-x-ammo`] },
    { re: /^(?:is\s*)?lbxac(\d+)\s+cl\s*ammo$/, ids: m => [`is-lb-${m[1]}-x-cluster-ammo`, `lb-${m[1]}-x-cluster-ammo`] },
    { re: /^(?:is\s*)?rotaryac(\d+)\s*ammo$/, ids: m => [`rotaryac${m[1]}`] },
    { re: /^(?:is\s*)?magshotgr\s*ammo$/, ids: _ => [`magshotgr-ammo`] },
    { re: /^(?:mek\s*)?taser\s*ammo$/, ids: _ => [`taser-ammo`] },
    { re: /^silver\s*bullet\s*gauss\s*ammo$/, ids: _ => [`silver-bullet-gauss`] },
    { re: /^cl(?:an)?\s*ammo\s+iatm-(\d+)$/, ids: m => [`clan-ammo-iatm-${m[1]}`] },
    { re: /^cl(?:an)?\s*ultra\s*ac[/-](\d+)\s*ammo$/, ids: m => [`clan-uac-${m[1]}-ammo`, `uac-${m[1]}-ammo`] },
    { re: /^cl(?:an)?\s*ammo\s+lrm-(\d+)$/, ids: m => [`clan-ammo-lrm-${m[1]}`, `ammo-lrm-${m[1]}`] },
    { re: /^cl(?:an)?\s*ammo\s+srm-(\d+)$/, ids: m => [`clan-ammo-srm-${m[1]}`, `ammo-srm-${m[1]}`] },
    { re: /^cl(?:an)?\s*streak\s*srm\s*(\d+)\s*ammo$/, ids: m => [`clan-streak-srm-${m[1]}-ammo`, `clan-streak-srm-${m[1]}`, `streak-srm-ammo`] },
    { re: /^cl(?:an)?\s*gauss\s*ammo$/, ids: _ => [`gauss-ammo`] },
    { re: /^cl(?:an)?\s*rotaryac(\d+)\s*ammo$/, ids: m => [`clanrotaryac${m[1]}`, `rac-${m[1]}-ammo`] },
    { re: /^cl(?:an)?\s*apgaussrifle\s*ammo$/, ids: _ => [`ap-gauss-ammo`, `apgaussrifle`] },
    { re: /^cl(?:an)?\s*ammo\s+sc\s*mortar-(\d+)$/, ids: m => [`clan-sc-mortar-${m[1]}-ammo`, `is-sc-mortar-${m[1]}-ammo`] },
    { re: /^cl(?:an)?\s*ammo\s+lrtorpedo-(\d+)$/, ids: m => [`ammo-lrtorpedo-${m[1]}`, `ammo-lrm-${m[1]}`] },
    { re: /^hag[/-](\d+)\s*ammo$/, ids: m => [`hag-${m[1]}-ammo`, `gauss-ammo`] },
    { re: /^hyper-assault\s*gauss\s*rifle[/-](\d+)\s*ammo$/, ids: m => [`hag-${m[1]}-ammo`, `gauss-ammo`] },
    { re: /^(?:is\s*)?machine\s*gun\s*ammo$/, ids: _ => [`mg-ammo`, `ammo-mg-full`] },
  ];

  for (const p of patterns) {
    const m = stripped.match(p.re);
    if (m) {
      for (const id of p.ids(m)) {
        const found = lu.get(id);
        if (found && found.bv > 0) {
          matched = true;
          matchedId = id;
          matchedBV = found.bv;
          break;
        }
      }
      if (!matched) {
        // Pattern matched but no lookup entry
        matchedId = `PATTERN MATCHED → ids=[${p.ids(m).join(', ')}] (NOT IN LOOKUP)`;
      }
      break;
    }
  }

  // Canon key fallback
  if (!matched && !matchedId) {
    const canonKey = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
    const ce = lu.get(canonKey);
    if (ce && ce.bv > 0) {
      matched = true;
      matchedId = `canon:${canonKey}`;
      matchedBV = ce.bv;
    }
  }

  const status = matched ? `OK (bv=${matchedBV} via ${matchedId})` : (matchedId ? `FAIL: ${matchedId}` : 'FAIL: no pattern matched');
  console.log(`  "${name.padEnd(52)}" stripped="${stripped.padEnd(45)}" → ${status}`);
}
