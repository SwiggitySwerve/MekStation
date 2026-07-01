/**
 * Unit tests for the waypoint routing engine (change
 * `tactical-movement-intent-composer`, tasks 2.1–2.3).
 *
 * These prove the D2/D3 engine surface the composer's map interaction sits on:
 *  - 2.1/2.2: cheapest-path leg routing + per-leg / pivot cost, the single-click
 *    fast default, a forced wooded-route waypoint costing MORE than the direct
 *    route, and pop-last restoring the prior state exactly.
 *  - 2.3: Live Intersection — reach shrinks after a posture add (Walk 4/Run 6 →
 *    2/4), and an unaffordable waypoint is unplaceable by construction.
 *
 * Grids + units come from the shared reachable test-helpers so terrain and
 * capability construction matches the rest of the movement suite. All MP values
 * asserted originate from `movement-system` code paths (no UI-local math).
 *
 * Geometry note: the unit starts facing North (`AXIAL_DIRECTION_DELTAS[0]` =
 * {q:0,r:-1}). A leg travelling straight North (toward decreasing `r`) incurs no
 * turning MP, so its cost is pure terrain — used for the clean cost assertions.
 * Legs that change travel direction accrue facing-change MP at the pivot.
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-movement-intent/spec.md
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-map-interface/spec.md
 */

import {
  appendWaypointReducer,
  INITIAL_MOVEMENT_INTENT_STATE,
  popWaypointReducer,
  selectLedgerTotalMp,
} from '@/stores/useGameplayStore.movementIntent';
import {
  Facing,
  MovementType,
  TerrainType,
  type IHexGrid,
  type ILocomotionLeg,
  type IMovementCapability,
  type IUnitGameState,
} from '@/types/gameplay';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { coordToKey } from '@/utils/gameplay/hexMath';
import {
  makeUnitAtOrigin,
  setHex,
} from '@/utils/gameplay/movement/__tests__/reachable.test-helpers';
import {
  isPlaceableWaypoint,
  placeableWaypointHexes,
  reachableEnvelopesByMode,
  remainingMpForMode,
  routeLeg,
  routeLegMemoized,
  routeLegMemoKey,
  type IRouteLegRequest,
} from '@/utils/gameplay/movement/intentRouting';

// Walk 4 / Run 6 / no jump — the spec's Live Intersection scenario budget.
const WALK4_RUN6: IMovementCapability = { walkMP: 4, runMP: 6, jumpMP: 0 };

function clearGrid(radius = 8): IHexGrid {
  return createHexGrid({ radius });
}

/** A destination `n` hexes straight North of the origin (zero turning MP). */
function northHex(n: number): { q: number; r: number } {
  return { q: 0, r: -n };
}

function baseLegRequest(
  grid: IHexGrid,
  overrides: Partial<IRouteLegRequest> = {},
): IRouteLegRequest {
  return {
    unitId: 'u1',
    grid,
    from: { hex: { q: 0, r: 0 }, facing: Facing.North },
    to: northHex(3),
    mode: MovementType.Run,
    capability: WALK4_RUN6,
    currentHeat: 0,
    consumedMp: 0,
    ...overrides,
  };
}

describe('routeLeg — single-click fast default (task 2.2)', () => {
  it('routes the cheapest direct leg from the unit to a reachable hex', () => {
    const grid = clearGrid();
    const leg = routeLeg(baseLegRequest(grid, { to: northHex(3) }));

    expect(leg).not.toBeNull();
    // Path excludes the shared `from` anchor and includes the destination.
    expect(leg!.path[leg!.path.length - 1]).toEqual(northHex(3));
    expect(
      leg!.path.some((h) => coordToKey(h) === coordToKey({ q: 0, r: 0 })),
    ).toBe(false);
    // 3 clear hexes entered at 1 MP each, straight North → no facing change.
    expect(leg!.mpCost).toBe(3);
    expect(leg!.to.facingChange).toBe(0);
  });

  it('returns null when the anchor and destination are the same hex', () => {
    const grid = clearGrid();
    expect(routeLeg(baseLegRequest(grid, { to: { q: 0, r: 0 } }))).toBeNull();
  });

  it('caps the route at remaining MP — an over-budget destination is null', () => {
    const grid = clearGrid();
    // Consume 5 of a Run-6 budget: only 1 MP remains, a 3-hex move cannot fit.
    const leg = routeLeg(
      baseLegRequest(grid, { to: northHex(3), consumedMp: 5 }),
    );
    expect(leg).toBeNull();
  });
});

