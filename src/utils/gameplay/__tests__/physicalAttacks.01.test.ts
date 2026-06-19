import {
  Facing,
  UnitType,
  makeDisplacementGrid,
  makeDropShipRadiusDisplacementGrid,
  makeBlockedChargeDisplacementGrid,
  makeDominoDisplacementGrid,
  makeProhibitedChargeDisplacementGrid,
  terrainFeature,
  computeDisplacementWithDominoChain,
  computeChargeDisplacementOutcome,
  computePreferredDisplacement,
  computeValidDisplacement,
  BATTLEMECH_MAX_DISPLACEMENT_ELEVATION_CHANGE,
  isTargetDirectlyAhead,
  sourceContainsGroundedDropShip,
} from './physicalAttacks.test-helpers';

describe('physicalAttacks', () => {
  describe('physical displacement helpers', () => {
    it('chooses valid displacement nearest the requested direction', () => {
      expect(
        computeValidDisplacement(
          makeDisplacementGrid(),
          'target',
          { q: 1, r: 0 },
          Facing.South,
        ),
      ).toEqual({ q: 1, r: 1 });
    });

    it('searches the radius-two ring when a grounded DropShip occupies the source hex', () => {
      const grid = makeDropShipRadiusDisplacementGrid();

      expect(
        computeValidDisplacement(grid, 'target', { q: 0, r: 0 }, Facing.South),
      ).toEqual({ q: 0, r: 1 });
      expect(
        computeValidDisplacement(grid, 'target', { q: 0, r: 0 }, Facing.South, {
          sourceContainsGroundedDropShip: true,
        }),
      ).toEqual({ q: 0, r: 2 });
    });

    it('detects same-board grounded DropShip source context for displaced units', () => {
      const target = {
        id: 'target',
        position: { q: 1, r: 0 },
        boardId: 'ground-map',
      };

      expect(
        sourceContainsGroundedDropShip(
          [
            target,
            {
              id: 'grounded-dropship',
              unitType: UnitType.DROPSHIP,
              isAirborne: false,
              boardId: 'ground-map',
              position: { q: 1, r: 0 },
            },
          ],
          target,
        ),
      ).toBe(true);
      expect(
        sourceContainsGroundedDropShip(
          [
            target,
            {
              id: 'airborne-dropship',
              unitType: UnitType.DROPSHIP,
              isAirborne: true,
              boardId: 'ground-map',
              position: { q: 1, r: 0 },
            },
          ],
          target,
        ),
      ).toBe(false);
      expect(
        sourceContainsGroundedDropShip(
          [
            target,
            {
              id: 'other-board-dropship',
              unitType: UnitType.DROPSHIP,
              isAirborne: false,
              boardId: 'space-map',
              position: { q: 1, r: 0 },
            },
          ],
          target,
        ),
      ).toBe(false);
    });

    it('walks the grounded DropShip radius-two ring before trying the next displacement offset', () => {
      expect(
        computeValidDisplacement(
          makeDropShipRadiusDisplacementGrid('impassable'),
          'target',
          { q: 0, r: 0 },
          Facing.South,
          { sourceContainsGroundedDropShip: true },
        ),
      ).toEqual({ q: -1, r: 2 });
    });

    it('prefers same-elevation displacement before higher side hexes', () => {
      expect(
        computePreferredDisplacement(
          makeDisplacementGrid(),
          'target',
          { q: 1, r: 0 },
          Facing.South,
        ),
      ).toEqual({ q: 1, r: 1 });
    });

    it('treats BattleMech displacement above two elevation levels as invalid', () => {
      const grid = makeDisplacementGrid();
      const hexes = new Map(grid.hexes);
      const blockedClimb = hexes.get('1,1');
      if (blockedClimb) {
        hexes.set('1,1', {
          ...blockedClimb,
          elevation: BATTLEMECH_MAX_DISPLACEMENT_ELEVATION_CHANGE + 1,
        });
      }

      expect(
        computeChargeDisplacementOutcome({
          grid: { ...grid, hexes },
          attackerId: 'attacker',
          attackerPosition: { q: 0, r: 0 },
          attackerFacing: Facing.South,
          targetId: 'target',
          targetPosition: { q: 1, r: 0 },
        }).displacements,
      ).toEqual([]);
    });

    it('treats explicit impassable BattleMech displacement terrain as invalid', () => {
      const grid = makeProhibitedChargeDisplacementGrid();

      expect(
        computeValidDisplacement(grid, 'target', { q: 1, r: 0 }, Facing.South),
      ).toEqual({ q: 0, r: 1 });
      expect(
        computeChargeDisplacementOutcome({
          grid,
          attackerId: 'attacker',
          attackerPosition: { q: 0, r: 0 },
          attackerFacing: Facing.South,
          targetId: 'target',
          targetPosition: { q: 1, r: 0 },
        }).displacements,
      ).toEqual([]);
    });

    it('treats overgrown BattleMech displacement terrain above level two as invalid', () => {
      for (const terrain of [
        terrainFeature('heavy_woods', 3),
        terrainFeature('jungle', 3),
        'woods:3',
        'ultra_woods',
      ]) {
        const grid = makeProhibitedChargeDisplacementGrid(terrain);

        expect(
          computeValidDisplacement(
            grid,
            'target',
            { q: 1, r: 0 },
            Facing.South,
          ),
        ).toEqual({ q: 0, r: 1 });
        expect(
          computeChargeDisplacementOutcome({
            grid,
            attackerId: 'attacker',
            attackerPosition: { q: 0, r: 0 },
            attackerFacing: Facing.South,
            targetId: 'target',
            targetPosition: { q: 1, r: 0 },
          }).displacements,
        ).toEqual([]);
      }

      expect(
        computeChargeDisplacementOutcome({
          grid: makeProhibitedChargeDisplacementGrid(
            terrainFeature('heavy_woods', 2),
          ),
          attackerId: 'attacker',
          attackerPosition: { q: 0, r: 0 },
          attackerFacing: Facing.South,
          targetId: 'target',
          targetPosition: { q: 1, r: 0 },
        }).displacements,
      ).toEqual([
        {
          unitId: 'target',
          from: { q: 1, r: 0 },
          to: { q: 1, r: 1 },
          reason: 'charge',
        },
        {
          unitId: 'attacker',
          from: { q: 0, r: 0 },
          to: { q: 1, r: 0 },
          reason: 'charge',
        },
      ]);
    });

    it('checks push target feet-facing instead of adjacency alone', () => {
      expect(
        isTargetDirectlyAhead({ q: 0, r: 0 }, Facing.Southeast, { q: 1, r: 0 }),
      ).toBe(true);
      expect(
        isTargetDirectlyAhead({ q: 0, r: 0 }, Facing.South, { q: 1, r: 0 }),
      ).toBe(false);
    });

    it('keeps successful charge units in place when target displacement is blocked', () => {
      expect(
        computeChargeDisplacementOutcome({
          grid: makeBlockedChargeDisplacementGrid(),
          attackerId: 'attacker',
          attackerPosition: { q: 0, r: 0 },
          attackerFacing: Facing.South,
          targetId: 'target',
          targetPosition: { q: 1, r: 0 },
        }).displacements,
      ).toEqual([]);
    });

    it('cascades occupied displacement destinations as source-backed domino chains', () => {
      const grid = makeDominoDisplacementGrid();

      expect(
        computeValidDisplacement(grid, 'target', { q: 1, r: 0 }, Facing.South),
      ).toEqual({ q: 1, r: 1 });
      expect(
        computeChargeDisplacementOutcome({
          grid,
          attackerId: 'attacker',
          attackerPosition: { q: 0, r: 0 },
          attackerFacing: Facing.South,
          targetId: 'target',
          targetPosition: { q: 1, r: 0 },
        }).displacements,
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
        {
          unitId: 'attacker',
          from: { q: 0, r: 0 },
          to: { q: 1, r: 0 },
          reason: 'charge',
        },
      ]);
    });

    it('keeps domino displacement as forced fallback without a represented step-out CFR decision', () => {
      const grid = makeDominoDisplacementGrid();

      expect(
        computeDisplacementWithDominoChain({
          grid,
          unitId: 'target',
          from: { q: 1, r: 0 },
          to: { q: 1, r: 1 },
          reason: 'charge',
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
  });
});
