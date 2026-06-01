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

function helperOnly(
  id: string,
  evidence: string,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? { id, level: 'helper-only', evidence, gap, sourceRefs }
    : { id, level: 'helper-only', evidence, gap };
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
    'L1802-L1856',
  ),
  mekstationDeviationSourceRef(
    'MekStation hydrateAmmoStateFromFullUnit turns resolved catalog ammo into combat ammo bins with weapon type, location, rounds, and explosive state.',
    'src/simulation/runner/UnitHydration.ts',
    'L1470-L1502',
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
    'L422-L468',
  ),
  mekstationDeviationSourceRef(
    'MekStation battlemechCombatCatalog.contract proves every compatible official ammo row initializes, totals, and consumes as a combat ammo bin for each referenced official weapon id.',
    'src/simulation/runner/__tests__/battlemechCombatCatalog.contract.test.ts',
    'L1111-L1155',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_AMMO_GAP_CONTRACT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation battlemechCombatCatalog.contract pins exact BattleMech ammo gap ids for missing compatible weapon refs and duplicate runtime ids.',
    'src/simulation/runner/__tests__/battlemechCombatCatalog.contract.test.ts',
    'L157-L181',
  ),
  mekstationDeviationSourceRef(
    'MekStation battlemechCombatCatalog.contract pins exact non-BattleMech ammo scope split ids for aerospace/capital, battle armor, ProtoMech, torpedo, and artillery rows.',
    'src/simulation/runner/__tests__/battlemechCombatCatalog.contract.test.ts',
    'L183-L274',
  ),
  mekstationDeviationSourceRef(
    'MekStation battlemechCombatCatalog.contract pins exact experimental and nonstandard official ammo rows with no compatible weapon refs.',
    'src/simulation/runner/__tests__/battlemechCombatCatalog.contract.test.ts',
    'L276-L420',
  ),
  mekstationDeviationSourceRef(
    'MekStation battlemechCombatCatalog.contract classifies every official ammo row and locks the expected support class counts.',
    'src/simulation/runner/__tests__/battlemechCombatCatalog.contract.test.ts',
    'L1158-L1227',
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
  'battlemech-ammo-missing-compatible-weapon-refs': helperOnly(
    'battlemech-ammo-missing-compatible-weapon-refs',
    'Standard or advanced official ammo rows with no compatible weapon ids stay visible by exact id in the BattleMech ammo audit',
    'Catalog data needs compatibleWeaponIds before these rows can become consumable BattleMech ammo bins',
    BATTLEMECH_AMMO_GAP_SOURCE_REFS,
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
  'nonstandard-empty-compatible-row': helperOnly(
    'nonstandard-empty-compatible-row',
    'Experimental or nonstandard ammo rows with no compatible weapon ids are pinned by exact id as catalog-visible scope gaps',
    'Rules-level-specific validation must decide whether these rows belong in BattleMech combat',
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
