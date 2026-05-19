/**
 * ServerMatchHostCapture — the Wave 3a authoritative-roll-arbitration
 * state for one `ServerMatchHost`.
 *
 * Why a separate collaborator: the host's roll-capture concern is a
 * cohesive cluster (a source roller, a per-intent `RollCapture`
 * pointer, a swap helper that may be re-routed through an engine-owned
 * ref, and the per-event stamping step). Pulling it out of the host
 * keeps `ServerMatchHost` a thin orchestrator while preserving the
 * exact swap/stamp semantics — identity of the engine callback stays
 * stable because the host hands the engine a closure over a ref, and
 * this collaborator only ever mutates the value behind that ref.
 *
 * Behavior is byte-for-byte identical to the inline host fields it
 * replaces — this is a pure structural extraction.
 *
 * @spec openspec/changes/add-authoritative-roll-arbitration/specs/multiplayer-server/spec.md
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { CryptoDiceRoller, type IServerDiceRoller } from './CryptoDiceRoller';
import { RollCapture } from './RollCapture';
import { stampRollsOnNewEvents } from './ServerMatchHostEvents';

export class ServerMatchHostCapture {
  /**
   * The source roller (crypto in prod, seeded in debug). Stable for
   * the entire match lifetime — every fresh `RollCapture` draws from it.
   */
  private readonly sourceRoller: IServerDiceRoller;

  /**
   * The *currently active* `RollCapture`. Reset between intent ticks
   * via `installFresh()` so each engine call's consumed rolls land in
   * a buffer scoped to that call. The `dispatchD6Roller` callback the
   * host hands to `InteractiveSession` reads THROUGH this pointer.
   */
  private currentCapture: RollCapture;

  /**
   * Default capture swap (no external ref): just update the field.
   * Overridden by `adoptExternalCaptureRef` when the session was built
   * via `ServerMatchHost.create`.
   */
  private captureSwap: (next: RollCapture) => void = (next) => {
    this.currentCapture = next;
  };

  /**
   * Construct the capture cluster. Falls back to a `CryptoDiceRoller`
   * when no source roller is supplied, matching the host's prior
   * inline default.
   */
  constructor(sourceRoller?: IServerDiceRoller) {
    this.sourceRoller = sourceRoller ?? new CryptoDiceRoller();
    this.currentCapture = new RollCapture(this.sourceRoller);
  }

  /**
   * Replace the capture pointer with the one closed over by the engine
   * callback. Without this, the host's `currentCapture` and the
   * callback's pointer would diverge after the first swap. Called only
   * from `ServerMatchHost.create` once the engine ref exists.
   */
  adoptExternalCaptureRef(ref: { current: RollCapture }): void {
    // Re-route both reads + writes through `ref`: seed our pointer with
    // the ref's current value, then make the swap helper mutate `ref`
    // so the engine callback and this collaborator never diverge.
    this.currentCapture = ref.current;
    this.captureSwap = (next: RollCapture) => {
      ref.current = next;
      this.currentCapture = next;
    };
  }

  /**
   * Swap the active `RollCapture` for a fresh empty one so the next
   * engine call's consumed rolls land in a clean buffer. Identity of
   * the engine callback is unaffected — it reads through the ref.
   */
  installFresh(): void {
    this.captureSwap(new RollCapture(this.sourceRoller));
  }

  /**
   * Stamp the captured d6 sequence onto every fresh event before
   * persistence + broadcast. Delegates to the shared
   * `stampRollsOnNewEvents` helper using the live capture buffer; the
   * first-event attribution strategy is documented there.
   */
  stampRollsOnNewEvents(events: readonly IGameEvent[]): readonly IGameEvent[] {
    return stampRollsOnNewEvents(this.currentCapture, events);
  }
}
