import type { IGameSession, IGameState } from '@/types/gameplay';

/**
 * Test-only fault seam: a copy of `session` whose `currentState` no event
 * produced, so the event-log owner does not own it (isOwnedGameSession).
 * Tests use it to inject a projection divergence; it replaces the deleted
 * InteractiveSession.applyCorrectedState. No non-test file may import it
 * (src/__tests__/architecture/gameSessionLiteralOwnership.test.ts).
 */
export function withStateOutsideEventLog(
  session: IGameSession,
  patch: (state: IGameState) => IGameState,
): IGameSession {
  return { ...session, currentState: patch(session.currentState) };
}
