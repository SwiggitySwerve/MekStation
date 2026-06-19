import { MovementType } from '@/types/gameplay';
import { IHexGrid, IHex } from '@/types/gameplay/HexGridInterfaces';
import { TerrainType } from '@/types/gameplay/TerrainTypes';

import {
  isEligibleSpotter,
  calculateSpotterMovementPenalty,
  spotterHasLOS,
  findBestSpotter,
  isIndirectFireCapable,
  ECM_NULLIFIED_TAG_INDIRECT_FIRE_BLOCKED_REASON,
  resolveIndirectFire,
  resolveSemiGuidedLRM,
  resolveIndirectFireWithSemiGuided,
  semiGuidedTagIndirectFireBlockedReason,
  ISpotterCandidate,
  IIndirectFireRequest,
  ISemiGuidedContext,
} from '../indirectFire';

// =============================================================================
// Helpers
// =============================================================================

function makeSpotter(
  overrides: Partial<ISpotterCandidate> = {},
): ISpotterCandidate {
  return {
    entityId: 'spotter-1',
    teamId: 'team-A',
    position: { q: 2, r: 0 },
    movementType: MovementType.Stationary,
    isOperational: true,
    ...overrides,
  };
}

function makeHex(
  q: number,
  r: number,
  terrain: string = 'clear',
  elevation: number = 0,
): IHex {
  return { coord: { q, r }, occupantId: null, terrain, elevation };
}

function makeClearGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -5; q <= 10; q++) {
    for (let r = -5; r <= 10; r++) {
      hexes.set(`${q},${r}`, makeHex(q, r));
    }
  }
  return { config: { radius: 10 }, hexes };
}

function makeBlockedGrid(): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -5; q <= 10; q++) {
    for (let r = -5; r <= 10; r++) {
      hexes.set(`${q},${r}`, makeHex(q, r));
    }
  }
  // Light + heavy woods block LOS from (0,0) to (5,0).
  hexes.set('2,0', makeHex(2, 0, TerrainType.LightWoods));
  hexes.set('3,0', makeHex(3, 0, TerrainType.HeavyWoods));
  return { config: { radius: 10 }, hexes };
}

function makeRequest(
  overrides: Partial<IIndirectFireRequest> = {},
): IIndirectFireRequest {
  return {
    attackerEntityId: 'attacker-1',
    attackerTeamId: 'team-A',
    attackerPosition: { q: 0, r: 0 },
    targetPosition: { q: 5, r: 0 },
    weaponId: 'lrm-15',
    attackerHasLOS: false,
    spotterCandidates: [makeSpotter()],
    grid: makeClearGrid(),
    ...overrides,
  };
}

// =============================================================================
// 15.1: LRM Indirect Fire Mode
// =============================================================================

