import type { IAnomaly } from '@/types/simulation-viewer/IAnomaly';

import { IGameEvent, IGameState } from '@/types/gameplay';

import type { BattleState as AnomalyBattleState } from '../detectors/HeatSuicideDetector';
import type { BattleState as KeyMomentBattleState } from '../detectors/KeyMomentDetector';
import type { IViolation } from '../invariants/types';
import type { IDetectorConfig } from './types';

import { HeatSuicideDetector } from '../detectors/HeatSuicideDetector';
import { KeyMomentDetector } from '../detectors/KeyMomentDetector';
import { LongGameDetector } from '../detectors/LongGameDetector';
import { NoProgressDetector } from '../detectors/NoProgressDetector';
import { PassiveUnitDetector } from '../detectors/PassiveUnitDetector';
import { StateCycleDetector } from '../detectors/StateCycleDetector';

export interface IAnomalyDetectors {
  readonly heatSuicide: HeatSuicideDetector;
  readonly passiveUnit: PassiveUnitDetector;
  readonly noProgress: NoProgressDetector;
  readonly longGame: LongGameDetector;
  readonly stateCycle: StateCycleDetector;
}

export function runAllAnomalyDetectors(
  events: readonly IGameEvent[],
  battleState: AnomalyBattleState,
  detectors: IAnomalyDetectors,
  detectorConfig: IDetectorConfig,
): IAnomaly[] {
  return [
    ...detectors.heatSuicide.detect(
      events,
      battleState,
      detectorConfig.heatSuicideThreshold,
    ),
    ...detectors.passiveUnit.detect(
      events,
      battleState,
      detectorConfig.passiveUnitTurns,
    ),
    ...detectors.noProgress.detect(
      events,
      battleState,
      detectorConfig.noProgressTurns,
    ),
    ...detectors.longGame.detect(events, detectorConfig.longGameTurns),
    ...detectors.stateCycle.detect(
      events,
      battleState,
      detectorConfig.stateCycleLength,
    ),
  ];
}

export function convertAnomaliesToViolations(
  anomalies: readonly IAnomaly[],
): IViolation[] {
  return anomalies.map((anomaly) => ({
    invariant: `detector:${anomaly.type}`,
    severity:
      anomaly.severity === 'critical'
        ? ('critical' as const)
        : ('warning' as const),
    message: anomaly.message,
    context: {
      anomalyId: anomaly.id,
      turn: anomaly.turn,
      unitId: anomaly.unitId,
      thresholdUsed: anomaly.thresholdUsed,
      actualValue: anomaly.actualValue,
    },
  }));
}

export function buildKeyMomentBattleState(
  state: IGameState,
): KeyMomentBattleState {
  const units = Object.values(state.units).map((unit) => ({
    id: unit.id,
    name: unit.id,
    side: unit.side,
    bv: 1000,
    weaponIds: [`${unit.id}-weapon-1`],
    initialArmor: { ...unit.armor },
    initialStructure: { ...unit.structure },
  }));
  return { units };
}

export function buildAnomalyBattleState(state: IGameState): AnomalyBattleState {
  const units = Object.values(state.units).map((unit) => ({
    id: unit.id,
    name: unit.id,
    side: unit.side,
  }));
  return { units };
}

export function createKeyMomentDetector(): KeyMomentDetector {
  return new KeyMomentDetector();
}

export function createAnomalyDetectors(): IAnomalyDetectors {
  return {
    heatSuicide: new HeatSuicideDetector(),
    passiveUnit: new PassiveUnitDetector(),
    noProgress: new NoProgressDetector(),
    longGame: new LongGameDetector(),
    stateCycle: new StateCycleDetector(),
  };
}
