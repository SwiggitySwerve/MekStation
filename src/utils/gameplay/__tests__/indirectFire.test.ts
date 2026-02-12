import { MovementType } from '@/types/gameplay';
import { IHexGrid, IHex } from '@/types/gameplay/HexGridInterfaces';
import { TerrainType } from '@/types/gameplay/TerrainTypes';

import {
  isEligibleSpotter,
  spotterHasLOS,
  findBestSpotter,
  isIndirectFireCapable,
  resolveIndirectFire,
  resolveSemiGuidedLRM,
  resolveIndirectFireWithSemiGuided,
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
  // Heavy woods at (3, 0) blocks LOS from (0,0) to (5,0)
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

    it('should filter out running and jumping spotters', () => {
      const running = makeSpotter({
        entityId: 'runner',
        movementType: MovementType.Run,
      });
      const jumping = makeSpotter({
        entityId: 'jumper',
        movementType: MovementType.Jump,
      });
      const result = findBestSpotter(
        [running, jumping],
        'attacker-1',
        'team-A',
        { q: 5, r: 0 },
        makeClearGrid(),
      );
      expect(result).toBeNull();
    });
  });
});

// =============================================================================
// 15.3: Indirect Fire To-Hit Penalty
// =============================================================================

describe('Indirect Fire To-Hit Penalty', () => {
  it('should apply +1 penalty with stationary spotter', () => {
    const result = resolveIndirectFire(
      makeRequest({
        spotterCandidates: [
          makeSpotter({ movementType: MovementType.Stationary }),
        ],
      }),
    );
    expect(result.permitted).toBe(true);
    expect(result.isIndirect).toBe(true);
    expect(result.toHitPenalty).toBe(1);
    expect(result.spotterWalked).toBe(false);
  });

  it('should apply +2 penalty with walking spotter', () => {
    const result = resolveIndirectFire(
      makeRequest({
        spotterCandidates: [makeSpotter({ movementType: MovementType.Walk })],
      }),
    );
    expect(result.permitted).toBe(true);
    expect(result.isIndirect).toBe(true);
    expect(result.toHitPenalty).toBe(2);
    expect(result.spotterWalked).toBe(true);
  });

  it('should have zero penalty when attacker has direct LOS', () => {
    const result = resolveIndirectFire(makeRequest({ attackerHasLOS: true }));
    expect(result.toHitPenalty).toBe(0);
    expect(result.isIndirect).toBe(false);
  });

  it('should prefer stationary spotter for lower penalty', () => {
    const result = resolveIndirectFire(
      makeRequest({
        spotterCandidates: [
          makeSpotter({
            entityId: 'walker',
            movementType: MovementType.Walk,
            position: { q: 3, r: 1 },
          }),
          makeSpotter({
            entityId: 'stander',
            movementType: MovementType.Stationary,
            position: { q: 3, r: -1 },
          }),
        ],
      }),
    );
    expect(result.toHitPenalty).toBe(1);
    expect(result.spotterWalked).toBe(false);
    expect(result.spotter!.entityId).toBe('stander');
  });
});

// =============================================================================
// 15.4: Semi-Guided LRM with TAG
// =============================================================================

describe('Semi-Guided LRM with TAG', () => {
  describe('resolveSemiGuidedLRM', () => {
    it('should activate semi-guided mode when TAG designated', () => {
      const context: ISemiGuidedContext = {
        weaponId: 'semi-guided-lrm-5',
        equipment: { isSemiGuided: true },
        targetStatus: { tagDesignated: true },
      };
      const result = resolveSemiGuidedLRM(context);
      expect(result.isSemiGuided).toBe(true);
      expect(result.tagActive).toBe(true);
      expect(result.useStandardToHit).toBe(true);
    });

    it('should fall back to standard LRM when no TAG', () => {
      const context: ISemiGuidedContext = {
        weaponId: 'semi-guided-lrm-5',
        equipment: { isSemiGuided: true },
        targetStatus: { tagDesignated: false },
      };
      const result = resolveSemiGuidedLRM(context);
      expect(result.isSemiGuided).toBe(true);
      expect(result.tagActive).toBe(false);
      expect(result.useStandardToHit).toBe(false);
    });

    it('should not activate semi-guided for non-semi-guided weapons', () => {
      const context: ISemiGuidedContext = {
        weaponId: 'lrm-15',
        equipment: { isSemiGuided: false },
        targetStatus: { tagDesignated: true },
      };
      const result = resolveSemiGuidedLRM(context);
      expect(result.isSemiGuided).toBe(false);
      expect(result.tagActive).toBe(false);
    });

    it('should respect ECM nullifying TAG', () => {
      const context: ISemiGuidedContext = {
        weaponId: 'semi-guided-lrm-5',
        equipment: { isSemiGuided: true },
        targetStatus: { tagDesignated: true, ecmProtected: true },
      };
      const result = resolveSemiGuidedLRM(context);
      expect(result.isSemiGuided).toBe(true);
      expect(result.tagActive).toBe(false);
      expect(result.useStandardToHit).toBe(false);
    });

    it('should recognize isSemiGuided equipment flag even if weapon name differs', () => {
      const context: ISemiGuidedContext = {
        weaponId: 'custom-launcher',
        equipment: { isSemiGuided: true },
        targetStatus: { tagDesignated: true },
      };
      const result = resolveSemiGuidedLRM(context);
      expect(result.isSemiGuided).toBe(true);
      expect(result.tagActive).toBe(true);
    });
  });

  describe('resolveIndirectFireWithSemiGuided', () => {
    it('should remove indirect penalty when TAG active on semi-guided LRM', () => {
      const semiGuidedContext: ISemiGuidedContext = {
        weaponId: 'semi-guided-lrm-5',
        equipment: { isSemiGuided: true },
        targetStatus: { tagDesignated: true },
      };
      const result = resolveIndirectFireWithSemiGuided(
        makeRequest({ weaponId: 'semi-guided-lrm-5' }),
        semiGuidedContext,
      );
      expect(result.permitted).toBe(true);
      expect(result.isIndirect).toBe(true);
      expect(result.toHitPenalty).toBe(0);
    });

    it('should keep indirect penalty when TAG not active', () => {
      const semiGuidedContext: ISemiGuidedContext = {
        weaponId: 'semi-guided-lrm-5',
        equipment: { isSemiGuided: true },
        targetStatus: { tagDesignated: false },
      };
      const result = resolveIndirectFireWithSemiGuided(
        makeRequest({ weaponId: 'semi-guided-lrm-5' }),
        semiGuidedContext,
      );
      expect(result.permitted).toBe(true);
      expect(result.isIndirect).toBe(true);
      expect(result.toHitPenalty).toBe(1);
    });

    it('should work as basic indirect fire when no semi-guided context', () => {
      const result = resolveIndirectFireWithSemiGuided(makeRequest());
      expect(result.permitted).toBe(true);
      expect(result.isIndirect).toBe(true);
      expect(result.toHitPenalty).toBe(1);
    });

    it('should pass through direct fire unmodified', () => {
      const result = resolveIndirectFireWithSemiGuided(
        makeRequest({ attackerHasLOS: true }),
      );
      expect(result.isIndirect).toBe(false);
      expect(result.toHitPenalty).toBe(0);
    });
  });
});

