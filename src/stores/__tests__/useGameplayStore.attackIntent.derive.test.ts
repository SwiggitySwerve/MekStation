/**
 * Unit tests for the Attack Intent derived-state helpers (change
 * `attack-phase-intent-composer`, tasks 1.2) — twist-aware per-weapon
 * legality consumed verbatim from `deriveCombatWeaponRangeOptions`,
 * secondary-target context per `secondary-target-tracking`, and the live
 * Heat & Effect Ledger totals.
 */

import type { IHex, IHexGrid } from '@/types/gameplay/HexGridInterfaces';

import { Facing, FiringArc, type IWeaponStatus } from '@/types/gameplay';

import {
  focusTargetReducer,
  INITIAL_ATTACK_INTENT_STATE,
  toggleWeaponAssignmentReducer,
} from '../useGameplayStore.attackIntent';
import {
  deriveSecondaryTargetContext,
  deriveTargetArcUnderIntent,
  deriveVolleyLedgerTotals,
  deriveWeaponLegalityForTarget,
  effectiveAttackerFacing,
} from '../useGameplayStore.attackIntent.derive';

// =============================================================================
// Fixtures
// =============================================================================

function makeGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -10; q <= 10; q++) {
    for (let r = -10; r <= 10; r++) {
      hexes.set(`${q},${r}`, {
        coord: { q, r },
        occupantId: null,
        terrain: 'clear',
        elevation: 0,
      });
    }
  }
  return { config: { radius: 10 }, hexes };
}

function weapon(
  id: string,
  overrides: Partial<IWeaponStatus> = {},
): IWeaponStatus {
  return {
    id,
    name: id,
    location: 'RA',
    mountingArc: FiringArc.Front,
    destroyed: false,
    firedThisTurn: false,
    heat: 4,
    damage: 5,
    ranges: { short: 3, medium: 6, long: 9 },
    ...overrides,
  } as IWeaponStatus;
}

const ATTACKER = { position: { q: 0, r: 0 }, facing: Facing.North };

// =============================================================================
// Tests
// =============================================================================

describe('effectiveAttackerFacing (D7)', () => {
  it('uses the composed twist when set, base facing otherwise', () => {
    expect(effectiveAttackerFacing(Facing.North, null)).toBe(Facing.North);
    expect(effectiveAttackerFacing(Facing.North, Facing.Northeast)).toBe(
      Facing.Northeast,
    );
  });
});

describe('deriveWeaponLegalityForTarget — twist-aware legality at source', () => {
  it('TWIST UNLOCKS ARC LIVE: a front-arc-only weapon re-gates as the twist changes, and clearing restores exactly', () => {
    const grid = makeGrid();
    const weapons = [weapon('w1')];
    // Find a nearby hex that is NOT in the front arc at base facing but IS
    // under the +1 twist — the exact geometry is the arc module's contract;
    // what this test pins is that the legality derivation CONSUMES the
    // composed twist and is reversible (Torso Twist Intent scenarios).
    const twist = Facing.Northeast; // base North twisted one hexside right
    let candidate: { q: number; r: number } | null = null;
    for (const hex of Array.from(grid.hexes.values())) {
      const distance = Math.max(
        Math.abs(hex.coord.q),
        Math.abs(hex.coord.r),
        Math.abs(-hex.coord.q - hex.coord.r),
      );
      if (distance === 0 || distance > 3) continue;
      const baseArc = deriveTargetArcUnderIntent(ATTACKER, null, hex.coord);
      const twistedArc = deriveTargetArcUnderIntent(ATTACKER, twist, hex.coord);
      if (baseArc !== FiringArc.Front && twistedArc === FiringArc.Front) {
        candidate = hex.coord;
        break;
      }
    }
    expect(candidate).not.toBeNull();

    const blockedBefore = deriveWeaponLegalityForTarget({
      weapons,
      attacker: ATTACKER,
      composedTwist: null,
      targetPosition: candidate!,
      grid,
      minimumRangeApplies: true,
    })[0];
    expect(blockedBefore.available).toBe(false);
    expect(blockedBefore.blockedReason).toMatch(/arc/i);

    const unlocked = deriveWeaponLegalityForTarget({
      weapons,
      attacker: ATTACKER,
      composedTwist: twist,
      targetPosition: candidate!,
      grid,
      minimumRangeApplies: true,
    })[0];
    expect(unlocked.available).toBe(true);
    expect(unlocked.blockedReason).toBeUndefined();

    // Un-twist restores the prior gating exactly.
    const reblocked = deriveWeaponLegalityForTarget({
      weapons,
      attacker: ATTACKER,
      composedTwist: null,
      targetPosition: candidate!,
      grid,
      minimumRangeApplies: true,
    })[0];
    expect(reblocked).toEqual(blockedBefore);
  });

  it('blocks destroyed / empty-ammo / out-of-range weapons with rules-backed reasons', () => {
    const grid = makeGrid();
    const frontTarget = { q: 0, r: -2 }; // 2 hexes toward base facing North
    expect(deriveTargetArcUnderIntent(ATTACKER, null, frontTarget)).toBe(
      FiringArc.Front,
    );

    const rows = deriveWeaponLegalityForTarget({
      weapons: [
        weapon('operable'),
        weapon('destroyed', { destroyed: true }),
        weapon('dry', { ammoRemaining: 0 }),
      ],
      attacker: ATTACKER,
      composedTwist: null,
      targetPosition: frontTarget,
      grid,
      minimumRangeApplies: true,
    });
    expect(rows.map((row) => row.available)).toEqual([true, false, false]);
    expect(rows[1].blockedReason).toContain('destroyed');
    expect(rows[2].blockedReason).toContain('ammo');

    const outOfRange = deriveWeaponLegalityForTarget({
      weapons: [weapon('w1')],
      attacker: ATTACKER,
      composedTwist: null,
      targetPosition: { q: 0, r: -10 }, // 10 hexes > long 9
      grid,
      minimumRangeApplies: true,
    })[0];
    expect(outOfRange.available).toBe(false);
    expect(outOfRange.blockedReason).toBe('out of range');
  });
});

