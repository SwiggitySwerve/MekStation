import type { D6Roller } from '@/utils/gameplay/hitLocation';

import {
  type IComponentDamageState,
  type IPendingPSR,
  type IUnitGameState,
  PSRTrigger,
} from '@/types/gameplay';
import {
  type IPSRBatchResult,
  type IPSRResult,
  resolvePSR,
} from '@/utils/gameplay/pilotingSkillRolls';
import {
  canUseEdge,
  type EdgeTriggerType,
  type IEdgeState,
  useEdge as consumeEdgePoint,
} from '@/utils/gameplay/spaModifiers';

const MASC_SUPERCHARGER_EDGE_TRIGGER =
  'edge_when_masc_fails' satisfies EdgeTriggerType;

export interface IRunnerPSRResult extends IPSRResult {
  readonly edgeReroll?: boolean;
  readonly edgeSuperseded?: boolean;
  readonly edgeTrigger?: EdgeTriggerType;
  readonly edgePointsRemaining?: number;
}

export interface IRunnerPSRBatchResult extends IPSRBatchResult {
  readonly results: readonly IRunnerPSRResult[];
  readonly failedResult?: IRunnerPSRResult;
  readonly unit: IUnitGameState;
}

function isMASCOrSuperchargerFailurePSR(psr: IPendingPSR): boolean {
  const reason = psr.reasonCode ?? psr.triggerSource;
  return (
    reason === PSRTrigger.MASCFailure ||
    reason === PSRTrigger.SuperchargerFailure
  );
}

function isStuckFailurePSR(psr: IPendingPSR): boolean {
  return (psr.reasonCode ?? psr.triggerSource) === PSRTrigger.SwampBogDown;
}

function canUseMASCFailureEdge(
  unit: IUnitGameState,
  psr: IRunnerPSRResult,
): boolean {
  const edgePoints = unit.edgePointsRemaining ?? 0;
  const edgeState: IEdgeState = {
    maxPoints: edgePoints,
    remainingPoints: edgePoints,
    usageHistory: [],
  };
  return (
    isMASCOrSuperchargerFailurePSR(psr.psr) &&
    (unit.abilities ?? []).includes(MASC_SUPERCHARGER_EDGE_TRIGGER) &&
    canUseEdge(edgeState, MASC_SUPERCHARGER_EDGE_TRIGGER)
  );
}

function consumeMASCFailureEdge(options: {
  readonly unit: IUnitGameState;
  readonly unitId: string;
  readonly turn: number;
  readonly psr: IRunnerPSRResult;
}): IUnitGameState {
  const edgePoints = options.unit.edgePointsRemaining ?? 0;
  const nextEdge = consumeEdgePoint(
    {
      maxPoints: edgePoints,
      remainingPoints: edgePoints,
      usageHistory: [],
    },
    MASC_SUPERCHARGER_EDGE_TRIGGER,
    options.turn,
    options.unitId,
    `${options.psr.psr.reason} reroll`,
  );
  return {
    ...options.unit,
    edgePointsRemaining: nextEdge.remainingPoints,
  };
}

export function resolveRunnerPSRs(options: {
  readonly unit: IUnitGameState;
  readonly unitId: string;
  readonly pendingPSRs: readonly IPendingPSR[];
  readonly componentDamage: IComponentDamageState;
  readonly pilotingSkill: number;
  readonly d6Roller: D6Roller;
  readonly turn: number;
}): IRunnerPSRBatchResult {
  if (options.pendingPSRs.length === 0) {
    return {
      results: [],
      unitFell: false,
      clearedPSRs: [],
      unit: options.unit,
    };
  }

  const results: IRunnerPSRResult[] = [];
  const clearedPSRs: IPendingPSR[] = [];
  let currentUnit = options.unit;

  for (let i = 0; i < options.pendingPSRs.length; i++) {
    const psr = options.pendingPSRs[i];
    const result: IRunnerPSRResult = resolvePSR(
      options.pilotingSkill,
      psr,
      options.componentDamage,
      currentUnit.pilotWounds,
      options.d6Roller,
      {
        unitQuirks: currentUnit.unitQuirks ?? [],
        pilotAbilities: currentUnit.abilities ?? [],
        neuralInterfaceActive: currentUnit.neuralInterfaceActive,
        isQuadMek: currentUnit.isQuad ?? false,
        unitType: currentUnit.unitType,
      },
    );
    results.push(result);

    if (result.passed) {
      continue;
    }

    if (canUseMASCFailureEdge(currentUnit, result)) {
      currentUnit = consumeMASCFailureEdge({
        unit: currentUnit,
        unitId: options.unitId,
        turn: options.turn,
        psr: result,
      });
      results[results.length - 1] = {
        ...result,
        edgeSuperseded: true,
        edgeTrigger: MASC_SUPERCHARGER_EDGE_TRIGGER,
        edgePointsRemaining: currentUnit.edgePointsRemaining,
      };

      const reroll: IRunnerPSRResult = {
        ...resolvePSR(
          options.pilotingSkill,
          psr,
          options.componentDamage,
          currentUnit.pilotWounds,
          options.d6Roller,
          {
            unitQuirks: currentUnit.unitQuirks ?? [],
            pilotAbilities: currentUnit.abilities ?? [],
            neuralInterfaceActive: currentUnit.neuralInterfaceActive,
            isQuadMek: currentUnit.isQuad ?? false,
            unitType: currentUnit.unitType,
          },
        ),
        edgeReroll: true,
        edgeTrigger: MASC_SUPERCHARGER_EDGE_TRIGGER,
        edgePointsRemaining: currentUnit.edgePointsRemaining,
      };
      results.push(reroll);
      if (reroll.passed) {
        continue;
      }

      for (let j = i + 1; j < options.pendingPSRs.length; j++) {
        clearedPSRs.push(options.pendingPSRs[j]);
      }
      return {
        results,
        unitFell: true,
        clearedPSRs,
        failedResult: reroll,
        unit: currentUnit,
      };
    }

    for (let j = i + 1; j < options.pendingPSRs.length; j++) {
      clearedPSRs.push(options.pendingPSRs[j]);
    }
    if (isStuckFailurePSR(psr)) {
      return {
        results,
        unitFell: false,
        unitStuck: true,
        clearedPSRs,
        failedResult: result,
        unit: currentUnit,
      };
    }
    return {
      results,
      unitFell: true,
      clearedPSRs,
      failedResult: result,
      unit: currentUnit,
    };
  }

  return {
    results,
    unitFell: false,
    clearedPSRs: [],
    unit: currentUnit,
  };
}
