#!/usr/bin/env npx tsx
/**
 * Audit ammo-weapon matching across all minor-discrepancy units.
 *
 * For each unit that has a minor BV discrepancy (undercalculated by 0.01-5%),
 * this script loads the unit data, scans crit slots for ammo, traces through
 * the ammo resolution pipeline (same as validate-bv.ts), and checks whether
 * the resolved weaponType matches any weapon the unit carries.
 *
 * This tells us how much of the ~2.4% gap is caused by ammo matching failures.
 */
import * as fs from 'fs';
import * as path from 'path';

import {
  resolveAmmoBV,
  normalizeEquipmentId,
} from '../src/utils/construction/equipmentBVResolver';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ValidationResult {
  unitId: string;
  chassis: string;
  model: string;
  tonnage: number;
  indexBV: number;
  calculatedBV: number;
  difference: number;
  percentDiff: number;
  status: string;
  breakdown: {
    defensiveBV: number;
    offensiveBV: number;
    weaponBV: number;
    ammoBV: number;
    speedFactor: number;
    explosivePenalty: number;
    defensiveEquipBV: number;
  };
  issues: string[];
  rootCause: string;
}

interface IndexUnit {
  id: string; chassis: string; model: string; tonnage: number;
  techBase: string; year: number; role: string; path: string;
  rulesLevel: string; cost: number; bv: number;
}

interface IndexFile {
  version: string; generatedAt: string; totalUnits: number; units: IndexUnit[];
}

interface Equipment { id: string; location: string; }

interface UnitData {
  id: string; chassis: string; model: string; unitType: string;
  configuration: string; techBase: string; tonnage: number;
  engine: { type: string; rating: number };
  gyro: { type: string };
  cockpit: string;
  structure: { type: string };
  armor: { type: string; allocation: Record<string, number | { front: number; rear: number }> };
  heatSinks: { type: string; count: number };
  movement: { walk: number; jump: number };
  equipment: Equipment[];
  criticalSlots?: Record<string, (string | null)[]>;
}

// ---------------------------------------------------------------------------
// Replicate normalizeWeaponKey from validate-bv.ts (lines 608-649)
// ---------------------------------------------------------------------------
function normalizeWeaponKey(id: string): string {
  let s = id.toLowerCase().replace(/^clan-/, '').replace(/^\d+-/, '');
  const aliases: [RegExp, string][] = [
    [/^(?:is)?ultra-?ac-?(\d+)$/, 'uac-$1'], [/^(?:is)?ultraac(\d+)$/, 'uac-$1'],
    [/^(?:is)?rotary-?ac-?(\d+)$/, 'rac-$1'], [/^(?:is)?rotaryac(\d+)$/, 'rac-$1'],
    [/^(?:is)?lb-?(\d+)-?x-?ac$/, 'lb-$1-x-ac'], [/^(?:is)?lbxac(\d+)$/, 'lb-$1-x-ac'], [/^(?:is)?lb(\d+)xac$/, 'lb-$1-x-ac'],
    [/^(?:is)?autocannon-?(\d+)$/, 'ac-$1'], [/^(?:is)?ac-?(\d+)$/, 'ac-$1'],
    [/^(?:is)?light-?ac-?(\d+)$/, 'lac-$1'], [/^(?:is)?lac-?(\d+)$/, 'lac-$1'],
    [/^(?:is)?lrm-?(\d+)$/, 'lrm-$1'], [/^(?:is)?srm-?(\d+)$/, 'srm-$1'],
    [/^(?:is)?mrm-?(\d+)$/, 'mrm-$1'], [/^(?:is)?mml-?(\d+)$/, 'mml-$1'],
    [/^(?:is)?atm-?(\d+)$/, 'atm-$1'],
    [/^(?:is)?streak-?srm-?(\d+)$/, 'streak-srm-$1'], [/^(?:is)?streaksrm(\d+)$/, 'streak-srm-$1'],
    [/^(?:is)?streak-?lrm-?(\d+)$/, 'streak-lrm-$1'], [/^(?:is)?streaklrm(\d+)$/, 'streak-lrm-$1'],
    [/^(?:is)?hag-?(\d+)$/, 'hag-$1'], [/^(?:is)?hag(\d+)$/, 'hag-$1'],
    [/^hyper-?assault-?gauss-?rifle-?(\d+)$/, 'hag-$1'],
    [/^(?:is)?hyper-?velocity-?(?:auto-?cannon|ac)-?(\d+)$/, 'hvac-$1'], [/^(?:is)?hvac-?(\d+)$/, 'hvac-$1'],
    [/^(?:is)?thunderbolt-?(\d+)$/, 'thunderbolt-$1'],
    [/^(?:is)?gauss-?rifle$/, 'gauss-rifle'], [/^gauss$/, 'gauss-rifle'],
    [/^(?:is)?light-?gauss-?rifle$/, 'light-gauss-rifle'], [/^light-?gauss$/, 'light-gauss-rifle'],
    [/^(?:is)?heavy-?gauss-?rifle$/, 'heavy-gauss-rifle'], [/^heavygauss$/, 'heavy-gauss-rifle'],
    [/^(?:is)?improved-?heavy-?gauss-?rifle$/, 'improved-heavy-gauss-rifle'], [/^improvedheavygauss$/, 'improved-heavy-gauss-rifle'],
    [/^(?:is)?ap-?gauss-?rifle$/, 'ap-gauss-rifle'], [/^apgaussrifle$/, 'ap-gauss-rifle'],
    [/^(?:is)?silver-?bullet-?gauss-?rifle$/, 'silver-bullet-gauss-rifle'], [/^silver-?bullet-?gauss$/, 'silver-bullet-gauss-rifle'],
    [/^impgauss(?:ammo)?$/, 'gauss-rifle'],
    [/^(?:is)?plasma-?rifle$/, 'plasma-rifle'], [/^(?:is)?plasma-?cannon$/, 'plasma-cannon'],
    [/^(?:is)?machine-?gun$/, 'machine-gun'], [/^(?:is)?light-?machine-?gun$/, 'light-machine-gun'], [/^(?:is)?heavy-?machine-?gun$/, 'heavy-machine-gun'],
    [/^(?:is)?anti-?missile-?system$/, 'ams'], [/^(?:is)?ams$/, 'ams'],
    [/^(?:is)?arrow-?iv(?:-?launcher)?$/, 'arrow-iv'], [/^arrowiv$/, 'arrow-iv'],
    [/^(?:is)?narc$/, 'narc'], [/^(?:is)?inarc$/, 'inarc'],
    [/^sniper(?:cannon)?$/, 'sniper'], [/^longtom(?:cannon)?$/, 'long-tom'], [/^thumper(?:cannon)?$/, 'thumper'],
    [/^mg$/, 'machine-gun'], [/^lightmg$/, 'light-machine-gun'], [/^heavymg$/, 'heavy-machine-gun'],
    [/^rotaryac(\d+)$/, 'rac-$1'],
    [/^(?:is)?lrt-?(\d+)$/, 'lrm-$1'], [/^(?:is)?srt-?(\d+)$/, 'srm-$1'],
    [/^(?:is)?protomech-?ac-?(\d+)$/, 'protomech-ac-$1'], [/^(?:is)?protomechac(\d+)$/, 'protomech-ac-$1'],
    [/^(?:is)?iatm-?(\d+)$/, 'iatm-$1'],
    [/^(?:is)?enhanced-?lrm-?(\d+)$/, 'enhanced-lrm-$1'], [/^(?:is)?enhancedlrm(\d+)$/, 'enhanced-lrm-$1'],
    [/^(?:is)?extended-?lrm-?(\d+)$/, 'extended-lrm-$1'],
  ];
  for (const [re, rep] of aliases) { if (re.test(s)) return s.replace(re, rep); }
  return s;
}

