import type {
  IHexCoordinate,
  IMovementCapability,
  IUnitPosition,
  IHex,
  IHexGrid,
} from '@/types/gameplay';

import { Facing, MovementType } from '@/types/gameplay';

import { MoveAI } from '../ai/MoveAI';
import { DEFAULT_BEHAVIOR, type IMove } from '../ai/types';
import { SeededRandom } from '../core/SeededRandom';

function createMockGrid(
  radius: number = 5,
  occupiedHexes: IHexCoordinate[] = [],
): IHexGrid {
  const hexes = new Map<string, IHex>();
  const occupiedSet = new Set(occupiedHexes.map((c) => `${c.q},${c.r}`));

  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) <= radius) {
        const key = `${q},${r}`;
        hexes.set(key, {
          coord: { q, r },
          occupantId: occupiedSet.has(key) ? 'occupied' : null,
          terrain: 'clear',
          elevation: 0,
        });
      }
    }
  }

  return {
    config: { radius },
    hexes,
  };
}

function createUnitPosition(
  q: number,
  r: number,
  facing: Facing = Facing.North,
): IUnitPosition {
  return {
    unitId: 'test-unit',
    coord: { q, r },
    facing,
    prone: false,
  };
}

function createMovementCapability(
  walkMP: number = 4,
  jumpMP: number = 0,
): IMovementCapability {
  return {
    walkMP,
    runMP: Math.ceil(walkMP * 1.5),
    jumpMP,
  };
}

