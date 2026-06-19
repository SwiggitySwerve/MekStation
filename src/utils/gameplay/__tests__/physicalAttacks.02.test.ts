import {
  Facing,
  makeDisplacementGrid,
  makeBlockedDfaDisplacementGrid,
  makeDominoDisplacementGrid,
  makeFriendlyPreferredDisplacementGrid,
  computeDisplacementWithDominoChain,
  computeDfaDisplacementOutcome,
  computeDfaDisplacements,
  computePreferredDisplacement,
} from './physicalAttacks.test-helpers';

describe('physicalAttacks', () => {
  describe('physical displacement helpers', () => {
    it('accepts a blocker voluntary step-out path for side-entered occupied displacement', () => {
      const grid = makeDominoDisplacementGrid();

      expect(
        computeDisplacementWithDominoChain({
          grid,
          unitId: 'target',
          from: { q: 1, r: 0 },
          to: { q: 1, r: 1 },
          reason: 'charge',
          blockerStepOutDecision: {
            blockerUnitId: 'domino-blocker',
            from: { q: 1, r: 1 },
            response: 'move',
            psrPassed: true,
            context: {
              sideEntered: true,
              blockerJumped: false,
              legalStepOptions: [
                { kind: 'forward', to: { q: 2, r: 0 } },
                { kind: 'backward', to: { q: 0, r: 2 } },
              ],
            },
            path: [{ q: 2, r: 0 }],
          },
        }),
      ).toEqual([
        {
          unitId: 'domino-blocker',
          from: { q: 1, r: 1 },
          to: { q: 2, r: 0 },
          reason: 'domino_step_out',
        },
        {
          unitId: 'target',
          from: { q: 1, r: 0 },
          to: { q: 1, r: 1 },
          reason: 'charge',
        },
      ]);
    });

    it('falls back to forced domino when blocker step-out decision is invalid', () => {
      const grid = makeDominoDisplacementGrid();

      expect(
        computeDisplacementWithDominoChain({
          grid,
          unitId: 'target',
          from: { q: 1, r: 0 },
          to: { q: 1, r: 1 },
          reason: 'charge',
          blockerStepOutDecision: {
            blockerUnitId: 'other-blocker',
            from: { q: 1, r: 1 },
            response: 'move',
            psrPassed: true,
            context: {
              sideEntered: true,
              blockerJumped: false,
              legalStepOptions: [
                { kind: 'forward', to: { q: 2, r: 0 } },
                { kind: 'backward', to: { q: 0, r: 2 } },
              ],
            },
            path: [{ q: 2, r: 0 }],
          },
        }),
      ).toEqual([
        {
          unitId: 'target',
          from: { q: 1, r: 0 },
          to: { q: 1, r: 1 },
          reason: 'charge',
        },
        {
          unitId: 'domino-blocker',
          from: { q: 1, r: 1 },
          to: { q: 1, r: 2 },
          reason: 'domino',
        },
      ]);
    });

    it('models source-backed DFA hit and miss displacement order', () => {
      const grid = makeDisplacementGrid();

      expect(
        computeDfaDisplacements({
          grid,
          attackerId: 'attacker',
          attackerPosition: { q: 0, r: 0 },
          attackerFacing: Facing.South,
          targetId: 'target',
          targetPosition: { q: 1, r: 0 },
          hit: true,
        }),
      ).toEqual([
        {
          unitId: 'target',
          from: { q: 1, r: 0 },
          to: { q: 1, r: 1 },
          reason: 'dfa',
        },
        {
          unitId: 'attacker',
          from: { q: 0, r: 0 },
          to: { q: 1, r: 0 },
          reason: 'dfa',
        },
      ]);

      expect(
        computeDfaDisplacements({
          grid,
          attackerId: 'attacker',
          attackerPosition: { q: 0, r: 0 },
          attackerFacing: Facing.South,
          targetId: 'target',
          targetPosition: { q: 1, r: 0 },
          hit: false,
        }),
      ).toEqual([
        {
          unitId: 'target',
          from: { q: 1, r: 0 },
          to: { q: 1, r: 1 },
          reason: 'dfa_miss',
        },
        {
          unitId: 'attacker',
          from: { q: 0, r: 0 },
          to: { q: 1, r: 0 },
          reason: 'dfa_miss',
        },
      ]);
    });
  });

  describe('physical displacement helpers', () => {
    it('prefers non-friendly DFA miss displacement before falling back to occupied friendly hexes', () => {
      const grid = makeFriendlyPreferredDisplacementGrid();

      expect(
        computePreferredDisplacement(
          grid,
          'target',
          { q: 1, r: 0 },
          Facing.South,
        ),
      ).toEqual({ q: 1, r: 1 });
      expect(
        computePreferredDisplacement(
          grid,
          'target',
          { q: 1, r: 0 },
          Facing.South,
          { friendlyUnitIds: ['target-friend'] },
        ),
      ).toEqual({ q: 0, r: 1 });
      expect(
        computeDfaDisplacementOutcome({
          grid,
          attackerId: 'attacker',
          attackerPosition: { q: 0, r: 0 },
          attackerFacing: Facing.South,
          targetId: 'target',
          targetPosition: { q: 1, r: 0 },
          hit: false,
          targetFriendlyUnitIds: ['target-friend'],
        }).displacements,
      ).toEqual([
        {
          unitId: 'target',
          from: { q: 1, r: 0 },
          to: { q: 0, r: 1 },
          reason: 'dfa_miss',
        },
        {
          unitId: 'attacker',
          from: { q: 0, r: 0 },
          to: { q: 1, r: 0 },
          reason: 'dfa_miss',
        },
      ]);
    });

    it('identifies source-backed DFA impossible-displacement destruction', () => {
      const grid = makeBlockedDfaDisplacementGrid();
      const base = {
        grid,
        attackerId: 'attacker',
        attackerPosition: { q: 0, r: 0 },
        attackerFacing: Facing.South,
        targetId: 'target',
        targetPosition: { q: 1, r: 0 },
      };

      expect(computeDfaDisplacementOutcome({ ...base, hit: true })).toEqual({
        displacements: [
          {
            unitId: 'attacker',
            from: { q: 0, r: 0 },
            to: { q: 1, r: 0 },
            reason: 'dfa',
          },
        ],
        impossibleDisplacementDestroyedUnitId: 'target',
      });

      expect(computeDfaDisplacementOutcome({ ...base, hit: false })).toEqual({
        displacements: [],
        impossibleDisplacementDestroyedUnitId: 'attacker',
      });
    });
  });
});