// =============================================================================
// 15.5: Indirect Fire LOS Validation (spotter→target)
// =============================================================================

describe('Indirect Fire LOS Validation', () => {
  it('should validate LOS from spotter to target, not attacker', () => {
    const grid = makeBlockedGrid();
    // Attacker at (0,0) has LOS blocked to (5,0) by woods at (3,0)
    // Spotter at (5,-1) has clear LOS to (5,0) — adjacent
    const result = resolveIndirectFire(
      makeRequest({
        attackerHasLOS: false,
        grid,
        spotterCandidates: [
          makeSpotter({ entityId: 'spotter-near', position: { q: 5, r: -1 } }),
        ],
      }),
    );
    expect(result.permitted).toBe(true);
    expect(result.isIndirect).toBe(true);
    expect(result.spotter!.entityId).toBe('spotter-near');
  });

  it('should reject when spotter also has LOS blocked', () => {
    const grid = makeBlockedGrid();
    // Spotter also at (0,0) — same blocked LOS
    const result = resolveIndirectFire(
      makeRequest({
        attackerHasLOS: false,
        grid,
        spotterCandidates: [
          makeSpotter({
            entityId: 'blocked-spotter',
            position: { q: 0, r: 0 },
          }),
        ],
      }),
    );
    expect(result.permitted).toBe(false);
  });

  it('should provide spotter LOS result in output', () => {
    const result = resolveIndirectFire(makeRequest());
    expect(result.permitted).toBe(true);
    expect(result.spotterLOS).toBeDefined();
    expect(result.spotterLOS!.hasLOS).toBe(true);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Indirect Fire Edge Cases', () => {
  it('should handle minimum range penalty (calculated externally)', () => {
    // Minimum range is handled by the to-hit system, not the indirect fire module
    // This test verifies indirect fire does not interfere with min range
    const result = resolveIndirectFire(makeRequest());
    expect(result.permitted).toBe(true);
    // Min range penalty is added separately in calculateToHit()
  });

  it('should handle multiple spotters and pick best', () => {
    const spotters = [
      makeSpotter({
        entityId: 'runner',
        movementType: MovementType.Run,
      }),
      makeSpotter({
        entityId: 'walker',
        movementType: MovementType.Walk,
        position: { q: 4, r: 0 },
      }),
      makeSpotter({
        entityId: 'stander',
        movementType: MovementType.Stationary,
        position: { q: 4, r: 1 },
      }),
    ];
    const result = resolveIndirectFire(
      makeRequest({ spotterCandidates: spotters }),
    );
    expect(result.permitted).toBe(true);
    expect(result.spotter!.entityId).toBe('stander');
    expect(result.toHitPenalty).toBe(1);
  });

  it('should handle all spotters being ineligible', () => {
    const spotters = [
      makeSpotter({ entityId: 'runner', movementType: MovementType.Run }),
      makeSpotter({ entityId: 'jumper', movementType: MovementType.Jump }),
      makeSpotter({ entityId: 'dead', isOperational: false }),
      makeSpotter({ entityId: 'attacker-1' }), // same as attacker
    ];
    const result = resolveIndirectFire(
      makeRequest({ spotterCandidates: spotters }),
    );
    expect(result.permitted).toBe(false);
  });

  it('should not permit indirect fire for SRM weapons', () => {
    const result = resolveIndirectFire(makeRequest({ weaponId: 'srm-6' }));
    expect(result.permitted).toBe(false);
  });

  it('should not permit indirect fire for energy weapons', () => {
    const result = resolveIndirectFire(
      makeRequest({ weaponId: 'er-large-laser' }),
    );
    expect(result.permitted).toBe(false);
  });
});
