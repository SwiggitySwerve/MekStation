import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

import {
  CANONICAL_DERMAL_ARMOR_HEAD_HIT_SOURCE_REFS,
  CANONICAL_DFA_FALL_PILOT_DAMAGE_IMMUNITY_SOURCE_REFS,
  CANONICAL_SPA_COMBAT_SCOPE_SUPPORT,
} from './CombatCanonicalSpaSupport';
import {
  MEGAMEK_CONSCIOUSNESS_TOUGHNESS_SOURCE_REFS,
  MEKSTATION_CONSCIOUSNESS_TOUGHNESS_DEVIATION_SOURCE_REFS,
  MEKSTATION_RPG_TOUGHNESS_PREBATTLE_SOURCE_REFS,
} from './CombatConsciousnessSourceRefs';
import {
  MEKSTATION_EDGE_EXPLOSION_SOURCE_REFS,
  MEKSTATION_EDGE_HEAD_HIT_SOURCE_REFS,
  MEKSTATION_EDGE_KO_SOURCE_REFS,
  MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
  MEKSTATION_EDGE_MASC_SUPERCHARGER_SOURCE_REFS,
  MEKSTATION_EDGE_TAC_SOURCE_REFS,
  MEKSTATION_EDGE_TRIGGER_HELPER_SOURCE_REFS,
} from './CombatEdgeSourceRefs';
import {
  MEKSTATION_HEAVY_LIFTER_CARRY_OBJECT_CAPACITY_SOURCE_REFS,
  MEKSTATION_HEAVY_LIFTER_CARRY_OBJECT_ACTION_SOURCE_REFS,
  MEGAMEK_HEAVY_LIFTER_SOURCE_REFS,
  MEKSTATION_HEAVY_LIFTER_GROUND_OBJECT_WEIGHT_GATE_SOURCE_REFS,
  MEKSTATION_HEAVY_LIFTER_HELPER_SOURCE_REFS,
  MEKSTATION_HEAVY_LIFTER_THROW_RELEASE_SOURCE_REFS,
} from './CombatHeavyLifterSourceRefs';
import {
  MEGAMEK_CLUSTER_HITTER_SOURCE_REFS,
  MEGAMEK_FORWARD_OBSERVER_SOURCE_REFS,
  MEGAMEK_MELEE_SPECIALIST_SOURCE_REFS,
  MEGAMEK_NIGHTWALKER_SOURCE_REFS,
  MEGAMEK_OBLIQUE_ATTACKER_SOURCE_REFS,
  MEKSTATION_MELEE_MASTER_DEVIATION_SOURCE_REFS,
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
  MEGAMEK_CALLED_SHOT_SOURCE_REFS,
  MEGAMEK_COMM_IMPLANT_INDIRECT_FIRE_SOURCE_REFS,
  MEGAMEK_CROSS_COUNTRY_SOURCE_REFS,
  MEGAMEK_DISTRACTING_QUIRK_SOURCE_REFS,
  MEGAMEK_HOT_DOG_HEAT_ROLL_SOURCE_REFS,
  MEGAMEK_INITIATIVE_EQUIPMENT_SOURCE_REFS,
  MEGAMEK_INITIATIVE_QUIRK_SOURCE_REFS,
  MEGAMEK_LOW_PROFILE_GLANCING_SOURCE_REFS,
  MEGAMEK_MULTI_TRAC_SOURCE_REFS,
  MEGAMEK_PSR_SPA_SOURCE_REFS,
  MEKSTATION_DEFENSIVE_QUIRK_TO_HIT_DEVIATION_SOURCE_REFS,
  MEKSTATION_LOCAL_ONLY_SPA_SOURCE_REFS,
  MEGAMEK_SANDBLASTER_SOURCE_REFS,
  MEGAMEK_SECONDARY_TARGET_MULTI_TASKER_SOURCE_REFS,
  MEGAMEK_SENSOR_GHOSTS_TO_HIT_SOURCE_REFS,
  MEGAMEK_SHAKY_STICK_SOURCE_REFS,
  MEGAMEK_SOME_LIKE_IT_HOT_HEAT_TO_HIT_SOURCE_REFS,
  MEGAMEK_TACTICAL_GENIUS_SOURCE_REFS,
  MEGAMEK_TERRAIN_MASTER_DEFENSIVE_TO_HIT_SOURCE_REFS,
  MEGAMEK_TRIPLE_CORE_PROCESSOR_SOURCE_REFS,
  MEGAMEK_TARGETING_QUIRK_TO_HIT_SOURCE_REFS,
  MEGAMEK_BVDNI_NEURAL_FEEDBACK_SOURCE_REFS,
  MEGAMEK_PROTO_DNI_TARGET_NUMBER_SOURCE_REFS,
  MEGAMEK_VDNI_NEURAL_FEEDBACK_SOURCE_REFS,
  MEGAMEK_VDNI_TARGET_NUMBER_SOURCE_REFS,
  MEGAMEK_WEAPON_COOLING_QUIRK_SOURCE_REFS,
  MEGAMEK_WEAPON_TO_HIT_QUIRK_SOURCE_REFS,
} from './CombatPilotModifierSourceRefs';

const MEGAMEK_EAGLE_EYES_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

