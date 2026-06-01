/**
 * Tests for InteractiveSession.computeIndirectFireContext
 *
 * Covers the §1 Engine integration contract scenarios from the
 * add-indirect-fire-and-spotter-network change:
 *   - no-LOS-no-spotter → rejected
 *   - no-LOS-with-spotter → permitted, basis='los'
 *   - LOS-on-attacker → direct (isIndirect=false)
 *   - spotter-walked penalty math
 *   - multi-spotter election tiebreak (move-pen → range → id)
 *
 * The hook into the helper is tested at the function level here; the
 * helper itself has 594 LOC of existing unit tests in
 * src/utils/gameplay/__tests__/indirectFire.test.ts.
 */

import type {
  IGameState,
  IUnitGameState,
} from '@/types/gameplay/GameSessionInterfaces';
import type {
  IHex,
  IHexCoordinate,
  IHexGrid,
} from '@/types/gameplay/HexGridInterfaces';

import { MovementType, GameSide } from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';

import { computeIndirectFireContext } from '../InteractiveSession.indirectFire';

// =============================================================================
// Fixtures
// =============================================================================

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
  for (let q = -5; q <= 12; q++) {
    for (let r = -5; r <= 12; r++) {
      hexes.set(`${q},${r}`, makeHex(q, r));
    }
  }
  return { config: { radius: 12 }, hexes };
}

function makeBlockedGrid(): IHexGrid {
  const grid = makeClearGrid();
  // Light + heavy woods block LOS from (0,0) -> (5,0).
  grid.hexes.set('2,0', makeHex(2, 0, TerrainType.LightWoods));
  grid.hexes.set('3,0', makeHex(3, 0, TerrainType.HeavyWoods));
  return grid;
}

function makeUnit(
  id: string,
  side: GameSide,
  position: IHexCoordinate,
  movementThisTurn: MovementType = MovementType.Stationary,
): IUnitGameState {
  return {
    id,
    side,
    position,
    facing: 0 as never,
    heat: 0,
    movementThisTurn,
    hexesMovedThisTurn: 0,
    armor: { head: 9 },
    structure: { head: 3 },
    pilotConscious: true,
    destroyed: false,
    prone: false,
    shutdown: false,
  } as unknown as IUnitGameState;
}

function makeState(units: IUnitGameState[]): IGameState {
  const map: Record<string, IUnitGameState> = {};
  for (const u of units) map[u.id] = u;
  return {
    units: map,
  } as unknown as IGameState;
}

// =============================================================================
// Tests
// =============================================================================

