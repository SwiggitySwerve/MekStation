/**
 * ServerMatchHostOutcomePublisher — the Wave 5 server-side
 * `CombatOutcomeReady` publish safety net for one `ServerMatchHost`.
 *
 * Why a separate collaborator: outcome publishing is a self-contained
 * Wave 5 responsibility with its own idempotency guard. Extracting it
 * keeps `ServerMatchHost` a thin orchestrator while preserving the
 * exact double-emit protection — the host now owns one of these and
 * calls `tryPublish()` from `closeMatch` and the `ForfeitMatch` path.
 *
 * Behavior is identical to the inline `tryPublishOutcome` method it
 * replaces — pure structural extraction.
 *
 * @spec openspec/changes/add-multiplayer-server-infrastructure/specs/multiplayer-server/spec.md
 */

import type { InteractiveSession } from '@/engine/InteractiveSession';

import {
  publishCombatOutcome,
  type ICombatOutcomeReadyEvent,
} from '@/engine/combatOutcomeBus';

export class ServerMatchHostOutcomePublisher {
  /**
   * Server-side `CombatOutcomeReady` publish guard. The
   * `InteractiveSession.tryFinalizeAndPublish` is the primary
   * publisher (already wired) — this host-side guard is the safety net
   * that fires when the engine path is bypassed (e.g. `closeMatch` on
   * a server-driven shutdown). Idempotent — once set, no further
   * publishes happen for this match.
   */
  private hostOutcomePublished = false;

  /**
   * Hold the session so the publisher can re-check the engine's own
   * `outcomePublished` guard and lift the outcome on game-over.
   */
  constructor(private readonly session: InteractiveSession) {}

  /**
   * Defensive `CombatOutcomeReady` publish helper.
   * `InteractiveSession.tryFinalizeAndPublish` is the primary path and
   * runs synchronously inside `concede`, `advancePhase`, `applyAttack`,
   * etc., so by the time the host's `handleIntent` returns the bus has
   * usually already fired (and this local guard mirrors the engine's
   * `outcomePublished`). This method exists so the integration test
   * can prove the bus emits even on the server-side `closeMatch` path,
   * and so a future code path that bypasses the engine's lifecycle
   * methods can still feed the campaign store.
   *
   * Behavior:
   *   - Skip if we've already published from this host.
   *   - Skip if the engine's own guard already published (we mirror
   *     by reading `hasPublishedOutcome` so we never double-emit).
   *   - Skip if the session isn't game-over (most common case).
   *   - Otherwise, lift the outcome via `getOutcome()` and publish.
   *
   * Listener errors don't propagate (the bus swallows them).
   */
  tryPublish(): void {
    if (this.hostOutcomePublished) return;
    if (this.session.hasPublishedOutcome()) {
      // Engine already fired; mirror the guard so we don't try again.
      this.hostOutcomePublished = true;
      return;
    }
    if (!this.session.isGameOver()) return;
    let outcome;
    try {
      outcome = this.session.getOutcome();
    } catch {
      // Defensive: derivation should be safe post-game-over, but if
      // anything throws we don't want to crash the host.
      return;
    }
    // `getOutcome()` itself routes through `tryFinalizeAndPublish`,
    // which means by the time it returns the engine guard is set and
    // the bus has fired. Re-check the engine guard so we mirror it.
    if (this.session.hasPublishedOutcome()) {
      this.hostOutcomePublished = true;
      return;
    }
    // Defensive belt: the engine guard didn't trip (shouldn't happen)
    // — publish ourselves. Mark our guard before emitting so a
    // re-entrant subscriber can't loop.
    this.hostOutcomePublished = true;
    const event: ICombatOutcomeReadyEvent = {
      matchId: outcome.matchId,
      outcome,
    };
    publishCombatOutcome(event);
  }
}
