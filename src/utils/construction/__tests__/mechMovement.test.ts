import { calculateMechRunMP } from '../mechMovement';
import {
  calculateMaxRunMPWithModifiers,
  calculateRunMP,
  getMaxJumpMP,
  JumpJetType,
} from '../movementCalculations';

// MegaMek 48fcb2f64: Entity.getRunMP:4015-4016;
// MPBoosters.calculateRunMP:79-86; Mek.getRunMP:1748-1761.
describe('shared Mech running arithmetic', () => {
  it.each([
    [3, 5, 6, 8],
    [4, 6, 8, 10],
    [5, 8, 10, 13],
    [7, 11, 14, 18],
  ] as const)('derives running from walk %i', (walk, base, single, both) => {
    expect(calculateMechRunMP(walk)).toBe(base);
    expect(calculateMechRunMP(walk, { masc: true })).toBe(single);
    expect(calculateMechRunMP(walk, { supercharger: true })).toBe(single);
    expect(calculateMechRunMP(walk, { masc: true, supercharger: true })).toBe(
      both,
    );
  });

  it.each([
    [{}, 7],
    [{ masc: true }, 9],
    [{ supercharger: true }, 9],
    [{ masc: true, supercharger: true }, 12],
  ] as const)(
    'subtracts hardened armor after the multiplier: %j',
    (boosters, expected) => {
      expect(calculateMechRunMP(5, { ...boosters, hardenedArmor: true })).toBe(
        expected,
      );
    },
  );

  it('retains the caller-specific handling of nonpositive and fractional walk', () => {
    expect(calculateMechRunMP(-1)).toBe(-1);
    expect(calculateMechRunMP(-1, { hardenedArmor: true })).toBe(0);
    expect(calculateMechRunMP(0)).toBe(0);
    expect(calculateMechRunMP(0, { hardenedArmor: true })).toBe(0);
    expect(calculateMechRunMP(0.5)).toBe(1);
    expect(calculateRunMP(-1)).toBe(0);
    expect(getMaxJumpMP(-1, JumpJetType.IMPROVED)).toBe(-1);
  });

  it('preserves the legacy enhancement preview until the behavior-change PR', () => {
    expect(
      calculateMaxRunMPWithModifiers(5, {
        runMultiplierBonus: 1,
        flatMPBonus: 0,
      }),
    ).toBe(12);
    expect(
      calculateMaxRunMPWithModifiers(5, {
        runMultiplierBonus: 0,
        flatMPBonus: 1,
      }),
    ).toBe(8);
    expect(
      calculateMaxRunMPWithModifiers(5, {
        runMultiplierBonus: 0,
        flatMPBonus: 0,
      }),
    ).toBeUndefined();
    expect(
      calculateMaxRunMPWithModifiers(-1, {
        runMultiplierBonus: 0,
        flatMPBonus: 0,
      }),
    ).toBe(0);
  });
});
