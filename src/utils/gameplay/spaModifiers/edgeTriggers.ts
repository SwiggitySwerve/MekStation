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
  'reroll-to-hit': {
    name: 'Reroll To-Hit',
    description: 'Reroll a to-hit attack roll (attacker or defender)',
  },
  'reroll-damage-location': {
    name: 'Reroll Damage Location',
    description: 'Reroll a hit location determination roll',
  },
  'reroll-critical-hit': {
    name: 'Reroll Critical Hit',
    description: 'Reroll a critical hit determination roll',
  },
  'reroll-psr': {
    name: 'Reroll PSR',
    description: 'Reroll a piloting skill roll',
  },
  'reroll-consciousness': {
    name: 'Reroll Consciousness',
    description: 'Reroll a consciousness check',
  },
  'negate-critical-hit': {
    name: 'Negate Critical Hit',
    description: 'Cancel one critical hit that was just determined',
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
  // All 6 triggers are always available as long as points remain
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
