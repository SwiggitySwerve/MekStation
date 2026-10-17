/**
 * TacticalTurnRail status derivation — which compact state a rail token
 * shows and the text that names it.
 *
 * V211-03: only units that cannot act this phase are skipped (shut down or
 * unconscious pilot, the engine's `isPhaseActivationEligible` gate). A
 * prone unit still owes its activation (it may attempt to stand), so it
 * stays active/upcoming and its label flags the posture as the prompt.
 *
 * @spec openspec/specs/tactical-map-interface/spec.md "Tactical Turn Order
 *   Rail" (current live active unit SHALL be visually distinct; completed,
 *   skipped, destroyed, or withdrawn units use distinct compact states)
 */

import { LockState } from '@/types/gameplay/GameSessionCoreTypes';

import type {
  IRailUnit,
  TacticalTurnRailProps,
  UnitRailStatus,
} from './TacticalTurnRail.types';

const STATUS_LABEL: Record<UnitRailStatus, string> = {
  active: 'Active',
  upcoming: 'Ready',
  completed: 'Acted',
  skipped: 'Skipped',
  destroyed: 'Eliminated',
  withdrawn: 'Withdrawn',
};

export function deriveUnitStatus(
  unitId: string,
  activeUnitId: string | null,
  unitStates: TacticalTurnRailProps['unitStates'],
): UnitRailStatus {
  const state = unitStates[unitId];
  if (!state) return 'upcoming';

  if (state.destroyed) return 'destroyed';
  if (state.hasRetreated || state.isWithdrawing) return 'withdrawn';
  if (state.shutdown || state.pilotConscious === false) return 'skipped';
  if (state.lockState === LockState.Resolved) return 'completed';
  if (unitId === activeUnitId) return 'active';
  return 'upcoming';
}

/** Token text; a prone unit that still owes its turn is flagged Prone. */
export function railStatusLabel(
  unit: Pick<IRailUnit, 'status' | 'prone'>,
): string {
  const label = STATUS_LABEL[unit.status];
  const owesTurn = unit.status === 'active' || unit.status === 'upcoming';
  return unit.prone && owesTurn ? `${label} · Prone` : label;
}
