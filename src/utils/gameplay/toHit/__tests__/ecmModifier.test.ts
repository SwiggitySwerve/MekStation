/**
 * ECM to-hit modifier tests — `add-ecm-tohit-modifier` (closes playtest gap #1).
 *
 * Covers:
 *   - 16 combinations of 4 guidance types × 4 ECM coverage combos
 *   - The "non-electronic weapon" no-op
 *   - The modifier shape (value, reason, source)
 *   - Wire-through via `calculateToHit(..., ecmContext)`
 *
 * Per the spec scenarios at
 * `openspec/changes/add-ecm-tohit-modifier/specs/to-hit-resolution/spec.md`.
 */

import type {
  IAttackerState,
  ITargetState,
} from '@/types/gameplay/CombatInterfaces';

import { MovementType, RangeBracket } from '@/types/gameplay';

import { calculateToHit } from '../calculate';
import {
  ECM_MODIFIER_VALUE,
  ECM_TO_HIT_MODIFIERS,
  calculateEcmModifier,
  type IEcmCoverageState,
  type WeaponGuidanceType,
} from '../ecmModifier';

// =============================================================================
// Coverage fixtures
// =============================================================================

const NONE: IEcmCoverageState = {
  attackerInBubble: false,
  targetInBubble: false,
};
const SHOOTER_ONLY: IEcmCoverageState = {
  attackerInBubble: true,
  targetInBubble: false,
};
const TARGET_ONLY: IEcmCoverageState = {
  attackerInBubble: false,
  targetInBubble: true,
};
const BOTH: IEcmCoverageState = {
  attackerInBubble: true,
  targetInBubble: true,
};

const COVERAGE_CASES: ReadonlyArray<{
  readonly label: string;
  readonly state: IEcmCoverageState;
}> = [
  { label: 'neither in bubble', state: NONE },
  { label: 'shooter only', state: SHOOTER_ONLY },
  { label: 'target only', state: TARGET_ONLY },
  { label: 'both', state: BOTH },
];

/**
 * Expected firing matrix per the spec rules:
 *   - C3 + TC key on the SHOOTER (attackerInBubble)
 *   - Artemis + NARC key on the TARGET  (targetInBubble)
 *
 * Each cell is true iff the modifier SHALL fire for that combo.
 */
const EXPECTED_FIRES: Record<
  Exclude<WeaponGuidanceType, 'none'>,
  Record<string, boolean>
> = {
  c3: {
    'neither in bubble': false,
    'shooter only': true,
    'target only': false,
    both: true,
  },
  tc: {
    'neither in bubble': false,
    'shooter only': true,
    'target only': false,
    both: true,
  },
  artemis: {
    'neither in bubble': false,
    'shooter only': false,
    'target only': true,
    both: true,
  },
  narc: {
    'neither in bubble': false,
    'shooter only': false,
    'target only': true,
    both: true,
  },
};

// =============================================================================
// calculateEcmModifier — direct tests
// =============================================================================

describe('calculateEcmModifier — 4 guidance × 4 coverage combos (16 cases)', () => {
  for (const guidance of ['c3', 'artemis', 'tc', 'narc'] as const) {
    describe(`guidance: ${guidance}`, () => {
      for (const { label, state } of COVERAGE_CASES) {
        const expectedFires = EXPECTED_FIRES[guidance][label];
        const expectFireText = expectedFires
          ? 'fires +1 modifier'
          : 'returns null';

        it(`${label} → ${expectFireText}`, () => {
          const mod = calculateEcmModifier(guidance, state);

          if (!expectedFires) {
            expect(mod).toBeNull();
            return;
          }

          expect(mod).not.toBeNull();
          expect(mod!.value).toBe(ECM_MODIFIER_VALUE);
          expect(mod!.value).toBe(1);
          expect(mod!.source).toBe('equipment');

          // The reason label is the one the post-resolve UI reads to label
          // the badge — distinguishable per guidance type.
          const expectedReason = ECM_TO_HIT_MODIFIERS[guidance].reason;
          expect(mod!.name).toContain(expectedReason);
        });
      }
    });
  }
});

describe("calculateEcmModifier — 'none' guidance is unaffected", () => {
  // Per the spec scenario "Non-electronic weapon fires unaffected by ECM":
  // a weapon with no guidance returns null for every coverage combo so the
  // to-hit accumulator stays unchanged.
  for (const { label, state } of COVERAGE_CASES) {
    it(`'none' guidance with ${label} returns null`, () => {
      expect(calculateEcmModifier('none', state)).toBeNull();
    });
  }
});

// =============================================================================
// calculateEcmModifier — reason / source / shape
// =============================================================================

