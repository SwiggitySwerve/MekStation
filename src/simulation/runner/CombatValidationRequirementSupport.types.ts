import {
  BATTLEMECH_ABSENT_ACTION_SUPPORT,
  COMBAT_COMMAND_ACTION_SUPPORT,
  COMBAT_DIRECT_UI_ACTION_SUPPORT,
  GAME_INTENT_ACTION_SUPPORT,
  P2P_INTENT_TRANSLATION_SUPPORT,
  WIRE_INTENT_KIND_ACTION_SUPPORT,
} from './CombatActionSupport';
/* eslint-disable max-lines -- Requirement crosswalk intentionally catalogs the full active combat-validation scope. */
import { AMMUNITION_COMPATIBILITY_SUPPORT } from './CombatAmmunitionSupport';
import {
  ATTACK_INVALIDATION_REASON_SUPPORT,
  ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT,
  INVALID_TARGET_STATE_SUPPORT,
} from './CombatAttackInvalidationSupport';
import { CANONICAL_SPA_COMBAT_SCOPE_SUPPORT } from './CombatCanonicalSpaSupport';
import { CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT } from './CombatCriticalSlotEffectSupport';
import { CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT } from './CombatCriticalSlotHydrationSupport';
import {
  CRITICAL_COMPONENT_COMBAT_SUPPORT,
  DAMAGE_RESOLUTION_COMBAT_SUPPORT,
  DESTRUCTION_CAUSE_COMBAT_SUPPORT,
  PILOT_DAMAGE_COMBAT_SUPPORT,
} from './CombatDamageSupport';
import {
  BATTLEMECH_COMBAT_EVENT_SUPPORT,
  NON_BATTLEMECH_EVENT_SCOPE_SUPPORT,
} from './CombatEventSupport';
import { combatFeatureSourceRef } from './CombatFeatureSourceReference';
import {
  PHYSICAL_WEAPON_COMBAT_SUPPORT,
  QUIRK_COMBAT_SUPPORT,
  SPA_COMBAT_SUPPORT,
  SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT,
  type ICombatFeatureSourceReference,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';
import { COMBAT_INTEGRATION_SCENARIO_SUPPORT } from './CombatIntegrationSupport';
import {
  ACTION_ELIGIBILITY_COMBAT_SUPPORT,
  PSR_RESOLUTION_COMBAT_SUPPORT,
  RUNNER_PSR_TRIGGER_COMBAT_SUPPORT,
} from './CombatLifecycleSupport';
import { RUNNER_INTERACTIVE_PARITY_SUPPORT } from './CombatParitySupport';
import { PHYSICAL_ACTION_CLASS_SCOPE_SUPPORT } from './CombatPhysicalActionClassScopeSupport';
import { PHYSICAL_ATTACK_ACTION_SUPPORT } from './CombatPhysicalActionSupport';
import {
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_OUT_OF_SCOPE_IDS,
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS,
  PHYSICAL_LEGALITY_GATE_SUPPORT,
} from './CombatPhysicalLegalityGateSupport';
import { PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT } from './CombatPilotModifierApplicationSupport';
import { PILOT_SKILL_COMBAT_SUPPORT } from './CombatPilotSkillSupport';
import {
  HEAT_RULE_COMBAT_SUPPORT,
  MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT,
  MOVEMENT_RULE_COMBAT_SUPPORT,
  PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT,
  RUNNER_RANGE_BRACKET_COMBAT_SUPPORT,
  RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
  TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS,
} from './CombatRuleSupport';
import {
  remapMekStationSourceRef,
  remapMekStationSourceRefs,
} from './CombatSourceRefAnchorRemap';
import { SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT } from './CombatSpecialWeaponSupport';
import {
  TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT,
  TERRAIN_TYPE_HEAT_COMBAT_SUPPORT,
  TERRAIN_TYPE_LOS_COMBAT_SUPPORT,
  TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT,
  TERRAIN_TYPE_PSR_COMBAT_SUPPORT,
} from './CombatTerrainEnvironmentSupport';
import { BATTLEMECH_VALIDATION_SCOPE_SUPPORT } from './CombatValidationScopeSupport';

export type CombatRequirementAuthorityKind =
  | 'rulebook'
  | 'megamek-source'
  | 'mekhq-behavior'
  | 'mekstation-deviation';

export interface ICombatRequirementPrimaryAuthority {
  readonly kind: CombatRequirementAuthorityKind;
  readonly citation: string;
  readonly rationale: string;
}

export interface ICombatRequirementSupportEntry extends ICombatFeatureSupportEntry {
  readonly primaryAuthority: ICombatRequirementPrimaryAuthority;
  readonly supportMapRefs: readonly string[];
}

export const MEGAMEK_EQUIPMENT_DATA_AUTHORITY = {
  kind: 'megamek-source',
  citation:
    'MegaMek/mm-data equipment records plus MekStation catalog import contracts',
  rationale:
    'Official equipment coverage is a data-provenance requirement before combat rules can be applied.',
} satisfies ICombatRequirementPrimaryAuthority;

export const MEGAMEK_TACTICAL_SOURCE_AUTHORITY = {
  kind: 'megamek-source',
  citation:
    'MegaMek tactical source and API behavior used as executable BattleTech oracle',
  rationale:
    'The mechanic is pinned to executable MegaMek behavior where MekStation needs parity rather than product-only semantics.',
} satisfies ICombatRequirementPrimaryAuthority;

export const MEKHQ_CAMPAIGN_BEHAVIOR_AUTHORITY = {
  kind: 'mekhq-behavior',
  citation: 'MekHQ campaign maintenance and repair-cycle behavior',
  rationale:
    'Campaign quirks such as Rugged are MekHQ campaign behavior, not tabletop combat critical-hit prevention rules.',
} satisfies ICombatRequirementPrimaryAuthority;

export const RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY = {
  kind: 'rulebook',
  citation:
    'BattleTech Total Warfare / BattleMech Manual core BattleMech combat rules',
  rationale:
    'Canonical tabletop BattleMech rules define the combat behavior; implementation evidence proves local wiring only.',
} satisfies ICombatRequirementPrimaryAuthority;

export const MEKSTATION_VALIDATION_CONTRACT_AUTHORITY = {
  kind: 'mekstation-deviation',
  citation: 'MekStation combat-validation suite and OpenSpec scope contracts',
  rationale:
    'This row governs local catalog hygiene, product wiring, parity, or scope partitioning rather than a tabletop combat rule.',
} satisfies ICombatRequirementPrimaryAuthority;

export const MEKSTATION_LIFECYCLE_CONTRACT_AUTHORITY = {
  kind: 'mekstation-deviation',
  citation:
    'MekStation interactive/runner lifecycle semantics layered over tabletop outcomes',
  rationale:
    'The tabletop outcome exists, but target filtering, event emission, turn rotation, objectives, and network parity are MekStation product contracts.',
} satisfies ICombatRequirementPrimaryAuthority;

export const MEGAMEK_EJECTION_LIFECYCLE_SOURCE_REFS = [
  combatFeatureSourceRef(
    'megamek-source',
    'MovePathHandler routes manual EJECT movement into ejectEntity handling.',
    'https://github.com/MegaMek/megamek/blob/6ca18676725d273f6b96a3fe5bdd9ecda22c2811/megamek/src/megamek/server/totalWarfare/MovePathHandler.java#L177-L215',
    '6ca18676725d273f6b96a3fe5bdd9ecda22c2811',
  ),
  combatFeatureSourceRef(
    'megamek-source',
    'TWGameManager.ejectEntity marks crew ejected, creates the ejected crew entity, destroys the original unit, and removes it with REMOVE_EJECTED for manual ejection.',
    'https://github.com/MegaMek/megamek/blob/6ca18676725d273f6b96a3fe5bdd9ecda22c2811/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L28991-L29232',
    '6ca18676725d273f6b96a3fe5bdd9ecda22c2811',
  ),
  combatFeatureSourceRef(
    'megamek-source',
    'ServerReportsHelper separates active unit, ejected unit, and ejected crew counts after combat.',
    'https://github.com/MegaMek/megamek/blob/6ca18676725d273f6b96a3fe5bdd9ecda22c2811/megamek/src/megamek/server/ServerReportsHelper.java#L46-L89',
    '6ca18676725d273f6b96a3fe5bdd9ecda22c2811',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const COMBAT_REQUIREMENT_PRIMARY_AUTHORITIES = {
  'official-ranged-weapons': MEGAMEK_EQUIPMENT_DATA_AUTHORITY,
  'official-physical-weapons': MEGAMEK_EQUIPMENT_DATA_AUTHORITY,
  'official-ammo': MEGAMEK_EQUIPMENT_DATA_AUTHORITY,
  'weapon-stat-mapping': MEGAMEK_EQUIPMENT_DATA_AUTHORITY,
  'special-weapon-families': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'fallback-prevention': MEKSTATION_VALIDATION_CONTRACT_AUTHORITY,
  'damage-string-hazards': MEGAMEK_EQUIPMENT_DATA_AUTHORITY,
  'movement-actions': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'movement-validation': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'movement-enhancements': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'heat-generation': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'heat-dissipation': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'heat-lifecycle': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'heat-driven-modifiers': MEGAMEK_TACTICAL_SOURCE_AUTHORITY,
  'range-validation': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'attack-invalidation': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'to-hit-core-modifiers': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'to-hit-advanced-modifiers': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'terrain-movement-los-cover': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'terrain-environment-modifiers': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'physical-core-actions': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'physical-weapon-actions': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'physical-self-risk': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'pilot-skills': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'spa-quirk-catalog': MEGAMEK_TACTICAL_SOURCE_AUTHORITY,
  'spa-quirk-resolver-application': MEKSTATION_VALIDATION_CONTRACT_AUTHORITY,
  'campaign-quirk-behavior': MEKHQ_CAMPAIGN_BEHAVIOR_AUTHORITY,
  'damage-resolution': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'critical-effects': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'pilot-damage-death': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'psr-resolution': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'psr-trigger-catalog': RULEBOOK_BATTLEMECH_COMBAT_AUTHORITY,
  'turn-rotation-removal': MEKSTATION_LIFECYCLE_CONTRACT_AUTHORITY,
  'targetability-lifecycle': MEKSTATION_LIFECYCLE_CONTRACT_AUTHORITY,
  'ejection-lifecycle': MEKSTATION_LIFECYCLE_CONTRACT_AUTHORITY,
  'retreat-withdrawal': MEKSTATION_LIFECYCLE_CONTRACT_AUTHORITY,
  'objective-terminal-state': MEKSTATION_LIFECYCLE_CONTRACT_AUTHORITY,
  'runner-interactive-parity': MEKSTATION_LIFECYCLE_CONTRACT_AUTHORITY,
  'event-stream': MEKSTATION_VALIDATION_CONTRACT_AUTHORITY,
  'critical-slot-hydration': MEGAMEK_EQUIPMENT_DATA_AUTHORITY,
  'known-limitation-audit': MEKSTATION_VALIDATION_CONTRACT_AUTHORITY,
  'non-battlemech-scope': MEKSTATION_VALIDATION_CONTRACT_AUTHORITY,
} satisfies Record<string, ICombatRequirementPrimaryAuthority>;

export type CombatRequirementId =
  keyof typeof COMBAT_REQUIREMENT_PRIMARY_AUTHORITIES;
