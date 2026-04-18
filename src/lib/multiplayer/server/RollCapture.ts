/**
 * RollCapture — recording wrapper around an `IServerDiceRoller`.
 *
 * Wave 3a of Phase 4. The host installs a fresh `RollCapture` per intent
 * tick, lets the engine consume rolls during resolution, then drains the
 * captured d6 sequence and stamps it onto the new event payloads before
 * broadcast. Clients render exactly what the server saw — they do not
 * re-roll.
 *
 * Why a wrapper instead of patching the inner roller: keeps the inner
 * `CryptoDiceRoller` (or `SeededDiceRoller`) immutable, lets us reset
 * the capture buffer between events without disturbing the entropy
 * source, and keeps tests trivial (just inspect `getCaptured()`).
 *
 * @spec openspec/changes/add-authoritative-roll-arbitration/specs/multiplayer-server/spec.md
 */

import type { D6Roller } from '@/utils/gameplay/diceTypes';

import { SeededRandom } from '@/simulation/core/SeededRandom';

import type { IServerDiceRoller } from './CryptoDiceRoller';

/**
 * Adapter so a `SeededRandom` can stand in for a `CryptoDiceRoller` on
 * the debug `?seed=N` path. We expose only `IServerDiceRoller` so the
 * rest of the host doesn't need to know which implementation is live.
 */
export class SeededDiceRoller implements IServerDiceRoller {
  private readonly cachedRoller: D6Roller;

  constructor(private readonly inner: SeededRandom) {
    this.cachedRoller = () => this.d6();
  }

  d6(): number {
    return this.inner.nextInt(6) + 1;
  }

  asD6Roller(): D6Roller {
    return this.cachedRoller;
  }
}

/**
 * Recording wrapper. Every d6 the engine consumes through the exposed
 * roller is appended to the internal buffer in consumption order.
 *
 * `drain()` returns the buffer contents AND clears it so the same
 * instance can be reused across resolutions if the caller prefers.
 */
export class RollCapture implements IServerDiceRoller {
  private readonly captured: number[] = [];
  private readonly cachedRoller: D6Roller;

  constructor(private readonly inner: IServerDiceRoller) {
    this.cachedRoller = () => this.d6();
  }

  d6(): number {
    const value = this.inner.d6();
    this.captured.push(value);
    return value;
  }

  asD6Roller(): D6Roller {
    return this.cachedRoller;
  }

  /**
   * Snapshot the captured rolls in consumption order without mutating
   * the buffer. Used by tests + `drain()` internally.
   */
  getCaptured(): readonly number[] {
    return this.captured.slice();
  }

  /**
   * Return the captured rolls AND clear the buffer in one call. The
   * host calls this after each engine tick so the next tick starts
   * fresh.
   */
  drain(): readonly number[] {
    const out = this.captured.slice();
    this.captured.length = 0;
    return out;
  }
}