describe('MoveAI', () => {
  describe('getValidMoves', () => {
    it('should return moves within MP range', () => {
      const moveAI = new MoveAI(DEFAULT_BEHAVIOR);
      const grid = createMockGrid(5);
      const position = createUnitPosition(0, 0);
      const capability = createMovementCapability(2);

      const moves = moveAI.getValidMoves(
        grid,
        position,
        MovementType.Walk,
        capability,
      );

      expect(moves.length).toBeGreaterThan(0);
      moves.forEach((move: IMove) => {
        const distance = Math.max(
          Math.abs(move.destination.q),
          Math.abs(move.destination.r),
          Math.abs(move.destination.q + move.destination.r),
        );
        expect(distance).toBeLessThanOrEqual(2);
      });
    });

    it('should include stay-in-place as valid move', () => {
      const moveAI = new MoveAI(DEFAULT_BEHAVIOR);
      const grid = createMockGrid(5);
      const position = createUnitPosition(0, 0);
      const capability = createMovementCapability(2);

      const moves = moveAI.getValidMoves(
        grid,
        position,
        MovementType.Walk,
        capability,
      );

      const stayInPlace = moves.find(
        (m: IMove) => m.destination.q === 0 && m.destination.r === 0,
      );
      expect(stayInPlace).toBeDefined();
    });

    it('should return stay-in-place moves with all facings when unit has 0 MP', () => {
      const moveAI = new MoveAI(DEFAULT_BEHAVIOR);
      const grid = createMockGrid(5);
      const position = createUnitPosition(0, 0);
      const capability = createMovementCapability(0, 0);

      const moves = moveAI.getValidMoves(
        grid,
        position,
        MovementType.Walk,
        capability,
      );

      expect(moves.length).toBe(6);
      moves.forEach((m: IMove) => {
        expect(m.destination.q).toBe(0);
        expect(m.destination.r).toBe(0);
      });
      const facings = new Set(moves.map((m: IMove) => m.facing));
      expect(facings.size).toBe(6);
    });

    it('should respect running MP when movement type is run', () => {
      const moveAI = new MoveAI(DEFAULT_BEHAVIOR);
      const grid = createMockGrid(10);
      const position = createUnitPosition(0, 0);
      const capability = createMovementCapability(4, 0);

      const runMoves = moveAI.getValidMoves(
        grid,
        position,
        MovementType.Run,
        capability,
      );
      const walkMoves = moveAI.getValidMoves(
        grid,
        position,
        MovementType.Walk,
        capability,
      );

      expect(runMoves.length).toBeGreaterThan(walkMoves.length);
    });

    it('should respect jump MP when movement type is jump', () => {
      const moveAI = new MoveAI(DEFAULT_BEHAVIOR);
      const grid = createMockGrid(10);
      const position = createUnitPosition(0, 0);
      const capability = createMovementCapability(4, 5);

      const jumpMoves = moveAI.getValidMoves(
        grid,
        position,
        MovementType.Jump,
        capability,
      );

      expect(jumpMoves.length).toBeGreaterThan(0);
      const maxDistance = Math.max(
        ...jumpMoves.map((m: IMove) =>
          Math.max(
            Math.abs(m.destination.q),
            Math.abs(m.destination.r),
            Math.abs(m.destination.q + m.destination.r),
          ),
        ),
      );
      expect(maxDistance).toBeLessThanOrEqual(5);
    });

    it('should not include occupied hexes', () => {
      const moveAI = new MoveAI(DEFAULT_BEHAVIOR);
      const grid = createMockGrid(5, [
        { q: 1, r: 0 },
        { q: 0, r: 1 },
      ]);
      const position = createUnitPosition(0, 0);
      const capability = createMovementCapability(2);

      const moves = moveAI.getValidMoves(
        grid,
        position,
        MovementType.Walk,
        capability,
      );

      const blockedMoves = moves.filter(
        (m: IMove) =>
          (m.destination.q === 1 && m.destination.r === 0) ||
          (m.destination.q === 0 && m.destination.r === 1),
      );
      expect(blockedMoves.length).toBe(0);
    });

    it('should include all valid facing directions for each destination', () => {
      const moveAI = new MoveAI(DEFAULT_BEHAVIOR);
      const grid = createMockGrid(5);
      const position = createUnitPosition(0, 0);
      const capability = createMovementCapability(1);

      const moves = moveAI.getValidMoves(
        grid,
        position,
        MovementType.Walk,
        capability,
      );

      const destAtOneZero = moves.filter(
        (m: IMove) => m.destination.q === 1 && m.destination.r === 0,
      );
      expect(destAtOneZero.length).toBe(6);
      const facings = new Set(destAtOneZero.map((m: IMove) => m.facing));
      expect(facings.size).toBe(6);
    });

    it('should set correct movement type in returned moves', () => {
      const moveAI = new MoveAI(DEFAULT_BEHAVIOR);
      const grid = createMockGrid(5);
      const position = createUnitPosition(0, 0);
      const capability = createMovementCapability(4);

      const walkMoves = moveAI.getValidMoves(
        grid,
        position,
        MovementType.Walk,
        capability,
      );
      const runMoves = moveAI.getValidMoves(
        grid,
        position,
        MovementType.Run,
        capability,
      );

      walkMoves.forEach((m: IMove) =>
        expect(m.movementType).toBe(MovementType.Walk),
      );
      runMoves.forEach((m: IMove) =>
        expect(m.movementType).toBe(MovementType.Run),
      );
    });
  });

  describe('selectMove', () => {
    it('should return a move from the provided list', () => {
      const moveAI = new MoveAI(DEFAULT_BEHAVIOR);
      const random = new SeededRandom(12345);

      const moves: IMove[] = [
        {
          destination: { q: 1, r: 0 },
          facing: Facing.North,
          movementType: MovementType.Walk,
          mpCost: 1,
          heatGenerated: 1,
        },
        {
          destination: { q: 0, r: 1 },
          facing: Facing.South,
          movementType: MovementType.Walk,
          mpCost: 1,
          heatGenerated: 1,
        },
        {
          destination: { q: -1, r: 0 },
          facing: Facing.Southeast,
          movementType: MovementType.Walk,
          mpCost: 1,
          heatGenerated: 1,
        },
      ];

      const selected = moveAI.selectMove(moves, random);

      expect(selected).not.toBeNull();
      expect(moves).toContainEqual(selected);
    });

    it('should return null when no moves available', () => {
      const moveAI = new MoveAI(DEFAULT_BEHAVIOR);
      const random = new SeededRandom(12345);

      const selected = moveAI.selectMove([], random);

      expect(selected).toBeNull();
    });

    it('should be deterministic with same seed', () => {
      const moveAI = new MoveAI(DEFAULT_BEHAVIOR);

      const moves: IMove[] = [
        {
          destination: { q: 1, r: 0 },
          facing: Facing.North,
          movementType: MovementType.Walk,
          mpCost: 1,
          heatGenerated: 1,
        },
        {
          destination: { q: 0, r: 1 },
          facing: Facing.South,
          movementType: MovementType.Walk,
          mpCost: 1,
          heatGenerated: 1,
        },
        {
          destination: { q: -1, r: 0 },
          facing: Facing.Southeast,
          movementType: MovementType.Walk,
          mpCost: 1,
          heatGenerated: 1,
        },
        {
          destination: { q: 0, r: -1 },
          facing: Facing.Southwest,
          movementType: MovementType.Walk,
          mpCost: 1,
          heatGenerated: 1,
        },
        {
          destination: { q: 1, r: -1 },
          facing: Facing.Northeast,
          movementType: MovementType.Walk,
          mpCost: 1,
          heatGenerated: 1,
        },
      ];

      const random1 = new SeededRandom(54321);
      const random2 = new SeededRandom(54321);

      const selected1 = moveAI.selectMove(moves, random1);
      const selected2 = moveAI.selectMove(moves, random2);

      expect(selected1).toEqual(selected2);
    });

    it('should produce different results with different seeds', () => {
      const moveAI = new MoveAI(DEFAULT_BEHAVIOR);

      const moves: IMove[] = Array.from({ length: 20 }, (_, i) => ({
        destination: { q: i, r: 0 },
        facing: Facing.North,
        movementType: MovementType.Walk,
        mpCost: 1,
        heatGenerated: 1,
      }));

      const results = new Set<number>();
      for (let seed = 0; seed < 100; seed++) {
        const random = new SeededRandom(seed);
        const selected = moveAI.selectMove(moves, random);
        if (selected) {
          results.add(selected.destination.q);
        }
      }

      expect(results.size).toBeGreaterThan(5);
    });

    it('should return single move when only one option', () => {
      const moveAI = new MoveAI(DEFAULT_BEHAVIOR);
      const random = new SeededRandom(12345);

      const moves: IMove[] = [
        {
          destination: { q: 1, r: 0 },
          facing: Facing.North,
          movementType: MovementType.Walk,
          mpCost: 1,
          heatGenerated: 1,
        },
      ];

      const selected = moveAI.selectMove(moves, random);

      expect(selected).toEqual(moves[0]);
    });
  });
});
