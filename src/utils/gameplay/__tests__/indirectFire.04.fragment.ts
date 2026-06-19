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
