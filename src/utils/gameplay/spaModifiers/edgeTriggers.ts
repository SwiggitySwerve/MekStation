/**
 * Edge Trigger System — Pilot Edge Point Management
 * Handles Edge point state, usage, and trigger validation.
 */

import type { EdgeTriggerType, IEdgeState } from './types';

export type EdgeBattleMechTriggerType =
  | 'edge_when_headhit'
  | 'edge_when_tac'
  | 'edge_when_ko'
  | 'edge_when_explosion';

export type RepresentedBattleMechEdgeTriggerType =
  | EdgeBattleMechTriggerType
  | 'edge_when_masc_fails';

export type OutOfScopeAerospaceEdgeTriggerType =
  | 'edge_when_aero_alt_loss'
  | 'edge_when_aero_explosion'
  | 'edge_when_aero_ko'
  | 'edge_when_aero_lucky_crit'
  | 'edge_when_aero_nuke_crit'
  | 'edge_when_aero_unit_cargo_lost';

export interface IResolveEdgeBattleMechTriggerOptions {
  readonly trigger: EdgeBattleMechTriggerType;
  readonly edgeState: IEdgeState | undefined;
  readonly pilotAbilities: readonly string[];
  readonly shouldTrigger: boolean;
  readonly turn: number;
  readonly unitId: string;
  readonly description: string;
}

export type EdgeBattleMechTriggerResolution =
  | {
      readonly used: false;
      readonly trigger: EdgeBattleMechTriggerType;
      readonly edgeState: IEdgeState | undefined;
      readonly reason:
        | 'condition-not-met'
        | 'trigger-not-enabled'
        | 'no-edge-available';
    }
  | {
      readonly used: true;
      readonly trigger: EdgeBattleMechTriggerType;
      readonly edgeState: IEdgeState;
      readonly edgePointsRemaining: number;
    };

/**
 * Edge trigger definitions with descriptions.
 */
export const EDGE_TRIGGERS: Record<
  EdgeTriggerType,
  { name: string; description: string }
> = {
  edge_when_headhit: {
    name: 'Head Hit',
    description: 'Reroll a head-hit location result',
  },
  edge_when_tac: {
    name: 'Through-Armor Critical',
    description: 'Reroll a through-armor critical hit location result',
  },
  edge_when_ko: {
    name: 'Pilot KO',
    description: 'Reroll a pilot knockout consciousness check',
  },
  edge_when_explosion: {
    name: 'Critical Explosion',
    description: 'Reroll a critical hit that would trigger an ammo explosion',
  },
  edge_when_masc_fails: {
    name: 'MASC / Supercharger Failure',
    description: 'Reroll a MASC or supercharger failure check',
  },
  edge_when_aero_alt_loss: {
    name: 'Aero Altitude Loss',
    description: 'Reroll an aerospace altitude-loss check',
  },
  edge_when_aero_explosion: {
    name: 'Aero Critical Explosion',
    description: 'Reroll an aerospace critical explosion result',
  },
  edge_when_aero_ko: {
    name: 'Aero Pilot KO',
    description: 'Reroll an aerospace pilot knockout check',
  },
  edge_when_aero_lucky_crit: {
    name: 'Aero Lucky Crit',
    description: 'Skip or reroll an aerospace lucky critical hit trigger',
  },
  edge_when_aero_nuke_crit: {
    name: 'Aero Nuke Crit',
    description: 'Reroll a nuclear missile SI damage roll',
  },
  edge_when_aero_unit_cargo_lost: {
    name: 'Transport Cargo Lost',
    description: 'Reroll a transported-unit cargo loss check',
  },
};

export const REPRESENTED_BATTLEMECH_EDGE_TRIGGERS = [
  'edge_when_headhit',
  'edge_when_tac',
  'edge_when_ko',
  'edge_when_explosion',
  'edge_when_masc_fails',
] as const satisfies readonly RepresentedBattleMechEdgeTriggerType[];