describe('routeLeg — forced wooded route costs more (task 2.2 spec scenario)', () => {
  it('a heavy-woods waypoint leg costs more than the direct clear route', () => {
    // Direct clear route unit → north(3) is 3 MP. Force a detour: make the
    // second hex north (0,-2) heavy woods (walk +2 → 3 MP to enter), then route
    // via it as an intermediate waypoint at north(2).
    let grid = clearGrid();
    grid = setHex(grid, northHex(2), TerrainType.HeavyWoods);

    const directLeg = routeLeg(
      baseLegRequest(clearGrid(), { to: northHex(3) }),
    );
    // First leg: unit → forest waypoint north(2). Hex north(1) is clear (1 MP),
    // hex north(2) is heavy woods (3 MP) → 4 MP for the leg, all straight North.
    const forestLeg = routeLeg(baseLegRequest(grid, { to: northHex(2) }));

    expect(directLeg!.mpCost).toBe(3);
    expect(forestLeg).not.toBeNull();
    expect(forestLeg!.mpCost).toBe(4); // 1 clear + 3 heavy woods

    // Second leg: forest waypoint north(2) → destination north(3), 1 clear MP.
    const secondLeg = routeLeg(
      baseLegRequest(grid, {
        from: { hex: northHex(2), facing: Facing.North },
        to: northHex(3),
        consumedMp: forestLeg!.mpCost,
      }),
    );
    const woodedTotal = forestLeg!.mpCost + (secondLeg?.mpCost ?? 0);
    // The wooded route (4 + 1 = 5) is strictly costlier than the direct 3 MP —
    // the ledger reflects the deliberate waypoint, not the cheapest path.
    expect(woodedTotal).toBe(5);
    expect(woodedTotal).toBeGreaterThan(directLeg!.mpCost);
  });
});

describe('routeLeg — pop-last restores prior state exactly (task 2.2 spec scenario)', () => {
  it('composing two routed legs then popping the last restores the one-leg state', () => {
    const grid = clearGrid();

    // Leg 1: unit → north(2), 2 clear MP straight North.
    const leg1 = routeLeg(
      baseLegRequest(grid, {
        from: { hex: { q: 0, r: 0 }, facing: Facing.North },
        to: northHex(2),
      }),
    );
    // Leg 2: north(2) → north(4), 2 more clear MP straight North.
    const leg2 = routeLeg(
      baseLegRequest(grid, {
        from: { hex: northHex(2), facing: Facing.North },
        to: northHex(4),
        consumedMp: leg1!.mpCost,
      }),
    );
    expect(leg1).not.toBeNull();
    expect(leg2).not.toBeNull();

    // Compose leg1, snapshot the one-leg state, then compose leg2.
    const oneLeg = appendWaypointReducer(
      INITIAL_MOVEMENT_INTENT_STATE,
      leg1!,
      Facing.North,
    );
    const oneLegTotal = selectLedgerTotalMp(oneLeg);
    const twoLegs = appendWaypointReducer(oneLeg, leg2!, Facing.North);
    expect(selectLedgerTotalMp(twoLegs)).toBe(oneLegTotal + leg2!.mpCost);

    // Popping the last leg restores the one-leg composition byte-for-byte.
    const popped = popWaypointReducer(twoLegs, Facing.North);
    expect(popped).toEqual(oneLeg);
    expect(selectLedgerTotalMp(popped)).toBe(oneLegTotal);
  });
});

describe('routeLeg — pivot facing cost (task 2.2)', () => {
  it('charges facing-change MP when the leg turns away from the start facing', () => {
    // Unit faces North but travels Southeast (toward {q:1,r:0}). Reaching the
    // Southeast axial line requires a 2-hexside turn → 2 turning MP on top of
    // the terrain MP (calculateGroundPathMpCost), and the pivot is recorded.
    const grid = clearGrid();
    const turned = routeLeg(
      baseLegRequest(grid, {
        from: { hex: { q: 0, r: 0 }, facing: Facing.North },
        to: { q: 2, r: 0 },
      }),
    );
    expect(turned).not.toBeNull();
    expect(turned!.to.facingChange).toBeGreaterThan(0);
    // Terrain (2 hexes) + turning (2) = 4 MP, strictly above the path length.
    expect(turned!.mpCost).toBeGreaterThan(turned!.path.length);
  });
});

describe('routeLegMemoized (task 2.1)', () => {
  it('reuses the cached route for the same memo key', () => {
    const grid = clearGrid();
    const cache = new Map<string, ILocomotionLeg | null>();
    const req = baseLegRequest(grid, { to: northHex(3) });

    const first = routeLegMemoized(req, cache);
    expect(cache.size).toBe(1);
    const second = routeLegMemoized(req, cache);
    // Same object reference — the second call did not re-run A*.
    expect(second).toBe(first);
  });

  it('invalidates the memo when remaining MP changes (consumedMp bump)', () => {
    const grid = clearGrid();
    const key0 = routeLegMemoKey(baseLegRequest(grid, { consumedMp: 0 }));
    const key1 = routeLegMemoKey(baseLegRequest(grid, { consumedMp: 2 }));
    expect(key0).not.toBe(key1);
  });

  it('folds terrain revision into the memo key', () => {
    const grid = clearGrid();
    const a = routeLegMemoKey(baseLegRequest(grid, { terrainRevision: 1 }));
    const b = routeLegMemoKey(baseLegRequest(grid, { terrainRevision: 2 }));
    expect(a).not.toBe(b);
  });
});

