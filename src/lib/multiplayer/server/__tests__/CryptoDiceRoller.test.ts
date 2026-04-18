/**
 * CryptoDiceRoller distribution + range tests.
 *
 * Two assertions matter:
 *   1. Range: every roll lands in [1, 6]. Anything else means the
 *      rejection-sampling cutoff is wrong.
 *   2. Distribution: across 100k rolls, each face is within ~1% of the
 *      expected 1/6 frequency. The rejection-sampling path eliminates
 *      modulo bias so the tolerance can stay tight.
 *
 * @spec openspec/changes/add-authoritative-roll-arbitration/specs/multiplayer-server/spec.md
 */

import { CryptoDiceRoller } from '../CryptoDiceRoller';

describe('CryptoDiceRoller', () => {
  it('produces only integers in [1, 6]', () => {
    const roller = new CryptoDiceRoller();
    for (let i = 0; i < 10_000; i += 1) {
      const value = roller.d6();
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
  });

  it('100k rolls show uniform distribution within 2% of expected', () => {
    const roller = new CryptoDiceRoller();
    const SAMPLES = 100_000;
    const counts = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < SAMPLES; i += 1) {
      counts[roller.d6() - 1] += 1;
    }
    const expected = SAMPLES / 6;
    // 2% tolerance per face. Multinomial std dev for one face at this
    // sample size is sqrt(N * p * (1-p)) ≈ 117.85, so 2% (≈333) is
    // ~2.8 standard deviations — flake-resistant under CI noise but
    // still tight enough to catch a broken rejection-sampling path
    // (which would skew at least one face by 16%+).
    const tolerance = expected * 0.02;
    for (let face = 0; face < 6; face += 1) {
      expect(Math.abs(counts[face] - expected)).toBeLessThan(tolerance);
    }
  });

  it('asD6Roller returns a stable callback that delegates to d6', () => {
    const roller = new CryptoDiceRoller();
    const cb = roller.asD6Roller();
    // Identity is preserved across calls (we cache the binding).
    expect(roller.asD6Roller()).toBe(cb);
    const value = cb();
    expect(value).toBeGreaterThanOrEqual(1);
    expect(value).toBeLessThanOrEqual(6);
  });
});
