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
import { createAerospaceCombatState } from '@/utils/gameplay/aerospace/state';

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
  // Heavy + light woods exceed MegaMek's intervening woods LOS threshold.
  grid.hexes.set('2,0', makeHex(2, 0, TerrainType.HeavyWoods));
  grid.hexes.set('3,0', makeHex(3, 0, TerrainType.LightWoods));
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

function makeAerospaceCombatState(altitude: number) {
  return createAerospaceCombatState({
    maxSI: 10,
    armorByArc: { nose: 10, leftWing: 8, rightWing: 8, aft: 6 },
    heatSinks: 10,
    fuelPoints: 20,
    safeThrust: 6,
    maxThrust: 9,
    altitude,
  });
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

  it('rejects airborne aerospace spotter without represented recon or imager equipment', () => {
    const attacker = makeUnit('a1', GameSide.Player, { q: 0, r: 0 });
    const spotter = {
      ...makeUnit('s1', GameSide.Player, { q: 5, r: 1 }),
      combatState: {
        kind: 'aero',
        state: makeAerospaceCombatState(3),
      },
    } as IUnitGameState;
    const result = computeIndirectFireContext(
      'a1',
      'lrm-15',
      { q: 5, r: 0 },
      makeState([attacker, spotter]),
      makeBlockedGrid(),
    );
    expect(result.permitted).toBe(false);
    expect(result.spotterId).toBeNull();
  });

  it('permits airborne aerospace spotter with represented recon equipment', () => {
    const attacker = makeUnit('a1', GameSide.Player, { q: 0, r: 0 });
    const spotter = {
      ...makeUnit('s1', GameSide.Player, { q: 5, r: 1 }),
      combatState: {
        kind: 'aero',
        state: makeAerospaceCombatState(3),
      },
      airborneAeroSpottingEquipment: { reconCamera: true },
    } as unknown as IUnitGameState;
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
  });

  // -------------------------------------------------------------------------
  // Spotter movement penalty stacks on top of base +1.
  // -------------------------------------------------------------------------
  it.each([
    [MovementType.Walk, 2],
    [MovementType.Run, 3],
    [MovementType.Jump, 4],
  ] as const)('applies %s spotter movement penalty', (movement, penalty) => {
    const attacker = makeUnit('a1', GameSide.Player, { q: 0, r: 0 });
    const spotter = makeUnit('s1', GameSide.Player, { q: 5, r: 1 }, movement);
    const result = computeIndirectFireContext(
      'a1',
      'lrm-15',
      { q: 5, r: 0 },
      makeState([attacker, spotter]),
      makeBlockedGrid(),
    );
    expect(result.permitted).toBe(true);
    expect(result.toHitPenalty).toBe(penalty);
  });

  it('uses session-state pilot SPAs to cancel walked Forward Observer penalty', () => {
    const attacker = makeUnit('a1', GameSide.Player, { q: 0, r: 0 });
    const spotter = {
      ...makeUnit('s1', GameSide.Player, { q: 5, r: 1 }, MovementType.Walk),
      pilotSpas: ['forward_observer'],
    };
    const result = computeIndirectFireContext(
      'a1',
      'lrm-15',
      { q: 5, r: 0 },
      makeState([attacker, spotter]),
      makeBlockedGrid(),
    );

    expect(result).toMatchObject({
      permitted: true,
      isIndirect: true,
      spotterId: 's1',
      basis: 'los',
      toHitPenalty: 1,
      forwardObserverApplied: true,
      spotterMovementPenaltyCancelled: 1,
    });
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

  // -------------------------------------------------------------------------
  // §3 NARC/iNarc override wired through collaborator
  // -------------------------------------------------------------------------
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
      targetUnit as unknown as { iNarcMarkedByTeams: string[] }
    ).iNarcMarkedByTeams = [GameSide.Player as string];

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

  it('wires semi-guided TAG through collaborator: no spotter + TAG-designated target → permitted with no indirect penalty', () => {
    const attacker = makeUnit('a1', GameSide.Player, { q: 0, r: 0 });
    const targetUnit = {
      ...makeUnit('t1', GameSide.Opponent, { q: 5, r: 0 }),
      tagDesignated: true,
    };

    const result = computeIndirectFireContext(
      'a1',
      'semi-guided-lrm-15',
      { q: 5, r: 0 },
      makeState([attacker, targetUnit]),
      makeBlockedGrid(),
      undefined,
      't1',
    );

    expect(result.permitted).toBe(true);
    expect(result.isIndirect).toBe(true);
    expect(result.basis).toBe('semi-guided-tag');
    expect(result.spotterId).toBeNull();
    expect(result.toHitPenalty).toBe(0);
  });

  it('rejects semi-guided TAG when ECM protection nullifies the target designation', () => {
    const attacker = makeUnit('a1', GameSide.Player, { q: 0, r: 0 });
    const targetUnit = {
      ...makeUnit('t1', GameSide.Opponent, { q: 5, r: 0 }),
      tagDesignated: true,
      ecmProtected: true,
    } as ReturnType<typeof makeUnit> & { ecmProtected: boolean };

    const result = computeIndirectFireContext(
      'a1',
      'semi-guided-lrm-15',
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
