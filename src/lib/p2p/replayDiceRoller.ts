/**
 * Replay Dice Roller — guest-side deterministic d6 source for P2P sessions.
 *
 * Wave 4 of the multiplayer foundation. The host uses a real entropy source
 * (Crypto / SeededRandom) wrapped in a `RollCapture` so every d6 the engine
 * consumes during event resolution is recorded into the resulting event's
 * payload. The guest mirror MUST produce byte-identical state from the same
 * event stream — so on the guest side we install a `replayDiceRoller` that
 * pops pre-recorded rolls off a per-event buffer instead of generating
 * fresh entropy.
 *
 * Architecture:
 *   - Host: `engine.consume(roller = RollCapture(real))` → on emit, drain
 *           captured rolls and stamp them into the event payload as `rolls`.
 *   - Guest: when peer event arrives, push `event.id → event.payload.rolls`
 *            into the replay buffer. While replaying that event, the engine
 *            calls the replay roller, which pops rolls in consumption order.
 *
 * Why keyed by event id (not a single FIFO queue):
 *   - Event arrival can be out-of-order across different Y.Array deliveries
 *     (e.g. reconnect replay streams). Keying by event id lets the guest
 *     consume rolls in a different order than they arrived.
 *   - It also makes "rolls already consumed" diagnosable — you can ask the
 *     buffer "do you have rolls for event X?" before driving the engine.
 *
 * @spec openspec/changes/add-p2p-game-session-sync/specs/multiplayer-sync/spec.md § 3
 */

import type { IServerDiceRoller } from '@/lib/multiplayer/server/CryptoDiceRoller';
import type { D6Roller } from '@/utils/gameplay/diceTypes';

/**
 * Marker key used to set / clear the "currently replaying event" pointer.
 * Engine code that drives a guest mirror should call
 * `setActiveEventId(event.id)` before invoking a resolver and clear it
 * after, so the roller knows which buffer slot to drain from.
 */
export interface IReplayDiceRoller extends IServerDiceRoller {
  /**
   * Push the rolls captured by the host for a specific event so they can
   * be replayed when the engine resolves that event on the guest. Idempotent
   * — pushing the same event id twice with identical rolls is a no-op; a
   * mismatched second push throws (catches host bug or replay corruption).
   */
  pushEventRolls: (eventId: string, rolls: readonly number[]) => void;

  /** Mark which event the next d6() calls belong to. */
  setActiveEventId: (eventId: string | null) => void;

  /**
   * Inspect the remaining rolls for a given event without consuming them.
   * Returns an empty array when the event is unknown OR fully drained —
   * callers MUST distinguish "drained" from "unknown" via `hasEventRolls`.
   */
  peekEventRolls: (eventId: string) => readonly number[];

  /** True when rolls for `eventId` have been pushed (drained or not). */
  hasEventRolls: (eventId: string) => boolean;

  /**
   * Drop all buffered rolls. Used during full re-replay (e.g. after
   * reconnect we re-push every event's rolls in sequence order).
   */
  reset: () => void;
}

/**
 * Per-event slot. Tracks the pushed roll list AND the next index to
 * pop. We keep the original list for `peekEventRolls` diagnostics; the
 * cursor advances as the engine consumes rolls.
 */
interface IReplaySlot {
  readonly rolls: readonly number[];
  cursor: number;
}

export class ReplayDiceRoller implements IReplayDiceRoller {
  private readonly slots = new Map<string, IReplaySlot>();
  private activeEventId: string | null = null;
  private readonly cachedRoller: D6Roller;

  constructor() {
    // Bind once so identity is stable — symmetric with `CryptoDiceRoller`.
    this.cachedRoller = () => this.d6();
  }

  d6 = (): number => {
    if (this.activeEventId === null) {
      throw new Error(
        'ReplayDiceRoller.d6() called without an active event id — ' +
          'set the event id with setActiveEventId() before driving the engine.',
      );
    }
    const slot = this.slots.get(this.activeEventId);
    if (!slot) {
      throw new Error(
        `No replay rolls buffered for event id "${this.activeEventId}". ` +
          'Did the host forget to embed rolls in the event payload?',
      );
    }
    if (slot.cursor >= slot.rolls.length) {
      throw new Error(
        `Replay rolls for event "${this.activeEventId}" are exhausted ` +
          `(${slot.rolls.length} rolls captured, requested index ${slot.cursor}). ` +
          'Host engine consumed fewer dice than guest engine — suspect drift.',
      );
    }
    const value = slot.rolls[slot.cursor];
    slot.cursor += 1;
    return value;
  };

  asD6Roller = (): D6Roller => {
    return this.cachedRoller;
  };

  pushEventRolls = (eventId: string, rolls: readonly number[]): void => {
    const existing = this.slots.get(eventId);
    if (existing) {
      // Idempotent re-push (e.g. reconnect replay): allow when the rolls
      // match exactly. Mismatched re-push is a hard error since it would
      // corrupt the guest's deterministic replay.
      if (!arraysEqual(existing.rolls, rolls)) {
        throw new Error(
          `Replay roll mismatch for event "${eventId}": ` +
            `existing [${existing.rolls.join(',')}] vs new [${rolls.join(',')}]`,
        );
      }
      return;
    }
    this.slots.set(eventId, { rolls: rolls.slice(), cursor: 0 });
  };

  setActiveEventId = (eventId: string | null): void => {
    this.activeEventId = eventId;
  };

  peekEventRolls = (eventId: string): readonly number[] => {
    const slot = this.slots.get(eventId);
    if (!slot) return [];
    return slot.rolls.slice(slot.cursor);
  };

  hasEventRolls = (eventId: string): boolean => {
    return this.slots.has(eventId);
  };

  reset = (): void => {
    this.slots.clear();
    this.activeEventId = null;
  };
}

/**
 * Convenience constructor — symmetric with `new RollCapture(...)` on the
 * host side. Returns the concrete class so callers can use the full API
 * (push / peek / reset) without unwrapping.
 */
export function createReplayDiceRoller(): ReplayDiceRoller {
  return new ReplayDiceRoller();
}

function arraysEqual(
  left: readonly number[],
  right: readonly number[],
): boolean {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}
