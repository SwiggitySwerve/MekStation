/**
 * Explicit support matrix for combat-active pilot SPAs and mech quirks.
 *
 * The catalog validation suite uses this as the line between implemented
 * behavior and known feature gaps. Adding a combat-active SPA or quirk without
 * updating this file should fail fast instead of letting a broad
 * known-limitation filter hide the missing rule.
 */

import {
  MEGAMEK_AMMO_EXPLOSION_PILOT_DAMAGE_SOURCE_REFS,
  MEGAMEK_CONSCIOUSNESS_TOUGHNESS_SOURCE_REFS,
  MEKSTATION_CONSCIOUSNESS_TOUGHNESS_DEVIATION_SOURCE_REFS,
  MEKSTATION_RPG_TOUGHNESS_PREBATTLE_SOURCE_REFS,
} from './CombatConsciousnessSourceRefs';
import {
  MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
  MEKSTATION_EDGE_TRIGGER_HELPER_SOURCE_REFS,
} from './CombatEdgeSourceRefs';
import {
  combatFeatureSourceRef,
  type CombatFeatureSourceKind,
  ICombatFeatureSourceReference,
} from './CombatFeatureSourceReference';
import {
  helperOnly,
  integrated,
  outOfScope,
  unsupported,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport.core';
import {
  MEGAMEK_HEAVY_LIFTER_SOURCE_REFS,
  MEKSTATION_HEAVY_LIFTER_HELPER_SOURCE_REFS,
} from './CombatHeavyLifterSourceRefs';
import {
  MEGAMEK_BLOOD_STALKER_SOURCE_REFS,
  MEGAMEK_CLUSTER_HITTER_SOURCE_REFS,
  MEGAMEK_FORWARD_OBSERVER_SOURCE_REFS,
  MEGAMEK_GUNNERY_SPECIALIST_SOURCE_REFS,
  MEGAMEK_MELEE_SPECIALIST_SOURCE_REFS,
  MEGAMEK_OBLIQUE_ATTACKER_SOURCE_REFS,
  MEGAMEK_RANGE_MASTER_SOURCE_REFS,
  MEGAMEK_SNIPER_SOURCE_REFS,
  MEGAMEK_TERRAIN_MASTER_GAP_SOURCE_REFS,
  MEGAMEK_WEAPON_SPECIALIST_SOURCE_REFS,
  MEKSTATION_MARKSMAN_CALLED_SHOT_SOURCE_REFS,
  MEKSTATION_MELEE_MASTER_DEVIATION_SOURCE_REFS,
  MEKSTATION_SHARPSHOOTER_CALLED_SHOT_SOURCE_REFS,
} from './CombatLegacyPilotAbilitySourceRefs';
import {
  MEGAMEK_ANTI_MEK_ACTUATOR_SOURCE_REFS,
  MEGAMEK_BATTLE_FISTS_SOURCE_REFS,
  MEGAMEK_CRAMPED_COCKPIT_SOURCE_REFS,
  MEGAMEK_EASY_TO_PILOT_SOURCE_REFS,
  MEGAMEK_HARD_TO_PILOT_SOURCE_REFS,
  MEGAMEK_LOW_ARMS_GAP_SOURCE_REFS,
  MEGAMEK_NO_ARMS_SOURCE_REFS,
  MEGAMEK_STABLE_PSR_SOURCE_REFS,
  MEGAMEK_UNBALANCED_SOURCE_REFS,
  MEKHQ_RUGGED_SOURCE_REFS,
} from './CombatLegacyQuirkSourceRefs';
import {
  MEGAMEK_CROSS_COUNTRY_SOURCE_REFS,
  MEGAMEK_DISTRACTING_QUIRK_SOURCE_REFS,
  MEGAMEK_HOT_DOG_HEAT_ROLL_SOURCE_REFS,
  MEGAMEK_INITIATIVE_QUIRK_SOURCE_REFS,
  MEGAMEK_LOW_PROFILE_GLANCING_SOURCE_REFS,
  MEGAMEK_MULTI_TRAC_SOURCE_REFS,
  MEKSTATION_DISTRACTING_TO_HIT_DEVIATION_SOURCE_REFS,
  MEKSTATION_LOCAL_ONLY_SPA_SOURCE_REFS,
  MEKSTATION_LOW_PROFILE_TO_HIT_DEVIATION_SOURCE_REFS,
  MEGAMEK_SANDBLASTER_SOURCE_REFS,
  MEGAMEK_SENSOR_GHOSTS_TO_HIT_SOURCE_REFS,
  MEGAMEK_SHAKY_STICK_SOURCE_REFS,
  MEGAMEK_SOME_LIKE_IT_HOT_HEAT_TO_HIT_SOURCE_REFS,
  MEGAMEK_TACTICAL_GENIUS_SOURCE_REFS,
  MEGAMEK_TARGETING_QUIRK_TO_HIT_SOURCE_REFS,
  MEGAMEK_WEAPON_COOLING_QUIRK_SOURCE_REFS,
  MEGAMEK_WEAPON_TO_HIT_QUIRK_SOURCE_REFS,
  MEKSTATION_TARGETING_QUIRK_ALIAS_SOURCE_REFS,
} from './CombatPilotModifierSourceRefs';
import { remapMekStationSourceRefs } from './CombatSourceRefAnchorRemap';
import {
  MEGAMEK_ACTIVE_PROBE_SOURCE_REFS,
  MEGAMEK_AMS_SOURCE_REFS,
  MEGAMEK_ARTEMIS_CLUSTER_SOURCE_REFS,
  MEGAMEK_ARTEMIS_FCS_SOURCE_REFS,
  MEGAMEK_ECM_SUITE_SOURCE_REFS,
  MEGAMEK_LBX_SOURCE_REFS,
  MEGAMEK_MML_SOURCE_REFS,
  MEGAMEK_NARC_FAMILY_SOURCE_REFS,
  MEGAMEK_INARC_POD_OBJECT_SOURCE_REFS,
  MEGAMEK_PLASMA_CANNON_SOURCE_REFS,
  MEGAMEK_RAC_SOURCE_REFS,
  MEGAMEK_STEALTH_ACTIVE_SOURCE_REFS,
  MEGAMEK_STREAK_SRM_SOURCE_REFS,
  MEGAMEK_TAG_FAMILY_SOURCE_REFS,
  MEGAMEK_UAC_SOURCE_REFS,
} from './CombatSpecialWeaponSourceRefs';

const BMM_ERRATA_701_LANCE_TO_HIT = combatFeatureSourceRef(
  'rulebook',
  'BattleMech Manual Errata v7.01 Physical Weapon Attacks Table changes Lance to-hit modifier to +1',
  'https://battletech.com/wp-content/uploads/2025/06/78_BattleMech-Manual-2023-09-17-v7.01-3.pdf',
  'v7.01',
);

const MEGAMEK_6CA1867_PHYSICAL_WEAPON_DAMAGE = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek ClubAttackAction.getDamageFor applies physical weapon damage formulas including sword ceil(weight/10)+1, mace ceil(weight/4), and retractable blade ceil(weight/10)',
  'https://github.com/MegaMek/megamek/blob/6ca18676725d273f6b96a3fe5bdd9ecda22c2811/megamek/src/megamek/common/actions/ClubAttackAction.java#L91-L182',
  '6ca18676725d273f6b96a3fe5bdd9ecda22c2811',
);

