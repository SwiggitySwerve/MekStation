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
      expect(semiGuidedTagIndirectFireBlockedReason(context)).toBeUndefined();
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
      expect(result.description).toBe(
        ECM_NULLIFIED_TAG_INDIRECT_FIRE_BLOCKED_REASON,
      );
      expect(semiGuidedTagIndirectFireBlockedReason(context)).toBe(
        ECM_NULLIFIED_TAG_INDIRECT_FIRE_BLOCKED_REASON,
      );
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
    it('should reduce the base indirect penalty when TAG active on semi-guided LRM', () => {
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

    // Audit C-6: MegaMek ComputeToHit.java L1524-1535 — semi-guided ammo at a
    // TAG-designated target takes -1 (cancelling the +1 indirect base) AND the
    // spotter movement/attacked branch is the else-if, skipped entirely. Net
    // indirect contribution is 0 regardless of spotter state — NOT the
    // composed total minus 1 that the pre-fix code produced.
    it('skips spotter movement modifiers entirely when TAG is active (net 0 with a moved spotter)', () => {
      const semiGuidedContext: ISemiGuidedContext = {
        weaponId: 'semi-guided-lrm-5',
        equipment: { isSemiGuided: true },
        targetStatus: { tagDesignated: true },
      };
      const result = resolveIndirectFireWithSemiGuided(
        makeRequest({
          weaponId: 'semi-guided-lrm-5',
          spotterCandidates: [makeSpotter({ movementType: MovementType.Walk })],
        }),
        semiGuidedContext,
      );

      expect(result.permitted).toBe(true);
      expect(result.isIndirect).toBe(true);
      expect(result.toHitPenalty).toBe(0);
      expect(result.spotterWalked).toBe(true);
    });

    it('skips the spotter-attacked modifier when TAG is active (net 0 with a moved, attacking spotter)', () => {
      // Audit C-6: same else-if skip covers the +1 spotter-attacking modifier.
      const semiGuidedContext: ISemiGuidedContext = {
        weaponId: 'semi-guided-lrm-5',
        equipment: { isSemiGuided: true },
        targetStatus: { tagDesignated: true },
      };
      const result = resolveIndirectFireWithSemiGuided(
        makeRequest({
          weaponId: 'semi-guided-lrm-5',
          spotterCandidates: [
            makeSpotter({
              movementType: MovementType.Walk,
              attackedThisTurn: true,
            }),
          ],
        }),
        semiGuidedContext,
      );

      expect(result.permitted).toBe(true);
      expect(result.isIndirect).toBe(true);
      expect(result.toHitPenalty).toBe(0);
    });

    it('should permit semi-guided TAG indirect fire when no LOS spotter is available', () => {
      const semiGuidedContext: ISemiGuidedContext = {
        weaponId: 'semi-guided-lrm-5',
        equipment: { isSemiGuided: true },
        targetStatus: { tagDesignated: true },
      };
      const result = resolveIndirectFireWithSemiGuided(
        makeRequest({
          weaponId: 'semi-guided-lrm-5',
          spotterCandidates: [],
        }),
        semiGuidedContext,
      );
      expect(result.permitted).toBe(true);
      expect(result.isIndirect).toBe(true);
      expect(result.basis).toBe('semi-guided-tag');
      expect(result.spotter).toBeUndefined();
      expect(result.toHitPenalty).toBe(0);
    });

    it('should reject semi-guided TAG when ECM nullifies the designation and no spotter is available', () => {
      const semiGuidedContext: ISemiGuidedContext = {
        weaponId: 'semi-guided-lrm-5',
        equipment: { isSemiGuided: true },
        targetStatus: { tagDesignated: true, ecmProtected: true },
      };
      const result = resolveIndirectFireWithSemiGuided(
        makeRequest({
          weaponId: 'semi-guided-lrm-5',
          spotterCandidates: [],
        }),
        semiGuidedContext,
      );
      expect(result.permitted).toBe(false);
      expect(result.isIndirect).toBe(false);
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
      makeSpotter({ entityId: 'enemy', teamId: 'team-B' }),
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

// =============================================================================
// LOS Spotter Modifier Parity (audit C-5 — MegaMek ComputeToHit.java)
//
// Per MegaMek ComputeToHit.java L1512-1545 the LRM indirect-fire to-hit is:
//   +1 base indirect (L1513-1514), -1 Oblique Attacker SPA (L1516-1518),
//   spotter movement modifier via Compute.getSpotterMovementModifier
//   (Compute.java L2702-2726: walk +1 / run +2 / jump +3, infantry 0),
//   and +1 when the spotter is attacking this turn (L1540-1544,
//   Entity.isAttackingThisTurn — Entity.java L10445-10453).
//
// There is NO spotter-gunnery term. The (gunnery-4)/2 modifier the pre-fix
// code applied lives only in ArtilleryWeaponIndirectFireHandler.java —
// an artillery-only rule the original PR-K9 comment mis-cited (audit C-5).
// =============================================================================

describe('LOS Spotter Modifier Parity (C-5)', () => {
  it('stationary spotter: base +1 only, no spotter-skill term', () => {
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
    expect(result.spotterAttackedThisTurn).toBe(false);
  });

  it('spotter pilot data carries no gunnery term — elite or poor pilots leave the penalty unchanged', () => {
    // Audit C-5: the (gunnery-4)/2 term is artillery-only. A legacy caller
    // still passing the removed spotterGunnery field must not change the
    // penalty (the resolver no longer reads it). The cast simulates a stale
    // pre-fix candidate shape.
    for (const legacyGunnery of [2, 6]) {
      const legacyCandidate = {
        ...makeSpotter({ movementType: MovementType.Stationary }),
        spotterGunnery: legacyGunnery,
      } as ISpotterCandidate;
      const result = resolveIndirectFire(
        makeRequest({ spotterCandidates: [legacyCandidate] }),
      );
      expect(result.permitted).toBe(true);
      expect(result.toHitPenalty).toBe(1);
    }
  });

  it('walked spotter: base +1 plus walk +1 -> penalty=2', () => {
    const result = resolveIndirectFire(
      makeRequest({
        spotterCandidates: [makeSpotter({ movementType: MovementType.Walk })],
      }),
    );
    expect(result.permitted).toBe(true);
    expect(result.spotterWalked).toBe(true);
    expect(result.toHitPenalty).toBe(2);
  });

  it('spotter attacking this turn: base +1 plus attack +1 -> penalty=2', () => {
    // ComputeToHit.java L1540-1544: +1 when spotter.isAttackingThisTurn().
    const result = resolveIndirectFire(
      makeRequest({
        spotterCandidates: [
          makeSpotter({
            movementType: MovementType.Stationary,
            attackedThisTurn: true,
          }),
        ],
      }),
    );
    expect(result.permitted).toBe(true);
    expect(result.toHitPenalty).toBe(2);
    expect(result.spotterAttackedThisTurn).toBe(true);
  });

  it('walked + attacking spotter: base +1, walk +1, attack +1 -> penalty=3', () => {
    const result = resolveIndirectFire(
      makeRequest({
        spotterCandidates: [
          makeSpotter({
            movementType: MovementType.Walk,
            attackedThisTurn: true,
          }),
        ],
      }),
    );
    expect(result.permitted).toBe(true);
    expect(result.spotterWalked).toBe(true);
    expect(result.toHitPenalty).toBe(3);
    expect(result.spotterAttackedThisTurn).toBe(true);
  });

  it('Forward Observer cancels the walk +1 but not the spotter-attacked +1', () => {
    // FO SPA cancels only the represented walked-spotter movement add.
    // Base=1, walk cancelled, attack +1 -> total=2.
    const result = resolveIndirectFire(
      makeRequest({
        spotterCandidates: [
          makeSpotter({
            movementType: MovementType.Walk,
            attackedThisTurn: true,
            pilotSpas: ['forward_observer'],
          }),
        ],
      }),
    );
    expect(result.permitted).toBe(true);
    expect(result.spotterWalked).toBe(true);
    expect(result.forwardObserverApplied).toBe(true);
    expect(result.toHitPenalty).toBe(2);
  });

  it.each([
    ['comm_implant', 0],
    ['boost_comm_implant', 0],
  ] as const)(
    '%s spotter reduces the base indirect LRM spotter penalty by 1',
    (pilotSpa, expectedPenalty) => {
      const result = resolveIndirectFire(
        makeRequest({
          spotterCandidates: [
            makeSpotter({
              movementType: MovementType.Stationary,
              pilotSpas: [pilotSpa],
            }),
          ],
        }),
      );
      expect(result.permitted).toBe(true);
      expect(result.toHitPenalty).toBe(expectedPenalty);
      expect(result.commImplantApplied).toBe(true);
      expect(result.commImplantPenaltyRelief).toBe(1);
    },
  );

  it('comm implant relief stacks with movement and attack penalties without cancelling them', () => {
    const result = resolveIndirectFire(
      makeRequest({
        spotterCandidates: [
          makeSpotter({
            movementType: MovementType.Walk,
            attackedThisTurn: true,
            pilotSpas: ['boost_comm_implant'],
          }),
        ],
      }),
    );
    expect(result.permitted).toBe(true);
    expect(result.spotterWalked).toBe(true);
    expect(result.spotterAttackedThisTurn).toBe(true);
    expect(result.commImplantApplied).toBe(true);
    expect(result.toHitPenalty).toBe(2);
  });

  it('NARC-only path: no LOS spotter elected -> base penalty only', () => {
    const result = resolveIndirectFire(
      makeRequest({
        spotterCandidates: [],
        targetNarcMarkedByTeam: true,
      }),
    );
    expect(result.permitted).toBe(true);
    expect(result.basis).toBe('narc');
    expect(result.toHitPenalty).toBe(1);
  });
});
