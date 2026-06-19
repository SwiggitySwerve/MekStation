import { type KnownLimitationCategory } from '@/simulation/core/knownLimitations';

import { mekstationDeviationSourceRefWithLineAnchor as mekstationDeviationSourceRef } from './CombatFeatureSourceReference';
import {
  integrated,
  outOfScope,
  type ICombatFeatureSourceReference,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

export const BATTLEMECH_COMBAT_VALIDATION_INVARIANT =
  'battlemech-combat-validation';

export const KNOWN_LIMITATION_VALIDATION_TRAPS = [
  {
    id: 'physical-attack-filter-trap',
    category: 'physicalAttacks',
    message: 'physical attack charge and death from above',
  },
  {
    id: 'ammo-consumption-filter-trap',
    category: 'ammoConsumption',
    message: 'ammo consumption not decremented when fired',
  },
  {
    id: 'heat-shutdown-filter-trap',
    category: 'heatShutdown',
    message: 'heat induced shutdown restart after shutdown',
  },
  {
    id: 'terrain-movement-filter-trap',
    category: 'terrainMovement',
    message: 'terrain movement cost water hex rubble cost',
  },
  {
    id: 'piloting-check-filter-trap',
    category: 'pilotingChecks',
    message: 'piloting check fall check skid check',
  },
  {
    id: 'critical-effect-filter-trap',
    category: 'criticalEffects',
    message: 'critical hit effect actuator damage gyro hit',
  },
  {
    id: 'line-of-sight-filter-trap',
    category: 'lineOfSight',
    message: 'line of sight blocked by intervening terrain',
  },
  {
    id: 'special-ability-filter-trap',
    category: 'specialAbilities',
    message: 'special pilot ability spa effect not applied',
  },
  {
    id: 'vehicle-aerospace-filter-trap',
    category: 'vehicleAerospace',
    message: 'vehicle movement vtol altitude wheeled tracked hover movement',
  },
  {
    id: 'campaign-progression-filter-trap',
    category: 'campaignProgression',
    message: 'campaign system xp award skill progression unit repair',
  },
  {
    id: 'mtf-parsing-filter-trap',
    category: 'mtfParsing',
    message: 'mtf file parsing mtf import mechtech format',
  },
] as const satisfies readonly {
  readonly id: string;
  readonly category: KnownLimitationCategory;
  readonly message: string;
}[];

const KNOWN_LIMITATION_BYPASS_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation knownLimitations declares the battlemech-combat-validation invariant as an evidence-generator bypass before broad limitation matching.',
    'src/simulation/core/knownLimitations.ts',
    'L148-L210',
  ),
  mekstationDeviationSourceRef(
    'MekStation knownLimitations returns null categories for bypassing validation-suite invariants while preserving broad pattern audit lookup.',
    'src/simulation/core/knownLimitations.ts',
    'L230-L243',
  ),
  mekstationDeviationSourceRef(
    'MekStation battlemechCombatCatalog.contract proves BattleMech validation traps are not filtered as known limitations.',
    'src/simulation/runner/__tests__/battlemechCombatCatalog.19.audits-known-limitation-traps-without-filtering-combat.fragment.ts',
    'L4-L24',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const KNOWN_LIMITATION_PATTERN_AUDIT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation knownLimitations exposes every broad limitation category id for validation-trap parity.',
    'src/simulation/core/knownLimitations.ts',
    'L31-L139',
  ),
  mekstationDeviationSourceRef(
    'MekStation combatValidationScope.contract requires one BattleMech validation trap per known-limitation category and verifies broad pattern category lookup.',
    'src/simulation/runner/__tests__/combatValidationScope.contract.test.ts',
    'L115-L136',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const CATALOG_FILTER_GATE_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation combatValidationScope.contract scans runner catalog contracts and forbids known-limitation filter or partition helpers as catalog gates.',
    'src/simulation/runner/__tests__/combatValidationScope.contract.test.ts',
    'L163-L177',
  ),
  mekstationDeviationSourceRef(
    'MekStation battlemechCombatCatalog.contract self-checks that known-limitation filtering cannot gate the BattleMech catalog validation lane.',
    'src/simulation/runner/__tests__/battlemechCombatCatalog.19.audits-known-limitation-traps-without-filtering-combat.fragment.ts',
    'L26-L46',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const OFFICIAL_CATALOG_SCOPE_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation battlemechCombatCatalog.contract counts every official ranged weapon, physical weapon, and ammo row visible to the construction catalog.',
    'src/simulation/runner/__tests__/battlemechCombatCatalog.01.covers-every-official-ranged-weapon-physical-weapon-an.fragment.ts',
    'L4-L16',
  ),
  mekstationDeviationSourceRef(
    'MekStation physicalWeaponCatalogBoundary partitions every official physical weapon into runtime attacks or helper-only modifier equipment.',
    'src/simulation/runner/__tests__/physicalWeaponCatalogBoundary.behavior.test.ts',
    'L88-L130',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const STATIC_WEAPON_DATABASE_SCOPE_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation battlemechCombatCatalog.contract keeps WEAPON_DATABASE a legacy subset and proves official-only weapons resolve through catalog lookup.',
    'src/simulation/runner/__tests__/battlemechCombatCatalog.01.covers-every-official-ranged-weapon-physical-weapon-an.fragment.ts',
    'L84-L151',
  ),
  mekstationDeviationSourceRef(
    'MekStation CompendiumAdapter canonicalizes and resolves weapons through the official catalog before the legacy static fallback.',
    'src/engine/adapters/CompendiumAdapter.ts',
    'L55-L95',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const SYNTHETIC_MEDIUM_LASER_FALLBACK_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation battlemechCombatCatalog.contract proves catalog AI unit conversion rejects synthetic Medium Laser fallback hydration.',
    'src/simulation/runner/__tests__/battlemechCombatCatalog.01.covers-every-official-ranged-weapon-physical-weapon-an.fragment.ts',
    'L201-L226',
  ),
  mekstationDeviationSourceRef(
    'MekStation CompendiumAdapter surfaces missing weapon catalog data instead of silently defaulting to a placeholder weapon.',
    'src/engine/adapters/CompendiumAdapter.ts',
    'L185-L208',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const VARIABLE_DAMAGE_STRING_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation battlemechCombatCatalog.contract pins every official string-damage missile weapon to a nonzero resolved volley damage.',
    'src/simulation/runner/__tests__/battlemechCombatCatalog.01.covers-every-official-ranged-weapon-physical-weapon-an.fragment.ts',
    'L182-L199',
  ),
  mekstationDeviationSourceRef(
    'MekStation UnitHydration resolves MML-style 1-2/missile descriptors to max volley damage instead of zero.',
    'src/simulation/runner/UnitHydration.ts',
    'L402-L430',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const NON_BATTLEMECH_AMMO_SCOPE_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation CombatAmmunitionSupport pins non-BattleMech ammo classes to aerospace/capital, battle armor, ProtoMech, torpedo, and artillery scope splits.',
    'src/simulation/runner/CombatAmmunitionSupport.ts',
    'L87-L108',
  ),
  mekstationDeviationSourceRef(
    'MekStation battlemechCombatCatalog.contract classifies every official ammo row and locks non-BattleMech ammo support class counts.',
    'src/simulation/runner/__tests__/battlemechCombatCatalog.02.classifies-official-ammo-rows-without-compatible-weapo.fragment.ts',
    'L4-L224',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const NON_BATTLEMECH_COMBAT_SYSTEM_SPLIT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation CombatEventSupport keeps vehicle, VTOL, battle armor, swarm, and leg-attack event families out of the BattleMech event matrix.',
    'src/simulation/runner/CombatEventSupport.ts',
    'L248-L324',
  ),
  mekstationDeviationSourceRef(
    'MekStation combatEventCatalog.contract proves every GameEventType is partitioned into BattleMech combat support or explicit non-BattleMech scope.',
    'src/simulation/runner/__tests__/combatEventCatalog.contract.test.ts',
    'L56-L82',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const UNRESOLVED_COMPLETION_BLOCKER_INVENTORY_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation CombatValidationGapInventory exports helper-only and unsupported catalog rows as sorted machine-readable completion blockers and classifies validation objective rollups separately from leaf gaps.',
    'src/simulation/runner/CombatValidationGapInventory.ts',
    'L21-L69',
  ),
  mekstationDeviationSourceRef(
    'MekStation combatValidationCatalog.contract asserts the exported unresolved inventory shape and sentinel blocker rows.',
    'src/simulation/runner/__tests__/combatValidationCatalog.test-helpers.ts',
    'L445-L2236',
  ),
  mekstationDeviationSourceRef(
    'MekStation combatValidationCatalog.contract asserts the unresolved inventory leaf/aggregate split so objective rollups stay visible without being mistaken for leaf mechanic gaps.',
    'src/simulation/runner/__tests__/combatValidationCatalog.test-helpers.ts',
    'L445-L2236',
  ),
  mekstationDeviationSourceRef(
    'MekStation combatValidationCatalog.contract asserts the unresolved inventory is exposed through named validation tooling.',
    'src/simulation/runner/__tests__/combatValidationCatalog.05.exposes-the-unresolved-inventory-through-combat-valida.fragment.ts',
    'L4-L61',
  ),
  mekstationDeviationSourceRef(
    'MekStation print-combat-validation-gaps emits JSON, Markdown, refs, and summary views of the unresolved inventory, with optional all/leaf/aggregate scope filtering, expected-count assertions, expected-ref assertions, and fail-closed unknown flag handling for review gates.',
    'scripts/print-combat-validation-gaps.ts',
    'L1-L216',
  ),
  mekstationDeviationSourceRef(
    'MekStation validate-combat-suite asserts the reviewed unresolved gap inventory baseline after focused combat catalog and behavior tests.',
    'scripts/validate-combat-suite.mjs',
    'L109-L128',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const BATTLEMECH_VALIDATION_SCOPE_SUPPORT = {
  'known-limitation-bypass': integrated(
    'known-limitation-bypass',
    'knownLimitations.ts bypasses the battlemech-combat-validation invariant before broad limitation detection, filtering, and partitioning',
    KNOWN_LIMITATION_BYPASS_SOURCE_REFS,
  ),
  'known-limitation-pattern-audit': integrated(
    'known-limitation-pattern-audit',
    'every broad known-limitation category has a BattleMech validation trap; getLimitationPatternCategory still reports the broad matching category so validation-trap coverage remains auditable',
    KNOWN_LIMITATION_PATTERN_AUDIT_SOURCE_REFS,
  ),
  'catalog-filter-gate-ban': integrated(
    'catalog-filter-gate-ban',
    'combatValidationScope.contract.test.ts scans every runner combat catalog contract and forbids filterKnownLimitations/partitionViolations as catalog gates',
    CATALOG_FILTER_GATE_SOURCE_REFS,
  ),
  'battlemech-official-catalog-scope': integrated(
    'battlemech-official-catalog-scope',
    'battlemechCombatCatalog.contract.test.ts covers every official ranged weapon, physical weapon, and ammo entry visible to the construction catalog',
    OFFICIAL_CATALOG_SCOPE_SOURCE_REFS,
  ),
  'static-weapon-database-subset': integrated(
    'static-weapon-database-subset',
    'battlemechCombatCatalog.contract.test.ts requires WEAPON_DATABASE to stay a legacy subset of the official ranged catalog and proves official-only weapons resolve through catalog lookup',
    STATIC_WEAPON_DATABASE_SCOPE_SOURCE_REFS,
  ),
  'synthetic-medium-laser-fallback-ban': integrated(
    'synthetic-medium-laser-fallback-ban',
    'battlemechCombatCatalog.contract.test.ts proves catalog AI unit conversion refuses the legacy synthetic Medium Laser fallback when hydration is missing',
    SYNTHETIC_MEDIUM_LASER_FALLBACK_SOURCE_REFS,
  ),
  'variable-damage-string-guard': integrated(
    'variable-damage-string-guard',
    'battlemechCombatCatalog.contract.test.ts pins every official string-damage missile weapon resolution, including 1-2/missile MML rows, so official weapons cannot collapse to zero damage',
    VARIABLE_DAMAGE_STRING_SOURCE_REFS,
  ),
  'unresolved-completion-blocker-inventory': integrated(
    'unresolved-completion-blocker-inventory',
    'CombatValidationGapInventory exports the aggregate helper-only and unsupported support rows as sorted machine-readable completion blockers, print-combat-validation-gaps fails closed on malformed reviewer flags, and validate:combat asserts the reviewed unresolved-count baseline for PR gating',
    UNRESOLVED_COMPLETION_BLOCKER_INVENTORY_SOURCE_REFS,
  ),
  'non-battlemech-ammo-scope': outOfScope(
    'non-battlemech-ammo-scope',
    'ammo compatibility audit classifies aerospace/capital, battle-armor, and protomech ammo separately from BattleMech weapon compatibility',
    'non-BattleMech ammo is explicitly outside the BattleMech combat validation lane',
    NON_BATTLEMECH_AMMO_SCOPE_SOURCE_REFS,
  ),
  'non-battlemech-combat-system-split': outOfScope(
    'non-battlemech-combat-system-split',
    'aerospace, protomech, battle-armor, infantry, and vehicle helpers live under dedicated gameplay modules instead of runner BattleMech support matrices',
    'non-BattleMech systems need their own validation matrices rather than being folded into the BattleMech suite',
    NON_BATTLEMECH_COMBAT_SYSTEM_SPLIT_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