const MEGAMEK_6CA1867_PHYSICAL_WEAPON_TO_HIT = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek ClubAttackAction.getHitModFor returns hatchet -1, sword -2, mace +1, lance +1, and retractable blade -2 physical weapon modifiers',
  'https://github.com/MegaMek/megamek/blob/6ca18676725d273f6b96a3fe5bdd9ecda22c2811/megamek/src/megamek/common/actions/ClubAttackAction.java#L218-L251',
  '6ca18676725d273f6b96a3fe5bdd9ecda22c2811',
);

const MEGAMEK_6CA1867_RETRACTABLE_BLADE_MODE_GATE = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek ClubAttackAction.toHit rejects retractable blade attacks unless the blade is extended',
  'https://github.com/MegaMek/megamek/blob/6ca18676725d273f6b96a3fe5bdd9ecda22c2811/megamek/src/megamek/common/actions/ClubAttackAction.java#L329-L332',
  '6ca18676725d273f6b96a3fe5bdd9ecda22c2811',
);

const MEGAMEK_325B_FLAIL_WRECKING_DAMAGE = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek ClubAttackAction.getDamageFor applies constant 9 flail damage and constant 8 wrecking ball damage, and excludes both from active TSM doubling',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/ClubAttackAction.java#L112-L205',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

