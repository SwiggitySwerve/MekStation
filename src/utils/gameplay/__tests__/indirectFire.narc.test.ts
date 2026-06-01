/**
 * Tests for NARC/iNarc spotter override (§3)
 *
 * Covers the "NARC / iNarc Spotter Override" requirement from the
 * add-indirect-fire-and-spotter-network spec:
 *   - No-LOS + no spotter + NARC-marked by attacker's team → permitted, basis='narc'
 *   - No-LOS + no spotter + iNarc-marked by attacker's team → permitted, basis='inarc'
 *   - NARC-marked by ENEMY team → rejected (falls through to spotter; none → reject)
 *   - No-LOS + valid LOS spotter + NARC-marked → NARC wins (basis='narc')
 *   - LOS on attacker + NARC-marked → direct-fire pass-through (no indirect)
 *   - Both NARC and iNarc true → NARC wins (basis='narc')
 *   - Neither flag set (undefined) → backward-compat: no override, rejected
 *
 * @spec openspec/changes/add-indirect-fire-and-spotter-network/specs/indirect-fire-system/spec.md §3
 */

import { MovementType } from '@/types/gameplay';
import { IHex, IHexGrid } from '@/types/gameplay/HexGridInterfaces';
import { TerrainType } from '@/types/gameplay/TerrainTypes';

import {
  resolveIndirectFire,
  IIndirectFireRequest,
  ISpotterCandidate,
} from '../indirectFire';

// =============================================================================
// Fixtures
// =============================================================================