export const OUT_OF_SCOPE_AEROSPACE_EDGE_TRIGGERS = [
  'edge_when_aero_alt_loss',
  'edge_when_aero_explosion',
  'edge_when_aero_ko',
  'edge_when_aero_lucky_crit',
  'edge_when_aero_nuke_crit',
  'edge_when_aero_unit_cargo_lost',
] as const satisfies readonly OutOfScopeAerospaceEdgeTriggerType[];

export const GENERIC_EDGE_POINT_PRODUCER_IDS = ['edge'] as const;

function normalizeEdgePointCount(
  value: number | undefined,
): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.trunc(value));
}

/**
 * Resolve the generic Edge point pool from explicit point state or legacy
 * generic Edge ability state. Trigger-specific Edge ids authorize use; they do
 * not create points by themselves.
 */
export function deriveEdgePointCountFromPilotAbilities(
  pilotAbilities: readonly string[],
  explicitEdgePoints?: number,
): number | undefined {
  const normalizedExplicitPoints = normalizeEdgePointCount(explicitEdgePoints);
  if (normalizedExplicitPoints !== undefined) {
    return normalizedExplicitPoints;
  }

  return pilotAbilities.some((ability) =>
    GENERIC_EDGE_POINT_PRODUCER_IDS.includes(
      ability as (typeof GENERIC_EDGE_POINT_PRODUCER_IDS)[number],
    ),
  )
    ? 1
    : undefined;
}

/**
 * Create initial Edge state for a pilot.
 */
export function createEdgeState(edgePoints: number): IEdgeState {
  return {
    maxPoints: edgePoints,
    remainingPoints: edgePoints,
    usageHistory: [],
  };
}

/**
 * Check if a pilot can use Edge for a specific trigger.
 */
export function canUseEdge(
  edgeState: IEdgeState | undefined,
  trigger: EdgeTriggerType,
): boolean {
  if (!edgeState) return false;
  if (edgeState.remainingPoints <= 0) return false;
  return trigger in EDGE_TRIGGERS;
}

/**
 * Use an Edge point. Returns the new Edge state.
 */
export function spendEdgePoint(
  edgeState: IEdgeState,
  trigger: EdgeTriggerType,
  turn: number,
  unitId: string,
  description: string,
): IEdgeState {
  if (edgeState.remainingPoints <= 0) {
    throw new Error('No Edge points remaining');
  }

  return {
    ...edgeState,
    remainingPoints: edgeState.remainingPoints - 1,
    usageHistory: [
      ...edgeState.usageHistory,
      { trigger, turn, unitId, description },
    ],
  };
}

export const useEdge = spendEdgePoint;

/**
 * Resolve the shared "does this BattleMech Edge trigger spend a point now?"
 * gate for the non-MASC Edge family.
 *
 * This helper deliberately does not pick replacement hit locations, reroll
 * consciousness dice, or reroll critical slots. Runtime resolvers must call it
 * only after their own source-backed condition is known.
 */
export function resolveEdgeBattleMechTrigger(
  options: IResolveEdgeBattleMechTriggerOptions,
): EdgeBattleMechTriggerResolution {
  const {
    description,
    edgeState,
    pilotAbilities,
    shouldTrigger,
    trigger,
    turn,
    unitId,
  } = options;

  if (!shouldTrigger) {
    return {
      used: false,
      trigger,
      edgeState,
      reason: 'condition-not-met',
    };
  }

  if (!pilotAbilities.includes(trigger)) {
    return {
      used: false,
      trigger,
      edgeState,
      reason: 'trigger-not-enabled',
    };
  }

  if (!edgeState || !canUseEdge(edgeState, trigger)) {
    return {
      used: false,
      trigger,
      edgeState,
      reason: 'no-edge-available',
    };
  }

  const nextEdgeState = spendEdgePoint(
    edgeState,
    trigger,
    turn,
    unitId,
    description,
  );
  return {
    used: true,
    trigger,
    edgeState: nextEdgeState,
    edgePointsRemaining: nextEdgeState.remainingPoints,
  };
}
