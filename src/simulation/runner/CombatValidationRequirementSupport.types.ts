/* eslint-disable max-lines -- Requirement crosswalk intentionally catalogs the full active combat-validation scope. */
import { combatFeatureSourceRef } from './CombatFeatureSourceReference';
import {
  type ICombatFeatureSourceReference,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

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