// ---------------------------------------------------------------------------
// Replicate extractWeaponTypeFromAmmoId from validate-bv.ts (lines 654-659)
// ---------------------------------------------------------------------------
function extractWeaponTypeFromAmmoId(ammoId: string): string {
  let s = ammoId.replace(/-ammo$/, '').replace(/ammo$/, '').replace(/^ammo-/, '').replace(/^clan-ammo-/, '').replace(/^clan-/, '');
  s = s.replace(/-(standard|er|he|iiw|imp|cluster|ap|precision|fragmentation|inferno|swarm|tandem-charge|thunder|explosive|ecm|haywire|nemesis|pods)$/, '');
  s = s.replace(/-half$/, '').replace(/-full$/, '');
  return normalizeWeaponKey(s);
}

// ---------------------------------------------------------------------------
// Replicate buildAmmoLookup from validate-bv.ts (lines 661-742)
// ---------------------------------------------------------------------------
let ammoLookupCache: Map<string, { bv: number; weaponType: string }> | null = null;

function buildAmmoLookup(): Map<string, { bv: number; weaponType: string }> {
  if (ammoLookupCache) return ammoLookupCache;
  ammoLookupCache = new Map();
  try {
    const d = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'public/data/equipment/official/ammunition.json'), 'utf-8'));
    for (const item of d.items || []) {
      const wt = item.compatibleWeaponIds?.[0]
        ? normalizeWeaponKey(item.compatibleWeaponIds[0])
        : extractWeaponTypeFromAmmoId(item.id);
      ammoLookupCache.set(item.id, { bv: item.battleValue, weaponType: wt });
      const canon = item.id.replace(/[^a-z0-9]/g, '');
      if (!ammoLookupCache.has(canon)) ammoLookupCache.set(canon, { bv: item.battleValue, weaponType: wt });
    }
  } catch { /* ignore */ }

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
    ['hag-20-ammo', 33, 'hag-20'], ['hag-30-ammo', 50, 'hag-30'], ['hag-40-ammo', 67, 'hag-40'],
    ['rac-2-ammo', 15, 'rac-2'], ['rac-5-ammo', 31, 'rac-5'],
    ['clan-rac-2-ammo', 20, 'rac-2'], ['clan-rac-5-ammo', 43, 'rac-5'], ['clan-rac-20-ammo', 59, 'rac-20'],
    ['clanrotaryac2', 20, 'rac-2'], ['clanrotaryac5', 43, 'rac-5'],
    ['hvac-2-ammo', 7, 'hvac-2'], ['hvac-5-ammo', 11, 'hvac-5'], ['hvac-10-ammo', 20, 'hvac-10'],
    ['thunderbolt-5-ammo', 8, 'thunderbolt-5'], ['thunderbolt-10-ammo', 16, 'thunderbolt-10'],
    ['thunderbolt-15-ammo', 29, 'thunderbolt-15'], ['thunderbolt-20-ammo', 38, 'thunderbolt-20'],
    ['clan-improved-lrm-5-ammo', 6, 'lrm-5'], ['clan-improved-lrm-10-ammo', 11, 'lrm-10'],
    ['clan-improved-lrm-15-ammo', 17, 'lrm-15'], ['clan-improved-lrm-20-ammo', 23, 'lrm-20'],
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
    ['clanimprovedlrm5ammo', 6, 'lrm-5'], ['clanimprovedlrm10ammo', 11, 'lrm-10'],
    ['clanimprovedlrm15ammo', 17, 'lrm-15'], ['clanimprovedlrm20ammo', 23, 'lrm-20'],
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
    if (!ammoLookupCache.has(id)) ammoLookupCache.set(id, { bv, weaponType: wt });
    const canon = id.replace(/[^a-z0-9]/g, '');
    if (!ammoLookupCache.has(canon)) ammoLookupCache.set(canon, { bv, weaponType: wt });
  }

  return ammoLookupCache;
}

