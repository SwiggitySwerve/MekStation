import {
  integrated,
  outOfScope,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';
import {
  MEKSTATION_HEAVY_LIFTER_CARRY_OBJECT_CAPACITY_SOURCE_REFS,
  MEKSTATION_HEAVY_LIFTER_CARRY_OBJECT_ACTION_SOURCE_REFS,
  MEGAMEK_HEAVY_LIFTER_SOURCE_REFS,
  MEKSTATION_HEAVY_LIFTER_GROUND_OBJECT_WEIGHT_GATE_SOURCE_REFS,
  MEKSTATION_HEAVY_LIFTER_HELPER_SOURCE_REFS,
  MEKSTATION_HEAVY_LIFTER_THROW_RELEASE_SOURCE_REFS,
} from './CombatHeavyLifterSourceRefs';
import { MEGAMEK_NIGHTWALKER_SOURCE_REFS } from './CombatLegacyPilotAbilitySourceRefs';
import {
  MEGAMEK_ENV_SPECIALIST_RANGED_TO_HIT_SOURCE_REFS,
  MEGAMEK_ENV_SPECIALIST_FOG_RANGED_TO_HIT_SOURCE_REFS,
  MEGAMEK_ENV_SPECIALIST_RAIN_RANGED_TO_HIT_SOURCE_REFS,
  MEGAMEK_ENV_SPECIALIST_WIND_RANGED_TO_HIT_SOURCE_REFS,
  MEGAMEK_ENV_SPECIALIST_LIGHT_RANGED_TO_HIT_SOURCE_REFS,
  MEGAMEK_ENV_SPECIALIST_PHYSICAL_TO_HIT_SOURCE_REFS,
} from './CombatPilotModifierApplicationSupport.sourceRefs.environment';
import {
  MEGAMEK_MANEUVERING_ACE_LATERAL_MOVEMENT_SOURCE_REFS,
  MEGAMEK_MANEUVERING_ACE_BATTLEMECH_MOVEMENT_RESIDUAL_SOURCE_REFS,
  MEGAMEK_MANEUVERING_ACE_CONTROLLED_SIDESLIP_SOURCE_REFS,
  MEKSTATION_MANEUVERING_ACE_CONTROLLED_SIDESLIP_SOURCE_REFS,
  MEKSTATION_MANEUVERING_ACE_FLANKING_TURNING_SOURCE_REFS,
  MEKSTATION_MANEUVERING_ACE_OUT_OF_CONTROL_PSR_SOURCE_REFS,
  MEGAMEK_MANEUVERING_ACE_OUT_OF_CONTROL_PRODUCER_SOURCE_REFS,
  MEGAMEK_MANEUVERING_ACE_AEROSPACE_MOVEMENT_SOURCE_REFS,
  MEKSTATION_MANEUVERING_ACE_MOVEMENT_SOURCE_REFS,
  MEKSTATION_NIGHTWALKER_LIGHT_MOVEMENT_SOURCE_REFS,
} from './CombatPilotModifierApplicationSupport.sourceRefs.movement';
import {
  MEGAMEK_CROSS_COUNTRY_SOURCE_REFS,
  MEKSTATION_LOCAL_ONLY_SPA_SOURCE_REFS,
  MEGAMEK_SECONDARY_TARGET_MULTI_TASKER_SOURCE_REFS,
  MEGAMEK_PROTO_DNI_TARGET_NUMBER_SOURCE_REFS,
  MEGAMEK_VDNI_TARGET_NUMBER_SOURCE_REFS,
} from './CombatPilotModifierSourceRefs';

export const PILOT_MODIFIER_RESOLVER_MOVEMENT_ENVIRONMENT_SUPPORT = {
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
