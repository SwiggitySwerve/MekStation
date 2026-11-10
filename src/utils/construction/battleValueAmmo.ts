import {
  isAmmunitionEquipmentId,
  getCapitalEquipmentBVFacts,
} from './equipmentBV/catalogLoader';
import { hasNativeWeaponBVFlag } from './equipmentBV/nativeWeaponFlags';
import { isOneShotBVWeapon } from './equipmentBV/weaponHeat';
import {
  getAmmunitionWeightEntry,
  getEquipmentEntry,
  normalizeEquipmentId,
} from './equipmentBVResolver';

/** LargeAeroBVCalculator.java:95-96; BVCalculator.java:560-576 (48fcb2f64).
 * Java integer division counts whole native bins; depleted ammo contributes zero.
 */
export function largeAerospaceAmmoBVMultiplier(
  shots: number,
  binShots: number,
): number {
  return shots === 0
    ? 0
    : binShots > 0
      ? Math.max(1, Math.floor(shots / binShots))
      : 1;
}

/** Physical native mounts, not BV cap pools. AmmoMounted.java:49-53 (48fcb2f64)
 * seeds type.getShots(); AmmoType.java:6665,6700-6701 half-bin entries (CAT-Q1)
 * already contain that capacity, without another tonnage multiplier.
 * The catalog's :NN suffix specifies shots in this bin, not a bin multiplier.
 */
