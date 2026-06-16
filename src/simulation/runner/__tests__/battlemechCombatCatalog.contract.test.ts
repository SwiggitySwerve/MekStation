/**
 * Catalog-driven BattleMech combat validation anchors.
 *
 * This is the first lane of the larger combat validation suite: every official
 * ranged weapon and ammo catalog entry must be visible to combat-facing tests,
 * while physical weapons and missing mechanics are tracked as explicit gaps.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { IFullUnit } from '@/services/units/CanonicalUnitService';

import { buildUtilityCommands } from '@/components/gameplay/TacticalActionDock/commands/utilityCommands';
import { getWeaponData } from '@/engine/adapters/CompendiumAdapter';
import { WEAPON_DATABASE } from '@/engine/adapters/CompendiumWeaponData';
import { CANONICAL_SPA_CATALOG, getSPADefinition } from '@/lib/spa';
import {
  getLimitationPatternCategory,
  KNOWN_LIMITATION_CATEGORY_IDS,
  isKnownLimitation,
  type IViolation,
} from '@/simulation/core/knownLimitations';
import {
  MOVEMENT_ENHANCEMENT_DEFINITIONS,
  MovementEnhancementType,
} from '@/types/construction/MovementEnhancement';
import {
  GameEventType,
  GamePhase,
  GameSide,
  GAME_INTENT_TYPES,
  PSRTrigger,
} from '@/types/gameplay';
import {
  AMMUNITION_CATALOG_FILES,
  ELECTRONICS_CATALOG_FILES,
  MISCELLANEOUS_CATALOG_FILES,
  WEAPON_CATALOG_FILES,
} from '@/utils/construction/equipmentBVCatalogData';
import {
  resolveAmmoBV,
  resolveEquipmentBV,
} from '@/utils/construction/equipmentBVResolver';
import {
  consumeAmmo,
  getTotalAmmo,
  hasAmmoForWeapon,
  initializeAmmoState,
} from '@/utils/gameplay/ammoTracking';
import { createUnitEjectedEvent } from '@/utils/gameplay/gameEvents';
import { SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES } from '@/utils/gameplay/physicalAttacks/types';
import { QUIRK_CATALOG } from '@/utils/gameplay/quirkModifiers';
import { SPA_CATALOG } from '@/utils/gameplay/spaModifiers';
import {
  isAMS,
  isLBXAC,
  isNarc,
  isRotaryAC,
  isStreakSRM,
  isTAG,
  isUltraAC,
  verifyStreakBehavior,
} from '@/utils/gameplay/specialWeaponMechanics';

import officialIndex from '../../../../public/data/equipment/official/index.json';
import { selectWeaponMode } from '../../ai/AIWeaponModeSelector';
import {
  AMMUNITION_COMPATIBILITY_SUPPORT,
  UNSUPPORTED_ROTARY_AC_10_20_AMMO_IDS,
  UNSUPPORTED_ROTARY_AC_10_20_WEAPON_PROBE_IDS,
} from '../CombatAmmunitionSupport';
import { CANONICAL_SPA_COMBAT_SCOPE_SUPPORT } from '../CombatCanonicalSpaSupport';
import { UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS } from '../CombatCriticalSlotEffectSupport';
import {
  CRITICAL_COMPONENT_COMBAT_SUPPORT,
  DAMAGE_RESOLUTION_COMBAT_SUPPORT,
  DESTRUCTION_CAUSE_COMBAT_SUPPORT,
  PILOT_DAMAGE_COMBAT_SUPPORT,
} from '../CombatDamageSupport';
import {
  PHYSICAL_WEAPON_COMBAT_SUPPORT,
  QUIRK_COMBAT_SUPPORT,
  SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT,
  SPA_COMBAT_SUPPORT,
  type ICombatFeatureSourceReference,
  type ICombatFeatureSupportEntry,
} from '../CombatFeatureSupport';
import {
  ACTION_ELIGIBILITY_COMBAT_SUPPORT,
  PSR_RESOLUTION_COMBAT_SUPPORT,
  RUNNER_PSR_TRIGGER_COMBAT_SUPPORT,
} from '../CombatLifecycleSupport';
import { RUNNER_INTERACTIVE_PARITY_SUPPORT } from '../CombatParitySupport';
import { PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT } from '../CombatPilotModifierApplicationSupport';
import {
  HEAT_RULE_COMBAT_SUPPORT,
  MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS,
  MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT,
  MOVEMENT_RULE_COMBAT_SUPPORT,
  PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT,
  RUNNER_RANGE_BRACKET_COMBAT_SUPPORT,
  RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT,
  TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
  TERRAIN_TYPE_MOVEMENT_COVERAGE,
} from '../CombatRuleSupport';
import {
  SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT,
  UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_SUPPORT_IDS,
} from '../CombatSpecialWeaponSupport';
import {
  getCombatValidationOutOfScopeRefs,
  getCombatValidationUnresolvedRefs,
} from '../CombatValidationGapInventory';
import {
  BATTLEMECH_COMBAT_VALIDATION_INVARIANT,
  KNOWN_LIMITATION_VALIDATION_TRAPS,
} from '../CombatValidationScopeSupport';
import {
  resolveSpecialProjectileHit,
  shouldSpendAmmoAndHeatOnMiss,
} from '../phases/weaponAttackFiringModes';
import {
  createMinimalUnitState,
  toCatalogAIUnitState,
  toAIUnitState,
} from '../SimulationRunnerSupport';
import {
  buildWeaponLookupFromCatalogFiles,
  hydrateAmmoStateFromFullUnit,
  resolveCatalogDamage,
  toAIWeapon,
  type ICatalogWeaponStats,
} from '../UnitHydration';

interface ICatalogFile {
  readonly items?: readonly Record<string, unknown>[];
}

interface IAmmoCatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly variant?: string;
  readonly rulesLevel: string;
  readonly compatibleWeaponIds: readonly string[];
  readonly shotsPerTon: number;
  readonly battleValue: number;
  readonly isExplosive: boolean;
}

interface IBattleMechUnitIndexEntry {
  readonly path: string;
}

interface IBattleMechUnitIndexFile {
  readonly units: readonly IBattleMechUnitIndexEntry[];
}

interface IUnitEquipmentEntry {
  readonly id?: unknown;
  readonly location?: unknown;
}

type AmmoCompatibilityGapClass =
  | 'battlemech-ammo-missing-compatible-weapon-refs'
  | 'duplicate-runtime-id'
  | 'experimental-empty-compatible-row'
  | 'non-battlemech-aerospace-capital-ammo'
  | 'non-battlemech-battle-armor'
  | 'non-battlemech-protomech'
  | 'unsupported-aquatic-torpedo-ammo'
  | 'unsupported-artillery-ammo'
  | 'unsupported-rotary-ac-10-20-ammo'
  | 'unofficial-empty-compatible-row';

type AmmoCompatibilitySupportId =
  | AmmoCompatibilityGapClass
  | 'battlemech-compatible-ammo';

type PinnedBattleMechAmmoGapClass =
  | 'battlemech-ammo-missing-compatible-weapon-refs'
  | 'duplicate-runtime-id'
  | 'unsupported-rotary-ac-10-20-ammo';

type PinnedScopeSplitAmmoGapClass =
  | 'non-battlemech-aerospace-capital-ammo'
  | 'non-battlemech-battle-armor'
  | 'non-battlemech-protomech'
  | 'unsupported-aquatic-torpedo-ammo'
  | 'unsupported-artillery-ammo';

const EXPECTED_BATTLEMECH_AMMO_GAP_IDS = {
  'battlemech-ammo-missing-compatible-weapon-refs': [],
  'unsupported-rotary-ac-10-20-ammo': UNSUPPORTED_ROTARY_AC_10_20_AMMO_IDS,
  'duplicate-runtime-id': [
    'ams',
    'clan-lb-10-x-ac',
    'clan-lb-2-x-ac',
    'clan-lb-20-x-ac',
    'clan-lb-5-x-ac',
    'clan-streak-srm-2',
    'clan-streak-srm-4',
    'clan-streak-srm-6',
    'mrm-10',
    'mrm-20',
    'mrm-30',
    'mrm-40',
  ],
} satisfies Record<PinnedBattleMechAmmoGapClass, readonly string[]>;

const UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_REFS =
  UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_SUPPORT_IDS.map(
    (supportId) => `featureSupport.specialWeaponMechanics.${supportId}`,
  ).sort();

const UNSUPPORTED_ROTARY_AC_10_20_AMMO_ID_SET: ReadonlySet<string> = new Set(
  EXPECTED_BATTLEMECH_AMMO_GAP_IDS['unsupported-rotary-ac-10-20-ammo'],
);

const PROTOMECH_PROTO_MACHINE_GUN_AMMO_IDS = new Set([
  'clan-heavy-machine-gun-ammo-proto',
  'clan-light-machine-gun-ammo-proto',
  'clan-machine-gun-ammo-proto',
]);

const EXPECTED_SCOPE_SPLIT_AMMO_GAP_IDS = {
  'non-battlemech-aerospace-capital-ammo': [
    'ammo-barracuda',
    'ammo-barracuda-t',
    'ammo-nac-10',
    'ammo-nac-20',
    'ammo-nac-25',
    'ammo-nac-30',
    'ammo-nac-35',
    'ammo-nac-40',
  ],
  'non-battlemech-battle-armor': [
    'ba-advanced-srm-1',
    'ba-advanced-srm-2',
    'ba-advanced-srm-3',
    'ba-advanced-srm-4',
    'ba-advanced-srm-5',
    'ba-advanced-srm-6',
    'ba-ammo-lrm-1',
    'ba-ammo-lrm-2',
    'ba-ammo-lrm-3',
    'ba-ammo-lrm-4',
    'ba-ammo-lrm-5',
    'ba-srm1',
    'ba-srm2',
    'ba-srm3',
    'ba-srm4',
    'ba-srm5',
    'ba-srm6',
  ],
  'non-battlemech-protomech': [
    'clan-ammo-protomech-lrm-1',
    'clan-ammo-protomech-lrm-11',
    'clan-ammo-protomech-lrm-12',
    'clan-ammo-protomech-lrm-13',
    'clan-ammo-protomech-lrm-14',
    'clan-ammo-protomech-lrm-16',
    'clan-ammo-protomech-lrm-17',
    'clan-ammo-protomech-lrm-18',
    'clan-ammo-protomech-lrm-19',
    'clan-ammo-protomech-lrm-2',
    'clan-ammo-protomech-lrm-3',
    'clan-ammo-protomech-lrm-4',
    'clan-ammo-protomech-lrm-6',
    'clan-ammo-protomech-lrm-7',
    'clan-ammo-protomech-lrm-8',
    'clan-ammo-protomech-lrm-9',
    'clan-ammo-protomech-lrtorpedo-1',
    'clan-ammo-protomech-lrtorpedo-11',
    'clan-ammo-protomech-lrtorpedo-12',
    'clan-ammo-protomech-lrtorpedo-13',
    'clan-ammo-protomech-lrtorpedo-14',
    'clan-ammo-protomech-lrtorpedo-16',
    'clan-ammo-protomech-lrtorpedo-17',
    'clan-ammo-protomech-lrtorpedo-18',
    'clan-ammo-protomech-lrtorpedo-19',
    'clan-ammo-protomech-lrtorpedo-2',
    'clan-ammo-protomech-lrtorpedo-3',
    'clan-ammo-protomech-lrtorpedo-4',
    'clan-ammo-protomech-lrtorpedo-6',
    'clan-ammo-protomech-lrtorpedo-7',
    'clan-ammo-protomech-lrtorpedo-8',
    'clan-ammo-protomech-lrtorpedo-9',
    'clan-heavy-machine-gun-ammo-proto',
    'clan-light-machine-gun-ammo-proto',
    'clan-machine-gun-ammo-proto',
    'clan-protomech-ac-2',
    'clan-protomech-ac-4',
    'clan-protomech-ac-8',
  ],
  'unsupported-aquatic-torpedo-ammo': [
    'ammo-lrtorpedo-10',
    'ammo-lrtorpedo-15',
    'ammo-lrtorpedo-20',
    'ammo-lrtorpedo-5',
    'ammo-srtorpedo-2',
    'ammo-srtorpedo-4',
    'ammo-srtorpedo-6',
    'clan-ammo-srtorpedo-1',
    'clan-ammo-srtorpedo-3',
    'clan-ammo-srtorpedo-5',
    'clan-torpedo-lrm5',
  ],
  'unsupported-artillery-ammo': [
    'arrowivammo',
    'longtomammo',
    'longtomcannonammo',
    'primitivelongtomammo',
    'prototypearrowivammo',
    'sniperammo',
    'snipercannonammo',
    'thumperammo',
    'thumpercannonammo',
  ],
} satisfies Record<PinnedScopeSplitAmmoGapClass, readonly string[]>;

const EXPECTED_EXPERIMENTAL_EMPTY_COMPATIBLE_AMMO_IDS = [
  'ammo-extended-lrm-10',
  'ammo-extended-lrm-15',
  'ammo-extended-lrm-20',
  'ammo-extended-lrm-5',
  'clan-ammo-iatm-12-iiw',
  'clan-ammo-iatm-12-imp',
  'clan-ammo-iatm-3-iiw',
  'clan-ammo-iatm-3-imp',
  'clan-ammo-iatm-6-iiw',
  'clan-ammo-iatm-6-imp',
  'clan-ammo-iatm-9-iiw',
  'clan-ammo-iatm-9-imp',
  'clan-lb-5-x-cluster',
  'clan-streak-lrm-1',
  'clan-streak-lrm-10',
  'clan-streak-lrm-11',
  'clan-streak-lrm-12',
  'clan-streak-lrm-13',
  'clan-streak-lrm-14',
  'clan-streak-lrm-15',
  'clan-streak-lrm-16',
  'clan-streak-lrm-17',
  'clan-streak-lrm-18',
  'clan-streak-lrm-19',
  'clan-streak-lrm-2',
  'clan-streak-lrm-20',
  'clan-streak-lrm-3',
  'clan-streak-lrm-4',
  'clan-streak-lrm-5',
  'clan-streak-lrm-6',
  'clan-streak-lrm-7',
  'clan-streak-lrm-8',
  'clan-streak-lrm-9',
  'enhancedlrm10',
  'enhancedlrm15',
  'enhancedlrm20',
  'enhancedlrm5',
  'improvedheavygauss',
  'silver-bullet-gauss',
] satisfies readonly string[];

const EXPECTED_UNOFFICIAL_EMPTY_COMPATIBLE_AMMO_IDS = [
  'ammo-ac-10-primitive',
  'ammo-ac-15',
  'ammo-ac-2-primitive',
  'ammo-ac-20-primitive',
  'ammo-ac-5-primitive',
  'ammo-gac-2',
  'ammo-gac-4',
  'ammo-gac-6',
  'ammo-gac-8',
  'ammo-heavy-n-gauss',
  'ammo-lac-10',
  'ammo-lac-2',
  'ammo-lac-20',
  'ammo-lac-5',
  'ammo-light-n-gauss',
  'ammo-lrm-10',
  'ammo-lrm-10-primitive',
  'ammo-lrm-15',
  'ammo-lrm-15-primitive',
  'ammo-lrm-20',
  'ammo-lrm-20-primitive',
  'ammo-lrm-5',
  'ammo-lrm-5-primitive',
  'ammo-medium-n-gauss',
  'ammo-mg-full',
  'ammo-srm-2',
  'ammo-srm-2-primitive',
  'ammo-srm-4',
  'ammo-srm-4-primitive',
  'ammo-srm-6',
  'ammo-srm-6-primitive',
  'apgaussrifle',
  'clan-ammo-atm-12',
  'clan-ammo-atm-12-er',
  'clan-ammo-atm-12-he',
  'clan-ammo-atm-3',
  'clan-ammo-atm-3-er',
  'clan-ammo-atm-3-he',
  'clan-ammo-atm-6',
  'clan-ammo-atm-6-er',
  'clan-ammo-atm-6-he',
  'clan-ammo-atm-9',
  'clan-ammo-atm-9-er',
  'clan-ammo-atm-9-he',
  'clan-ammo-iatm-12',
  'clan-ammo-iatm-12-er',
  'clan-ammo-iatm-12-he',
  'clan-ammo-iatm-3',
  'clan-ammo-iatm-3-er',
  'clan-ammo-iatm-3-he',
  'clan-ammo-iatm-6',
  'clan-ammo-iatm-6-er',
  'clan-ammo-iatm-6-he',
  'clan-ammo-iatm-9',
  'clan-ammo-iatm-9-er',
  'clan-ammo-iatm-9-he',
  'clan-ammo-srm-1',
  'clan-ammo-srm-3',
  'clan-ammo-srm-5',
  'clan-streak-srm-1',
  'clan-streak-srm-3',
  'clan-streak-srm-5',
  'clanimpammosrm2',
  'clanimprovedlrm10ammo',
  'clanimprovedlrm15ammo',
  'clanimprovedlrm20ammo',
  'clanimprovedlrm5ammo',
  'climpammosrm4',
  'compact-narc-ammo',
  'gauss',
  'heavy-machine-gun-ammo-full',
  'heavy-machine-gun-ammo-half',
  'heavygauss',
  'impammosrm6',
  'impgaussammo',
  'inarc-ecm-pods',
  'inarc-explosive-pods',
  'inarc-haywire-pods',
  'inarc-nemesis-pods',
  'lb-2-x-ac-ammo-thb',
  'lb-2-x-cluster-ammo-thb',
  'lb-20-x-ac-ammo-thb',
  'lb-20-x-cluster-ammo-thb',
  'lb-5-x-ac-ammo-thb',
  'lb-5-x-cluster-ammo-thb',
  'light-gauss',
  'light-machine-gun-ammo-full',
  'light-machine-gun-ammo-half',
  'machine-gun-ammo-half',
  'mrm-1',
  'mrm-2',
  'mrm-3',
  'mrm-4',
  'mrm-5',
  'narc-explosivepods',
  'narc-pods',
  'rotaryac2',
  'rotaryac5',
  'ultra-ac-10-ammo-thb',
  'ultra-ac-2-ammo-thb',
  'ultra-ac-20-ammo-thb',
] satisfies readonly string[];

const EXPECTED_BATTLEMECH_COMPATIBLE_AMMO_IDS = [
  'ac-10-ammo',
  'ac-2-ammo',
  'ac-2-ap-ammo',
  'ac-2-precision-ammo',
  'ac-20-ammo',
  'ac-5-ammo',
  'ac-5-ap-ammo',
  'ams-ammo',
  'ap-gauss-ammo',
  'atm-er-ammo',
  'atm-he-ammo',
  'atm-standard-ammo',
  'clan-ams-ammo',
  'clan-large-chemical-laser-ammo',
  'clan-lb-2-x-cluster',
  'clan-medium-chemical-laser-ammo',
  'clan-plasma-cannon-ammo',
  'clan-small-chemical-laser-ammo',
  'gauss-ammo',
  'heavy-gauss-ammo',
  'heavy-mg-ammo',
  'impammoac10',
  'impammoac2',
  'impammoac20',
  'impammoac5',
  'inarc-ammo',
  'lb-10-x-ammo',
  'lb-10-x-cluster-ammo',
  'lb-2-x-ammo',
  'lb-20-x-ammo',
  'lb-20-x-cluster-ammo',
  'lb-5-x-ammo',
  'light-gauss-ammo',
  'light-mg-ammo',
  'lrm-ammo',
  'lrm-fragmentation-ammo',
  'lrm-swarm-ammo',
  'lrm-thunder-ammo',
  'mg-ammo',
  'mg-ammo-half',
  'mrm-ammo',
  'narc-ammo',
  'plasma-rifle-ammo',
  'srm-ammo',
  'srm-fragmentation-ammo',
  'srm-inferno-ammo',
  'srm-tandem-charge-ammo',
  'streak-srm-ammo',
  'uac-10-ammo',
  'uac-2-ammo',
  'uac-20-ammo',
  'uac-5-ammo',
] satisfies readonly string[];

const EXPECTED_STRING_DAMAGE_RESOLUTIONS = {
  'atm-12': 24,
  'atm-3': 6,
  'atm-6': 12,
  'atm-9': 18,
  'clan-lrm-10': 10,
  'clan-lrm-15': 15,
  'clan-lrm-20': 20,
  'clan-lrm-5': 5,
  'clan-srm-2': 4,
  'clan-srm-4': 8,
  'clan-srm-6': 12,
  'clan-streak-srm-2': 4,
  'clan-streak-srm-4': 8,
  'clan-streak-srm-6': 12,
  'iatm-12': 24,
  'iatm-3': 6,
  'iatm-6': 12,
  'iatm-9': 18,
  'lrm-10': 10,
  'lrm-15': 15,
  'lrm-20': 20,
  'lrm-5': 5,
  'mml-3': 6,
  'mml-5': 10,
  'mml-7': 14,
  'mml-9': 18,
  'mrm-10': 10,
  'mrm-20': 20,
  'mrm-30': 30,
  'mrm-40': 40,
  'srm-2': 4,
  'srm-4': 8,
  'srm-6': 12,
  'streak-srm-2': 4,
  'streak-srm-4': 8,
  'streak-srm-6': 12,
} satisfies Record<string, number>;

const EXPECTED_ZERO_DAMAGE_RANGED_WEAPON_IDS = {
  'defensive-system': ['ams', 'clan-ams', 'clan-laser-ams', 'laser-ams'],
  'standard-special-effect': [
    'clan-narc',
    'clan-plasma-cannon',
    'inarc',
    'narc',
  ],
  'standard-rows': [
    'ams',
    'clan-ams',
    'clan-narc',
    'clan-plasma-cannon',
    'inarc',
    'narc',
  ],
} satisfies Record<string, readonly string[]>;

const EXPECTED_MULTI_MODE_SPECIAL_WEAPON_FAMILY_IDS = {
  'lb-x-ac': [
    'clan-lb-10-x-ac',
    'clan-lb-2-x-ac',
    'clan-lb-20-x-ac',
    'clan-lb-5-x-ac',
    'lb-10-x-ac',
    'lb-2-x-ac',
    'lb-20-x-ac',
    'lb-5-x-ac',
  ],
  mml: ['mml-3', 'mml-5', 'mml-7', 'mml-9'],
  'rotary-ac': ['clan-rac-2', 'clan-rac-5', 'rac-2', 'rac-5'],
  'ultra-ac': [
    'clan-uac-10',
    'clan-uac-2',
    'clan-uac-20',
    'clan-uac-5',
    'uac-10',
    'uac-2',
    'uac-20',
    'uac-5',
  ],
} satisfies Record<string, readonly string[]>;

const EXPECTED_STREAK_WEAPON_FAMILY_IDS = {
  'damage-capable': [
    'clan-streak-srm-2',
    'clan-streak-srm-4',
    'clan-streak-srm-6',
    'streak-srm-2',
    'streak-srm-4',
    'streak-srm-6',
  ],
  'zero-damage-data-gap': [
    'iosstreaklrm10',
    'iosstreaklrm15',
    'iosstreaklrm20',
    'iosstreaklrm5',
    'osstreaklrm10',
    'osstreaklrm15',
    'osstreaklrm20',
    'osstreaklrm5',
    'streaklrm1',
    'streaklrm10',
    'streaklrm11',
    'streaklrm11os',
    'streaklrm12',
    'streaklrm12-os',
    'streaklrm13',
    'streaklrm13os',
    'streaklrm14',
    'streaklrm14os',
    'streaklrm15',
    'streaklrm16',
    'streaklrm16os',
    'streaklrm17',
    'streaklrm17os',
    'streaklrm18',
    'streaklrm18os',
    'streaklrm19',
    'streaklrm19os',
    'streaklrm1os',
    'streaklrm2',
    'streaklrm20',
    'streaklrm2os',
    'streaklrm3',
    'streaklrm3os',
    'streaklrm4',
    'streaklrm4os',
    'streaklrm5',
    'streaklrm6',
    'streaklrm6os',
    'streaklrm7',
    'streaklrm7os',
    'streaklrm8',
    'streaklrm8os',
    'streaklrm9',
    'streaklrm9os',
    'streaksrm1',
    'streaksrm2-ios',
    'streaksrm2-os',
    'streaksrm3',
    'streaksrm4-ios',
    'streaksrm4-os',
    'streaksrm4prototype',
    'streaksrm5',
    'streaksrm6-ios',
    'streaksrm6-os',
    'streaksrm6prototype',
  ],
} satisfies Record<string, readonly string[]>;

const EXPECTED_DESIGNATOR_DEFENSIVE_SPECIAL_FAMILY_IDS = {
  ams: ['ams', 'clan-ams', 'clan-laser-ams', 'laser-ams'],
  artemis: ['artemisiv', 'artemisivproto', 'artemisv'],
  narc: [
    'bacompactnarc',
    'clan-narc',
    'improvednarc',
    'improvednarc-os',
    'inarc',
    'narc',
    'narcbeacon',
    'narcbeacon-i-os',
    'narcbeacon-os',
    'narcbeaconprototype',
  ],
  tag: ['clan-light-tag', 'clan-tag', 'light-tag', 'tag'],
} satisfies Record<string, readonly string[]>;

function flattenItems(
  files: readonly ICatalogFile[],
): readonly Record<string, unknown>[] {
  return files.flatMap((file) => [...(file.items ?? [])]);
}

function isRangedWeapon(
  item: Record<string, unknown>,
): item is Record<string, unknown> & ICatalogWeaponStats {
  const ranges = item.ranges;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    (typeof item.damage === 'number' || typeof item.damage === 'string') &&
    typeof item.heat === 'number' &&
    !!ranges &&
    typeof ranges === 'object'
  );
}

function isPhysicalWeapon(item: Record<string, unknown>): boolean {
  return (
    typeof item.id === 'string' &&
    typeof item.type === 'string' &&
    typeof item.damageFormula === 'string' &&
    !('ranges' in item)
  );
}

function isStringDamageWeapon(
  item: Record<string, unknown> & ICatalogWeaponStats,
): item is Record<string, unknown> & ICatalogWeaponStats & { damage: string } {
  return typeof item.damage === 'string';
}

function isAmmoEntry(
  item: Record<string, unknown>,
): item is Record<string, unknown> & IAmmoCatalogEntry {
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.category === 'string' &&
    typeof item.rulesLevel === 'string' &&
    Array.isArray(item.compatibleWeaponIds) &&
    item.compatibleWeaponIds.every((id) => typeof id === 'string') &&
    typeof item.shotsPerTon === 'number' &&
    typeof item.battleValue === 'number' &&
    typeof item.isExplosive === 'boolean'
  );
}

const weaponCatalogFiles = WEAPON_CATALOG_FILES as readonly ICatalogFile[];
const ammunitionCatalogFiles =
  AMMUNITION_CATALOG_FILES as readonly ICatalogFile[];
const electronicsCatalogFiles =
  ELECTRONICS_CATALOG_FILES as readonly ICatalogFile[];
const miscellaneousCatalogFiles =
  MISCELLANEOUS_CATALOG_FILES as readonly ICatalogFile[];
const allWeaponCatalogItems = flattenItems(weaponCatalogFiles);
const rangedWeaponItems = allWeaponCatalogItems.filter(isRangedWeapon);
const physicalWeaponItems = allWeaponCatalogItems.filter(isPhysicalWeapon);
const ammoItems = flattenItems(ammunitionCatalogFiles).filter(isAmmoEntry);
const electronicsItems = flattenItems(electronicsCatalogFiles);
const miscellaneousItems = flattenItems(miscellaneousCatalogFiles);
const weaponLookup = buildWeaponLookupFromCatalogFiles(weaponCatalogFiles);
const weaponCatalogIds = new Set(ids(allWeaponCatalogItems));

function itemText(item: Record<string, unknown>): string {
  return [
    item.id,
    item.name,
    item.subType,
    item.category,
    item.variant,
    item.rulesLevel,
    ...(Array.isArray(item.special) ? item.special : []),
  ]
    .filter((part): part is string => typeof part === 'string')
    .join(' ');
}

function ids(items: readonly Record<string, unknown>[]): readonly string[] {
  return items
    .map((item) => item.id)
    .filter((id): id is string => typeof id === 'string')
    .sort();
}

function familyItems(pattern: RegExp): readonly Record<string, unknown>[] {
  return rangedWeaponItems.filter((item) => pattern.test(itemText(item)));
}

function normalizeCriticalSlotTextForCatalogTest(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeEquipmentLocationForCatalogTest(location: unknown): string {
  return typeof location === 'string'
    ? (location.split(',')[0]?.trim() ?? location.trim())
    : '';
}

type ArtemisFcsKind = 'artemis_iv' | 'prototype_artemis_iv' | 'artemis_v';

function artemisFcsKindFromCatalogText(
  text: string,
): ArtemisFcsKind | undefined {
  const normalized = normalizeCriticalSlotTextForCatalogTest(text);
  if (normalized.includes('ammo') || normalized.includes('capable')) {
    return undefined;
  }
  if (
    normalized.includes('prototypeartemisiv') ||
    normalized.includes('artemisivproto') ||
    normalized.includes('protoartemisiv')
  ) {
    return 'prototype_artemis_iv';
  }
  if (normalized.includes('artemisv')) {
    return 'artemis_v';
  }
  if (normalized.includes('artemisiv')) {
    return 'artemis_iv';
  }
  return undefined;
}

function artemisFcsSystemCount(
  slots: readonly string[],
  kind: ArtemisFcsKind,
): number {
  let count = 0;
  let previousMatched = false;
  for (const slot of slots) {
    const matched = artemisFcsKindFromCatalogText(slot) === kind;
    if (matched && !previousMatched) count++;
    previousMatched = matched;
  }
  return count;
}

function hasArtemisCapableAmmo(
  slots: readonly string[],
  kind: ArtemisFcsKind,
): boolean {
  return slots.some((slot) => {
    const normalized = normalizeCriticalSlotTextForCatalogTest(slot);
    return kind === 'artemis_v'
      ? normalized.includes('artemisvcapable')
      : normalized.includes('artemiscapable') &&
          !normalized.includes('artemisvcapable');
  });
}

function isTorpedoSlotText(slot: string): boolean {
  return /\b(?:IS|CL|Clan)?\s*(?:LRT|SRT)\b|lrtorpedo|srtorpedo|torpedo/i.test(
    slot,
  );
}

function isArtemisCompatibleWeapon(
  catalogWeapon: ICatalogWeaponStats,
): boolean {
  const text = [
    catalogWeapon.id,
    catalogWeapon.name,
    catalogWeapon.subType ?? '',
    ...(catalogWeapon.special ?? []),
  ]
    .join(' ')
    .toLowerCase();

  if (/\bstreak\b|narc|tag|anti[-\s]?missile|ams/.test(text)) return false;
  return (
    /\blrm\b|lrm[-\s]?\d+/.test(text) ||
    /\bsrm\b|srm[-\s]?\d+/.test(text) ||
    /\bmml\b|mml[-\s]?\d+/.test(text)
  );
}

function officialUnitArtemisAllocationAudit(): {
  readonly nonTorpedoFailures: readonly string[];
  readonly torpedoResiduals: readonly string[];
} {
  const unitIndex = JSON.parse(
    readFileSync(
      join(
        process.cwd(),
        'public',
        'data',
        'units',
        'battlemechs',
        'index.json',
      ),
      'utf8',
    ),
  ) as IBattleMechUnitIndexFile;
  const nonTorpedoFailures: string[] = [];
  const torpedoResiduals: string[] = [];

  for (const indexEntry of unitIndex.units) {
    const fullUnit = JSON.parse(
      readFileSync(
        join(
          process.cwd(),
          'public',
          'data',
          'units',
          'battlemechs',
          indexEntry.path,
        ),
        'utf8',
      ),
    ) as IFullUnit;
    const equipment = Array.isArray(fullUnit.equipment)
      ? (fullUnit.equipment as readonly IUnitEquipmentEntry[])
      : [];
    const criticalSlots =
      fullUnit.criticalSlots && typeof fullUnit.criticalSlots === 'object'
        ? (fullUnit.criticalSlots as Record<string, readonly unknown[]>)
        : {};
    const locations = new Set([
      ...equipment
        .map((entry) =>
          normalizeEquipmentLocationForCatalogTest(entry.location),
        )
        .filter(Boolean),
      ...Object.keys(criticalSlots),
    ]);

    for (const location of Array.from(locations)) {
      const slots = (criticalSlots[location] ?? []).filter(
        (slot): slot is string => typeof slot === 'string',
      );
      const compatibleLauncherCount = equipment.filter((entry) => {
        if (
          normalizeEquipmentLocationForCatalogTest(entry.location) !==
            location ||
          typeof entry.id !== 'string'
        ) {
          return false;
        }
        const weapon = weaponLookup(entry.id);
        return weapon ? isArtemisCompatibleWeapon(weapon) : false;
      }).length;
      const torpedoLauncherCount = slots.filter(isTorpedoSlotText).length;

      for (const kind of [
        'artemis_iv',
        'prototype_artemis_iv',
        'artemis_v',
      ] as const) {
        const fcsCount =
          equipment.filter((entry) => {
            return (
              normalizeEquipmentLocationForCatalogTest(entry.location) ===
                location &&
              typeof entry.id === 'string' &&
              artemisFcsKindFromCatalogText(entry.id) === kind
            );
          }).length || artemisFcsSystemCount(slots, kind);
        if (fcsCount <= 0 || !hasArtemisCapableAmmo(slots, kind)) continue;
        if (
          compatibleLauncherCount === 1 ||
          (compatibleLauncherCount > 0 && compatibleLauncherCount === fcsCount)
        ) {
          continue;
        }

        const label = `${fullUnit.id} ${location} ${kind}: fcs=${fcsCount} compatible=${compatibleLauncherCount}`;
        if (compatibleLauncherCount === 0 && torpedoLauncherCount > 0) {
          torpedoResiduals.push(label);
        } else {
          nonTorpedoFailures.push(label);
        }
      }
    }
  }

  return { nonTorpedoFailures, torpedoResiduals };
}

function sortedKeys(record: Record<string, unknown>): readonly string[] {
  return Object.keys(record).sort();
}

function countBy<T extends string>(values: readonly T[]): Record<T, number> {
  return values.reduce(
    (counts, value) => ({
      ...counts,
      [value]: (counts[value] ?? 0) + 1,
    }),
    {} as Record<T, number>,
  );
}

function ammoCompatibilityGapClass(
  ammo: IAmmoCatalogEntry & Record<string, unknown>,
): AmmoCompatibilityGapClass | null {
  if (ammo.compatibleWeaponIds.length > 0) return null;

  const text = itemText(ammo).toLowerCase();
  if (weaponCatalogIds.has(ammo.id)) return 'duplicate-runtime-id';
  if (ammo.id.startsWith('ba-') || /\bbattle armor\b/i.test(text)) {
    return 'non-battlemech-battle-armor';
  }
  if (
    /\bprotomech\b/i.test(text) ||
    PROTOMECH_PROTO_MACHINE_GUN_AMMO_IDS.has(ammo.id)
  ) {
    return 'non-battlemech-protomech';
  }
  if (
    ammo.category === 'Artillery' ||
    /\barrow|long tom|sniper|thumper/i.test(text)
  ) {
    return 'unsupported-artillery-ammo';
  }
  if (/\btorpedo\b|\blrtorpedo\b|\bsrtorpedo\b/i.test(text)) {
    return 'unsupported-aquatic-torpedo-ammo';
  }
  if (
    /\bnac\b|\bnaval\b|\bcapital\b|\btele-missile\b|\bkiller whale\b|\bwhite shark\b|\bbarracuda\b|\bkraken\b|\bscreen launcher\b/i.test(
      text,
    )
  ) {
    return 'non-battlemech-aerospace-capital-ammo';
  }
  if (UNSUPPORTED_ROTARY_AC_10_20_AMMO_ID_SET.has(ammo.id)) {
    return 'unsupported-rotary-ac-10-20-ammo';
  }
  if (ammo.rulesLevel === 'STANDARD' || ammo.rulesLevel === 'ADVANCED') {
    return 'battlemech-ammo-missing-compatible-weapon-refs';
  }
  if (ammo.rulesLevel === 'EXPERIMENTAL') {
    return 'experimental-empty-compatible-row';
  }
  return 'unofficial-empty-compatible-row';
}

function ammoIdsByGapClass(
  classification: AmmoCompatibilityGapClass,
): readonly string[] {
  return ammoItems
    .filter((ammo) => ammoCompatibilityGapClass(ammo) === classification)
    .map((ammo) => ammo.id)
    .sort();
}

function supportGaps(
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  return Object.values(support)
    .filter(
      (entry) =>
        entry.level !== 'integrated' &&
        (entry.gap === undefined || entry.gap.length === 0),
    )
    .map((entry) => entry.id)
    .sort();
}

function supportIdsByLevel(
  support: Record<string, ICombatFeatureSupportEntry>,
  level: ICombatFeatureSupportEntry['level'],
): readonly string[] {
  return Object.values(support)
    .filter((entry) => entry.level === level)
    .map((entry) => entry.id)
    .sort();
}

function expectPinnedMegaMekRefs(
  refs: readonly ICombatFeatureSourceReference[],
): void {
  expect(refs.length).toBeGreaterThan(0);
  expect(
    refs.some(
      (sourceRef) =>
        sourceRef.kind === 'megamek-source' &&
        sourceRef.sourceVersion ===
          '325b2504c7b7750ecdcb85468621fb2de2ad8e60' &&
        sourceRef.url.includes('github.com/MegaMek/megamek/blob/') &&
        sourceRef.url.includes(sourceRef.sourceVersion) &&
        sourceRef.url.includes('#L'),
    ),
  ).toBe(true);
  expect(refs.every((sourceRef) => isPinnedCatalogSourceRef(sourceRef))).toBe(
    true,
  );
}

const PINNED_MEGAMEK_CATALOG_SOURCE_VERSIONS = new Set([
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  '55584ec7529b944fca3216965697e9fa1115dced',
]);

function isPinnedCatalogSourceRef(
  sourceRef: ICombatFeatureSourceReference,
): boolean {
  if (sourceRef.kind === 'mekstation-deviation') {
    return (
      sourceRef.sourceVersion === 'MekStation working-tree' &&
      sourceRef.url.includes('#L')
    );
  }

  return (
    sourceRef.kind === 'megamek-source' &&
    PINNED_MEGAMEK_CATALOG_SOURCE_VERSIONS.has(sourceRef.sourceVersion) &&
    sourceRef.url.includes('github.com/MegaMek/megamek/blob/') &&
    sourceRef.url.includes(sourceRef.sourceVersion) &&
    sourceRef.url.includes('#L')
  );
}

function zeroDamageClassification(
  item: Record<string, unknown>,
):
  | 'defensive-system'
  | 'standard-special-effect'
  | 'nonstandard-data-gap'
  | null {
  if (item.damage !== 0) return null;

  const rulesLevel = typeof item.rulesLevel === 'string' ? item.rulesLevel : '';
  const text = itemText(item);
  if (/Anti-Missile System/i.test(text) && /Defensive/i.test(text)) {
    return 'defensive-system';
  }
  if (rulesLevel === 'STANDARD' && /\b(?:i?NARC|Plasma)\b/i.test(text)) {
    return 'standard-special-effect';
  }
  if (rulesLevel !== 'STANDARD') {
    return 'nonstandard-data-gap';
  }
  return null;
}

describe('BattleMech combat catalog validation lane', () => {
  it('covers every official ranged weapon, physical weapon, and ammo entry', () => {
    expect(rangedWeaponItems).toHaveLength(officialIndex.totalItems.weapons);
    expect(ammoItems).toHaveLength(officialIndex.totalItems.ammunition);
    expect(physicalWeaponItems).toHaveLength(9);

    const rangedIds = new Set(rangedWeaponItems.map((item) => item.id));
    const physicalIds = new Set(physicalWeaponItems.map((item) => item.id));
    const ammoIds = new Set(ammoItems.map((item) => item.id));

    expect(rangedIds.size).toBe(rangedWeaponItems.length);
    expect(physicalIds.size).toBe(physicalWeaponItems.length);
    expect(ammoIds.size).toBe(ammoItems.length);
  });

  it('maps every official ranged weapon into a non-synthetic AI weapon', () => {
    const failures: string[] = [];

    for (const item of rangedWeaponItems) {
      const catalogWeapon = weaponLookup(item.id);
      if (!catalogWeapon) {
        failures.push(`${item.id}: missing from combat weapon lookup`);
        continue;
      }

      const aiWeapon = toAIWeapon(catalogWeapon, 0);
      if (aiWeapon.name === 'Medium Laser' && item.id !== 'medium-laser') {
        failures.push(`${item.id}: mapped to synthetic medium laser`);
      }
      if (!Number.isFinite(aiWeapon.damage)) {
        failures.push(`${item.id}: non-finite damage ${aiWeapon.damage}`);
      }
      if (typeof item.damage === 'number' && aiWeapon.damage !== item.damage) {
        failures.push(
          `${item.id}: numeric damage drift ${item.damage} -> ${aiWeapon.damage}`,
        );
      }
      if (typeof item.damage === 'string' && aiWeapon.damage <= 0) {
        failures.push(`${item.id}: parsed string damage to ${aiWeapon.damage}`);
      }
      if (typeof item.damage === 'number' && aiWeapon.damage <= 0) {
        const classification = zeroDamageClassification(item);
        if (!classification) {
          failures.push(`${item.id}: zero damage without explicit gap class`);
        }
      }
      if (!Number.isFinite(aiWeapon.heat) || aiWeapon.heat < 0) {
        failures.push(`${item.id}: invalid heat ${aiWeapon.heat}`);
      }
      if (
        catalogWeapon.ranges.minimum < 0 ||
        aiWeapon.shortRange > aiWeapon.mediumRange ||
        aiWeapon.mediumRange > aiWeapon.longRange
      ) {
        failures.push(`${item.id}: non-monotonic range brackets`);
      }
      if (aiWeapon.minRange !== catalogWeapon.ranges.minimum) {
        failures.push(
          `${item.id}: minimum range drift ${catalogWeapon.ranges.minimum} -> ${aiWeapon.minRange}`,
        );
      }
    }

    expect(failures).toEqual([]);
  });

  it('resolves official compact launcher ids before auditing Artemis FCS allocation', () => {
    expect(weaponLookup('1-islrm15')?.id).toBe('lrm-15');
    expect(weaponLookup('ISLRM15')?.id).toBe('lrm-15');
    expect(weaponLookup('1-clsrm6')?.id).toBe('clan-srm-6');
    expect(weaponLookup('CLLRM15')?.id).toBe('clan-lrm-15');
    expect(weaponLookup('ISMML7')?.id).toBe('mml-7');

    const audit = officialUnitArtemisAllocationAudit();

    expect(audit.nonTorpedoFailures).toEqual([]);
    expect(getCombatValidationOutOfScopeRefs()).toContain(
      'featureSupport.ammunitionCompatibility.unsupported-aquatic-torpedo-ammo',
    );
  });

  it('keeps the static engine weapon database a legacy subset of the official ranged catalog', () => {
    const rangedIds = new Set(rangedWeaponItems.map((item) => item.id));
    const staticIds = Object.keys(WEAPON_DATABASE).sort();

    expect(staticIds.filter((id) => !rangedIds.has(id))).toEqual([]);
    expect(rangedIds.size).toBeGreaterThan(staticIds.length);
    expect(staticIds).not.toContain('uac-5');
    expect(staticIds).not.toContain('mml-9');
    expect(rangedIds.has('uac-5')).toBe(true);
    expect(rangedIds.has('mml-9')).toBe(true);
  });

  it('resolves every official ranged weapon through engine lookup without static fallback drift', () => {
    const failures: string[] = [];

    for (const item of rangedWeaponItems) {
      const weaponData = getWeaponData(item.id);
      if (!weaponData) {
        failures.push(`${item.id}: engine lookup returned undefined`);
        continue;
      }

      const expectedDamage = resolveCatalogDamage(item.damage, item.id);
      const expectedAmmoPerTon =
        typeof item.ammoPerTon === 'number' ? item.ammoPerTon : -1;

      if (weaponData.id !== item.id) {
        failures.push(
          `${item.id}: engine lookup id drifted to ${weaponData.id}`,
        );
      }
      if (weaponData.damage !== expectedDamage) {
        failures.push(
          `${item.id}: engine damage drift ${expectedDamage} -> ${weaponData.damage}`,
        );
      }
      if (weaponData.heat !== item.heat) {
        failures.push(
          `${item.id}: engine heat drift ${item.heat} -> ${weaponData.heat}`,
        );
      }
      if (weaponData.minRange !== item.ranges.minimum) {
        failures.push(
          `${item.id}: engine min range drift ${item.ranges.minimum} -> ${weaponData.minRange}`,
        );
      }
      if (weaponData.shortRange !== item.ranges.short) {
        failures.push(
          `${item.id}: engine short range drift ${item.ranges.short} -> ${weaponData.shortRange}`,
        );
      }
      if (weaponData.mediumRange !== item.ranges.medium) {
        failures.push(
          `${item.id}: engine medium range drift ${item.ranges.medium} -> ${weaponData.mediumRange}`,
        );
      }
      if (weaponData.longRange !== item.ranges.long) {
        failures.push(
          `${item.id}: engine long range drift ${item.ranges.long} -> ${weaponData.longRange}`,
        );
      }
      if (weaponData.ammoPerTon !== expectedAmmoPerTon) {
        failures.push(
          `${item.id}: engine ammo-per-ton drift ${expectedAmmoPerTon} -> ${weaponData.ammoPerTon}`,
        );
      }
    }

    expect(failures).toEqual([]);
  });

  it('classifies zero-damage official ranged weapons as explicit non-damage behavior or data gaps', () => {
    const zeroDamageItems = rangedWeaponItems.filter(
      (item) => item.damage === 0,
    );
    const unclassified = zeroDamageItems
      .filter((item) => !zeroDamageClassification(item))
      .map((item) => item.id)
      .filter((id): id is string => typeof id === 'string')
      .sort();

    expect(zeroDamageItems).toHaveLength(279);
    expect(unclassified).toEqual([]);
    expect(
      ids(
        zeroDamageItems.filter(
          (item) => zeroDamageClassification(item) === 'defensive-system',
        ),
      ),
    ).toEqual(EXPECTED_ZERO_DAMAGE_RANGED_WEAPON_IDS['defensive-system']);
    expect(
      ids(
        zeroDamageItems.filter(
          (item) =>
            zeroDamageClassification(item) === 'standard-special-effect',
        ),
      ),
    ).toEqual(
      EXPECTED_ZERO_DAMAGE_RANGED_WEAPON_IDS['standard-special-effect'],
    );
    expect(
      ids(zeroDamageItems.filter((item) => item.rulesLevel === 'STANDARD')),
    ).toEqual(EXPECTED_ZERO_DAMAGE_RANGED_WEAPON_IDS['standard-rows']);
  });

  it('keeps variable missile damage from mapping to zero', () => {
    const stringDamageEntries: Array<[string, number]> = rangedWeaponItems
      .filter(isStringDamageWeapon)
      .map((item) => [item.id, resolveCatalogDamage(item.damage, item.id)]);
    const stringDamageResolutions: Record<string, number> = Object.fromEntries(
      stringDamageEntries.sort(([leftId], [rightId]) =>
        leftId.localeCompare(rightId),
      ),
    );

    expect(stringDamageResolutions).toEqual(EXPECTED_STRING_DAMAGE_RESOLUTIONS);
    expect(
      Object.values(stringDamageResolutions).every((damage) => damage > 0),
    ).toBe(true);
    expect(resolveCatalogDamage('1/missile', 'lrm-20')).toBe(20);
    expect(resolveCatalogDamage('2/missile', 'srm-6')).toBe(12);
    expect(resolveCatalogDamage('1-2/missile', 'mml-9')).toBe(18);
  });

  it('does not let AI unit conversion hide missing hydration with fallback weapons', () => {
    const unit = createMinimalUnitState('player-1', GameSide.Player, {
      q: 0,
      r: 0,
    });
    const hydrated = rangedWeaponItems.map((item, index) => {
      const catalogWeapon = weaponLookup(item.id);
      expect(catalogWeapon).not.toBeNull();
      return toAIWeapon(catalogWeapon as ICatalogWeaponStats, index);
    });
    const syntheticFallback = toAIUnitState(unit, []).weapons[0];

    expect(toCatalogAIUnitState(unit, hydrated).weapons).toEqual(hydrated);
    expect(toCatalogAIUnitState(unit, hydrated).weapons).toHaveLength(
      rangedWeaponItems.length,
    );
    expect(() => toCatalogAIUnitState(unit, [])).toThrow(
      'refusing synthetic Medium Laser fallback',
    );
    expect(toAIUnitState(unit, []).weapons).toHaveLength(1);
    expect(syntheticFallback.id).toBe('player-1-weapon-1');
    expect(syntheticFallback.name).toBe('Medium Laser');
    expect(hydrated.map((weapon) => weapon.id)).not.toContain(
      syntheticFallback.id,
    );
  });

  it('keeps ammunition compatibility references tied to official ranged weapons', () => {
    const rangedIds = new Set(rangedWeaponItems.map((item) => item.id));
    const missingRefs: string[] = [];

    for (const ammo of ammoItems) {
      for (const weaponId of ammo.compatibleWeaponIds) {
        if (!rangedIds.has(weaponId)) {
          missingRefs.push(`${ammo.id} -> ${weaponId}`);
        }
      }
    }

    expect(missingRefs).toEqual([]);
  });

  it('resolves every official non-duplicate ammo row through the equipment BV catalog', () => {
    const failures: string[] = [];

    for (const ammo of ammoItems) {
      const resolution = resolveAmmoBV(ammo.id);
      if (weaponCatalogIds.has(ammo.id)) {
        expect(ammoCompatibilityGapClass(ammo)).toBe('duplicate-runtime-id');
        continue;
      }

      if (!resolution.resolved) {
        failures.push(`${ammo.id}: did not resolve`);
        continue;
      }
      if (resolution.battleValue !== ammo.battleValue) {
        failures.push(
          `${ammo.id}: resolved BV ${resolution.battleValue} !== catalog BV ${ammo.battleValue}`,
        );
      }
      if (resolution.weaponType.length === 0) {
        failures.push(`${ammo.id}: resolved with empty weapon type`);
      }
      if (ammo.shotsPerTon <= 0) {
        failures.push(`${ammo.id}: invalid shotsPerTon ${ammo.shotsPerTon}`);
      }
    }

    expect(failures).toEqual([]);
  });

  it('turns every compatible official ammo row into a consumable combat ammo bin', () => {
    const failures: string[] = [];
    const compatibleAmmoIds = ammoItems
      .filter((ammo) => ammoCompatibilityGapClass(ammo) === null)
      .map((ammo) => ammo.id)
      .sort();

    expect(compatibleAmmoIds).toEqual(EXPECTED_BATTLEMECH_COMPATIBLE_AMMO_IDS);

    for (const ammo of ammoItems) {
      for (const weaponId of ammo.compatibleWeaponIds) {
        const ammoState = initializeAmmoState([
          {
            binId: `${ammo.id}-${weaponId}-bin`,
            weaponType: weaponId,
            location: 'center_torso',
            maxRounds: ammo.shotsPerTon,
            damagePerRound: 1,
            isExplosive: ammo.isExplosive,
          },
        ]);

        if (!hasAmmoForWeapon(ammoState, weaponId)) {
          failures.push(`${ammo.id} -> ${weaponId}: not available to fire`);
          continue;
        }
        if (getTotalAmmo(ammoState, weaponId) !== ammo.shotsPerTon) {
          failures.push(`${ammo.id} -> ${weaponId}: total ammo mismatch`);
          continue;
        }

        const result = consumeAmmo(ammoState, 'catalog-test-unit', weaponId);
        if (!result?.success) {
          failures.push(`${ammo.id} -> ${weaponId}: could not consume`);
          continue;
        }
        if (result.event.roundsRemaining !== ammo.shotsPerTon - 1) {
          failures.push(
            `${ammo.id} -> ${weaponId}: remaining rounds ${result.event.roundsRemaining}`,
          );
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it('keeps unsupported RAC/10 and RAC/20 ammo out of runtime ammo bins', () => {
    const unsupportedFullUnit = {
      criticalSlots: {
        RIGHT_TORSO: ['Rotary AC/10 Ammo', 'Rotary AC/20 Ammo'],
      },
    } as unknown as IFullUnit;
    const mixedFullUnit = {
      criticalSlots: {
        RIGHT_TORSO: ['Rotary AC/10 Ammo', 'AC/10 Ammo'],
      },
    } as unknown as IFullUnit;

    expect(hydrateAmmoStateFromFullUnit(unsupportedFullUnit)).toBeUndefined();

    const mixedAmmoState = hydrateAmmoStateFromFullUnit(mixedFullUnit);
    expect(Object.values(mixedAmmoState ?? {})).toEqual([
      expect.objectContaining({
        binId: 'right_torso-1-ac-10-ammo',
        weaponType: 'ac-10',
      }),
    ]);
    expect(hasAmmoForWeapon(mixedAmmoState ?? {}, 'rac-10')).toBe(false);
    expect(hasAmmoForWeapon(mixedAmmoState ?? {}, 'rac-20')).toBe(false);
    expect(hasAmmoForWeapon(mixedAmmoState ?? {}, 'ac-10')).toBe(true);
  });

  it('classifies official ammo rows without compatible weapon refs as explicit gaps', () => {
    const ammoClasses: AmmoCompatibilitySupportId[] = ammoItems.map(
      (ammo) => ammoCompatibilityGapClass(ammo) ?? 'battlemech-compatible-ammo',
    );
    const gapClasses = ammoClasses.filter(
      (classification): classification is AmmoCompatibilityGapClass =>
        classification !== 'battlemech-compatible-ammo',
    );
    const ammoCompatibilitySupport: Record<
      AmmoCompatibilitySupportId,
      ICombatFeatureSupportEntry
    > = AMMUNITION_COMPATIBILITY_SUPPORT;
    const untrackedClasses = ammoClasses.filter(
      (classification, index) =>
        ammoClasses.indexOf(classification) === index &&
        ammoCompatibilitySupport[classification] === undefined,
    );

    expect(untrackedClasses).toEqual([]);
    expect(supportGaps(ammoCompatibilitySupport)).toEqual([]);
    expect(ammoCompatibilitySupport['battlemech-compatible-ammo'].level).toBe(
      'integrated',
    );
    expect(
      ammoCompatibilitySupport['battlemech-ammo-missing-compatible-weapon-refs']
        .level,
    ).toBe('integrated');
    expect(
      ammoCompatibilitySupport['unsupported-rotary-ac-10-20-ammo'].level,
    ).toBe('integrated');
    expect({
      'battlemech-ammo-missing-compatible-weapon-refs': ammoIdsByGapClass(
        'battlemech-ammo-missing-compatible-weapon-refs',
      ),
      'unsupported-rotary-ac-10-20-ammo': ammoIdsByGapClass(
        'unsupported-rotary-ac-10-20-ammo',
      ),
      'duplicate-runtime-id': ammoIdsByGapClass('duplicate-runtime-id'),
    }).toEqual(EXPECTED_BATTLEMECH_AMMO_GAP_IDS);
    expect({
      'non-battlemech-aerospace-capital-ammo': ammoIdsByGapClass(
        'non-battlemech-aerospace-capital-ammo',
      ),
      'non-battlemech-battle-armor': ammoIdsByGapClass(
        'non-battlemech-battle-armor',
      ),
      'non-battlemech-protomech': ammoIdsByGapClass('non-battlemech-protomech'),
      'unsupported-aquatic-torpedo-ammo': ammoIdsByGapClass(
        'unsupported-aquatic-torpedo-ammo',
      ),
      'unsupported-artillery-ammo': ammoIdsByGapClass(
        'unsupported-artillery-ammo',
      ),
    }).toEqual(EXPECTED_SCOPE_SPLIT_AMMO_GAP_IDS);
    expect(ammoIdsByGapClass('experimental-empty-compatible-row')).toEqual(
      EXPECTED_EXPERIMENTAL_EMPTY_COMPATIBLE_AMMO_IDS,
    );
    expect(ammoIdsByGapClass('unofficial-empty-compatible-row')).toEqual(
      EXPECTED_UNOFFICIAL_EMPTY_COMPATIBLE_AMMO_IDS,
    );
    const experimentalEmptyCompatibleAmmo = ammoItems.filter(
      (ammo) =>
        ammoCompatibilityGapClass(ammo) === 'experimental-empty-compatible-row',
    );
    const unofficialEmptyCompatibleAmmo = ammoItems.filter(
      (ammo) =>
        ammoCompatibilityGapClass(ammo) === 'unofficial-empty-compatible-row',
    );
    const nonstandardEmptyCompatibleAmmo = [
      ...experimentalEmptyCompatibleAmmo,
      ...unofficialEmptyCompatibleAmmo,
    ];

    expect(experimentalEmptyCompatibleAmmo).toHaveLength(
      EXPECTED_EXPERIMENTAL_EMPTY_COMPATIBLE_AMMO_IDS.length,
    );
    expect(unofficialEmptyCompatibleAmmo).toHaveLength(
      EXPECTED_UNOFFICIAL_EMPTY_COMPATIBLE_AMMO_IDS.length,
    );
    expect(
      nonstandardEmptyCompatibleAmmo.filter(
        (ammo) => ammo.compatibleWeaponIds.length > 0,
      ),
    ).toEqual([]);
    expect(
      experimentalEmptyCompatibleAmmo.every(
        (ammo) => ammo.rulesLevel === 'EXPERIMENTAL',
      ),
    ).toBe(true);
    expect(
      unofficialEmptyCompatibleAmmo.every(
        (ammo) => ammo.rulesLevel === 'UNOFFICIAL',
      ),
    ).toBe(true);
    expect(
      countBy(nonstandardEmptyCompatibleAmmo.map((ammo) => ammo.rulesLevel)),
    ).toEqual({
      EXPERIMENTAL: 39,
      UNOFFICIAL: 101,
    });
    expect(countBy(gapClasses)).toEqual({
      'duplicate-runtime-id': 12,
      'experimental-empty-compatible-row': 39,
      'non-battlemech-aerospace-capital-ammo': 8,
      'non-battlemech-battle-armor': 17,
      'non-battlemech-protomech': 38,
      'unsupported-aquatic-torpedo-ammo': 11,
      'unsupported-artillery-ammo': 9,
      'unsupported-rotary-ac-10-20-ammo': 2,
      'unofficial-empty-compatible-row': 101,
    });
    expect(supportIdsByLevel(ammoCompatibilitySupport, 'helper-only')).toEqual(
      [],
    );
    expect(
      ammoCompatibilitySupport['experimental-empty-compatible-row'].level,
    ).toBe('out-of-scope');
    expect(
      ammoCompatibilitySupport['unofficial-empty-compatible-row'].level,
    ).toBe('out-of-scope');
    expect(
      ammoCompatibilitySupport['experimental-empty-compatible-row'].gap,
    ).toContain('Experimental ammo rules need a separate validation matrix');
    expect(
      ammoCompatibilitySupport['unofficial-empty-compatible-row'].gap,
    ).toContain('Unofficial ammo rules need a separate validation matrix');
    expect(supportIdsByLevel(ammoCompatibilitySupport, 'unsupported')).toEqual(
      [],
    );
    expect(supportIdsByLevel(ammoCompatibilitySupport, 'out-of-scope')).toEqual(
      [
        'non-battlemech-aerospace-capital-ammo',
        'non-battlemech-battle-armor',
        'non-battlemech-protomech',
        'experimental-empty-compatible-row',
        'unsupported-aquatic-torpedo-ammo',
        'unsupported-artillery-ammo',
        'unofficial-empty-compatible-row',
      ].sort(),
    );
    for (const entry of Object.values(ammoCompatibilitySupport)) {
      const sourceRefs = entry.sourceRefs ?? [];

      expect(sourceRefs).not.toHaveLength(0);
      expect(
        sourceRefs.every((sourceRef) => isPinnedCatalogSourceRef(sourceRef)),
      ).toBe(true);
    }
    expect(
      ammoCompatibilitySupport['battlemech-compatible-ammo'].sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('official ammunition category JSON file'),
        expect.stringContaining('buildAmmoLookupFromCatalogFiles'),
        expect.stringContaining('ammoTracking initializes ammo bin state'),
        expect.stringContaining('pins exact compatible BattleMech ammo ids'),
      ]),
    );
    expect(
      ammoCompatibilitySupport[
        'battlemech-ammo-missing-compatible-weapon-refs'
      ].sourceRefs?.map(({ citation }) => citation),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('pins exact BattleMech ammo gap ids'),
        expect.stringContaining('classifies every official ammo row'),
      ]),
    );
    expect(
      ammoCompatibilitySupport[
        'unsupported-rotary-ac-10-20-ammo'
      ].sourceRefs?.map(({ citation }) => citation),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('pins exact BattleMech ammo gap ids'),
        expect.stringContaining('classifies every official ammo row'),
      ]),
    );
    const officialRotaryACWeaponIds = ids(familyItems(/\bRotary AC\b/i));
    const officialRotaryAC10Or20WeaponIds = ids(
      familyItems(/\bRotary AC\/(?:10|20)\b/i),
    );
    const unsupportedRotaryAmmo = ammoItems.filter(
      (ammo) =>
        ammoCompatibilityGapClass(ammo) === 'unsupported-rotary-ac-10-20-ammo',
    );

    expect(officialRotaryACWeaponIds).toEqual([
      'clan-rac-2',
      'clan-rac-5',
      'rac-2',
      'rac-5',
    ]);
    expect(officialRotaryACWeaponIds).not.toEqual(
      expect.arrayContaining(['rac-10', 'rac-20']),
    );
    expect(officialRotaryAC10Or20WeaponIds).toEqual([]);
    expect(
      unsupportedRotaryAmmo.map((ammo) => ({
        id: ammo.id,
        name: ammo.name,
        compatibleWeaponIds: ammo.compatibleWeaponIds,
        rulesLevel: ammo.rulesLevel,
      })),
    ).toEqual([
      {
        id: 'rotaryac10',
        name: 'Rotary AC/10 Ammo',
        compatibleWeaponIds: [],
        rulesLevel: 'STANDARD',
      },
      {
        id: 'rotaryac20',
        name: 'Rotary AC/20 Ammo',
        compatibleWeaponIds: [],
        rulesLevel: 'STANDARD',
      },
    ]);
  });

  it('keeps non-covered ammo compatibility rows out of covered ammo coverage', () => {
    const compatibleAmmoIds = new Set(
      ammoItems
        .filter((ammo) => ammoCompatibilityGapClass(ammo) === null)
        .map((ammo) => ammo.id),
    );
    const emptyCompatibleClassifications = [
      {
        classification: 'experimental-empty-compatible-row',
        expectedIds: EXPECTED_EXPERIMENTAL_EMPTY_COMPATIBLE_AMMO_IDS,
        rulesLevel: 'EXPERIMENTAL',
      },
      {
        classification: 'unofficial-empty-compatible-row',
        expectedIds: EXPECTED_UNOFFICIAL_EMPTY_COMPATIBLE_AMMO_IDS,
        rulesLevel: 'UNOFFICIAL',
      },
    ] satisfies readonly {
      readonly classification:
        | 'experimental-empty-compatible-row'
        | 'unofficial-empty-compatible-row';
      readonly expectedIds: readonly string[];
      readonly rulesLevel: string;
    }[];

    expect(Array.from(compatibleAmmoIds).sort()).toEqual(
      EXPECTED_BATTLEMECH_COMPATIBLE_AMMO_IDS,
    );

    for (const {
      classification,
      expectedIds,
      rulesLevel,
    } of emptyCompatibleClassifications) {
      const supportEntry = AMMUNITION_COMPATIBILITY_SUPPORT[classification];
      const rows = ammoItems
        .filter((ammo) => ammoCompatibilityGapClass(ammo) === classification)
        .sort((left, right) => left.id.localeCompare(right.id));

      expect(supportEntry).toMatchObject({
        level: 'out-of-scope',
        evidence: expect.stringContaining(
          'official compatible BattleMech ammo',
        ),
        gap: expect.stringContaining('separate validation matrix'),
      });
      expect(supportEntry.sourceRefs?.map(({ citation }) => citation)).toEqual(
        expect.arrayContaining([
          expect.stringContaining('guards empty-compatible non-official rows'),
        ]),
      );
      expect(rows.map((ammo) => ammo.id)).toEqual(expectedIds);
      expect(
        rows.map((ammo) => ({
          id: ammo.id,
          compatibleWeaponIds: ammo.compatibleWeaponIds,
          coveredAmmo: compatibleAmmoIds.has(ammo.id),
          rulesLevel: ammo.rulesLevel,
        })),
      ).toEqual(
        expectedIds.map((id) => ({
          id,
          compatibleWeaponIds: [],
          coveredAmmo: false,
          rulesLevel,
        })),
      );
    }

    const unsupportedRotaryAmmo = ammoItems
      .filter(
        (ammo) =>
          ammoCompatibilityGapClass(ammo) ===
          'unsupported-rotary-ac-10-20-ammo',
      )
      .sort((left, right) => left.id.localeCompare(right.id));
    const unsupportedRotaryEntry =
      AMMUNITION_COMPATIBILITY_SUPPORT['unsupported-rotary-ac-10-20-ammo'];
    const unsupportedRotarySourceRefs = unsupportedRotaryEntry.sourceRefs ?? [];
    const unsupportedRotaryMegaMekRefs = unsupportedRotarySourceRefs.filter(
      (sourceRef) => sourceRef.kind === 'megamek-source',
    );
    const unsupportedRotaryDecisionText = [
      unsupportedRotaryEntry.evidence,
      unsupportedRotaryEntry.gap,
      ...unsupportedRotarySourceRefs.map(({ citation }) => citation),
    ].join('\n');

    expect(unsupportedRotaryEntry).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('empty compatibleWeaponIds'),
    });
    expect(unsupportedRotaryEntry.gap).toBeUndefined();
    expect(unsupportedRotaryEntry.evidence).toEqual(
      expect.stringContaining('without deriving compatibility'),
    );
    expect(unsupportedRotarySourceRefs.map(({ citation }) => citation)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('guards empty-compatible non-official rows'),
        expect.stringContaining('official autocannon ammo catalog'),
        expect.stringContaining('official ballistic-autocannon weapon catalog'),
      ]),
    );
    expectPinnedMegaMekRefs(unsupportedRotaryMegaMekRefs);
    expect(unsupportedRotaryDecisionText).toEqual(
      expect.stringMatching(/MegaMek/i),
    );
    expect(unsupportedRotaryDecisionText).toEqual(
      expect.stringMatching(/unofficial/i),
    );
    expect(unsupportedRotaryDecisionText).toEqual(
      expect.stringMatching(/RAC\/10/i),
    );
    expect(unsupportedRotaryDecisionText).toEqual(
      expect.stringMatching(/RAC\/20/i),
    );
    expect(unsupportedRotaryDecisionText).toEqual(
      expect.stringMatching(/unofficial clan package|weapon package/i),
    );
    expect(unsupportedRotaryDecisionText).toEqual(
      expect.stringMatching(
        /(?:class.*register|register.*class|WeaponType registers)/i,
      ),
    );
    expect(
      EXPECTED_BATTLEMECH_AMMO_GAP_IDS['unsupported-rotary-ac-10-20-ammo'],
    ).toBe(UNSUPPORTED_ROTARY_AC_10_20_AMMO_IDS);
    expect(
      unsupportedRotaryAmmo.map((ammo) => ({
        id: ammo.id,
        compatibleWeaponIds: ammo.compatibleWeaponIds,
        coveredAmmo: compatibleAmmoIds.has(ammo.id),
        rulesLevel: ammo.rulesLevel,
        weaponLookup: weaponLookup(ammo.id),
      })),
    ).toEqual([
      {
        id: 'rotaryac10',
        compatibleWeaponIds: [],
        coveredAmmo: false,
        rulesLevel: 'STANDARD',
        weaponLookup: null,
      },
      {
        id: 'rotaryac20',
        compatibleWeaponIds: [],
        coveredAmmo: false,
        rulesLevel: 'STANDARD',
        weaponLookup: null,
      },
    ]);
    expect(
      UNSUPPORTED_ROTARY_AC_10_20_WEAPON_PROBE_IDS.map((weaponId) => ({
        weaponId,
        equipmentBvResolved: resolveEquipmentBV(weaponId).resolved,
        weaponLookup: weaponLookup(weaponId),
      })),
    ).toEqual(
      UNSUPPORTED_ROTARY_AC_10_20_WEAPON_PROBE_IDS.map((weaponId) => ({
        weaponId,
        equipmentBvResolved: false,
        weaponLookup: null,
      })),
    );
  });

  it('classifies every official special combat family in the catalog', () => {
    const ultraACs = familyItems(/\bUltra AC\b/i);
    const rotaryACs = familyItems(/\bRotary AC\b/i);
    const lbxACs = familyItems(/\bLB-X AC\b|\bLB \d+-X AC\b/i);
    const streakLaunchers = familyItems(/\bStreak\b/i);
    const mmlLaunchers = familyItems(/\bMML\b/i);
    const narcLaunchers = familyItems(/\bNARC\b|\biNARC\b|\bNarc\b/i);
    const amsSystems = familyItems(/\bAnti-Missile System\b|\bAMS\b/i);
    const plasmaCannons = familyItems(/\bPlasma Cannon\b/i);
    const tagDesignators = electronicsItems.filter((item) =>
      /\bTAG\b/i.test(itemText(item)),
    );
    const artemisFcs = miscellaneousItems.filter((item) =>
      /\bArtemis\b/i.test(itemText(item)),
    );

    expect(ultraACs).toHaveLength(8);
    expect(rotaryACs).toHaveLength(4);
    expect(lbxACs).toHaveLength(8);
    expect(streakLaunchers).toHaveLength(61);
    expect(mmlLaunchers).toHaveLength(4);
    expect(narcLaunchers).toHaveLength(10);
    expect(amsSystems).toHaveLength(4);
    expect(plasmaCannons).toHaveLength(1);
    expect(tagDesignators).toHaveLength(4);
    expect(artemisFcs).toHaveLength(3);
    expect({
      'lb-x-ac': ids(lbxACs),
      mml: ids(mmlLaunchers),
      'rotary-ac': ids(rotaryACs),
      'ultra-ac': ids(ultraACs),
    }).toEqual(EXPECTED_MULTI_MODE_SPECIAL_WEAPON_FAMILY_IDS);
    expect({
      'damage-capable': ids(
        streakLaunchers.filter((item) => item.damage !== 0),
      ),
      'zero-damage-data-gap': ids(
        streakLaunchers.filter((item) => item.damage === 0),
      ),
    }).toEqual(EXPECTED_STREAK_WEAPON_FAMILY_IDS);
    expect({
      ams: ids(amsSystems),
      artemis: ids(artemisFcs),
      narc: ids(narcLaunchers),
      'plasma-cannon': ids(plasmaCannons),
      tag: ids(tagDesignators),
    }).toEqual({
      ...EXPECTED_DESIGNATOR_DEFENSIVE_SPECIAL_FAMILY_IDS,
      'plasma-cannon': ['clan-plasma-cannon'],
    });

    expect(ids(ultraACs).every(isUltraAC)).toBe(true);
    expect(ids(rotaryACs).every(isRotaryAC)).toBe(true);
    expect(ids(lbxACs).every(isLBXAC)).toBe(true);
    expect(
      EXPECTED_STREAK_WEAPON_FAMILY_IDS['damage-capable'].every(isStreakSRM),
    ).toBe(true);
    expect(
      EXPECTED_STREAK_WEAPON_FAMILY_IDS['damage-capable'].every(
        verifyStreakBehavior,
      ),
    ).toBe(true);
    expect(ids(narcLaunchers).every(isNarc)).toBe(true);
    expect(ids(amsSystems).every(isAMS)).toBe(true);
    expect(ids(tagDesignators).every(isTAG)).toBe(true);

    expect(sortedKeys(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT)).toEqual([
      'ams',
      'artemis',
      'lb-x-ac',
      'mml',
      'narc',
      'plasma-cannon',
      'rotary-ac',
      'streak-srm',
      'tag',
      'ultra-ac',
    ]);
    expect(supportGaps(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT, 'integrated'),
    ).toEqual([
      'ams',
      'artemis',
      'lb-x-ac',
      'mml',
      'narc',
      'rotary-ac',
      'streak-srm',
      'tag',
      'ultra-ac',
    ]);
    expect(
      supportIdsByLevel(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([]);
    expect(
      supportIdsByLevel(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT, 'out-of-scope'),
    ).toEqual(['plasma-cannon']);

    expect(supportGaps(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT, 'integrated'),
    ).toEqual([
      'active-probe-counter-hydration',
      'active-probe-critical-lifecycle',
      'ams-ammo-consumption',
      'ams-authored-multi-use-lifecycle',
      'ams-automatic-interception-assignment',
      'ams-interception-events',
      'ams-manual-defender-choice',
      'ams-mounted-arc-enforcement',
      'ams-mounted-arc-hydration',
      'ams-projectile-reduction',
      'ams-runner-selected-defender-choice',
      'ams-session-selected-defender-choice',
      'ams-single-missile-parity',
      'ams-streak-cluster-parity',
      'artemis-active-probe-mode-authoring',
      'artemis-ambiguous-fcs-allocation-authoring',
      'artemis-cews-ecm-probe-lifecycle',
      'artemis-cluster-modifier',
      'artemis-ecm-mode-lifecycle',
      'artemis-ecm-suite-hydration',
      'artemis-ecm-suppression',
      'artemis-ew-mode-authoring',
      'artemis-explicit-fcs-link-lifecycle',
      'artemis-fcs-critical-lifecycle',
      'artemis-fcs-critical-slot-hydration',
      'artemis-link-network-lifecycle',
      'artemis-stealth-mode-damage-lifecycle',
      'artemis-stealth-suppression',
      'inarc-ecm-attacker-flight-path-suppression',
      'inarc-ecm-c3-disruption',
      'inarc-ecm-sensor-effects',
      'inarc-explosive-ammo-compatibility',
      'inarc-haywire-to-hit-modifier',
      'inarc-homing-cluster-modifier',
      'inarc-homing-marker-attachment',
      'inarc-homing-to-hit-modifier',
      'inarc-nemesis-redirect',
      'inarc-pod-brush-off-removal-lifecycle',
      'inarc-pod-brush-off-target-selection',
      'inarc-pod-event-replay-lifecycle',
      'inarc-pod-helper-removal-lifecycle',
      'inarc-pod-object-lifecycle',
      'inarc-pod-target-identity-lifecycle',
      'inarc-pod-target-option-deduplication',
      'inarc-pod-turn-reset-lifecycle',
      'inarc-pod-variants',
      'inarc-variant-ammo-attachment',
      'lbx-cluster-to-hit',
      'lbx-slug-cluster-modes',
      'mml-srm-lrm-ammo-compatibility',
      'mml-srm-lrm-mode-damage',
      'mml-variable-damage',
      'narc-cluster-modifier',
      'narc-marker-attachment',
      'narc-marker-lifecycle-events',
      'nova-cews-c3-network-lifecycle',
      'plasma-cannon-battlemech-heat-phase-pending-bucket',
      'plasma-cannon-battlemech-target-heat',
      'rac-jam-on-natural-two',
      'rac-rate-of-fire',
      'streak-lock-no-spend-on-miss',
      'streak-rack-projectiles',
      'tag-designation-hit',
      'tag-intent-wire-state-replay',
      'tag-marker-lifecycle-events',
      'tag-semi-guided-to-hit',
      'tag-turn-lifecycle-clear',
      'uac-jam-on-natural-two',
      'uac-rate-of-fire',
    ]);
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-cluster-modifier']
        .evidence,
    ).toEqual(expect.stringContaining('prototype IV/V'));
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-cluster-modifier']
        .evidence,
    ).toEqual(expect.stringContaining('indirect-fire state'));
    expect(
      supportIdsByLevel(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([]);
    expect(
      supportIdsByLevel(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT, 'unsupported'),
    ).toEqual(
      [...UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_SUPPORT_IDS].sort(),
    );
    expect(
      supportIdsByLevel(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT, 'out-of-scope'),
    ).toEqual(
      expect.arrayContaining([
        'ams-bay-authoring',
        'ams-optional-multi-use-authoring',
        'inarc-producer-c3-authoring',
      ]),
    );
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-variants'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('Homing, ECM, Haywire, and Nemesis'),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-variants'].gap,
    ).toBeUndefined();
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-variants'].evidence,
    ).toContain('source-backed executable rows');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-object-lifecycle'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('carrier iNarcPods state'),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-object-lifecycle']
        .evidence,
    ).toContain('physical panel/store author selected pod identity');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-object-lifecycle']
        .evidence,
    ).toContain('selectedINarcPod');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-object-lifecycle'].gap,
    ).toBeUndefined();
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-object-lifecycle']
        .evidence,
    ).toContain(
      'producer-side C3 authoring remains separated under inarc-producer-c3-authoring',
    );
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'inarc-pod-brush-off-removal-lifecycle'
      ].evidence,
    ).toContain('selectedINarcPod');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'inarc-pod-target-identity-lifecycle'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('same-team/same-type'),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'inarc-pod-target-option-deduplication'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('target-option dedupe'),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'inarc-pod-brush-off-target-selection'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'carrier-scoped attached iNarc pod rows',
      ),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'inarc-pod-helper-removal-lifecycle'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('removes exactly one matching'),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'inarc-pod-event-replay-lifecycle'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('rehydrates typed iNarcPods'),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-object-lifecycle']
        .evidence,
    ).toContain('producer-side C3 authoring remains separated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-variants'].evidence,
    ).not.toContain('Explosive');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-ecm-sensor-effects'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('tactical sensor contacts'),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-ecm-sensor-effects']
        .evidence,
    ).toContain('sensorRangeBrackets');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-ecm-sensor-effects']
        .evidence,
    ).toContain('Artemis/prototype Artemis/Artemis V suppression');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-ecm-sensor-effects'].gap,
    ).toBeUndefined();
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-producer-c3-authoring'],
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining('iNarc ECM C3 disruption'),
      gap: expect.stringContaining('Producer-side C3 membership'),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-producer-c3-authoring']
        .evidence,
    ).toContain('Residual row only');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-producer-c3-authoring']
        .evidence,
    ).toContain('conservative unambiguous C3 equipment seeding');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-producer-c3-authoring'].gap,
    ).toContain('C3 assignment UI/editor');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-producer-c3-authoring'].gap,
    ).toContain('equipment seeding');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-producer-c3-authoring'].gap,
    ).toContain('iNarc ECM disruption alone');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'inarc-pod-brush-off-removal-lifecycle'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'carrier-level attached iNarc pod removal',
      ),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'inarc-explosive-ammo-compatibility'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('6-point impact damage'),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'inarc-explosive-ammo-compatibility'
      ].gap,
    ).toBeUndefined();
    expect(
      supportIdsByLevel(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT, 'unsupported'),
    ).toEqual(
      [...UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_SUPPORT_IDS].sort(),
    );
  });

  it('maps every damage-capable official Streak SRM launcher to runner all-or-none semantics', () => {
    const failures: string[] = [];

    for (const weaponId of EXPECTED_STREAK_WEAPON_FAMILY_IDS[
      'damage-capable'
    ]) {
      const catalogWeapon = weaponLookup(weaponId);
      if (!catalogWeapon) {
        failures.push(`${weaponId}: missing from combat weapon lookup`);
        continue;
      }

      const aiWeapon = toAIWeapon(catalogWeapon, 0);
      const resolved = resolveSpecialProjectileHit({
        baseWeapon: aiWeapon,
        shotWeapon: aiWeapon,
        selectedMode: undefined,
        d6Roller: () => 6,
      });

      if (shouldSpendAmmoAndHeatOnMiss(aiWeapon)) {
        failures.push(`${weaponId}: failed lock would spend ammo or heat`);
      }
      if (aiWeapon.damage <= 0) {
        failures.push(`${weaponId}: damage-capable Streak mapped to zero`);
      }
      if (
        resolved.projectileCount === undefined ||
        resolved.projectileCount <= 0
      ) {
        failures.push(`${weaponId}: runner could not derive rack size`);
      }
    }

    expect(failures).toEqual([]);
  });

  it('keeps zero-damage Streak variants as catalog-visible data gaps', () => {
    const zeroDamageStreakLaunchers = familyItems(/\bStreak\b/i).filter(
      (item) => item.damage === 0,
    );

    expect(ids(zeroDamageStreakLaunchers)).toEqual(
      EXPECTED_STREAK_WEAPON_FAMILY_IDS['zero-damage-data-gap'],
    );
    expect(
      zeroDamageStreakLaunchers.map((item) => zeroDamageClassification(item)),
    ).toEqual(
      Array.from(
        {
          length:
            EXPECTED_STREAK_WEAPON_FAMILY_IDS['zero-damage-data-gap'].length,
        },
        () => 'nonstandard-data-gap',
      ),
    );
  });

  it('maps official ordinary AC, UAC, RAC, LB-X, and MML catalog weapons into AI firing modes', () => {
    const multiModeFamilies = [
      {
        ids: ['ac-2', 'ac-5', 'ac-10', 'ac-20'],
        kind: 'rate-of-fire',
        defaultModeId: 'single',
        modeIds: ['single', 'rapid-fire'],
      },
      {
        ids: EXPECTED_MULTI_MODE_SPECIAL_WEAPON_FAMILY_IDS['ultra-ac'],
        kind: 'rate-of-fire',
        defaultModeId: 'single',
        modeIds: ['single', 'double'],
      },
      {
        ids: EXPECTED_MULTI_MODE_SPECIAL_WEAPON_FAMILY_IDS['rotary-ac'],
        kind: 'rate-of-fire',
        defaultModeId: 'rof-1',
        modeIds: ['rof-1', 'rof-2', 'rof-3', 'rof-4', 'rof-5', 'rof-6'],
      },
      {
        ids: EXPECTED_MULTI_MODE_SPECIAL_WEAPON_FAMILY_IDS['lb-x-ac'],
        kind: 'cluster-slug',
        defaultModeId: 'slug',
        modeIds: ['slug', 'cluster'],
      },
      {
        ids: EXPECTED_MULTI_MODE_SPECIAL_WEAPON_FAMILY_IDS.mml,
        kind: 'ammo-mode',
        defaultModeId: 'srm',
        modeIds: ['srm', 'lrm'],
      },
    ] as const;

    for (const family of multiModeFamilies) {
      for (const weaponId of family.ids) {
        const catalogWeapon = weaponLookup(weaponId);
        expect(catalogWeapon).not.toBeNull();
        if (!catalogWeapon) continue;

        const aiWeapon = toAIWeapon(catalogWeapon, 0);
        expect(aiWeapon.firingModes?.kind).toBe(family.kind);
        expect(aiWeapon.firingModes?.defaultModeId).toBe(family.defaultModeId);
        expect(aiWeapon.firingModes?.modes.map((mode) => mode.id)).toEqual(
          family.modeIds,
        );
      }
    }
  });

  it('authors ordinary AC catalog rows with represented TacOps rapid-fire modes', () => {
    for (const weaponId of ['ac-2', 'ac-5', 'ac-10', 'ac-20']) {
      const catalogWeapon = weaponLookup(weaponId);
      expect(catalogWeapon).not.toBeNull();
      if (!catalogWeapon) continue;

      const aiWeapon = toAIWeapon(catalogWeapon, 0);
      expect(aiWeapon.firingModes).toMatchObject({
        kind: 'rate-of-fire',
        defaultModeId: 'single',
        modes: [
          {
            id: 'single',
            damage: aiWeapon.damage,
            heat: aiWeapon.heat,
            shotsPerTurn: 1,
          },
          {
            id: 'rapid-fire',
            damage: aiWeapon.damage * 2,
            heat: aiWeapon.heat * 2,
            shotsPerTurn: 2,
          },
        ],
      });
    }
  });

  it('lets hydrated special-mode weapons participate in AI mode selection', () => {
    const uac = toAIWeapon(weaponLookup('uac-5') as ICatalogWeaponStats, 0);
    const rac = toAIWeapon(weaponLookup('rac-5') as ICatalogWeaponStats, 0);
    const lbx = toAIWeapon(
      weaponLookup('lb-10-x-ac') as ICatalogWeaponStats,
      0,
    );
    const mml = toAIWeapon(weaponLookup('mml-9') as ICatalogWeaponStats, 0);

    expect(
      selectWeaponMode(
        uac,
        {
          distance: 5,
          heatHeadroom: 99,
          ammoTurnsRemaining: 40,
        },
        true,
      ),
    ).toMatchObject({
      modeId: 'double',
      effectiveDamage: 10,
      effectiveHeat: 2,
      effectiveShots: 2,
    });

    expect(
      selectWeaponMode(
        rac,
        {
          distance: 5,
          heatHeadroom: 99,
          ammoTurnsRemaining: 60,
        },
        true,
      ),
    ).toMatchObject({
      modeId: 'rof-6',
      effectiveDamage: 30,
      effectiveHeat: 6,
      effectiveShots: 6,
    });

    expect(
      selectWeaponMode(
        lbx,
        {
          distance: 5,
          heatHeadroom: 99,
          ammoTurnsRemaining: 20,
          targetEvading: true,
        },
        true,
      ).modeId,
    ).toBe('cluster');

    expect(
      selectWeaponMode(
        mml,
        {
          distance: 2,
          heatHeadroom: 99,
          ammoTurnsRemaining: 20,
        },
        true,
      ),
    ).toMatchObject({
      modeId: 'srm',
      effectiveDamage: 18,
      effectiveHeat: 5,
      effectiveShots: 1,
    });

    expect(
      selectWeaponMode(
        mml,
        {
          distance: 5,
          heatHeadroom: 99,
          ammoTurnsRemaining: 20,
        },
        true,
      ),
    ).toMatchObject({
      modeId: 'lrm',
      effectiveDamage: 9,
      effectiveHeat: 5,
      effectiveShots: 1,
    });
  });

  it('keeps remaining special-family mechanics visible as helper-only or unsupported gaps', () => {
    const mmlLaunchers = familyItems(/\bMML\b/i);
    const narcLaunchers = familyItems(/\bNARC\b|\biNARC\b|\bNarc\b/i);
    const amsSystems = familyItems(/\bAnti-Missile System\b|\bAMS\b/i);
    const plasmaCannons = familyItems(/\bPlasma Cannon\b/i);
    const tagDesignators = electronicsItems.filter((item) =>
      /\bTAG\b/i.test(itemText(item)),
    );
    const artemisFcs = miscellaneousItems.filter((item) =>
      /\bArtemis\b/i.test(itemText(item)),
    );

    for (const item of mmlLaunchers) {
      const catalogWeapon = weaponLookup(item.id as string);
      expect(catalogWeapon).not.toBeNull();
      if (!catalogWeapon) continue;

      const aiWeapon = toAIWeapon(catalogWeapon, 0);
      expect(aiWeapon.damage).toBeGreaterThan(0);
      expect(aiWeapon.firingModes).toMatchObject({
        kind: 'ammo-mode',
        defaultModeId: 'srm',
      });
      expect(aiWeapon.firingModes?.modes.map((mode) => mode.id)).toEqual([
        'srm',
        'lrm',
      ]);
    }

    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.mml.level).toBe('integrated');
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.narc.level).toBe('integrated');
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.narc.evidence).toContain(
      'carrier-attached iNarc pod-object target selection/removal lifecycle',
    );
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.level).toBe('integrated');
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].level).toBe(
      'out-of-scope',
    );
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.tag.level).toBe('integrated');
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.tag.evidence).toContain(
      'official cluster totals ignore',
    );
    expect(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT).not.toHaveProperty(
      'tag-semi-guided-cluster-bonus',
    );
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['lb-x-ac'].level).toBe(
      'integrated',
    );
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.artemis.level).toBe(
      'integrated',
    );
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.artemis.evidence).toContain(
      'Represented BattleMech Artemis family support',
    );
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.artemis.evidence).toContain(
      'unambiguous single-launcher or exact-cardinality same-location Artemis IV/prototype IV/V FCS critical-slot hydration',
    );
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-fcs-critical-slot-hydration'
      ].level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-fcs-critical-slot-hydration'
      ].evidence,
    ).toContain('explicit linkedEquipment FCS allocation when present');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-explicit-fcs-link-lifecycle'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'strips guidance only from that explicitly linked launcher',
      ),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-fcs-critical-lifecycle']
        .level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-fcs-critical-lifecycle']
        .evidence,
    ).toContain('unambiguous same-location weapon guidance flags');
    expect(getCombatValidationUnresolvedRefs()).not.toContain(
      'featureSupport.specialWeaponMechanics.artemis-fcs-critical-slot-hydration',
    );
    expect(getCombatValidationUnresolvedRefs()).not.toContain(
      'featureSupport.specialWeaponMechanics.artemis-explicit-fcs-link-lifecycle',
    );
    expect(getCombatValidationUnresolvedRefs()).not.toContain(
      'featureSupport.specialWeaponMechanics.artemis-fcs-critical-lifecycle',
    );
    expect(getCombatValidationUnresolvedRefs()).not.toContain(
      'featureSupport.specialWeaponFamilies.artemis',
    );
    expect(getCombatValidationUnresolvedRefs()).not.toContain(
      'featureSupport.specialWeaponMechanics.artemis-link-network-lifecycle',
    );
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-ambiguous-fcs-allocation-authoring'
      ].level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-ambiguous-fcs-allocation-authoring'
      ].evidence,
    ).toContain('whole-catalog non-torpedo audit coverage');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-ambiguous-fcs-allocation-authoring'
      ].gap,
    ).toBeUndefined();
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-active-probe-mode-authoring'
      ].level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-active-probe-mode-authoring'
      ].evidence,
    ).toContain(
      'represented by BAP/CEWS equipment hydration and operational lifecycle rather than a separate probe mode surface',
    );
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-active-probe-mode-authoring'
      ].gap,
    ).toBeUndefined();
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-ew-mode-authoring'].level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-ew-mode-authoring']
        .evidence,
    ).toContain(
      'imports ECM suite currentMode/mode/activeMode/modeName authoring',
    );
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-ew-mode-authoring'].gap,
    ).toBeUndefined();
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-stealth-mode-damage-lifecycle'
      ].level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-stealth-mode-damage-lifecycle'
      ].evidence,
    ).toContain('represented ECM equipment critical replay disables');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-stealth-mode-damage-lifecycle'
      ].gap,
    ).toBeUndefined();
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-link-network-lifecycle'
      ].sourceRefs?.map(({ citation }) => citation),
    ).toEqual(
      expect.arrayContaining([
        'ComputeC3Spotter treats Nova as a C3-type network for range calculation when the attacker has active Nova CEWS.',
        'Entity places active Nova CEWS units on C3Nova network ids and matches Nova network membership through C3 network state.',
      ]),
    );
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-link-network-lifecycle']
        .gap,
    ).toBeUndefined();
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['mml-variable-damage'].level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['mml-srm-lrm-ammo-compatibility']
        .level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['tag-designation-hit'].level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['tag-intent-wire-state-replay']
        .level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-projectile-reduction'].level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-interception-events'].level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'ams-runner-selected-defender-choice'
      ].level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'ams-session-selected-defender-choice'
      ].level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-manual-defender-choice']
        .level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-authored-multi-use-lifecycle']
        .level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-bay-authoring'].level,
    ).toBe('out-of-scope');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-optional-multi-use-authoring']
        .level,
    ).toBe('out-of-scope');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-link-network-lifecycle']
        .level,
    ).toBe('integrated');
    expect([...UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_SUPPORT_IDS]).toEqual(
      [],
    );
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-cluster-modifier'].level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-fcs-critical-slot-hydration'
      ].level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-fcs-critical-lifecycle']
        .level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['active-probe-critical-lifecycle']
        .level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-cews-ecm-probe-lifecycle']
        .level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-cews-ecm-probe-lifecycle']
        .evidence,
    ).toContain(
      'without promoting Nova CEWS C3-style network behavior into Artemis FCS support',
    );
    expect(
      supportIdsByLevel(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT, 'unsupported'),
    ).toEqual([]);
    expect(
      typeof SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].gap ===
        'string' &&
        SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].gap.length > 0,
    ).toBe(true);
    expect(
      SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].gap,
    ).not.toContain('heatFromExternal Heat Phase pending-bucket timing');
    expect(
      SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].gap,
    ).not.toContain('timing/caps/lifecycle');
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].gap).toContain(
      'non-Mek special damage paths',
    );
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].gap).toContain(
      'terrain/building special damage paths',
    );

    expect(ids(narcLaunchers)).toContain('narc');
    expect(ids(amsSystems)).toContain('ams');
    expect(ids(plasmaCannons)).toEqual(['clan-plasma-cannon']);
    expect(ids(tagDesignators)).toContain('tag');
    expect(ids(artemisFcs)).toEqual([
      'artemisiv',
      'artemisivproto',
      'artemisv',
    ]);
  });

  it('keeps target special-weapon unresolved rows precise and authoring scope out-of-scope', () => {
    const targetUnresolvedRefs = UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_REFS;
    const unresolvedRefs = getCombatValidationUnresolvedRefs();
    const specialWeaponUnresolvedRefs = unresolvedRefs.filter(
      (ref) =>
        ref.startsWith('featureSupport.specialWeaponFamilies.') ||
        ref.startsWith('featureSupport.specialWeaponMechanics.'),
    );

    expect(specialWeaponUnresolvedRefs).toEqual(targetUnresolvedRefs);
    expect(unresolvedRefs).not.toContain(
      'featureSupport.specialWeaponMechanics.artemis-link-network-lifecycle',
    );
    expect(unresolvedRefs).not.toContain(
      'featureSupport.specialWeaponFamilies.plasma-cannon',
    );
    expect(getCombatValidationOutOfScopeRefs()).toContain(
      'featureSupport.specialWeaponFamilies.plasma-cannon',
    );
    expect(getCombatValidationOutOfScopeRefs()).toContain(
      'featureSupport.specialWeaponMechanics.ams-bay-authoring',
    );
    expect(getCombatValidationOutOfScopeRefs()).toContain(
      'featureSupport.specialWeaponMechanics.ams-optional-multi-use-authoring',
    );
    expect(getCombatValidationOutOfScopeRefs()).toContain(
      'featureSupport.specialWeaponMechanics.inarc-producer-c3-authoring',
    );
    expect(unresolvedRefs).not.toContain(
      'featureSupport.specialWeaponMechanics.inarc-producer-c3-authoring',
    );
    expect(unresolvedRefs).not.toContain(
      'featureSupport.specialWeaponMechanics.ams-manual-defender-choice',
    );
    expect(unresolvedRefs).not.toContain(
      'featureSupport.specialWeaponFamilies.artemis',
    );
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-link-network-lifecycle'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'Split-accounted Artemis lifecycle row',
      ),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-link-network-lifecycle']
        .gap,
    ).toBeUndefined();
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-ambiguous-fcs-allocation-authoring'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'whole-catalog non-torpedo audit coverage',
      ),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-ambiguous-fcs-allocation-authoring'
      ].gap,
    ).toBeUndefined();
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-active-probe-mode-authoring'
      ].level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-active-probe-mode-authoring'
      ].gap,
    ).toBeUndefined();
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-ew-mode-authoring'].level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-ew-mode-authoring']
        .evidence,
    ).toContain(
      'imports ECM suite currentMode/mode/activeMode/modeName authoring',
    );
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-stealth-mode-damage-lifecycle'
      ].level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-stealth-mode-damage-lifecycle'
      ].gap,
    ).toBeUndefined();
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon']).toMatchObject(
      {
        level: 'out-of-scope',
        evidence: expect.stringContaining('zero BattleMech damage'),
        gap: expect.stringContaining('non-Mek special damage paths'),
      },
    );
    expect(
      SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].evidence,
    ).toContain('Heat Phase pending bucket');
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['plasma-cannon'].gap).toContain(
      'terrain/building special damage paths',
    );
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-manual-defender-choice'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('selectedAMSWeaponIds'),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-manual-defender-choice']
        .evidence,
    ).toContain('AttackInvalid before AttackDeclared');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-bay-authoring'],
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining('AMS bay-shaped helper metadata'),
      gap: expect.stringContaining(
        'outside the current BattleMech blocker matrix',
      ),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'ams-optional-multi-use-authoring'
      ],
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining(
        'does not expose a multi-use AMS variant',
      ),
      gap: expect.stringContaining(
        'outside the current BattleMech blocker matrix',
      ),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-variants'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('selected-ammo attachment'),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-variants'].gap,
    ).toBeUndefined();
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-object-lifecycle'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('carrier iNarcPods state'),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-object-lifecycle']
        .evidence,
    ).toContain('physical panel/store author selected pod identity');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-object-lifecycle'].gap,
    ).toBeUndefined();
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'inarc-pod-event-replay-lifecycle'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'deduplicates repeated team/pod events',
      ),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'inarc-pod-target-identity-lifecycle'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('same-team/same-type'),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'inarc-pod-target-option-deduplication'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('target-option dedupe'),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'inarc-pod-brush-off-target-selection'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'carrier-scoped attached iNarc pod rows',
      ),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'inarc-pod-helper-removal-lifecycle'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('leaves the original array untouched'),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-object-lifecycle'].gap,
    ).toBeUndefined();
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-variants'].evidence,
    ).toContain('markerless unknown-ammo guard behavior');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-pod-variants'].evidence,
    ).not.toContain('Explosive');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-ecm-sensor-effects'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('tactical sensor contacts'),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-ecm-sensor-effects'].gap,
    ).toBeUndefined();
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'inarc-ecm-sensor-effects'
      ].sourceRefs?.map(({ citation }) => citation),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('sensor range-bracket checks'),
        expect.stringContaining('Sensor.getModForECM'),
      ]),
    );
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-producer-c3-authoring'],
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining('explicit C3 range sharing'),
      gap: expect.stringContaining('Producer-side C3 membership'),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-producer-c3-authoring']
        .evidence,
    ).toContain('to-hit C3 rows');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-producer-c3-authoring'].gap,
    ).toContain('explicit or conservative C3 state consumption alone');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-producer-c3-authoring'].gap,
    ).toContain('equipment seeding');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['inarc-producer-c3-authoring'].gap,
    ).toContain('iNarc ECM disruption alone');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'inarc-explosive-ammo-compatibility'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('6-point impact damage'),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'inarc-explosive-ammo-compatibility'
      ].gap,
    ).toBeUndefined();
  });

  it('keeps represented Artemis mechanics integrated while residual mechanics stay explicit', () => {
    const representedArtemisMechanicIds = [
      'artemis-cluster-modifier',
      'artemis-cews-ecm-probe-lifecycle',
      'artemis-link-network-lifecycle',
      'artemis-explicit-fcs-link-lifecycle',
      'artemis-fcs-critical-lifecycle',
      'artemis-fcs-critical-slot-hydration',
      'artemis-ecm-suppression',
      'artemis-ecm-suite-hydration',
      'active-probe-counter-hydration',
      'active-probe-critical-lifecycle',
      'artemis-stealth-suppression',
      'artemis-stealth-mode-damage-lifecycle',
      'artemis-ambiguous-fcs-allocation-authoring',
    ] as const satisfies readonly (keyof typeof SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT)[];
    const unresolvedArtemisMechanicIds =
      [] as const satisfies readonly (keyof typeof SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT)[];
    const unresolvedRefs = getCombatValidationUnresolvedRefs();

    expect(unresolvedRefs).not.toContain(
      'featureSupport.specialWeaponFamilies.artemis',
    );
    expect(unresolvedRefs).not.toContain(
      'featureSupport.specialWeaponMechanics.artemis-link-network-lifecycle',
    );
    expect([...unresolvedArtemisMechanicIds]).toEqual([]);
    expect(unresolvedRefs).not.toContain(
      'featureSupport.specialWeaponMechanics.artemis-ambiguous-fcs-allocation-authoring',
    );
    expect(unresolvedRefs).not.toContain(
      'featureSupport.specialWeaponMechanics.artemis-ew-mode-authoring',
    );
    expect(unresolvedRefs).not.toContain(
      'featureSupport.specialWeaponMechanics.artemis-active-probe-mode-authoring',
    );
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-ew-mode-authoring'],
    ).toMatchObject({
      level: 'integrated',
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-ew-mode-authoring'].gap,
    ).toBeUndefined();
    expect(
      representedArtemisMechanicIds.map(
        (id) => SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[id].level,
      ),
    ).toEqual(representedArtemisMechanicIds.map(() => 'integrated'));
    for (const id of representedArtemisMechanicIds) {
      expect(unresolvedRefs).not.toContain(
        `featureSupport.specialWeaponMechanics.${id}`,
      );
      expect(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[id].gap).toBeUndefined();
    }

    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.artemis).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'Represented BattleMech Artemis family',
      ),
    });
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.artemis.gap).toBeUndefined();
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-link-network-lifecycle'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'Split-accounted Artemis lifecycle row',
      ),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-link-network-lifecycle']
        .gap,
    ).toBeUndefined();
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-link-network-lifecycle']
        .evidence,
    ).toContain(
      'unambiguous single-launcher and exact-cardinality same-location Artemis IV/prototype IV/V FCS critical-slot hydration',
    );
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-link-network-lifecycle']
        .evidence,
    ).toMatch(/same-location .*FCS critical damage guidance removal/);
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-link-network-lifecycle']
        .evidence,
    ).toContain('target/flight-path ECM suppression');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-link-network-lifecycle']
        .evidence,
    ).toContain('active-probe ECM countering');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-link-network-lifecycle']
        .evidence,
    ).toContain('active-probe critical replay lifecycle');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-link-network-lifecycle']
        .evidence,
    ).toContain('CEWS as ECM/probe equipment');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-link-network-lifecycle']
        .evidence,
    ).toContain('active attacker-stealth suppression');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-ambiguous-fcs-allocation-authoring'
      ].level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-ambiguous-fcs-allocation-authoring'
      ].evidence,
    ).toContain('whole-catalog non-torpedo audit coverage');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-ambiguous-fcs-allocation-authoring'
      ].gap,
    ).toBeUndefined();
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-active-probe-mode-authoring'
      ].evidence,
    ).toContain(
      'operational lifecycle rather than a separate probe mode surface',
    );
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-active-probe-mode-authoring'
      ].gap,
    ).toBeUndefined();
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-ew-mode-authoring']
        .evidence,
    ).toContain(
      'imports ECM suite currentMode/mode/activeMode/modeName authoring',
    );
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-ew-mode-authoring'].gap,
    ).toBeUndefined();
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-stealth-mode-damage-lifecycle'
      ].evidence,
    ).toContain('own ECM state');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'artemis-stealth-mode-damage-lifecycle'
      ].gap,
    ).toBeUndefined();
  });

  it('pins special weapon family rows to MegaMek source refs', () => {
    const sourceRefsFor = (
      id: keyof typeof SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT,
    ) => SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT[id].sourceRefs ?? [];

    expect(
      Object.values(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT).flatMap((entry) =>
        entry.level !== 'unsupported' && (entry.sourceRefs?.length ?? 0) === 0
          ? [entry.id]
          : [],
      ),
    ).toEqual([]);

    expect(sourceRefsFor('ultra-ac').map(({ citation }) => citation)).toEqual([
      'UACWeapon declares Ultra AC ammo, Single/Ultra firing modes, and the UltraWeaponHandler path.',
      'UltraWeaponHandler derives one or two shots from firing mode, resolves cluster hits, and jams two-shot Ultra fire on a natural 2.',
    ]);
    expect(sourceRefsFor('rotary-ac').map(({ citation }) => citation)).toEqual([
      'RACWeapon declares Rotary AC ammo, Single/2-6 shot modes, explosive-on-jam behavior, and RACHandler versus UltraWeaponHandler routing.',
      'RACHandler maps selected RAC mode to shot count and applies rate-dependent jam thresholds before reducing ammo.',
    ]);
    expect(sourceRefsFor('lb-x-ac').map(({ citation }) => citation)).toEqual([
      'LBXACWeapon routes cluster ammunition to LBXHandler, routes slug fire to ACWeaponHandler, and declares AC_LBX ammo/class metadata.',
      'LBXHandler resolves cluster pellet damage, cluster-table hit counts, and cluster-ammo table usage.',
    ]);
    expect(sourceRefsFor('streak-srm').map(({ citation }) => citation)).toEqual(
      [
        'StreakSRMWeapon declares Streak SRM ammo, removes Artemis compatibility, and routes attacks to StreakHandler.',
        'StreakHandler suppresses hits/AMS on missed locks, resolves rack-size all-hit behavior, and spends ammo/heat only after a successful lock.',
      ],
    );
    expect(sourceRefsFor('mml').map(({ citation }) => citation)).toEqual([
      'MMLWeapon declares MML ammo/class metadata and routes linked LRM-mode ammo to LRM handlers and other MML ammo to SRM handlers.',
      'MMLWeapon exposes indirect-fire modes when the base indirect-fire option is enabled.',
      'AmmoType creates paired MML LRM and SRM ammo entries with MML ammo type and distinct LRM/SRM flags.',
    ]);
    expect(sourceRefsFor('narc').map(({ citation }) => citation)).toEqual(
      expect.arrayContaining([
        'NarcHandler creates a standard NarcPod and attaches it to the hit target location.',
        'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
        'MissileWeaponHandler redirects iNarc Nemesis-confusable missiles to friendly intervening Nemesis pod carriers before returning to the original target on misses.',
      ]),
    );
    expect(sourceRefsFor('tag').map(({ citation }) => citation)).toEqual([
      'TAGHandler creates TagInfo, tags the target entity, and marks the attacker as spotting for indirect fire.',
      'TWPhasePreparationManager clears previous-round TAG info during initiative preparation.',
      'Game.resetTagInfo clears the tagInfoForTurn collection.',
      'ComputeTargetToHitMods cancels positive target-movement modifiers for TAG-guided semi-guided LRM/MML/NLRM/mortar ammunition.',
      'ComputeToHit applies a -1 semi-guided indirect-fire modifier when qualifying missile or mortar ammunition attacks a TAG-designated target.',
    ]);
    expect(sourceRefsFor('artemis').map(({ citation }) => citation)).toEqual(
      expect.arrayContaining([
        'MissileWeaponHandler applies Artemis IV, prototype Artemis IV, and Artemis V cluster modifiers while suppressing ECM and attacker stealth.',
        'LRMHandler skips Artemis cluster modifiers in indirect mode and applies the same Artemis IV, prototype Artemis IV, Artemis V, ECM, and stealth branches for direct LRM fire.',
        'MegaMek MiscType.createISArtemisIV defines Artemis IV FCS with F_ARTEMIS.',
        'MegaMek MiscType.createISProtoArtemis defines Prototype Artemis IV FCS with F_ARTEMIS_PROTO.',
        'MegaMek MiscType.createISArtemisV defines Artemis V FCS with F_ARTEMIS_V.',
        'MiscType defines Watchdog and Nova CEWS with both ECM and BAP flags.',
        'Mek.isStealthActive requires stealth equipment mode On and active ECM support.',
        'MegaMek MissileWeaponHandler applies Artemis IV +2, prototype Artemis IV +1, and Artemis V +3 cluster modifiers while suppressing ECM and stealth',
        'MegaMek LRMHandler skips Artemis cluster modifiers when the weapon mode is Indirect and includes prototype Artemis IV in the same modifier chain',
      ]),
    );
    expect(
      sourceRefsFor('plasma-cannon').map(({ citation }) => citation),
    ).toEqual([
      'CLPlasmaCannon declares variable damage, heat 7, plasma/energy flags, plasma ammunition, and routes attacks to PlasmaCannonHandler.',
      'MegaMek plasma rifle and Clan plasma cannon ammunition rows use AmmoTypeEnum.PLASMA, ten shots per ton, and non-explosive ammo state.',
      'PlasmaCannonHandler applies external target heat on heat-tracking entities, including reflective, heat-dissipating, and PLAYTEST_3 armor-specific adjustments.',
      'MegaMek HeatResolver caps external heat at the configured/default 15 points before adding heat buildup.',
      'PlasmaCannonHandler keeps plasma-cannon BattleMech damage at zero while applying non-Mek/terrain/building special damage paths.',
    ]);

    for (const entry of Object.values(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT)) {
      if (entry.level !== 'unsupported') {
        expectPinnedMegaMekRefs(entry.sourceRefs ?? []);
      }
    }
  });

  it('pins special weapon mechanic rows to row-level MegaMek refs', () => {
    const sourceRefsFor = (
      id: keyof typeof SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT,
    ) => SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[id].sourceRefs ?? [];

    expect(
      Object.values(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT).flatMap((entry) =>
        entry.level !== 'unsupported' && (entry.sourceRefs?.length ?? 0) === 0
          ? [entry.id]
          : [],
      ),
    ).toEqual([]);

    expect(
      sourceRefsFor('uac-rate-of-fire').map(({ citation }) => citation),
    ).toEqual([
      'UACWeapon declares Ultra AC ammo, Single/Ultra firing modes, and the UltraWeaponHandler path.',
      'UltraWeaponHandler derives one or two shots from firing mode, resolves cluster hits, and jams two-shot Ultra fire on a natural 2.',
    ]);
    expect(
      sourceRefsFor('rac-rate-of-fire').map(({ citation }) => citation),
    ).toEqual([
      'RACWeapon declares Rotary AC ammo, Single/2-6 shot modes, explosive-on-jam behavior, and RACHandler versus UltraWeaponHandler routing.',
      'RACHandler maps selected RAC mode to shot count and applies rate-dependent jam thresholds before reducing ammo.',
    ]);
    expect(
      sourceRefsFor('lbx-slug-cluster-modes').map(({ citation }) => citation),
    ).toEqual([
      'LBXACWeapon routes cluster ammunition to LBXHandler, routes slug fire to ACWeaponHandler, and declares AC_LBX ammo/class metadata.',
      'LBXHandler resolves cluster pellet damage, cluster-table hit counts, and cluster-ammo table usage.',
    ]);
    expect(
      sourceRefsFor('streak-lock-no-spend-on-miss').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'StreakSRMWeapon declares Streak SRM ammo, removes Artemis compatibility, and routes attacks to StreakHandler.',
      'StreakHandler suppresses hits/AMS on missed locks, resolves rack-size all-hit behavior, and spends ammo/heat only after a successful lock.',
    ]);
    expect(
      sourceRefsFor('mml-srm-lrm-ammo-compatibility').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MMLWeapon declares MML ammo/class metadata and routes linked LRM-mode ammo to LRM handlers and other MML ammo to SRM handlers.',
      'MMLWeapon exposes indirect-fire modes when the base indirect-fire option is enabled.',
      'AmmoType creates paired MML LRM and SRM ammo entries with MML ammo type and distinct LRM/SRM flags.',
    ]);
    expect(
      sourceRefsFor('narc-cluster-modifier').map(({ citation }) => citation),
    ).toEqual([
      'Entity.isNarcedBy detects attached standard NARC pods from the firing team.',
      'MissileWeaponHandler applies the NARC/iNARC Homing cluster modifier to direct NARC-capable LRM/SRM/MML/NLRM fire when target ECM does not suppress it.',
    ]);
    expect(
      sourceRefsFor('tag-semi-guided-to-hit').map(({ citation }) => citation),
    ).toEqual([
      'ComputeTargetToHitMods cancels positive target-movement modifiers for TAG-guided semi-guided LRM/MML/NLRM/mortar ammunition.',
      'ComputeToHit applies a -1 semi-guided indirect-fire modifier when qualifying missile or mortar ammunition attacks a TAG-designated target.',
    ]);

    for (const entry of Object.values(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT)) {
      if (entry.level !== 'unsupported') {
        expectPinnedMegaMekRefs(entry.sourceRefs ?? []);
      }
    }
  });

  it('pins TAG and NARC marker mechanics to MegaMek handler refs', () => {
    const sourceRefsFor = (
      id: keyof typeof SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT,
    ) => SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[id].sourceRefs ?? [];

    expect(
      sourceRefsFor('narc-marker-attachment').map(({ citation }) => citation),
    ).toEqual([
      'NarcHandler creates a standard NarcPod and attaches it to the hit target location.',
    ]);
    expect(
      sourceRefsFor('inarc-pod-variants').map(({ citation }) => citation),
    ).toEqual([
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
      'INarcPod defines Homing, ECM, Haywire, and Nemesis pod type constants.',
    ]);
    expect(
      sourceRefsFor('inarc-pod-object-lifecycle').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
      'INarcPod defines Homing, ECM, Haywire, and Nemesis pod type constants.',
      'INarcPod equality and target ids treat same-team same-type pods as interchangeable targets while preserving location on the pod object.',
      'Entity attaches pending iNarc pods, exposes attached iNarc pods, and removes targeted iNarc pods.',
    ]);
    expect(
      sourceRefsFor('inarc-pod-target-identity-lifecycle').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
      'INarcPod defines Homing, ECM, Haywire, and Nemesis pod type constants.',
      'INarcPod equality and target ids treat same-team same-type pods as interchangeable targets while preserving location on the pod object.',
      'Entity attaches pending iNarc pods, exposes attached iNarc pods, and removes targeted iNarc pods.',
    ]);
    expect(
      sourceRefsFor('inarc-pod-target-option-deduplication').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
      'INarcPod defines Homing, ECM, Haywire, and Nemesis pod type constants.',
      'INarcPod equality and target ids treat same-team same-type pods as interchangeable targets while preserving location on the pod object.',
      'Entity attaches pending iNarc pods, exposes attached iNarc pods, and removes targeted iNarc pods.',
    ]);
    expect(
      sourceRefsFor('inarc-pod-helper-removal-lifecycle').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
      'INarcPod defines Homing, ECM, Haywire, and Nemesis pod type constants.',
      'INarcPod equality and target ids treat same-team same-type pods as interchangeable targets while preserving location on the pod object.',
      'Entity attaches pending iNarc pods, exposes attached iNarc pods, and removes targeted iNarc pods.',
    ]);
    expect(
      sourceRefsFor('inarc-pod-event-replay-lifecycle').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
      'INarcPod defines Homing, ECM, Haywire, and Nemesis pod type constants.',
    ]);
    expect(
      sourceRefsFor('inarc-ecm-sensor-effects').map(({ citation }) => citation),
    ).toEqual([
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
      'ComputeECM treats an entity with an iNarc ECM pod as ECM-affected at its own position while evaluating the attacker-to-target path.',
      'MissileWeaponHandler suppresses Artemis, prototype Artemis, and Artemis V cluster guidance when the attacker-to-target missile path is ECM affected.',
      'MegaMek sensor range-bracket checks add active sensor ECM modifiers for the detecting unit and target ECM modifiers for the detected entity.',
      'MegaMek Sensor.getModForECM and getModForTargetECM route sensor-check ECM penalties through ComputeECM effects.',
    ]);
    expect(
      sourceRefsFor('inarc-producer-c3-authoring').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
      'ComputeECM treats an entity with an iNarc ECM pod as ECM-affected at its own position while evaluating the attacker-to-target path.',
      'ComputeC3Spotter rejects C3 node paths when ComputeECM reports ECM effects on either leg of the network connection.',
    ]);
    expect(
      sourceRefsFor('inarc-pod-brush-off-removal-lifecycle').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
      'INarcPod defines Homing, ECM, Haywire, and Nemesis pod type constants.',
      'INarcPod equality and target ids treat same-team same-type pods as interchangeable targets while preserving location on the pod object.',
      'Entity attaches pending iNarc pods, exposes attached iNarc pods, and removes targeted iNarc pods.',
      'MekStation runner physical Brush-Off removes the selected same-team same-type iNarc pod, preserving legacy first-pod removal when no selector is present.',
      'MekStation interactive physical declarations and resolutions carry Brush-Off selectedINarcPod state from the context or first attached pod.',
      'MekStation physical attack events persist selectedINarcPod identity on declared and resolved Brush-Off payloads.',
      'MekStation runner tests prove selected Brush-Off declaration and resolution remove the matching iNarc pod while preserving nonmatching pods.',
    ]);
    expect(
      sourceRefsFor('inarc-explosive-ammo-compatibility').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'AmmoType defines iNarc Explosive Pods as INARC explosive ammo with 6 damage and rack size 1.',
      'NarcWeapon routes NARC/iNARC explosive munition attacks through NarcExplosiveHandler instead of the marker-attachment handler.',
      'NarcExplosiveHandler resolves iNarc explosive pod hits as one pod and 6 damage per hit.',
    ]);
    expect(
      sourceRefsFor('inarc-variant-ammo-attachment').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
      'INarcPod defines Homing, ECM, Haywire, and Nemesis pod type constants.',
    ]);
    expect(
      sourceRefsFor('inarc-ecm-attacker-flight-path-suppression').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
      'ComputeECM treats an entity with an iNarc ECM pod as ECM-affected at its own position while evaluating the attacker-to-target path.',
      'MissileWeaponHandler suppresses Artemis, prototype Artemis, and Artemis V cluster guidance when the attacker-to-target missile path is ECM affected.',
    ]);
    expect(
      sourceRefsFor('inarc-ecm-c3-disruption').map(({ citation }) => citation),
    ).toEqual([
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
      'ComputeECM treats an entity with an iNarc ECM pod as ECM-affected at its own position while evaluating the attacker-to-target path.',
      'ComputeC3Spotter rejects C3 node paths when ComputeECM reports ECM effects on either leg of the network connection.',
    ]);
    expect(
      sourceRefsFor('inarc-nemesis-redirect').map(({ citation }) => citation),
    ).toEqual([
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
      'MissileWeaponHandler redirects iNarc Nemesis-confusable missiles to friendly intervening Nemesis pod carriers before returning to the original target on misses.',
      'MissileWeaponHandler scopes iNarc Nemesis confusion to direct ATM, Artemis-linked, NARC-capable, or Listen-Kill LRM/SRM missile attacks.',
      'Game.getNemesisTargets returns friendly entities with iNarc Nemesis pods attached in intervening hexes between attacker and original target.',
    ]);
    expect(
      sourceRefsFor('inarc-homing-to-hit-modifier').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
      'Entity.isINarcedBy returns true only for Homing iNarc pods from the firing team.',
      'ComputeToHit marks NARC-capable LRM/SRM/MML attacks as iNarc-guided when the target carries a Homing iNarc pod and target ECM does not suppress it.',
      'ComputeToHit applies the -1 iNarc Homing to-hit modifier to iNarc-guided missile attacks.',
      'MissileWeaponHandler applies the NARC cluster modifier to direct NARC-capable missiles when the target is NARCed or iNARC Homing-marked and target ECM does not suppress it.',
    ]);
    expect(
      sourceRefsFor('inarc-haywire-to-hit-modifier').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
      'Entity.isINarcedWith checks attached iNarc pod type from any team.',
      'ComputeToHit derives isHaywireINarced from the attacker entity before compiling attacker to-hit modifiers.',
      'ComputeAttackerToHitMods applies the +1 iNarc Haywire attacker to-hit modifier.',
    ]);
    expect(
      sourceRefsFor('tag-designation-hit').map(({ citation }) => citation),
    ).toEqual([
      'TAGHandler creates TagInfo, tags the target entity, and marks the attacker as spotting for indirect fire.',
    ]);
    expect(
      sourceRefsFor('tag-turn-lifecycle-clear').map(({ citation }) => citation),
    ).toEqual([
      'TWPhasePreparationManager clears previous-round TAG info during initiative preparation.',
      'Game.resetTagInfo clears the tagInfoForTurn collection.',
    ]);

    const refs = [
      ...sourceRefsFor('narc-marker-attachment'),
      ...sourceRefsFor('inarc-pod-variants'),
      ...sourceRefsFor('inarc-pod-event-replay-lifecycle'),
      ...sourceRefsFor('inarc-pod-target-identity-lifecycle'),
      ...sourceRefsFor('inarc-pod-target-option-deduplication'),
      ...sourceRefsFor('inarc-variant-ammo-attachment'),
      ...sourceRefsFor('inarc-ecm-attacker-flight-path-suppression'),
      ...sourceRefsFor('inarc-nemesis-redirect'),
      ...sourceRefsFor('inarc-homing-marker-attachment'),
      ...sourceRefsFor('inarc-homing-cluster-modifier'),
      ...sourceRefsFor('inarc-homing-to-hit-modifier'),
      ...sourceRefsFor('inarc-haywire-to-hit-modifier'),
      ...sourceRefsFor('tag-designation-hit'),
      ...sourceRefsFor('tag-turn-lifecycle-clear'),
      ...sourceRefsFor('tag-marker-lifecycle-events'),
      ...sourceRefsFor('narc-marker-lifecycle-events'),
    ];

    expect(
      refs.every(
        (sourceRef) =>
          sourceRef.kind === 'megamek-source' &&
          sourceRef.sourceVersion ===
            '325b2504c7b7750ecdcb85468621fb2de2ad8e60' &&
          sourceRef.url.includes('github.com/MegaMek/megamek/blob/') &&
          sourceRef.url.includes(sourceRef.sourceVersion) &&
          sourceRef.url.includes('#L'),
      ),
    ).toBe(true);
  });

  it('pins AMS helper boundaries and implemented mechanics to MegaMek refs', () => {
    const sourceRefsFor = (
      id: keyof typeof SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT,
    ) => SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[id].sourceRefs ?? [];

    const amsFamilyRefs =
      SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.sourceRefs ?? [];
    const clusterCitations = [
      'MissileWeaponHandler applies assigned AMS counter equipment through getAMSHitsMod, rechecks firing arc and readiness, spends heat/ammo, and applies the standard -4 missile cluster modifier when AMS engages.',
      'MissileWeaponHandler adds AMS modifiers before missile cluster-table resolution and treats all-shots-hit/Streak attacks as cluster roll 11 so AMS can reduce them.',
    ];
    const singleMissileCitations = [
      'NarcHandler rolls one d6 for AMS/APDS interception and destroys the incoming pod on 1-3.',
      'ThunderBoltWeaponHandler rolls one d6 for AMS/APDS interception and destroys the incoming missile on 1-3.',
    ];

    expect(amsFamilyRefs.map(({ citation }) => citation)).toEqual([
      'TWGameManager.assignAMS scopes AMS assignment to missile attacks that hit, then routes target AMS through auto assignment or manual defender choice.',
      'Entity.assignAMS filters active AMS by firing arc, lets AMS bays or multi-use AMS engage all in-arc attacks, and otherwise assigns one AMS to the highest expected damage salvo.',
      ...clusterCitations,
      ...singleMissileCitations,
      'MissileWeaponHandler decrements AMS ammo, adds AMS heat, marks AMS as used, and branches optional multi-use and PLAYTEST_3 AMS lifecycle rules.',
    ]);
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.level).toBe('integrated');
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.gap).toBeUndefined();
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.evidence).toContain(
      'excludes already-fired standard AMS',
    );
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.evidence).toContain(
      'PLAYTEST_3',
    );
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.evidence).toContain(
      'amsMultiUse',
    );
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.evidence).toContain(
      'automatically selects',
    );
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'ams-runner-selected-defender-choice'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('selectedAMSWeaponIds'),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'ams-session-selected-defender-choice'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('selectedAMSWeaponMounts'),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-manual-defender-choice'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('selectedAMSWeaponIds'),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'ams-authored-multi-use-lifecycle'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('already-authored'),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-authored-multi-use-lifecycle']
        .evidence,
    ).toContain('same-phase AMS reuse');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-authored-multi-use-lifecycle']
        .evidence,
    ).toContain(
      'ammo consumption, heat generation, and fired-state accounting',
    );
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-authored-multi-use-lifecycle']
        .gap,
    ).toBeUndefined();
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-bay-authoring'],
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining(
        'does not expose an AMS bay equipment entry',
      ),
      gap: expect.stringContaining(
        'outside the current BattleMech blocker matrix',
      ),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-bay-authoring'].evidence,
    ).toContain('AMS bay-shaped helper metadata');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'ams-optional-multi-use-authoring'
      ],
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining(
        'does not expose a multi-use AMS variant',
      ),
      gap: expect.stringContaining(
        'outside the current BattleMech blocker matrix',
      ),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-optional-multi-use-authoring']
        .evidence,
    ).toContain('ams-authored-multi-use-lifecycle');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-authored-multi-use-lifecycle']
        .evidence,
    ).toContain('same-phase AMS reuse');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-manual-defender-choice'].gap,
    ).toBeUndefined();
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-bay-authoring'].gap,
    ).not.toContain('Manual AMS defender choice');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-optional-multi-use-authoring']
        .gap,
    ).toContain('runtime optionalRules consumption');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-bay-authoring'].gap,
    ).not.toContain('automatic firing-arc assignment');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-bay-authoring'].gap,
    ).not.toContain('assignment/enforcement');
    expect(
      sourceRefsFor('ams-manual-defender-choice').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'TWGameManager.assignAMS scopes AMS assignment to missile attacks that hit, then routes target AMS through auto assignment or manual defender choice.',
      'Entity.assignAMS filters active AMS by firing arc, lets AMS bays or multi-use AMS engage all in-arc attacks, and otherwise assigns one AMS to the highest expected damage salvo.',
    ]);
    expect(
      sourceRefsFor('ams-runner-selected-defender-choice').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'TWGameManager.assignAMS scopes AMS assignment to missile attacks that hit, then routes target AMS through auto assignment or manual defender choice.',
      'Entity.assignAMS filters active AMS by firing arc, lets AMS bays or multi-use AMS engage all in-arc attacks, and otherwise assigns one AMS to the highest expected damage salvo.',
    ]);
    expect(
      sourceRefsFor('ams-session-selected-defender-choice').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'TWGameManager.assignAMS scopes AMS assignment to missile attacks that hit, then routes target AMS through auto assignment or manual defender choice.',
      'Entity.assignAMS filters active AMS by firing arc, lets AMS bays or multi-use AMS engage all in-arc attacks, and otherwise assigns one AMS to the highest expected damage salvo.',
    ]);
    expect(
      sourceRefsFor('ams-bay-authoring').map(({ citation }) => citation),
    ).toEqual([
      'TWGameManager.assignAMS scopes AMS assignment to missile attacks that hit, then routes target AMS through auto assignment or manual defender choice.',
      'Entity.assignAMS filters active AMS by firing arc, lets AMS bays or multi-use AMS engage all in-arc attacks, and otherwise assigns one AMS to the highest expected damage salvo.',
    ]);
    expect(
      sourceRefsFor('ams-optional-multi-use-authoring').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'TWGameManager.assignAMS scopes AMS assignment to missile attacks that hit, then routes target AMS through auto assignment or manual defender choice.',
      'Entity.assignAMS filters active AMS by firing arc, lets AMS bays or multi-use AMS engage all in-arc attacks, and otherwise assigns one AMS to the highest expected damage salvo.',
      'MissileWeaponHandler decrements AMS ammo, adds AMS heat, marks AMS as used, and branches optional multi-use and PLAYTEST_3 AMS lifecycle rules.',
    ]);
    expect(
      sourceRefsFor('ams-authored-multi-use-lifecycle').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'TWGameManager.assignAMS scopes AMS assignment to missile attacks that hit, then routes target AMS through auto assignment or manual defender choice.',
      'Entity.assignAMS filters active AMS by firing arc, lets AMS bays or multi-use AMS engage all in-arc attacks, and otherwise assigns one AMS to the highest expected damage salvo.',
      'MissileWeaponHandler decrements AMS ammo, adds AMS heat, marks AMS as used, and branches optional multi-use and PLAYTEST_3 AMS lifecycle rules.',
    ]);
    expect(
      sourceRefsFor('ams-automatic-interception-assignment').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'TWGameManager.assignAMS scopes AMS assignment to missile attacks that hit, then routes target AMS through auto assignment or manual defender choice.',
      'Entity.assignAMS filters active AMS by firing arc, lets AMS bays or multi-use AMS engage all in-arc attacks, and otherwise assigns one AMS to the highest expected damage salvo.',
    ]);
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'ams-automatic-interception-assignment'
      ].evidence,
    ).toContain('without requiring manual defender choice');
    expect(
      sourceRefsFor('ams-mounted-arc-enforcement').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'TWGameManager.assignAMS scopes AMS assignment to missile attacks that hit, then routes target AMS through auto assignment or manual defender choice.',
      'Entity.assignAMS filters active AMS by firing arc, lets AMS bays or multi-use AMS engage all in-arc attacks, and otherwise assigns one AMS to the highest expected damage salvo.',
    ]);
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-mounted-arc-enforcement']
        .evidence,
    ).toContain('mountingArc');
    expect(
      sourceRefsFor('ams-mounted-arc-hydration').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'TWGameManager.assignAMS scopes AMS assignment to missile attacks that hit, then routes target AMS through auto assignment or manual defender choice.',
      'Entity.assignAMS filters active AMS by firing arc, lets AMS bays or multi-use AMS engage all in-arc attacks, and otherwise assigns one AMS to the highest expected damage salvo.',
    ]);
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-mounted-arc-hydration']
        .evidence,
    ).toContain('isRearMounted');
    expect(
      sourceRefsFor('ams-projectile-reduction').map(({ citation }) => citation),
    ).toEqual(clusterCitations);
    expect(
      sourceRefsFor('ams-streak-cluster-parity').map(
        ({ citation }) => citation,
      ),
    ).toEqual(clusterCitations);
    expect(
      sourceRefsFor('ams-single-missile-parity').map(
        ({ citation }) => citation,
      ),
    ).toEqual(singleMissileCitations);
    expect(
      sourceRefsFor('ams-ammo-consumption').map(({ citation }) => citation),
    ).toEqual([
      'MissileWeaponHandler decrements AMS ammo, adds AMS heat, marks AMS as used, and branches optional multi-use and PLAYTEST_3 AMS lifecycle rules.',
    ]);
    expect(
      sourceRefsFor('ams-interception-events').map(({ citation }) => citation),
    ).toEqual([...clusterCitations, ...singleMissileCitations]);

    const refs = [
      ...amsFamilyRefs,
      ...sourceRefsFor('ams-automatic-interception-assignment'),
      ...sourceRefsFor('ams-authored-multi-use-lifecycle'),
      ...sourceRefsFor('ams-mounted-arc-enforcement'),
      ...sourceRefsFor('ams-mounted-arc-hydration'),
      ...sourceRefsFor('ams-projectile-reduction'),
      ...sourceRefsFor('ams-streak-cluster-parity'),
      ...sourceRefsFor('ams-single-missile-parity'),
      ...sourceRefsFor('ams-ammo-consumption'),
      ...sourceRefsFor('ams-interception-events'),
      ...sourceRefsFor('ams-runner-selected-defender-choice'),
      ...sourceRefsFor('ams-session-selected-defender-choice'),
      ...sourceRefsFor('ams-manual-defender-choice'),
      ...sourceRefsFor('ams-bay-authoring'),
      ...sourceRefsFor('ams-optional-multi-use-authoring'),
    ];

    expect(
      refs.every(
        (sourceRef) =>
          sourceRef.kind === 'megamek-source' &&
          sourceRef.sourceVersion ===
            '325b2504c7b7750ecdcb85468621fb2de2ad8e60' &&
          sourceRef.url.includes('github.com/MegaMek/megamek/blob/') &&
          sourceRef.url.includes(sourceRef.sourceVersion) &&
          sourceRef.url.includes('#L'),
      ),
    ).toBe(true);
  });

  it('keeps AMS authoring-only residuals outside the BattleMech matrix when official catalogs do not expose them', () => {
    const officialEquipmentItems = [
      ...allWeaponCatalogItems,
      ...electronicsItems,
      ...miscellaneousItems,
    ];
    const amsBayCatalogItems = officialEquipmentItems.filter((item) =>
      /\b(?:ams|anti[-\s]?missile)\s*bay\b|amsbay/i.test(itemText(item)),
    );
    const multiUseAMSCatalogItems = officialEquipmentItems.filter((item) =>
      /multi[-\s]?use.*(?:ams|anti[-\s]?missile)|(?:ams|anti[-\s]?missile).*multi[-\s]?use|amsMultiUse/i.test(
        itemText(item),
      ),
    );

    expect(amsBayCatalogItems).toEqual([]);
    expect(multiUseAMSCatalogItems).toEqual([]);
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-bay-authoring'],
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining(
        'does not expose an AMS bay equipment entry',
      ),
      gap: expect.stringContaining(
        'outside the current BattleMech blocker matrix',
      ),
    });
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[
        'ams-optional-multi-use-authoring'
      ],
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining(
        'does not expose a multi-use AMS variant',
      ),
      gap: expect.stringContaining(
        'outside the current BattleMech blocker matrix',
      ),
    });
    expect(getCombatValidationUnresolvedRefs()).not.toContain(
      'featureSupport.specialWeaponMechanics.ams-bay-authoring',
    );
    expect(getCombatValidationUnresolvedRefs()).not.toContain(
      'featureSupport.specialWeaponMechanics.ams-optional-multi-use-authoring',
    );
    expect(getCombatValidationOutOfScopeRefs()).toContain(
      'featureSupport.specialWeaponMechanics.ams-bay-authoring',
    );
    expect(getCombatValidationOutOfScopeRefs()).toContain(
      'featureSupport.specialWeaponMechanics.ams-optional-multi-use-authoring',
    );
    expect(getCombatValidationUnresolvedRefs()).not.toContain(
      'featureSupport.specialWeaponMechanics.inarc-producer-c3-authoring',
    );
    expect(getCombatValidationOutOfScopeRefs()).toContain(
      'featureSupport.specialWeaponMechanics.inarc-producer-c3-authoring',
    );
  });

  it('pins ECM and active-probe hydration to MegaMek equipment refs', () => {
    const sourceRefsFor = (
      id: keyof typeof SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT,
    ) => SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[id].sourceRefs ?? [];

    expect(
      sourceRefsFor('artemis-ecm-suite-hydration').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MiscType defines Guardian, Clan, and Angel ECM suites with ECM flags and ECM modes.',
      'MiscType defines Watchdog and Nova CEWS with both ECM and BAP flags.',
    ]);
    expect(
      sourceRefsFor('active-probe-counter-hydration').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MiscType defines Beagle, Bloodhound, and Clan active probes with BAP flags.',
      'MiscType defines Light Active Probe with a BAP flag.',
      'MiscType defines Watchdog and Nova CEWS with both ECM and BAP flags.',
      'Entity.getBAPRange gives Clan Active Probe, Watchdog, and Nova CEWS a 5-hex BAP range and adds +1 range for Eagle Eyes.',
    ]);
    expect(
      sourceRefsFor('artemis-cews-ecm-probe-lifecycle').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      ...sourceRefsFor('artemis-ecm-suite-hydration').map(
        ({ citation }) => citation,
      ),
      ...sourceRefsFor('active-probe-counter-hydration').map(
        ({ citation }) => citation,
      ),
    ]);

    const refs = [
      ...sourceRefsFor('artemis-ecm-suite-hydration'),
      ...sourceRefsFor('active-probe-counter-hydration'),
      ...sourceRefsFor('artemis-cews-ecm-probe-lifecycle'),
    ];

    expect(
      refs.every(
        (sourceRef) =>
          sourceRef.kind === 'megamek-source' &&
          sourceRef.sourceVersion ===
            '325b2504c7b7750ecdcb85468621fb2de2ad8e60' &&
          sourceRef.url.includes('github.com/MegaMek/megamek/blob/') &&
          sourceRef.url.includes(sourceRef.sourceVersion) &&
          sourceRef.url.includes('#L'),
      ),
    ).toBe(true);
  });

  it('pins Artemis cluster, ECM, and stealth suppression to MegaMek refs', () => {
    const sourceRefsFor = (
      id: keyof typeof SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT,
    ) => SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[id].sourceRefs ?? [];

    expect(
      sourceRefsFor('artemis-cluster-modifier').map(({ citation }) => citation),
    ).toEqual([
      'MissileWeaponHandler applies Artemis IV, prototype Artemis IV, and Artemis V cluster modifiers while suppressing ECM and attacker stealth.',
      'LRMHandler skips Artemis cluster modifiers in indirect mode and applies the same Artemis IV, prototype Artemis IV, Artemis V, ECM, and stealth branches for direct LRM fire.',
    ]);
    expect(
      sourceRefsFor('artemis-fcs-critical-slot-hydration').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MegaMek MiscType.createISArtemisIV defines Artemis IV FCS with F_ARTEMIS.',
      'MegaMek MiscType.createISProtoArtemis defines Prototype Artemis IV FCS with F_ARTEMIS_PROTO.',
      'MegaMek MiscType.createISArtemisV defines Artemis V FCS with F_ARTEMIS_V.',
    ]);
    expect(
      sourceRefsFor('artemis-fcs-critical-lifecycle').map(
        ({ citation }) => citation,
      ),
    ).toEqual(
      sourceRefsFor('artemis-fcs-critical-slot-hydration').map(
        ({ citation }) => citation,
      ),
    );
    expect(
      sourceRefsFor('artemis-explicit-fcs-link-lifecycle').map(
        ({ citation }) => citation,
      ),
    ).toEqual(
      sourceRefsFor('artemis-fcs-critical-slot-hydration').map(
        ({ citation }) => citation,
      ),
    );
    expect(
      sourceRefsFor('artemis-ecm-suppression').map(({ citation }) => citation),
    ).toEqual(
      sourceRefsFor('artemis-cluster-modifier').map(({ citation }) => citation),
    );
    expect(
      sourceRefsFor('artemis-stealth-suppression').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MissileWeaponHandler applies Artemis IV, prototype Artemis IV, and Artemis V cluster modifiers while suppressing ECM and attacker stealth.',
      'LRMHandler skips Artemis cluster modifiers in indirect mode and applies the same Artemis IV, prototype Artemis IV, Artemis V, ECM, and stealth branches for direct LRM fire.',
      'Mek.isStealthActive requires stealth equipment mode On and active ECM support.',
    ]);
    expect(
      sourceRefsFor('plasma-cannon-battlemech-target-heat').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'CLPlasmaCannon declares variable damage, heat 7, plasma/energy flags, plasma ammunition, and routes attacks to PlasmaCannonHandler.',
      'MegaMek plasma rifle and Clan plasma cannon ammunition rows use AmmoTypeEnum.PLASMA, ten shots per ton, and non-explosive ammo state.',
      'PlasmaCannonHandler applies external target heat on heat-tracking entities, including reflective, heat-dissipating, and PLAYTEST_3 armor-specific adjustments.',
      'MegaMek HeatResolver caps external heat at the configured/default 15 points before adding heat buildup.',
    ]);
    expect(
      sourceRefsFor('plasma-cannon-battlemech-target-heat').map(
        ({ citation }) => citation,
      ),
    ).not.toContain(
      'PlasmaCannonHandler keeps plasma-cannon BattleMech damage at zero while applying non-Mek/terrain/building special damage paths.',
    );
    expect(
      sourceRefsFor('plasma-cannon-battlemech-heat-phase-pending-bucket').map(
        ({ citation }) => citation,
      ),
    ).toEqual(
      sourceRefsFor('plasma-cannon-battlemech-target-heat').map(
        ({ citation }) => citation,
      ),
    );

    const refs = [
      ...sourceRefsFor('artemis-cluster-modifier'),
      ...sourceRefsFor('artemis-explicit-fcs-link-lifecycle'),
      ...sourceRefsFor('artemis-fcs-critical-lifecycle'),
      ...sourceRefsFor('artemis-fcs-critical-slot-hydration'),
      ...sourceRefsFor('artemis-ecm-suppression'),
      ...sourceRefsFor('artemis-stealth-suppression'),
      ...sourceRefsFor('plasma-cannon-battlemech-target-heat'),
      ...sourceRefsFor('plasma-cannon-battlemech-heat-phase-pending-bucket'),
    ];

    expect(
      refs.every(
        (sourceRef) =>
          sourceRef.kind === 'megamek-source' &&
          sourceRef.sourceVersion ===
            '325b2504c7b7750ecdcb85468621fb2de2ad8e60' &&
          sourceRef.url.includes('github.com/MegaMek/megamek/blob/') &&
          sourceRef.url.includes(sourceRef.sourceVersion) &&
          sourceRef.url.includes('#L'),
      ),
    ).toBe(true);
  });
});

describe('BattleMech combat feature-gap tracking', () => {
  it('classifies every combat-active SPA and quirk as integrated, helper-only, unsupported, or out-of-scope', () => {
    expect(sortedKeys(SPA_COMBAT_SUPPORT)).toEqual(sortedKeys(SPA_CATALOG));
    expect(sortedKeys(QUIRK_COMBAT_SUPPORT)).toEqual(sortedKeys(QUIRK_CATALOG));

    expect(supportGaps(SPA_COMBAT_SUPPORT)).toEqual([]);
    expect(supportGaps(QUIRK_COMBAT_SUPPORT)).toEqual([]);
    expect(getSPADefinition('forward_observer')).not.toBeNull();
    expect(SPA_CATALOG.forward_observer).toBeDefined();
    expect(SPA_COMBAT_SUPPORT.forward_observer.level).toBe('integrated');
    expect(SPA_CATALOG.sandblaster).toMatchObject({
      combatEffect: expect.stringContaining('+4/+3/+2'),
      requiresDesignation: true,
      designationType: 'weapon_type',
    });
    expect(getSPADefinition('sandblaster')).toMatchObject({
      requiresDesignation: true,
      designationType: 'weapon_type',
    });

    expect(
      Object.values(SPA_COMBAT_SUPPORT).filter(
        (entry) => entry.level === 'unsupported',
      ),
    ).toHaveLength(0);
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.tm_nightwalker).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'represented environmental light state',
      ),
    });
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.tm_nightwalker.evidence,
    ).toContain('prohibits run-derived');
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.tm_nightwalker.evidence,
    ).toContain('airborne LAM');
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.tm_nightwalker.gap,
    ).toBeUndefined();
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.tm_nightwalker.evidence,
    ).toContain('no Nightwalker to-hit modifier is claimed');
    expect(
      supportIdsByLevel(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT, 'unsupported'),
    ).toEqual([]);
    expect(supportIdsByLevel(QUIRK_COMBAT_SUPPORT, 'helper-only')).toEqual([]);
    expect(QUIRK_COMBAT_SUPPORT.distracting).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'accepted MekStation local +1 target to-hit deviation',
      ),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'legacy-defensive-quirk-to-hit-application'
      ],
    ).toMatchObject({
      level: 'out-of-scope',
      gap: expect.stringContaining('deviation-only'),
    });
  });

  it('mirrors the canonical SPA catalog into explicit combat scope support', () => {
    expect(sortedKeys(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT)).toEqual(
      sortedKeys(CANONICAL_SPA_CATALOG),
    );
    expect(supportGaps(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT)).toEqual([]);

    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.forward_observer.level).toBe(
      'integrated',
    );
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.weapon_specialist.level).toBe(
      'integrated',
    );
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.oblique_artillery.level).toBe(
      'out-of-scope',
    );
    expect(
      Object.fromEntries(
        [
          'eagle_eyes',
          'env_specialist',
          'golden_goose',
          'human_tro',
          'oblique_artillery',
          'dermal_armor',
          'vdni',
          'boost_comm_implant',
          'tsm_implant',
          'pl_enhanced',
          'cyber_imp_laser',
          'gas_effuser_toxin',
          'suicide_implants',
          'zweihander',
        ].map((spaId) => {
          const support = CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId];
          return [
            spaId,
            {
              level: support.level,
              evidence: support.evidence,
              gap: support.gap,
              sourceRefCount: support.sourceRefs?.length ?? 0,
            },
          ];
        }),
      ),
    ).toEqual({
      eagle_eyes: {
        level: 'integrated',
        evidence: expect.stringContaining('detonation target-number relief'),
        gap: undefined,
        sourceRefCount: expect.any(Number),
      },
      env_specialist: {
        level: 'integrated',
        evidence: expect.stringContaining('source-backed runtime branches'),
        gap: undefined,
        sourceRefCount: expect.any(Number),
      },
      golden_goose: {
        level: 'out-of-scope',
        evidence: expect.stringContaining('bombing to-hit and scatter'),
        gap: expect.stringContaining('aerospace/bombing validation matrix'),
        sourceRefCount: expect.any(Number),
      },
      human_tro: {
        level: 'out-of-scope',
        evidence: expect.stringContaining('battle armor leg-attack helpers'),
        gap: expect.stringContaining('BattleMech pilot combat SPA hydration'),
        sourceRefCount: expect.any(Number),
      },
      oblique_artillery: {
        level: 'out-of-scope',
        evidence: expect.stringContaining('reduced artillery scatter'),
        gap: expect.stringContaining('artillery/scatter validation matrix'),
        sourceRefCount: expect.any(Number),
      },
      dermal_armor: {
        level: 'integrated',
        evidence: expect.stringContaining('entity fall pilot-damage immunity'),
        gap: undefined,
        sourceRefCount: expect.any(Number),
      },
      vdni: {
        level: 'integrated',
        evidence: expect.stringContaining('NeuralInterfaceStateChanged'),
        gap: undefined,
        sourceRefCount: expect.any(Number),
      },
      boost_comm_implant: {
        level: 'integrated',
        evidence: expect.stringContaining(
          'represented BattleMech C3i network state',
        ),
        gap: undefined,
        sourceRefCount: expect.any(Number),
      },
      tsm_implant: {
        level: 'integrated',
        evidence: expect.stringContaining('entity fall pilot-damage immunity'),
        gap: undefined,
        sourceRefCount: expect.any(Number),
      },
      pl_enhanced: {
        level: 'out-of-scope',
        evidence: expect.stringContaining('personnel equipment'),
        gap: expect.stringContaining('infantry/personnel'),
        sourceRefCount: expect.any(Number),
      },
      cyber_imp_laser: {
        level: 'out-of-scope',
        evidence: expect.stringContaining('personnel equipment'),
        gap: expect.stringContaining('infantry/personnel'),
        sourceRefCount: expect.any(Number),
      },
      gas_effuser_toxin: {
        level: 'out-of-scope',
        evidence: expect.stringContaining('personnel equipment'),
        gap: expect.stringContaining('infantry/personnel'),
        sourceRefCount: expect.any(Number),
      },
      suicide_implants: {
        level: 'out-of-scope',
        evidence: expect.stringContaining('personnel equipment'),
        gap: expect.stringContaining('campaign-capture validation matrix'),
        sourceRefCount: expect.any(Number),
      },
      zweihander: {
        level: 'integrated',
        evidence: expect.stringContaining(
          'every official standalone physical-weapon declaration',
        ),
        gap: undefined,
        sourceRefCount: expect.any(Number),
      },
    });
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.zweihander.evidence).toContain(
      'represented self-critical side effects',
    );
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.zweihander.gap).toBeUndefined();
    for (const spaId of [
      'eagle_eyes',
      'env_specialist',
      'golden_goose',
      'human_tro',
      'oblique_artillery',
      'dermal_armor',
      'vdni',
      'boost_comm_implant',
      'tsm_implant',
      'pl_enhanced',
      'cyber_imp_laser',
      'gas_effuser_toxin',
      'suicide_implants',
      'zweihander',
    ]) {
      const support = CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId];
      if (support.gap !== undefined) {
        expect(support.gap).not.toContain(
          'No combat support entry or resolver consumes this canonical SPA id yet',
        );
      }
      expect(support.sourceRefs?.length ?? 0).toBeGreaterThan(0);
    }
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'eagle-eyes-active-probe-range-application'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'represented active-probe ECM-counter range slice',
      ),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining(
            'adds a +1 active-probe range bonus',
          ),
        }),
      ]),
    });
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.aptitude_gunnery).toMatchObject({
      level: 'out-of-scope',
      gap: expect.stringContaining('ATOW/origin-level'),
    });
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.aptitude_piloting).toMatchObject({
      level: 'out-of-scope',
      gap: expect.stringContaining('ATOW/origin-level'),
    });
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.atow_g_tolerance).toMatchObject({
      level: 'out-of-scope',
      gap: expect.stringContaining('aerospace-control'),
    });
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.foot_cav.level).toBe(
      'out-of-scope',
    );
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.edge_when_headhit).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('hit-location'),
    });
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.edge_when_tac).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('TAC hit-location'),
    });
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.edge_when_ko).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('resolvePilotConsciousnessCheck'),
    });
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.edge_when_explosion,
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('resolveCriticalHits'),
    });
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.edge_when_masc_fails.level).toBe(
      'integrated',
    );
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.edge_when_aero_alt_loss.level,
    ).toBe('out-of-scope');
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.animal_mimic).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('quad Mek PSRs'),
    });
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.sandblaster).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'official ordinary AC rapid-fire modes',
      ),
    });
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.sandblaster.gap).toBeUndefined();
    expect(getCombatValidationUnresolvedRefs()).not.toContain(
      'pilotSkills.pilotModifierResolvers.sandblaster-tacops-rapid-fire-application',
    );
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'dermal-armor-head-hit-pilot-damage-suppression'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('dermal_armor'),
    });
    expect(getCombatValidationUnresolvedRefs()).not.toContain(
      'pilotSkills.pilotModifierResolvers.dermal-armor-head-hit-pilot-damage-suppression',
    );
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'dfa-miss-bioware-pilot-damage-avoidance'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('dermal_armor and tsm_implant'),
    });
    expect(getCombatValidationUnresolvedRefs()).not.toContain(
      'pilotSkills.pilotModifierResolvers.dfa-miss-bioware-pilot-damage-avoidance',
    );
    expect(getCombatValidationUnresolvedRefs()).not.toContain(
      'pilotSkills.pilotModifierResolvers.env-specialist-snow-ranged-to-hit-application',
    );
    expect(getCombatValidationUnresolvedRefs()).not.toContain(
      'pilotSkills.pilotModifierResolvers.env-specialist-wind-ranged-to-hit-application',
    );
    expect(getCombatValidationUnresolvedRefs()).not.toContain(
      'pilotSkills.pilotModifierResolvers.zweihander-punch-physical-application',
    );
    expect(getCombatValidationUnresolvedRefs()).not.toContain(
      'featureSupport.canonicalPilotAbilityScope.dermal_armor',
    );
    expect(getCombatValidationUnresolvedRefs()).not.toContain(
      'featureSupport.canonicalPilotAbilityScope.tsm_implant',
    );
    expect(getCombatValidationUnresolvedRefs()).not.toContain(
      'featureSupport.canonicalPilotAbilityScope.comm_implant',
    );
    expect(getCombatValidationUnresolvedRefs()).not.toContain(
      'featureSupport.canonicalPilotAbilityScope.boost_comm_implant',
    );
    expect(getCombatValidationUnresolvedRefs()).not.toContain(
      'featureSupport.canonicalPilotAbilityScope.proto_dni',
    );
    expect(getCombatValidationOutOfScopeRefs()).not.toEqual(
      expect.arrayContaining([
        'featureSupport.canonicalPilotAbilityScope.boost_comm_implant',
        'featureSupport.canonicalPilotAbilityScope.comm_implant',
        'featureSupport.canonicalPilotAbilityScope.proto_dni',
      ]),
    );
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.cluster_master.level).toBe(
      'out-of-scope',
    );
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.shaky_stick).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('ground-to-air'),
    });
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.artificial_pain_shunt,
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'BattleMech ammunition-explosion pilot damage',
      ),
    });
    const shakyStickRefs =
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.shaky_stick.sourceRefs ?? [];
    const shakyStickCitations = shakyStickRefs.map(({ citation }) => citation);
    expect(shakyStickCitations).toEqual(
      expect.arrayContaining([
        'MegaMek ComputeAbilityMods.processDefenderSPAs applies +1 Shaky Stick when an airborne or airborne VTOL/WIGE target is attacked by a non-airborne attacker.',
        'MegaMek OptionsConstants defines PILOT_SHAKY_STICK as shaky_stick.',
        'MekStation CANONICAL_SPA_LIST aggregates piloting, gunnery, miscellaneous, infantry, ATOW, bioware, unofficial, and Edge SPA tables into the row universe validated by canonicalPilotAbilityScope.',
      ]),
    );
    expect(
      shakyStickRefs.some(
        (sourceRef) =>
          sourceRef.kind === 'megamek-source' &&
          sourceRef.sourceVersion ===
            '325b2504c7b7750ecdcb85468621fb2de2ad8e60' &&
          sourceRef.url.includes('github.com/MegaMek/megamek/blob/') &&
          sourceRef.url.includes(sourceRef.sourceVersion) &&
          sourceRef.url.includes('#L'),
      ),
    ).toBe(true);
  });

  it('pins every canonical SPA scope row to anchored source refs', () => {
    const invalidRefs = Object.entries(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT)
      .flatMap(([id, entry]) => {
        const sourceRefs = entry.sourceRefs ?? [];
        if (sourceRefs.length === 0) return [`${id}: missing sourceRefs`];

        return sourceRefs.flatMap((sourceRef, index) => {
          const refId = `${id}.sourceRefs[${index}]`;
          const failures: string[] = [];

          if (sourceRef.citation.trim().length === 0) {
            failures.push(`${refId}: missing citation`);
          }
          if (!sourceRef.url.includes('#L')) {
            failures.push(`${refId}: missing line anchor`);
          }
          if (sourceRef.sourceVersion.trim().length === 0) {
            failures.push(`${refId}: missing sourceVersion`);
          }
          if (
            sourceRef.kind === 'megamek-source' &&
            (!sourceRef.url.includes('github.com/MegaMek/megamek/blob/') ||
              !sourceRef.url.includes(sourceRef.sourceVersion))
          ) {
            failures.push(`${refId}: MegaMek ref is not commit-pinned`);
          }

          return failures;
        });
      })
      .sort();

    expect(invalidRefs).toEqual([]);
    expect(
      Object.entries(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT)
        .filter(
          ([, entry]) =>
            !(entry.sourceRefs ?? []).some(
              (sourceRef) => sourceRef.kind === 'mekstation-deviation',
            ),
        )
        .map(([id]) => id),
    ).toEqual([]);
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.edge_when_masc_fails.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual(
      expect.arrayContaining([
        'MegaMek TWGameManager consumes EDGE_WHEN_MASC_FAILS to reroll failed MASC checks, spends Edge, and suppresses failure processing when the reroll passes.',
        'MekStation psrEdgeRerolls consumes edge_when_masc_fails to reroll failed MASCFailure and SuperchargerFailure PSRs before applying fall or booster-failure aftermath.',
        'MekStation Edge SPA table defines trigger-specific canonical Edge rows; canonicalPilotAbilityScope marks proven Mek Edge triggers integrated row-by-row, keeps aggregate Edge helper rows separate, and splits Aero Edge triggers out-of-scope.',
      ]),
    );
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.artificial_pain_shunt.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual(
      expect.arrayContaining([
        'MegaMek TWGameManager suppresses BattleMech ammunition-explosion crew hits when the pilot has Artificial Pain Shunt.',
        'MekStation resolveBattleMechAmmoExplosionPilotDamage returns zero for artificial_pain_shunt before applying Pain Resistance, Iron Man, or CASE relief.',
        'MekStation applyAmmoExplosionPilotDamage routes heat-induced and critical-induced ammo explosions through the shared pilot-damage resolver and emits no PilotHit when the resolver returns zero wounds.',
        'MekStation heat event coverage proves artificial_pain_shunt suppresses HeatInduced ammo-explosion PilotHit emission and leaves pilot wounds unchanged.',
        'MekStation bioware SPA table defines Manei Domini neural, comm, dermal, myomer, sensory, prosthetic, gas-effuser, proto-DNI, and suicide-implant rows; canonicalPilotAbilityScope keeps unresolved BattleMech-relevant source-boundary rows as explicit unsupported gaps and splits infantry/personnel-only implant rows out of the BattleMech matrix.',
      ]),
    );
    for (const spaId of ['dermal_armor', 'tsm_implant'] as const) {
      expect(
        CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId].sourceRefs?.map(
          ({ citation }) => citation,
        ),
      ).toEqual(
        expect.arrayContaining([
          'MekStation resolveDfaMissFallPilotDamageAvoidance consumes dermal_armor and tsm_implant pilot ability ids as missed-DFA fall pilot-damage immunity only.',
          'MekStation physical attack helper coverage proves dermal_armor and tsm_implant suppress missed-DFA fall pilot damage without rolling a pilot-damage avoidance check.',
          'MekStation event-sourced physical combat coverage proves a passed missed-DFA fall pilot-damage avoidance emits UnitFell without PilotHit or pilot wounds.',
          'MekStation bioware SPA table defines Manei Domini neural, comm, dermal, myomer, sensory, prosthetic, gas-effuser, proto-DNI, and suicide-implant rows; canonicalPilotAbilityScope keeps unresolved BattleMech-relevant source-boundary rows as explicit unsupported gaps and splits infantry/personnel-only implant rows out of the BattleMech matrix.',
        ]),
      );
    }
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.edge_when_headhit.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual(
      expect.arrayContaining([
        'MegaMek Mek hit-location resolution consumes Edge for TAC and head-hit rerolls when the corresponding trigger option is enabled.',
        'MekStation hit-location resolution selects edge_when_headhit for BattleMech head hits, spends represented Edge, and returns superseded/final location metadata.',
        'MekStation resolveWeaponHit passes target Edge state into hit-location resolution, persists remaining Edge points, and emits Edge reroll metadata on AttackResolved.',
        'MekStation runner weapon-hit tests prove edge_when_headhit replaces a head hit, spends target Edge, preserves the head armor, and damages the replacement location.',
        'MekStation Edge SPA table defines trigger-specific canonical Edge rows; canonicalPilotAbilityScope marks proven Mek Edge triggers integrated row-by-row, keeps aggregate Edge helper rows separate, and splits Aero Edge triggers out-of-scope.',
      ]),
    );
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.edge_when_tac.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual(
      expect.arrayContaining([
        'MegaMek Mek hit-location resolution consumes Edge for TAC and head-hit rerolls when the corresponding trigger option is enabled.',
        'MekStation hit-location resolution selects edge_when_tac for BattleMech natural-2 hit-location rolls, spends represented Edge, and returns superseded/final location metadata.',
        'MekStation resolveWeaponHit emits Edge reroll metadata before critical-hit processing so edge_when_tac can replace the TAC location before damage resolution.',
        'MekStation runner weapon-hit tests prove edge_when_tac replaces a TAC hit-location result before damage, spends target Edge, and damages the replacement location.',
        'MekStation Edge SPA table defines trigger-specific canonical Edge rows; canonicalPilotAbilityScope marks proven Mek Edge triggers integrated row-by-row, keeps aggregate Edge helper rows separate, and splits Aero Edge triggers out-of-scope.',
      ]),
    );
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.edge_when_ko.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual(
      expect.arrayContaining([
        'MegaMek TWGameManager consumes EDGE_WHEN_KO to reroll failed BattleMech crew knockout checks while Edge remains available.',
        'MekStation EDGE_TRIGGERS mirrors the known Edge trigger ids, partitions represented BattleMech triggers from out-of-scope aerospace triggers, deriveEdgePointCountFromPilotAbilities models the generic Edge point producer, and createEdgeState/canUseEdge/useEdge model trigger point consumption.',
        'MekStation Edge SPA table defines trigger-specific canonical Edge rows; canonicalPilotAbilityScope marks proven Mek Edge triggers integrated row-by-row, keeps aggregate Edge helper rows separate, and splits Aero Edge triggers out-of-scope.',
      ]),
    );
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.edge_when_explosion.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual(
      expect.arrayContaining([
        'MegaMek TWGameManager consumes EDGE_WHEN_EXPLOSION to reroll explosive equipment critical slots when another hittable critical slot exists.',
        'MekStation critical-slot selection consumes edge_when_explosion to spend represented Edge and redirect explosive ammo critical-slot hits when another hittable slot exists.',
        'MekStation critical-hit resolution carries remaining Edge points through repeated critical-slot selection and returns the final Edge total to callers.',
        'MekStation critical-hit tests prove edge_when_explosion avoids an ammo critical when another slot is hittable and does not spend Edge without the trigger or alternate slot.',
        'MekStation runner critical-hit event tests prove edge_when_explosion avoids a crit-induced ammo explosion through resolveWeaponHit.',
        'MekStation Edge SPA table defines trigger-specific canonical Edge rows; canonicalPilotAbilityScope marks proven Mek Edge triggers integrated row-by-row, keeps aggregate Edge helper rows separate, and splits Aero Edge triggers out-of-scope.',
      ]),
    );
  });

  it('tracks ejection as UI-visible with lifecycle event and network intent support', () => {
    const ejectCommand = buildUtilityCommands().find(
      (command) => command.id === 'utility.eject',
    );
    const event = createUnitEjectedEvent(
      'catalog-ejection',
      1,
      1,
      GamePhase.Movement,
      'player-1',
      'player_declared',
    );

    expect(ejectCommand?.commit({} as never).actionId).toBe('eject');
    expect(event.type).toBe(GameEventType.UnitEjected);
    expect(event.payload).toMatchObject({
      unitId: 'player-1',
      reason: 'player_declared',
    });
    expect(GAME_INTENT_TYPES).toContain('eject');
    expect(
      isKnownLimitation({
        invariant: 'combat-ejection',
        severity: 'warning',
        message: 'ejection network intent not implemented',
        context: {},
      }),
    ).toBe(false);
  });

  it('tracks official physical catalog entries against runtime attack support', () => {
    expect(sortedKeys(PHYSICAL_WEAPON_COMBAT_SUPPORT)).toEqual(
      ids(physicalWeaponItems),
    );
    expect(supportGaps(PHYSICAL_WEAPON_COMBAT_SUPPORT)).toEqual([]);

    const integrated = Object.values(PHYSICAL_WEAPON_COMBAT_SUPPORT)
      .filter((entry) => entry.level === 'integrated')
      .map((entry) => entry.id)
      .sort();
    const unsupported = Object.values(PHYSICAL_WEAPON_COMBAT_SUPPORT)
      .filter((entry) => entry.level === 'unsupported')
      .map((entry) => entry.id)
      .sort();
    const helperOnly = Object.values(PHYSICAL_WEAPON_COMBAT_SUPPORT)
      .filter((entry) => entry.level === 'helper-only')
      .map((entry) => entry.id)
      .sort();

    expect(integrated).toEqual(ids(physicalWeaponItems));
    expect([...SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES].sort()).toEqual(
      ids(physicalWeaponItems).filter(
        (id) => id !== 'claws' && id !== 'talons',
      ),
    );
    expect(
      Object.values(PHYSICAL_WEAPON_COMBAT_SUPPORT)
        .filter((entry) => entry.level === 'integrated')
        .flatMap((entry) =>
          (entry.sourceRefs?.length ?? 0) === 0 ? [entry.id] : [],
        ),
    ).toEqual([]);
    expect(helperOnly).toEqual([]);
    expect(
      physicalWeaponItems
        .filter((item) => item.id === 'claws' || item.id === 'talons')
        .map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          evidence:
            PHYSICAL_WEAPON_COMBAT_SUPPORT[item.id as 'claws' | 'talons']
              .evidence,
          level:
            PHYSICAL_WEAPON_COMBAT_SUPPORT[item.id as 'claws' | 'talons'].level,
        }))
        .sort((left, right) => String(left.id).localeCompare(String(right.id))),
    ).toEqual([
      {
        id: 'claws',
        name: 'Claws',
        type: 'Claws',
        evidence: expect.stringContaining(
          'not as a standalone runtime PhysicalAttackType',
        ),
        level: 'integrated',
      },
      {
        id: 'talons',
        name: 'Talons',
        type: 'Talons',
        evidence: expect.stringContaining(
          'not as a standalone runtime PhysicalAttackType',
        ),
        level: 'integrated',
      },
    ]);
    expect(unsupported).toEqual([]);
  });

  it('tracks runner range brackets including extreme range support', () => {
    expect(sortedKeys(RUNNER_RANGE_BRACKET_COMBAT_SUPPORT)).toEqual([
      'extreme',
      'long',
      'medium',
      'out_of_range',
      'short',
    ]);
    expect(supportGaps(RUNNER_RANGE_BRACKET_COMBAT_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(RUNNER_RANGE_BRACKET_COMBAT_SUPPORT, 'integrated'),
    ).toEqual(['extreme', 'long', 'medium', 'out_of_range', 'short']);
    expect(
      supportIdsByLevel(RUNNER_RANGE_BRACKET_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([]);
    Object.values(RUNNER_RANGE_BRACKET_COMBAT_SUPPORT).forEach((entry) => {
      expectPinnedMegaMekRefs(entry.sourceRefs ?? []);
    });
    expect(
      RUNNER_RANGE_BRACKET_COMBAT_SUPPORT.short.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MegaMek RangeType.calculateRangeBracket classifies distance as minimum, short, medium, long, extreme, LOS, or out of range from the weapon range array and active optional range rules.',
      'MegaMek Compute.getRangeMods applies attacker short, medium, long, and extreme range modifiers after resolving the active range bracket.',
    ]);
    expect(
      RUNNER_RANGE_BRACKET_COMBAT_SUPPORT.extreme.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MegaMek RangeType.calculateRangeBracket classifies distance as minimum, short, medium, long, extreme, LOS, or out of range from the weapon range array and active optional range rules.',
      'MegaMek Compute.getRangeMods reads the TacOps extreme-range option before classifying attack range.',
      'MegaMek Compute.getRangeMods applies attacker short, medium, long, and extreme range modifiers after resolving the active range bracket.',
    ]);
    expect(
      RUNNER_RANGE_BRACKET_COMBAT_SUPPORT.out_of_range.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MegaMek RangeType.calculateRangeBracket classifies distance as minimum, short, medium, long, extreme, LOS, or out of range from the weapon range array and active optional range rules.',
      'MegaMek Compute.getRangeMods converts out-of-range attacks into automatic failure before normal attack resolution.',
    ]);
  });

  it('tracks runner to-hit modifiers separately from helper-only modifier math', () => {
    expect(supportGaps(RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT, 'integrated'),
    ).toEqual([
      'actuator-damage',
      'attacker-movement',
      'attacker-prone',
      'c3',
      'c3-equipment-conservative-network-seeding',
      'c3-equipment-denial-boundaries',
      'c3-equipment-independent-side-formation',
      'c3-equipment-unambiguous-network-formation',
      'called-shot',
      'ecm',
      'environmental-conditions',
      'gunnery',
      'heat',
      'hull-down',
      'indirect-fire',
      'minimum-range',
      'partial-cover',
      'physical-dfa-piloting-differential',
      'physical-dfa-target-class',
      'pilot-wounds',
      'range',
      'secondary-target',
      'sensor-damage',
      'target-evasion',
      'target-immobile',
      'target-movement',
      'target-prone',
      'terrain-features',
    ]);
    expect(
      supportIdsByLevel(RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([]);
    expect(
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['c3-equipment-network-formation']
        .level,
    ).toBe('out-of-scope');
  });

  it('pins source-backed to-hit modifiers to MegaMek refs', () => {
    const missingSourceRefs = Object.values(
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT,
    )
      .filter(
        (entry) =>
          entry.level !== 'unsupported' &&
          (entry.sourceRefs?.length ?? 0) === 0,
      )
      .map((entry) => entry.id);

    expect(missingSourceRefs).toEqual([]);
    Object.values(RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT).forEach((entry) => {
      if (entry.level !== 'unsupported') {
        expectPinnedMegaMekRefs(entry.sourceRefs ?? []);
      }
    });

    const gunneryRefs =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT.gunnery.sourceRefs ?? [];
    const attackerMovementRefs =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['attacker-movement'].sourceRefs ??
      [];
    const targetMovementRefs =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['target-movement'].sourceRefs ?? [];
    const targetEvasionRefs =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['target-evasion'].sourceRefs ?? [];
    const heatRefs =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT.heat.sourceRefs ?? [];
    const partialCoverRefs =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['partial-cover'].sourceRefs ?? [];
    const pilotWoundsRefs =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['pilot-wounds'].sourceRefs ?? [];
    const ecmRefs = RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT.ecm.sourceRefs ?? [];
    const secondaryTargetRefs =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['secondary-target'].sourceRefs ??
      [];
    const calledShotRefs =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['called-shot'].sourceRefs ?? [];
    const c3Refs = RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT.c3.sourceRefs ?? [];
    const c3EquipmentConservativeNetworkSeedingRefs =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT[
        'c3-equipment-conservative-network-seeding'
      ].sourceRefs ?? [];
    const c3EquipmentUnambiguousNetworkFormationRefs =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT[
        'c3-equipment-unambiguous-network-formation'
      ].sourceRefs ?? [];
    const c3EquipmentDenialBoundaryRefs =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['c3-equipment-denial-boundaries']
        .sourceRefs ?? [];
    const c3EquipmentIndependentSideFormationRefs =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT[
        'c3-equipment-independent-side-formation'
      ].sourceRefs ?? [];
    const c3EquipmentFormationRefs =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['c3-equipment-network-formation']
        .sourceRefs ?? [];
    const hullDownRefs =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['hull-down'].sourceRefs ?? [];
    const physicalDfaTargetClassRefs =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['physical-dfa-target-class']
        .sourceRefs ?? [];
    const physicalDfaPilotingDifferentialRefs =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT[
        'physical-dfa-piloting-differential'
      ].sourceRefs ?? [];
    const minimumRangeRefs =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['minimum-range'].sourceRefs ?? [];

    expect(gunneryRefs.map(({ citation }) => citation)).toEqual([
      expect.stringContaining('starts normal weapon attacks'),
    ]);
    expect(attackerMovementRefs.map(({ citation }) => citation)).toEqual([
      expect.stringContaining("attacker's movement modifier"),
      expect.stringContaining('walk +1, run +2, jump +3'),
    ]);
    expect(targetMovementRefs.map(({ citation }) => citation)).toEqual([
      expect.stringContaining('appends target movement modifiers'),
      expect.stringContaining('standard TMM brackets'),
    ]);
    expect(targetEvasionRefs.map(({ citation }) => citation)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('getEvasionBonus'),
        expect.stringContaining('target evasion bonus'),
      ]),
    );
    expect(
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['target-evasion'].evidence,
    ).toContain('calculatePhysicalToHit');
    expect(heatRefs.map(({ citation }) => citation)).toEqual([
      expect.stringContaining("attacker's heat firing modifier"),
      expect.stringContaining('standard heat firing thresholds'),
    ]);
    expect(partialCoverRefs.map(({ citation }) => citation)).toEqual([
      expect.stringContaining('target partial cover'),
      expect.stringContaining('partial-cover hit-table'),
    ]);
    expect(pilotWoundsRefs.map(({ citation }) => citation)).toEqual([
      expect.stringContaining('crew gunnery skill'),
      expect.stringContaining('unit-class scoped'),
    ]);
    expect(ecmRefs.map(({ citation }) => citation)).toEqual([
      expect.stringContaining('isAffectedByECM'),
      expect.stringContaining('gates Artemis V and NARC/iNARC'),
      expect.stringContaining('targeting-computer'),
      expect.stringContaining('suppress Artemis and NARC-capable'),
    ]);
    expect(secondaryTargetRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Compute.getSecondaryTargetMod applies the secondary-target modifier and reduces it for Multi-Tasker.',
      'MegaMek OptionsConstants defines GUNNERY_MULTI_TASKER as multi_tasker.',
    ]);
    expect(calledShotRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek ComputeAttackerToHitMods applies +3 TacOps called-shot modifiers for high, low, left, and right called shots.',
    ]);
    expect(c3Refs.map(({ citation }) => citation)).toEqual([
      'MegaMek Compute.getRangeMods asks ComputeC3Spotter for a valid spotter and applies the best C3 range bracket when it improves the attack range.',
      'MegaMek ComputeC3Spotter returns the first ECM-connected C3 spotter without LOS gating under default rules, while PLAYTEST_3 adds spotter LOS gating.',
      'MegaMek ComputeC3Spotter rejects shutdown/off-board C3 attackers and shutdown/off-board/transported C3 spotters before range sharing.',
      'MegaMek Entity.hasC3M, hasC3S, and hasC3i require mounted C3 equipment to be non-inoperable before C3 can be used.',
    ]);
    expect(
      c3EquipmentConservativeNetworkSeedingRefs.map(({ citation }) => citation),
    ).toEqual([
      'MegaMek Compute.getRangeMods asks ComputeC3Spotter for a valid spotter and applies the best C3 range bracket when it improves the attack range.',
      'MegaMek ComputeC3Spotter returns the first ECM-connected C3 spotter without LOS gating under default rules, while PLAYTEST_3 adds spotter LOS gating.',
      'MegaMek ComputeC3Spotter rejects shutdown/off-board C3 attackers and shutdown/off-board/transported C3 spotters before range sharing.',
      'MegaMek Entity.hasC3M, hasC3S, and hasC3i require mounted C3 equipment to be non-inoperable before C3 can be used.',
      'MegaMek Entity.hasC3M detects C3 master and boosted master weapon flags while Entity.hasC3S detects C3 slave and boosted slave misc flags.',
      'MegaMek Entity.hasC3i detects non-inoperable misc equipment carrying the C3i flag.',
      'MegaMek C3 Master weapon defines standard master lookup names and the C3 master flag.',
      'MegaMek boosted C3 Master weapon defines boosted master lookup names and the boosted C3 master flag.',
      'MegaMek MiscType creates C3 Slave, C3i, Boosted Slave, and Battle Armor C3 variants with distinct Mek versus BA equipment flags.',
    ]);
    expect(
      c3EquipmentUnambiguousNetworkFormationRefs.map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MegaMek Compute.getRangeMods asks ComputeC3Spotter for a valid spotter and applies the best C3 range bracket when it improves the attack range.',
      'MegaMek ComputeC3Spotter returns the first ECM-connected C3 spotter without LOS gating under default rules, while PLAYTEST_3 adds spotter LOS gating.',
      'MegaMek ComputeC3Spotter rejects shutdown/off-board C3 attackers and shutdown/off-board/transported C3 spotters before range sharing.',
      'MegaMek Entity.hasC3M, hasC3S, and hasC3i require mounted C3 equipment to be non-inoperable before C3 can be used.',
      'MegaMek Entity.hasC3M detects C3 master and boosted master weapon flags while Entity.hasC3S detects C3 slave and boosted slave misc flags.',
      'MegaMek Entity.hasC3i detects non-inoperable misc equipment carrying the C3i flag.',
      'MegaMek C3 Master weapon defines standard master lookup names and the C3 master flag.',
      'MegaMek boosted C3 Master weapon defines boosted master lookup names and the boosted C3 master flag.',
      'MegaMek MiscType creates C3 Slave, C3i, Boosted Slave, and Battle Armor C3 variants with distinct Mek versus BA equipment flags.',
    ]);
    expect(
      c3EquipmentDenialBoundaryRefs.map(({ citation }) => citation),
    ).toEqual([
      'MegaMek Compute.getRangeMods asks ComputeC3Spotter for a valid spotter and applies the best C3 range bracket when it improves the attack range.',
      'MegaMek ComputeC3Spotter returns the first ECM-connected C3 spotter without LOS gating under default rules, while PLAYTEST_3 adds spotter LOS gating.',
      'MegaMek ComputeC3Spotter rejects shutdown/off-board C3 attackers and shutdown/off-board/transported C3 spotters before range sharing.',
      'MegaMek Entity.hasC3M, hasC3S, and hasC3i require mounted C3 equipment to be non-inoperable before C3 can be used.',
      'MegaMek Entity.hasC3M detects C3 master and boosted master weapon flags while Entity.hasC3S detects C3 slave and boosted slave misc flags.',
      'MegaMek Entity.hasC3i detects non-inoperable misc equipment carrying the C3i flag.',
      'MegaMek C3 Master weapon defines standard master lookup names and the C3 master flag.',
      'MegaMek boosted C3 Master weapon defines boosted master lookup names and the boosted C3 master flag.',
      'MegaMek MiscType creates C3 Slave, C3i, Boosted Slave, and Battle Armor C3 variants with distinct Mek versus BA equipment flags.',
    ]);
    expect(
      c3EquipmentIndependentSideFormationRefs.map(({ citation }) => citation),
    ).toEqual([
      'MegaMek Compute.getRangeMods asks ComputeC3Spotter for a valid spotter and applies the best C3 range bracket when it improves the attack range.',
      'MegaMek ComputeC3Spotter returns the first ECM-connected C3 spotter without LOS gating under default rules, while PLAYTEST_3 adds spotter LOS gating.',
      'MegaMek ComputeC3Spotter rejects shutdown/off-board C3 attackers and shutdown/off-board/transported C3 spotters before range sharing.',
      'MegaMek Entity.hasC3M, hasC3S, and hasC3i require mounted C3 equipment to be non-inoperable before C3 can be used.',
      'MegaMek Entity.hasC3M detects C3 master and boosted master weapon flags while Entity.hasC3S detects C3 slave and boosted slave misc flags.',
      'MegaMek Entity.hasC3i detects non-inoperable misc equipment carrying the C3i flag.',
      'MegaMek C3 Master weapon defines standard master lookup names and the C3 master flag.',
      'MegaMek boosted C3 Master weapon defines boosted master lookup names and the boosted C3 master flag.',
      'MegaMek MiscType creates C3 Slave, C3i, Boosted Slave, and Battle Armor C3 variants with distinct Mek versus BA equipment flags.',
    ]);
    expect(c3EquipmentFormationRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Compute.getRangeMods asks ComputeC3Spotter for a valid spotter and applies the best C3 range bracket when it improves the attack range.',
      'MegaMek ComputeC3Spotter returns the first ECM-connected C3 spotter without LOS gating under default rules, while PLAYTEST_3 adds spotter LOS gating.',
      'MegaMek ComputeC3Spotter rejects shutdown/off-board C3 attackers and shutdown/off-board/transported C3 spotters before range sharing.',
      'MegaMek Entity.hasC3M, hasC3S, and hasC3i require mounted C3 equipment to be non-inoperable before C3 can be used.',
      'MegaMek Entity.hasC3M detects C3 master and boosted master weapon flags while Entity.hasC3S detects C3 slave and boosted slave misc flags.',
      'MegaMek Entity.hasC3i detects non-inoperable misc equipment carrying the C3i flag.',
      'MegaMek C3 Master weapon defines standard master lookup names and the C3 master flag.',
      'MegaMek boosted C3 Master weapon defines boosted master lookup names and the boosted C3 master flag.',
      'MegaMek MiscType creates C3 Slave, C3i, Boosted Slave, and Battle Armor C3 variants with distinct Mek versus BA equipment flags.',
    ]);
    expect(hullDownRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek ComputeTerrainMods applies WeaponAttackAction.HullDown as a +2 terrain modifier for hull-down Mek targets with LOS cover.',
    ]);
    expect(physicalDfaTargetClassRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek DfaAttackAction.toHit applies +3 for Infantry targets and +1 for Battle Armor targets.',
    ]);
    expect(
      physicalDfaPilotingDifferentialRefs.map(({ citation }) => citation),
    ).toEqual([
      'MegaMek DfaAttackAction.toHit applies attacker piloting minus target piloting as the piloting skill differential.',
    ]);
    expect(minimumRangeRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek RangeType.calculateRangeBracket classifies distance as minimum, short, medium, long, extreme, LOS, or out of range from the weapon range array and active optional range rules.',
      'MegaMek Compute.getRangeMods adds the ground-to-ground minimum range penalty as minRange - distance + 1.',
    ]);
  });

  it('tracks physical damage modifiers separately from helper-only environment inputs', () => {
    expect(supportGaps(PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT, 'integrated'),
    ).toEqual([
      'claw-physical-critical-production',
      'claw-represented-equipment-cleanup',
      'claw-source-mount-missing-breached-cleanup',
      'claws',
      'talon-physical-critical-production',
      'talon-represented-equipment-cleanup',
      'talon-source-mount-missing-breached-cleanup',
      'talons',
      'tsm',
      'underwater',
    ]);
    expect(
      supportIdsByLevel(PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([]);
    expect(
      supportIdsByLevel(
        PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT,
        'out-of-scope',
      ),
    ).toEqual(['claw-equipment-lifecycle', 'talon-equipment-lifecycle']);
    expect(
      PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT['claw-equipment-lifecycle'],
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining(
        'Represented runtime claw lifecycle paths are covered',
      ),
      gap: expect.stringContaining(
        'must not be used as evidence that broad automatic lifecycle producer behavior is integrated',
      ),
    });
    expect(
      PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT['talon-equipment-lifecycle'],
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining(
        'Represented runtime talon lifecycle paths are covered',
      ),
      gap: expect.stringContaining(
        'must not be used as evidence that broad automatic lifecycle producer behavior is integrated',
      ),
    });
  });

  it('pins physical damage modifier rows to MegaMek source refs', () => {
    Object.values(PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT).forEach((entry) => {
      expectPinnedMegaMekRefs(
        (entry.sourceRefs ?? []).filter(
          (sourceRef) => sourceRef.kind === 'megamek-source',
        ),
      );
    });

    expect(
      PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT.tsm.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MegaMek KickAttackAction.getDamageFor doubles kick damage with active TSM before talon, melee-specialist, underwater, and infantry adjustments.',
      'MegaMek PunchAttackAction.getDamageFor doubles punch damage with active TSM before melee-specialist, underwater, and infantry adjustments.',
      'MegaMek ClubAttackAction.getDamageFor doubles active-TSM club damage while explicitly excluding saws, pile drivers, shields, wrecking balls, flails, active vibroblades, and other fixed-damage tools.',
    ]);

    expect(
      PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT.claws.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MegaMek PunchAttackAction.getDamageFor uses ceil(weight / 7) when the punching arm has working claws',
      'MegaMek PunchAttackAction.toHit adds the claw punch modifier outside PLAYTEST_3, records a zero-value Using Claws modifier under PLAYTEST_3, and suppresses hand actuator missing/destroyed penalties when claws replace the hand',
      'MegaMek Entity.destroyLocation marks blown-off critical slots, mounted equipment, and dependent locations missing',
    ]);

    expect(
      PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT.talons.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MegaMek KickAttackAction.getDamageFor applies a 1.5 talon multiplier when the kicking leg has working talons and a working foot actuator, mapping quad front kicks to arm locations',
      'MegaMek DfaAttackAction.getDamageFor and hasTalons apply 1.5 DFA damage when a qualifying talon leg has a working foot actuator',
      'MegaMek DfaAttackAction.hasTalons checks working talons and working foot actuators on qualifying biped legs plus non-biped leg and arm locations.',
      'MegaMek Entity.destroyLocation marks blown-off critical slots, mounted equipment, and dependent locations missing',
    ]);

    expect(
      PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT.underwater.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MegaMek KickAttackAction.getDamageFor halves wet-location kick damage and rounds up.',
      'MegaMek PunchAttackAction.getDamageFor halves wet-location punch damage and rounds up.',
      'MegaMek ClubAttackAction.getDamageFor halves wet-location club damage after resolving the mounted club location.',
    ]);
  });

  it('tracks movement action rules and terrain/environment rule gaps', () => {
    expect(supportGaps(MOVEMENT_RULE_COMBAT_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(MOVEMENT_RULE_COMBAT_SUPPORT, 'integrated'),
    ).toEqual([
      'elevation',
      'facing',
      'go-prone-battlemech-swarmer-dislodgement',
      'go-prone-enemy-occupied-start-follow-up-block',
      'go-prone-hull-down-zero-mp-transition',
      'go-prone-side-paths',
      'heat-mp-penalty',
      'jump',
      'occupancy',
      'prone',
      'run',
      'stand',
      'torso-twist',
      'walk',
    ]);
    expect(
      supportIdsByLevel(MOVEMENT_RULE_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([]);
    expect(
      MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-battlemech-swarmer-dislodgement'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'emits replayable SwarmDismounted events',
      ),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('go_prone_dislodgement'),
        }),
        expect.objectContaining({
          citation: expect.stringContaining('clearGoProneSwarmers'),
        }),
        expect.objectContaining({
          citation: expect.stringContaining('applySwarmDismounted'),
        }),
      ]),
    });
    expect(
      MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-hull-down-zero-mp-transition'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('clears hull-down posture'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('GoProneStep'),
        }),
        expect.objectContaining({
          citation: expect.stringContaining('getGoProneMpCost'),
        }),
        expect.objectContaining({
          citation: expect.stringContaining('applyMovementEvent'),
        }),
      ]),
    });
    expect(
      MOVEMENT_RULE_COMBAT_SUPPORT[
        'go-prone-enemy-occupied-start-follow-up-block'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'same-hex GO_PRONE posture remains legal',
      ),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining(
            'restricting follow-up moves after leaving and returning',
          ),
        }),
        expect.objectContaining({
          citation: expect.stringContaining('validateMovement rejects'),
        }),
        expect.objectContaining({
          citation: expect.stringContaining(
            'deriveMovementRangeHexForDestination',
          ),
        }),
      ]),
    });
    expect(
      MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-side-paths'].evidence,
    ).toContain('represented BattleMech swarmer dislodgement is integrated');
    expect(
      MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-side-paths'].evidence,
    ).toContain('hull-down zero-MP posture transition is integrated');
    expect(
      MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-side-paths'].evidence,
    ).toContain('go-prone-enemy-occupied-start-follow-up-block');
    expect(
      MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-side-paths'].evidence,
    ).toContain('infernoBurning state');
    expect(
      MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-side-paths'].gap,
    ).toBeUndefined();
    for (const sourcePath of ['src/types/gameplay/GameSessionStateTypes.ts']) {
      const stateText = readFileSync(join(process.cwd(), sourcePath), 'utf8');
      expect(stateText).toMatch(/\binfernoBurning\b/);
    }
    expect(
      MOVEMENT_RULE_COMBAT_SUPPORT['torso-twist'].sourceRefs?.map(
        (sourceRef) => sourceRef.citation,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('TorsoTwistAction'),
        expect.stringContaining('Entity.setSecondaryFacing'),
        expect.stringContaining('Mek.canChangeSecondaryFacing'),
        expect.stringContaining('Mek.isValidSecondaryFacing'),
        expect.stringContaining('ComputeArc'),
      ]),
    );
    expect(MOVEMENT_RULE_COMBAT_SUPPORT['torso-twist'].gap).toBeUndefined();
    expect(
      Object.values(MOVEMENT_RULE_COMBAT_SUPPORT)
        .filter((entry) => entry.level !== 'unsupported')
        .flatMap((entry) =>
          (entry.sourceRefs?.length ?? 0) === 0 ? [entry.id] : [],
        ),
    ).toEqual([]);
    Object.values(MOVEMENT_RULE_COMBAT_SUPPORT).forEach((entry) => {
      if (entry.level !== 'unsupported') {
        expectPinnedMegaMekRefs(
          (entry.sourceRefs ?? []).filter(
            (sourceRef) => sourceRef.kind === 'megamek-source',
          ),
        );
      }
    });
    expect(
      MOVEMENT_RULE_COMBAT_SUPPORT.walk.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MegaMek Entity.getWalkMP returns walking MP after heat, cargo, weather, and gravity adjustments.',
    ]);
    expect(
      MOVEMENT_RULE_COMBAT_SUPPORT.run.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MegaMek Entity.getRunMP derives standard run MP as ceil(adjusted walk MP * 1.5).',
      'MegaMek Mek.getRunMP delegates to armed MASC/Supercharger boosters when active, otherwise using the standard adjusted run MP.',
    ]);
    expect(
      MOVEMENT_RULE_COMBAT_SUPPORT.prone.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MegaMek MovePath allows GO_PRONE while restricting follow-up moves after leaving and returning to an enemy-occupied start hex.',
      'MegaMek GoProneStep assigns 1 MP when the entity is not hull-down, leaving hull-down go-prone as a zero-MP transition.',
      'MegaMek MoveStep marks GO_PRONE illegal for already-prone units, non-Meks, or stuck entities.',
      'MegaMek MoveStep updates GO_PRONE posture by setting prone state and clearing hull-down state.',
      'MegaMek MovePathHandler resolves GO_PRONE by setting the entity prone, with swarmer dislodge and inferno wash-off side paths.',
    ]);

    const movementEnhancementDefinitionTypes =
      MOVEMENT_ENHANCEMENT_DEFINITIONS.map(({ type }) => type).sort();
    expect(sortedKeys(MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT)).toEqual(
      [
        ...movementEnhancementDefinitionTypes,
        'masc-battlemech-represented-side-paths',
        'masc-side-paths',
        'supercharger-battlemech-represented-side-paths',
        'supercharger-non-battlemech-side-paths',
        'supercharger-side-paths',
      ].sort(),
    );
    expect(supportGaps(MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT, 'integrated'),
    ).toEqual(
      [
        MovementEnhancementType.MASC,
        MovementEnhancementType.PARTIAL_WING,
        MovementEnhancementType.SUPERCHARGER,
        MovementEnhancementType.TSM,
        'masc-battlemech-represented-side-paths',
        'masc-side-paths',
        'supercharger-battlemech-represented-side-paths',
        'supercharger-side-paths',
      ].sort(),
    );
    expect(
      supportIdsByLevel(MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([]);
    expect(
      supportIdsByLevel(MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT, 'out-of-scope'),
    ).toEqual(['supercharger-non-battlemech-side-paths']);
    expect(
      MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT[
        'supercharger-non-battlemech-side-paths'
      ],
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining('Tank, SupportTank, SupportVTOL'),
      gap: expect.stringContaining('outside this BattleMech suite'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('SupportTank'),
          kind: 'megamek-source',
        }),
        expect.objectContaining({
          citation: expect.stringContaining('non-Mek Supercharger failure'),
          kind: 'megamek-source',
        }),
      ]),
    });

    expect(TERRAIN_TYPE_MOVEMENT_COVERAGE).toHaveLength(20);
    expect(TERRAIN_TYPE_MOVEMENT_COVERAGE).toContain('mines');
    expect(supportGaps(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT, 'integrated'),
    ).toEqual([
      'atmosphere',
      'dust',
      'extreme-temperature',
      'fire-heat',
      'fog',
      'minefield-active-non-ground-triggers',
      'minefield-campaign-placement-authoring',
      'minefield-clearing-sweeper-collateral-reset',
      'minefield-emp-effects',
      'minefield-hidden-reveal-detection',
      'minefield-inferno-residual-controls',
      'minefield-non-conventional-type-semantics',
      'minefield-represented-active-ground-suppression',
      'minefield-represented-command-detonation',
      'minefield-represented-conventional-detonated-state',
      'minefield-represented-coordinate-state-entry-damage',
      'minefield-represented-coordinate-state-lifecycle',
      'minefield-represented-density-reduction',
      'minefield-represented-density-trigger-target',
      'minefield-represented-encoded-damage-levels',
      'minefield-represented-entry-side-paths',
      'minefield-represented-inferno-entry-heat',
      'minefield-represented-manual-conventional-detonation',
      'minefield-represented-movement-detonation-event',
      'minefield-represented-non-conventional-type-guard',
      'minefield-represented-vibrabomb-effects',
      'minefield-variant-side-paths',
      'mines',
      'night',
      'smoke-to-hit',
      'terrain-los-blocking',
      'terrain-los-building-height-blocking',
      'terrain-los-damageable-cover-hit-resolution-routing',
      'terrain-los-divided-elevation-blocking',
      'terrain-los-divided-side-path-blocking',
      'terrain-los-fuel-tank-damageable-cover-providers',
      'terrain-los-fuel-tank-elevation',
      'terrain-los-grounded-dropship-cover-providers',
      'terrain-los-hard-soft-building-cover-providers',
      'terrain-los-intervening-elevation-blocking',
      'terrain-los-same-building-hex-blocking',
      'terrain-los-same-building-level-count',
      'terrain-los-side-paths',
      'terrain-los-tacops-diagram-combat-caller-option-propagation',
      'terrain-los-tacops-diagram-industrial-zone-side-paths',
      'terrain-los-tacops-diagram-planted-field-side-paths',
      'terrain-los-tacops-diagram-represented-pure-elevation',
      'terrain-los-tacops-diagram-represented-terrain-effects',
      'terrain-los-underwater-clear-hex-blocking',
      'terrain-los-underwater-depth-height-side-paths',
      'terrain-los-water-endpoint-blocking',
      'terrain-movement-costs',
      'terrain-partial-cover',
      'terrain-to-hit-features',
      'water-cooling',
      'water-ground-disallow',
      'wind',
    ]);
    expect(
      supportIdsByLevel(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([]);
    expect(
      supportIdsByLevel(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT, 'unsupported'),
    ).toEqual(
      [
        ...MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS,
        ...TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS,
      ].sort(),
    );
    expect(
      supportIdsByLevel(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT, 'out-of-scope'),
    ).toEqual(['minefield-non-battlemech-sea-variants']);
    expect(
      Object.values(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT)
        .filter((entry) => entry.level !== 'unsupported')
        .flatMap((entry) =>
          (entry.sourceRefs?.length ?? 0) === 0 ? [entry.id] : [],
        ),
    ).toEqual([]);
    Object.values(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT).forEach((entry) => {
      if (entry.level === 'unsupported') return;

      const sourceRefs = entry.sourceRefs ?? [];
      const megaMekRefs = sourceRefs.filter(
        (sourceRef) => sourceRef.kind === 'megamek-source',
      );
      if (megaMekRefs.length > 0) {
        expectPinnedMegaMekRefs(megaMekRefs);
      }
      expect(
        sourceRefs.every(
          (sourceRef) =>
            sourceRef.kind === 'megamek-source' ||
            (sourceRef.kind === 'mekstation-deviation' &&
              sourceRef.sourceVersion === 'MekStation working-tree' &&
              sourceRef.url.includes('#L')),
        ),
      ).toBe(true);
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'terrain-movement-costs'
      ].sourceRefs?.map(({ citation }) => citation),
    ).toEqual([
      expect.stringContaining('Terrains enumerates core terrain ids'),
      expect.stringContaining('Terrain.movementCost maps additional movement'),
    ]);
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'water-ground-disallow'
      ].sourceRefs?.map(({ kind, citation }) => `${kind}:${citation}`),
    ).toEqual([
      expect.stringContaining(
        'mekstation-deviation:MekStation getHexMovementCost',
      ),
    ]);
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.atmosphere.sourceRefs?.map(
        ({ kind }) => kind,
      ),
    ).toEqual(['mekstation-deviation']);
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.dust.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('blowing sand'),
        expect.stringContaining('IEnvironmentalConditions'),
        expect.stringContaining('energy'),
      ]),
    );
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.mines.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('TerrainType enum carries Mines'),
        expect.stringContaining('apply represented TerrainType.Mines'),
      ]),
    );
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-variant-side-paths'
      ].sourceRefs?.map(({ citation }) => citation),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Minefield represents minefield state'),
        expect.stringContaining('enterMinefield resolves minefield'),
        expect.stringContaining('MINEFIELD is scenario-generation modifier'),
        expect.stringContaining('TerrainType enum carries Mines'),
      ]),
    );
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-non-battlemech-sea-variants'
      ],
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining('sea/depth state'),
      gap: expect.stringContaining('outside this BattleMech suite'),
    });
  });

  it('tracks runner heat rules and separates session/helper-only heat mechanics', () => {
    expect(supportGaps(HEAT_RULE_COMBAT_SUPPORT)).toEqual([]);
    expect(supportIdsByLevel(HEAT_RULE_COMBAT_SUPPORT, 'integrated')).toEqual([
      'ammo-explosion-risk',
      'auto-shutdown',
      'dissipation',
      'engine-heat',
      'environmental-heat',
      'fire-heat',
      'heat-induced-ammo-explosion',
      'heat-sink-damage',
      'jump-distance-heat',
      'maxtech-heat-critical-damage',
      'maxtech-pilot-heat-damage',
      'movement-heat',
      'pilot-heat-damage',
      'shutdown-check',
      'startup',
      'threshold-effects',
      'water-cooling',
      'weapon-heat',
    ]);
    expect(supportIdsByLevel(HEAT_RULE_COMBAT_SUPPORT, 'helper-only')).toEqual(
      [],
    );

    Object.values(HEAT_RULE_COMBAT_SUPPORT).forEach((entry) => {
      const sourceRefs = entry.sourceRefs ?? [];
      if (entry.id === 'environmental-heat') {
        expectPinnedMegaMekRefs(
          sourceRefs.filter((sourceRef) => sourceRef.kind === 'megamek-source'),
        );
        expect(
          sourceRefs.some(
            (sourceRef) => sourceRef.kind === 'mekstation-deviation',
          ),
        ).toBe(true);
        return;
      }

      expectPinnedMegaMekRefs(sourceRefs);
    });

    const weaponHeatRefs =
      HEAT_RULE_COMBAT_SUPPORT['weapon-heat'].sourceRefs ?? [];
    const movementHeatRefs =
      HEAT_RULE_COMBAT_SUPPORT['movement-heat'].sourceRefs ?? [];
    const jumpHeatRefs =
      HEAT_RULE_COMBAT_SUPPORT['jump-distance-heat'].sourceRefs ?? [];
    const engineHeatRefs =
      HEAT_RULE_COMBAT_SUPPORT['engine-heat'].sourceRefs ?? [];
    const dissipationRefs =
      HEAT_RULE_COMBAT_SUPPORT.dissipation.sourceRefs ?? [];
    const heatSinkDamageRefs =
      HEAT_RULE_COMBAT_SUPPORT['heat-sink-damage'].sourceRefs ?? [];
    const thresholdEffectRefs =
      HEAT_RULE_COMBAT_SUPPORT['threshold-effects'].sourceRefs ?? [];
    const heatAmmoExplosionRefs =
      HEAT_RULE_COMBAT_SUPPORT['heat-induced-ammo-explosion'].sourceRefs ?? [];
    const heatStartupRefs = HEAT_RULE_COMBAT_SUPPORT.startup.sourceRefs ?? [];
    const heatShutdownRefs =
      HEAT_RULE_COMBAT_SUPPORT['shutdown-check'].sourceRefs ?? [];
    const autoShutdownRefs =
      HEAT_RULE_COMBAT_SUPPORT['auto-shutdown'].sourceRefs ?? [];
    const heatRiskRefs =
      HEAT_RULE_COMBAT_SUPPORT['ammo-explosion-risk'].sourceRefs ?? [];
    const pilotHeatRefs =
      HEAT_RULE_COMBAT_SUPPORT['pilot-heat-damage'].sourceRefs ?? [];
    const maxTechPilotHeatRefs =
      HEAT_RULE_COMBAT_SUPPORT['maxtech-pilot-heat-damage'].sourceRefs ?? [];
    const maxTechCriticalHeatRefs =
      HEAT_RULE_COMBAT_SUPPORT['maxtech-heat-critical-damage'].sourceRefs ?? [];
    const waterCoolingRefs =
      HEAT_RULE_COMBAT_SUPPORT['water-cooling'].sourceRefs ?? [];
    const fireHeatRefs = HEAT_RULE_COMBAT_SUPPORT['fire-heat'].sourceRefs ?? [];
    const environmentalHeatRefs =
      HEAT_RULE_COMBAT_SUPPORT['environmental-heat'].sourceRefs ?? [];

    expect(weaponHeatRefs.map((sourceRef) => sourceRef.citation)).toEqual([
      expect.stringContaining('WeaponHandler.addHeat'),
    ]);
    expect(movementHeatRefs.map((sourceRef) => sourceRef.citation)).toEqual([
      expect.stringContaining('addMovementHeat adds heat'),
      expect.stringContaining('getStandingHeat and getWalkHeat'),
      expect.stringContaining('getRunHeat and getSprintHeat'),
      expect.stringContaining('Engine.getRunHeat and getSprintHeat'),
    ]);
    expect(jumpHeatRefs.map((sourceRef) => sourceRef.citation)).toEqual([
      expect.stringContaining('addMovementHeat adds heat'),
      expect.stringContaining('Mek.getJumpHeat'),
    ]);
    expect(engineHeatRefs.map((sourceRef) => sourceRef.citation)).toEqual([
      expect.stringContaining('getEngineCritHeat adds 5 heat'),
    ]);
    expect(dissipationRefs.map((sourceRef) => sourceRef.citation)).toEqual([
      expect.stringContaining('sinks heat with getHeatCapacityWithWater'),
      expect.stringContaining('getHeatCapacity counts active heat sinks'),
    ]);
    expect(heatSinkDamageRefs.map((sourceRef) => sourceRef.citation)).toEqual([
      expect.stringContaining('getHeatCapacity counts active heat sinks'),
    ]);
    expect(thresholdEffectRefs.map((sourceRef) => sourceRef.citation)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('getHeatFiringModifier applies heat'),
        expect.stringContaining('getHeatMPReduction implements'),
        expect.stringContaining('avoidable shutdown checks'),
        expect.stringContaining('heat >= 19'),
        expect.stringContaining('pilot damage at heat 15/25+'),
      ]),
    );
    expect(
      heatAmmoExplosionRefs.map((sourceRef) => sourceRef.citation),
    ).toEqual([
      expect.stringContaining('HeatResolver checks heat >= 19'),
      expect.stringContaining('explodeAmmoFromHeat selects'),
    ]);
    expect(heatStartupRefs.map((sourceRef) => sourceRef.citation)).toEqual([
      expect.stringContaining('automatically restarts'),
    ]);
    expect(heatShutdownRefs.map((sourceRef) => sourceRef.citation)).toEqual([
      expect.stringContaining('avoidable shutdown checks'),
    ]);
    expect(autoShutdownRefs.map((sourceRef) => sourceRef.citation)).toEqual([
      expect.stringContaining('automatic shutdown'),
    ]);
    expect(heatRiskRefs.map((sourceRef) => sourceRef.citation)).toEqual([
      expect.stringContaining('heat >= 19'),
    ]);
    expect(pilotHeatRefs.map((sourceRef) => sourceRef.citation)).toEqual([
      expect.stringContaining('pilot damage at heat 15/25+'),
    ]);
    expect(maxTechPilotHeatRefs.map((sourceRef) => sourceRef.citation)).toEqual(
      [expect.stringContaining('optional MaxTech heat-scale')],
    );
    expect(
      maxTechCriticalHeatRefs.map((sourceRef) => sourceRef.citation),
    ).toEqual([expect.stringContaining('critical damage avoid rolls')]);
    expect(waterCoolingRefs.map((sourceRef) => sourceRef.citation)).toEqual([
      expect.stringContaining('sinks heat with getHeatCapacityWithWater'),
      expect.stringContaining('getHeatCapacityWithWater adds'),
    ]);
    expect(fireHeatRefs.map((sourceRef) => sourceRef.citation)).toEqual([
      expect.stringContaining('spending a full round in fire terrain'),
      expect.stringContaining('caps external heat'),
    ]);
    expect(
      environmentalHeatRefs.map((sourceRef) => sourceRef.citation),
    ).toEqual([
      expect.stringContaining('adjustHeatExtremeTemp'),
      expect.stringContaining('caps external heat'),
      expect.stringContaining('local atmosphere heat-dissipation'),
    ]);
  });

  it('tracks damage, pilot injury, critical components, and destruction causes', () => {
    expect(supportGaps(DAMAGE_RESOLUTION_COMBAT_SUPPORT)).toEqual([]);
    expect(supportGaps(PILOT_DAMAGE_COMBAT_SUPPORT)).toEqual([]);
    expect(supportGaps(CRITICAL_COMPONENT_COMBAT_SUPPORT)).toEqual([]);
    expect(supportGaps(DESTRUCTION_CAUSE_COMBAT_SUPPORT)).toEqual([]);

    expect(
      supportIdsByLevel(DAMAGE_RESOLUTION_COMBAT_SUPPORT, 'integrated'),
    ).toEqual([
      'armor-damage',
      'case-ammo-explosion-containment',
      'damage-transfer',
      'destruction-cause-state-persistence',
      'head-damage-cap',
      'heat-ammo-explosion-damage-cascade',
      'internal-structure-damage',
      'location-destroyed-events',
      'rear-armor-damage',
      'side-torso-arm-cascade',
      'transfer-damage-events',
      'twenty-plus-damage-psr',
    ]);
    expect(
      supportIdsByLevel(DAMAGE_RESOLUTION_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([]);

    expect(
      supportIdsByLevel(PILOT_DAMAGE_COMBAT_SUPPORT, 'integrated'),
    ).toEqual([
      'ammo-explosion-pilot-damage',
      'cockpit-crit-pilot-death',
      'consciousness-check',
      'fall-pilot-damage',
      'head-hit-pilot-event',
      'head-hit-wound',
      'heat-pilot-damage',
      'maxtech-heat-critical-damage',
      'maxtech-heat-pilot-damage',
      'pilot-death',
      'unconsciousness',
    ]);
    expect(
      supportIdsByLevel(PILOT_DAMAGE_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([]);
    expect(
      PILOT_DAMAGE_COMBAT_SUPPORT[
        'ammo-explosion-pilot-damage'
      ].sourceRefs?.map(({ citation }) => citation),
    ).toEqual([
      'MegaMek TWGameManager reduces ammunition-explosion pilot damage by 1 for Pain Resistance or Iron Man.',
      'MegaMek PilotOptions registers Iron Man and Pain Resistance as distinct misc abilities.',
      'MegaMek OptionsConstants defines MISC_IRON_MAN and MISC_PAIN_RESISTANCE as separate ability ids.',
      'MegaMek option text defines Pain Resistance as +1 consciousness rolls plus ammunition-explosion damage reduction.',
      'MegaMek option text defines Iron Man as ammunition-explosion pilot-hit reduction only.',
    ]);

    expect(
      supportIdsByLevel(CRITICAL_COMPONENT_COMBAT_SUPPORT, 'integrated'),
    ).toEqual([
      'actuator',
      'ammo',
      'cockpit',
      'engine',
      'equipment',
      'equipment-ac-playtest',
      'equipment-active-probe',
      'equipment-ammo-exhaustion-no-explosion',
      'equipment-artemis-fcs-critical-lifecycle',
      'equipment-blue-shield-explosion',
      'equipment-charged-capacitors',
      'equipment-emergency-coolant',
      'equipment-explosive-equipment',
      'equipment-extended-fuel-tank-explosion',
      'equipment-generic-destroyed-name-replay',
      'equipment-harjel',
      'equipment-hot-load-linked-ammo-inference',
      'equipment-hot-load-mode-state-inference',
      'equipment-hot-loaded-weapons',
      'equipment-partial-wing',
      'equipment-physical-modifiers',
      'equipment-prototype-improved-jump-jet-explosion',
      'equipment-risc-laser-pulse-module-ambiguous-link',
      'equipment-risc-laser-pulse-module-inoperable-linked-module',
      'equipment-risc-laser-pulse-module-linked-laser',
      'equipment-scm',
      'equipment-shields',
      'equipment-stealth-linked-ecm',
      'gyro',
      'heat_sink',
      'jump_jet',
      'life_support',
      'sensor',
      'weapon',
    ]);
    expect(
      supportIdsByLevel(CRITICAL_COMPONENT_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([]);
    expect(
      supportIdsByLevel(CRITICAL_COMPONENT_COMBAT_SUPPORT, 'unsupported'),
    ).toEqual([...UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS].sort());
    expect(
      Object.values(CRITICAL_COMPONENT_COMBAT_SUPPORT)
        .filter((entry) => (entry.sourceRefs?.length ?? 0) === 0)
        .map((entry) => entry.id),
    ).toEqual([]);
    expect(CRITICAL_COMPONENT_COMBAT_SUPPORT.equipment.gap).toBeUndefined();
    expect(CRITICAL_COMPONENT_COMBAT_SUPPORT.equipment.evidence).toContain(
      'split-accounted',
    );

    expect(
      supportIdsByLevel(DESTRUCTION_CAUSE_COMBAT_SUPPORT, 'integrated'),
    ).toEqual([
      'ammo_explosion',
      'ct_destroyed',
      'damage',
      'engine_destroyed',
      'head_destroyed',
      'impossible_displacement',
      'pilot_death',
    ]);
    expect(
      supportIdsByLevel(DESTRUCTION_CAUSE_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([]);

    expect(
      DESTRUCTION_CAUSE_COMBAT_SUPPORT.impossible_displacement.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MegaMek resolveDfaAttack destroys the attacker on a missed DFA when the target cannot be displaced.',
      'MegaMek resolveDfaAttack destroys the target on a successful DFA when the target cannot be displaced.',
    ]);
  });

  it('tracks runner-vs-interactive parity and marks cross-stack gaps', () => {
    expect(supportGaps(RUNNER_INTERACTIVE_PARITY_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(RUNNER_INTERACTIVE_PARITY_SUPPORT, 'integrated'),
    ).toEqual([
      'heat-core-resolution',
      'heat-dissipation-event-payload',
      'heat-environment-and-water',
      'heat-pilot-damage',
      'movement-action-eligibility',
      'movement-heat-and-event-path',
      'movement-validation',
      'objective-outcome',
      'physical-attack-resolution',
      'physical-displacement-grid-occupancy',
      'psr-piloting-skill',
      'psr-resolution',
      'terminal-game-ended-event',
      'weapon-damage-critical-events',
      'weapon-indirect-fire',
      'weapon-range-and-to-hit',
      'weapon-target-validation',
    ]);
    expect(
      supportIdsByLevel(RUNNER_INTERACTIVE_PARITY_SUPPORT, 'helper-only'),
    ).toEqual([]);

    const parityEntries = Object.values(RUNNER_INTERACTIVE_PARITY_SUPPORT);
    expect(
      parityEntries
        .filter((entry) => (entry.sourceRefs?.length ?? 0) === 0)
        .map((entry) => entry.id),
    ).toEqual([]);
    expect(
      parityEntries.flatMap((entry) =>
        (entry.sourceRefs ?? []).filter(({ url }) => !url.includes('#L')),
      ),
    ).toEqual([]);
    expect(
      parityEntries.flatMap((entry) =>
        (entry.sourceRefs ?? []).filter(
          ({ sourceVersion }) => sourceVersion.trim().length === 0,
        ),
      ),
    ).toEqual([]);
    expect(
      parityEntries
        .filter(
          (entry) =>
            !(entry.sourceRefs ?? []).some(
              ({ kind }) => kind === 'mekstation-deviation',
            ),
        )
        .map((entry) => entry.id),
    ).toEqual([]);

    const sourceRefsFor = (
      id: keyof typeof RUNNER_INTERACTIVE_PARITY_SUPPORT,
    ) => RUNNER_INTERACTIVE_PARITY_SUPPORT[id].sourceRefs ?? [];
    expect(
      sourceRefsFor('movement-validation').map(({ citation }) => citation),
    ).toEqual(
      expect.arrayContaining([
        'MekStation GameEngine.runMovementPhase validates bot movement through validateMovement before MovementDeclared emission.',
        'MekStation InteractiveSession movement actions use the same validateMovement, event-path, declareMovement, and lockMovement flow.',
      ]),
    );
    expect(
      sourceRefsFor('weapon-range-and-to-hit').map(({ citation }) => citation),
    ).toEqual(
      expect.arrayContaining([
        'MekStation runner weapon phase routes ranged attacks through calculateToHit or calculateToHitWithC3 with range and modifier context.',
        'MekStation event-sourced attack declaration computes AttackDeclared to-hit values through calculateToHit.',
      ]),
    );
    expect(
      sourceRefsFor('physical-displacement-grid-occupancy').map(
        ({ citation }) => citation,
      ),
    ).toEqual(
      expect.arrayContaining([
        'MekStation runner physical phase computes displacement outcomes and mirrors resulting unit movement back into the local grid occupancy view.',
        'MekStation physical runner behavior test proves same-phase displacement refreshes grid occupancy before later physical attacks resolve.',
      ]),
    );
    expect(
      sourceRefsFor('heat-core-resolution').map(({ citation }) => citation),
    ).toEqual(
      expect.arrayContaining([
        'MekStation runner heat phase processes weapon, movement, engine, terrain/environment heat, heat-sink dissipation, shutdown/startup, ammo explosion, pilot heat damage, and MaxTech heat criticals.',
        'MekStation event-sourced resolveHeatPhase processes heat from movement, AttackDeclared weapon payloads, engine hits, environment, dissipation, startup, shutdown, ammo explosion, and heat effects.',
      ]),
    );
    expect(
      sourceRefsFor('psr-resolution').map(({ citation }) => citation),
    ).toEqual(
      expect.arrayContaining([
        'MekStation runner PSR phase resolves queued PSRs with per-unit piloting, emits PSRResolved, and applies first-failure fallout.',
        'MekStation event-sourced End phase resolves pending PSRs with per-unit piloting, component damage, wounds, quirks, abilities, and unit type.',
      ]),
    );
    expect(
      sourceRefsFor('terminal-game-ended-event').map(
        ({ citation }) => citation,
      ),
    ).toEqual(
      expect.arrayContaining([
        'MekStation endGame appends a GameEnded event through the event-sourced session reducer path.',
        'MekStation appendRunnerGameEndedEvent maps runner winner/reason/turns into a terminal GameEnded replay event.',
      ]),
    );
  });

  it('tracks lifecycle action eligibility and PSR resolution support', () => {
    expect(supportGaps(ACTION_ELIGIBILITY_COMBAT_SUPPORT)).toEqual([]);
    expect(supportGaps(PSR_RESOLUTION_COMBAT_SUPPORT)).toEqual([]);
    expect(supportGaps(RUNNER_PSR_TRIGGER_COMBAT_SUPPORT)).toEqual([]);

    expect(
      supportIdsByLevel(ACTION_ELIGIBILITY_COMBAT_SUPPORT, 'integrated'),
    ).toEqual(
      [
        'destroyed',
        'ejected',
        'ejected-targetability',
        'ejection-damage-preservation',
        'force-survivor-counts',
        'retreated',
        'retreated-targetability',
        'shutdown',
        'shutdown-targetability',
        'unconscious',
      ].sort(),
    );
    const actionEligibilityEntries = Object.values(
      ACTION_ELIGIBILITY_COMBAT_SUPPORT,
    );
    expect(
      actionEligibilityEntries.filter((entry) => !entry.sourceRefs?.length),
    ).toEqual([]);
    expect(
      actionEligibilityEntries.flatMap((entry) =>
        (entry.sourceRefs ?? []).filter(({ url }) => !url.includes('#L')),
      ),
    ).toEqual([]);
    expect(
      ACTION_ELIGIBILITY_COMBAT_SUPPORT[
        'shutdown-targetability'
      ].sourceRefs?.map(({ citation }) => citation),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('leaving shutdown enemies targetable'),
      ]),
    );
    expect(
      ACTION_ELIGIBILITY_COMBAT_SUPPORT[
        'ejection-damage-preservation'
      ].sourceRefs?.map(({ citation }) => citation),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('InteractiveSession.ejectUnit'),
        expect.stringContaining('applyUnitEjected'),
      ]),
    );
    const ejectedTargetMegaMekRefs =
      ACTION_ELIGIBILITY_COMBAT_SUPPORT[
        'ejected-targetability'
      ].sourceRefs?.filter(({ kind }) => kind === 'megamek-source') ?? [];
    expectPinnedMegaMekRefs(ejectedTargetMegaMekRefs);
    expect(ejectedTargetMegaMekRefs.map(({ citation }) => citation)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('TWGameManager.ejectEntity'),
      ]),
    );
    expect(
      supportIdsByLevel(PSR_RESOLUTION_COMBAT_SUPPORT, 'integrated'),
    ).toEqual(
      [
        'failed-psr-fall',
        'fall-pilot-death',
        'fall-pilot-hit-event',
        'fall-pilot-wound',
        'pending-psr-clear',
        'pending-psr-resolution',
        'psr-reason-code-preservation',
        'psr-resolved-events',
      ].sort(),
    );
    const psrResolutionEntries = Object.values(PSR_RESOLUTION_COMBAT_SUPPORT);
    expect(
      psrResolutionEntries.filter((entry) => !entry.sourceRefs?.length),
    ).toEqual([]);
    expect(
      psrResolutionEntries.flatMap((entry) =>
        (entry.sourceRefs ?? []).filter(({ url }) => !url.includes('#L')),
      ),
    ).toEqual([]);
    expect(
      PSR_RESOLUTION_COMBAT_SUPPORT['pending-psr-resolution'].sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('MegaMek Game.addPSR'),
        expect.stringContaining('MekStation runPSRPhase'),
      ]),
    );
    const failedFallMegaMekRefs =
      PSR_RESOLUTION_COMBAT_SUPPORT['failed-psr-fall'].sourceRefs?.filter(
        ({ kind }) => kind === 'megamek-source',
      ) ?? [];
    expectPinnedMegaMekRefs(failedFallMegaMekRefs);
    expect(failedFallMegaMekRefs.map(({ citation }) => citation)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('doSkillCheckWhileMoving'),
        expect.stringContaining('doEntityFall'),
      ]),
    );
    expect(sortedKeys(RUNNER_PSR_TRIGGER_COMBAT_SUPPORT)).toEqual(
      Object.values(PSRTrigger).sort(),
    );
    expect(
      supportIdsByLevel(RUNNER_PSR_TRIGGER_COMBAT_SUPPORT, 'integrated'),
    ).toEqual(
      [
        PSRTrigger.PhaseDamage20Plus,
        PSRTrigger.LegDamage,
        PSRTrigger.HipActuatorDestroyed,
        PSRTrigger.GyroHit,
        PSRTrigger.EngineHit,
        PSRTrigger.UpperLegActuatorHit,
        PSRTrigger.LowerLegActuatorHit,
        PSRTrigger.FootActuatorHit,
        PSRTrigger.Kicked,
        PSRTrigger.Charged,
        PSRTrigger.DFATarget,
        PSRTrigger.Pushed,
        PSRTrigger.DominoEffect,
        PSRTrigger.KickMiss,
        PSRTrigger.Shutdown,
        PSRTrigger.StandingUp,
        PSRTrigger.EnteringRubble,
        PSRTrigger.RunningRoughTerrain,
        PSRTrigger.MovingOnIce,
        PSRTrigger.EnteringWater,
        PSRTrigger.ExitingWater,
        PSRTrigger.Skidding,
        PSRTrigger.SwampBogDown,
        PSRTrigger.AirMekLanding,
        PSRTrigger.BuildingCollapse,
        PSRTrigger.RunningDamagedHip,
        PSRTrigger.RunningDamagedGyro,
        PSRTrigger.ControlledSideslip,
        PSRTrigger.FlankingAndTurning,
        PSRTrigger.OutOfControl,
        PSRTrigger.MASCFailure,
        PSRTrigger.SuperchargerFailure,
      ].sort(),
    );
    expect(
      supportIdsByLevel(RUNNER_PSR_TRIGGER_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([]);
    expect(
      supportIdsByLevel(RUNNER_PSR_TRIGGER_COMBAT_SUPPORT, 'out-of-scope'),
    ).toEqual([PSRTrigger.ChargeMiss, PSRTrigger.DFAMiss].sort());
    const damageAndCriticalPsrTriggers = [
      PSRTrigger.PhaseDamage20Plus,
      PSRTrigger.LegDamage,
      PSRTrigger.HipActuatorDestroyed,
      PSRTrigger.GyroHit,
      PSRTrigger.EngineHit,
      PSRTrigger.UpperLegActuatorHit,
      PSRTrigger.LowerLegActuatorHit,
      PSRTrigger.FootActuatorHit,
    ];
    const psrTriggerSourceRefs = damageAndCriticalPsrTriggers.map(
      (trigger) => ({
        trigger,
        sourceRefs: RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[trigger].sourceRefs ?? [],
      }),
    );
    expect(
      psrTriggerSourceRefs
        .filter(({ sourceRefs }) => sourceRefs.length === 0)
        .map(({ trigger }) => trigger),
    ).toEqual([]);
    expect(
      psrTriggerSourceRefs.flatMap(({ sourceRefs }) =>
        sourceRefs.filter(({ url }) => !url.includes('#L')),
      ),
    ).toEqual([]);
    expectPinnedMegaMekRefs(
      psrTriggerSourceRefs.flatMap(({ sourceRefs }) =>
        sourceRefs.filter(({ kind }) => kind === 'megamek-source'),
      ),
    );
    const psrTriggerCitations = (trigger: PSRTrigger) =>
      RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[trigger].sourceRefs?.map(
        ({ citation }) => citation,
      ) ?? [];

    expect(psrTriggerCitations(PSRTrigger.PhaseDamage20Plus)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('checkForPSRFromDamage'),
        expect.stringContaining('applyDamageThresholdPSR'),
        expect.stringContaining('createDamagePSR'),
      ]),
    );
    expect(psrTriggerCitations(PSRTrigger.LegDamage)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('MekStation leg-structure PSRs'),
        expect.stringContaining('applyLegDamagePSR'),
        expect.stringContaining('createLegDamagePSR'),
      ]),
    );
    const actuatorPsrCitations = [
      PSRTrigger.HipActuatorDestroyed,
      PSRTrigger.UpperLegActuatorHit,
      PSRTrigger.LowerLegActuatorHit,
      PSRTrigger.FootActuatorHit,
    ].flatMap((trigger) => psrTriggerCitations(trigger));
    expect(actuatorPsrCitations).toEqual(
      expect.arrayContaining([
        expect.stringContaining('applyMekCritical queues hip actuator PSRs'),
        expect.stringContaining(
          'applyMekCritical queues leg/foot actuator PSRs',
        ),
        expect.stringContaining('MekStation applyActuatorHit'),
      ]),
    );
    expect(psrTriggerCitations(PSRTrigger.GyroHit)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('handleGyroCriticalHit'),
        expect.stringContaining('MekStation applyGyroHit'),
        expect.stringContaining('createGyroPSR'),
      ]),
    );
    expect(psrTriggerCitations(PSRTrigger.EngineHit)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('not queuing a normal fall PSR'),
        expect.stringContaining('MekStation applyEngineHit'),
        expect.stringContaining('createEngineHitPSR'),
      ]),
    );
    expect(
      RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[PSRTrigger.EngineHit].sourceRefs?.some(
        ({ kind }) => kind === 'mekstation-deviation',
      ),
    ).toBe(true);
    const physicalPsrTriggers = [
      PSRTrigger.Kicked,
      PSRTrigger.Charged,
      PSRTrigger.DFATarget,
      PSRTrigger.Pushed,
      PSRTrigger.KickMiss,
      PSRTrigger.ChargeMiss,
      PSRTrigger.DFAMiss,
    ];
    const physicalPsrSourceRefs = physicalPsrTriggers.map((trigger) => ({
      trigger,
      sourceRefs: RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[trigger].sourceRefs ?? [],
    }));
    expect(
      physicalPsrSourceRefs
        .filter(({ sourceRefs }) => sourceRefs.length === 0)
        .map(({ trigger }) => trigger),
    ).toEqual([]);
    expect(
      physicalPsrSourceRefs.flatMap(({ sourceRefs }) =>
        sourceRefs.filter(({ url }) => !url.includes('#L')),
      ),
    ).toEqual([]);
    expectPinnedMegaMekRefs(
      physicalPsrSourceRefs.flatMap(({ sourceRefs }) =>
        sourceRefs.filter(({ kind }) => kind === 'megamek-source'),
      ),
    );
    expect(psrTriggerCitations(PSRTrigger.Kicked)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('resolveKickAttack'),
        expect.stringContaining('was kicked'),
        expect.stringContaining('createKickedPSR'),
      ]),
    );
    expect(psrTriggerCitations(PSRTrigger.Charged)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('attacker charge PSR at +2'),
        expect.stringContaining('"was charged" target'),
        expect.stringContaining('createChargedPSR'),
      ]),
    );
    expect(psrTriggerCitations(PSRTrigger.DFATarget)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('+2 "hit by death from above" target PSR'),
        expect.stringContaining('createDFATargetPSR'),
        expect.stringContaining('executed death from above'),
      ]),
    );
    expect(psrTriggerCitations(PSRTrigger.Pushed)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('resolvePushAttack'),
        expect.stringContaining('getKickPushPSR'),
        expect.stringContaining('createPushedPSR'),
      ]),
    );
    expect(psrTriggerCitations(PSRTrigger.KickMiss)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('missed ground kick'),
        expect.stringContaining('createKickMissPSR'),
      ]),
    );
    expect(psrTriggerCitations(PSRTrigger.ChargeMiss)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('normal ChargeMiss PSR is not queued'),
        expect.stringContaining('createChargeMissPSR remains'),
      ]),
    );
    expect(
      RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[PSRTrigger.ChargeMiss].sourceRefs?.some(
        ({ kind }) => kind === 'mekstation-deviation',
      ),
    ).toBe(true);
    const terrainPsrTriggers = [
      PSRTrigger.EnteringRubble,
      PSRTrigger.RunningRoughTerrain,
      PSRTrigger.MovingOnIce,
      PSRTrigger.EnteringWater,
      PSRTrigger.ExitingWater,
      PSRTrigger.Skidding,
      PSRTrigger.BuildingCollapse,
    ];
    const terrainPsrSourceRefs = terrainPsrTriggers.map((trigger) => ({
      trigger,
      sourceRefs: RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[trigger].sourceRefs ?? [],
    }));
    expect(
      terrainPsrSourceRefs
        .filter(({ sourceRefs }) => sourceRefs.length === 0)
        .map(({ trigger }) => trigger),
    ).toEqual([]);
    expect(
      terrainPsrSourceRefs.flatMap(({ sourceRefs }) =>
        sourceRefs.filter(({ url }) => !url.includes('#L')),
      ),
    ).toEqual([]);
    expectPinnedMegaMekRefs(
      terrainPsrSourceRefs.flatMap(({ sourceRefs }) =>
        sourceRefs.filter(({ kind }) => kind === 'megamek-source'),
      ),
    );
    expect(psrTriggerCitations(PSRTrigger.EnteringRubble)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Entity.checkRubbleMove'),
        expect.stringContaining('queueMovementTerrainPSRs'),
      ]),
    );
    expect(psrTriggerCitations(PSRTrigger.EnteringWater)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Entity.checkWaterMove'),
        expect.stringContaining('terrain PSR factories'),
      ]),
    );
    expect(psrTriggerCitations(PSRTrigger.Skidding)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Entity.checkSkid'),
        expect.stringContaining('getMovementBeforeSkidPSRModifier'),
      ]),
    );
    expect(psrTriggerCitations(PSRTrigger.BuildingCollapse)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('BuildingCollapseHandler.checkForCollapse'),
        expect.stringContaining('building-collapse pending PSRs'),
      ]),
    );
    expect(
      [
        PSRTrigger.RunningRoughTerrain,
        PSRTrigger.MovingOnIce,
        PSRTrigger.ExitingWater,
      ].flatMap(
        (trigger) =>
          RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[trigger].sourceRefs?.filter(
            ({ kind }) => kind !== 'mekstation-deviation',
          ) ?? [],
      ),
    ).toEqual([]);

    const heatAndMovementPsrTriggers = [
      PSRTrigger.Shutdown,
      PSRTrigger.StandingUp,
      PSRTrigger.RunningDamagedHip,
      PSRTrigger.RunningDamagedGyro,
    ];
    const heatAndMovementPsrSourceRefs = heatAndMovementPsrTriggers.map(
      (trigger) => ({
        trigger,
        sourceRefs: RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[trigger].sourceRefs ?? [],
      }),
    );
    expect(
      heatAndMovementPsrSourceRefs
        .filter(({ sourceRefs }) => sourceRefs.length === 0)
        .map(({ trigger }) => trigger),
    ).toEqual([]);
    expect(
      heatAndMovementPsrSourceRefs.flatMap(({ sourceRefs }) =>
        sourceRefs.filter(({ url }) => !url.includes('#L')),
      ),
    ).toEqual([]);
    expectPinnedMegaMekRefs(
      heatAndMovementPsrSourceRefs.flatMap(({ sourceRefs }) =>
        sourceRefs.filter(({ kind }) => kind === 'megamek-source'),
      ),
    );
    expect(psrTriggerCitations(PSRTrigger.Shutdown)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('HeatResolver queues PilotingRollData +3'),
        expect.stringContaining('queueRunnerShutdownPSR'),
        expect.stringContaining('createShutdownPSR'),
      ]),
    );
    expect(psrTriggerCitations(PSRTrigger.StandingUp)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Entity.checkGetUp'),
        expect.stringContaining('doSkillCheckInPlace'),
        expect.stringContaining('resolveRunnerStandUpAttempt'),
      ]),
    );
    expect(
      [
        PSRTrigger.StandingUp,
        PSRTrigger.RunningDamagedHip,
        PSRTrigger.RunningDamagedGyro,
      ].flatMap(
        (trigger) =>
          RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[trigger].sourceRefs?.filter(
            ({ kind }) => kind === 'mekstation-deviation',
          ) ?? [],
      ).length,
    ).toBeGreaterThan(0);
    expect(
      [PSRTrigger.RunningDamagedHip, PSRTrigger.RunningDamagedGyro].flatMap(
        (trigger) => psrTriggerCitations(trigger),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('one combined running-with-damaged'),
        expect.stringContaining(
          'separate RunningDamagedHip and RunningDamagedGyro',
        ),
        expect.stringContaining('RunningDamagedHip per forward step'),
      ]),
    );
    expect(
      RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[PSRTrigger.DFATarget].sourceRefs?.map(
        (sourceRef) => sourceRef.citation,
      ),
    ).toContain(
      'MegaMek resolveDfaAttack queues attacker PilotingRollData +4 for "executed death from above" after a successful DFA.',
    );
    expect(
      RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[PSRTrigger.DFAMiss].sourceRefs?.map(
        (sourceRef) => sourceRef.citation,
      ),
    ).toContain(
      'MegaMek resolveDfaAttack displaces the target on a missed DFA, then immediately calls doEntityFall on the attacker with fall height 2 and facing 3.',
    );
    expect(
      RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[PSRTrigger.DFAMiss].sourceRefs?.map(
        (sourceRef) => sourceRef.citation,
      ),
    ).toContain(
      'MegaMek doEntityFall rolls checkPilotAvoidFallDamage after fall damage and adds fallHeight - 1 to the pilot-damage avoidance target.',
    );
  });

  it('audits known-limitation traps without filtering combat validation failures', () => {
    expect(
      KNOWN_LIMITATION_VALIDATION_TRAPS.map((trap) => trap.category).sort(),
    ).toEqual([...KNOWN_LIMITATION_CATEGORY_IDS].sort());

    const validationTrapViolations: readonly IViolation[] =
      KNOWN_LIMITATION_VALIDATION_TRAPS.map(({ message }) => ({
        invariant: BATTLEMECH_COMBAT_VALIDATION_INVARIANT,
        severity: 'warning',
        message,
        context: {},
      }));

    expect(validationTrapViolations.every(isKnownLimitation)).toBe(false);
    expect(validationTrapViolations.map(getLimitationPatternCategory)).toEqual(
      KNOWN_LIMITATION_VALIDATION_TRAPS.map(({ category }) => category),
    );
    expect(validationTrapViolations).toHaveLength(
      KNOWN_LIMITATION_VALIDATION_TRAPS.length,
    );
  });

  it('prevents known-limitation filtering from gating the catalog validation lane', () => {
    const source = readFileSync(
      join(
        process.cwd(),
        'src',
        'simulation',
        'runner',
        '__tests__',
        'battlemechCombatCatalog.contract.test.ts',
      ),
      'utf8',
    );
    const forbiddenGateSymbols = [
      'filter' + 'KnownLimitations',
      'partition' + 'Violations',
    ];

    for (const symbol of forbiddenGateSymbols) {
      expect(source).not.toContain(symbol);
    }
  });
});
