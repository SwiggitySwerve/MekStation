import { Facing, FiringArc, IHexCoordinate } from '@/types/gameplay';

import { calculateFiringArc, getTwistedFacing } from '../firingArc';

// =============================================================================
// calculateFiringArc — All 4 arcs × 6 facings
// =============================================================================

describe('calculateFiringArc', () => {
  describe('same hex', () => {
    it('returns Front when attacker and target are in the same hex', () => {
      const pos: IHexCoordinate = { q: 3, r: 3 };
      expect(calculateFiringArc(pos, pos, Facing.North)).toBe(FiringArc.Front);
      expect(calculateFiringArc(pos, pos, Facing.South)).toBe(FiringArc.Front);
    });
  });

  describe('target facing North (0)', () => {
    const targetPos: IHexCoordinate = { q: 0, r: 0 };
    const facing = Facing.North;

    it('detects Front arc — attacker directly ahead (north)', () => {
      expect(calculateFiringArc({ q: 0, r: -2 }, targetPos, facing)).toBe(
        FiringArc.Front,
      );
    });

    it('detects Right arc — attacker at northeast adjacent (on boundary)', () => {
      // NE adjacent hex is exactly on the front/right boundary — falls to Right
      expect(calculateFiringArc({ q: 1, r: -1 }, targetPos, facing)).toBe(
        FiringArc.Right,
      );
    });

    it('detects Left arc — attacker at northwest adjacent (on boundary)', () => {
      // NW adjacent hex is exactly on the front/left boundary — falls to Left
      expect(calculateFiringArc({ q: -1, r: 0 }, targetPos, facing)).toBe(
        FiringArc.Left,
      );
    });

    it('detects Rear arc — attacker directly behind (south)', () => {
      expect(calculateFiringArc({ q: 0, r: 2 }, targetPos, facing)).toBe(
        FiringArc.Rear,
      );
    });

    it('detects Right arc — attacker to the right side', () => {
      expect(calculateFiringArc({ q: 2, r: -1 }, targetPos, facing)).toBe(
        FiringArc.Right,
      );
    });

    it('detects Left arc — attacker to the left side', () => {
      expect(calculateFiringArc({ q: -2, r: 1 }, targetPos, facing)).toBe(
        FiringArc.Left,
      );
    });
  });

  describe('target facing South (3)', () => {
    const targetPos: IHexCoordinate = { q: 0, r: 0 };
    const facing = Facing.South;

    it('detects Front arc — attacker south of target', () => {
      expect(calculateFiringArc({ q: 0, r: 2 }, targetPos, facing)).toBe(
        FiringArc.Front,
      );
    });

    it('detects Rear arc — attacker north of target', () => {
      expect(calculateFiringArc({ q: 0, r: -2 }, targetPos, facing)).toBe(
        FiringArc.Rear,
      );
    });
  });

  describe('target facing Southeast (2)', () => {
    const targetPos: IHexCoordinate = { q: 0, r: 0 };
    const facing = Facing.Southeast;

    it('detects Front arc — attacker in southeast direction', () => {
      expect(calculateFiringArc({ q: 1, r: 0 }, targetPos, facing)).toBe(
        FiringArc.Front,
      );
    });

    it('detects Rear arc — attacker in northwest direction', () => {
      expect(calculateFiringArc({ q: -1, r: 0 }, targetPos, facing)).toBe(
        FiringArc.Rear,
      );
    });
  });

  describe('target facing Northeast (1)', () => {
    const targetPos: IHexCoordinate = { q: 0, r: 0 };
    const facing = Facing.Northeast;

    it('detects Front arc — attacker in northeast direction', () => {
      expect(calculateFiringArc({ q: 1, r: -1 }, targetPos, facing)).toBe(
        FiringArc.Front,
      );
    });

    it('detects Rear arc — attacker in southwest direction', () => {
      expect(calculateFiringArc({ q: -1, r: 1 }, targetPos, facing)).toBe(
        FiringArc.Rear,
      );
    });
  });

  describe('target facing Southwest (4)', () => {
    const targetPos: IHexCoordinate = { q: 0, r: 0 };
    const facing = Facing.Southwest;

    it('detects Front arc — attacker in southwest direction', () => {
      expect(calculateFiringArc({ q: -1, r: 1 }, targetPos, facing)).toBe(
        FiringArc.Front,
      );
    });

    it('detects Rear arc — attacker in northeast direction', () => {
      expect(calculateFiringArc({ q: 1, r: -1 }, targetPos, facing)).toBe(
        FiringArc.Rear,
      );
    });
  });

  describe('target facing Northwest (5)', () => {
    const targetPos: IHexCoordinate = { q: 0, r: 0 };
    const facing = Facing.Northwest;

    it('detects Front arc — attacker in northwest direction', () => {
      expect(calculateFiringArc({ q: -1, r: 0 }, targetPos, facing)).toBe(
        FiringArc.Front,
      );
    });

    it('detects Rear arc — attacker in southeast direction', () => {
      expect(calculateFiringArc({ q: 1, r: 0 }, targetPos, facing)).toBe(
        FiringArc.Rear,
      );
    });
  });

  describe('all 6 facings × front/rear symmetry', () => {
    const targetPos: IHexCoordinate = { q: 5, r: 5 };

    // For each facing, a target 2 hexes directly ahead should be Front,
    // and 2 hexes directly behind should be Rear.
    const facingToFrontDelta: Record<number, IHexCoordinate> = {
      [Facing.North]: { q: 0, r: -2 },
      [Facing.Northeast]: { q: 2, r: -2 },
      [Facing.Southeast]: { q: 2, r: 0 },
      [Facing.South]: { q: 0, r: 2 },
      [Facing.Southwest]: { q: -2, r: 2 },
      [Facing.Northwest]: { q: -2, r: 0 },
    };

    for (let f = 0; f < 6; f++) {
      const facing = f as Facing;
      const frontDelta = facingToFrontDelta[f];
      const rearDelta = { q: -frontDelta.q, r: -frontDelta.r };

      it(`facing ${Facing[facing]}: directly ahead is Front`, () => {
        const attackerPos = {
          q: targetPos.q + frontDelta.q,
          r: targetPos.r + frontDelta.r,
        };
        expect(calculateFiringArc(attackerPos, targetPos, facing)).toBe(
          FiringArc.Front,
        );
      });

      it(`facing ${Facing[facing]}: directly behind is Rear`, () => {
        const attackerPos = {
          q: targetPos.q + rearDelta.q,
          r: targetPos.r + rearDelta.r,
        };
        expect(calculateFiringArc(attackerPos, targetPos, facing)).toBe(
          FiringArc.Rear,
        );
      });
    }
  });

  describe('long range', () => {
    it('detects correct arc at distance 5', () => {
      const targetPos: IHexCoordinate = { q: 0, r: 0 };
      expect(calculateFiringArc({ q: 0, r: -5 }, targetPos, Facing.North)).toBe(
        FiringArc.Front,
      );
      expect(calculateFiringArc({ q: 0, r: 5 }, targetPos, Facing.North)).toBe(
        FiringArc.Rear,
      );
    });

    it('detects correct arc at distance 10', () => {
      const targetPos: IHexCoordinate = { q: 0, r: 0 };
      expect(
        calculateFiringArc({ q: 0, r: -10 }, targetPos, Facing.North),
      ).toBe(FiringArc.Front);
    });
  });

  describe('non-origin positions', () => {
    it('works correctly with offset positions', () => {
      const targetPos: IHexCoordinate = { q: 10, r: 10 };
      expect(calculateFiringArc({ q: 10, r: 8 }, targetPos, Facing.North)).toBe(
        FiringArc.Front,
      );
      expect(
        calculateFiringArc({ q: 10, r: 12 }, targetPos, Facing.North),
      ).toBe(FiringArc.Rear);
    });
  });

  describe('spec scenario: target at (5,5) facing North, attacker at (5,3)', () => {
    it('returns Front arc per spec', () => {
      expect(
        calculateFiringArc({ q: 5, r: 3 }, { q: 5, r: 5 }, Facing.North),
      ).toBe(FiringArc.Front);
    });
  });
});

