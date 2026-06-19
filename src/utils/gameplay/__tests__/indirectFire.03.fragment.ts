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
