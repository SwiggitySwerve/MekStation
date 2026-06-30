import * as fs from 'fs';
import * as path from 'path';

import { normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';
import {
  AMMO_BV_FALLBACKS,
  AMMO_BV_FORCE_OVERRIDES,
} from './validate-bv-ammo-overrides';
import { AMMO_RESOLUTION_RULES } from './validate-bv-ammo-rules';

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

  for (const [id, bv, wt] of AMMO_BV_FALLBACKS) {
    if (!ammoLookup.has(id)) ammoLookup.set(id, { bv, weaponType: wt });
    const canon = id.replace(/[^a-z0-9]/g, '');
    if (!ammoLookup.has(canon)) ammoLookup.set(canon, { bv, weaponType: wt });
  }

  // Force-override: catalog entries with known wrong BV values (UNOFFICIAL entries)
  // These ALWAYS overwrite any catalog value, unlike the `hc` list above.

  for (const [id, bv, wt] of AMMO_BV_FORCE_OVERRIDES) {
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

  for (const rule of AMMO_RESOLUTION_RULES) {
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