function makeHex(q: number, r: number, terrain = 'clear', elevation = 0): IHex {
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

/** Grid with cumulative woods blocking attacker LOS from (0,0) to (5,0). */
function makeBlockedGrid(): IHexGrid {
  const grid = makeClearGrid();
  grid.hexes.set('2,0', makeHex(2, 0, TerrainType.HeavyWoods));
  grid.hexes.set('3,0', makeHex(3, 0, TerrainType.LightWoods));
  return grid;
}

function makeSpotter(
  overrides: Partial<ISpotterCandidate> = {},
): ISpotterCandidate {
  return {
    entityId: 'spotter-1',
    teamId: 'team-A',
    // Position (5,1) is off-axis — it has clear LOS to (5,0) but is NOT on the
    // blocked (0,0)→(5,0) line, so it can serve as a valid LOS spotter.
    position: { q: 5, r: 1 },
    movementType: MovementType.Stationary,
    isOperational: true,
    ...overrides,
  };
}

/** Build a base request with no LOS and no spotters by default. */
function makeNoLosNoSpotterRequest(
  overrides: Partial<IIndirectFireRequest> = {},
): IIndirectFireRequest {
  return {
    attackerEntityId: 'attacker-1',
    attackerTeamId: 'team-A',
    attackerPosition: { q: 0, r: 0 },
    targetPosition: { q: 5, r: 0 },
    weaponId: 'lrm-15',
    attackerHasLOS: false,
    spotterCandidates: [],
    grid: makeBlockedGrid(),
    ...overrides,
  };
}

// =============================================================================
// §3.1 — NARC-marked target (attacker's team)
// =============================================================================

describe('NARC spotter override', () => {
  it('permits indirect fire when target is NARC-marked by attacker team and no LOS spotter exists', () => {
    const result = resolveIndirectFire(
      makeNoLosNoSpotterRequest({ targetNarcMarkedByTeam: true }),
    );

    expect(result.permitted).toBe(true);
    expect(result.isIndirect).toBe(true);
    expect(result.basis).toBe('narc');
    // No human spotter elected — spotterId is absent on the helper result.
    expect(result.spotter).toBeUndefined();
    // Base +1 only — no spotter-walked add since there is no spotter.
    expect(result.toHitPenalty).toBe(1);
    expect(result.spotterWalked).toBe(false);
  });

  it('rejects when NARC mark is by enemy team (flag not set for attacker team)', () => {
    // Simulate an enemy team's NARC mark: the flag for the attacker's team is false.
    const result = resolveIndirectFire(
      makeNoLosNoSpotterRequest({ targetNarcMarkedByTeam: false }),
    );

    expect(result.permitted).toBe(false);
    expect(result.basis).toBeUndefined();
  });

  it('rejects when NARC flag is undefined (backward-compat — no override applied)', () => {
    // Existing call sites omit the flag → no NARC override, no spotter → rejected.
    const result = resolveIndirectFire(makeNoLosNoSpotterRequest());

    expect(result.permitted).toBe(false);
  });
});

// =============================================================================
// §3.2 — iNarc-marked target (attacker's team)
// =============================================================================

describe('iNarc spotter override', () => {
  it('permits indirect fire when target is iNarc-marked by attacker team and no LOS spotter exists', () => {
    const result = resolveIndirectFire(
      makeNoLosNoSpotterRequest({ targetINarcMarkedByTeam: true }),
    );

    expect(result.permitted).toBe(true);
    expect(result.isIndirect).toBe(true);
    expect(result.basis).toBe('inarc');
    expect(result.spotter).toBeUndefined();
    expect(result.toHitPenalty).toBe(1);
    expect(result.spotterWalked).toBe(false);
  });

  it('rejects when iNarc flag is false', () => {
    const result = resolveIndirectFire(
      makeNoLosNoSpotterRequest({ targetINarcMarkedByTeam: false }),
    );

    expect(result.permitted).toBe(false);
  });
});

// =============================================================================
// §3.3 — NARC precedence over iNarc when both are true
// =============================================================================

describe('NARC vs iNarc precedence', () => {
  it('returns basis="narc" when both NARC and iNarc are true (NARC wins)', () => {
    const result = resolveIndirectFire(
      makeNoLosNoSpotterRequest({
        targetNarcMarkedByTeam: true,
        targetINarcMarkedByTeam: true,
      }),
    );

    expect(result.permitted).toBe(true);
    expect(result.basis).toBe('narc');
    expect(result.toHitPenalty).toBe(1);
  });
});

// =============================================================================
// §3.4 — NARC/iNarc beacon takes precedence over LOS spotters
// =============================================================================

describe('NARC override preference over LOS spotters', () => {
  it('uses NARC beacon (basis="narc") even when a LOS spotter is available', () => {
    // Spotter at (5,1) has clear LOS to target at (5,0) despite woods at (3,0).
    const result = resolveIndirectFire(
      makeNoLosNoSpotterRequest({
        targetNarcMarkedByTeam: true,
        spotterCandidates: [makeSpotter()],
        grid: makeBlockedGrid(),
      }),
    );

    expect(result.permitted).toBe(true);
    expect(result.basis).toBe('narc');
    // NARC beacon path is a no-unit spotter override with the base penalty only.
    expect(result.toHitPenalty).toBe(1);
    expect(result.spotter).toBeUndefined();
  });

  it('uses iNarc beacon (basis="inarc") even when a LOS spotter is available', () => {
    const result = resolveIndirectFire(
      makeNoLosNoSpotterRequest({
        targetINarcMarkedByTeam: true,
        spotterCandidates: [makeSpotter()],
        grid: makeBlockedGrid(),
      }),
    );

    expect(result.basis).toBe('inarc');
    expect(result.permitted).toBe(true);
    expect(result.spotter).toBeUndefined();
  });
});

// =============================================================================
// §3.5 — Attacker has LOS → direct-fire pass-through, NARC irrelevant
// =============================================================================

describe('direct-fire pass-through ignores NARC', () => {
  it('returns isIndirect=false when attacker has LOS, regardless of NARC mark', () => {
    const result = resolveIndirectFire({
      attackerEntityId: 'attacker-1',
      attackerTeamId: 'team-A',
      attackerPosition: { q: 0, r: 0 },
      targetPosition: { q: 5, r: 0 },
      weaponId: 'lrm-15',
      attackerHasLOS: true,
      spotterCandidates: [],
      grid: makeClearGrid(),
      targetNarcMarkedByTeam: true,
      targetINarcMarkedByTeam: true,
    });

    expect(result.permitted).toBe(true);
    expect(result.isIndirect).toBe(false);
    expect(result.toHitPenalty).toBe(0);
    // basis is absent for direct-fire results.
    expect(result.basis).toBeUndefined();
  });
});
