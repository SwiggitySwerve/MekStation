/**
 * HeatSuicideDetector - Detects units generating excessive heat
 *
 * Identifies units that generate heat above a configurable threshold,
 * with an exemption for units in last-ditch scenarios (outnumbered 3:1 or more).
 */

import type { IAnomaly } from '@/types/simulation-viewer/IAnomaly';

import {
  GameEventType,
  GameSide,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import type {
  BasicBattleState as BattleState,
  BasicBattleUnit as BattleUnit,
} from './shared/battleState';

import {
  countOperationalUnits,
  getUnitName,
  getUnitSide,
} from './shared/battleState';
import { getPayload } from './utils/getPayload';

export type { BattleState, BattleUnit };

/** Default heat threshold for anomaly detection */
const DEFAULT_HEAT_THRESHOLD = 30;

/** Outnumbering ratio for last-ditch exemption (3:1 or more) */
const LAST_DITCH_RATIO = 3;

interface DetectorTrackingState {
  heatPerUnitPerTurn: Map<number, Map<string, number>>;
  destroyedUnits: Set<string>;
  anomalies: IAnomaly[];
  anomalyCounter: number;
}

/**
 * Checks if a unit is outnumbered 3:1 or more (last-ditch scenario).
 */
function isLastDitchScenario(
  units: readonly BattleUnit[],
  destroyedUnits: Set<string>,
  unitId: string,
): boolean {
  const unitSide = getUnitSide(units, unitId);
  if (!unitSide) return false;

  const enemySide =
    unitSide === GameSide.Player ? GameSide.Opponent : GameSide.Player;
  const allyCount = countOperationalUnits(units, destroyedUnits, unitSide);
  const enemyCount = countOperationalUnits(units, destroyedUnits, enemySide);

  // Unit is outnumbered 3:1 or more if enemy count >= 3 * ally count
  return enemyCount >= LAST_DITCH_RATIO * allyCount;
}

/**
 * Detects units generating excessive heat from a stream of game events.
 *
 * Processes HeatGenerated events and identifies units that exceed a heat threshold,
 * with an exemption for units in last-ditch scenarios (outnumbered 3:1 or more).
 */
export class HeatSuicideDetector {
  detect(
    events: readonly IGameEvent[],
    battleState: BattleState,
    threshold: number = DEFAULT_HEAT_THRESHOLD,
  ): IAnomaly[] {
    const state: DetectorTrackingState = {
      heatPerUnitPerTurn: new Map(),
      destroyedUnits: new Set(),
      anomalies: [],
      anomalyCounter: 0,
    };

    for (const event of events) {
      if (event.type === GameEventType.HeatGenerated) {
        this.processHeatGenerated(event, battleState, state, threshold);
      } else if (event.type === GameEventType.UnitDestroyed) {
        state.destroyedUnits.add(
          getPayload(event, GameEventType.UnitDestroyed).unitId,
        );
      }
    }

    return state.anomalies;
  }

  private processHeatGenerated(
    event: IGameEvent,
    battleState: BattleState,
    heatState: DetectorTrackingState,
    threshold: number,
  ): void {
    const payload = getPayload(event, GameEventType.HeatGenerated);
    const { unitId, newTotal } = payload;

    if (!heatState.heatPerUnitPerTurn.has(event.turn)) {
      heatState.heatPerUnitPerTurn.set(event.turn, new Map());
    }
    const turnHeat = heatState.heatPerUnitPerTurn.get(event.turn)!;
    turnHeat.set(unitId, newTotal);

    if (newTotal > threshold) {
      if (
        isLastDitchScenario(battleState.units, heatState.destroyedUnits, unitId)
      ) {
        return;
      }

      const unitName = getUnitName(battleState.units, unitId);
      const anomaly = this.createAnomaly(
        event,
        unitId,
        unitName,
        newTotal,
        threshold,
        heatState,
      );
      heatState.anomalies.push(anomaly);
    }
  }

  private createAnomaly(
    event: IGameEvent,
    unitId: string,
    unitName: string,
    actualValue: number,
    threshold: number,
    state: DetectorTrackingState,
  ): IAnomaly {
    const id = `anom-heat-suicide-${event.turn}-${state.anomalyCounter++}`;

    return {
      id,
      type: 'heat-suicide',
      severity: 'warning',
      battleId: event.gameId,
      turn: event.turn,
      unitId,
      message: `${unitName} generated ${actualValue} heat (threshold: ${threshold})`,
      thresholdUsed: threshold,
      actualValue,
      configKey: 'heatSuicideThreshold',
      timestamp: Date.parse(event.timestamp) || Date.now(),
    };
  }
}