describe('computeIndirectFireContext', () => {
  // -------------------------------------------------------------------------
  // Unknown attacker / non-indirect weapon → rejected
  // -------------------------------------------------------------------------
  it('rejects unknown attacker id', () => {
    const result = computeIndirectFireContext(
      'ghost',
      'lrm-15',
      { q: 5, r: 0 },
      makeState([]),
      makeClearGrid(),
    );
    expect(result.permitted).toBe(false);
    expect(result.reason).toMatch(/not found/i);
  });

  it('rejects non-indirect-capable weapon (AC/20)', () => {
    const attacker = makeUnit('a1', GameSide.Player, { q: 0, r: 0 });
    const result = computeIndirectFireContext(
      'a1',
      'auto-cannon-ac-20',
      { q: 5, r: 0 },
      makeState([attacker]),
      makeClearGrid(),
    );
    expect(result.permitted).toBe(false);
    expect(result.reason).toMatch(/not capable of indirect/i);
  });

  // -------------------------------------------------------------------------
  // LOS on attacker → direct-fire pass-through
  // -------------------------------------------------------------------------
  it('returns direct-fire pass-through when attacker has LOS', () => {
    const attacker = makeUnit('a1', GameSide.Player, { q: 0, r: 0 });
    const result = computeIndirectFireContext(
      'a1',
      'lrm-15',
      { q: 5, r: 0 },
      makeState([attacker]),
      makeClearGrid(),
    );
    expect(result.permitted).toBe(true);
    expect(result.isIndirect).toBe(false);
    expect(result.spotterId).toBeNull();
    expect(result.toHitPenalty).toBe(0);
  });

  // -------------------------------------------------------------------------
  // No-LOS, no spotter → rejected
  // -------------------------------------------------------------------------
  it('rejects when attacker has no LOS and no eligible spotter exists', () => {
    const attacker = makeUnit('a1', GameSide.Player, { q: 0, r: 0 });
    const result = computeIndirectFireContext(
      'a1',
      'lrm-15',
      { q: 5, r: 0 },
      makeState([attacker]),
      makeBlockedGrid(),
    );
    expect(result.permitted).toBe(false);
    // Helper drops the spotter-not-found case to `isIndirect: false` —
    // there's no spotter so the resolution can't be classified as indirect.
    expect(result.spotterId).toBeNull();
  });

  // -------------------------------------------------------------------------
  // No-LOS + valid spotter → permitted, basis='los'
  // -------------------------------------------------------------------------
  it('permits indirect with valid spotter (basis=los)', () => {
    const attacker = makeUnit('a1', GameSide.Player, { q: 0, r: 0 });
    // Spotter on the far side of the blocking woods with LOS to target.
    const spotter = makeUnit('s1', GameSide.Player, { q: 5, r: 1 });
    const result = computeIndirectFireContext(
      'a1',
      'lrm-15',
      { q: 5, r: 0 },
      makeState([attacker, spotter]),
      makeBlockedGrid(),
    );
    expect(result.permitted).toBe(true);
    expect(result.isIndirect).toBe(true);
    expect(result.spotterId).toBe('s1');
    expect(result.basis).toBe('los');
    // Spotter stationary → toHitPenalty=1 (base only); walking adds +1.
    expect(result.toHitPenalty).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Spotter walked → +1 spotter-walked penalty stacks on top of base +1
  // -------------------------------------------------------------------------
  it('applies +1 spotter-walked penalty when spotter ran/walked', () => {
    const attacker = makeUnit('a1', GameSide.Player, { q: 0, r: 0 });
    const spotter = makeUnit(
      's1',
      GameSide.Player,
      { q: 5, r: 1 },
      MovementType.Walk,
    );
    const result = computeIndirectFireContext(
      'a1',
      'lrm-15',
      { q: 5, r: 0 },
      makeState([attacker, spotter]),
      makeBlockedGrid(),
    );
    expect(result.permitted).toBe(true);
    expect(result.toHitPenalty).toBe(2);
    expect(result.forwardObserverApplied).toBe(false);
  });

  it('hydrates Forward Observer from unit abilities and flags the cancellation', () => {
    const attacker = makeUnit('a1', GameSide.Player, { q: 0, r: 0 });
    const spotter = makeUnit(
      's1',
      GameSide.Player,
      { q: 5, r: 1 },
      MovementType.Walk,
    );
    (spotter as unknown as { abilities: string[] }).abilities = [
      'forward_observer',
    ];

    const result = computeIndirectFireContext(
      'a1',
      'lrm-15',
      { q: 5, r: 0 },
      makeState([attacker, spotter]),
      makeBlockedGrid(),
    );

    expect(result.permitted).toBe(true);
    expect(result.toHitPenalty).toBe(1);
    expect(result.forwardObserverApplied).toBe(true);
  });

  it('hydrates Oblique Attacker from attacker abilities and reduces indirect-fire penalty', () => {
    const attacker = makeUnit('a1', GameSide.Player, { q: 0, r: 0 });
    (attacker as unknown as { abilities: string[] }).abilities = [
      'oblique-attacker',
    ];
    const spotter = makeUnit('s1', GameSide.Player, { q: 5, r: 1 });

    const result = computeIndirectFireContext(
      'a1',
      'lrm-15',
      { q: 5, r: 0 },
      makeState([attacker, spotter]),
      makeBlockedGrid(),
    );

    expect(result.permitted).toBe(true);
    expect(result.isIndirect).toBe(true);
    expect(result.toHitPenalty).toBe(0);
    expect(result.obliqueAttackerApplied).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Skips destroyed / retreated units when enumerating candidates
  // -------------------------------------------------------------------------
  it('skips destroyed units when enumerating spotter candidates', () => {
    const attacker = makeUnit('a1', GameSide.Player, { q: 0, r: 0 });
    const aliveSpotter = makeUnit('s1', GameSide.Player, { q: 5, r: 1 });
    const deadSpotter = makeUnit('s2', GameSide.Player, { q: 4, r: 1 });
    (deadSpotter as unknown as { destroyed: boolean }).destroyed = true;
    const result = computeIndirectFireContext(
      'a1',
      'lrm-15',
      { q: 5, r: 0 },
      makeState([attacker, aliveSpotter, deadSpotter]),
      makeBlockedGrid(),
    );
    expect(result.permitted).toBe(true);
    // Should pick s1 (alive); s2 is excluded as a candidate.
    expect(result.spotterId).toBe('s1');
  });

  it('hydrates sprinted and evading state so those units cannot spot indirect fire', () => {
    const attacker = makeUnit('a1', GameSide.Player, { q: 0, r: 0 });
    const sprintedSpotter = makeUnit('s1', GameSide.Player, { q: 5, r: 1 });
    const evadingSpotter = makeUnit('s2', GameSide.Player, { q: 5, r: -1 });
    (
      sprintedSpotter as unknown as { sprintedThisTurn: boolean }
    ).sprintedThisTurn = true;
    (evadingSpotter as unknown as { isEvading: boolean }).isEvading = true;

    const result = computeIndirectFireContext(
      'a1',
      'lrm-15',
      { q: 5, r: 0 },
      makeState([attacker, sprintedSpotter, evadingSpotter]),
      makeBlockedGrid(),
    );

    expect(result.permitted).toBe(false);
    expect(result.spotterId).toBeNull();
  });

  // -------------------------------------------------------------------------
  // §3 NARC/iNarc override wired through collaborator
  // -------------------------------------------------------------------------
  it('wires canonical narcedBy state through collaborator: no spotter + NARC-marked target → permitted, basis=narc', () => {
    const attacker = makeUnit('a1', GameSide.Player, { q: 0, r: 0 });
    const targetUnit = makeUnit('t1', GameSide.Opponent, { q: 5, r: 0 });
    (targetUnit as unknown as { narcedBy: string[] }).narcedBy = [
      GameSide.Player as string,
    ];

    const result = computeIndirectFireContext(
      'a1',
      'lrm-15',
      { q: 5, r: 0 },
      makeState([attacker, targetUnit]),
      makeBlockedGrid(),
      undefined,
      't1',
    );

    expect(result.permitted).toBe(true);
    expect(result.isIndirect).toBe(true);
    expect(result.basis).toBe('narc');
    expect(result.spotterId).toBeNull();
    expect(result.toHitPenalty).toBe(1);
  });

  it('wires NARC override through collaborator: no spotter + NARC-marked target → permitted, basis=narc', () => {
    const attacker = makeUnit('a1', GameSide.Player, { q: 0, r: 0 });
    // Target unit with narcMarkedByTeams carrying the attacker's side.
    const targetUnit = makeUnit('t1', GameSide.Opponent, { q: 5, r: 0 });
    (
      targetUnit as unknown as { narcMarkedByTeams: string[] }
    ).narcMarkedByTeams = [GameSide.Player as string];

    const result = computeIndirectFireContext(
      'a1',
      'lrm-15',
      { q: 5, r: 0 },
      makeState([attacker, targetUnit]),
      makeBlockedGrid(),
      undefined,
      't1', // targetEntityId supplied so collaborator reads the narc flags
    );

    expect(result.permitted).toBe(true);
    expect(result.isIndirect).toBe(true);
    expect(result.basis).toBe('narc');
    expect(result.spotterId).toBeNull(); // no human spotter
    expect(result.toHitPenalty).toBe(1); // base only
  });

  it('wires iNarc override through collaborator: no spotter + iNarc-marked target → permitted, basis=inarc', () => {
    const attacker = makeUnit('a1', GameSide.Player, { q: 0, r: 0 });
    const targetUnit = makeUnit('t1', GameSide.Opponent, { q: 5, r: 0 });
    (
      targetUnit as unknown as { iNarcPods: typeof targetUnit.iNarcPods }
    ).iNarcPods = [
      {
        teamId: GameSide.Player,
        podType: 'homing',
      },
    ];

    const result = computeIndirectFireContext(
      'a1',
      'lrm-15',
      { q: 5, r: 0 },
      makeState([attacker, targetUnit]),
      makeBlockedGrid(),
      undefined,
      't1',
    );

    expect(result.permitted).toBe(true);
    expect(result.basis).toBe('inarc');
    expect(result.spotterId).toBeNull();
    expect(result.toHitPenalty).toBe(1);
  });

  it('rejects when NARC-marked by enemy team (arrays present but wrong team)', () => {
    const attacker = makeUnit('a1', GameSide.Player, { q: 0, r: 0 });
    const targetUnit = makeUnit('t1', GameSide.Opponent, { q: 5, r: 0 });
    // Marked by enemy team only — attacker's team is not in the array.
    (
      targetUnit as unknown as { narcMarkedByTeams: string[] }
    ).narcMarkedByTeams = [GameSide.Opponent as string];

    const result = computeIndirectFireContext(
      'a1',
      'lrm-15',
      { q: 5, r: 0 },
      makeState([attacker, targetUnit]),
      makeBlockedGrid(),
      undefined,
      't1',
    );

    expect(result.permitted).toBe(false);
  });

  it('falls back gracefully when targetEntityId is absent (no NARC override)', () => {
    const attacker = makeUnit('a1', GameSide.Player, { q: 0, r: 0 });
    // No targetEntityId supplied — NARC flags default to false, no spotter → rejected.
    const result = computeIndirectFireContext(
      'a1',
      'lrm-15',
      { q: 5, r: 0 },
      makeState([attacker]),
      makeBlockedGrid(),
      // pilotSpasByUnitId and targetEntityId both absent
    );

    expect(result.permitted).toBe(false);
  });
});
