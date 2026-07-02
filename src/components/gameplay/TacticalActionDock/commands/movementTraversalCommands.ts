/**
 * Movement traversal commands — Evade only.
 *
 * `tactical-movement-intent-composer` (Single Movement Authority) removes the
 * dock's movement-verb buttons (Walk / Run / Sprint / Jump): the Movement Intent
 * Composer is now the sole surface for movement composition and mode selection.
 * Evade REMAINS a dock command because the ADR / composer design models Evade as
 * a Posture Action (no destination) — it is a posture toggle, not a locomotion
 * mode, and it keeps its `E` hotkey (hotkey doctrine: E = Evade posture) and its
 * `movement` category so the composer's Posture Palette can reuse this command's
 * legality predicate as the single source of truth for Evade legality.
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-movement-intent/spec.md
 */

import {
  GamePhase,
  MovementType,
  type ITacticalCommand,
  type ITacticalCommandContext,
} from '@/types/gameplay';
import { getMaxMP } from '@/utils/gameplay/movement';

import { movementActiveTurnUnavailableReason } from './movementCommandAvailability';

/**
 * Evade posture command. Legality mirrors the pre-composer Evade traversal
 * command (active turn + evade capability), but the composer treats a click as
 * "add Evade to the composition" rather than "select the Evade movement mode".
 */
const MovementEvadeCommand: ITacticalCommand = {
  id: 'movement.evade',
  category: 'movement',
  label: 'Evade',
  hotkey: 'E',
  phaseConstraints: [GamePhase.Movement],
  requiresConfirmation: false,
  undoable: true,
  availability(ctx) {
    const unavailable = movementActiveTurnUnavailableReason(ctx);
    if (unavailable) return { available: false, reason: unavailable };

    const modeUnavailable = evadeCapabilityUnavailableReason(ctx);
    if (modeUnavailable) return { available: false, reason: modeUnavailable };

    return { available: true };
  },
  commit() {
    return { actionId: 'lock', payload: { mode: 'evade' } };
  },
};

function evadeCapabilityUnavailableReason(
  ctx: ITacticalCommandContext,
): string | null {
  if (!ctx.movementCapability) return null;
  const rawMP = getMaxMP(ctx.movementCapability, MovementType.Evade);
  if (rawMP <= 0) return 'No evade capability.';
  return null;
}

export const MovementTraversalCommands: readonly ITacticalCommand[] = [
  MovementEvadeCommand,
];
