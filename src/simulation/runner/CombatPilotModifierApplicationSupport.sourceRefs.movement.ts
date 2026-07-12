import { combatFeatureSourceRef as pilotModifierApplicationSourceRef } from './CombatFeatureSourceReference';
import { type ICombatFeatureSourceReference } from './CombatFeatureSupport';

const MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

export const MEGAMEK_MANEUVERING_ACE_LATERAL_MOVEMENT_SOURCE_REFS = [
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek MovePath.canShift lets Maneuvering Ace biped Meks perform lateral shifts.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/moves/MovePath.java#L252-L266`,
    MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek SideStepStep preserves base lateral-step MP for QuadMek units with Maneuvering Ace instead of adding the normal side-step surcharge.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/moves/SideStepStep.java#L47-L57`,
    MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek OptionsConstants defines PILOT_MANEUVERING_ACE as maneuvering_ace.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/options/OptionsConstants.java#L173-L180`,
    MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_MANEUVERING_ACE_BATTLEMECH_MOVEMENT_RESIDUAL_SOURCE_REFS =
  [
    pilotModifierApplicationSourceRef(
      'megamek-source',
      'MegaMek MovePath.canShift lets Maneuvering Ace biped Meks perform lateral shifts.',
      `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/moves/MovePath.java#L252-L266`,
      MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
    ),
    pilotModifierApplicationSourceRef(
      'megamek-source',
      'MegaMek SideStepStep preserves base lateral-step MP for QuadMek units with Maneuvering Ace instead of adding the normal side-step surcharge.',
      `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/moves/SideStepStep.java#L47-L57`,
      MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
    ),
    pilotModifierApplicationSourceRef(
      'megamek-source',
      'MegaMek Entity.checkSideSlip applies Maneuvering Ace relief to flanking-and-turning checks and suppresses controlled-sideslip checks for walking Maneuvering Ace units.',
      `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L11978-L11998`,
      MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
    ),
    pilotModifierApplicationSourceRef(
      'megamek-source',
      'MegaMek TWGameManager.getPilotingRollData applies -1 Maneuvering Ace to out-of-control control rolls without applying it to recovery rolls.',
      `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L16908-L16920`,
      MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
    ),
    pilotModifierApplicationSourceRef(
      'megamek-source',
      'MegaMek OptionsConstants defines PILOT_MANEUVERING_ACE as maneuvering_ace.',
      `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/options/OptionsConstants.java#L173-L180`,
      MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_MANEUVERING_ACE_CONTROLLED_SIDESLIP_SOURCE_REFS =
  MEGAMEK_MANEUVERING_ACE_BATTLEMECH_MOVEMENT_RESIDUAL_SOURCE_REFS.filter(
    ({ citation }) =>
      citation.includes('checkSideSlip') ||
      citation.includes('PILOT_MANEUVERING_ACE'),
  );

export const MEKSTATION_MANEUVERING_ACE_CONTROLLED_SIDESLIP_SOURCE_REFS = [
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation movementControlPsr queues represented controlled-sideslip PSRs for lateral movement steps and suppresses walking Maneuvering Ace lateral shifts.',
    'src/simulation/runner/phases/movementControlPsr.ts#L34-L91',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation runner movement coverage proves walking Maneuvering Ace lateral shifts suppress controlled-sideslip PSRs while running lateral shifts emit controlled_sideslip with a movement-step trigger source.',
    'src/simulation/runner/__tests__/movementPhase.behavior.test.ts#L375-L436',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_MANEUVERING_ACE_FLANKING_TURNING_SOURCE_REFS = [
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation movementControlPsr queues one represented flanking-and-turning PSR for BattleMech run/sprint movement when movement-step decomposition changes facing after moving more than one hex, while excluding Infantry and ProtoMech units.',
    'src/simulation/runner/phases/movementControlPsr.ts#L47-L221',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation runner movement coverage proves represented BattleMech flanking-and-turning production plus walking, straight-running, Infantry, and ProtoMech non-production cases.',
    'src/simulation/runner/__tests__/movementPhase.behavior.test.ts#L464-L596',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_MANEUVERING_ACE_OUT_OF_CONTROL_PSR_SOURCE_REFS = [
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation createOutOfControlPSR plus calculatePSRModifiers and runPSRPhase consume Maneuvering Ace pilot ability state for represented out-of-control pending PSR target-number relief.',
    'src/utils/gameplay/pilotingSkillRolls/systemFactories.ts#L111',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_MANEUVERING_ACE_OUT_OF_CONTROL_PRODUCER_SOURCE_REFS = [
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek TWGameManager.resolveControl resolves control rolls only for a single aero or airborne LAM in AirMek mode, returning before control-roll production for ordinary BattleMechs.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L16694-L16718`,
    MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek TWGameManager.getPilotingRollData applies -1 Maneuvering Ace to out-of-control control rolls without applying it to recovery rolls.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L16907-L16920`,
    MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek MovePathHandler queues aero control rolls for thrust, velocity, descent, hover, and stall movement side paths.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/MovePathHandler.java#L569-L605`,
    MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek HeatResolver queues heat-driven control rolls for DropShip, JumpShip, and capital fighter heat side paths.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/HeatResolver.java#L1022-L1038`,
    MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek OptionsConstants defines PILOT_MANEUVERING_ACE as maneuvering_ace.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/options/OptionsConstants.java#L173-L180`,
    MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  ),
  ...MEKSTATION_MANEUVERING_ACE_OUT_OF_CONTROL_PSR_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_MANEUVERING_ACE_AEROSPACE_MOVEMENT_SOURCE_REFS = [
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek ManeuverStep reduces aerospace maneuver thrust cost by 1 for Maneuvering Ace.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/moves/ManeuverStep.java#L60-L66`,
    MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  ),
  pilotModifierApplicationSourceRef(
    'megamek-source',
    'MegaMek OptionsConstants defines PILOT_MANEUVERING_ACE as maneuvering_ace.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/options/OptionsConstants.java#L173-L180`,
    MEGAMEK_PILOT_MOVEMENT_SOURCE_VERSION,
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_MANEUVERING_ACE_MOVEMENT_SOURCE_REFS = [
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation validateMovement, runMovementPhase, and movement step decomposition consume Maneuvering Ace pilot ability state for biped lateral shifts and source-backed QuadMek lateral-step MP relief.',
    'src/utils/gameplay/movement/validation.ts#L50',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_NIGHTWALKER_LIGHT_MOVEMENT_SOURCE_REFS = [
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation getMovementStepCostBreakdown consumes tm_nightwalker to waive represented low-light movement penalties, including full moon, glare, moonless, solar flare, and pitch black, and fail-closed prohibit run-derived movement in represented low light.',
    'src/utils/gameplay/movement/calculations.ts#L466-L486',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation runner movement coverage proves represented low-light movement penalties, tm_nightwalker relief, and Nightwalker run prohibition before movement is committed for legacy and MegaMek light states.',
    'src/simulation/runner/__tests__/movementPhase.behavior.test.ts#L692-L752',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation reachable movement coverage proves represented low-light Nightwalker movement relief and run prohibition in projection and commit validation paths for legacy and MegaMek light states.',
    'src/utils/gameplay/movement/__tests__/reachable.18.movement-heat-and-validator-agreement-audi.test.ts#L113-L249',
    'MekStation working-tree',
  ),
  pilotModifierApplicationSourceRef(
    'mekstation-deviation',
    'MekStation reachable and commit movement coverage proves represented airborne LAM AirMek units with tm_nightwalker remain blocked from low-light ground projection before Nightwalker relief can apply.',
    'src/utils/gameplay/movement/__tests__/reachable.19.movement-heat-and-validator-agreement-audi.test.ts#L31-L91',
    'MekStation working-tree',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