const MEGAMEK_325B_FLAIL_WRECKING_TO_HIT = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek ClubAttackAction.getHitModFor returns flail +0 and wrecking ball +1 physical weapon modifiers',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/ClubAttackAction.java#L227-L245',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

const MEGAMEK_325B_FLAIL_WRECKING_LEGALITY = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek ClubAttackAction.toHit lets flail and wrecking ball attacks avoid hand-actuator requirements, rejects flails on quads, and allows wrecking balls on quads',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/ClubAttackAction.java#L300-L520',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

const MEGAMEK_325B_TALON_KICK_DAMAGE = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek KickAttackAction.getDamageFor applies a 1.5 talon multiplier when the kicking leg has working talons and a working foot actuator, mapping quad front kicks to arm locations',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/KickAttackAction.java#L95-L122',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

const MEGAMEK_325B_TALON_DFA_DAMAGE = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek DfaAttackAction.getDamageFor multiplies DFA target damage by 1.5 when hasTalons is true, and hasTalons requires a working talon plus foot actuator on a qualifying leg',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/DfaAttackAction.java#L95-L104',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

const MEGAMEK_325B_TALON_DFA_LEG_GATE = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek DfaAttackAction.hasTalons checks working talons and working foot actuators on biped legs plus non-biped leg and arm-location paths',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/DfaAttackAction.java#L427-L445',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

const MEGAMEK_325B_MOUNTED_READY_DAMAGED_GATE = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek Mounted.isReady excludes destroyed, missing, and breached/useless mounts from working equipment checks',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/equipment/Mounted.java#L590-L632',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

const MEGAMEK_325B_DESTROY_LOCATION_MISSING_MOUNT_GATE = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek Entity.destroyLocation marks blown-off critical slots, mounted equipment, and dependent locations missing',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L11864-L11939',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

const MEGAMEK_325B_CLAW_PUNCH_DAMAGE = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek PunchAttackAction.getDamageFor uses ceil(weight / 7) when the punching arm has working claws',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/PunchAttackAction.java#L390-L405',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

const MEGAMEK_325B_CLAW_PUNCH_TO_HIT = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek PunchAttackAction.toHit adds the claw punch modifier outside PLAYTEST_3, records a zero-value Using Claws modifier under PLAYTEST_3, and suppresses hand actuator missing/destroyed penalties when claws replace the hand',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/PunchAttackAction.java#L309-L333',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

const MEGAMEK_325B_CLAW_EQUIPMENT_GATE = combatFeatureSourceRef(
  'megamek-source',
  'MegaMek Mek.hasClaw checks arm critical slots for a non-destroyed, non-missing, non-breached hand-weapon claw mount',
  'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Mek.java#L6146-L6165',
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
);

