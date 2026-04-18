/**
 * Combat Outcome Bus
 *
 * Per `wire-encounter-to-campaign-round-trip` Wave 5: a tiny in-process
 * pub/sub channel that bridges `InteractiveSession` (engine, framework
 * agnostic) and `useCampaignStore` (UI / Zustand store, lifecycle bound
 * to the React tree). Keeping the bus here — separate from both layers —
 * lets the engine emit without importing the store, and lets the store
 * subscribe without importing the engine.
 *
 * The bus is intentionally minimal:
 *   - in-memory (no persistence, no cross-tab),
 *   - synchronous delivery (subscribers run during `publish`),
 *   - idempotent at the publish site (callers track per-match dedupe).
 *
 * This isn't a general event bus — it carries one event type. If we
 * grow more session-scoped events we'll generalize, but for the Phase 3
 * round-trip a single channel is the right surface area.
 *
 * @spec openspec/changes/wire-encounter-to-campaign-round-trip/specs/game-session-management/spec.md
 */

import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

// =============================================================================
// Event Payload
// =============================================================================

/**
 * Payload published whenever a session resolves to `Completed` and an
 * `ICombatOutcome` is derivable. The `outcome.matchId` is also surfaced
 * at the top level so subscribers don't have to reach into the outcome.
 */
export interface ICombatOutcomeReadyEvent {
  readonly matchId: string;
  readonly outcome: ICombatOutcome;
}

// =============================================================================
// Subscriber Bookkeeping
// =============================================================================

export type CombatOutcomeListener = (event: ICombatOutcomeReadyEvent) => void;

const listeners = new Set<CombatOutcomeListener>();

/**
 * Subscribe to `CombatOutcomeReady` events. Returns an unsubscribe
 * function — callers MUST invoke it on teardown so test isolation holds
 * and the campaign store doesn't leak listeners across HMR reloads.
 *
 * Listeners receive every published event; per-match dedupe is the
 * subscriber's responsibility (the campaign store does this via the
 * `processedBattleIds` ledger / queue containment check).
 */
export function subscribeToCombatOutcome(
  listener: CombatOutcomeListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Publish a `CombatOutcomeReady` event to every current subscriber.
 * Synchronous — listeners run before this returns. Listener throws are
 * isolated so a buggy subscriber can't take down the engine.
 */
export function publishCombatOutcome(event: ICombatOutcomeReadyEvent): void {
  // Snapshot the listeners before iterating so a subscriber that calls
  // `subscribeToCombatOutcome` / unsubscribe during dispatch can't mutate
  // the iteration set.
  const snapshot = Array.from(listeners);
  for (const listener of snapshot) {
    try {
      listener(event);
    } catch {
      // Swallowed by design — the engine cannot fail because of a bad
      // subscriber. Production callers should attach their own error
      // logging inside the listener body.
    }
  }
}

/**
 * Test-only helper: drop every subscriber. Lets test setups guarantee a
 * clean bus without depending on listener teardown order.
 */
export function _resetCombatOutcomeBus(): void {
  listeners.clear();
}

/**
 * Test/observability helper: how many subscribers are currently
 * attached. Useful for asserting that store wiring or test cleanup ran.
 */
export function getCombatOutcomeListenerCount(): number {
  return listeners.size;
}
