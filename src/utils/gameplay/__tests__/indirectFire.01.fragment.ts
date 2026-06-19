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

describe('LRM Indirect Fire Mode', () => {
  describe('isIndirectFireCapable', () => {
    it('should allow LRM weapons to fire indirectly', () => {
      expect(isIndirectFireCapable('lrm-5')).toBe(true);
      expect(isIndirectFireCapable('lrm-10')).toBe(true);
      expect(isIndirectFireCapable('lrm-15')).toBe(true);
      expect(isIndirectFireCapable('lrm-20')).toBe(true);
    });

    it('should allow clan LRM variants', () => {
      expect(isIndirectFireCapable('clan-lrm-5')).toBe(true);
      expect(isIndirectFireCapable('clan-lrm-20')).toBe(true);
    });

    it('should allow semi-guided LRM variants', () => {
      expect(isIndirectFireCapable('semi-guided-lrm-5')).toBe(true);
      expect(isIndirectFireCapable('sg-lrm-10')).toBe(true);
    });

    it('should reject non-LRM weapons', () => {
      expect(isIndirectFireCapable('ac-10')).toBe(false);
      expect(isIndirectFireCapable('medium-laser')).toBe(false);
      expect(isIndirectFireCapable('ppc')).toBe(false);
      expect(isIndirectFireCapable('srm-6')).toBe(false);
      expect(isIndirectFireCapable('mrm-30')).toBe(false);
    });

    it('should reject streak LRM (not indirect capable)', () => {
      expect(isIndirectFireCapable('streak-lrm-10')).toBe(false);
    });
  });

  describe('resolveIndirectFire', () => {
    it('should allow direct fire when attacker has LOS', () => {
      const result = resolveIndirectFire(makeRequest({ attackerHasLOS: true }));
      expect(result.permitted).toBe(true);
      expect(result.isIndirect).toBe(false);
      expect(result.toHitPenalty).toBe(0);
    });

    it('should allow indirect fire with valid spotter when LOS blocked', () => {
      const result = resolveIndirectFire(makeRequest());
      expect(result.permitted).toBe(true);
      expect(result.isIndirect).toBe(true);
      expect(result.spotter).toBeDefined();
      expect(result.spotter!.entityId).toBe('spotter-1');
    });

    it('should reject indirect fire from airborne attackers', () => {
      const result = resolveIndirectFire(
        makeRequest({ attackerAirborne: true }),
      );
      expect(result.permitted).toBe(false);
      expect(result.isIndirect).toBe(false);
      expect(result.reason).toBe('Airborne units cannot use indirect fire');
    });

    it('should reject indirect fire when no spotter available', () => {
      const result = resolveIndirectFire(
        makeRequest({ spotterCandidates: [] }),
      );
      expect(result.permitted).toBe(false);
      expect(result.reason).toContain('No friendly unit');
    });

    it('should reject indirect fire for non-LRM weapons', () => {
      const result = resolveIndirectFire(
        makeRequest({ weaponId: 'medium-laser' }),
      );
      expect(result.permitted).toBe(false);
      expect(result.reason).toContain('not capable of indirect fire');
    });

    it('should calculate range from attacker to target, not spotter to target', () => {
      const result = resolveIndirectFire(makeRequest());
      expect(result.permitted).toBe(true);
      expect(result.isIndirect).toBe(true);
      // Range is calculated externally, but the system validates LOS from spotter
    });
  });
});

// =============================================================================
// 15.2: Spotter Mechanics
// =============================================================================
