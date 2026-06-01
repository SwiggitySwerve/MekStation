/**
 * Edge Trigger System — Pilot Edge Point Management
 * Handles Edge point state, usage, and trigger validation.
 */

import { EdgeTriggerType, IEdgeState } from './types';

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
export function useEdge(
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