describe('remainingMpForMode (task 2.3)', () => {
  it('subtracts consumed MP from the damage/heat-adjusted budget', () => {
    // Run-6 budget minus a 2 MP posture leaves 4.
    expect(remainingMpForMode(WALK4_RUN6, MovementType.Run, 0, 2)).toBe(4);
    // Walk-4 budget minus a 2 MP posture leaves 2.
    expect(remainingMpForMode(WALK4_RUN6, MovementType.Walk, 0, 2)).toBe(2);
  });

  it('floors remaining MP at zero', () => {
    expect(remainingMpForMode(WALK4_RUN6, MovementType.Walk, 0, 10)).toBe(0);
  });
});

describe('Live Intersection — reach shrinks after posture add (task 2.3 spec scenario)', () => {
  function affordable(): {
    unit: IUnitGameState;
    grid: IHexGrid;
    capability: IMovementCapability;
  } {
    return {
      unit: makeUnitAtOrigin(),
      grid: clearGrid(),
      capability: WALK4_RUN6,
    };
  }

  it('Walk 4 / Run 6 envelope shrinks to Walk 2 / Run 4 after a 2 MP posture', () => {
    const { unit, grid, capability } = affordable();
    const budgets = [
      { mode: MovementType.Walk, budgetMp: 4 },
      { mode: MovementType.Run, budgetMp: 6 },
    ];

    // Empty composition: full 4 / 6 reach.
    const full = reachableEnvelopesByMode({
      unit,
      grid,
      capability,
      consumedMp: 0,
      affordableBudgets: budgets,
    });
    const fullWalkMax = Math.max(
      ...full.get(MovementType.Walk)!.map((h) => h.mpCost),
    );
    const fullRunMax = Math.max(
      ...full.get(MovementType.Run)!.map((h) => h.mpCost),
    );
    expect(fullWalkMax).toBe(4);
    expect(fullRunMax).toBe(6);

    // After a 2 MP posture: reach is at most Walk 2 / Run 4.
    const shrunken = reachableEnvelopesByMode({
      unit,
      grid,
      capability,
      consumedMp: 2,
      affordableBudgets: budgets,
    });
    const walkHexes = shrunken.get(MovementType.Walk)!;
    const runHexes = shrunken.get(MovementType.Run)!;
    expect(Math.max(...walkHexes.map((h) => h.mpCost))).toBeLessThanOrEqual(2);
    expect(Math.max(...runHexes.map((h) => h.mpCost))).toBeLessThanOrEqual(4);
    // The reach genuinely shrank — hexes at 3 MP walk / 5 MP run are gone.
    expect(walkHexes.some((h) => h.mpCost > 2)).toBe(false);
    expect(runHexes.some((h) => h.mpCost > 4)).toBe(false);
  });

  it('renders no envelope for a budget the composition fully exhausts', () => {
    const { unit, grid, capability } = affordable();
    // Consume the entire Walk-4 budget; Run-6 still has 2 MP left.
    const byMode = reachableEnvelopesByMode({
      unit,
      grid,
      capability,
      consumedMp: 4,
      affordableBudgets: [
        { mode: MovementType.Walk, budgetMp: 4 },
        { mode: MovementType.Run, budgetMp: 6 },
      ],
    });
    expect(byMode.get(MovementType.Walk)).toEqual([]);
    expect(byMode.get(MovementType.Run)!.length).toBeGreaterThan(0);
  });
});

describe('Live Intersection — unaffordable waypoint is unplaceable by construction (task 2.3)', () => {
  it('a hex beyond every remaining budget is absent from the placeable set', () => {
    const unit = makeUnitAtOrigin();
    const grid = clearGrid();
    const budgets = [
      { mode: MovementType.Walk, budgetMp: 4 },
      { mode: MovementType.Run, budgetMp: 6 },
    ];

    // With a full budget, a hex 4 hexes straight North (4 MP, no turn) is
    // placeable under Run (6) and Walk (4).
    const wide = placeableWaypointHexes({
      unit,
      grid,
      capability: WALK4_RUN6,
      consumedMp: 0,
      affordableBudgets: budgets,
    });
    expect(wide.has(coordToKey(northHex(4)))).toBe(true);

    // After consuming 3 MP, remaining Run reach is 3 — the 4-away hex is now
    // unplaceable, so appending it is impossible by construction.
    const context = {
      unit,
      grid,
      capability: WALK4_RUN6,
      consumedMp: 3,
      affordableBudgets: budgets,
    };
    const narrow = placeableWaypointHexes(context);
    expect(narrow.has(coordToKey(northHex(4)))).toBe(false);
    expect(isPlaceableWaypoint(context, northHex(4))).toBe(false);
    // A hex within the remaining 3 MP is still placeable.
    expect(isPlaceableWaypoint(context, northHex(3))).toBe(true);
  });
});