// ---------------------------------------------------------------------------
// Replicate resolveAmmoByPattern from validate-bv.ts (lines 744-943)
// ---------------------------------------------------------------------------
function resolveAmmoByPattern(name: string, _techBase: string): { bv: number; weaponType: string } | null {
  const lu = buildAmmoLookup();

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
    { re: /^(?:is\s*)?ammo\s+ac[/-](\d+)\s+primitive$/,ids: m => [`ammo-ac-${m[1]}-primitive`] },
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
    { re: /^(?:is\s*)?lb\s*(\d+)-x\s*(?:ac\s*)?slug\s*ammo$/,ids: m => [`lb-${m[1]}-x-ammo`] },
    { re: /^(?:is\s*)?rotaryac(\d+)\s*ammo$/,        ids: m => [`rotaryac${m[1]}`] },
    { re: /^(?:is\s*)?ammo\s+lac[/-](\d+)$/,          ids: m => [`ammo-lac-${m[1]}`] },
    { re: /^(?:is\s*)?lac(\d+)\s*ammo$/,             ids: m => [`ammo-lac-${m[1]}`] },
    { re: /^(?:is\s*)?ammo\s+hvac[/-](\d+)$/,         ids: m => [`hvac-${m[1]}-ammo`] },
    { re: /^(?:is\s*)?ammo\s+extended\s*lrm-(\d+)$/,  ids: m => [`ammo-extended-lrm-${m[1]}`] },
    { re: /^(?:is\s*)?enhancedlrm(\d+)\s*ammo$/,     ids: m => [`enhancedlrm${m[1]}`] },
    { re: /^(?:is\s*)?ammo\s+thunderbolt-(\d+)$/,     ids: m => [`thunderbolt-${m[1]}-ammo`, `lrm-ammo`] },
    { re: /^(?:is\s*)?thunderbolt(\d+)\s*ammo$/,      ids: m => [`thunderbolt-${m[1]}-ammo`, `lrm-ammo`] },
    { re: /^(?:is\s*)?gauss\s*ammo$/,                ids: _ => [`gauss-ammo`] },
    { re: /^(?:is\s*)?light\s*gauss\s*ammo$/,        ids: _ => [`light-gauss-ammo`] },
    { re: /^(?:is\s*)?heavy\s*gauss\s*ammo$/,        ids: _ => [`heavy-gauss-ammo`] },
    { re: /^(?:is\s*)?improvedheavygauss\s*ammo$/,   ids: _ => [`improvedheavygauss`] },
    { re: /^(?:is\s*)?sbgauss(?:rifle)?\s*ammo$/,    ids: _ => [`silver-bullet-gauss`] },
    { re: /^silver\s*bullet\s*gauss\s*ammo$/,        ids: _ => [`silver-bullet-gauss`] },
    { re: /^(?:is\s*)?plasmarifle?\s*ammo$/,          ids: _ => [`plasma-rifle-ammo`, `isplasmarifleammo`] },
    { re: /^(?:is\s*)?plasma\s*rifle\s*ammo$/,       ids: _ => [`plasma-rifle-ammo`, `isplasmarifleammo`] },
    { re: /^(?:is\s*)?fluidgun\s*ammo$/,             ids: _ => [`fluid-gun-ammo`] },
    { re: /^(?:is\s*)?(?:heavy\s*)?flamer\s*ammo$/,  ids: _ => [`mg-ammo`] },
    { re: /^(?:is\s*)?vehicle\s*flamer\s*ammo$/,     ids: _ => [`mg-ammo`] },
    { re: /^(?:is\s*)?(?:light\s*)?mg\s*ammo$/,      ids: _ => [`mg-ammo`] },
    { re: /^(?:is\s*)?ammo\s+mg$/,                   ids: _ => [`mg-ammo`, `ammo-mg-full`] },
    { re: /^(?:is\s*)?(?:light\s*)?machine\s*gun\s*ammo$/,ids: _ => [`mg-ammo`, `ammo-mg-full`] },
    { re: /^(?:is\s*)?heavy\s*machine\s*gun\s*ammo$/, ids: _ => [`heavy-mg-ammo`, `heavy-machine-gun-ammo-full`] },
    { re: /^(?:is\s*)?light\s*machine\s*gun\s*ammo$/, ids: _ => [`light-mg-ammo`, `light-machine-gun-ammo-full`] },
    { re: /^(?:is\s*)?ams\s*ammo$/,                  ids: _ => [`ams-ammo`] },
    { re: /^(?:is\s*)?ammo\s+inarc$/,                ids: _ => [`inarc-ammo`] },
    { re: /^(?:is\s*)?ammo\s+narc$/,                 ids: _ => [`narc-ammo`] },
    { re: /^(?:is\s*)?arrowiv\s*(?:cluster\s*)?ammo$/,ids: _ => [`arrowivammo`] },
    { re: /^(?:is\s*)?arrowiv\s*homing\s*ammo$/,     ids: _ => [`arrowivammo`] },
    { re: /^(?:is\s*)?ammo\s+lrtorpedo-(\d+)$/,       ids: m => [`ammo-lrtorpedo-${m[1]}`, `ammo-lrm-${m[1]}`] },
    { re: /^(?:is\s*)?ammo\s+srtorpedo-(\d+)$/,       ids: m => [`ammo-srtorpedo-${m[1]}`, `ammo-srm-${m[1]}`] },
    { re: /^(?:is\s*)?ammo\s+heavy\s*rifle$/,         ids: _ => [`gauss-ammo`] },
    { re: /^(?:is\s*)?heavy\s*rifle\s*ammo$/,         ids: _ => [`gauss-ammo`] },
    { re: /^(?:is\s*)?ammo\s+nail[/-]rivet$/,         ids: _ => [`mg-ammo`] },
    { re: /^(?:is\s*)?magshotgr\s*ammo$/,            ids: _ => [`gauss-ammo`] },
    { re: /^(?:is\s*)?apds\s*ammo$/,                 ids: _ => [`ams-ammo`] },
    { re: /^(?:is\s*)?snipercannonammo$/,             ids: _ => [`snipercannonammo`, `issnipercannonammo`] },
    { re: /^(?:is\s*)?longtomcannonammo$/,            ids: _ => [`longtomcannonammo`, `islongtomcannonammo`] },
    { re: /^(?:is\s*)?thumpercannonammo$/,            ids: _ => [`thumpercannonammo`, `isthumpercannonammo`] },
    { re: /^(?:mek\s*)?taser\s*ammo$/,               ids: _ => [`mg-ammo`] },
    { re: /^(?:is\s*)?streaksrm(\d+)\s*ammo$/,        ids: m => [`streak-srm-${m[1]}-ammo`, `streak-srm-ammo`] },
    { re: /^(?:is\s*)?streak\s*srm\s*(\d+)\s*ammo$/,  ids: m => [`streak-srm-${m[1]}-ammo`, `streak-srm-ammo`] },
    { re: /^(?:is\s*)?ammo\s+streak\s*srm-(\d+)$/,    ids: m => [`streak-srm-${m[1]}-ammo`, `streak-srm-ammo`] },
    { re: /^(?:is\s*)?lrt(\d+)\s*ammo$/,              ids: m => [`ammo-lrtorpedo-${m[1]}`, `ammo-lrm-${m[1]}`] },
    { re: /^(?:is\s*)?srt(\d+)\s*ammo$/,              ids: m => [`ammo-srtorpedo-${m[1]}`, `ammo-srm-${m[1]}`] },
    { re: /^(?:is\s*)?lightmg\s*ammo(?:\s*\(\d+\))?$/,ids: _ => [`light-mg-ammo`, `light-machine-gun-ammo-full`] },
    { re: /^(?:is\s*)?impgauss\s*ammo$/,              ids: _ => [`impgaussammo`] },
    { re: /^(?:is\s*)?arrowiv\s+ammo$/,               ids: _ => [`arrowivammo`] },
    { re: /^(?:is\s*)?arrowiv\s+homing\s*ammo$/,      ids: _ => [`arrowivammo`] },
    { re: /^(?:is\s*)?arrowiv\s+cluster\s*ammo$/,     ids: _ => [`arrowivammo`] },
    { re: /^(?:is\s*)?sniper\s*cannon\s*ammo$/,       ids: _ => [`snipercannonammo`, `issnipercannonammo`] },
    { re: /^(?:is\s*)?long\s*tom\s*cannon\s*ammo$/,   ids: _ => [`longtomcannonammo`, `islongtomcannonammo`] },

    { re: /^cl(?:an)?\s*ammo\s+lrm-(\d+)$/,           ids: m => [`ammo-lrm-${m[1]}`] },
    { re: /^cl(?:an)?\s*lrm(\d+)\s*ammo$/,            ids: m => [`ammo-lrm-${m[1]}`] },
    { re: /^cl(?:an)?\s*ammo\s+srm-(\d+)$/,           ids: m => [`ammo-srm-${m[1]}`, `clan-ammo-srm-${m[1]}`] },
    { re: /^cl(?:an)?\s*srm(\d+)\s*ammo$/,            ids: m => [`ammo-srm-${m[1]}`, `clan-ammo-srm-${m[1]}`] },
    { re: /^cl(?:an)?\s*ammo\s+atm-(\d+)$/,           ids: m => [`clan-ammo-atm-${m[1]}`, `atm-standard-ammo`] },
    { re: /^cl(?:an)?\s*ammo\s+atm-(\d+)\s+er$/,      ids: m => [`clan-ammo-atm-${m[1]}-er`, `atm-er-ammo`] },
    { re: /^cl(?:an)?\s*ammo\s+atm-(\d+)\s+he$/,      ids: m => [`clan-ammo-atm-${m[1]}-he`, `atm-he-ammo`] },
    { re: /^cl(?:an)?\s*atm(\d+)\s*ammo$/,            ids: m => [`clan-ammo-atm-${m[1]}`, `atm-standard-ammo`] },
    { re: /^cl(?:an)?\s*atm(\d+)\s+er\s*ammo$/,       ids: m => [`clan-ammo-atm-${m[1]}-er`, `atm-er-ammo`] },
    { re: /^cl(?:an)?\s*atm(\d+)\s+he\s*ammo$/,       ids: m => [`clan-ammo-atm-${m[1]}-he`, `atm-he-ammo`] },
    { re: /^cl(?:an)?\s*ammo\s+iatm-(\d+)$/,          ids: m => [`clan-ammo-iatm-${m[1]}`] },
    { re: /^cl(?:an)?\s*ultraac(\d+)\s*ammo$/,        ids: m => [`uac-${m[1]}-ammo`] },
    { re: /^cl(?:an)?\s*ultra\s*ac[/-](\d+)\s*ammo$/,  ids: m => [`uac-${m[1]}-ammo`] },
    { re: /^cl(?:an)?\s*lbxac(\d+)\s*ammo$/,          ids: m => [`lb-${m[1]}-x-ammo`] },
    { re: /^cl(?:an)?\s*lbxac(\d+)\s+cl\s*ammo$/,     ids: m => [`lb-${m[1]}-x-cluster-ammo`] },
    { re: /^cl(?:an)?\s*lb\s*(\d+)-x\s*(?:ac\s*)?ammo$/,ids: m => [`lb-${m[1]}-x-ammo`] },
    { re: /^cl(?:an)?\s*lb\s*(\d+)-x\s*(?:ac\s*)?cluster\s*ammo$/,ids: m => [`lb-${m[1]}-x-cluster-ammo`] },
    { re: /^cl(?:an)?\s*rotaryac(\d+)\s*ammo$/,       ids: m => [`clanrotaryac${m[1]}`, `rac-${m[1]}-ammo`] },
    { re: /^cl(?:an)?\s*streaksrm(\d+)\s*ammo$/,      ids: m => [`clan-streak-srm-${m[1]}`, `streak-srm-ammo`] },
    { re: /^cl(?:an)?\s*streak\s*srm\s*(\d+)\s*ammo$/,ids: m => [`clan-streak-srm-${m[1]}`, `streak-srm-ammo`] },
    { re: /^cl(?:an)?\s*streaklrm(\d+)\s*ammo$/,      ids: m => [`clan-streak-lrm-${m[1]}-ammo`, `clan-streak-lrm-${m[1]}`] },
    { re: /^cl(?:an)?\s*streak\s*lrm\s*(\d+)\s*ammo$/,ids: m => [`clan-streak-lrm-${m[1]}-ammo`, `clan-streak-lrm-${m[1]}`] },
    { re: /^cl(?:an)?\s*gauss\s*ammo$/,               ids: _ => [`gauss-ammo`] },
    { re: /^cl(?:an)?\s*apgaussrifle\s*ammo$/,        ids: _ => [`ap-gauss-ammo`, `apgaussrifle`] },
    { re: /^cl(?:an)?\s*impgauss\s*ammo$/,            ids: _ => [`impgaussammo`] },
    { re: /^cl(?:an)?\s*improvedlrm(\d+)\s*ammo$/,    ids: m => [`clanimprovedlrm${m[1]}ammo`] },
    { re: /^cl(?:an)?\s*(?:heavy\s*)?machine\s*gun\s*ammo$/,ids: _ => [`mg-ammo`, `ammo-mg-full`] },
    { re: /^cl(?:an)?\s*(?:heavy\s*)?mg\s*ammo$/,     ids: _ => [`mg-ammo`, `ammo-mg-full`] },
    { re: /^cl(?:an)?\s*heavy\s*machine\s*gun\s*ammo$/,ids: _ => [`heavy-mg-ammo`, `heavy-machine-gun-ammo-full`] },
    { re: /^cl(?:an)?\s*light\s*machine\s*gun\s*ammo$/,ids: _ => [`light-mg-ammo`, `light-machine-gun-ammo-full`] },
    { re: /^cl(?:an)?\s*ams\s*ammo$/,                 ids: _ => [`clan-ams-ammo`, `ams-ammo`] },
    { re: /^cl(?:an)?\s*arrowiv\s*(?:cluster\s*|homing\s*)?ammo$/,ids: _ => [`arrowivammo`] },
    { re: /^cl(?:an)?\s*plasmacannon\s*ammo$/,        ids: _ => [`clan-plasma-cannon-ammo`, `clplasmacannonammo`] },
    { re: /^cl(?:an)?\s*plasma\s*cannon\s*ammo$/,     ids: _ => [`clan-plasma-cannon-ammo`, `clplasmacannonammo`] },
    { re: /^cl(?:an)?\s*(?:heavy\s*)?flamer\s*ammo$/,  ids: _ => [`mg-ammo`] },
    { re: /^cl(?:an)?\s*mediumchemlaser\s*ammo$/,     ids: _ => [`clan-medium-chemical-laser-ammo`] },
    { re: /^cl(?:an)?\s*protomech\s*ac[/-](\d+)\s*ammo$/,ids: m => [`clan-protomech-ac-${m[1]}`] },
    { re: /^cl(?:an)?\s*ammo\s+lrtorpedo-(\d+)$/,     ids: m => [`ammo-lrtorpedo-${m[1]}`, `ammo-lrm-${m[1]}`] },
    { re: /^cl(?:an)?\s*ammo\s+srtorpedo-(\d+)$/,     ids: m => [`ammo-srtorpedo-${m[1]}`, `ammo-srm-${m[1]}`] },
    { re: /^cl(?:an)?\s*ammo\s+sc\s*mortar-(\d+)$/,   ids: m => [`clan-sc-mortar-${m[1]}-ammo`, `is-sc-mortar-${m[1]}-ammo`] },
    { re: /^cl(?:an)?\s*imp\s*ammo\s*(?:ac|srm)(\d+)$/,ids: m => [`impammoac${m[1]}`, `impammosrm${m[1]}`, `climpammosrm${m[1]}`] },
    { re: /^hag[/-](\d+)\s*ammo$/,                    ids: m => [`hag-${m[1]}-ammo`, `gauss-ammo`] },
    { re: /^hyper-assault\s*gauss\s*rifle[/-](\d+)\s*ammo$/,ids: m => [`hag-${m[1]}-ammo`, `gauss-ammo`] },
    { re: /^cl(?:an)?\s*hag(\d+)\s*ammo$/,            ids: m => [`hag-${m[1]}-ammo`, `gauss-ammo`] },
    { re: /^(?:is\s*)?sniperammo$/,                    ids: _ => [`snipercannonammo`, `issnipercannonammo`] },
    { re: /^(?:is\s*)?thumperammo$/,                   ids: _ => [`thumpercannonammo`, `isthumpercannonammo`] },
    { re: /^(?:is\s*)?arrowiv\s+ammo$/,                ids: _ => [`arrowivammo`] },
    { re: /^(?:is\s*)?arrowiv\s+homing\s*ammo$/,       ids: _ => [`arrowivammo`] },
    { re: /^(?:is\s*)?arrowiv\s+cluster\s*ammo$/,      ids: _ => [`arrowivammo`] },
    { re: /^cl(?:an)?\s*improved\s*lrm(\d+)\s*ammo$/,  ids: m => [`clanimprovedlrm${m[1]}ammo`, `clan-improved-lrm-${m[1]}-ammo`] },
    { re: /^(?:is\s*)?heavy\s*rifle\s*ammo$/,          ids: _ => [`gauss-ammo`] },
    { re: /^(?:is\s*)?hvac[/-](\d+)\s*ammo$/,          ids: m => [`hvac-${m[1]}-ammo`] },
    { re: /^(?:is\s*)?lbxac(\d+)\s+cl\s*ammo$/,       ids: m => [`lb-${m[1]}-x-cluster-ammo`] },
    { re: /^(?:is\s*)?extended\s*lrm-?(\d+)\s*ammo$/,  ids: m => [`ammo-extended-lrm-${m[1]}`] },
    { re: /^(?:is\s*)?enhanced\s*lrm(\d+)\s*ammo$/,    ids: m => [`enhancedlrm${m[1]}`] },
    { re: /^(?:is\s*)?sb\s*gauss\s*(?:rifle\s*)?ammo$/,ids: _ => [`silver-bullet-gauss`] },
    { re: /^(?:is\s*)?improved\s*heavy\s*gauss\s*ammo$/,ids: _ => [`improvedheavygauss`] },
    { re: /^(?:is\s*)?apds\s*ammo$/,                   ids: _ => [`ams-ammo`] },
    { re: /^cl(?:an)?\s*ap\s*gauss\s*(?:rifle\s*)?ammo$/,ids: _ => [`ap-gauss-ammo`, `apgaussrifle`] },
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

// ---------------------------------------------------------------------------
// AMMO_WEAPON_TYPE_ALIASES and findMatchingWeaponBV
// (from battleValueCalculations.ts lines 494-557)
// ---------------------------------------------------------------------------
const AMMO_WEAPON_TYPE_ALIASES: Record<string, string[]> = {
  'arrow-iv-launcher': ['isarrowivsystem', 'isarrowiv', 'clarrowiv', 'arrow-iv'],
  'arrow-iv': ['isarrowivsystem', 'isarrowiv', 'clarrowiv', 'arrow-iv-launcher'],
  'long-tom': ['long-tom-cannon'],
  'long-tom-cannon': ['long-tom'],
  'sniper': ['sniper-cannon', 'issniperartcannon'],
  'sniper-cannon': ['sniper'],
  'thumper': ['thumper-cannon'],
  'thumper-cannon': ['thumper'],
  'medium-chemical-laser': ['medium-chem-laser', 'clmediumchemlaser'],
  'medium-chem-laser': ['medium-chemical-laser', 'clmediumchemlaser'],
  'lb-5-x': ['lb-5-x-ac'],
  'lb-2-x': ['lb-2-x-ac'],
  'lrtorpedo': ['lrm-15', 'lrm-10', 'lrm-5', 'lrm-20'],
  'srtorpedo': ['srm-6', 'srm-4', 'srm-2'],
  'ac-10-primitive': ['ac-10'],
  'ac-5-primitive': ['ac-5'],
  'ac-20-primitive': ['ac-20'],
  'impammosrm6': ['improved-srm-6'],
  'clanimprovedlrm15': ['improved-lrm-15'],
  'clanimprovedlrm20': ['improved-lrm-20'],
  'clanimprovedlrm10': ['improved-lrm-10'],
  'clanimprovedlrm5': ['improved-lrm-5'],
  'isarrowivsystem': ['arrow-iv-launcher', 'arrow-iv'],
  'improved-gauss-rifle': ['climpgauss'],
  'climpgauss': ['improved-gauss-rifle'],
  'magshot': ['magshotgr'],
  'magshotgr': ['magshot'],
  'mech-taser': ['battlemech-taser', 'taser'],
  'battlemech-taser': ['mech-taser', 'taser'],
  'taser': ['mech-taser', 'battlemech-taser'],
  'improved-narc': ['improvednarc', 'inarc', 'isimprovednarc'],
  'improvednarc': ['improved-narc', 'inarc'],
  'narc-beacon': ['narcbeacon', 'narc', 'isnarcbeacon'],
  'narcbeacon': ['narc-beacon', 'narc'],
  'narc': ['narc-beacon', 'narcbeacon'],
  'clmediumchemlaser': ['medium-chemical-laser', 'medium-chem-laser'],
};

function findMatchingWeaponBV(
  ammoType: string,
  weaponBVByType: Record<string, number>,
): number {
  if (weaponBVByType[ammoType] !== undefined) return weaponBVByType[ammoType];
  const aliases = AMMO_WEAPON_TYPE_ALIASES[ammoType];
  if (aliases) {
    for (const alias of aliases) {
      if (weaponBVByType[alias] !== undefined) return weaponBVByType[alias];
    }
  }
  const stripped = ammoType.replace(/-\d+$/, '');
  if (stripped !== ammoType) {
    const size = ammoType.slice(stripped.length + 1);
    const torpedoAliases: Record<string, string> = {
      lrtorpedo: 'lrm-',
      srtorpedo: 'srm-',
    };
    const base = torpedoAliases[stripped];
    if (base && weaponBVByType[base + size] !== undefined) {
      return weaponBVByType[base + size];
    }
  }
  return 0;
}

// ---------------------------------------------------------------------------
// isWeaponEquip - simplified check from validate-bv.ts
// ---------------------------------------------------------------------------
function isWeaponEquip(id: string): boolean {
  const lo = id.toLowerCase();
  if (lo.includes('ammo')) return false;
  const nw = ['heatsink','heat-sink','endo','ferro','case','artemis','targeting-computer',
    'targeting computer','ecm','bap','probe','c3','masc','tsm','jump-jet','jump jet',
    'harjel','umu','shield','sword','hatchet','mace','a-pod','b-pod','m-pod','apod',
    'bpod','mpod','blue-shield','null-signature','chameleon','coolant-pod','coolantpod',
    'supercharger','drone','improved-sensors','beagle','angel-ecm','guardian-ecm',
    'light-active-probe','bloodhound','apollo','tag','machine-gun-array',
    'light-machine-gun-array','heavy-machine-gun-array','mga','lmga','hmga',
    'lift-hoist','lifthoist','retractable-blade','remote-sensor','partial-wing',
    'partialwing','searchlight','tracks','cargo','spikes','minesweeper'];
  for (const n of nw) if (lo.includes(n)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Main audit
// ---------------------------------------------------------------------------
function main() {
  const reportPath = path.resolve(process.cwd(), 'validation-output/bv-validation-report.json');
  const indexPath = path.resolve(process.cwd(), 'public/data/units/battlemechs/index.json');

  if (!fs.existsSync(reportPath)) {
    console.error('Validation report not found at', reportPath);
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  const index: IndexFile = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

  // Filter to undercalculated minor-discrepancy units (our BV < index BV, within 5%)
  const minorUnder = (report.allResults as ValidationResult[]).filter(u =>
    u.percentDiff < -0.01 && u.percentDiff >= -5.0
  );

  console.log(`=== AMMO-WEAPON MATCHING AUDIT ===`);
  console.log(`Total units in report: ${report.allResults.length}`);
  console.log(`Undercalculated minor-discrepancy units: ${minorUnder.length}`);
  console.log();

  let unitsWithAmmo = 0;
  let unitsWithMismatch = 0;
  let totalMismatchedBV = 0;
  let totalOrphanedBV = 0;
  const mismatchDetails: Array<{
    unit: string;
    ammoEntries: Array<{ slotName: string; resolvedWeaponType: string; bv: number; matched: boolean }>;
    weapons: string[];
    orphanedBV: number;
    reportedAmmoBV: number;
    percentDiff: number;
  }> = [];

  for (const result of minorUnder) {
    // Find unit in index
    const idxUnit = index.units.find(u => u.id === result.unitId);
    if (!idxUnit) continue;

    const unitPath = path.resolve(process.cwd(), 'public/data/units/battlemechs', idxUnit.path);
    if (!fs.existsSync(unitPath)) continue;

    let unitData: UnitData;
    try {
      unitData = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
    } catch { continue; }

    if (!unitData.criticalSlots) continue;

    // Scan crit slots for ammo entries (same logic as validate-bv.ts lines 457-477)
    const ammoEntries: Array<{ slotName: string; resolvedWeaponType: string; bv: number; resolved: boolean }> = [];

    for (const [_loc, slots] of Object.entries(unitData.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const slot of slots) {
        if (!slot || typeof slot !== 'string') continue;
        const lo = slot.replace(/\s*\(omnipod\)/gi, '').trim().toLowerCase();
        if (!lo.includes('ammo') || lo.includes('ammo feed')) continue;

        const clean = slot.replace(/\s*\(omnipod\)/gi, '').trim();

        // Try resolveAmmoByPattern first, then resolveAmmoBV fallback
        const pr = resolveAmmoByPattern(clean, unitData.techBase);
        if (pr && pr.bv > 0) {
          ammoEntries.push({ slotName: clean, resolvedWeaponType: pr.weaponType, bv: pr.bv, resolved: true });
        } else {
          const ar = resolveAmmoBV(clean);
          if (ar.resolved && ar.battleValue > 0) {
            ammoEntries.push({ slotName: clean, resolvedWeaponType: normalizeWeaponKey(ar.weaponType), bv: ar.battleValue, resolved: true });
          } else if (pr) {
            ammoEntries.push({ slotName: clean, resolvedWeaponType: pr.weaponType, bv: pr.bv, resolved: true });
          } else {
            ammoEntries.push({ slotName: clean, resolvedWeaponType: 'UNRESOLVED', bv: 0, resolved: false });
          }
        }
      }
    }

    if (ammoEntries.length === 0) continue;
    unitsWithAmmo++;

    // Build weapon keys from equipment list (same as validate-bv.ts line 1055)
    const weaponKeys = new Set<string>();
    for (const eq of unitData.equipment || []) {
      if (isWeaponEquip(eq.id)) {
        weaponKeys.add(normalizeWeaponKey(eq.id));
      }
    }

    // Also check crit slots for weapons that might not be in equipment array
    for (const [_loc, slots] of Object.entries(unitData.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const slot of slots) {
        if (!slot || typeof slot !== 'string') continue;
        const clean = slot.replace(/\s*\(omnipod\)/gi, '').replace(/\s*\(R\)/g, '').trim();
        const lo = clean.toLowerCase();
        if (lo.includes('ammo') || !isWeaponEquip(clean)) continue;
        weaponKeys.add(normalizeWeaponKey(clean));
      }
    }

    // Build weaponBVByType for matching (use dummy BV=1 since we only care about matching, not cap)
    const weaponBVByType: Record<string, number> = {};
    for (const key of weaponKeys) {
      weaponBVByType[key] = (weaponBVByType[key] ?? 0) + 1;
    }

    // Check each ammo entry for weapon matching
    let unitOrphanedBV = 0;
    let hasMismatch = false;
    const ammoResults: Array<{ slotName: string; resolvedWeaponType: string; bv: number; matched: boolean }> = [];

    for (const ammo of ammoEntries) {
      if (!ammo.resolved || ammo.bv === 0) {
        ammoResults.push({ slotName: ammo.slotName, resolvedWeaponType: ammo.resolvedWeaponType, bv: ammo.bv, matched: false });
        continue;
      }

      // Also normalize the ammo weaponType through normalizeEquipmentId (as calculateAmmoBVWithExcessiveCap does)
      const normalizedAmmoType = normalizeEquipmentId(ammo.resolvedWeaponType);
      const matchBV = findMatchingWeaponBV(normalizedAmmoType, weaponBVByType);

      // Also try direct matching without normalizeEquipmentId
      const directMatch = findMatchingWeaponBV(ammo.resolvedWeaponType, weaponBVByType);

      const matched = matchBV > 0 || directMatch > 0;
      if (!matched) {
        hasMismatch = true;
        unitOrphanedBV += ammo.bv;
      }
      ammoResults.push({ slotName: ammo.slotName, resolvedWeaponType: ammo.resolvedWeaponType, bv: ammo.bv, matched });
    }

    if (hasMismatch) {
      unitsWithMismatch++;
      totalOrphanedBV += unitOrphanedBV;
      totalMismatchedBV += unitOrphanedBV;
      mismatchDetails.push({
        unit: `${result.chassis} ${result.model}`,
        ammoEntries: ammoResults,
        weapons: Array.from(weaponKeys),
        orphanedBV: unitOrphanedBV,
        reportedAmmoBV: result.breakdown?.ammoBV ?? 0,
        percentDiff: result.percentDiff,
      });
    }
  }

  // Print summary
  console.log(`--- SUMMARY ---`);
  console.log(`Units with ammo in crit slots: ${unitsWithAmmo}`);
  console.log(`Units with at least one ammo-weapon mismatch: ${unitsWithMismatch}`);
  console.log(`Total orphaned ammo BV (lost to mismatches): ${totalOrphanedBV}`);
  console.log(`Average orphaned BV per mismatched unit: ${unitsWithMismatch > 0 ? (totalOrphanedBV / unitsWithMismatch).toFixed(1) : 0}`);
  console.log();

  // Print first 30 mismatched units with details
  console.log(`--- MISMATCH DETAILS (first 30) ---`);
  for (const detail of mismatchDetails.slice(0, 30)) {
    console.log(`\n${detail.unit} (percentDiff: ${detail.percentDiff.toFixed(2)}%, reportedAmmoBV: ${detail.reportedAmmoBV})`);
    console.log(`  Weapons: [${detail.weapons.join(', ')}]`);
    const orphaned = detail.ammoEntries.filter(a => !a.matched);
    for (const a of orphaned) {
      console.log(`  ORPHANED: "${a.slotName}" -> weaponType="${a.resolvedWeaponType}" bv=${a.bv}`);
    }
  }

  // Group mismatches by weaponType pattern to find systematic issues
  const patternCounts: Record<string, { count: number; totalBV: number; examples: string[] }> = {};
  for (const detail of mismatchDetails) {
    for (const a of detail.ammoEntries) {
      if (!a.matched) {
        const key = a.resolvedWeaponType;
        if (!patternCounts[key]) patternCounts[key] = { count: 0, totalBV: 0, examples: [] };
        patternCounts[key].count++;
        patternCounts[key].totalBV += a.bv;
        if (patternCounts[key].examples.length < 3) {
          patternCounts[key].examples.push(`${detail.unit}: "${a.slotName}"`);
        }
      }
    }
  }

  console.log(`\n--- SYSTEMATIC PATTERNS (orphaned weaponType -> count) ---`);
  const sorted = Object.entries(patternCounts).sort((a, b) => b[1].totalBV - a[1].totalBV);
  for (const [wtype, data] of sorted) {
    console.log(`  "${wtype}": ${data.count} ammo entries, ${data.totalBV} total BV lost`);
    for (const ex of data.examples) console.log(`    e.g. ${ex}`);
  }

  // Quantify impact: what fraction of the BV gap could ammo matching explain?
  console.log(`\n--- IMPACT ANALYSIS ---`);
  const totalGap = minorUnder.reduce((s, u) => s + Math.abs(u.difference), 0);
  console.log(`Total BV gap across ${minorUnder.length} undercalculated units: ${totalGap.toFixed(0)}`);
  console.log(`Total orphaned ammo BV: ${totalOrphanedBV}`);
  console.log(`Ammo matching explains ${totalGap > 0 ? ((totalOrphanedBV / totalGap) * 100).toFixed(1) : 0}% of the total gap`);
  console.log(`(Note: orphanedBV is raw ammo BV before speedFactor multiplier)`);

  // Estimate with average speed factor
  const avgSpeedFactor = minorUnder.reduce((s, u) => s + (u.breakdown?.speedFactor ?? 1), 0) / minorUnder.length;
  console.log(`Average speed factor: ${avgSpeedFactor.toFixed(3)}`);
  console.log(`Estimated total BV impact (orphanedBV * avgSpeedFactor): ${(totalOrphanedBV * avgSpeedFactor).toFixed(0)}`);
  console.log(`Adjusted ammo matching explains ${totalGap > 0 ? ((totalOrphanedBV * avgSpeedFactor / totalGap) * 100).toFixed(1) : 0}% of the total gap`);
}

main();
