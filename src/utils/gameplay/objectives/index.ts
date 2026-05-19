/**
 * Scenario Objective Engine — public barrel.
 *
 * @spec openspec/changes/add-scenario-objective-engine/specs/scenario-objectives/spec.md
 */

export {
  ATTACKER_SIDE,
  DEFENDER_SIDE,
  advanceObjectiveControl,
  detectObjectiveControl,
  evaluateObjectiveOutcome,
  gameSideToObjectiveSide,
  objectiveSideToGameSide,
} from './objectiveEngine';
export type { IObjectiveControlChange } from './objectiveEngine';

export {
  DEFAULT_BREAKTHROUGH_REQUIRED_UNITS,
  DEFAULT_CAPTURE_HOLD_TURNS,
  deriveObjectivePlacementConfig,
  objectiveMarkerTypeFor,
  placeObjectives,
} from './objectivePlacement';
export type { IObjectiveZoneConfig } from './objectivePlacement';

export {
  createObjectiveCapturedEvent,
  createObjectiveLostEvent,
  createObjectiveProgressEvent,
  runObjectiveControlPass,
} from './objectiveEvents';
