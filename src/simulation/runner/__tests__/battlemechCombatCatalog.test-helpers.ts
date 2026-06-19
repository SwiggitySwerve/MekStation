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

function officialBattleMechDataPath(...parts: readonly string[]): string {
  return join(
    process.cwd(),
    'public',
    'data',
    'units',
    'battlemechs',
    ...parts,
  );
}

function readOfficialBattleMechUnitIndex(): IBattleMechUnitIndexFile {
  return JSON.parse(
    readFileSync(officialBattleMechDataPath('index.json'), 'utf8'),
  ) as IBattleMechUnitIndexFile;
}

function readOfficialBattleMechUnit(path: string): IFullUnit {
  return JSON.parse(
    readFileSync(officialBattleMechDataPath(path), 'utf8'),
  ) as IFullUnit;
}

function officialUnitEquipmentEntries(
  fullUnit: IFullUnit,
): readonly IUnitEquipmentEntry[] {
  return Array.isArray(fullUnit.equipment)
    ? (fullUnit.equipment as readonly IUnitEquipmentEntry[])
    : [];
}

function officialUnitCriticalSlots(
  fullUnit: IFullUnit,
): Record<string, readonly unknown[]> {
  return fullUnit.criticalSlots && typeof fullUnit.criticalSlots === 'object'
    ? (fullUnit.criticalSlots as Record<string, readonly unknown[]>)
    : {};
}

function officialUnitCatalogLocations(
  equipment: readonly IUnitEquipmentEntry[],
  criticalSlots: Record<string, readonly unknown[]>,
): readonly string[] {
  return Array.from(
    new Set([
      ...equipment
        .map((entry) =>
          normalizeEquipmentLocationForCatalogTest(entry.location),
        )
        .filter(Boolean),
      ...Object.keys(criticalSlots),
    ]),
  );
}

function criticalSlotTextsForLocation(
  criticalSlots: Record<string, readonly unknown[]>,
  location: string,
): readonly string[] {
  return (criticalSlots[location] ?? []).filter(
    (slot): slot is string => typeof slot === 'string',
  );
}

function countCompatibleArtemisLaunchersAtLocation(
  equipment: readonly IUnitEquipmentEntry[],
  location: string,
): number {
  return equipment.filter((entry) => {
    if (
      normalizeEquipmentLocationForCatalogTest(entry.location) !== location ||
      typeof entry.id !== 'string'
    ) {
      return false;
    }
    const weapon = weaponLookup(entry.id);
    return weapon ? isArtemisCompatibleWeapon(weapon) : false;
  }).length;
}

function equipmentArtemisFcsCountAtLocation(
  equipment: readonly IUnitEquipmentEntry[],
  location: string,
  kind: ArtemisFcsKind,
): number {
  return equipment.filter((entry) => {
    return (
      normalizeEquipmentLocationForCatalogTest(entry.location) === location &&
      typeof entry.id === 'string' &&
      artemisFcsKindFromCatalogText(entry.id) === kind
    );
  }).length;
}

function artemisFcsCountAtLocation(
  equipment: readonly IUnitEquipmentEntry[],
  slots: readonly string[],
  location: string,
  kind: ArtemisFcsKind,
): number {
  return (
    equipmentArtemisFcsCountAtLocation(equipment, location, kind) ||
    artemisFcsSystemCount(slots, kind)
  );
}

function hasSupportedArtemisAllocation(
  compatibleLauncherCount: number,
  fcsCount: number,
): boolean {
  return (
    compatibleLauncherCount === 1 ||
    (compatibleLauncherCount > 0 && compatibleLauncherCount === fcsCount)
  );
}

