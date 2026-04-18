/**
 * RollCapture + SeededDiceRoller behavior.
 *
 * Covers:
 *   - Captured rolls preserve consumption order.
 *   - `drain()` clears the buffer so the next tick starts empty.
 *   - SeededDiceRoller is deterministic for a given seed (this is what
 *     the `?seed=N` debug path relies on for bug reproduction).
 *
 * @spec openspec/changes/add-authoritative-roll-arbitration/specs/multiplayer-server/spec.md
 */

import { SeededRandom } from '@/simulation/core/SeededRandom';

import { CryptoDiceRoller } from '../CryptoDiceRoller';
import { RollCapture, SeededDiceRoller } from '../RollCapture';

describe('RollCapture', () => {
  it('records every d6 in consumption order', () => {
    const capture = new RollCapture(new SeededDiceRoller(new SeededRandom(7)));
    const r1 = capture.d6();
    const r2 = capture.d6();
    const r3 = capture.d6();
    expect(capture.getCaptured()).toEqual([r1, r2, r3]);
  });

  it('drain returns and clears the buffer', () => {
    const capture = new RollCapture(new CryptoDiceRoller());
    capture.d6();
    capture.d6();
    expect(capture.getCaptured()).toHaveLength(2);
    const drained = capture.drain();
    expect(drained).toHaveLength(2);
    expect(capture.getCaptured()).toEqual([]);
    // Subsequent rolls land in a fresh buffer.
    capture.d6();
    expect(capture.getCaptured()).toHaveLength(1);
  });

  it('asD6Roller passes through and is captured', () => {
    const capture = new RollCapture(new SeededDiceRoller(new SeededRandom(99)));
    const cb = capture.asD6Roller();
    cb();
    cb();
    expect(capture.getCaptured()).toHaveLength(2);
  });
});

describe('SeededDiceRoller', () => {
  it('produces a deterministic sequence for the same seed', () => {
    const a = new SeededDiceRoller(new SeededRandom(123));
    const b = new SeededDiceRoller(new SeededRandom(123));
    const seqA = Array.from({ length: 50 }, () => a.d6());
    const seqB = Array.from({ length: 50 }, () => b.d6());
    expect(seqA).toEqual(seqB);
  });

  it('produces values in [1, 6]', () => {
    const r = new SeededDiceRoller(new SeededRandom(42));
    for (let i = 0; i < 500; i += 1) {
      const v = r.d6();
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });
});