describe('deriveSecondaryTargetContext (secondary-target-tracking, consumed as-is)', () => {
  const frontTarget = { q: 0, r: -2 };

  it('returns undefined for the primary target and for an empty volley', () => {
    expect(
      deriveSecondaryTargetContext(
        INITIAL_ATTACK_INTENT_STATE,
        't1',
        ATTACKER,
        frontTarget,
      ),
    ).toBeUndefined();

    let state = focusTargetReducer(INITIAL_ATTACK_INTENT_STATE, 't1');
    state = toggleWeaponAssignmentReducer(state, 'w1');
    expect(
      deriveSecondaryTargetContext(state, 't1', ATTACKER, frontTarget),
    ).toBeUndefined();
  });

  it('flags non-primary targets secondary with twist-aware front-arc detection', () => {
    let state = focusTargetReducer(INITIAL_ATTACK_INTENT_STATE, 't1');
    state = toggleWeaponAssignmentReducer(state, 'w1');

    // Secondary in the front arc → +1 context.
    expect(
      deriveSecondaryTargetContext(state, 't2', ATTACKER, frontTarget),
    ).toEqual({ isSecondary: true, inFrontArc: true });

    // Secondary behind the attacker → +2 context.
    const rearTarget = { q: 0, r: 2 };
    expect(deriveTargetArcUnderIntent(ATTACKER, null, rearTarget)).not.toBe(
      FiringArc.Front,
    );
    expect(
      deriveSecondaryTargetContext(state, 't2', ATTACKER, rearTarget),
    ).toEqual({ isSecondary: true, inFrontArc: false });
  });
});

describe('deriveVolleyLedgerTotals (Heat and Effect Ledger)', () => {
  it('totals heat over movement heat, expected damage, and volley probability', () => {
    let state = focusTargetReducer(INITIAL_ATTACK_INTENT_STATE, 't1');
    state = toggleWeaponAssignmentReducer(state, 'w1');
    state = toggleWeaponAssignmentReducer(state, 'w2');

    const totals = deriveVolleyLedgerTotals({
      state,
      weapons: [
        weapon('w1', { heat: 4, damage: 5 }),
        weapon('w2', { heat: 3, damage: 10 }),
      ],
      hitProbabilityByWeaponId: { w1: 50, w2: 100 },
      movementHeat: 2,
      heatDissipation: 10,
    });

    expect(totals.weaponHeat).toBe(7);
    expect(totals.totalHeat).toBe(9);
    expect(totals.netHeat).toBe(-1);
    expect(totals.expectedDamage).toBeCloseTo(5 * 0.5 + 10 * 1);
    expect(totals.volleyHitProbability).toBeCloseTo(100);
  });

  it('counts heat for weapons without a forecast probability (fired heat is unconditional)', () => {
    let state = focusTargetReducer(INITIAL_ATTACK_INTENT_STATE, 't1');
    state = toggleWeaponAssignmentReducer(state, 'w1');

    const totals = deriveVolleyLedgerTotals({
      state,
      weapons: [weapon('w1', { heat: 6, damage: 5 })],
      hitProbabilityByWeaponId: {},
      movementHeat: 0,
      heatDissipation: 4,
    });

    expect(totals.weaponHeat).toBe(6);
    expect(totals.netHeat).toBe(2);
    expect(totals.expectedDamage).toBe(0);
    expect(totals.volleyHitProbability).toBe(0);
  });

  it('empty volley is all zeros against movement heat only', () => {
    const totals = deriveVolleyLedgerTotals({
      state: INITIAL_ATTACK_INTENT_STATE,
      weapons: [weapon('w1')],
      hitProbabilityByWeaponId: {},
      movementHeat: 5,
      heatDissipation: 10,
    });
    expect(totals.weaponHeat).toBe(0);
    expect(totals.totalHeat).toBe(5);
    expect(totals.netHeat).toBe(-5);
    expect(totals.volleyHitProbability).toBe(0);
  });
});
