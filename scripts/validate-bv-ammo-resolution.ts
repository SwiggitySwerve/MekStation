import * as fs from 'fs';
import * as path from 'path';

import { normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

// === AMMO WEAPON KEY NORMALIZATION ===
// MegaMek matches ammo to weapons by ammoType:rackSize. We normalize both
// ammo weaponType and weapon IDs to a common key for matching.
export function normalizeWeaponKey(id: string): string {
  let s = id
    .toLowerCase()
    .replace(/^clan-/, '')
    .replace(/^cl(?!uster)/, '')
    .replace(/^\d+-/, '')
    .replace(/prototype-?/g, '');
  // Normalize common aliases to canonical forms
  const aliases: [RegExp, string][] = [
    [/^(?:is)?ultra-?ac-?(\d+)$/, 'uac-$1'],
    [/^(?:is)?ultraac(\d+)$/, 'uac-$1'],
    [/^(?:is)?ultra-?autocannon-?(\d+)$/, 'uac-$1'],
    [/^(?:is)?rotary-?ac-?(\d+)$/, 'rac-$1'],
    [/^(?:is)?rotaryac(\d+)$/, 'rac-$1'],
    [/^(?:is)?lb-?(\d+)-?x-?ac$/, 'lb-$1-x-ac'],
    [/^(?:is)?lbxac(\d+)$/, 'lb-$1-x-ac'],
    [/^(?:is)?lb(\d+)xac$/, 'lb-$1-x-ac'],
    [/^(?:is)?lb-?(\d+)-?x-?autocannon$/, 'lb-$1-x-ac'],
    [/^(?:is)?autocannon-?(\d+)$/, 'ac-$1'],
    [/^(?:is)?ac-?(\d+)$/, 'ac-$1'],
    [/^(?:is)?light-?ac-?(\d+)$/, 'lac-$1'],
    [/^(?:is)?lac-?(\d+)$/, 'lac-$1'],
    [/^(?:is)?lrm-?(\d+)$/, 'lrm-$1'],
    [/^(?:is)?srm-?(\d+)$/, 'srm-$1'],
    [/^(?:is)?mrm-?(\d+)$/, 'mrm-$1'],
    [/^(?:is)?mml-?(\d+)$/, 'mml-$1'],
    [/^(?:is)?atm-?(\d+)$/, 'atm-$1'],
    [/^(?:is)?streak-?srm-?(\d+)$/, 'streak-srm-$1'],
    [/^(?:is)?streaksrm(\d+)$/, 'streak-srm-$1'],
    [/^(?:is)?streak-?lrm-?(\d+)$/, 'streak-lrm-$1'],
    [/^(?:is)?streaklrm(\d+)$/, 'streak-lrm-$1'],
    [/^(?:is)?hag-?(\d+)$/, 'hag-$1'],
    [/^(?:is)?hag(\d+)$/, 'hag-$1'],
    [/^hyper-?assault-?gauss-?rifle-?(\d+)$/, 'hag-$1'],
    [/^(?:is)?hyper-?velocity-?(?:auto-?cannon|ac)-?(\d+)$/, 'hvac-$1'],
    [/^(?:is)?hvac-?(\d+)$/, 'hvac-$1'],
    [/^(?:is)?thunderbolt-?(\d+)$/, 'thunderbolt-$1'],
    [/^(?:is)?gauss-?rifle$/, 'gauss-rifle'],
    [/^gauss$/, 'gauss-rifle'],
    [/^(?:is)?light-?gauss-?rifle$/, 'light-gauss-rifle'],
    [/^light-?gauss$/, 'light-gauss-rifle'],
    [/^(?:is)?heavy-?gauss-?rifle$/, 'heavy-gauss-rifle'],
    [/^heavygauss$/, 'heavy-gauss-rifle'],
    [/^(?:is)?improved-?heavy-?gauss-?rifle$/, 'improved-heavy-gauss-rifle'],
    [/^improvedheavygauss$/, 'improved-heavy-gauss-rifle'],
    [/^(?:is)?ap-?gauss-?rifle$/, 'ap-gauss-rifle'],
    [/^apgaussrifle$/, 'ap-gauss-rifle'],
    [/^(?:is)?silver-?bullet-?gauss-?rifle$/, 'silver-bullet-gauss-rifle'],
    [/^silver-?bullet-?gauss$/, 'silver-bullet-gauss-rifle'],
    [/^impgauss(?:ammo)?$/, 'improved-gauss-rifle'],
    [/^improved-?gauss$/, 'improved-gauss-rifle'],
    [/^(?:is)?plasma-?rifle$/, 'plasma-rifle'],
    [/^(?:is)?plasma-?cannon$/, 'plasma-cannon'],
    [/^(?:is)?machine-?gun$/, 'machine-gun'],
    [/^(?:is)?light-?machine-?gun$/, 'light-machine-gun'],
    [/^(?:is)?heavy-?machine-?gun$/, 'heavy-machine-gun'],
    [/^(?:is)?anti-?missile-?system$/, 'ams'],
    [/^(?:is)?ams$/, 'ams'],
    [/^(?:is)?arrow-?iv(?:-?launcher)?$/, 'arrow-iv'],
    [/^arrowiv$/, 'arrow-iv'],
    [/^(?:is)?narc$/, 'narc'],
    [/^(?:is)?inarc$/, 'inarc'],
    [/^sniper(?:cannon)?$/, 'sniper'],
    [/^longtom(?:cannon)?$/, 'long-tom'],
    [/^thumper(?:cannon)?$/, 'thumper'],
    [/^mg$/, 'machine-gun'],
    [/^lightmg$/, 'light-machine-gun'],
    [/^heavymg$/, 'heavy-machine-gun'],
    [/^rotaryac(\d+)$/, 'rac-$1'],
    [/^(?:is)?lrt-?(\d+)$/, 'lrm-$1'],
    [/^(?:is)?srt-?(\d+)$/, 'srm-$1'],
    [/^(?:is)?protomech-?ac-?(\d+)$/, 'protomech-ac-$1'],
    [/^(?:is)?protomechac(\d+)$/, 'protomech-ac-$1'],
    [/^(?:is)?iatm-?(\d+)$/, 'iatm-$1'],
    [/^(?:is)?enhanced-?lrm-?(\d+)$/, 'enhanced-lrm-$1'],
    [/^(?:is)?enhancedlrm(\d+)$/, 'enhanced-lrm-$1'],
    [/^(?:is)?extended-?lrm-?(\d+)$/, 'extended-lrm-$1'],
  ];
  for (const [re, rep] of aliases) {
    if (re.test(s)) return s.replace(re, rep);
  }
  return s;
}

// === PATTERN-BASED AMMO RESOLUTION (BV from catalog, not hardcoded) ===
let ammoLookup: Map<string, { bv: number; weaponType: string }> | null = null;

function extractWeaponTypeFromAmmoId(ammoId: string): string {
  let s = ammoId
    .replace(/-ammo$/, '')
    .replace(/ammo$/, '')
    .replace(/^ammo-/, '')
    .replace(/^clan-ammo-/, '')
    .replace(/^clan-/, '');
  s = s.replace(
    /-(standard|er|he|iiw|imp|cluster|ap|precision|fragmentation|inferno|swarm|tandem-charge|thunder|explosive|ecm|haywire|nemesis|pods)$/,
    '',
  );
  s = s.replace(/-half$/, '').replace(/-full$/, '');
  return normalizeWeaponKey(s);
}

function buildAmmoLookup(): Map<string, { bv: number; weaponType: string }> {
  if (ammoLookup) return ammoLookup;
  ammoLookup = new Map();

  // Data-driven: load ammunition files from index.json (supports split files)
  const basePath = path.resolve(
    process.cwd(),
    'public/data/equipment/official',
  );
  let ammoFiles: string[] = ['ammunition.json'];
  try {
    const indexData = JSON.parse(
      fs.readFileSync(path.join(basePath, 'index.json'), 'utf-8'),
    );
    const ammoEntry = indexData?.files?.ammunition;
    if (
      ammoEntry &&
      typeof ammoEntry === 'object' &&
      !Array.isArray(ammoEntry)
    ) {
      ammoFiles = Object.values(ammoEntry) as string[];
    }
  } catch {
    /* fall back to ammunition.json */
  }

  for (const ammoFile of ammoFiles) {
    try {
      const d = JSON.parse(
        fs.readFileSync(path.join(basePath, ammoFile), 'utf-8'),
      );
      for (const item of (d.items || []) as Array<{
        id: string;
        battleValue: number;
        compatibleWeaponIds?: string[];
      }>) {
        const wt = item.compatibleWeaponIds?.[0]
          ? normalizeWeaponKey(item.compatibleWeaponIds[0])
          : extractWeaponTypeFromAmmoId(item.id);
        ammoLookup.set(item.id, { bv: item.battleValue, weaponType: wt });
        const canon = item.id.replace(/[^a-z0-9]/g, '');
        if (!ammoLookup.has(canon))
          ammoLookup.set(canon, { bv: item.battleValue, weaponType: wt });
      }
    } catch {
      /* ignore individual ammo file errors */
    }
  }

  const hc: Array<[string, number, string]> = [
    ['mml-3-lrm-ammo', 4, 'mml-3'],
    ['mml-3-srm-ammo', 4, 'mml-3'],
    ['mml-5-lrm-ammo', 6, 'mml-5'],
    ['mml-5-srm-ammo', 6, 'mml-5'],
    ['mml-7-lrm-ammo', 8, 'mml-7'],
    ['mml-7-srm-ammo', 8, 'mml-7'],
    ['mml-9-lrm-ammo', 11, 'mml-9'],
    ['mml-9-srm-ammo', 11, 'mml-9'],
    ['plasma-rifle-ammo', 26, 'plasma-rifle'],
    ['isplasmarifleammo', 26, 'plasma-rifle'],
    ['heavy-rifle-ammo', 11, 'heavy-rifle'],
    ['medium-rifle-ammo', 6, 'medium-rifle'],
    ['light-rifle-ammo', 3, 'light-rifle'],
    ['clan-plasma-cannon-ammo', 21, 'plasma-cannon'],
    ['clplasmacannonammo', 21, 'plasma-cannon'],
    ['streak-srm-ammo', 17, 'streak-srm-2'],
    // Clan Streak SRM (higher BV than IS)
    ['clan-streak-srm-2-ammo', 5, 'streak-srm-2'],
    ['clan-streak-srm-4-ammo', 10, 'streak-srm-4'],
    ['clan-streak-srm-6-ammo', 15, 'streak-srm-6'],
    // IS Streak SRM (lower BV than Clan)
    ['streak-srm-2-ammo', 4, 'streak-srm-2'],
    ['streak-srm-4-ammo', 7, 'streak-srm-4'],
    ['streak-srm-6-ammo', 11, 'streak-srm-6'],
    ['is-streak-srm-2-ammo', 4, 'streak-srm-2'],
    ['is-streak-srm-4-ammo', 7, 'streak-srm-4'],
    ['is-streak-srm-6-ammo', 11, 'streak-srm-6'],
    // Clan LRM per-size (higher BV than IS: 7/14/21/27 vs 6/11/17/23)
    ['clan-ammo-lrm-5', 7, 'lrm-5'],
    ['clan-ammo-lrm-10', 14, 'lrm-10'],
    ['clan-ammo-lrm-15', 21, 'lrm-15'],
    ['clan-ammo-lrm-20', 27, 'lrm-20'],
    // Clan SRM per-size (same BV as IS: 3/5/7)
    ['clan-ammo-srm-2', 3, 'srm-2'],
    ['clan-ammo-srm-4', 5, 'srm-4'],
    ['clan-ammo-srm-6', 7, 'srm-6'],
    // MRM per-size (7/14/21/28 per MegaMek)
    ['mrm-10-ammo', 7, 'mrm-10'],
    ['mrm-20-ammo', 14, 'mrm-20'],
    ['mrm-30-ammo', 21, 'mrm-30'],
    ['mrm-40-ammo', 28, 'mrm-40'],
    ['ammo-mrm-10', 7, 'mrm-10'],
    ['ammo-mrm-20', 14, 'mrm-20'],
    ['ammo-mrm-30', 21, 'mrm-30'],
    ['ammo-mrm-40', 28, 'mrm-40'],
    // IS UAC ammo (correct IS values - catalog has Clan values for some)
    ['is-uac-2-ammo', 7, 'uac-2'],
    ['is-uac-5-ammo', 14, 'uac-5'],
    // Clan UAC ammo (where different from IS)
    ['clan-uac-2-ammo', 8, 'uac-2'],
    ['clan-uac-5-ammo', 15, 'uac-5'],
    ['clan-uac-20-ammo', 42, 'uac-20'],
    // IS LB-X ammo (correct IS values)
    ['is-lb-2-x-ammo', 5, 'lb-2-x-ac'],
    ['is-lb-5-x-ammo', 10, 'lb-5-x-ac'],
    // Clan LB-X ammo (where different from IS)
    ['clan-lb-2-x-ammo', 6, 'lb-2-x-ac'],
    ['clan-lb-5-x-ammo', 12, 'lb-5-x-ac'],
    ['clan-lb-2-x-cluster-ammo', 6, 'lb-2-x-ac'],
    ['clan-lb-5-x-cluster-ammo', 12, 'lb-5-x-ac'],
    ['hag-20-ammo', 33, 'hag-20'],
    ['hag-30-ammo', 50, 'hag-30'],
    ['hag-40-ammo', 67, 'hag-40'],
    ['rac-2-ammo', 15, 'rac-2'],
    ['rac-5-ammo', 31, 'rac-5'],
    ['clan-rac-2-ammo', 20, 'rac-2'],
    ['clan-rac-5-ammo', 43, 'rac-5'],
    ['clan-rac-20-ammo', 59, 'rac-20'],
    ['clanrotaryac2', 20, 'rac-2'],
    ['clanrotaryac5', 43, 'rac-5'],
    ['hvac-2-ammo', 7, 'hvac-2'],
    ['hvac-5-ammo', 11, 'hvac-5'],
    ['hvac-10-ammo', 20, 'hvac-10'],
    ['thunderbolt-5-ammo', 8, 'thunderbolt-5'],
    ['thunderbolt-10-ammo', 16, 'thunderbolt-10'],
    ['thunderbolt-15-ammo', 29, 'thunderbolt-15'],
    ['thunderbolt-20-ammo', 38, 'thunderbolt-20'],
    // Clan Improved LRM uses IS-equivalent BV (not Clan LRM BV — it's an experimental
    // Clan weapon with IS performance: min range 6, weapon BV matches IS LRM, MegaMek LRM_IMP type)
    ['clan-improved-lrm-5-ammo', 6, 'improved-lrm-5'],
    ['clan-improved-lrm-10-ammo', 11, 'improved-lrm-10'],
    ['clan-improved-lrm-15-ammo', 17, 'improved-lrm-15'],
    ['clan-improved-lrm-20-ammo', 23, 'improved-lrm-20'],
    // Fluid Gun
    ['fluid-gun-ammo', 1, 'fluid-gun'],
    // Clan Streak LRM per-size
    ['clan-streak-lrm-5-ammo', 11, 'streak-lrm-5'],
    ['clan-streak-lrm-10-ammo', 22, 'streak-lrm-10'],
    ['clan-streak-lrm-15-ammo', 32, 'streak-lrm-15'],
    ['clan-streak-lrm-20-ammo', 43, 'streak-lrm-20'],
    // Clan ProtoMech AC
    ['clan-protomech-ac-2-ammo', 4, 'protomech-ac-2'],
    ['clan-protomech-ac-4-ammo', 6, 'protomech-ac-4'],
    ['clan-protomech-ac-8-ammo', 8, 'protomech-ac-8'],
    // Long Tom Cannon
    ['longtomcannonammo', 41, 'long-tom'],
    ['islongtomcannonammo', 41, 'long-tom'],
    ['snipercannonammo', 10, 'sniper'],
    ['issnipercannonammo', 10, 'sniper'],
    ['thumpercannonammo', 5, 'thumper'],
    ['isthumpercannonammo', 5, 'thumper'],
    // Magshot
    ['magshotgr-ammo', 2, 'magshot'],
    // Taser
    ['taser-ammo', 5, 'mech-taser'],
    // Improved Gauss (Clan)
    ['impgaussammo', 40, 'improved-gauss-rifle'],
    ['climpgaussammo', 40, 'improved-gauss-rifle'],
    // LR/SR Torpedo (IS values)
    ['ammo-lrtorpedo-5', 6, 'lrm-5'],
    ['ammo-lrtorpedo-10', 11, 'lrm-10'],
    ['ammo-lrtorpedo-15', 17, 'lrm-15'],
    ['ammo-lrtorpedo-20', 23, 'lrm-20'],
    ['ammo-srtorpedo-2', 3, 'srm-2'],
    ['ammo-srtorpedo-4', 5, 'srm-4'],
    ['ammo-srtorpedo-6', 7, 'srm-6'],
    // Clan LRT ammo has higher BV than IS (per MegaMek AmmoType.java)
    ['clan-ammo-lrtorpedo-5', 7, 'lrm-5'],
    ['clan-ammo-lrtorpedo-10', 14, 'lrm-10'],
    ['clan-ammo-lrtorpedo-15', 21, 'lrm-15'],
    ['clan-ammo-lrtorpedo-20', 27, 'lrm-20'],
    ['clan-sc-mortar-1-ammo', 1, 'mortar-1'],
    ['clan-sc-mortar-2-ammo', 2, 'mortar-2'],
    ['clan-sc-mortar-4-ammo', 4, 'mortar-4'],
    ['clan-sc-mortar-8-ammo', 8, 'mortar-8'],
    ['is-sc-mortar-1-ammo', 1, 'mortar-1'],
    ['is-sc-mortar-2-ammo', 2, 'mortar-2'],
    ['is-sc-mortar-4-ammo', 4, 'mortar-4'],
    ['is-sc-mortar-8-ammo', 8, 'mortar-8'],
    ['lb-2-x-cluster-ammo', 6, 'lb-2-x-ac'],
    ['lb-5-x-cluster-ammo', 12, 'lb-5-x-ac'],
    ['clan-medium-chemical-laser-ammo', 5, 'medium-chemical-laser'],
    ['clan-heavy-flamer-ammo', 1, 'heavy-flamer'],
    ['cl-heavy-flamer-ammo', 1, 'heavy-flamer'],
    ['clan-improved-gauss-ammo', 40, 'improved-gauss-rifle'],
    // Clan Improved LRM ammo: overrides block sets correct IS BV + weaponType
    ['light-machine-gun-ammo-half', 1, 'light-machine-gun'],
    ['clan-light-machine-gun-ammo-half', 1, 'light-machine-gun'],
    ['heavy-machine-gun-ammo-half', 1, 'heavy-machine-gun'],
    ['clan-heavy-machine-gun-ammo-half', 1, 'heavy-machine-gun'],
    ['machine-gun-ammo-half', 1, 'machine-gun'],
    ['clan-machine-gun-ammo-half', 1, 'machine-gun'],
    ['inarc-ammo', 6, 'improved-narc'],
    ['narc-ammo', 6, 'narc-beacon'],
    ['clan-narc-ammo', 6, 'narc-beacon'],
  ];
  for (const [id, bv, wt] of hc) {
    if (!ammoLookup.has(id)) ammoLookup.set(id, { bv, weaponType: wt });
    const canon = id.replace(/[^a-z0-9]/g, '');
    if (!ammoLookup.has(canon)) ammoLookup.set(canon, { bv, weaponType: wt });
  }

  // Force-override: catalog entries with known wrong BV values (UNOFFICIAL entries)
  // These ALWAYS overwrite any catalog value, unlike the `hc` list above.
  const overrides: Array<[string, number, string]> = [
    // Mortar ammo (SC = Semi-Guided Cluster): must override any catalog defaults
    ['clan-sc-mortar-1-ammo', 1, 'mortar-1'],
    ['clan-sc-mortar-2-ammo', 2, 'mortar-2'],
    ['clan-sc-mortar-4-ammo', 4, 'mortar-4'],
    ['clan-sc-mortar-8-ammo', 8, 'mortar-8'],
    ['is-sc-mortar-1-ammo', 1, 'mortar-1'],
    ['is-sc-mortar-2-ammo', 2, 'mortar-2'],
    ['is-sc-mortar-4-ammo', 4, 'mortar-4'],
    ['is-sc-mortar-8-ammo', 8, 'mortar-8'],
    // Clan Improved LRM ammo: catalog has correct IS-equivalent BV (6/11/17/23) but
    // extractWeaponTypeFromAmmoId generates wrong weaponType ("animprovedlrmN") from the
    // "clanimprovedlrmNammo" ID. Override to set correct weaponType for ammo-weapon matching.
    ['clanimprovedlrm5ammo', 6, 'improved-lrm-5'],
    ['clanimprovedlrm10ammo', 11, 'improved-lrm-10'],
    ['clanimprovedlrm15ammo', 17, 'improved-lrm-15'],
    ['clanimprovedlrm20ammo', 23, 'improved-lrm-20'],
  ];
  for (const [id, bv, wt] of overrides) {
    ammoLookup.set(id, { bv, weaponType: wt });
    const canon = id.replace(/[^a-z0-9]/g, '');
    ammoLookup.set(canon, { bv, weaponType: wt });
  }

  return ammoLookup;
}

export function resolveAmmoByPattern(
  name: string,
  _techBase: string,
): { bv: number; weaponType: string } | null {
  const lu = buildAmmoLookup();

  const clean = name
    .replace(/\s*\(omnipod\)/gi, '')
    .replace(/\s*\((?:Clan|IS)\)\s*(?:Artemis(?:\s*V)?|Narc)-?[Cc]apable/gi, '')
    .replace(/\s*(?:Artemis(?:\s*V)?|Narc)-?[Cc]apable/gi, '')
    .replace(/\|.*/g, '')
    .trim();

  // Early check for IS Streak SRM ammo: normalizeEquipmentId maps via name-mappings.json
  // to "clan-streak-srm-N" (Clan BV values). Intercept to use correct IS-specific BV.
  const isStreakMatch = clean.match(/^IS\s+Streak\s+SRM\s+(\d+)\s+Ammo$/i);
  if (isStreakMatch) {
    const key = `is-streak-srm-${isStreakMatch[1]}-ammo`;
    const found = lu.get(key);
    if (found) return found;
  }

  const norm = normalizeEquipmentId(clean);
  let e = lu.get(norm);
  if (e) return e;
  e = lu.get(norm + '-ammo');
  if (e) return e;

  const lo = clean.toLowerCase();
  const stripped = lo
    .replace(/\s*\((?:clan|is)\)\s*/g, '')
    .replace(/\s*-\s*(?:full|half|proto)\s*$/g, '')
    .replace(/\s*\(\d+\)\s*$/g, '')
    .trim();

  type Rule = { re: RegExp; ids: (m: RegExpMatchArray) => string[] };
  const rules: Rule[] = [
    { re: /^(?:is\s*)?ammo\s+ac[/-](\d+)$/, ids: (m) => [`ac-${m[1]}-ammo`] },
    {
      re: /^(?:is\s*)?ammo\s+ac[/-](\d+)\s+primitive$/,
      ids: (m) => [`ammo-ac-${m[1]}-primitive`],
    },
    { re: /^(?:is\s*)?ac(\d+)\s*ammo$/, ids: (m) => [`ac-${m[1]}-ammo`] },
    { re: /^(?:is\s*)?ammo\s+lrm-(\d+)$/, ids: (m) => [`ammo-lrm-${m[1]}`] },
    { re: /^(?:is\s*)?lrm(\d+)\s*ammo$/, ids: (m) => [`ammo-lrm-${m[1]}`] },
    { re: /^(?:is\s*)?ammo\s+srm-(\d+)$/, ids: (m) => [`ammo-srm-${m[1]}`] },
    { re: /^(?:is\s*)?srm(\d+)\s*ammo$/, ids: (m) => [`ammo-srm-${m[1]}`] },
    {
      re: /^(?:is\s*)?ammo\s+mml-(\d+)\s+lrm$/,
      ids: (m) => [`mml-${m[1]}-lrm-ammo`, `ammo-lrm-${m[1]}`],
    },
    {
      re: /^(?:is\s*)?ammo\s+mml-(\d+)\s+srm$/,
      ids: (m) => [`mml-${m[1]}-srm-ammo`, `ammo-srm-${m[1]}`],
    },
    {
      re: /^(?:is\s*)?mml(\d+)\s+lrm\s*ammo$/,
      ids: (m) => [`mml-${m[1]}-lrm-ammo`, `ammo-lrm-${m[1]}`],
    },
    {
      re: /^(?:is\s*)?mml(\d+)\s+srm\s*ammo$/,
      ids: (m) => [`mml-${m[1]}-srm-ammo`, `ammo-srm-${m[1]}`],
    },
    {
      re: /^(?:is\s*)?mrm(\d+)\s*ammo$/,
      ids: (m) => [
        `mrm-${m[1]}-ammo`,
        `ammo-mrm-${m[1]}`,
        `mrm-${m[1]}`,
        `mrm-ammo`,
      ],
    },
    {
      re: /^(?:is\s*)?ammo\s+mrm-(\d+)$/,
      ids: (m) => [
        `mrm-${m[1]}-ammo`,
        `ammo-mrm-${m[1]}`,
        `mrm-${m[1]}`,
        `mrm-ammo`,
      ],
    },
    {
      re: /^(?:is\s*)?ultraac(\d+)\s*ammo$/,
      ids: (m) => [`is-uac-${m[1]}-ammo`, `uac-${m[1]}-ammo`],
    },
    {
      re: /^(?:is\s*)?ammo\s+ultra\s*ac[/-](\d+)$/,
      ids: (m) => [`is-uac-${m[1]}-ammo`, `uac-${m[1]}-ammo`],
    },
    {
      re: /^(?:is\s*)?ultra\s*ac[/-](\d+)\s*ammo$/,
      ids: (m) => [`is-uac-${m[1]}-ammo`, `uac-${m[1]}-ammo`],
    },
    {
      re: /^(?:is\s*)?lbxac(\d+)\s*ammo$/,
      ids: (m) => [`is-lb-${m[1]}-x-ammo`, `lb-${m[1]}-x-ammo`],
    },
    {
      re: /^(?:is\s*)?lbxac(\d+)\s+cl\s*ammo$/,
      ids: (m) => [`is-lb-${m[1]}-x-cluster-ammo`, `lb-${m[1]}-x-cluster-ammo`],
    },
    {
      re: /^(?:is\s*)?lb\s*(\d+)-x\s*(?:ac\s*)?ammo$/,
      ids: (m) => [`is-lb-${m[1]}-x-ammo`, `lb-${m[1]}-x-ammo`],
    },
    {
      re: /^(?:is\s*)?lb\s*(\d+)-x\s*(?:ac\s*)?cluster\s*ammo$/,
      ids: (m) => [`is-lb-${m[1]}-x-cluster-ammo`, `lb-${m[1]}-x-cluster-ammo`],
    },
    {
      re: /^(?:is\s*)?lb\s*(\d+)-x\s*(?:ac\s*)?slug\s*ammo$/,
      ids: (m) => [`is-lb-${m[1]}-x-ammo`, `lb-${m[1]}-x-ammo`],
    },
    { re: /^(?:is\s*)?rotaryac(\d+)\s*ammo$/, ids: (m) => [`rotaryac${m[1]}`] },
    { re: /^(?:is\s*)?ammo\s+lac[/-](\d+)$/, ids: (m) => [`ammo-lac-${m[1]}`] },
    { re: /^(?:is\s*)?lac(\d+)\s*ammo$/, ids: (m) => [`ammo-lac-${m[1]}`] },
    {
      re: /^(?:is\s*)?ammo\s+hvac[/-](\d+)$/,
      ids: (m) => [`hvac-${m[1]}-ammo`],
    },
    {
      re: /^(?:is\s*)?ammo\s+extended\s*lrm-(\d+)$/,
      ids: (m) => [`ammo-extended-lrm-${m[1]}`],
    },
    {
      re: /^(?:is\s*)?enhancedlrm(\d+)\s*ammo$/,
      ids: (m) => [`enhancedlrm${m[1]}`],
    },
    {
      re: /^(?:is\s*)?ammo\s+thunderbolt-(\d+)$/,
      ids: (m) => [`thunderbolt-${m[1]}-ammo`, `lrm-ammo`],
    },
    {
      re: /^(?:is\s*)?thunderbolt(\d+)\s*ammo$/,
      ids: (m) => [`thunderbolt-${m[1]}-ammo`, `lrm-ammo`],
    },
    { re: /^(?:is\s*)?gauss\s*ammo$/, ids: (_) => [`gauss-ammo`] },
    {
      re: /^(?:is\s*)?light\s*gauss\s*ammo$/,
      ids: (_) => [`light-gauss-ammo`],
    },
    {
      re: /^(?:is\s*)?heavy\s*gauss\s*ammo$/,
      ids: (_) => [`heavy-gauss-ammo`],
    },
    {
      re: /^(?:is\s*)?improvedheavygauss\s*ammo$/,
      ids: (_) => [`improvedheavygauss`],
    },
    {
      re: /^(?:is\s*)?sbgauss(?:rifle)?\s*ammo$/,
      ids: (_) => [`silver-bullet-gauss`],
    },
    {
      re: /^silver\s*bullet\s*gauss\s*ammo$/,
      ids: (_) => [`silver-bullet-gauss`],
    },
    {
      re: /^(?:is\s*)?plasmarifle?\s*ammo$/,
      ids: (_) => [`plasma-rifle-ammo`, `isplasmarifleammo`],
    },
    {
      re: /^(?:is\s*)?plasma\s*rifle\s*ammo$/,
      ids: (_) => [`plasma-rifle-ammo`, `isplasmarifleammo`],
    },
    { re: /^(?:is\s*)?fluidgun\s*ammo$/, ids: (_) => [`fluid-gun-ammo`] },
    { re: /^(?:is\s*)?(?:heavy\s*)?flamer\s*ammo$/, ids: (_) => [`mg-ammo`] },
    { re: /^(?:is\s*)?vehicle\s*flamer\s*ammo$/, ids: (_) => [`mg-ammo`] },
    { re: /^(?:is\s*)?mg\s*ammo$/, ids: (_) => [`mg-ammo`] },
    { re: /^(?:is\s*)?ammo\s+mg$/, ids: (_) => [`mg-ammo`, `ammo-mg-full`] },
    {
      re: /^(?:is\s*)?machine\s*gun\s*ammo$/,
      ids: (_) => [`mg-ammo`, `ammo-mg-full`],
    },
    {
      re: /^(?:is\s*)?heavy\s*machine\s*gun\s*ammo$/,
      ids: (_) => [`heavy-mg-ammo`, `heavy-machine-gun-ammo-full`],
    },
    {
      re: /^(?:is\s*)?light\s*machine\s*gun\s*ammo$/,
      ids: (_) => [`light-mg-ammo`, `light-machine-gun-ammo-full`],
    },
    { re: /^(?:is\s*)?ams\s*ammo$/, ids: (_) => [`ams-ammo`] },
    { re: /^(?:is\s*)?ammo\s+inarc$/, ids: (_) => [`inarc-ammo`] },
    { re: /^(?:is\s*)?ammo\s+narc$/, ids: (_) => [`narc-ammo`] },
    {
      re: /^(?:is\s*)?arrowiv\s*(?:cluster\s*)?ammo$/,
      ids: (_) => [`arrowivammo`],
    },
    { re: /^(?:is\s*)?arrowiv\s*homing\s*ammo$/, ids: (_) => [`arrowivammo`] },
    {
      re: /^(?:is\s*)?ammo\s+lrtorpedo-(\d+)$/,
      ids: (m) => [`ammo-lrtorpedo-${m[1]}`, `ammo-lrm-${m[1]}`],
    },
    {
      re: /^(?:is\s*)?ammo\s+srtorpedo-(\d+)$/,
      ids: (m) => [`ammo-srtorpedo-${m[1]}`, `ammo-srm-${m[1]}`],
    },
    {
      re: /^(?:is\s*)?ammo\s+heavy\s*rifle$/,
      ids: (_) => [`heavy-rifle-ammo`],
    },
    {
      re: /^(?:is\s*)?heavy\s*rifle\s*ammo$/,
      ids: (_) => [`heavy-rifle-ammo`],
    },
    {
      re: /^(?:is\s*)?ammo\s+medium\s*rifle$/,
      ids: (_) => [`medium-rifle-ammo`],
    },
    {
      re: /^(?:is\s*)?medium\s*rifle\s*ammo$/,
      ids: (_) => [`medium-rifle-ammo`],
    },
    {
      re: /^(?:is\s*)?ammo\s+light\s*rifle$/,
      ids: (_) => [`light-rifle-ammo`],
    },
    {
      re: /^(?:is\s*)?light\s*rifle\s*ammo$/,
      ids: (_) => [`light-rifle-ammo`],
    },
    { re: /^(?:is\s*)?ammo\s+nail[/-]rivet$/, ids: (_) => [`mg-ammo`] },
    { re: /^(?:is\s*)?magshotgr\s*ammo$/, ids: (_) => [`magshotgr-ammo`] },
    { re: /^(?:is\s*)?apds\s*ammo$/, ids: (_) => [`ams-ammo`] },
    {
      re: /^(?:is\s*)?snipercannonammo$/,
      ids: (_) => [`snipercannonammo`, `issnipercannonammo`],
    },
    {
      re: /^(?:is\s*)?longtomcannonammo$/,
      ids: (_) => [`longtomcannonammo`, `islongtomcannonammo`],
    },
    {
      re: /^(?:is\s*)?thumpercannonammo$/,
      ids: (_) => [`thumpercannonammo`, `isthumpercannonammo`],
    },
    { re: /^(?:mek\s*)?taser\s*ammo$/, ids: (_) => [`taser-ammo`] },
    {
      re: /^(?:is\s*)?streaksrm(\d+)\s*ammo$/,
      ids: (m) => [
        `is-streak-srm-${m[1]}-ammo`,
        `streak-srm-${m[1]}-ammo`,
        `streak-srm-ammo`,
      ],
    },
    {
      re: /^(?:is\s*)?streak\s*srm\s*(\d+)\s*ammo$/,
      ids: (m) => [
        `is-streak-srm-${m[1]}-ammo`,
        `streak-srm-${m[1]}-ammo`,
        `streak-srm-ammo`,
      ],
    },
    {
      re: /^(?:is\s*)?ammo\s+streak\s*srm-(\d+)$/,
      ids: (m) => [
        `is-streak-srm-${m[1]}-ammo`,
        `streak-srm-${m[1]}-ammo`,
        `streak-srm-ammo`,
      ],
    },
    {
      re: /^(?:is\s*)?lrt(\d+)\s*ammo$/,
      ids: (m) => [`ammo-lrtorpedo-${m[1]}`, `ammo-lrm-${m[1]}`],
    },
    {
      re: /^(?:is\s*)?srt(\d+)\s*ammo$/,
      ids: (m) => [`ammo-srtorpedo-${m[1]}`, `ammo-srm-${m[1]}`],
    },
    {
      re: /^(?:is\s*)?light\s*mg\s*ammo(?:\s*\(\d+\))?$/,
      ids: (_) => [`light-mg-ammo`, `light-machine-gun-ammo-full`],
    },
    { re: /^(?:is\s*)?impgauss\s*ammo$/, ids: (_) => [`impgaussammo`] },
    { re: /^(?:is\s*)?arrowiv\s+ammo$/, ids: (_) => [`arrowivammo`] },
    { re: /^(?:is\s*)?arrowiv\s+homing\s*ammo$/, ids: (_) => [`arrowivammo`] },
    { re: /^(?:is\s*)?arrowiv\s+cluster\s*ammo$/, ids: (_) => [`arrowivammo`] },
    {
      re: /^(?:is\s*)?sniper\s*cannon\s*ammo$/,
      ids: (_) => [`snipercannonammo`, `issnipercannonammo`],
    },
    {
      re: /^(?:is\s*)?long\s*tom\s*cannon\s*ammo$/,
      ids: (_) => [`longtomcannonammo`, `islongtomcannonammo`],
    },

    {
      re: /^cl(?:an)?\s*ammo\s+lrm-(\d+)$/,
      ids: (m) => [`clan-ammo-lrm-${m[1]}`, `ammo-lrm-${m[1]}`],
    },
    {
      re: /^cl(?:an)?\s*lrm(\d+)\s*ammo$/,
      ids: (m) => [`clan-ammo-lrm-${m[1]}`, `ammo-lrm-${m[1]}`],
    },
    {
      re: /^cl(?:an)?\s*ammo\s+srm-(\d+)$/,
      ids: (m) => [`clan-ammo-srm-${m[1]}`, `ammo-srm-${m[1]}`],
    },
    {
      re: /^cl(?:an)?\s*srm(\d+)\s*ammo$/,
      ids: (m) => [`clan-ammo-srm-${m[1]}`, `ammo-srm-${m[1]}`],
    },
    {
      re: /^cl(?:an)?\s*ammo\s+atm-(\d+)$/,
      ids: (m) => [`clan-ammo-atm-${m[1]}`, `atm-standard-ammo`],
    },
    {
      re: /^cl(?:an)?\s*ammo\s+atm-(\d+)\s+er$/,
      ids: (m) => [`clan-ammo-atm-${m[1]}-er`, `atm-er-ammo`],
    },
    {
      re: /^cl(?:an)?\s*ammo\s+atm-(\d+)\s+he$/,
      ids: (m) => [`clan-ammo-atm-${m[1]}-he`, `atm-he-ammo`],
    },
    {
      re: /^cl(?:an)?\s*atm(\d+)\s*ammo$/,
      ids: (m) => [`clan-ammo-atm-${m[1]}`, `atm-standard-ammo`],
    },
    {
      re: /^cl(?:an)?\s*atm(\d+)\s+er\s*ammo$/,
      ids: (m) => [`clan-ammo-atm-${m[1]}-er`, `atm-er-ammo`],
    },
    {
      re: /^cl(?:an)?\s*atm(\d+)\s+he\s*ammo$/,
      ids: (m) => [`clan-ammo-atm-${m[1]}-he`, `atm-he-ammo`],
    },
    {
      re: /^cl(?:an)?\s*ammo\s+iatm-(\d+)$/,
      ids: (m) => [`clan-ammo-iatm-${m[1]}`],
    },
    {
      re: /^cl(?:an)?\s*ultraac(\d+)\s*ammo$/,
      ids: (m) => [`clan-uac-${m[1]}-ammo`, `uac-${m[1]}-ammo`],
    },
    {
      re: /^cl(?:an)?\s*ultra\s*ac[/-](\d+)\s*ammo$/,
      ids: (m) => [`clan-uac-${m[1]}-ammo`, `uac-${m[1]}-ammo`],
    },
    {
      re: /^cl(?:an)?\s*lbxac(\d+)\s*ammo$/,
      ids: (m) => [`clan-lb-${m[1]}-x-ammo`, `lb-${m[1]}-x-ammo`],
    },
    {
      re: /^cl(?:an)?\s*lbxac(\d+)\s+cl\s*ammo$/,
      ids: (m) => [
        `clan-lb-${m[1]}-x-cluster-ammo`,
        `lb-${m[1]}-x-cluster-ammo`,
      ],
    },
    {
      re: /^cl(?:an)?\s*lb\s*(\d+)-x\s*(?:ac\s*)?ammo$/,
      ids: (m) => [`clan-lb-${m[1]}-x-ammo`, `lb-${m[1]}-x-ammo`],
    },
    {
      re: /^cl(?:an)?\s*lb\s*(\d+)-x\s*(?:ac\s*)?cluster\s*ammo$/,
      ids: (m) => [
        `clan-lb-${m[1]}-x-cluster-ammo`,
        `lb-${m[1]}-x-cluster-ammo`,
      ],
    },
    {
      re: /^cl(?:an)?\s*rotaryac(\d+)\s*ammo$/,
      ids: (m) => [`clanrotaryac${m[1]}`, `rac-${m[1]}-ammo`],
    },
    {
      re: /^cl(?:an)?\s*streaksrm(\d+)\s*ammo$/,
      ids: (m) => [
        `clan-streak-srm-${m[1]}-ammo`,
        `clan-streak-srm-${m[1]}`,
        `streak-srm-ammo`,
      ],
    },
    {
      re: /^cl(?:an)?\s*streak\s*srm\s*(\d+)\s*ammo$/,
      ids: (m) => [
        `clan-streak-srm-${m[1]}-ammo`,
        `clan-streak-srm-${m[1]}`,
        `streak-srm-ammo`,
      ],
    },
    {
      re: /^cl(?:an)?\s*streaklrm(\d+)\s*ammo$/,
      ids: (m) => [`clan-streak-lrm-${m[1]}-ammo`, `clan-streak-lrm-${m[1]}`],
    },
    {
      re: /^cl(?:an)?\s*streak\s*lrm\s*(\d+)\s*ammo$/,
      ids: (m) => [`clan-streak-lrm-${m[1]}-ammo`, `clan-streak-lrm-${m[1]}`],
    },
    { re: /^cl(?:an)?\s*gauss\s*ammo$/, ids: (_) => [`gauss-ammo`] },
    {
      re: /^cl(?:an)?\s*apgaussrifle\s*ammo$/,
      ids: (_) => [`ap-gauss-ammo`, `apgaussrifle`],
    },
    { re: /^cl(?:an)?\s*impgauss\s*ammo$/, ids: (_) => [`impgaussammo`] },
    {
      re: /^cl(?:an)?\s*improvedlrm(\d+)\s*ammo$/,
      ids: (m) => [`clanimprovedlrm${m[1]}ammo`],
    },
    {
      re: /^cl(?:an)?\s*machine\s*gun\s*ammo$/,
      ids: (_) => [`mg-ammo`, `ammo-mg-full`],
    },
    { re: /^cl(?:an)?\s*mg\s*ammo$/, ids: (_) => [`mg-ammo`, `ammo-mg-full`] },
    {
      re: /^cl(?:an)?\s*heavy\s*machine\s*gun\s*ammo$/,
      ids: (_) => [`heavy-mg-ammo`, `heavy-machine-gun-ammo-full`],
    },
    {
      re: /^cl(?:an)?\s*light\s*machine\s*gun\s*ammo$/,
      ids: (_) => [`light-mg-ammo`, `light-machine-gun-ammo-full`],
    },
    {
      re: /^cl(?:an)?\s*ams\s*ammo$/,
      ids: (_) => [`clan-ams-ammo`, `ams-ammo`],
    },
    {
      re: /^cl(?:an)?\s*arrowiv\s*(?:cluster\s*|homing\s*)?ammo$/,
      ids: (_) => [`arrowivammo`],
    },
    {
      re: /^cl(?:an)?\s*plasmacannon\s*ammo$/,
      ids: (_) => [`clan-plasma-cannon-ammo`, `clplasmacannonammo`],
    },
    {
      re: /^cl(?:an)?\s*plasma\s*cannon\s*ammo$/,
      ids: (_) => [`clan-plasma-cannon-ammo`, `clplasmacannonammo`],
    },
    { re: /^cl(?:an)?\s*(?:heavy\s*)?flamer\s*ammo$/, ids: (_) => [`mg-ammo`] },
    {
      re: /^cl(?:an)?\s*mediumchemlaser\s*ammo$/,
      ids: (_) => [`clan-medium-chemical-laser-ammo`],
    },
    {
      re: /^cl(?:an)?\s*protomech\s*ac[/-](\d+)\s*ammo$/,
      ids: (m) => [`clan-protomech-ac-${m[1]}`],
    },
    {
      re: /^cl(?:an)?\s*ammo\s+lrtorpedo-(\d+)$/,
      ids: (m) => [`clan-ammo-lrtorpedo-${m[1]}`, `clan-ammo-lrm-${m[1]}`],
    },
    {
      re: /^cl(?:an)?\s*ammo\s+srtorpedo-(\d+)$/,
      ids: (m) => [`ammo-srtorpedo-${m[1]}`, `ammo-srm-${m[1]}`],
    },
    {
      re: /^cl(?:an)?\s*ammo\s+sc\s*mortar-(\d+)$/,
      ids: (m) => [`clan-sc-mortar-${m[1]}-ammo`, `is-sc-mortar-${m[1]}-ammo`],
    },
    {
      re: /^cl(?:an)?\s*imp\s*ammo\s*(?:ac|srm)(\d+)$/,
      ids: (m) => [
        `impammoac${m[1]}`,
        `impammosrm${m[1]}`,
        `climpammosrm${m[1]}`,
      ],
    },

    {
      re: /^hag[/-](\d+)\s*ammo$/,
      ids: (m) => [`hag-${m[1]}-ammo`, `gauss-ammo`],
    },
    {
      re: /^hyper-assault\s*gauss\s*rifle[/-](\d+)\s*ammo$/,
      ids: (m) => [`hag-${m[1]}-ammo`, `gauss-ammo`],
    },

    // Clan HAG ammo (CLHAG20 Ammo, etc.)
    {
      re: /^cl(?:an)?\s*hag(\d+)\s*ammo$/,
      ids: (m) => [`hag-${m[1]}-ammo`, `gauss-ammo`],
    },

    // IS Sniper/Thumper (non-cannon) ammo
    {
      re: /^(?:is\s*)?sniperammo$/,
      ids: (_) => [`snipercannonammo`, `issnipercannonammo`],
    },
    {
      re: /^(?:is\s*)?thumperammo$/,
      ids: (_) => [`thumpercannonammo`, `isthumpercannonammo`],
    },

    // IS Arrow IV with space (ISArrowIV Ammo vs ISArrowIVAmmo)
    { re: /^(?:is\s*)?arrowiv\s+ammo$/, ids: (_) => [`arrowivammo`] },
    { re: /^(?:is\s*)?arrowiv\s+homing\s*ammo$/, ids: (_) => [`arrowivammo`] },
    { re: /^(?:is\s*)?arrowiv\s+cluster\s*ammo$/, ids: (_) => [`arrowivammo`] },

    // Clan Improved LRM ammo (ClanImprovedLRM15Ammo, etc.)
    {
      re: /^cl(?:an)?\s*improved\s*lrm(\d+)\s*ammo$/,
      ids: (m) => [
        `clanimprovedlrm${m[1]}ammo`,
        `clan-improved-lrm-${m[1]}-ammo`,
      ],
    },

    // IS Heavy/Medium/Light Rifle ammo
    {
      re: /^(?:is\s*)?heavy\s*rifle\s*ammo$/,
      ids: (_) => [`heavy-rifle-ammo`],
    },
    {
      re: /^(?:is\s*)?medium\s*rifle\s*ammo$/,
      ids: (_) => [`medium-rifle-ammo`],
    },
    {
      re: /^(?:is\s*)?light\s*rifle\s*ammo$/,
      ids: (_) => [`light-rifle-ammo`],
    },

    // IS HVAC ammo
    {
      re: /^(?:is\s*)?hvac[/-](\d+)\s*ammo$/,
      ids: (m) => [`hvac-${m[1]}-ammo`],
    },

    // IS LB-X 5 (missing from some patterns)
    {
      re: /^(?:is\s*)?lbxac(\d+)\s+cl\s*ammo$/,
      ids: (m) => [`lb-${m[1]}-x-cluster-ammo`],
    },

    // IS Extended LRM ammo
    {
      re: /^(?:is\s*)?extended\s*lrm-?(\d+)\s*ammo$/,
      ids: (m) => [`ammo-extended-lrm-${m[1]}`],
    },

    // IS Enhanced LRM ammo (ISEnhancedLRM5 Ammo, etc.)
    {
      re: /^(?:is\s*)?enhanced\s*lrm(\d+)\s*ammo$/,
      ids: (m) => [`enhancedlrm${m[1]}`],
    },

    // IS SB Gauss Rifle ammo
    {
      re: /^(?:is\s*)?sb\s*gauss\s*(?:rifle\s*)?ammo$/,
      ids: (_) => [`silver-bullet-gauss`],
    },

    // IS Improved Heavy Gauss ammo
    {
      re: /^(?:is\s*)?improved\s*heavy\s*gauss\s*ammo$/,
      ids: (_) => [`improvedheavygauss`],
    },

    // IS APDS ammo (Anti-Personnel Defense System)
    { re: /^(?:is\s*)?apds\s*ammo$/, ids: (_) => [`ams-ammo`] },

    // Clan AP Gauss Rifle ammo
    {
      re: /^cl(?:an)?\s*ap\s*gauss\s*(?:rifle\s*)?ammo$/,
      ids: (_) => [`ap-gauss-ammo`, `apgaussrifle`],
    },
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
