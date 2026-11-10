/**
 * The roller a guest mirror session carries: it never rolls.
 *
 * A guest applies the host's events; only the host rolls. A guest
 * session built without a roller used to fall back to `Math.random` in
 * the End-phase PSR drain, so a reconnected guest that advanced the End
 * phase locally rolled PSRs the host never saw. Handing the session this
 * roller turns that into a named failure at the first die.
 *
 * C-1c PR 0, Option A. Option B (the guest asks the host to resolve)
 * needs a live host pipeline and is recorded OPEN against it.
 */

import type { D6Roller } from '@/utils/gameplay/diceTypes';

export const MIRROR_SESSION_ROLLED_DICE_MESSAGE =
  'This copy of the battle follows the host, so it cannot roll dice. Only the host resolves rolls; wait for the host to continue the match.';

export class MirrorSessionRolledDiceError extends Error {
  constructor() {
    super(MIRROR_SESSION_ROLLED_DICE_MESSAGE);
    this.name = 'MirrorSessionRolledDiceError';
  }
}

export function createMirrorDiceRoller(): D6Roller {
  return () => {
    throw new MirrorSessionRolledDiceError();
  };
}
