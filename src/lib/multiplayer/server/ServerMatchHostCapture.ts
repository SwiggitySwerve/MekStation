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
 * Refused commands return their entropy to the next capture, so the
 * effective dice cursor advances only with journaled commands.
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
  // Uncommitted entropy stays ahead of the source until an accepted command
  // consumes it. Restart/rewind can reconstruct the effective seeded cursor
  // solely from the rolls recorded by accepted commands.
  private readonly pendingRolls: number[] = [];
  private commandRolls: number[] = [];
  private readonly transactionalSource: IServerDiceRoller = {
    d6: () => {
      const value = this.pendingRolls.shift() ?? this.sourceRoller.d6();
      this.commandRolls.push(value);
      return value;
    },
    asD6Roller: () => () => this.transactionalSource.d6(),
  };

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
  installFresh(): () => void {
    const commandRolls: number[] = [];
    this.commandRolls = commandRolls;
    this.captureSwap(new RollCapture(this.transactionalSource));
    let refused = false;
    return () => {
      if (refused) return;
      refused = true;
      this.pendingRolls.unshift(...commandRolls);
      this.commandRolls = [];
      this.captureSwap(new RollCapture(this.transactionalSource));
    };
  }

  /** Current capture's d6. Journal decide continues this cursor. */
  d6(): number {
    return this.currentCapture.d6();
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
