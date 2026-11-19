/**
 * Test support for fixtures whose player delta `unitId`s already ARE roster
 * unit ids: attach the identity launch manifest (T1) the apply now requires.
 * Opponent deltas get no entry, exactly as the session builder writes it.
 */

import type {
  IAppliedCombatOutcome,
  ICombatOutcome,
} from '@/types/combat/CombatOutcome';

import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

export function withIdentityManifest<T extends ICombatOutcome>(
  outcome: T,
): T & IAppliedCombatOutcome {
  return {
    ...outcome,
    unitManifest: Object.fromEntries(
      outcome.unitDeltas
        .filter((delta) => delta.side === GameSide.Player)
        .map((delta) => [delta.unitId, { rosterUnitId: delta.unitId }]),
    ),
  };
}
