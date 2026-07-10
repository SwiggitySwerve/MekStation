/**
 * gameSessionHeat.helpers — MaxTech heat-scale critical-location roller.
 *
 * `createLocationIndexRollerFromD6` (design D7, `add-sp-combat-determinism`)
 * derives a uniform 0–7 critical-location index from three draws of an
 * injected `D6Roller` stream so the MaxTech heat-scale crit table stops
 * escaping to `Math.random()` when a seeded stream is available. These
 * tests assert the invariants the design calls for — reproducibility
 * from a given stream, a valid output range, and zero `Math.random`
 * usage — never a pinned index sequence (no golden values; design D6).
 */

import { SeededD6Roller } from '@/simulation/core/SeededD6Roller';

import { createLocationIndexRollerFromD6 } from '../gameSessionHeat.helpers';

describe('createLocationIndexRollerFromD6', () => {
  it('produces an identical index sequence for two rollers fed the same stream', () => {
    const rollerA = createLocationIndexRollerFromD6(
      new SeededD6Roller(12345).asD6Roller(),
    );
    const rollerB = createLocationIndexRollerFromD6(
      new SeededD6Roller(12345).asD6Roller(),
    );

    const sequenceA = Array.from({ length: 25 }, () => rollerA());
    const sequenceB = Array.from({ length: 25 }, () => rollerB());

    expect(sequenceA).toEqual(sequenceB);
  });

  it('produces a different sequence from a differently-seeded stream (sanity, not a golden value)', () => {
    const rollerA = createLocationIndexRollerFromD6(
      new SeededD6Roller(1).asD6Roller(),
    );
    const rollerB = createLocationIndexRollerFromD6(
      new SeededD6Roller(2).asD6Roller(),
    );

    const sequenceA = Array.from({ length: 25 }, () => rollerA());
    const sequenceB = Array.from({ length: 25 }, () => rollerB());

    expect(sequenceA).not.toEqual(sequenceB);
  });

  it('always returns an integer in [0, 7]', () => {
    const roller = createLocationIndexRollerFromD6(
      new SeededD6Roller(999).asD6Roller(),
    );

    for (let i = 0; i < 500; i++) {
      const index = roller();
      expect(Number.isInteger(index)).toBe(true);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThanOrEqual(7);
    }
  });

  it('never calls Math.random — consumes only the injected d6 stream', () => {
    const randomSpy = jest.spyOn(Math, 'random');
    const roller = createLocationIndexRollerFromD6(
      new SeededD6Roller(42).asD6Roller(),
    );

    for (let i = 0; i < 50; i++) {
      roller();
    }

    expect(randomSpy).not.toHaveBeenCalled();
    randomSpy.mockRestore();
  });
});
