/**
 * Objective lifecycle event reducers.
 *
 * Per `add-scenario-objective-engine` (design.md D7): `ObjectiveCaptured`
 * / `ObjectiveLost` / `ObjectiveProgress` events fully describe the
 * mutable objective state, so replaying the event log reconstructs
 * `state.objectives` exactly.
 *
 * @spec openspec/changes/add-scenario-objective-engine/specs/scenario-objectives/spec.md
 */

import type {
  IGameState,
  IObjectiveCapturedPayload,
  IObjectiveLostPayload,
  IObjectiveProgressPayload,
} from '@/types/gameplay';
import type { IObjectiveMarker } from '@/types/scenario/ScenarioInterfaces';

/**
 * Locates an objective marker by its stable id within `state.objectives`.
 * Returns the `[hexKey, marker]` pair, or `null` when absent.
 */
function findObjective(
  state: IGameState,
  objectiveId: string,
): readonly [string, IObjectiveMarker] | null {
  const objectives = state.objectives;
  if (!objectives) return null;
  for (const [hexKey, marker] of Object.entries(objectives)) {
    if (marker.id === objectiveId) return [hexKey, marker];
  }
  return null;
}

/**
 * Applies an `ObjectiveCaptured` event — sets the marker's
 * `controlSide` to the capturing side.
 */
export function applyObjectiveCaptured(
  state: IGameState,
  payload: IObjectiveCapturedPayload,
): IGameState {
  const found = findObjective(state, payload.objectiveId);
  if (!found || !state.objectives) return state;
  const [hexKey, marker] = found;
  return {
    ...state,
    objectives: {
      ...state.objectives,
      [hexKey]: { ...marker, controlSide: payload.capturingSide },
    },
  };
}

/**
 * Applies an `ObjectiveLost` event — resets the marker's accrued hold.
 * `controlSide` is sticky (design.md D3): a contested / vacated hex
 * keeps its last controller, so only `holdProgress` clears here.
 */
export function applyObjectiveLost(
  state: IGameState,
  payload: IObjectiveLostPayload,
): IGameState {
  const found = findObjective(state, payload.objectiveId);
  if (!found || !state.objectives) return state;
  const [hexKey, marker] = found;
  return {
    ...state,
    objectives: {
      ...state.objectives,
      [hexKey]: { ...marker, holdProgress: 0 },
    },
  };
}

/**
 * Applies an `ObjectiveProgress` event — the canonical carrier of the
 * marker's mutable state. Sets both `controlSide` and `holdProgress`
 * from the payload so a log that contains progress events fully
 * reconstructs objective state on replay.
 */
export function applyObjectiveProgress(
  state: IGameState,
  payload: IObjectiveProgressPayload,
): IGameState {
  const found = findObjective(state, payload.objectiveId);
  if (!found || !state.objectives) return state;
  const [hexKey, marker] = found;
  return {
    ...state,
    objectives: {
      ...state.objectives,
      [hexKey]: {
        ...marker,
        controlSide: payload.controlSide,
        holdProgress: payload.holdProgress,
      },
    },
  };
}