// =============================================================================
// getTwistedFacing
// =============================================================================

describe('getTwistedFacing', () => {
  it('left twist from North yields Northeast', () => {
    expect(getTwistedFacing(Facing.North, 'left')).toBe(Facing.Northeast);
  });

  it('right twist from North yields Northwest', () => {
    expect(getTwistedFacing(Facing.North, 'right')).toBe(Facing.Northwest);
  });

  it('left twist wraps from Northwest to North', () => {
    expect(getTwistedFacing(Facing.Northwest, 'left')).toBe(Facing.North);
  });

  it('right twist wraps from North to Northwest', () => {
    expect(getTwistedFacing(Facing.North, 'right')).toBe(Facing.Northwest);
  });

  it('left twist from South yields Southwest', () => {
    expect(getTwistedFacing(Facing.South, 'left')).toBe(Facing.Southwest);
  });

  it('right twist from South yields Southeast', () => {
    expect(getTwistedFacing(Facing.South, 'right')).toBe(Facing.Southeast);
  });
});

// =============================================================================
// Torso Twist Arc Extension (Task 2.7)
// =============================================================================

describe('calculateFiringArc with torso twist', () => {
  const targetPos: IHexCoordinate = { q: 0, r: 0 };

  describe('North-facing target, left twist', () => {
    it('extends front arc to include left-side attacker position', () => {
      // Without twist, attacker at right side might be Right arc.
      // With left twist (facing shifts to NE), front arc shifts left,
      // so position that was Right may now be Front.
      const attackerInRightSide: IHexCoordinate = { q: 2, r: -1 };

      const withoutTwist = calculateFiringArc(
        attackerInRightSide,
        targetPos,
        Facing.North,
      );
      const withLeftTwist = calculateFiringArc(
        attackerInRightSide,
        targetPos,
        Facing.North,
        'left',
      );

      // Left twist shifts facing clockwise (N→NE), which moves front arc rightward
      // So a right-side attacker may now be in front
      if (withoutTwist === FiringArc.Right) {
        expect(withLeftTwist).toBe(FiringArc.Front);
      }
    });
  });

  describe('North-facing target, right twist', () => {
    it('extends front arc to include right-side attacker position', () => {
      const attackerInLeftSide: IHexCoordinate = { q: -2, r: 1 };

      const withoutTwist = calculateFiringArc(
        attackerInLeftSide,
        targetPos,
        Facing.North,
      );
      const withRightTwist = calculateFiringArc(
        attackerInLeftSide,
        targetPos,
        Facing.North,
        'right',
      );

      // Right twist shifts facing counter-clockwise (N→NW), which moves front arc leftward
      if (withoutTwist === FiringArc.Left) {
        expect(withRightTwist).toBe(FiringArc.Front);
      }
    });
  });

  describe('torso twist shifts rear arc accordingly', () => {
    it('left twist shifts rear arc to the right', () => {
      // Attacker directly south of north-facing target is Rear
      const attackerBehind: IHexCoordinate = { q: 0, r: 2 };
      expect(calculateFiringArc(attackerBehind, targetPos, Facing.North)).toBe(
        FiringArc.Rear,
      );

      // With left twist (facing shifts N→NE), south position might shift to left side
      const withTwist = calculateFiringArc(
        attackerBehind,
        targetPos,
        Facing.North,
        'left',
      );
      expect([FiringArc.Rear, FiringArc.Left]).toContain(withTwist);
    });
  });

  describe('twist for all 6 facings', () => {
    it('left twist always shifts effective facing by +1', () => {
      for (let f = 0; f < 6; f++) {
        const facing = f as Facing;
        const expected = ((f + 1) % 6) as Facing;
        expect(getTwistedFacing(facing, 'left')).toBe(expected);
      }
    });

    it('right twist always shifts effective facing by -1', () => {
      for (let f = 0; f < 6; f++) {
        const facing = f as Facing;
        const expected = ((f - 1 + 6) % 6) as Facing;
        expect(getTwistedFacing(facing, 'right')).toBe(expected);
      }
    });
  });

  describe('twist produces different result from no-twist for side positions', () => {
    it('demonstrates arc shift via left twist', () => {
      // North-facing target, attacker at (2, -1) is Right arc without twist
      const attackerPos: IHexCoordinate = { q: 2, r: -1 };
      const noTwist = calculateFiringArc(attackerPos, targetPos, Facing.North);
      // Left twist shifts facing N→NE, pulling front arc rightward
      const leftTwist = calculateFiringArc(
        attackerPos,
        targetPos,
        Facing.North,
        'left',
      );

      expect(noTwist).toBe(FiringArc.Right);
      expect(leftTwist).toBe(FiringArc.Front);
    });

    it('demonstrates arc shift via right twist', () => {
      // North-facing target, attacker at (-2, 1) is Left arc without twist
      const attackerPos: IHexCoordinate = { q: -2, r: 1 };
      const noTwist = calculateFiringArc(attackerPos, targetPos, Facing.North);
      // Right twist shifts facing N→NW, pulling front arc leftward
      const rightTwist = calculateFiringArc(
        attackerPos,
        targetPos,
        Facing.North,
        'right',
      );

      expect(noTwist).toBe(FiringArc.Left);
      expect(rightTwist).toBe(FiringArc.Front);
    });
  });
});