const MEKSTATION_EAGLE_EYES_ACTIVE_PROBE_RANGE_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Entity.getBAPRange adds a +1 active-probe range bonus when the pilot has MISC_EAGLE_EYES.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_EAGLE_EYES_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L6033-L6056`,
    sourceVersion: MEGAMEK_EAGLE_EYES_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation represented active-probe ECM counter range accepts eagleEyesRangeBonus and adds one hex without changing base probe ranges.',
    url: 'src/utils/gameplay/electronicWarfare/probes.ts#L20-L37',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation createInitialState seeds eagleEyesRangeBonus from hydrated fullUnit ability ids for represented active-probe state.',
    url: 'src/simulation/runner/SimulationRunnerState.ts#L120-L131',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation electronic warfare coverage proves Eagle Eyes extends represented active-probe Guardian ECM countering by one hex.',
    url: 'src/utils/gameplay/__tests__/electronicWarfare.test.ts#L493-L547',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation GameCreated coverage proves hydrated eagle_eyes ability state is projected onto active probes as eagleEyesRangeBonus.',
    url: 'src/simulation/runner/__tests__/SimulationRunner.gameCreated.test.ts#L283-L321',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_EAGLE_EYES_MINEFIELD_DETONATION_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek TWGameManager adds +2 to minefield detonation target numbers when an entity has MISC_EAGLE_EYES.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_EAGLE_EYES_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L7498-L7506`,
    sourceVersion: MEGAMEK_EAGLE_EYES_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation represented TerrainType.Mines entry damage resolves a deterministic minefield detonation target roll and applies Eagle Eyes +2 target-number relief before BattleMech leg damage.',
    url: 'src/simulation/runner/phases/movementMines.ts#L38-L119',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation movement behavior coverage proves Eagle Eyes prevents represented minefield detonation on a roll that would detonate without the SPA.',
    url: 'src/simulation/runner/__tests__/movementPhase.behavior.test.ts#L1917-L1965',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_TRIPLE_CORE_PROCESSOR_AIMED_SHOT_SOURCE_REFS = [
  ...MEGAMEK_TRIPLE_CORE_PROCESSOR_SOURCE_REFS.filter(
    ({ citation }) =>
      citation.includes('AimedShot') || citation.includes('aimed-shot'),
  ),
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation buildWeaponAttackAttackerToHitState grants represented targeting-computer eligibility for called-shot attacks only when Triple-Core Processor is paired with VDNI or Buffered VDNI.',
    url: 'src/utils/gameplay/toHit/stateHydration.ts#L36-L52',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation shared to-hit state hydration tests prove Triple-Core Processor plus VDNI grants called-shot targeting-computer eligibility and fails closed without called-shot intent or neural-interface pairing.',
    url: 'src/utils/gameplay/toHit/__tests__/stateHydration.test.ts#L61-L99',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation interactive declareAttack coverage proves Triple-Core Processor plus VDNI applies both the TacOps called-shot penalty and represented Targeting Computer -1 relief.',
    url: 'src/utils/gameplay/__tests__/declareAttack.toHitStateHydration.test.ts#L487-L528',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation runner weapon-attack coverage proves Triple-Core Processor plus Buffered VDNI applies both the TacOps called-shot penalty and represented Targeting Computer -1 relief in AttackDeclared events.',
    url: 'src/simulation/runner/__tests__/weaponAttackToHitModifiers.behavior.test.ts#L2377-L2425',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

const MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

const MEGAMEK_ENV_SPECIALIST_RANGED_TO_HIT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Crew registers Environmental Specialist constants for Fog, Hail, Light, Rain, Snow, and Wind; ranged runtime consumes Fog, Light, Rain, Snow, and Wind branches only.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/units/Crew.java#L161-L168`,
    sourceVersion: MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek ComputeAbilityMods applies Snow Environmental Specialist as a -1 ranged to-hit modifier under represented snow weather branches.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L209-L224`,
    sourceVersion: MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation calculateEnvironmentalSpecialistRangedToHitModifier consumes env_specialist plus explicit snow designation only for represented snow precipitation ranged to-hit relief.',
    url: 'src/utils/gameplay/environmentalModifiers.ts#L344-L366',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation runAttackPhase threads attacker abilities and designatedEnvironment into existing environmental ranged to-hit modifier calculation.',
    url: 'src/simulation/runner/phases/weaponAttack.ts#L1072-L1081',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_ENV_SPECIALIST_FOG_RANGED_TO_HIT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Crew registers Environmental Specialist constants for Fog, Hail, Light, Rain, Snow, and Wind; ranged runtime consumes Fog, Light, Rain, Snow, and Wind branches only.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/units/Crew.java#L161-L168`,
    sourceVersion: MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek ComputeAbilityMods applies Fog Environmental Specialist as a -1 ranged to-hit modifier for energy weapons against non-spaceborne targets in heavy fog.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L171-L179`,
    sourceVersion: MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation calculateEnvironmentalSpecialistRangedToHitModifier consumes env_specialist plus explicit fog designation only for represented heavy_fog energy-weapon ranged to-hit relief.',
    url: 'src/utils/gameplay/environmentalModifiers.ts#L344-L392',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation runAttackPhase threads weapon energy classification, attacker abilities, and designatedEnvironment into existing environmental ranged to-hit modifier calculation.',
    url: 'src/simulation/runner/phases/weaponAttack.ts#L1072-L1081',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_ENV_SPECIALIST_RAIN_RANGED_TO_HIT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Crew registers Environmental Specialist constants for Fog, Hail, Light, Rain, Snow, and Wind; ranged runtime consumes Fog, Light, Rain, Snow, and Wind branches only.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/units/Crew.java#L161-L168`,
    sourceVersion: MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek ComputeAbilityMods applies Rain Environmental Specialist as a -1 ranged to-hit modifier for moderate-or-heavier rain, while light rain is conventional-infantry-only.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L195-L207`,
    sourceVersion: MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation calculateEnvironmentalSpecialistRangedToHitModifier consumes env_specialist plus explicit rain designation only for represented heavy_rain ranged to-hit relief.',
    url: 'src/utils/gameplay/environmentalModifiers.ts#L344-L381',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation runAttackPhase threads attacker abilities and designatedEnvironment into existing environmental ranged to-hit modifier calculation.',
    url: 'src/simulation/runner/phases/weaponAttack.ts#L1072-L1081',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_ENV_SPECIALIST_WIND_RANGED_TO_HIT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Crew registers Environmental Specialist constants for Fog, Hail, Light, Rain, Snow, and Wind; ranged runtime consumes Fog, Light, Rain, Snow, and Wind branches only.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/units/Crew.java#L161-L168`,
    sourceVersion: MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek ComputeAbilityMods applies Wind Environmental Specialist as ranged to-hit relief for missile weapons in moderate gale, with stronger-wind branches requiring additional weapon-category or storm-state gates.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L227-L244`,
    sourceVersion: MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation calculateEnvironmentalSpecialistRangedToHitModifier consumes env_specialist plus explicit wind designation only for represented moderate wind missile-weapon ranged to-hit relief.',
    url: 'src/utils/gameplay/environmentalModifiers.ts#L344-L405',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation runAttackPhase threads weapon missile classification, attacker abilities, and designatedEnvironment into existing environmental ranged to-hit modifier calculation.',
    url: 'src/simulation/runner/phases/weaponAttack.ts#L1072-L1081',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_ENV_SPECIALIST_LIGHT_RANGED_TO_HIT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Crew registers Environmental Specialist constants for Fog, Hail, Light, Rain, Snow, and Wind; ranged runtime consumes Fog, Light, Rain, Snow, and Wind branches only.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/units/Crew.java#L161-L168`,
    sourceVersion: MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek ComputeAbilityMods applies Light Environmental Specialist as ranged to-hit relief for unilluminated targets in dusk, full moon, glare, moonless, solar flare, or pitch black light, and for illuminated targets in pitch black light.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L182-L191`,
    sourceVersion: MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation calculateEnvironmentalSpecialistRangedToHitModifier consumes env_specialist plus explicit Light designation only when represented target illumination state is present.',
    url: 'src/utils/gameplay/environmentalModifiers.ts#L364-L391',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation runAttackPhase threads explicit target illumination state into the environmental ranged to-hit modifier calculation.',
    url: 'src/simulation/runner/phases/weaponAttack.ts#L1072-L1082',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_ENV_SPECIALIST_PHYSICAL_TO_HIT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek physical attack modifiers consume Light Environmental Specialist for unilluminated targets in moonless, solar-flare, or pitch-black light.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION}/megamek/src/megamek/common/compute/Compute.java#L2731-L2742`,
    sourceVersion: MEGAMEK_ENV_SPECIALIST_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation calculateEnvironmentalSpecialistPhysicalToHitModifier consumes env_specialist plus explicit Light designation, dark environmental light, and target illumination state for represented physical to-hit relief.',
    url: 'src/utils/gameplay/environmentalModifiers.ts#L375-L399',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation calculatePhysicalToHit threads the represented Environmental Specialist Light physical modifier through physical attack helper paths without claiming movement, PSR, or full designation hydration parity.',
    url: 'src/utils/gameplay/physicalAttacks/toHit.ts#L178-L1037',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_ZWEIHANDER_PUNCH_SOURCE_REFS = [
  ...(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.zweihander.sourceRefs ?? []),
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation calculatePunchDamage and supported physical-weapon damage helpers consume canonical zweihander plus explicit two-handed declaration state for represented bonus damage.',
    url: 'src/utils/gameplay/physicalAttacks/damage.ts#L98-L230',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation canPunch and canMeleeWeapon reject explicit two-handed Zweihander declarations unless the represented SPA, non-prone, both-arm-present, represented per-arm hand-actuator, selected-arm physical-weapon, and represented arm-fire prerequisites pass.',
    url: 'src/utils/gameplay/physicalAttacks/restrictions.ts#L666-L751',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation calculatePunchToHit and calculateMeleeWeaponToHit consume represented per-location off-arm upper and lower actuator damage as two-handed Zweihander to-hit penalties.',
    url: 'src/utils/gameplay/physicalAttacks/toHit.ts#L178-L454',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation getPhysicalMissConsequences queues the represented Zweihander punch and supported physical-weapon miss PSR plus represented self-critical side-effect consequences only when the explicit two-handed declaration and canonical SPA are present.',
    url: 'src/utils/gameplay/physicalAttacks/damage.ts#L789-L799',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation interactive physical declaration planning exposes the represented two-handed Zweihander prompt for punch and supported physical weapons and carries twoHandedZweihander into physical resolution.',
    url: 'src/utils/gameplay/gameSessionPhysical.ts#L585-L990',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation PhysicalAttackForecastModal renders the represented two-handed Zweihander checkbox and threads the selected declaration state through the physical attack plan store.',
    url: 'src/components/gameplay/PhysicalAttackForecastModal.tsx#L49-L195',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation physical attack plan state stores explicit two-handed Zweihander declarations for represented physical attack types and resets the flag for unsupported physical attack types.',
    url: 'src/stores/useGameplayStore.combatFlows.ts#L106-L598',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation runner physical attack declarations carry selected physical-weapon limbs and twoHandedZweihander into represented punch and supported physical-weapon legality, damage, declared-event, and selected-arm self-critical resolution.',
    url: 'src/simulation/runner/phases/physicalAttack.ts#L532-L871',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation physical combat tests prove represented Zweihander punch and supported physical-weapon bonus damage, selected-arm physical-weapon declaration legality, off-arm actuator to-hit penalties, per-arm hand-actuator gates, miss PSR behavior, represented self-critical side-effect behavior, and invalid declaration no-side-effect gating without claiming non-catalog improvised club or breakage fidelity.',
    url: 'src/utils/gameplay/__tests__/physicalAttacks.test.ts#L846-L5639',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_MANEUVERING_ACE_MOVEMENT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MovePath.canShift lets Maneuvering Ace biped Meks perform lateral shifts.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/moves/MovePath.java#L252-L266`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek SideStepStep preserves base lateral-step MP for QuadMek units with Maneuvering Ace instead of adding the normal side-step surcharge.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/moves/SideStepStep.java#L47-L57`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek ManeuverStep reduces aerospace maneuver thrust cost by 1 for Maneuvering Ace.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/moves/ManeuverStep.java#L60-L66`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Entity.checkSideSlip applies Maneuvering Ace relief to flanking-and-turning checks and suppresses controlled-sideslip checks for walking Maneuvering Ace units.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L11978-L11998`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek TWGameManager.getPilotingRollData applies -1 Maneuvering Ace to out-of-control control rolls without applying it to recovery rolls.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L16908-L16920`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek OptionsConstants defines PILOT_MANEUVERING_ACE as maneuvering_ace.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/options/OptionsConstants.java#L173-L180`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_MANEUVERING_ACE_LATERAL_MOVEMENT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MovePath.canShift lets Maneuvering Ace biped Meks perform lateral shifts.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/moves/MovePath.java#L252-L266`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek SideStepStep preserves base lateral-step MP for QuadMek units with Maneuvering Ace instead of adding the normal side-step surcharge.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/moves/SideStepStep.java#L47-L57`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek OptionsConstants defines PILOT_MANEUVERING_ACE as maneuvering_ace.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/options/OptionsConstants.java#L173-L180`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_MANEUVERING_ACE_BATTLEMECH_MOVEMENT_RESIDUAL_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MovePath.canShift lets Maneuvering Ace biped Meks perform lateral shifts.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/moves/MovePath.java#L252-L266`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek SideStepStep preserves base lateral-step MP for QuadMek units with Maneuvering Ace instead of adding the normal side-step surcharge.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/moves/SideStepStep.java#L47-L57`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Entity.checkSideSlip applies Maneuvering Ace relief to flanking-and-turning checks and suppresses controlled-sideslip checks for walking Maneuvering Ace units.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L11978-L11998`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek TWGameManager.getPilotingRollData applies -1 Maneuvering Ace to out-of-control control rolls without applying it to recovery rolls.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L16908-L16920`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek OptionsConstants defines PILOT_MANEUVERING_ACE as maneuvering_ace.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/options/OptionsConstants.java#L173-L180`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_MANEUVERING_ACE_CONTROLLED_SIDESLIP_SOURCE_REFS =
  MEGAMEK_MANEUVERING_ACE_BATTLEMECH_MOVEMENT_RESIDUAL_SOURCE_REFS.filter(
    ({ citation }) =>
      citation.includes('checkSideSlip') ||
      citation.includes('PILOT_MANEUVERING_ACE'),
  );

const MEKSTATION_MANEUVERING_ACE_CONTROLLED_SIDESLIP_SOURCE_REFS = [
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation movementControlPsr queues represented controlled-sideslip PSRs for lateral movement steps and suppresses walking Maneuvering Ace lateral shifts.',
    url: 'src/simulation/runner/phases/movementControlPsr.ts#L34-L91',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation runner movement coverage proves walking Maneuvering Ace lateral shifts suppress controlled-sideslip PSRs while running lateral shifts emit controlled_sideslip with a movement-step trigger source.',
    url: 'src/simulation/runner/__tests__/movementPhase.behavior.test.ts#L375-L436',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_MANEUVERING_ACE_FLANKING_TURNING_SOURCE_REFS = [
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation movementControlPsr queues one represented flanking-and-turning PSR for BattleMech run/sprint movement when movement-step decomposition changes facing after moving more than one hex, while excluding Infantry and ProtoMech units.',
    url: 'src/simulation/runner/phases/movementControlPsr.ts#L47-L221',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation runner movement coverage proves represented BattleMech flanking-and-turning production plus walking, straight-running, Infantry, and ProtoMech non-production cases.',
    url: 'src/simulation/runner/__tests__/movementPhase.behavior.test.ts#L464-L596',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_MANEUVERING_ACE_OUT_OF_CONTROL_PSR_SOURCE_REFS = [
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation createOutOfControlPSR plus calculatePSRModifiers and runPSRPhase consume Maneuvering Ace pilot ability state for represented out-of-control pending PSR target-number relief.',
    url: 'src/utils/gameplay/pilotingSkillRolls/systemFactories.ts#L111',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_MANEUVERING_ACE_OUT_OF_CONTROL_PRODUCER_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek TWGameManager.resolveControl resolves control rolls only for a single aero or airborne LAM in AirMek mode, returning before control-roll production for ordinary BattleMechs.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L16694-L16718`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek TWGameManager.getPilotingRollData applies -1 Maneuvering Ace to out-of-control control rolls without applying it to recovery rolls.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L16907-L16920`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MovePathHandler queues aero control rolls for thrust, velocity, descent, hover, and stall movement side paths.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/MovePathHandler.java#L569-L605`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek HeatResolver queues heat-driven control rolls for DropShip, JumpShip, and capital fighter heat side paths.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/HeatResolver.java#L1022-L1038`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek OptionsConstants defines PILOT_MANEUVERING_ACE as maneuvering_ace.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/options/OptionsConstants.java#L173-L180`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
  ...MEKSTATION_MANEUVERING_ACE_OUT_OF_CONTROL_PSR_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_MANEUVERING_ACE_AEROSPACE_MOVEMENT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek ManeuverStep reduces aerospace maneuver thrust cost by 1 for Maneuvering Ace.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/moves/ManeuverStep.java#L60-L66`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek OptionsConstants defines PILOT_MANEUVERING_ACE as maneuvering_ace.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/options/OptionsConstants.java#L173-L180`,
    sourceVersion: MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_MANEUVERING_ACE_MOVEMENT_SOURCE_REFS = [
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation validateMovement, runMovementPhase, and movement step decomposition consume Maneuvering Ace pilot ability state for biped lateral shifts and source-backed QuadMek lateral-step MP relief.',
    url: 'src/utils/gameplay/movement/validation.ts#L50',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_NIGHTWALKER_LIGHT_MOVEMENT_SOURCE_REFS = [
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation getMovementStepCostBreakdown consumes tm_nightwalker to waive represented low-light movement penalties, including full moon, glare, moonless, solar flare, and pitch black, and fail-closed prohibit run-derived movement in represented low light.',
    url: 'src/utils/gameplay/movement/calculations.ts#L466-L486',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation runner movement coverage proves represented low-light movement penalties, tm_nightwalker relief, and Nightwalker run prohibition before movement is committed for legacy and MegaMek light states.',
    url: 'src/simulation/runner/__tests__/movementPhase.behavior.test.ts#L692-L752',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation reachable movement coverage proves represented low-light Nightwalker movement relief and run prohibition in projection and commit validation paths for legacy and MegaMek light states.',
    url: 'src/utils/gameplay/movement/__tests__/reachable.test.ts#L3423-L3491',
    sourceVersion: 'MekStation working-tree',
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation reachable and commit movement coverage proves represented airborne LAM AirMek units with tm_nightwalker remain blocked from low-light ground projection before Nightwalker relief can apply.',
    url: 'src/utils/gameplay/movement/__tests__/reachable.test.ts#L3493-L3557',
    sourceVersion: 'MekStation working-tree',
  },
] satisfies readonly ICombatFeatureSourceReference[];

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

export interface IPilotModifierResolverAssignment {
  readonly spaIds: readonly string[];
  readonly quirkIds: readonly string[];
}

const RANGED_TO_HIT_SPA_IDS = [
  'weapon-specialist',
  'gunnery-specialist',
  'sniper',
  'blood-stalker',
  'multi-tasker',
  'range-master',
  'hopping-jack',
  'jumping-jack',
  'dodge-maneuver',
  'shaky_stick',
  'tm_forest_ranger',
  'tm_swamp_beast',
] as const;

const RANGED_TO_HIT_QUIRK_IDS = [
  'improved_targeting_short',
  'improved_targeting_medium',
  'improved_targeting_long',
  'poor_targeting_short',
  'poor_targeting_medium',
  'poor_targeting_long',
  'sensor_ghosts',
  'multi_trac',
] as const;

const CRITICAL_PREVENTION_EDGE_EXPLOSION_SOURCE_REFS = [
  ...MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
  ...MEKSTATION_EDGE_EXPLOSION_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT = {
  'ranged-to-hit-calculation': integrated(
    'ranged-to-hit-calculation',
    'calculateToHit calls calculateAttackerSPAModifiers and calculateAttackerQuirkModifiers when attacker/target state includes abilities, target terrain features, airborne state, or unit quirks',
    [
      ...MEGAMEK_TERRAIN_MASTER_DEFENSIVE_TO_HIT_SOURCE_REFS,
      ...MEGAMEK_SHAKY_STICK_SOURCE_REFS,
      ...MEGAMEK_SENSOR_GHOSTS_TO_HIT_SOURCE_REFS,
      ...MEGAMEK_TARGETING_QUIRK_TO_HIT_SOURCE_REFS,
      ...MEGAMEK_MULTI_TRAC_SOURCE_REFS,
    ],
  ),
  'ranged-to-hit-state-hydration': integrated(
    'ranged-to-hit-state-hydration',
    'runAttackPhase and declareAttack hydrate pilot abilities, SPA designations, unit quirks, weapon quirks, target unit type, target dodge state, airborne attacker/target state, wounds, sensor hits, attacker prone state, secondary-target state, and coarse arm-actuator damage into ranged to-hit state; runAttackPhase also hydrates target terrain features for source-backed Terrain Master defender to-hit variants',
    [
      ...MEGAMEK_TERRAIN_MASTER_DEFENSIVE_TO_HIT_SOURCE_REFS,
      ...MEGAMEK_SHAKY_STICK_SOURCE_REFS,
    ],
  ),
  'vdni-bvdni-ranged-to-hit-application': integrated(
    'vdni-bvdni-ranged-to-hit-application',
    'calculateAttackerSPAModifiers consumes canonical vdni and bvdni pilot ability ids as the source-backed -1 ranged attack to-hit modifier, runAttackPhase/declareAttack hydrate attacker abilities plus explicit neuralInterfaceActive false state into ranged to-hit state, and featureSupport.canonicalPilotAbilityScope.vdni plus featureSupport.canonicalPilotAbilityScope.bvdni integrate represented jack-in/jack-out neural-interface state transitions',
    MEGAMEK_VDNI_TARGET_NUMBER_SOURCE_REFS,
  ),
  'proto-dni-ranged-to-hit-application': integrated(
    'proto-dni-ranged-to-hit-application',
    'calculateAttackerSPAModifiers consumes canonical proto_dni as the current source-backed -2 ranged/gunnery target-number relief, and runAttackPhase/declareAttack hydrate attacker abilities plus explicit neuralInterfaceActive false state into ranged to-hit state',
    MEGAMEK_PROTO_DNI_TARGET_NUMBER_SOURCE_REFS,
  ),
  'vdni-internal-damage-neural-feedback-application': integrated(
    'vdni-internal-damage-neural-feedback-application',
    'resolveDamage consumes canonical vdni and artificial_pain_shunt for the represented unbuffered VDNI internal-structure damage feedback slice: VDNI rolls 2d6 after internal damage, wounds the pilot on 8+, emits neural_feedback PilotHit in the runner, excludes bvdni from this VDNI branch, suppresses the feedback for artificial_pain_shunt, and shares represented neural-interface state transitions with featureSupport.canonicalPilotAbilityScope.vdni',
    MEGAMEK_VDNI_NEURAL_FEEDBACK_SOURCE_REFS,
  ),
  'bvdni-critical-hit-neural-feedback-application': integrated(
    'bvdni-critical-hit-neural-feedback-application',
    'resolveDamage consumes canonical bvdni and artificial_pain_shunt for the represented Buffered VDNI critical-hit feedback slice: BVDNI rolls 2d6 after a resolved critical hit, wounds the pilot on 8+, emits neural_feedback PilotHit in the runner through the shared damage result, suppresses the feedback for artificial_pain_shunt, and shares represented neural-interface state transitions with featureSupport.canonicalPilotAbilityScope.bvdni',
    MEGAMEK_BVDNI_NEURAL_FEEDBACK_SOURCE_REFS,
  ),
  'weapon-to-hit-quirk-application': integrated(
    'weapon-to-hit-quirk-application',
    'runAttackPhase passes the firing weapon id into calculateToHit so calculateAttackerQuirkModifiers applies Accurate, Inaccurate, and Stable Weapon when unit state carries weaponQuirks',
    MEGAMEK_WEAPON_TO_HIT_QUIRK_SOURCE_REFS,
  ),
  'legacy-defensive-quirk-to-hit-application': outOfScope(
    'legacy-defensive-quirk-to-hit-application',
    'calculateAttackerQuirkModifiers calls calculateDistractingModifier and calculateLowProfileModifier, and runAttackPhase/declareAttack hydrate target unitQuirks into that local target to-hit helper/deviation path; Low Profile glancing-blow damage handling is tracked by featureSupport.mechQuirks.low_profile instead of this resolver row',
    'No source-backed producer/resolver maps Distracting or Low Profile to target to-hit in the source snapshot; the local target to-hit helper is deviation-only, while source-backed Low Profile is represented as glancing-blow damage, critical-hit-table, and cluster-table handling rather than a to-hit modifier',
    [
      ...MEGAMEK_DISTRACTING_QUIRK_SOURCE_REFS,
      ...MEGAMEK_LOW_PROFILE_GLANCING_SOURCE_REFS,
      ...MEKSTATION_DEFENSIVE_QUIRK_TO_HIT_DEVIATION_SOURCE_REFS,
    ],
  ),
  'legacy-pain-resistance-to-hit-application': integrated(
    'legacy-pain-resistance-to-hit-application',
    'MegaMek source uses Pain Resistance for consciousness/wake-up rolls and ammunition-explosion pilot-damage reduction, not ranged to-hit wound-penalty relief; calculateToHit, runAttackPhase, and declareAttack preserve raw pilot wound penalties when attackers have Pain Resistance',
    [
      ...MEGAMEK_CONSCIOUSNESS_TOUGHNESS_SOURCE_REFS,
      ...MEKSTATION_CONSCIOUSNESS_TOUGHNESS_DEVIATION_SOURCE_REFS,
    ],
  ),
  'called-shot-application': integrated(
    'called-shot-application',
    'Source-backed runAttackPhase and declareAttack pass calledShot intent into calculateCalledShotModifier for TacOps-style +3 called-shot penalties and disable local Marksman/legacy Sharpshooter helper reductions for BattleMech combat',
    MEGAMEK_CALLED_SHOT_SOURCE_REFS,
  ),
  'indirect-fire-spa-application': integrated(
    'indirect-fire-spa-application',
    'computeIndirectFireContext hydrates spotter abilities for Forward Observer and attacker abilities for Oblique Attacker into resolveIndirectFire penalty math',
    [
      ...MEGAMEK_OBLIQUE_ATTACKER_SOURCE_REFS,
      ...MEGAMEK_FORWARD_OBSERVER_SOURCE_REFS,
    ],
  ),
  'comm-implant-indirect-fire-spotter-application': integrated(
    'comm-implant-indirect-fire-spotter-application',
    'computeIndirectFireContext hydrates spotter abilities for Cybernetic Comm Implant and Boosted Comm Implant into resolveIndirectFire so represented LOS spotters receive the current MegaMek -1 indirect LRM spotter target-number relief; boosted C3i pilot-implant network state remains tracked on the parent canonical SPA row',
    MEGAMEK_COMM_IMPLANT_INDIRECT_FIRE_SOURCE_REFS,
  ),
  'cluster-hitter-application': integrated(
    'cluster-hitter-application',
    'runAttackPhase hydrates attacker abilities into missile clusterContext, and resolveSpecialProjectileHit applies Cluster Hitter as a +1 cluster table shift',
    MEGAMEK_CLUSTER_HITTER_SOURCE_REFS,
  ),
  'sandblaster-application': integrated(
    'sandblaster-application',
    'Source-backed resolveSpecialProjectileHit consumes Sandblaster state, designated weapon type, and attack range for representable LB-X and missile cluster-table resolution',
    MEGAMEK_SANDBLASTER_SOURCE_REFS,
  ),
  'sandblaster-rate-of-fire-application': integrated(
    'sandblaster-rate-of-fire-application',
    'runAttackPhase consumes Sandblaster state, designated autocannon weapon type, and attack range before expanding selected UAC/RAC or explicitly authored ordinary AC rate-of-fire modes so runner shot counts follow the source-backed cluster table while non-Sandblaster rate-of-fire modes keep independent selected shots',
    MEGAMEK_SANDBLASTER_SOURCE_REFS,
  ),
  'sandblaster-tacops-rapid-fire-application': integrated(
    'sandblaster-tacops-rapid-fire-application',
    'Sandblaster source refs are pinned to include TacOps rapid-fire AC as a legal designation family, UnitHydration authors official ordinary ac-2/ac-5/ac-10/ac-20 catalog rows with single/rapid-fire modes, and represented runner rate-of-fire integration consumes those catalog-authored ordinary AC rapid-fire modes without static fallback',
    MEGAMEK_SANDBLASTER_SOURCE_REFS,
  ),
  'physical-to-hit-application': integrated(
    'physical-to-hit-application',
    'resolvePhysicalAttack, runPhysicalAttackPhase, and interactive declaration contexts pass pilot ability, unit quirk, and attacker water depth into physical to-hit helpers so Melee Specialist, Battle Fists, and Terrain Master: Frogman modify TNs',
    [
      ...MEGAMEK_MELEE_SPECIALIST_SOURCE_REFS,
      ...MEGAMEK_BATTLE_FISTS_SOURCE_REFS,
    ],
  ),
  'physical-damage-application': integrated(
    'physical-damage-application',
    'calculatePhysicalDamage and runPhysicalAttackPhase consume pilot abilities for source-backed Melee Specialist physical damage without applying Battle Fists as legacy flat damage',
    MEGAMEK_MELEE_SPECIALIST_SOURCE_REFS,
  ),
  'zweihander-punch-physical-application': integrated(
    'zweihander-punch-physical-application',
    'canPunch, canMeleeWeapon, calculatePunchToHit, calculateMeleeWeaponToHit, calculatePunchDamage, supported physical-weapon damage helpers, getPhysicalMissConsequences, interactive physical planning/resolution, and runPhysicalAttackPhase consume canonical zweihander only when explicit twoHandedZweihander declaration state is present, representing the two-handed punch and every official standalone physical-weapon prompt, SPA/non-prone/both-arm/represented per-arm hand-actuator/represented-arm-fire declaration gates, selected-arm physical-weapon limb/location declarations, represented off-arm upper/lower actuator to-hit penalties, bonus damage, miss PSR, and represented self-critical side-effect slices while excluding non-catalog improvised club, breakage, and broader mounted physical-weapon mode authoring from the official BattleMech SPA blocker',
    MEKSTATION_ZWEIHANDER_PUNCH_SOURCE_REFS,
  ),
  'dermal-armor-head-hit-pilot-damage-suppression': integrated(
    'dermal-armor-head-hit-pilot-damage-suppression',
    'resolveDamage consumes canonical dermal_armor as the represented head-hit pilot-damage suppression slice for BattleMech units while preserving head armor and structure damage; featureSupport.canonicalPilotAbilityScope.dermal_armor is integrated for the BattleMech matrix while non-BattleMech implant branches remain split out of this scope',
    [
      ...CANONICAL_DERMAL_ARMOR_HEAD_HIT_SOURCE_REFS,
      ...(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.dermal_armor.sourceRefs ?? []),
    ],
  ),
  'dfa-miss-bioware-pilot-damage-avoidance': integrated(
    'dfa-miss-bioware-pilot-damage-avoidance',
    'resolveDfaMissFallPilotDamageAvoidance consumes canonical dermal_armor and tsm_implant as the represented missed-DFA fall pilot-damage immunity slice for BattleMech units; featureSupport.canonicalPilotAbilityScope.dermal_armor and featureSupport.canonicalPilotAbilityScope.tsm_implant are integrated for the BattleMech matrix while non-BattleMech implant branches remain split out of this scope',
    [
      ...CANONICAL_DFA_FALL_PILOT_DAMAGE_IMMUNITY_SOURCE_REFS,
      ...(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.dermal_armor.sourceRefs ?? []),
      ...(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.tsm_implant.sourceRefs ?? []),
    ],
  ),
  'eagle-eyes-active-probe-range-application': integrated(
    'eagle-eyes-active-probe-range-application',
    'createInitialState consumes hydrated canonical eagle_eyes pilot ability state for the represented active-probe ECM-counter range slice, getProbeECMCounterRange adds one hex to the represented active probe range, and canBAPCounterECM uses that adjusted range during Guardian ECM countering; featureSupport.canonicalPilotAbilityScope.eagle_eyes is integrated for the canonical parent row',
    MEKSTATION_EAGLE_EYES_ACTIVE_PROBE_RANGE_SOURCE_REFS,
  ),
  'eagle-eyes-minefield-detonation-application': integrated(
    'eagle-eyes-minefield-detonation-application',
    'applyMovementMinefieldEffects and applyRepresentedMinefieldEntryDamage consume canonical eagle_eyes pilot ability state for the represented BattleMech TerrainType.Mines detonation roll, adding MegaMek-aligned +2 target-number relief before leg damage and PSR fallout; featureSupport.canonicalPilotAbilityScope.eagle_eyes is integrated for the canonical parent row',
    MEKSTATION_EAGLE_EYES_MINEFIELD_DETONATION_SOURCE_REFS,
  ),
  'physical-action-count-application': integrated(
    'physical-action-count-application',
    'getAllowedPhysicalAttackCount and declarePhysicalAttack consume Melee Master to permit two accepted physical declarations per turn while rejecting third declarations and same-limb repeats',
    MEKSTATION_MELEE_MASTER_DEVIATION_SOURCE_REFS,
  ),
  'physical-restriction-application': integrated(
    'physical-restriction-application',
    'canPunch, canPush, canMeleeWeapon, runPhysicalAttackPhase, and interactive declarations consume unit quirks for source-backed No Arms restrictions',
    MEGAMEK_NO_ARMS_SOURCE_REFS,
  ),
  'low-arms-application': outOfScope(
    'low-arms-application',
    'Pinned MegaMek source search finds only Low Arms option registration, so MekStation must not apply a local elevation gate as covered behavior',
    'Low Arms resolver assignment remains registry-only out-of-scope audit evidence until a pinned MegaMek or MekHQ authority exposes combat resolver semantics',
    MEGAMEK_LOW_ARMS_GAP_SOURCE_REFS,
  ),
  'psr-application': integrated(
    'psr-application',
    'calculatePSRModifiers consumes unit quirks through calculatePilotingQuirkPSRModifier; runPSRPhase, resolvePendingPSRs, and attemptStandUp pass unit quirk and pilot ability state into PSR target-number calculation, with Stable scoped to Kick/Push PSRs, Easy Pilot scoped to the MegaMek piloting-skill gate plus BattleMech terrain/20+ damage PSRs, Cramped Cockpit suppressed for Small Pilot, and No Arms scoped to stand-up PSRs',
    [
      ...MEGAMEK_EASY_TO_PILOT_SOURCE_REFS,
      ...MEGAMEK_STABLE_PSR_SOURCE_REFS,
      ...MEGAMEK_HARD_TO_PILOT_SOURCE_REFS,
      ...MEGAMEK_UNBALANCED_SOURCE_REFS,
      ...MEGAMEK_CRAMPED_COCKPIT_SOURCE_REFS,
      ...MEGAMEK_NO_ARMS_SOURCE_REFS,
    ],
  ),
  'psr-spa-application': integrated(
    'psr-spa-application',
    'calculatePSRModifiers, runPSRPhase, resolvePendingPSRs, and stand-up PSR paths apply source-backed Maneuvering Ace skidding relief, Animal Mimicry quad-Mek relief, Terrain Master: Frogman water-entry relief, Terrain Master: Mountaineer rubble-entry relief, and Swamp Beast bog-down relief to PSR target numbers',
    MEGAMEK_PSR_SPA_SOURCE_REFS,
  ),
  'psr-spa-target-number-application': integrated(
    'psr-spa-target-number-application',
    'calculatePSRModifiers, runPSRPhase, resolvePendingPSRs, and stand-up PSR paths apply source-backed Maneuvering Ace skidding relief, Animal Mimicry quad-Mek relief, Terrain Master: Frogman water-entry relief, Terrain Master: Mountaineer rubble-entry relief, and Swamp Beast bog-down relief to PSR target numbers',
    MEGAMEK_PSR_SPA_SOURCE_REFS,
  ),
  'initiative-application': integrated(
    'initiative-application',
    'rollInitiative consumes source-backed Command Mech/Battle Computer force-level quirk bonuses, explicit HQ/command equipment initiative bonuses, represented HQ/command-console initiativeEquipment gates, represented Triple-Core Processor initiative components, and Tactical Genius reroll requests while preserving raw 2d6 payload fields',
    [
      ...MEGAMEK_INITIATIVE_QUIRK_SOURCE_REFS,
      ...MEGAMEK_INITIATIVE_EQUIPMENT_SOURCE_REFS,
      ...MEGAMEK_TACTICAL_GENIUS_SOURCE_REFS,
    ],
  ),
  'triple-core-processor-initiative-application': integrated(
    'triple-core-processor-initiative-application',
    'calculateSideInitiativeModifier consumes canonical triple_core_processor only when the pilot also has active VDNI or Buffered VDNI state, applies represented BattleMech +2 base and +1 C3/communications/command-console equipment uplift, applies represented shutdown, hostile ECM-without-own-ECM, and battle-wide EMI reductions, and suppresses the bonus when neuralInterfaceActive is explicitly false',
    MEGAMEK_TRIPLE_CORE_PROCESSOR_SOURCE_REFS,
  ),
  'triple-core-processor-aimed-shot-application': integrated(
    'triple-core-processor-aimed-shot-application',
    'buildWeaponAttackAttackerToHitState consumes canonical triple_core_processor only for called-shot attacks when the pilot also has active VDNI or Buffered VDNI state, and calculateToHit applies represented Targeting Computer -1 aimed-shot relief across runner, interactive, and projection to-hit paths while suppressing relief when neuralInterfaceActive is explicitly false; actual targetingComputerEquipment state is represented separately and does not double-count TCP-backed relief',
    MEKSTATION_TRIPLE_CORE_PROCESSOR_AIMED_SHOT_SOURCE_REFS,
  ),
  'initiative-hq-equipment-hydration': integrated(
    'initiative-hq-equipment-hydration',
    'createInitialUnitState hydrates IGameUnit.initiativeEquipment into combat state and calculateSideInitiativeModifier derives +1/+2 HQ initiative only from represented working communications tonnage in Default communications mode',
    MEGAMEK_INITIATIVE_EQUIPMENT_SOURCE_REFS,
  ),
  'initiative-command-console-hydration': integrated(
    'initiative-command-console-hydration',
    'createInitialUnitState hydrates IGameUnit.initiativeEquipment into combat state and calculateSideInitiativeModifier derives +2 command-console initiative only from represented command-console cockpit, active crew, heavy-or-larger mass, and IndustrialMek advanced-fire-control eligibility',
    MEGAMEK_INITIATIVE_EQUIPMENT_SOURCE_REFS,
  ),
  'initiative-equipment-producer-hydration': integrated(
    'initiative-equipment-producer-hydration',
    'The session engine consumes represented initiativeEquipment gates, and unit hydration/adapters now source-back official communications-equipment:size:N, communications-equipment-N-ton, communications-equipment-N-ton:omni, BattleMech cockpit COMMAND_CONSOLE shapes, and exact command-console producer ids (istankcockpitcommandconsole/tankcockpitcommandconsole/ISRemoteDroneCommandConsole/remotedronecommandconsole) while keeping producer ids separate from command-console cockpit eligibility',
    MEGAMEK_INITIATIVE_EQUIPMENT_SOURCE_REFS,
  ),
  'heat-application': integrated(
    'heat-application',
    'runHeatPhase and resolveHeatPhase consume source-backed Hot Dog startup/shutdown plus heat-induced ammo-explosion, opt-in MaxTech pilot heat-damage, opt-in MaxTech critical-damage avoid-number relief, and weapon cooling quirks; calculateToHit consumes source-backed Some Like It Hot heat to-hit relief while leaving local Cool Under Fire unconsumed',
    [
      ...MEGAMEK_HOT_DOG_HEAT_ROLL_SOURCE_REFS,
      ...MEGAMEK_SOME_LIKE_IT_HOT_HEAT_TO_HIT_SOURCE_REFS,
      ...MEGAMEK_WEAPON_COOLING_QUIRK_SOURCE_REFS,
    ],
  ),
  'consciousness-application': integrated(
    'consciousness-application',
    'applyPilotDamage consumes source-backed Pain Resistance ids and explicit numeric RPG Toughness state for head-hit consciousness checks, runHeatPhase applies Pain Resistance wake-up relief during heat recovery, and runPSRPhase, resolvePendingPSRs, resolveHeatPhase, physical self-damage, and ammo-explosion pilot damage consume the same represented state for fall, heat, physical, and explosion consciousness checks without treating Iron Man, Iron Will, or legacy toughness ability strings as target-number relief',
    [
      ...MEGAMEK_CONSCIOUSNESS_TOUGHNESS_SOURCE_REFS,
      ...MEKSTATION_CONSCIOUSNESS_TOUGHNESS_DEVIATION_SOURCE_REFS,
    ],
  ),
  'rpg-toughness-consciousness-application': integrated(
    'rpg-toughness-consciousness-application',
    'resolvePilotConsciousnessCheck and resolvePilotWakeUpCheck consume explicit numeric pilotToughness state as target-number relief, pre-battle builders hydrate only explicit assigned-pilot rpgToughness/RPG Toughness snapshots, and legacy toughness ability aliases do not imply numeric RPG Toughness',
    [
      ...MEGAMEK_CONSCIOUSNESS_TOUGHNESS_SOURCE_REFS,
      ...MEKSTATION_RPG_TOUGHNESS_PREBATTLE_SOURCE_REFS,
      ...MEKSTATION_CONSCIOUSNESS_TOUGHNESS_DEVIATION_SOURCE_REFS,
    ],
  ),
  'edge-application': integrated(
    'edge-application',
    'deriveEdgePointCountFromPilotAbilities, createEdgeState, canUseEdge, useEdge, and resolveEdgeBattleMechTrigger model source-backed Edge point and trigger-id consumption without treating the generic edge SPA alias as a trigger; UnitHydration and GameCreated synthesis seed hydrated fullUnit abilities plus generic Edge points into combat and replay state; represented BattleMech and out-of-scope aerospace trigger ids are partitioned in EDGE_TRIGGERS; hit-location resolution consumes edge_when_headhit and edge_when_tac, runPSRPhase consumes edge_when_masc_fails, resolvePilotConsciousnessCheck consumes edge_when_ko, and criticalHitResolution consumes edge_when_explosion for their proven BattleMech trigger paths',
    [
      ...MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
      ...MEKSTATION_EDGE_TRIGGER_HELPER_SOURCE_REFS,
    ],
  ),
  'edge-head-hit-reroll-application': integrated(
    'edge-head-hit-reroll-application',
    'BattleMech hit-location resolution consumes edge_when_headhit only for represented head-hit locations, spends target Edge, preserves the superseded head-hit metadata, returns the replacement location, and persists remaining Edge points through runner and interactive weapon-hit paths',
    [
      ...MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
      ...MEKSTATION_EDGE_HEAD_HIT_SOURCE_REFS,
    ],
  ),
  'edge-tac-reroll-application': integrated(
    'edge-tac-reroll-application',
    'BattleMech hit-location resolution consumes edge_when_tac only for represented TAC hit-location results, spends target Edge, replaces the location before TAC critical processing, carries superseded/final metadata, and persists remaining Edge points through runner and interactive weapon-hit paths',
    [...MEGAMEK_EDGE_TRIGGER_SOURCE_REFS, ...MEKSTATION_EDGE_TAC_SOURCE_REFS],
  ),
  'edge-ko-consciousness-reroll-application': integrated(
    'edge-ko-consciousness-reroll-application',
    'resolvePilotConsciousnessCheck consumes edge_when_ko only after a failed BattleMech consciousness check, spends represented Edge, returns superseded/final roll metadata, and refuses to spend generic edge without the KO trigger-specific ability',
    [...MEGAMEK_EDGE_TRIGGER_SOURCE_REFS, ...MEKSTATION_EDGE_KO_SOURCE_REFS],
  ),
  'edge-masc-supercharger-reroll-application': integrated(
    'edge-masc-supercharger-reroll-application',
    'runPSRPhase consumes source-backed edge_when_masc_fails for represented BattleMech MASCFailure and SuperchargerFailure PSRs, spends one Edge point, emits superseded/reroll PSRResolved metadata, and suppresses fall, critical-hit, and destruction aftermath when the reroll passes',
    [
      ...MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
      ...MEKSTATION_EDGE_MASC_SUPERCHARGER_SOURCE_REFS,
    ],
  ),
  'critical-prevention-application': outOfScope(
    'critical-prevention-application',
    'MegaMek exposes Edge TAC/head-hit/explosion triggers; MekStation hit-location resolution consumes TAC/head-hit Edge and critical-hit resolution consumes explosion Edge for the source-backed trigger-specific rerolls',
    'Generic critical-hit negation is not a source-backed BattleMech resolver and no broad critical-prevention mechanic is claimed; this aggregate label is excluded from blockers while the row-specific TAC, head-hit, and explosion Edge triggers stay integrated',
    [
      ...MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
      ...MEKSTATION_EDGE_TRIGGER_HELPER_SOURCE_REFS,
    ],
  ),
  'critical-prevention-edge-explosion-application': integrated(
    'critical-prevention-edge-explosion-application',
    'criticalHitResolution consumes edge_when_explosion to spend represented Edge and redirect avoidable explosive ammo critical-slot hits to a non-explosive slot; resolveWeaponHit carries the remaining Edge state and runner critical-hit coverage proves the crit-induced ammo explosion is avoided',
    CRITICAL_PREVENTION_EDGE_EXPLOSION_SOURCE_REFS,
  ),
  'anti-mek-actuator-application': outOfScope(
    'anti-mek-actuator-application',
    'getAntiMekActuatorTargetModifier exposes Protected/Exposed Actuators as anti-Mek Leg/Swarm attack target-number modifiers for the separate infantry and battle-armor combat matrix',
    'Anti-Mek Leg/Swarm attack paths are non-BattleMech attacker actions and are excluded from BattleMech runner validation until the battle-armor/infantry matrix consumes them',
    MEGAMEK_ANTI_MEK_ACTUATOR_SOURCE_REFS,
  ),
  'campaign-maintenance-application': outOfScope(
    'campaign-maintenance-application',
    'getRuggedMaintenanceMultiplier exposes MekHQ-style Rugged maintenance-cycle multipliers',
    'Campaign maintenance-cycle application belongs to MekHQ campaign scope, not BattleMech combat runner modifier scope',
    MEKHQ_RUGGED_SOURCE_REFS,
  ),
  'vehicle-movement-application': outOfScope(
    'vehicle-movement-application',
    'MegaMek Cross-Country applies to combat-vehicle terrain movement-cost and passability gates for the separate vehicle combat matrix',
    'Vehicle movement/passability behavior is excluded from BattleMech runner validation until a vehicle combat matrix consumes it',
    MEGAMEK_CROSS_COUNTRY_SOURCE_REFS,
  ),
  'aerospace-maneuvering-ace-movement-application': outOfScope(
    'aerospace-maneuvering-ace-movement-application',
    'MegaMek ManeuverStep applies Maneuvering Ace to aerospace maneuver-thrust relief, but this catalog is scoped to BattleMech movement and combat runner validation',
    'Aerospace maneuver-thrust relief belongs in a separate aerospace movement matrix and must not keep the BattleMech movement-application resolver helper-only',
    MEGAMEK_MANEUVERING_ACE_AEROSPACE_MOVEMENT_SOURCE_REFS,
  ),
  'movement-application': integrated(
    'movement-application',
    'validateMovement, runMovementPhase, and movement step decomposition consume Maneuvering Ace pilot ability state for source-backed biped lateral shifts, QuadMek lateral-step MP relief, represented controlled-sideslip checks, and represented flanking-and-turning checks; represented pending out-of-control PSRs consume Maneuvering Ace target-number relief; Heavy Lifter lift-capacity helper math, represented carry-object capacity-check accounting, represented per-arm carried-cargo physical legality lockout, and represented ground-object pickup/drop lifecycle are source-backed, with unresolved throw-object resolution split to a dedicated helper-only row',
    [
      ...MEGAMEK_MANEUVERING_ACE_BATTLEMECH_MOVEMENT_RESIDUAL_SOURCE_REFS,
      ...MEKSTATION_MANEUVERING_ACE_MOVEMENT_SOURCE_REFS,
      ...MEKSTATION_MANEUVERING_ACE_OUT_OF_CONTROL_PSR_SOURCE_REFS,
      ...MEGAMEK_HEAVY_LIFTER_SOURCE_REFS,
      ...MEKSTATION_HEAVY_LIFTER_HELPER_SOURCE_REFS,
    ],
  ),
  'maneuvering-ace-controlled-sideslip-producer-application': integrated(
    'maneuvering-ace-controlled-sideslip-producer-application',
    'runMovementPhase queues represented controlled-sideslip PSRs from lateral movement steps and suppresses walking Maneuvering Ace lateral shifts per MegaMek checkSideSlip',
    [
      ...MEGAMEK_MANEUVERING_ACE_CONTROLLED_SIDESLIP_SOURCE_REFS,
      ...MEKSTATION_MANEUVERING_ACE_CONTROLLED_SIDESLIP_SOURCE_REFS,
    ],
  ),
  'maneuvering-ace-flanking-turning-producer-application': integrated(
    'maneuvering-ace-flanking-turning-producer-application',
    'runMovementPhase queues one represented flanking-and-turning PSR from movement-step decomposition when BattleMech run/sprint movement changes facing after moving more than one hex, stamps the movement-step trigger source, applies Maneuvering Ace relief through PSR modifier resolution, and rejects walking, straight-running, Infantry, and ProtoMech cases',
    [
      ...MEGAMEK_MANEUVERING_ACE_CONTROLLED_SIDESLIP_SOURCE_REFS,
      ...MEKSTATION_MANEUVERING_ACE_FLANKING_TURNING_SOURCE_REFS,
    ],
  ),
  'maneuvering-ace-out-of-control-producer-application': outOfScope(
    'maneuvering-ace-out-of-control-producer-application',
    'MegaMek out-of-control control-roll production is scoped to aerospace, capital craft, and airborne LAM/AirMek control-roll flows; MekStation still represents pending out_of_control PSR target-number relief without counting aero/LAM control-roll production as a ground BattleMech movement blocker',
    'Aero, airborne AirMek/LAM, DropShip, JumpShip, capital fighter, and atmospheric control-roll production belongs in separate aerospace/LAM validation rather than the BattleMech ground movement blocker inventory',
    MEGAMEK_MANEUVERING_ACE_OUT_OF_CONTROL_PRODUCER_SOURCE_REFS,
  ),
  'heavy-lifter-carry-object-action-application': integrated(
    'heavy-lifter-carry-object-action-application',
    'declareGroundObjectPickup, declareGroundObjectDrop, runner ground-object helpers, GameCreated groundObjects seeding, GroundObjectPickedUp/GroundObjectDropped events, and ground-object reducers consume Heavy Lifter lift-capacity gates for represented pickup/carry/drop lifecycle state, arm occupancy, loading/unloading state, and invalid overweight no-side-effect behavior; represented throw releases are split to heavy-lifter-throw-release-lifecycle-application, while thrown-object damage/displacement and throw attack resolution remain excluded',
    MEKSTATION_HEAVY_LIFTER_CARRY_OBJECT_ACTION_SOURCE_REFS,
  ),
  'heavy-lifter-throw-release-lifecycle-application': integrated(
    'heavy-lifter-throw-release-lifecycle-application',
    'declareGroundObjectThrow and applyRunnerGroundObjectThrow represent the event-sourced throw-release lifecycle only: a carried ground object is released to a declared hex with GroundObjectDropped reason=throw, replay clears carried-object arm occupancy, and no throw range, to-hit, damage, displacement, or target interaction is claimed',
    MEKSTATION_HEAVY_LIFTER_THROW_RELEASE_SOURCE_REFS,
  ),
  'heavy-lifter-carry-object-capacity-check-application': integrated(
    'heavy-lifter-carry-object-capacity-check-application',
    'calculateGroundObjectLiftCapacity represents the Heavy Lifter carry-object capacity-check slice by applying source-backed 5 percent per available hand lift capacity plus the canonical hvy_lifter and legacy heavy-lifter 1.5 multipliers, while represented pickup/drop/throw-release lifecycle and physical legality consume per-arm carried-cargo lockout state; no thrown-object attack damage or target interaction is claimed',
    MEKSTATION_HEAVY_LIFTER_CARRY_OBJECT_CAPACITY_SOURCE_REFS,
  ),
  'heavy-lifter-ground-object-weight-gate-application': integrated(
    'heavy-lifter-ground-object-weight-gate-application',
    'checkGroundObjectLiftCapacity represents the bounded ground-object weight gate by comparing payload tonnage against source-backed Heavy Lifter lift capacity and returning the remaining capacity margin; represented pickup/drop/throw-release lifecycle consumes the gate, while throw range, thrown-object damage, and target interaction remain unclaimed',
    MEKSTATION_HEAVY_LIFTER_GROUND_OBJECT_WEIGHT_GATE_SOURCE_REFS,
  ),
  'heavy-lifter-throw-object-action-application': integrated(
    'heavy-lifter-throw-object-action-application',
    'Heavy Lifter lift-capacity helper math, represented ground-object pickup/drop lifecycle, represented throw-release events, and represented per-arm carried-cargo physical legality lockout are represented; the bounded throw-object action resolution releases a carried ground object to a declared hex with reason=throw without claiming throw range, to-hit, damage, displacement, target interaction, or broader UI targeting parity',
    [
      ...MEGAMEK_HEAVY_LIFTER_SOURCE_REFS,
      ...MEKSTATION_HEAVY_LIFTER_HELPER_SOURCE_REFS,
      ...MEKSTATION_HEAVY_LIFTER_THROW_RELEASE_SOURCE_REFS,
    ],
  ),
  'heavy-lifter-lift-capacity-application': integrated(
    'heavy-lifter-lift-capacity-application',
    'calculateGroundObjectLiftCapacity consumes canonical hvy_lifter and legacy heavy-lifter ability ids as the represented source-backed 1.5 BattleMech lift-capacity multiplier, while represented pickup/drop/throw-release actions consume that gate without claiming thrown-object attack damage or target interaction',
    [
      ...MEGAMEK_HEAVY_LIFTER_SOURCE_REFS,
      ...MEKSTATION_HEAVY_LIFTER_HELPER_SOURCE_REFS,
    ],
  ),
  'maneuvering-ace-lateral-movement-application': integrated(
    'maneuvering-ace-lateral-movement-application',
    'validateMovement, runMovementPhase, and movement step decomposition consume Maneuvering Ace pilot ability state for source-backed BattleMech biped lateral shifts and QuadMek lateral-step MP relief',
    [
      ...MEGAMEK_MANEUVERING_ACE_LATERAL_MOVEMENT_SOURCE_REFS,
      ...MEKSTATION_MANEUVERING_ACE_MOVEMENT_SOURCE_REFS,
    ],
  ),
  'nightwalker-light-movement-application': integrated(
    'nightwalker-light-movement-application',
    'getMovementStepCostBreakdown, validateMovement, deriveReachableHexes, validateCommittedMovement, and runMovementPhase consume canonical tm_nightwalker for represented low-light movement: legacy dawn/dusk/night plus MegaMek full moon, glare, moonless, solar flare, and pitch black MP relief plus run-derived movement prohibition, while represented airborne LAM ground projection remains blocked before Nightwalker relief can apply; no Nightwalker to-hit modifier is claimed',
    [
      ...MEGAMEK_NIGHTWALKER_SOURCE_REFS,
      ...MEKSTATION_NIGHTWALKER_LIGHT_MOVEMENT_SOURCE_REFS,
    ],
  ),
  'env-specialist-snow-ranged-to-hit-application': integrated(
    'env-specialist-snow-ranged-to-hit-application',
    'calculateEnvironmentalSpecialistRangedToHitModifier and runAttackPhase consume canonical env_specialist plus explicit snow selected environment for the represented ranged to-hit snow precipitation slice; source-registered Hail stays excluded because MegaMek exposes no picker/runtime branch, and unsupported terrain/environment designation values remain outside Environmental Specialist coverage',
    MEGAMEK_ENV_SPECIALIST_RANGED_TO_HIT_SOURCE_REFS,
  ),
  'env-specialist-fog-ranged-to-hit-application': integrated(
    'env-specialist-fog-ranged-to-hit-application',
    'calculateEnvironmentalSpecialistRangedToHitModifier and runAttackPhase consume canonical env_specialist plus explicit fog selected environment for the represented ranged to-hit heavy_fog energy-weapon slice; non-energy weapon, light-fog, target-spaceborne, source-registered Hail, and unsupported terrain/environment designation branches remain excluded by source-backed gates',
    MEGAMEK_ENV_SPECIALIST_FOG_RANGED_TO_HIT_SOURCE_REFS,
  ),
  'env-specialist-rain-ranged-to-hit-application': integrated(
    'env-specialist-rain-ranged-to-hit-application',
    'calculateEnvironmentalSpecialistRangedToHitModifier and runAttackPhase consume canonical env_specialist plus explicit rain selected environment for the represented ranged to-hit heavy_rain slice; light-rain conventional-infantry behavior, source-registered Hail, and unsupported terrain/environment designation values remain outside represented BattleMech Environmental Specialist behavior',
    MEGAMEK_ENV_SPECIALIST_RAIN_RANGED_TO_HIT_SOURCE_REFS,
  ),
  'env-specialist-light-physical-to-hit-application': integrated(
    'env-specialist-light-physical-to-hit-application',
    'calculateEnvironmentalSpecialistPhysicalToHitModifier and calculatePhysicalToHit consume canonical env_specialist plus explicit Light selected environment for the represented unilluminated-target physical to-hit slice in moonless, solar-flare, and pitch-black light; source-registered Hail and unsupported terrain/environment designation values remain outside represented BattleMech Environmental Specialist behavior',
    MEGAMEK_ENV_SPECIALIST_PHYSICAL_TO_HIT_SOURCE_REFS,
  ),
  'env-specialist-light-ranged-to-hit-application': integrated(
    'env-specialist-light-ranged-to-hit-application',
    'calculateEnvironmentalSpecialistRangedToHitModifier and runAttackPhase consume canonical env_specialist plus explicit Light selected environment and explicit target illumination state for the represented ranged to-hit light slice; source-registered Hail and unsupported terrain/environment designation values remain outside represented BattleMech Environmental Specialist behavior',
    MEGAMEK_ENV_SPECIALIST_LIGHT_RANGED_TO_HIT_SOURCE_REFS,
  ),
  'env-specialist-wind-ranged-to-hit-application': integrated(
    'env-specialist-wind-ranged-to-hit-application',
    'calculateEnvironmentalSpecialistRangedToHitModifier and runAttackPhase consume canonical env_specialist plus explicit wind selected environment for the represented ranged to-hit moderate-wind missile-weapon slice; strong-wind ballistic-plus-missile gates, stronger-than-storm gates, source-registered Hail, and unsupported terrain/environment designation values remain outside represented BattleMech Environmental Specialist behavior',
    MEGAMEK_ENV_SPECIALIST_WIND_RANGED_TO_HIT_SOURCE_REFS,
  ),
  'vdni-piloting-target-number-application': integrated(
    'vdni-piloting-target-number-application',
    'calculatePSRModifiers consumes canonical vdni as the source-backed -1 BattleMech piloting-roll modifier while explicitly leaving bvdni out of the piloting bonus and suppressing VDNI relief when neuralInterfaceActive is explicitly false; featureSupport.canonicalPilotAbilityScope.vdni integrates represented jack-in/jack-out neural-interface state transitions',
    MEGAMEK_VDNI_TARGET_NUMBER_SOURCE_REFS,
  ),
  'proto-dni-piloting-target-number-application': integrated(
    'proto-dni-piloting-target-number-application',
    'calculatePSRModifiers consumes canonical proto_dni as the current source-backed -3 BattleMech piloting target-number relief while suppressing Prototype DNI relief when neuralInterfaceActive is explicitly false',
    MEGAMEK_PROTO_DNI_TARGET_NUMBER_SOURCE_REFS,
  ),
  'multi-target-penalty-application': integrated(
    'multi-target-penalty-application',
    'calculateToHit applies source-backed secondary-target penalties and calculateMultiTaskerModifier reduces those penalties for Multi-Tasker/multi_tasker through ranged to-hit calculation while leaving the out-of-scope local Multi-Target row unconsumed',
    MEGAMEK_SECONDARY_TARGET_MULTI_TASKER_SOURCE_REFS,
  ),
  'target-priority-application': outOfScope(
    'target-priority-application',
    'MekStation local Antagonizer target-priority enforcement has no identified source-backed MegaMek combat SPA authority',
    'Local Antagonizer target-priority behavior is excluded from the official BattleMech validation blocker inventory until a source-backed combat authority and executable resolver path exist',
    MEKSTATION_LOCAL_ONLY_SPA_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const PILOT_MODIFIER_RESOLVER_ASSIGNMENTS = {
  'ranged-to-hit-calculation': {
    spaIds: RANGED_TO_HIT_SPA_IDS,
    quirkIds: RANGED_TO_HIT_QUIRK_IDS,
  },
  'ranged-to-hit-state-hydration': {
    spaIds: RANGED_TO_HIT_SPA_IDS,
    quirkIds: RANGED_TO_HIT_QUIRK_IDS,
  },
  'vdni-bvdni-ranged-to-hit-application': {
    spaIds: ['vdni', 'bvdni'],
    quirkIds: [],
  },
  'proto-dni-ranged-to-hit-application': {
    spaIds: ['proto_dni'],
    quirkIds: [],
  },
  'vdni-internal-damage-neural-feedback-application': {
    spaIds: ['vdni', 'artificial_pain_shunt'],
    quirkIds: [],
  },
  'bvdni-critical-hit-neural-feedback-application': {
    spaIds: ['bvdni', 'artificial_pain_shunt'],
    quirkIds: [],
  },
  'weapon-to-hit-quirk-application': {
    spaIds: [],
    quirkIds: ['accurate', 'inaccurate', 'stable_weapon'],
  },
  'legacy-defensive-quirk-to-hit-application': {
    spaIds: [],
    quirkIds: ['distracting', 'low_profile'],
  },
  'legacy-pain-resistance-to-hit-application': {
    spaIds: [],
    quirkIds: [],
  },
  'called-shot-application': {
    spaIds: [],
    quirkIds: [],
  },
  'indirect-fire-spa-application': {
    spaIds: ['oblique-attacker', 'forward_observer'],
    quirkIds: [],
  },
  'comm-implant-indirect-fire-spotter-application': {
    spaIds: ['comm_implant', 'boost_comm_implant'],
    quirkIds: [],
  },
  'cluster-hitter-application': {
    spaIds: ['cluster-hitter'],
    quirkIds: [],
  },
  'sandblaster-application': {
    spaIds: ['sandblaster'],
    quirkIds: [],
  },
  'sandblaster-rate-of-fire-application': {
    spaIds: ['sandblaster'],
    quirkIds: [],
  },
  'sandblaster-tacops-rapid-fire-application': {
    spaIds: ['sandblaster'],
    quirkIds: [],
  },
  'physical-to-hit-application': {
    spaIds: ['melee-specialist', 'tm_frogman'],
    quirkIds: ['battle_fists_la', 'battle_fists_ra'],
  },
  'physical-damage-application': {
    spaIds: ['melee-specialist'],
    quirkIds: [],
  },
  'zweihander-punch-physical-application': {
    spaIds: ['zweihander'],
    quirkIds: [],
  },
  'dfa-miss-bioware-pilot-damage-avoidance': {
    spaIds: ['dermal_armor', 'tsm_implant'],
    quirkIds: [],
  },
  'dermal-armor-head-hit-pilot-damage-suppression': {
    spaIds: ['dermal_armor'],
    quirkIds: [],
  },
  'eagle-eyes-active-probe-range-application': {
    spaIds: ['eagle_eyes'],
    quirkIds: [],
  },
  'eagle-eyes-minefield-detonation-application': {
    spaIds: ['eagle_eyes'],
    quirkIds: [],
  },
  'physical-action-count-application': {
    spaIds: ['melee-master'],
    quirkIds: [],
  },
  'physical-restriction-application': {
    spaIds: [],
    quirkIds: ['no_arms'],
  },
  'low-arms-application': {
    spaIds: [],
    quirkIds: ['low_arms'],
  },
  'anti-mek-actuator-application': {
    spaIds: [],
    quirkIds: ['protected_actuators', 'exposed_actuators'],
  },
  'psr-application': {
    spaIds: [],
    quirkIds: [
      'easy_to_pilot',
      'stable',
      'hard_to_pilot',
      'unbalanced',
      'cramped_cockpit',
      'no_arms',
    ],
  },
  'psr-spa-application': {
    spaIds: [
      'maneuvering-ace',
      'tm_frogman',
      'tm_mountaineer',
      'tm_swamp_beast',
      'animal-mimicry',
    ],
    quirkIds: [],
  },
  'psr-spa-target-number-application': {
    spaIds: [
      'maneuvering-ace',
      'tm_frogman',
      'tm_mountaineer',
      'tm_swamp_beast',
      'animal-mimicry',
    ],
    quirkIds: [],
  },
  'initiative-application': {
    spaIds: ['tactical-genius'],
    quirkIds: ['command_mech', 'battle_computer'],
  },
  'triple-core-processor-initiative-application': {
    spaIds: ['triple_core_processor', 'vdni', 'bvdni'],
    quirkIds: [],
  },
  'triple-core-processor-aimed-shot-application': {
    spaIds: ['triple_core_processor', 'vdni', 'bvdni'],
    quirkIds: [],
  },
  'initiative-hq-equipment-hydration': { spaIds: [], quirkIds: [] },
  'initiative-command-console-hydration': { spaIds: [], quirkIds: [] },
  'initiative-equipment-producer-hydration': { spaIds: [], quirkIds: [] },
  'heat-application': {
    spaIds: ['hot-dog', 'some-like-it-hot'],
    quirkIds: ['improved_cooling', 'poor_cooling', 'no_cooling'],
  },
  'consciousness-application': {
    spaIds: ['iron-man', 'pain-resistance'],
    quirkIds: [],
  },
  'rpg-toughness-consciousness-application': {
    spaIds: [],
    quirkIds: [],
  },
  'edge-application': { spaIds: ['edge'], quirkIds: [] },
  'edge-head-hit-reroll-application': {
    spaIds: [],
    quirkIds: [],
  },
  'edge-tac-reroll-application': {
    spaIds: [],
    quirkIds: [],
  },
  'edge-ko-consciousness-reroll-application': {
    spaIds: [],
    quirkIds: [],
  },
  'edge-masc-supercharger-reroll-application': {
    spaIds: [],
    quirkIds: [],
  },
  'critical-prevention-application': { spaIds: ['edge'], quirkIds: [] },
  'critical-prevention-edge-explosion-application': {
    spaIds: [],
    quirkIds: [],
  },
  'campaign-maintenance-application': {
    spaIds: [],
    quirkIds: ['rugged_1', 'rugged_2'],
  },
  'vehicle-movement-application': {
    spaIds: ['cross-country'],
    quirkIds: [],
  },
  'aerospace-maneuvering-ace-movement-application': {
    spaIds: ['maneuvering-ace'],
    quirkIds: [],
  },
  'movement-application': {
    spaIds: ['maneuvering-ace', 'heavy-lifter'],
    quirkIds: [],
  },
  'maneuvering-ace-controlled-sideslip-producer-application': {
    spaIds: ['maneuvering-ace'],
    quirkIds: [],
  },
  'maneuvering-ace-flanking-turning-producer-application': {
    spaIds: ['maneuvering-ace'],
    quirkIds: [],
  },
  'maneuvering-ace-out-of-control-producer-application': {
    spaIds: ['maneuvering-ace'],
    quirkIds: [],
  },
  'heavy-lifter-carry-object-action-application': {
    spaIds: ['heavy-lifter'],
    quirkIds: [],
  },
  'heavy-lifter-throw-release-lifecycle-application': {
    spaIds: ['heavy-lifter'],
    quirkIds: [],
  },
  'heavy-lifter-carry-object-capacity-check-application': {
    spaIds: ['heavy-lifter'],
    quirkIds: [],
  },
  'heavy-lifter-ground-object-weight-gate-application': {
    spaIds: ['heavy-lifter'],
    quirkIds: [],
  },
  'heavy-lifter-throw-object-action-application': {
    spaIds: ['heavy-lifter'],
    quirkIds: [],
  },
  'heavy-lifter-lift-capacity-application': {
    spaIds: ['heavy-lifter'],
    quirkIds: [],
  },
  'maneuvering-ace-lateral-movement-application': {
    spaIds: ['maneuvering-ace'],
    quirkIds: [],
  },
  'nightwalker-light-movement-application': {
    spaIds: ['tm_nightwalker'],
    quirkIds: [],
  },
  'env-specialist-snow-ranged-to-hit-application': {
    spaIds: ['env_specialist'],
    quirkIds: [],
  },
  'env-specialist-fog-ranged-to-hit-application': {
    spaIds: ['env_specialist'],
    quirkIds: [],
  },
  'env-specialist-rain-ranged-to-hit-application': {
    spaIds: ['env_specialist'],
    quirkIds: [],
  },
  'env-specialist-light-physical-to-hit-application': {
    spaIds: ['env_specialist'],
    quirkIds: [],
  },
  'env-specialist-light-ranged-to-hit-application': {
    spaIds: ['env_specialist'],
    quirkIds: [],
  },
  'env-specialist-wind-ranged-to-hit-application': {
    spaIds: ['env_specialist'],
    quirkIds: [],
  },
  'vdni-piloting-target-number-application': {
    spaIds: ['vdni'],
    quirkIds: [],
  },
  'proto-dni-piloting-target-number-application': {
    spaIds: ['proto_dni'],
    quirkIds: [],
  },
  'multi-target-penalty-application': {
    spaIds: ['multi-tasker'],
    quirkIds: [],
  },
  'target-priority-application': {
    spaIds: [],
    quirkIds: [],
  },
} satisfies Record<
  keyof typeof PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT,
  IPilotModifierResolverAssignment
>;
