/**
 * Contract Fulfillment Bus
 *
 * Per `wire-encounter-to-campaign-round-trip` Wave 5 §9: an in-process
 * pub/sub channel that lets `postBattleProcessor` notify
 * `contractProcessor` (and any other listeners — e.g., the audit-feed
 * builder, multiplayer-broadcast layer) when a contract has been
 * fulfilled. Fulfillment here means the post-battle processor flipped
 * the contract's `MissionStatus` to a terminal value (SUCCESS, FAILED,
 * PARTIAL).
 *
 * Like {@link import('@/engine/combatOutcomeBus').ICombatOutcomeReadyEvent},
 * the bus is intentionally narrow:
 *   - in-memory (no persistence, no cross-tab),
 *   - synchronous delivery (subscribers run during `publish`),
 *   - dedupe is the SUBSCRIBER's responsibility — the publisher emits
 *     once per fulfillment and re-emits on retry.
 *
 * The contractProcessor maintains a `pendingFulfilledContractIds` set
 * on the campaign extension and treats consumption as idempotent.
 *
 * @module lib/campaign/contractFulfillmentBus
 */
import type { MissionStatus } from '@/types/campaign/enums/MissionStatus';

// =============================================================================
// Event Payload
// =============================================================================

/**
 * Payload published when `postBattleProcessor` flips a contract's
 * status to terminal during outcome application.
 */
export interface IContractFulfilledEvent {
  /** Contract id whose status was flipped. */
  readonly contractId: string;
  /** Terminal status the contract was flipped to. */
  readonly newStatus: MissionStatus;
  /** The match id whose outcome triggered the flip. */
  readonly matchId: string;
  /** Player won the triggering battle. Used for payout / standing. */
  readonly playerWon: boolean;
  /** ISO timestamp the publish happened. */
  readonly publishedAt: string;
}

// =============================================================================
// Subscriber Bookkeeping
// =============================================================================

export type ContractFulfilledListener = (
  event: IContractFulfilledEvent,
) => void;

const listeners = new Set<ContractFulfilledListener>();

/**
 * Subscribe to `ContractFulfilled` events. Returns an unsubscribe
 * function — callers MUST invoke it on teardown so test isolation
 * holds and contractProcessor doesn't leak listeners on HMR reload.
 */
export function subscribeToContractFulfilled(
  listener: ContractFulfilledListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Publish a `ContractFulfilled` event. Synchronous; listener throws
 * are isolated so a buggy subscriber can't take down the day pipeline.
 */
export function publishContractFulfilled(event: IContractFulfilledEvent): void {
  // Snapshot subscribers before iterating so a listener that
  // (un)subscribes during dispatch can't mutate the iteration set.
  const snapshot = Array.from(listeners);
  for (const listener of snapshot) {
    try {
      listener(event);
    } catch {
      // Swallowed by design — engine cannot fail because of a buggy
      // subscriber. Production callers should attach their own error
      // logging inside the listener body.
    }
  }
}

/**
 * Test-only helper: drop every subscriber.
 */
export function _resetContractFulfilledBus(): void {
  listeners.clear();
}

/**
 * Test/observability helper: how many listeners are currently attached.
 */
export function getContractFulfilledListenerCount(): number {
  return listeners.size;
}