describe('calculateEcmModifier — modifier shape', () => {
  it("the C3-fires path carries 'c3-broken' reason and equipment source", () => {
    const mod = calculateEcmModifier('c3', SHOOTER_ONLY);
    expect(mod).not.toBeNull();
    expect(mod!.source).toBe('equipment');
    expect(mod!.name).toContain('c3-broken');
    expect(mod!.description).toContain('C3 link');
  });

  it("the Artemis-fires path carries 'artemis-degraded' reason", () => {
    const mod = calculateEcmModifier('artemis', TARGET_ONLY);
    expect(mod).not.toBeNull();
    expect(mod!.name).toContain('artemis-degraded');
    expect(mod!.description).toContain('Artemis');
  });

  it("the TC-fires path carries 'tc-degraded' reason", () => {
    const mod = calculateEcmModifier('tc', SHOOTER_ONLY);
    expect(mod).not.toBeNull();
    expect(mod!.name).toContain('tc-degraded');
    expect(mod!.description).toContain('Targeting computer');
  });

  it("the NARC-fires path carries 'narc-degraded' reason", () => {
    const mod = calculateEcmModifier('narc', TARGET_ONLY);
    expect(mod).not.toBeNull();
    expect(mod!.name).toContain('narc-degraded');
    expect(mod!.description).toContain('NARC');
  });
});

// =============================================================================
// calculateToHit — wire-through test
// =============================================================================
//
// The ECM modifier stacks additively with existing modifiers. Verify by
// comparing the same scenario with and without an ecmContext: the ECM
// case is exactly `+1` higher than the non-ECM case.

function makeAttacker(): IAttackerState {
  return {
    gunnery: 4,
    movementType: MovementType.Stationary,
    heat: 0,
    damageModifiers: [],
  };
}

function makeTarget(): ITargetState {
  return {
    movementType: MovementType.Stationary,
    hexesMoved: 0,
    prone: false,
    immobile: false,
    partialCover: false,
  };
}

describe('calculateToHit — ECM context wire-through', () => {
  it('without ecmContext the result is identical to the legacy signature', () => {
    const baseline = calculateToHit(
      makeAttacker(),
      makeTarget(),
      RangeBracket.Short,
      3,
    );
    const withUndefined = calculateToHit(
      makeAttacker(),
      makeTarget(),
      RangeBracket.Short,
      3,
      0,
      undefined,
    );
    expect(withUndefined.finalToHit).toBe(baseline.finalToHit);
    expect(withUndefined.modifiers).toHaveLength(baseline.modifiers.length);
  });

  it("ecmContext with guidance: 'none' adds no modifier (legacy compat)", () => {
    const baseline = calculateToHit(
      makeAttacker(),
      makeTarget(),
      RangeBracket.Short,
      3,
    );
    const withNoneEcm = calculateToHit(
      makeAttacker(),
      makeTarget(),
      RangeBracket.Short,
      3,
      0,
      { guidance: 'none', coverage: BOTH },
    );
    expect(withNoneEcm.finalToHit).toBe(baseline.finalToHit);
  });

  it('C3 + shooter in bubble adds exactly +1 to the total', () => {
    const baseline = calculateToHit(
      makeAttacker(),
      makeTarget(),
      RangeBracket.Short,
      3,
    );
    const withEcm = calculateToHit(
      makeAttacker(),
      makeTarget(),
      RangeBracket.Short,
      3,
      0,
      { guidance: 'c3', coverage: SHOOTER_ONLY },
    );
    expect(withEcm.finalToHit - baseline.finalToHit).toBe(1);

    // The ECM modifier appears in the breakdown so the post-resolve UI
    // can render the "why" line.
    expect(withEcm.modifiers.some((m) => m.name.includes('c3-broken'))).toBe(
      true,
    );
  });

  it('Artemis + target in bubble adds exactly +1 to the total', () => {
    const baseline = calculateToHit(
      makeAttacker(),
      makeTarget(),
      RangeBracket.Short,
      3,
    );
    const withEcm = calculateToHit(
      makeAttacker(),
      makeTarget(),
      RangeBracket.Short,
      3,
      0,
      { guidance: 'artemis', coverage: TARGET_ONLY },
    );
    expect(withEcm.finalToHit - baseline.finalToHit).toBe(1);
    expect(
      withEcm.modifiers.some((m) => m.name.includes('artemis-degraded')),
    ).toBe(true);
  });

  it('C3 + target-only (no shooter) does NOT fire the modifier', () => {
    const baseline = calculateToHit(
      makeAttacker(),
      makeTarget(),
      RangeBracket.Short,
      3,
    );
    const withEcm = calculateToHit(
      makeAttacker(),
      makeTarget(),
      RangeBracket.Short,
      3,
      0,
      { guidance: 'c3', coverage: TARGET_ONLY },
    );
    expect(withEcm.finalToHit).toBe(baseline.finalToHit);
  });

  it('ECM stacks additively with the heat modifier', () => {
    // Set heat high enough to trigger the +1 heat modifier (heat >= 8).
    const hotAttacker: IAttackerState = { ...makeAttacker(), heat: 9 };
    const baseline = calculateToHit(
      hotAttacker,
      makeTarget(),
      RangeBracket.Short,
      3,
    );
    const withEcm = calculateToHit(
      hotAttacker,
      makeTarget(),
      RangeBracket.Short,
      3,
      0,
      { guidance: 'tc', coverage: SHOOTER_ONLY },
    );
    // Heat already contributed to baseline; ECM adds exactly +1 on top.
    expect(withEcm.finalToHit - baseline.finalToHit).toBe(1);
  });
});