describe('Spotter Mechanics', () => {
  describe('isEligibleSpotter', () => {
    it('should accept stationary operational friendly unit', () => {
      const spotter = makeSpotter();
      expect(isEligibleSpotter(spotter, 'attacker-1', 'team-A')).toBe(true);
    });

    it('should accept walking friendly unit', () => {
      const spotter = makeSpotter({ movementType: MovementType.Walk });
      expect(isEligibleSpotter(spotter, 'attacker-1', 'team-A')).toBe(true);
    });

    it('should reject running spotter', () => {
      const spotter = makeSpotter({ movementType: MovementType.Run });
      expect(isEligibleSpotter(spotter, 'attacker-1', 'team-A')).toBe(false);
    });

    it('should reject jumping spotter', () => {
      const spotter = makeSpotter({ movementType: MovementType.Jump });
      expect(isEligibleSpotter(spotter, 'attacker-1', 'team-A')).toBe(false);
    });

    it('should reject sprinting or evading spotters', () => {
      expect(
        isEligibleSpotter(
          makeSpotter({ sprintedThisTurn: true }),
          'attacker-1',
          'team-A',
        ),
      ).toBe(false);
      expect(
        isEligibleSpotter(
          makeSpotter({ isEvading: true }),
          'attacker-1',
          'team-A',
        ),
      ).toBe(false);
    });

    it('should reject destroyed/shutdown spotter', () => {
      const spotter = makeSpotter({ isOperational: false });
      expect(isEligibleSpotter(spotter, 'attacker-1', 'team-A')).toBe(false);
    });

    it('should reject spotter from different team', () => {
      const spotter = makeSpotter({ teamId: 'team-B' });
      expect(isEligibleSpotter(spotter, 'attacker-1', 'team-A')).toBe(false);
    });

    it('should reject attacker as its own spotter', () => {
      const spotter = makeSpotter({ entityId: 'attacker-1' });
      expect(isEligibleSpotter(spotter, 'attacker-1', 'team-A')).toBe(false);
    });

    it('should reject airborne aerospace spotter without recon or imager equipment', () => {
      const spotter = makeSpotter({ isAirborneAerospace: true });
      expect(isEligibleSpotter(spotter, 'attacker-1', 'team-A')).toBe(false);
    });

    it('should accept airborne aerospace spotter with represented recon equipment', () => {
      const spotter = makeSpotter({
        isAirborneAerospace: true,
        airborneAeroSpottingEquipment: { reconCamera: true },
      });
      expect(isEligibleSpotter(spotter, 'attacker-1', 'team-A')).toBe(true);
    });
  });

  describe('calculateSpotterMovementPenalty', () => {
    it.each([
      [MovementType.Stationary, 0],
      [MovementType.Walk, 1],
      [MovementType.Run, 2],
      [MovementType.Jump, 3],
    ] as const)(
      'maps %s to MegaMek spotter penalty %i',
      (movement, penalty) => {
        expect(
          calculateSpotterMovementPenalty(
            makeSpotter({ movementType: movement }),
          ),
        ).toBe(penalty);
      },
    );

    it('does not apply a movement penalty to infantry spotters', () => {
      expect(
        calculateSpotterMovementPenalty(
          makeSpotter({ movementType: MovementType.Jump, isInfantry: true }),
        ),
      ).toBe(0);
    });
  });

  describe('spotterHasLOS', () => {
    it('should return hasLOS true on clear grid', () => {
      const spotter = makeSpotter({ position: { q: 2, r: 0 } });
      const result = spotterHasLOS(spotter, { q: 5, r: 0 }, makeClearGrid());
      expect(result.hasLOS).toBe(true);
    });

    it('should return hasLOS false when blocked by terrain', () => {
      const spotter = makeSpotter({ position: { q: 0, r: 0 } });
      const result = spotterHasLOS(spotter, { q: 5, r: 0 }, makeBlockedGrid());
      expect(result.hasLOS).toBe(false);
    });
  });

  describe('findBestSpotter', () => {
    it('should prefer stationary spotter over walking spotter', () => {
      const walking = makeSpotter({
        entityId: 'walker',
        movementType: MovementType.Walk,
        position: { q: 3, r: 1 },
      });
      const stationary = makeSpotter({
        entityId: 'stander',
        movementType: MovementType.Stationary,
        position: { q: 3, r: -1 },
      });
      const result = findBestSpotter(
        [walking, stationary],
        'attacker-1',
        'team-A',
        { q: 5, r: 0 },
        makeClearGrid(),
      );
      expect(result).not.toBeNull();
      expect(result!.spotter.entityId).toBe('stander');
    });

    it('should fall back to walking spotter when no stationary available', () => {
      const walking = makeSpotter({
        entityId: 'walker',
        movementType: MovementType.Walk,
        position: { q: 3, r: 1 },
      });
      const result = findBestSpotter(
        [walking],
        'attacker-1',
        'team-A',
        { q: 5, r: 0 },
        makeClearGrid(),
      );
      expect(result).not.toBeNull();
      expect(result!.spotter.entityId).toBe('walker');
    });

    it('should return null when no eligible spotters', () => {
      const result = findBestSpotter(
        [],
        'attacker-1',
        'team-A',
        { q: 5, r: 0 },
        makeClearGrid(),
      );
      expect(result).toBeNull();
    });

    it('should skip spotters without LOS to target', () => {
      const grid = makeBlockedGrid();
      // Spotter at (0,0) can't see (5,0) through heavy woods at (3,0)
      const noLOS = makeSpotter({
        entityId: 'no-los',
        position: { q: 0, r: 0 },
      });
      // Spotter at (5,-1) has clear LOS to (5,0)
      const hasLOS = makeSpotter({
        entityId: 'has-los',
        position: { q: 5, r: -1 },
      });
      const result = findBestSpotter(
        [noLOS, hasLOS],
        'attacker-1',
        'team-A',
        { q: 5, r: 0 },
        grid,
      );
      expect(result).not.toBeNull();
      expect(result!.spotter.entityId).toBe('has-los');
    });

    it('should filter out running, jumping, sprinting, and evading spotters', () => {
      const running = makeSpotter({
        entityId: 'runner',
        movementType: MovementType.Run,
      });
      const jumping = makeSpotter({
        entityId: 'jumper',
        movementType: MovementType.Jump,
      });
      const sprinting = makeSpotter({
        entityId: 'sprinter',
        sprintedThisTurn: true,
      });
      const evading = makeSpotter({
        entityId: 'evader',
        isEvading: true,
      });
      const result = findBestSpotter(
        [running, jumping, sprinting, evading],
        'attacker-1',
        'team-A',
        { q: 5, r: 0 },
        makeClearGrid(),
      );
      expect(result).toBeNull();
    });

    it('should skip airborne aerospace spotters that lack represented spotting gear', () => {
      const airborneAero = makeSpotter({
        entityId: 'airborne-aero',
        isAirborneAerospace: true,
        position: { q: 5, r: -1 },
      });
      const groundSpotter = makeSpotter({
        entityId: 'ground-spotter',
        position: { q: 5, r: 1 },
      });
      const result = findBestSpotter(
        [airborneAero, groundSpotter],
        'attacker-1',
        'team-A',
        { q: 5, r: 0 },
        makeClearGrid(),
      );
      expect(result).not.toBeNull();
      expect(result!.spotter.entityId).toBe('ground-spotter');
    });
  });
});

// =============================================================================
// 15.3: Indirect Fire To-Hit Penalty
// =============================================================================
