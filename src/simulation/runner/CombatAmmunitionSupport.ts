import type { ICombatFeatureSupportEntry } from './CombatFeatureSupport';

function integrated(id: string, evidence: string): ICombatFeatureSupportEntry {
  return { id, level: 'integrated', evidence };
}

function helperOnly(
  id: string,
  evidence: string,
  gap: string,
): ICombatFeatureSupportEntry {
  return { id, level: 'helper-only', evidence, gap };
}

export const AMMUNITION_COMPATIBILITY_SUPPORT = {
  'battlemech-compatible-ammo': integrated(
    'battlemech-compatible-ammo',
    'Compatible official ammo rows are pinned by exact id, initialize ammo bins, report total rounds, and consume through combat ammo tracking for every referenced official weapon id',
  ),
  'duplicate-runtime-id': integrated(
    'duplicate-runtime-id',
    'Ammo rows that duplicate weapon runtime ids are classified by exact id before compatibility checks so weapon rows do not masquerade as missing ammo mappings',
  ),
  'battlemech-ammo-missing-compatible-weapon-refs': helperOnly(
    'battlemech-ammo-missing-compatible-weapon-refs',
    'Standard or advanced official ammo rows with no compatible weapon ids stay visible by exact id in the BattleMech ammo audit',
    'Catalog data needs compatibleWeaponIds before these rows can become consumable BattleMech ammo bins',
  ),
  'non-battlemech-aerospace-capital-ammo': helperOnly(
    'non-battlemech-aerospace-capital-ammo',
    'Aerospace and capital ammo rows are classified outside the BattleMech weapon compatibility lane',
    'Aerospace and capital weapon systems need a separate validation matrix',
  ),
  'non-battlemech-battle-armor': helperOnly(
    'non-battlemech-battle-armor',
    'Battle armor ammo rows are classified outside the BattleMech weapon compatibility lane',
    'Battle armor weapon systems need a separate validation matrix',
  ),
  'non-battlemech-protomech': helperOnly(
    'non-battlemech-protomech',
    'ProtoMech ammo rows are classified outside the BattleMech weapon compatibility lane',
    'ProtoMech weapon systems need a separate validation matrix',
  ),
  'nonstandard-empty-compatible-row': helperOnly(
    'nonstandard-empty-compatible-row',
    'Experimental or nonstandard ammo rows with no compatible weapon ids are retained as catalog-visible scope gaps',
    'Rules-level-specific validation must decide whether these rows belong in BattleMech combat',
  ),
  'unsupported-aquatic-torpedo-ammo': helperOnly(
    'unsupported-aquatic-torpedo-ammo',
    'Aquatic torpedo ammo rows are separated from normal BattleMech launcher compatibility',
    'Aquatic combat and torpedo launcher behavior need a separate validation matrix',
  ),
  'unsupported-artillery-ammo': helperOnly(
    'unsupported-artillery-ammo',
    'Artillery ammo rows are separated from direct BattleMech weapon compatibility',
    'Artillery attack flow and ammunition behavior need a separate validation matrix',
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