export const PHYSICAL_WEAPON_COMBAT_SUPPORT = {
  hatchet: integrated(
    'hatchet',
    'source-backed calculateHatchetDamage + -1 hatchet to-hit modifier',
    [
      MEGAMEK_6CA1867_PHYSICAL_WEAPON_DAMAGE,
      MEGAMEK_6CA1867_PHYSICAL_WEAPON_TO_HIT,
    ],
  ),
  sword: integrated(
    'sword',
    'source-backed calculateSwordDamage + -2 sword to-hit modifier',
    [
      MEGAMEK_6CA1867_PHYSICAL_WEAPON_DAMAGE,
      MEGAMEK_6CA1867_PHYSICAL_WEAPON_TO_HIT,
    ],
  ),
  mace: integrated(
    'mace',
    'source-backed calculateMaceDamage + +1 mace to-hit modifier',
    [
      MEGAMEK_6CA1867_PHYSICAL_WEAPON_DAMAGE,
      MEGAMEK_6CA1867_PHYSICAL_WEAPON_TO_HIT,
    ],
  ),
  lance: integrated(
    'lance',
    'source-backed calculateLanceDamage + +1 lance to-hit modifier',
    [
      BMM_ERRATA_701_LANCE_TO_HIT,
      MEGAMEK_6CA1867_PHYSICAL_WEAPON_DAMAGE,
      MEGAMEK_6CA1867_PHYSICAL_WEAPON_TO_HIT,
    ],
  ),
  'retractable-blade': integrated(
    'retractable-blade',
    'source-backed calculateRetractableBladeDamage + -2 retractable blade to-hit modifier plus optional extended-mode legality gate',
    [
      MEGAMEK_6CA1867_PHYSICAL_WEAPON_DAMAGE,
      MEGAMEK_6CA1867_PHYSICAL_WEAPON_TO_HIT,
      MEGAMEK_6CA1867_RETRACTABLE_BLADE_MODE_GATE,
    ],
  ),
  talons: integrated(
    'talons',
    'Official physical catalog entry Talons is represented as source-backed kick and DFA modifier equipment, not as a standalone runtime PhysicalAttackType; damage helpers apply the +50% talon modifier from explicit biped leg or quad/non-biped arm-location state, UnitHydration critical-slot state, destroyed/missing/breached equipment critical events, or destroyed location state, while remaining mounted-equipment lifecycle gaps are tracked under talon-equipment-lifecycle',
    [
      MEGAMEK_325B_TALON_KICK_DAMAGE,
      MEGAMEK_325B_TALON_DFA_DAMAGE,
      MEGAMEK_325B_TALON_DFA_LEG_GATE,
      MEGAMEK_325B_MOUNTED_READY_DAMAGED_GATE,
      MEGAMEK_325B_DESTROY_LOCATION_MISSING_MOUNT_GATE,
    ],
  ),
  claws: integrated(
    'claws',
    'Official physical catalog entry Claws is represented as source-backed punch modifier equipment, not as a standalone runtime PhysicalAttackType; punch damage/to-hit helpers apply claw modifiers from explicit state, UnitHydration arm critical-slot state, destroyed/missing/breached equipment critical events, or destroyed arm location state, PLAYTEST_3 removes only the claw punch to-hit penalty while preserving claw punch damage, and remaining mounted-equipment lifecycle gaps are tracked under claw-equipment-lifecycle',
    [
      MEGAMEK_325B_CLAW_PUNCH_DAMAGE,
      MEGAMEK_325B_CLAW_PUNCH_TO_HIT,
      MEGAMEK_325B_CLAW_EQUIPMENT_GATE,
      MEGAMEK_325B_DESTROY_LOCATION_MISSING_MOUNT_GATE,
    ],
  ),
  flail: integrated(
    'flail',
    'source-backed calculateFlailDamage + 0 flail to-hit modifier plus no-hand and quad legality gates',
    [
      MEGAMEK_325B_FLAIL_WRECKING_DAMAGE,
      MEGAMEK_325B_FLAIL_WRECKING_TO_HIT,
      MEGAMEK_325B_FLAIL_WRECKING_LEGALITY,
    ],
  ),
  'wrecking-ball': integrated(
    'wrecking-ball',
    'source-backed calculateWreckingBallDamage + +1 wrecking ball to-hit modifier plus torso-mounted arm/quad legality gates',
    [
      MEGAMEK_325B_FLAIL_WRECKING_DAMAGE,
      MEGAMEK_325B_FLAIL_WRECKING_TO_HIT,
      MEGAMEK_325B_FLAIL_WRECKING_LEGALITY,
    ],
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
