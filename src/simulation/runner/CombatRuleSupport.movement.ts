import {
  integrated,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';
import {
  MEGAMEK_ELEVATION_MOVEMENT_SOURCE_REFS,
  MEGAMEK_FACING_MOVEMENT_SOURCE_REFS,
  MEGAMEK_GO_PRONE_MOVEMENT_SOURCE_REFS,
  MEGAMEK_HEAT_MOVEMENT_PENALTY_SOURCE_REFS,
  MEGAMEK_JUMP_MOVEMENT_SOURCE_REFS,
  MEGAMEK_OCCUPANCY_MOVEMENT_SOURCE_REFS,
  MEGAMEK_RUN_MOVEMENT_SOURCE_REFS,
  MEGAMEK_STAND_MOVEMENT_SOURCE_REFS,
  MEGAMEK_TORSO_TWIST_SOURCE_REFS,
  MEGAMEK_WALK_MOVEMENT_SOURCE_REFS,
} from './CombatMovementSourceRefs';
import { mekstationDeviationSourceRef } from './CombatRuleSupport.sourceRefs';

export const MOVEMENT_RULE_COMBAT_SUPPORT = {
  walk: integrated(
    'walk',
    'validateMovement + GameEngine/InteractiveSession movement validation consume walking MP',
    MEGAMEK_WALK_MOVEMENT_SOURCE_REFS,
  ),
  run: integrated(
    'run',
    'validateMovement consumes running MP and movement modifiers expose run heat/to-hit cost',
    MEGAMEK_RUN_MOVEMENT_SOURCE_REFS,
  ),
  jump: integrated(
    'jump',
    // Audit 2026-06-09 C-13: validateMovement now enforces the jump
    // elevation/clearance terrain gates the reachability projection already
    // used — the old blurb claimed integration while only reachable.ts gated.
    'validateMovement enforces jump MP/no-jump-jets plus the shared jump elevation/clearance terrain gates and ignores ground terrain entry modifiers',
    MEGAMEK_JUMP_MOVEMENT_SOURCE_REFS,
  ),
  stand: integrated(
    'stand',
    'runMovementPhase resolves stand-up PSRs for prone units and emits UnitStood on success',
    MEGAMEK_STAND_MOVEMENT_SOURCE_REFS,
  ),
  prone: integrated(
    'prone',
    'unit prone state, fall/standing helpers, explicit non-Mek/already-prone/stuck go-prone legality, hull-down zero-MP go-prone transition clearing hull-down state, voluntary go-prone game-session/interactive action path, and opt-in BotPlayer/runner AI same-hex go-prone movement-step handling',
    MEGAMEK_GO_PRONE_MOVEMENT_SOURCE_REFS,
  ),
  'go-prone-battlemech-swarmer-dislodgement': integrated(
    'go-prone-battlemech-swarmer-dislodgement',
    'Represented BattleMech go-prone swarmer dislodgement emits replayable SwarmDismounted events with cause go_prone_dislodgement and clears attached squad swarming state in runner and replay paths',
    [
      ...MEGAMEK_GO_PRONE_MOVEMENT_SOURCE_REFS,
      mekstationDeviationSourceRef(
        'MekStation ISwarmDismountedPayload includes go_prone_dislodgement as a replayable dismount cause.',
        'src/types/gameplay/BattleArmorCombatInterfaces.ts',
        'L296-L302',
      ),
      mekstationDeviationSourceRef(
        'MekStation clearGoProneSwarmers clears attached squad swarm state and emits SwarmDismounted with cause go_prone_dislodgement.',
        'src/simulation/runner/phases/movementUnitTurn.ts',
        'L300-L351',
      ),
      mekstationDeviationSourceRef(
        'MekStation GO_PRONE movement calls clearGoProneSwarmers after the BattleMech prone state is committed.',
        'src/simulation/runner/phases/movementUnitTurn.ts',
        'L230-L267',
      ),
      mekstationDeviationSourceRef(
        'MekStation applySwarmDismounted clears isSwarming and swarmingUnitId from replayed swarmer state.',
        'src/utils/gameplay/gameState/eventDispatch.ts',
        'L151-L188',
      ),
      mekstationDeviationSourceRef(
        'MekStation event dispatch replays SwarmDismounted through applySwarmDismounted.',
        'src/utils/gameplay/gameState/eventDispatch.ts',
        'L298-L299',
      ),
    ],
  ),
  'go-prone-hull-down-zero-mp-transition': integrated(
    'go-prone-hull-down-zero-mp-transition',
    'Represented hull-down go-prone resolves as a zero-MP same-hex GO_PRONE movement step and clears hull-down posture when the runner commits the prone state',
    [
      ...MEGAMEK_GO_PRONE_MOVEMENT_SOURCE_REFS,
      mekstationDeviationSourceRef(
        'MekStation getGoProneMpCost returns zero MP for hull-down go-prone and one MP otherwise.',
        'src/utils/gameplay/gameSessionProne.ts',
        'L27-L31',
      ),
      mekstationDeviationSourceRef(
        'MekStation createGoPronePayload records the go-prone MP cost into the MovementDeclared payload and go-prone movement step.',
        'src/simulation/runner/phases/movementUnitTurn.ts',
        'L270-L298',
      ),
      mekstationDeviationSourceRef(
        'MekStation applyMovementEvent marks committed go-prone movement prone and clears hullDown on go-prone steps.',
        'src/simulation/runner/SimulationRunnerState.ts',
        'L397-L434',
      ),
    ],
  ),
  'go-prone-enemy-occupied-start-follow-up-block': integrated(
    'go-prone-enemy-occupied-start-follow-up-block',
    'Represented enemy-occupied-start follow-up movement is blocked by movement validation/projection while same-hex GO_PRONE posture remains legal',
    [
      ...MEGAMEK_GO_PRONE_MOVEMENT_SOURCE_REFS,
      mekstationDeviationSourceRef(
        'MekStation validateMovement rejects follow-up movement from a start hex occupied by another unit while leaving same-hex posture actions legal.',
        'src/utils/gameplay/movement/validation.ts',
        'L80-L101',
      ),
      mekstationDeviationSourceRef(
        'MekStation deriveMovementRangeHexForDestination marks follow-up movement from another-unit occupied start hexes blocked in movement projection.',
        'src/utils/gameplay/movement/reachable.ts',
        'L447-L472',
      ),
    ],
  ),
  'go-prone-side-paths': integrated(
    'go-prone-side-paths',
    'Core same-hex voluntary go-prone posture is integrated under the prone row, represented BattleMech swarmer dislodgement is integrated under go-prone-battlemech-swarmer-dislodgement, hull-down zero-MP posture transition is integrated under go-prone-hull-down-zero-mp-transition, enemy-occupied-start follow-up blocking is integrated under go-prone-enemy-occupied-start-follow-up-block, and runner plus interactive GO_PRONE reducers clear explicit BattleMech infernoBurning state instead of inferring coverage from Inferno ammo catalog rows',
    [
      ...MEGAMEK_GO_PRONE_MOVEMENT_SOURCE_REFS,
      mekstationDeviationSourceRef(
        'MekStation IUnitGameState carries explicit infernoBurning BattleMech effect state that GO_PRONE movement can clear.',
        'src/types/gameplay/GameSessionStateTypes.ts',
        'L318-L326',
      ),
      mekstationDeviationSourceRef(
        'MekStation runner applyMovementEvent clears infernoBurning when a GO_PRONE movement step is committed.',
        'src/simulation/runner/SimulationRunnerState.ts',
        'L411-L433',
      ),
      mekstationDeviationSourceRef(
        'MekStation interactive applyMovementDeclared clears infernoBurning for GO_PRONE movement events.',
        'src/utils/gameplay/gameState/actionLocking.ts',
        'L29-L82',
      ),
      mekstationDeviationSourceRef(
        'MekStation runner movement tests prove GO_PRONE clears explicit infernoBurning state while preserving source-backed posture behavior.',
        'src/simulation/runner/__tests__/movementPhase.behavior.test.ts',
        'L1855-L1935',
      ),
      mekstationDeviationSourceRef(
        'MekStation interactive goProne tests prove local movement events clear explicit infernoBurning state.',
        'src/utils/gameplay/__tests__/gameSessionGoProne.test.ts',
        'L55-L190',
      ),
    ],
  ),
  facing: integrated(
    'facing',
    'validateMovement charges path-alignment and terminal facing turns, movement declarations commit final facing, and eventPath reports turning MP',
    MEGAMEK_FACING_MOVEMENT_SOURCE_REFS,
  ),
  'torso-twist': integrated(
    'torso-twist',
    'Source-backed torsoTwist validates BattleMech WeaponAttack legality, no_twist/ext_twist quirks, prone/bracing/already-twisted gates, and emits FacingChanged secondaryFacing state through local UI, game intent, wire, P2P, server dispatch, replay, AI arc projection, and runner secondary-target math',
    MEGAMEK_TORSO_TWIST_SOURCE_REFS,
  ),
  occupancy: integrated(
    'occupancy',
    'validateMovement rejects occupied destination hexes before MP or heat side effects',
    MEGAMEK_OCCUPANCY_MOVEMENT_SOURCE_REFS,
  ),
  elevation: integrated(
    'elevation',
    'getHexMovementCost and pathfinding reject ground climbs above legal elevation delta',
    MEGAMEK_ELEVATION_MOVEMENT_SOURCE_REFS,
  ),
  'heat-mp-penalty': integrated(
    'heat-mp-penalty',
    'validateMovement applies getHeatMovementPenalty to walk MP and re-derives run/sprint MP from the heat-adjusted walk; jump MP is heat-immune',
    MEGAMEK_HEAT_MOVEMENT_PENALTY_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
