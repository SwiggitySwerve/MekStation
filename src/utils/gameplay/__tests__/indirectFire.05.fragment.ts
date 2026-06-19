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