function auditOfficialUnitArtemisLocation(
  fullUnit: IFullUnit,
  equipment: readonly IUnitEquipmentEntry[],
  criticalSlots: Record<string, readonly unknown[]>,
  location: string,
  nonTorpedoFailures: string[],
  torpedoResiduals: string[],
): void {
  const slots = criticalSlotTextsForLocation(criticalSlots, location);
  const compatibleLauncherCount = countCompatibleArtemisLaunchersAtLocation(
    equipment,
    location,
  );
  const torpedoLauncherCount = slots.filter(isTorpedoSlotText).length;

  for (const kind of [
    'artemis_iv',
    'prototype_artemis_iv',
    'artemis_v',
  ] as const) {
    const fcsCount = artemisFcsCountAtLocation(
      equipment,
      slots,
      location,
      kind,
    );
    if (fcsCount <= 0 || !hasArtemisCapableAmmo(slots, kind)) continue;
    if (hasSupportedArtemisAllocation(compatibleLauncherCount, fcsCount)) {
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

function officialUnitArtemisAllocationAudit(): {
  readonly nonTorpedoFailures: readonly string[];
  readonly torpedoResiduals: readonly string[];
} {
  const unitIndex = readOfficialBattleMechUnitIndex();
  const nonTorpedoFailures: string[] = [];
  const torpedoResiduals: string[] = [];

  for (const indexEntry of unitIndex.units) {
    const fullUnit = readOfficialBattleMechUnit(indexEntry.path);
    const equipment = officialUnitEquipmentEntries(fullUnit);
    const criticalSlots = officialUnitCriticalSlots(fullUnit);

    for (const location of officialUnitCatalogLocations(
      equipment,
      criticalSlots,
    )) {
      auditOfficialUnitArtemisLocation(
        fullUnit,
        equipment,
        criticalSlots,
        location,
        nonTorpedoFailures,
        torpedoResiduals,
      );
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

function sourceRefsForToHitModifier(
  id: keyof typeof RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT,
): readonly ICombatFeatureSourceReference[] {
  return RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT[id].sourceRefs ?? [];
}

function expectSourceBackedToHitModifiersPinned(): void {
  const missingSourceRefs = Object.values(RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT)
    .filter(
      (entry) =>
        entry.level !== 'unsupported' && (entry.sourceRefs?.length ?? 0) === 0,
    )
    .map((entry) => entry.id);

  expect(missingSourceRefs).toEqual([]);
  Object.values(RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT).forEach((entry) => {
    if (entry.level !== 'unsupported') {
      expectPinnedMegaMekRefs(entry.sourceRefs ?? []);
    }
  });
}

function sourceRefsForHeatRule(
  id: keyof typeof HEAT_RULE_COMBAT_SUPPORT,
): readonly ICombatFeatureSourceReference[] {
  return HEAT_RULE_COMBAT_SUPPORT[id].sourceRefs ?? [];
}

function expectHeatRuleSourceRefsPinned(): void {
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

function expectLifecycleActionEligibilityAndPsrResolutionSupportTracked(): void {
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
    ACTION_ELIGIBILITY_COMBAT_SUPPORT['shutdown-targetability'].sourceRefs?.map(
      ({ citation }) => citation,
    ),
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
  const psrTriggerSourceRefs = damageAndCriticalPsrTriggers.map((trigger) => ({
    trigger,
    sourceRefs: RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[trigger].sourceRefs ?? [],
  }));
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
      expect.stringContaining('applyMekCritical queues leg/foot actuator PSRs'),
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
}

export {
  ACTION_ELIGIBILITY_COMBAT_SUPPORT,
  AMMUNITION_CATALOG_FILES,
  AMMUNITION_COMPATIBILITY_SUPPORT,
  BATTLEMECH_COMBAT_VALIDATION_INVARIANT,
  CANONICAL_SPA_CATALOG,
  CANONICAL_SPA_COMBAT_SCOPE_SUPPORT,
  CRITICAL_COMPONENT_COMBAT_SUPPORT,
  DAMAGE_RESOLUTION_COMBAT_SUPPORT,
  DESTRUCTION_CAUSE_COMBAT_SUPPORT,
  ELECTRONICS_CATALOG_FILES,
  EXPECTED_BATTLEMECH_AMMO_GAP_IDS,
  EXPECTED_BATTLEMECH_COMPATIBLE_AMMO_IDS,
  EXPECTED_DESIGNATOR_DEFENSIVE_SPECIAL_FAMILY_IDS,
  EXPECTED_EXPERIMENTAL_EMPTY_COMPATIBLE_AMMO_IDS,
  EXPECTED_MULTI_MODE_SPECIAL_WEAPON_FAMILY_IDS,
  EXPECTED_SCOPE_SPLIT_AMMO_GAP_IDS,
  EXPECTED_STREAK_WEAPON_FAMILY_IDS,
  EXPECTED_STRING_DAMAGE_RESOLUTIONS,
  EXPECTED_UNOFFICIAL_EMPTY_COMPATIBLE_AMMO_IDS,
  EXPECTED_ZERO_DAMAGE_RANGED_WEAPON_IDS,
  GAME_INTENT_TYPES,
  GameEventType,
  GamePhase,
  GameSide,
  HEAT_RULE_COMBAT_SUPPORT,
  KNOWN_LIMITATION_CATEGORY_IDS,
  KNOWN_LIMITATION_VALIDATION_TRAPS,
  MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS,
  MISCELLANEOUS_CATALOG_FILES,
  MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT,
  MOVEMENT_ENHANCEMENT_DEFINITIONS,
  MOVEMENT_RULE_COMBAT_SUPPORT,
  MovementEnhancementType,
  PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT,
  PHYSICAL_WEAPON_COMBAT_SUPPORT,
  PILOT_DAMAGE_COMBAT_SUPPORT,
  PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT,
  PINNED_MEGAMEK_CATALOG_SOURCE_VERSIONS,
  PROTOMECH_PROTO_MACHINE_GUN_AMMO_IDS,
  PSRTrigger,
  PSR_RESOLUTION_COMBAT_SUPPORT,
  QUIRK_CATALOG,
  QUIRK_COMBAT_SUPPORT,
  RUNNER_INTERACTIVE_PARITY_SUPPORT,
  RUNNER_PSR_TRIGGER_COMBAT_SUPPORT,
  RUNNER_RANGE_BRACKET_COMBAT_SUPPORT,
  RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT,
  SPA_CATALOG,
  SPA_COMBAT_SUPPORT,
  SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT,
  SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT,
  SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
  TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS,
  TERRAIN_TYPE_MOVEMENT_COVERAGE,
  UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_REFS,
  UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_SUPPORT_IDS,
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  UNSUPPORTED_ROTARY_AC_10_20_AMMO_IDS,
  UNSUPPORTED_ROTARY_AC_10_20_AMMO_ID_SET,
  UNSUPPORTED_ROTARY_AC_10_20_WEAPON_PROBE_IDS,
  WEAPON_CATALOG_FILES,
  WEAPON_DATABASE,
  allWeaponCatalogItems,
  ammoCompatibilityGapClass,
  ammoIdsByGapClass,
  ammoItems,
  ammunitionCatalogFiles,
  artemisFcsCountAtLocation,
  artemisFcsKindFromCatalogText,
  artemisFcsSystemCount,
  auditOfficialUnitArtemisLocation,
  buildUtilityCommands,
  buildWeaponLookupFromCatalogFiles,
  consumeAmmo,
  countBy,
  countCompatibleArtemisLaunchersAtLocation,
  createMinimalUnitState,
  createUnitEjectedEvent,
  criticalSlotTextsForLocation,
  electronicsCatalogFiles,
  electronicsItems,
  equipmentArtemisFcsCountAtLocation,
  expectHeatRuleSourceRefsPinned,
  expectLifecycleActionEligibilityAndPsrResolutionSupportTracked,
  expectPinnedMegaMekRefs,
  expectSourceBackedToHitModifiersPinned,
  familyItems,
  flattenItems,
  getCombatValidationOutOfScopeRefs,
  getCombatValidationUnresolvedRefs,
  getLimitationPatternCategory,
  getSPADefinition,
  getTotalAmmo,
  getWeaponData,
  hasAmmoForWeapon,
  hasArtemisCapableAmmo,
  hasSupportedArtemisAllocation,
  hydrateAmmoStateFromFullUnit,
  ids,
  initializeAmmoState,
  isAMS,
  isAmmoEntry,
  isArtemisCompatibleWeapon,
  isKnownLimitation,
  isLBXAC,
  isNarc,
  isPhysicalWeapon,
  isPinnedCatalogSourceRef,
  isRangedWeapon,
  isRotaryAC,
  isStreakSRM,
  isStringDamageWeapon,
  isTAG,
  isTorpedoSlotText,
  isUltraAC,
  itemText,
  join,
  miscellaneousCatalogFiles,
  miscellaneousItems,
  normalizeCriticalSlotTextForCatalogTest,
  normalizeEquipmentLocationForCatalogTest,
  officialBattleMechDataPath,
  officialIndex,
  officialUnitArtemisAllocationAudit,
  officialUnitCatalogLocations,
  officialUnitCriticalSlots,
  officialUnitEquipmentEntries,
  physicalWeaponItems,
  rangedWeaponItems,
  readFileSync,
  readOfficialBattleMechUnit,
  readOfficialBattleMechUnitIndex,
  resolveAmmoBV,
  resolveCatalogDamage,
  resolveEquipmentBV,
  resolveSpecialProjectileHit,
  selectWeaponMode,
  shouldSpendAmmoAndHeatOnMiss,
  sortedKeys,
  sourceRefsForHeatRule,
  sourceRefsForToHitModifier,
  supportGaps,
  supportIdsByLevel,
  toAIUnitState,
  toAIWeapon,
  toCatalogAIUnitState,
  verifyStreakBehavior,
  weaponCatalogFiles,
  weaponCatalogIds,
  weaponLookup,
  zeroDamageClassification,
};
export type {
  AmmoCompatibilityGapClass,
  AmmoCompatibilitySupportId,
  ArtemisFcsKind,
  IAmmoCatalogEntry,
  IBattleMechUnitIndexEntry,
  IBattleMechUnitIndexFile,
  ICatalogFile,
  ICatalogWeaponStats,
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
  IFullUnit,
  IUnitEquipmentEntry,
  IViolation,
  PinnedBattleMechAmmoGapClass,
  PinnedScopeSplitAmmoGapClass,
};