export function resolveNativeAmmoBin(
  id: string,
  name?: string,
): { ammoId: string; shots: number } | undefined {
  if (!isAmmunitionEquipmentId(id)) return undefined;
  // BLKFile.java:279-291,361-365 (48fcb2f64): retain shots before identity lookup.
  const nativeCount = id.match(/:shots(\d+)#/i);
  const token = id.replace(/:omni$/i, '');
  const override = nativeCount ?? token.match(/:(\d+)$/);
  const entry =
    getAmmunitionWeightEntry(token.replace(/:\d+$/, '')) ??
    (name
      ? getAmmunitionWeightEntry(
          name.replace(/:omni$/i, '').replace(/:\d+$/, ''),
        )
      : undefined);
  if (!entry) return undefined;
  // A native zero leaves AmmoMounted at its default; legacy :0 is an empty bin.
  const shots =
    nativeCount && Number(nativeCount[1]) === 0
      ? entry.shotsPerTon
      : override
        ? Number(override[1])
        : entry.shotsPerTon;
  return shots !== undefined && Number.isSafeInteger(shots) && shots >= 0
    ? { ammoId: entry.id, shots }
    : undefined;
}

/** Closed subset whose catalog identity supplies a native type/rack cap group. */
export function getCatalogAmmoBVGroup(id: string): string | undefined {
  const key = id
    .replace(/^ammo-/, '')
    .replace(/-ammo$/, '')
    .replace(/^clan-/, '');
  if (/^lb-\d+-x(?:-ac|-cluster)?$/.test(key))
    return key.replace(/-(?:ac|cluster)$/, '');
  if (/^(?:(?:light|heavy)-)?gauss(?:-rifle)?$/.test(key))
    return key.replace(/-rifle$/, '');
  if (/^improvedheavygauss(?:rifle)?$/.test(key)) return 'improvedheavygauss';
  return /^(?:ac|uac|rac|lac|lrm|srm|mrm|mml|streak-srm|streak-lrm)-\d+$/.test(
    key,
  )
    ? key
    : undefined;
}

// === AMMO WEAPON KEY NORMALIZATION ===
// MegaMek matches ammo to weapons by ammoType:rackSize. We normalize both
// ammo weaponType and weapon IDs to a common key for matching.
export function normalizeWeaponKey(id: string): string {
  const s = id
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
    [/^(?:is)?lrtorpedo-?(\d+)$/, 'lrm-$1'],
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

export function extractWeaponTypeFromAmmoId(ammoId: string): string {
  // BVCalculator.java:1189-1242 groups bins by weapon family, independent of bin size.
  let s = ammoId
    .replace(/-(half|full)$/, '')
    .replace(/-ammo$/, '')
    .replace(/ammo$/, '')
    .replace(/^ammo-/, '')
    .replace(/^clan-ammo-/, '')
    .replace(/^clan-/, '');
  s = s.replace(
    /-(standard|er|he|iiw|imp|cluster|ap|precision|fragmentation|inferno|swarm|tandem-charge|thunder|explosive|ecm|haywire|nemesis|pods)$/,
    '',
  );
  return normalizeWeaponKey(s);
}

const AMMO_WEAPON_TYPE_ALIASES: Record<string, string[]> = {
  // Native type/rack pools: BVCalculator.java:1198-1238 (48fcb2f64).
  arrowivammo: ['arrow-iv-launcher'],
  gauss: ['gauss-rifle'],
  'light-gauss': ['light-gauss-rifle'],
  'silver-bullet-gauss': ['sbgr'],
  rotaryac2: ['rac-2'],
  rotaryac5: ['rac-5'],
  'protomech-ac-2': ['protomechac2'],
  'protomech-ac-4': ['protomechac4'],
  'protomech-ac-8': ['protomechac8'],
  snipercannonammo: ['sniper-cannon'],
  thumpercannonammo: ['thumper-cannon'],
  'lb-2-x-cluster': ['lb-2-x-ac'],
  'lb-5-x-cluster': ['lb-5-x-ac'],
  'lb-10-x-cluster': ['lb-10-x-ac'],
  'lb-20-x-cluster': ['lb-20-x-ac'],
  'arrow-iv-launcher': [
    'isarrowivsystem',
    'isarrowiv',
    'clarrowiv',
    'arrow-iv',
  ],
  'arrow-iv': [
    'isarrowivsystem',
    'isarrowiv',
    'clarrowiv',
    'arrow-iv-launcher',
  ],
  'long-tom': ['long-tom-cannon'],
  'long-tom-cannon': ['long-tom'],
  'mech-mortar-1': ['mortar-1', 'mortar'],
  'mech-mortar-2': ['mortar-2', 'mortar'],
  'mech-mortar-4': ['mortar-4', 'mortar'],
  'mech-mortar-8': ['mortar-8', 'mortar'],
  'mortar-1': ['mech-mortar-1', 'mortar'],
  'mortar-2': ['mech-mortar-2', 'mortar'],
  'mortar-4': ['mech-mortar-4', 'mortar'],
  'mortar-8': ['mech-mortar-8', 'mortar'],
  mortar: [
    'mech-mortar-1',
    'mech-mortar-2',
    'mech-mortar-4',
    'mech-mortar-8',
    'mortar-1',
    'mortar-2',
    'mortar-4',
    'mortar-8',
  ],
  sniper: ['sniper-cannon', 'issniperartcannon'],
  'sniper-cannon': ['sniper'],
  thumper: ['thumper-cannon'],
  'thumper-cannon': ['thumper'],
  'medium-chemical-laser': [
    'medium-chem-laser',
    'clmediumchemlaser',
    'clan-medium-chemical-laser',
  ],
  'medium-chem-laser': [
    'medium-chemical-laser',
    'clmediumchemlaser',
    'clan-medium-chemical-laser',
  ],
  'clan-medium-chemical-laser': [
    'medium-chemical-laser',
    'medium-chem-laser',
    'clmediumchemlaser',
  ],
  'lb-5-x': ['lb-5-x-ac'],
  'lb-2-x': ['lb-2-x-ac'],
  lrtorpedo: ['lrm-15', 'lrm-10', 'lrm-5', 'lrm-20'],
  srtorpedo: ['srm-6', 'srm-4', 'srm-2'],
  'ac-10-primitive': ['ac-10'],
  'ac-5-primitive': ['ac-5'],
  'ac-20-primitive': ['ac-20'],
  impammosrm6: ['improved-srm-6'],
  clanimprovedlrm15: ['improved-lrm-15'],
  clanimprovedlrm20: ['improved-lrm-20'],
  clanimprovedlrm10: ['improved-lrm-10'],
  clanimprovedlrm5: ['improved-lrm-5'],
  isarrowivsystem: ['arrow-iv-launcher', 'arrow-iv'],
  'improved-gauss-rifle': ['climpgauss'],
  climpgauss: ['improved-gauss-rifle'],
  magshot: ['magshotgr'],
  magshotgr: ['magshot'],
  'mech-taser': ['battlemech-taser', 'taser'],
  'battlemech-taser': ['mech-taser', 'taser'],
  'heavy-rifle': ['rifle-cannon', 'isheavyrifle'],
  'rifle-cannon': ['heavy-rifle', 'isheavyrifle'],
  'medium-rifle': ['rifle-cannon', 'ismediumrifle'],
  'light-rifle': ['islightrifle'],
  taser: ['mech-taser', 'battlemech-taser'],
  'improved-narc': ['improvednarc', 'inarc', 'isimprovednarc'],
  improvednarc: ['improved-narc', 'inarc'],
  'narc-beacon': ['narcbeacon', 'narc', 'isnarcbeacon'],
  narcbeacon: ['narc-beacon', 'narc'],
  narc: ['narc-beacon', 'narcbeacon'],
  clmediumchemlaser: ['medium-chemical-laser', 'medium-chem-laser'],
};

export function findMatchingWeaponBV(
  ammoType: string,
  weaponBVByType: Record<string, number>,
): number {
  if (weaponBVByType[ammoType] !== undefined) return weaponBVByType[ammoType];
  const aliases =
    AMMO_WEAPON_TYPE_ALIASES[ammoType] ??
    AMMO_WEAPON_TYPE_ALIASES[ammoType.replace(/^clan-/, '')];
  if (aliases) {
    for (const alias of aliases) {
      if (weaponBVByType[alias] !== undefined) return weaponBVByType[alias];
    }
  }
  // MegaMek ties ammo to weapons by ammoType:rackSize, TECH-BASE AGNOSTIC
  // (IS and Clan LRMs share the same AmmoType constant). Ammo keys arrive
  // tech-stripped from the crit scan ('lrm-15') while weapon ids normalize
  // tech-preserving ('clan-lrm-15'), so without this fallback every Clan
  // bin spelled that way capped to zero (Blood Kite / Bowman -5%+ BV).
  const stripTechBase = (key: string): string => key.replace(/^clan-/, '');
  // Keep the original-family fallback first, then apply the same matching
  // to existing aliases (e.g. lb-2-x -> clan-lb-2-x-ac). Return one candidate's
  // sum so overlapping aliases cannot count a weapon more than once.
  for (const candidate of [ammoType, ...(aliases ?? [])]) {
    const techStrippedTarget = stripTechBase(candidate);
    let techStrippedSum = 0;
    for (const [weaponKey, weaponBV] of Object.entries(weaponBVByType)) {
      if (stripTechBase(weaponKey) === techStrippedTarget) {
        techStrippedSum += weaponBV;
      }
    }
    if (techStrippedSum > 0) return techStrippedSum;
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

/** Accumulate a caller-normalized weapon or ammunition key in encounter order. */
export function addBVToAmmoCapGroup(
  groups: Record<string, number>,
  key: string,
  bv: number,
): void {
  groups[key] = (groups[key] ?? 0) + bv;
}

/** An undefined cap omits a group; an explicit zero remains a real cap. */
export function sumCappedAmmoBV(
  ammoBVByType: Readonly<Record<string, number>>,
  capForType: (type: string) => number | undefined,
): number {
  let total = 0;
  for (const type of Object.keys(ammoBVByType)) {
    const cap = capForType(type);
    if (cap === undefined) continue;
    total += Math.min(ammoBVByType[type], cap);
  }
  return total;
}

/** Artillery and its cannon share legacy family keys (`sniper`, `thumper`,
 * `long-tom`) but are separate Java pools, e.g. SNIPER:20 and SNIPER_CANNON:10
 * (BVCalculator.java:1190-1240), so both sides use the native group.
 */
function artilleryCapGroup(id: string): string | undefined {
  const group = getNativeAmmoBVGroup(id);
  return group && /^(?:SNIPER|THUMPER|LONG_TOM)(?:_CANNON)?:/.test(group)
    ? group
    : undefined;
}

export function calculateAmmoBVWithExcessiveCap(
  weapons: Array<{ id: string; bv: number }>,
  ammo: Array<{ id: string; bv: number; weaponType: string }>,
): number {
  return calculateAmmoBVPools(weapons, ammo).total;
}

/** Existing Mech diagnostic pool policy, separate from arithmetic inputs. */
export function projectMechAmmoBVPools(
  pools:
    | { available: Record<string, number>; cap: Record<string, number> }
    | undefined,
  sourceWeapons?: Array<{ id: string; bv: number }>,
  sourceBins?: Array<{ id: string; bv: number; weaponType: string }>,
  supplemental?: {
    weapons: Array<{ id: string; bv: number }>;
    bins: Array<{ id: string; bv: number }>;
  },
): { available: Record<string, number>; cap: Record<string, number> } {
  const available = { ...pools?.available };
  if (sourceBins) {
    for (const [key, bv] of Object.entries(
      calculateAmmoBVPools([], sourceBins).available,
    ))
      addBVToAmmoCapGroup(available, key, bv);
  }
  const cap = sourceWeapons
    ? calculateAmmoBVPools(sourceWeapons, []).cap
    : (pools?.cap ?? {});
  const projected = { available, cap: supplemental ? { ...cap } : cap };
  if (supplemental) {
    // Replace the represented mount's compatibility contribution, rather than
    // reporting it twice. Catalog identity and arithmetic retain their policy.
    for (const { id, bv } of supplemental.weapons) {
      const native = getNativeAmmoBVGroup(id);
      const diagnostic = getMechDiagnosticAmmoBVGroup(id);
      if (
        native &&
        diagnostic &&
        native !== diagnostic &&
        Object.hasOwn(projected.cap, native)
      ) {
        projected.cap[native] -= bv;
        if (projected.cap[native] === 0) delete projected.cap[native];
        addBVToAmmoCapGroup(projected.cap, diagnostic, bv);
      }
    }
    for (const [kind, entries] of [
      ['cap', supplemental.weapons],
      ['available', supplemental.bins],
    ] as const) {
      const additional: Record<string, number> = {};
      for (const { id, bv } of entries) {
        const group = getMechDiagnosticAmmoBVGroup(id);
        if (group) addBVToAmmoCapGroup(additional, group, bv);
      }
      for (const [group, bv] of Object.entries(additional))
        if (!Object.hasOwn(projected[kind], group)) projected[kind][group] = bv;
    }
  }
  return projected;
}

/** Supplemental native identities for Mech diagnostics only. These must not
 * expand the compatibility groups used by calculateAmmoBVPools arithmetic.
 * MegaMek 48fcb2f64: BVCalculator.java:1189-1242 and the listed weapon types.
 */
export function getMechDiagnosticAmmoBVGroup(id: string): string | undefined {
  // The converter's primitive launcher id loses its qualifier in catalog lookup.
  if (/^ac-\d+p$/i.test(id))
    return getNativeAmmoBVGroup(id.replace(/p$/i, '-primitive'));
  const key = getEquipmentEntry(id)?.id ?? id.toLowerCase();
  const groups: readonly (readonly [readonly string[], string])[] = [
    [['ams', 'clan-ams'], 'AMS:2'],
    [['risc-apds', 'risc-advanced-point-defense-system'], 'APDS:2'],
    [['improved-gauss-rifle', 'impgaussammo'], 'GAUSS_IMP:0'],
    [['improved-autocannon-5', 'impammoac5'], 'AC_IMP:5'],
    [['fluid-gun', 'isfluidgun ammo', 'isfluidgunammo'], 'FLUID_GUN:1'],
    [['coolant-pod-registry'], 'COOLANT_POD:1'],
  ];
  return groups.find(([ids]) => ids.includes(key))?.[1];
}

/** The compatibility capped total plus native diagnostic pools, keyed
 * AmmoType:rackSize like BVCalculator.assembleAmmo's ammoMap and
 * weaponsForExcessiveAmmo (BVCalculator.java:1189-1242, 48fcb2f64). A bin or
 * weapon without a native identity is absent from the pools.
 */
export function calculateAmmoBVPools(
  weapons: Array<{ id: string; bv: number }>,
  ammo: Array<{ id: string; bv: number; weaponType: string }>,
): {
  total: number;
  available: Record<string, number>;
  cap: Record<string, number>;
} {
  const available: Record<string, number> = {};

  const weaponBVByType: Record<string, number> = {};
  const nativeWeaponBVByType: Record<string, number> = {};
  const cap: Record<string, number> = {};
  for (const weapon of weapons) {
    const native = getNativeAmmoBVGroup(weapon.id);
    if (native) {
      addBVToAmmoCapGroup(nativeWeaponBVByType, native, weapon.bv);
      if (countsForDiagnosticAmmoCap(weapon.id))
        addBVToAmmoCapGroup(cap, native, weapon.bv);
    }
    const weaponType =
      artilleryCapGroup(weapon.id) ?? normalizeEquipmentId(weapon.id);
    addBVToAmmoCapGroup(weaponBVByType, weaponType, weapon.bv);
  }

  const ammoBVByType: Record<string, number> = {};
  for (const ammoEntry of ammo ?? []) {
    const native =
      getNativeAmmoBVGroup(ammoEntry.id) ??
      getNativeAmmoBVGroup(ammoEntry.weaponType);
    if (native) addBVToAmmoCapGroup(available, native, ammoEntry.bv);
    const normalizedType =
      native && nativeWeaponBVByType[native] !== undefined
        ? native
        : (artilleryCapGroup(ammoEntry.id) ??
          normalizeEquipmentId(ammoEntry.weaponType));
    addBVToAmmoCapGroup(ammoBVByType, normalizedType, ammoEntry.bv);
  }

  const total = sumCappedAmmoBV(ammoBVByType, (ammoType) => {
    const matchingWeaponBV =
      nativeWeaponBVByType[ammoType] ??
      findMatchingWeaponBV(ammoType, weaponBVByType);
    return matchingWeaponBV === 0 ? undefined : matchingWeaponBV;
  });
  return { total, available, cap };
}

/** BVCalculator.java:1230-1231 (48fcb2f64) excludes F_ONE_SHOT and
 * F_INFANTRY from launcher caps, independently of ammo presence. Preserve
 * compatibility arithmetic; only the reported native cap map uses this rule.
 */
function countsForDiagnosticAmmoCap(id: string): boolean {
  const entry = getEquipmentEntry(id);
  return (
    hasNativeWeaponBVFlag(entry?.id ?? id, 'infantry') !== true &&
    ![id, entry?.name ?? '', ...(entry?.special ?? [])].some(isOneShotBVWeapon)
  );
}

/** Native AmmoType/rack identities (BVCalculator.java:1190-1240).
 * Legacy alias-key APIs retain their separate compatibility contract.
 */
export function getNativeAmmoBVGroup(id: string): string | undefined {
  // LongTomCannon.java:69-72 (48fcb2f64): canonical long-tom names the cannon.
  const sourceId =
    id.toLowerCase() === 'long-tom' ? (getEquipmentEntry(id)?.name ?? id) : id;
  const token = sourceId
    .toLowerCase()
    .split(':')[0]
    .replace(/ammo|pods|[^a-z0-9]/g, '')
    .replace(/^(?:clan|is|cl)/, '');
  const patterns: readonly (readonly [RegExp, string])[] = [
    [/^(?:ac|autocannon)(\d+)primitive/, 'AC_PRIMITIVE:$1'],
    [/^(?:lb|lbxac)(\d+)(?:x)?/, 'AC_LBX:$1'],
    [/^(?:ultraac|uac)(\d+)/, 'AC_ULTRA:$1'],
    [/^(?:rotaryac|rac)(\d+)/, 'AC_ROTARY:$1'],
    [/^(?:lightautocannon|lightac|lac)(\d+)/, 'LAC:$1'],
    [/^streaksrm(\d+)/, 'SRM_STREAK:$1'],
    [/^streaklrm(\d+)/, 'LRM_STREAK:$1'],
    [/^(?:lrtorpedo|lrt)(\d+)/, 'LRM_TORPEDO:$1'],
    [/^(?:srtorpedo|srt)(\d+)/, 'SRM_TORPEDO:$1'],
    [/^(?:extended|er)lrm(\d+)/, 'EXLRM:$1'],
    [/^enhancedlrm(\d+)/, 'NLRM:$1'],
    [/^(?:improved|imp)lrm(\d+)/, 'LRM_IMP:$1'],
    [/^(?:improved|imp)srm(\d+)/, 'SRM_IMP:$1'],
    [/^(?:mechmortar|scmortar|mortar)(\d+)/, 'MEK_MORTAR:$1'],
    [/^protomechac(\d+)/, 'PAC:$1'],
    [
      /^(?:hypervelocityautocannon|hypervelocityac|hvac)(\d+)/,
      'HYPER_VELOCITY:$1',
    ],
    [/^(?:hyperassaultgaussrifle|hag)(\d+)/, 'HAG:$1'],
    [/^thunderbolt(\d+)/, 'TBOLT_$1:1'],
    [/^cruisemissile(\d+)/, 'CRUISE_MISSILE:$1'],
    [/^longtomcannon/, 'LONG_TOM_CANNON:20'],
    [/^longtom/, 'LONG_TOM:25'],
    [/^snipercannon/, 'SNIPER_CANNON:10'],
    [/^sniper/, 'SNIPER:20'],
    [/^thumpercannon/, 'THUMPER_CANNON:5'],
    [/^thumper/, 'THUMPER:15'],
    [/^arrowiv/, 'ARROW_IV:20'],
    [/^(?:vehicleflamer|flamervehicle)/, 'VEHICLE_FLAMER:2'],
    [/^heavyflamer/, 'HEAVY_FLAMER:2'],
    [/^plasmarifle/, 'PLASMA:1'],
    [/^plasmacannon/, 'PLASMA:2'],
    [/^(?:apgauss)/, 'APGAUSS:0'],
    [/^magshot/, 'MAGSHOT:0'],
    [/^lightgauss/, 'GAUSS_LIGHT:0'],
    [/^improvedheavygauss/, 'IGAUSS_HEAVY:0'],
    [/^heavygauss/, 'GAUSS_HEAVY:0'],
    [/^gauss/, 'GAUSS:0'],
    [/^(?:silverbulletgauss|sbgauss|sbgr)/, 'SBGAUSS:15'],
    [/^large(?:chem|chemical)laser/, 'CHEMICAL_LASER:1'],
    [/^medium(?:chem|chemical)laser/, 'CHEMICAL_LASER:5'],
    [/^(?:lightrifle|riflecannonlight)/, 'RIFLE:3'],
    [/^(?:mediumrifle|riflecannonmedium)/, 'RIFLE:6'],
    [/^(?:heavyrifle|riflecannonheavy)/, 'RIFLE:9'],
    [/^nailrivet/, 'NAIL_RIVET_GUN:1'],
    [/^(?:lightmachinegun|lightmg|lmg)(?:half|full|st|pt)?$/, 'MG_LIGHT:1'],
    [/^(?:heavymachinegun|heavymg|hmg)(?:half|full|st|pt)?$/, 'MG_HEAVY:3'],
    [/^(?:machinegun|mg)(?:half|full|st|pt)?$/, 'MG:2'],
    [/^(?:improvednarc|inarc)/, 'INARC:1'],
    [/^narc/, 'NARC:1'],
    [/^(?:vehiculargrenadelauncher|vgl)/, 'VGL:1'],
    [/^(?:battlemechtaser|taser)/, 'TASER:1'],
    [/^c3(?:sensors|remotesensorlauncher)/, 'C3_REMOTE_SENSOR:1'],
  ];
  for (const [pattern, replacement] of patterns) {
    const match = token.match(pattern);
    if (match) return replacement.replace('$1', match[1] ?? '');
  }
  const rack = token.match(
    /^(lrm|srm|mml|mrm|atm|iatm|lac|ac|autocannon)(\d+)/,
  );
  return rack
    ? nativeAmmoBVKey(
        rack[1] === 'autocannon' ? 'AC' : rack[1].toUpperCase(),
        rack[2],
      )
    : undefined;
}

function nativeAmmoBVKey(ammoType: string, rackSize: number | string): string {
  return `${ammoType}:${rackSize}`;
}

/** LargeAeroBVCalculator.assembleAmmo: native enum/rack keys for capital pools. */
export function getLargeAerospaceAmmoBVGroup(id: string): string | undefined {
  const capital = getCapitalEquipmentBVFacts(id);
  if (capital && !['NA', 'SCREEN_LAUNCHER'].includes(capital.ammoType))
    return nativeAmmoBVKey(capital.ammoType, capital.rackSize);
  return getNativeAmmoBVGroup(id);
}

const MG_ARRAY_GUN_IDS: Readonly<Record<string, string>> = {
  mga: 'machine-gun',
  lmga: 'light-machine-gun',
  hmga: 'heavy-machine-gun',
};
/** Array caliber reuses the authoritative native ammo type/rack projection. */
export function getMachineGunArrayBVGroup(id: string): string | undefined {
  if (!Object.hasOwn(MG_ARRAY_GUN_IDS, id)) return undefined;
  const gun = MG_ARRAY_GUN_IDS[id];
  return gun ? getNativeAmmoBVGroup(gun) : undefined;
}

/** Existing Mech BV lookup policy; source annotations do not change identity. */
export function normalizeMechBVSourceName(name: string): string {
  return name
    .replace(/\s*\(armored\)/gi, '')
    .replace(/\s*\(r\)/gi, '')
    .trim();
}
