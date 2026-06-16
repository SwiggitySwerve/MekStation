import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

function integrated(
  id: string,
  evidence: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? { id, level: 'integrated', evidence, sourceRefs }
    : { id, level: 'integrated', evidence };
}

function outOfScope(
  id: string,
  evidence: string,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? { id, level: 'out-of-scope', evidence, gap, sourceRefs }
    : { id, level: 'out-of-scope', evidence, gap };
}

function mekstationDeviationSourceRef(
  citation: string,
  path: string,
  lineRange: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'mekstation-deviation',
    citation,
    url: `${path}#${lineRange}`,
    sourceVersion: 'MekStation working-tree',
  };
}

const MEGAMEK_SOURCE_VERSION = '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

function megamekSourceRef(
  citation: string,
  path: string,
  lineRange: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_SOURCE_VERSION}/megamek/src/${path}#${lineRange}`,
    sourceVersion: MEGAMEK_SOURCE_VERSION,
  };
}

const MEKSTATION_OFFICIAL_AMMO_CATALOG_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation imports every official ammunition category JSON file used by the combat validation catalog.',
    'src/utils/construction/equipmentBVCatalogData.ts',
    'L2-L11',
  ),
  mekstationDeviationSourceRef(
    'MekStation groups every official ammunition category import into AMMUNITION_CATALOG_FILES.',
    'src/utils/construction/equipmentBVCatalogData.ts',
    'L73-L84',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_AMMO_LOOKUP_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation buildAmmoLookupFromCatalogFiles reads official ammo items, normalizes compatibleWeaponIds, and indexes ammo ids plus aliases.',
    'src/simulation/runner/UnitHydration.ts',
    'L2246-L2302',
  ),
  mekstationDeviationSourceRef(
    'MekStation hydrateAmmoStateFromFullUnit turns resolved catalog ammo into combat ammo bins with weapon type, location, rounds, and explosive state.',
    'src/simulation/runner/UnitHydration.ts',
    'L1878-L1912',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_AMMO_TRACKING_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation ammoTracking initializes ammo bin state, checks weapon availability, totals matching ammo, and consumes rounds from matching bins.',
    'src/utils/gameplay/ammoTracking/state.ts',
    'L75-L162',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_AMMO_COMPATIBLE_CONTRACT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation battlemechCombatCatalog.contract pins exact compatible BattleMech ammo ids.',
    'src/simulation/runner/__tests__/battlemechCombatCatalog.contract.test.ts',
    'L433-L486',
  ),
  mekstationDeviationSourceRef(
    'MekStation battlemechCombatCatalog.contract proves every compatible official ammo row initializes, totals, and consumes as a combat ammo bin for each referenced official weapon id.',
    'src/simulation/runner/__tests__/battlemechCombatCatalog.contract.test.ts',
    'L1140-L1185',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_AMMO_GAP_CONTRACT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation battlemechCombatCatalog.contract pins exact BattleMech ammo gap ids for missing compatible weapon refs and duplicate runtime ids.',
    'src/simulation/runner/__tests__/battlemechCombatCatalog.contract.test.ts',
    'L162-L183',
  ),
  mekstationDeviationSourceRef(
    'MekStation battlemechCombatCatalog.contract pins exact non-BattleMech ammo scope split ids for aerospace/capital, battle armor, ProtoMech, torpedo, and artillery rows.',
    'src/simulation/runner/__tests__/battlemechCombatCatalog.contract.test.ts',
    'L191-L284',
  ),
  mekstationDeviationSourceRef(
    'MekStation battlemechCombatCatalog.contract pins exact experimental and unofficial official ammo rows with no compatible weapon refs.',
    'src/simulation/runner/__tests__/battlemechCombatCatalog.contract.test.ts',
    'L287-L431',
  ),
  mekstationDeviationSourceRef(
    'MekStation battlemechCombatCatalog.contract classifies every official ammo row and locks the expected support class counts.',
    'src/simulation/runner/__tests__/battlemechCombatCatalog.contract.test.ts',
    'L1187-L1378',
  ),
  mekstationDeviationSourceRef(
    'MekStation battlemechCombatCatalog.contract guards empty-compatible non-official rows and unsupported RAC/10/RAC/20 ammo against drifting into official compatible ammo coverage or static alias/BV fallback.',
    'src/simulation/runner/__tests__/battlemechCombatCatalog.contract.test.ts',
    'L1407-L1600',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_UNSUPPORTED_RAC_AMMO_CATALOG_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation UnitHydration skips unsupported RAC/10 and RAC/20 ammo rows instead of deriving usable weapon types from ammo ids.',
    'src/simulation/runner/UnitHydration.ts',
    'L1136-L1141',
  ),
  mekstationDeviationSourceRef(
    'MekStation UnitHydration omits unsupported ammo rows from hydrated combat ammo bins when no source-backed weapon type is available.',
    'src/simulation/runner/UnitHydration.ts',
    'L2497-L2498',
  ),
  mekstationDeviationSourceRef(
    'MekStation battlemechCombatCatalog.contract proves the official autocannon ammo catalog carries standard RAC/10 and RAC/20 ammo rows with empty compatibleWeaponIds.',
    'src/simulation/runner/__tests__/battlemechCombatCatalog.contract.test.ts',
    'L1420-L1439',
  ),
  mekstationDeviationSourceRef(
    'MekStation battlemechCombatCatalog.contract proves unsupported RAC/10 and RAC/20 ammo critical slots do not hydrate into fireable runtime ammo bins.',
    'src/simulation/runner/__tests__/battlemechCombatCatalog.contract.test.ts',
    'L1223-L1247',
  ),
  mekstationDeviationSourceRef(
    'MekStation battlemechCombatCatalog.contract proves the official ballistic-autocannon weapon catalog exposes Rotary AC/2 and Rotary AC/5 rows but no official RAC/10 or RAC/20 weapon rows.',
    'src/simulation/runner/__tests__/battlemechCombatCatalog.contract.test.ts',
    'L1400-L1418',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_ROTARY_AC_10_20_AMMO_SOURCE_REFS = [
  megamekSourceRef(
    'MegaMek AmmoType defines Inner Sphere RAC/10 and RAC/20 ammunition as AC_ROTARY rows.',
    'megamek/common/equipment/AmmoType.java',
    'L14994-L15039',
  ),
  megamekSourceRef(
    'MegaMek AmmoType defines Clan RAC/10 and RAC/20 ammunition as unofficial AC_ROTARY rows.',
    'megamek/common/equipment/AmmoType.java',
    'L15042-L15085',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_UNOFFICIAL_ROTARY_AC_10_20_WEAPON_SOURCE_REFS = [
  megamekSourceRef(
    'MegaMek CLRAC10 lives in megamek.common.weapons.unofficial.clan and marks Rotary AC/10 rulesRefs as Unofficial.',
    'megamek/common/weapons/unofficial/clan/CLRAC10.java',
    'L35-L76',
  ),
  megamekSourceRef(
    'MegaMek CLRAC20 lives in megamek.common.weapons.unofficial.clan and marks Rotary AC/20 rulesRefs as Unofficial.',
    'megamek/common/weapons/unofficial/clan/CLRAC20.java',
    'L35-L76',
  ),
  megamekSourceRef(
    'MegaMek WeaponType imports CLRAC10 and CLRAC20 from the unofficial clan package.',
    'megamek/common/equipment/WeaponType.java',
    'L485-L488',
  ),
  megamekSourceRef(
    'MegaMek WeaponType registers CLRAC10 and CLRAC20 in the MFUK weapons block alongside unofficial weapon rows.',
    'megamek/common/equipment/WeaponType.java',
    'L1733-L1738',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const BATTLEMECH_COMPATIBLE_AMMO_SOURCE_REFS = [
  ...MEKSTATION_OFFICIAL_AMMO_CATALOG_SOURCE_REFS,
  ...MEKSTATION_AMMO_LOOKUP_SOURCE_REFS,
  ...MEKSTATION_AMMO_TRACKING_SOURCE_REFS,
  ...MEKSTATION_AMMO_COMPATIBLE_CONTRACT_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

const BATTLEMECH_AMMO_GAP_SOURCE_REFS = [
  ...MEKSTATION_OFFICIAL_AMMO_CATALOG_SOURCE_REFS,
  ...MEKSTATION_AMMO_LOOKUP_SOURCE_REFS,
  ...MEKSTATION_AMMO_GAP_CONTRACT_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

const BATTLEMECH_UNSUPPORTED_RAC_AMMO_SOURCE_REFS = [
  ...BATTLEMECH_AMMO_GAP_SOURCE_REFS,
  ...MEKSTATION_UNSUPPORTED_RAC_AMMO_CATALOG_SOURCE_REFS,
  ...MEGAMEK_ROTARY_AC_10_20_AMMO_SOURCE_REFS,
  ...MEGAMEK_UNOFFICIAL_ROTARY_AC_10_20_WEAPON_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const UNSUPPORTED_ROTARY_AC_10_20_AMMO_IDS = [
  'rotaryac10',
  'rotaryac20',
] as const;

export const UNSUPPORTED_ROTARY_AC_10_20_WEAPON_PROBE_IDS = [
  'rac-10',
  'rac-20',
  'clan-rac-10',
  'clan-rac-20',
  'rotary-ac-10',
  'rotary-ac-20',
  'clan-rotary-ac-10',
  'clan-rotary-ac-20',
] as const;

export const AMMUNITION_COMPATIBILITY_SUPPORT = {
  'battlemech-compatible-ammo': integrated(
    'battlemech-compatible-ammo',
    'Compatible official ammo rows are pinned by exact id, initialize ammo bins, report total rounds, and consume through combat ammo tracking for every referenced official weapon id',
    BATTLEMECH_COMPATIBLE_AMMO_SOURCE_REFS,
  ),
  'duplicate-runtime-id': integrated(
    'duplicate-runtime-id',
    'Ammo rows that duplicate weapon runtime ids are classified by exact id before compatibility checks so weapon rows do not masquerade as missing ammo mappings',
    BATTLEMECH_AMMO_GAP_SOURCE_REFS,
  ),
  'battlemech-ammo-missing-compatible-weapon-refs': integrated(
    'battlemech-ammo-missing-compatible-weapon-refs',
    'The BattleMech ammo audit proves the generic standard or advanced missing-compatible bucket is empty after exact unsupported rows are classified separately',
    BATTLEMECH_AMMO_GAP_SOURCE_REFS,
  ),
  'unsupported-rotary-ac-10-20-ammo': integrated(
    'unsupported-rotary-ac-10-20-ammo',
    'Official Rotary AC/10 and Rotary AC/20 ammo rows are pinned by exact id with empty compatibleWeaponIds, proven absent from official BattleMech RAC/10 or RAC/20 weapon refs, and skipped by runtime ammo-bin hydration without deriving compatibility from MegaMek unofficial weapon classes, aliases, ammo ids, or static BV ids',
    BATTLEMECH_UNSUPPORTED_RAC_AMMO_SOURCE_REFS,
  ),
  'non-battlemech-aerospace-capital-ammo': outOfScope(
    'non-battlemech-aerospace-capital-ammo',
    'Aerospace and capital ammo rows are pinned by exact id outside the BattleMech weapon compatibility lane',
    'Aerospace and capital weapon systems need a separate validation matrix',
    BATTLEMECH_AMMO_GAP_SOURCE_REFS,
  ),
  'non-battlemech-battle-armor': outOfScope(
    'non-battlemech-battle-armor',
    'Battle armor ammo rows are pinned by exact id outside the BattleMech weapon compatibility lane',
    'Battle armor weapon systems need a separate validation matrix',
    BATTLEMECH_AMMO_GAP_SOURCE_REFS,
  ),
  'non-battlemech-protomech': outOfScope(
    'non-battlemech-protomech',
    'ProtoMech ammo rows are pinned by exact id outside the BattleMech weapon compatibility lane',
    'ProtoMech weapon systems need a separate validation matrix',
    BATTLEMECH_AMMO_GAP_SOURCE_REFS,
  ),
  'experimental-empty-compatible-row': outOfScope(
    'experimental-empty-compatible-row',
    'Experimental BattleMech-family ammo rows are exact-id pinned by rulesLevel, have empty compatibleWeaponIds, and are excluded from official compatible BattleMech ammo coverage',
    'Experimental ammo rules need a separate validation matrix before they can be counted against official BattleMech completion',
    BATTLEMECH_AMMO_GAP_SOURCE_REFS,
  ),
  'unofficial-empty-compatible-row': outOfScope(
    'unofficial-empty-compatible-row',
    'Unofficial BattleMech-family ammo rows are exact-id pinned by rulesLevel, have empty compatibleWeaponIds, and are excluded from official compatible BattleMech ammo coverage',
    'Unofficial ammo rules need a separate validation matrix before they can be counted against official BattleMech completion',
    BATTLEMECH_AMMO_GAP_SOURCE_REFS,
  ),
  'unsupported-aquatic-torpedo-ammo': outOfScope(
    'unsupported-aquatic-torpedo-ammo',
    'Aquatic torpedo ammo rows are pinned by exact id outside normal BattleMech launcher compatibility',
    'Aquatic combat and torpedo launcher behavior need a separate validation matrix',
    BATTLEMECH_AMMO_GAP_SOURCE_REFS,
  ),
  'unsupported-artillery-ammo': outOfScope(
    'unsupported-artillery-ammo',
    'Artillery ammo rows are pinned by exact id outside direct BattleMech weapon compatibility',
    'Artillery attack flow and ammunition behavior need a separate validation matrix',
    BATTLEMECH_AMMO_GAP_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
