import type { D6Roller } from '../diceTypes';

import { roll2d6 } from '../hitLocation';
import {
  createEdgeState,
  getConsciousnessCheckModifier,
  resolveEdgeBattleMechTrigger,
} from '../spaModifiers';
import { PILOT_DEATH_WOUND_THRESHOLD } from './constants';
import {
  IPilotDamageResultWithState,
  IUnitDamageState,
  PilotDamageSource,
} from './types';

const PILOT_KO_EDGE_TRIGGER = 'edge_when_ko' as const;

export interface IPilotConsciousnessEdgeOptions {
  readonly edgePointsRemaining?: number;
  readonly turn?: number;
  readonly unitId?: string;
}

export interface IPilotConsciousnessCheckResult {
  readonly consciousnessCheckRequired: boolean;
  readonly consciousnessRoll?: ReturnType<typeof roll2d6>;
  readonly consciousnessTarget?: number;
  readonly conscious?: boolean;
  readonly edgeReroll?: boolean;
  readonly edgeSuperseded?: boolean;
  readonly edgeTrigger?: typeof PILOT_KO_EDGE_TRIGGER;
  readonly edgePointsRemaining?: number;
  readonly supersededConsciousnessRoll?: ReturnType<typeof roll2d6>;
}

export interface IPilotWakeUpCheckResult {
  readonly wakeUpCheckRequired: boolean;
  readonly wakeUpRoll?: ReturnType<typeof roll2d6>;
  readonly wakeUpTarget?: number;
  readonly conscious?: boolean;
}

function getConsciousnessTarget(
  totalWounds: number,
  pilotAbilities: readonly string[],
  pilotToughness: number,
): number {
  const toughnessModifier = Math.max(0, Math.trunc(pilotToughness));
  return (
    3 +
    totalWounds +
    getConsciousnessCheckModifier(pilotAbilities) -
    toughnessModifier
  );
}

export function resolvePilotConsciousnessCheck(
  totalWounds: number,
  woundsInflicted: number,
  pilotAbilities: readonly string[] = [],
  roller?: D6Roller,
  pilotToughness = 0,
  edgeOptions: IPilotConsciousnessEdgeOptions = {},
): IPilotConsciousnessCheckResult {
  const consciousnessCheckRequired =
    woundsInflicted > 0 && totalWounds < PILOT_DEATH_WOUND_THRESHOLD;
  if (!consciousnessCheckRequired) {
    return { consciousnessCheckRequired };
  }

  const consciousnessTarget = getConsciousnessTarget(
    totalWounds,
    pilotAbilities,
    pilotToughness,
  );
  const consciousnessRoll = roll2d6(roller);
  const firstRollPassed = consciousnessRoll.total >= consciousnessTarget;
  if (!firstRollPassed) {
    const edgePointsRemaining = edgeOptions.edgePointsRemaining ?? 0;
    const edgeResolution = resolveEdgeBattleMechTrigger({
      trigger: PILOT_KO_EDGE_TRIGGER,
      edgeState:
        edgePointsRemaining > 0
          ? createEdgeState(edgePointsRemaining)
          : undefined,
      pilotAbilities,
      shouldTrigger: true,
      turn: edgeOptions.turn ?? 0,
      unitId: edgeOptions.unitId ?? 'unknown-unit',
      description: 'Pilot KO consciousness check reroll',
    });

    if (edgeResolution.used) {
      const reroll = roll2d6(roller);
      return {
        consciousnessCheckRequired,
        consciousnessRoll: reroll,
        consciousnessTarget,
        conscious: reroll.total >= consciousnessTarget,
        edgeReroll: true,
        edgeSuperseded: true,
        edgeTrigger: PILOT_KO_EDGE_TRIGGER,
        edgePointsRemaining: edgeResolution.edgePointsRemaining,
        supersededConsciousnessRoll: consciousnessRoll,
      };
    }
  }

  return {
    consciousnessCheckRequired,
    consciousnessRoll,
    consciousnessTarget,
    conscious: firstRollPassed,
  };
}

export function resolvePilotWakeUpCheck(
  totalWounds: number,
  pilotConscious: boolean,
  pilotAbilities: readonly string[] = [],
  roller?: D6Roller,
  pilotToughness = 0,
): IPilotWakeUpCheckResult {
  const wakeUpCheckRequired =
    !pilotConscious &&
    totalWounds > 0 &&
    totalWounds < PILOT_DEATH_WOUND_THRESHOLD;
  if (!wakeUpCheckRequired) {
    return { wakeUpCheckRequired };
  }

  const wakeUpTarget = getConsciousnessTarget(
    totalWounds,
    pilotAbilities,
    pilotToughness,
  );
  const wakeUpRoll = roll2d6(roller);

  return {
    wakeUpCheckRequired,
    wakeUpRoll,
    wakeUpTarget,
    conscious: wakeUpRoll.total >= wakeUpTarget,
  };
}

/**
 * Apply pilot wounds and resolve the consciousness check.
 *
 * The optional `roller` threads a deterministic `D6Roller` through the
 * consciousness roll. It MUST be supplied by any caller running inside the
 * seeded simulation engine — omitting it falls back to `defaultD6Roller`
 * (`Math.random`), which makes two same-seed runs diverge whenever a head hit
 * triggers a consciousness check. When omitted (legacy production callsites)
 * behaviour is unchanged.
 */
export function applyPilotDamage(
  state: IUnitDamageState,
  wounds: number,
  source: PilotDamageSource,
  roller?: D6Roller,
): IPilotDamageResultWithState {
  const newPilotWounds = state.pilotWounds + wounds;
  const dead = newPilotWounds >= PILOT_DEATH_WOUND_THRESHOLD;

  const consciousnessCheck = resolvePilotConsciousnessCheck(
    newPilotWounds,
    wounds,
    state.pilotAbilities ?? [],
    roller,
    state.pilotToughness,
    {
      edgePointsRemaining: state.edgePointsRemaining,
      turn: state.turn,
      unitId: state.unitId,
    },
  );
  let newPilotConscious = state.pilotConscious;
  let newDestroyed = state.destroyed;
  let newDestructionCause = state.destructionCause;

  if (consciousnessCheck.consciousnessCheckRequired) {
    if (!consciousnessCheck.conscious) {
      newPilotConscious = false;
    }
  }

  if (dead) {
    newPilotConscious = false;
    newDestroyed = true;
    newDestructionCause = 'pilot_death';
  }

  const newState: IUnitDamageState = {
    ...state,
    pilotWounds: newPilotWounds,
    pilotConscious: newPilotConscious,
    edgePointsRemaining:
      consciousnessCheck.edgePointsRemaining ?? state.edgePointsRemaining,
    destroyed: newDestroyed,
    destructionCause: newDestructionCause,
  };

  return {
    state: newState,
    result: {
      source,
      woundsInflicted: wounds,
      totalWounds: newPilotWounds,
      consciousnessCheckRequired: consciousnessCheck.consciousnessCheckRequired,
      consciousnessRoll: consciousnessCheck.consciousnessRoll,
      consciousnessTarget: consciousnessCheck.consciousnessTarget,
      conscious: consciousnessCheck.conscious,
      edgeReroll: consciousnessCheck.edgeReroll,
      edgeSuperseded: consciousnessCheck.edgeSuperseded,
      edgeTrigger: consciousnessCheck.edgeTrigger,
      edgePointsRemaining: consciousnessCheck.edgePointsRemaining,
      supersededConsciousnessRoll:
        consciousnessCheck.supersededConsciousnessRoll,
      dead,
    },
  };
}
