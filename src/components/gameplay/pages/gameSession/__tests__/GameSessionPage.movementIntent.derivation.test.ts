/**
 * Phase-3 map-interaction derivation tests (change
 * `tactical-movement-intent-composer`, tactical-map-interface delta). Exercises
 * the pure `GameSessionPage.movementIntent` derivation against a real hex grid +
 * the movement-system routing engine — no React, no mocks of the cost math.
 *
 * Covers the delta's load-bearing scenarios:
 *  - 3.1 Envelopes shrink as composed intent consumes budget (Walk 4 / Run 6 →
 *    Walk 2 / Run 4 after a 2 MP posture); a fully-unaffordable budget renders
 *    no envelope.
 *  - 3.2 Hover preview re-anchors at the last waypoint; cumulative MP includes
 *    the composed ledger.
 *  - 3.3 Click appends a waypoint; clicking the last waypoint pops; an
 *    unreachable click is ignored (blocked at the source).
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-map-interface/spec.md
 */

import { describe, expect, it } from '@jest/globals';

import type { IBudgetProjectionContext } from '@/stores/useGameplayStore.movementIntent';
import type {
  IMovementCapability,
  IMovementIntentState,
  IUnitGameState,
} from '@/types/gameplay';

import { Facing, MovementType } from '@/types/gameplay';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { routeLegMemoized } from '@/utils/gameplay/movement/intentRouting';

import {
  buildIntentEnvelopeHexes,
  resolveIntentHoverPreview,
  resolveWaypointClick,
} from '../GameSessionPage.movementIntent';

const grid = createHexGrid({ radius: 4 });

const capability: IMovementCapability = {
  walkMP: 4,
  runMP: 6,
  jumpMP: 0,
  movementMode: 'walk',
  movementHeatProfile: 'mek',
};

const unit: IUnitGameState = {
  id: 'unit-a',
  side: 0 as unknown as IUnitGameState['side'],
  position: { q: 0, r: 0 },
  facing: Facing.North,
  heat: 0,
  movementThisTurn: MovementType.Stationary,
  hexesMovedThisTurn: 0,
  armor: {},
  structure: {},
  destroyedLocations: [],
  destroyedEquipment: [],
  ammo: {},
  pilotWounds: 0,
  pilotConscious: true,
  destroyed: false,
} as unknown as IUnitGameState;

const budgetContext: IBudgetProjectionContext = {
  capability,
  currentHeat: 0,
  movementHeatProfile: 'mek',
};

const EMPTY: IMovementIntentState = { items: [], lockedMode: null };

/** Max reach cost present in the envelope for a given movement type. */
function maxCostForMode(
  hexes: ReturnType<typeof buildIntentEnvelopeHexes>,
  mode: MovementType,
): number {
  const costs = hexes
    .flatMap((h) => h.movementModeOptions ?? [h])
    .filter((o) => o.movementType === mode && o.reachable)
    .map((o) => o.mpCost);
  return costs.length === 0 ? 0 : Math.max(...costs);
}

describe('phase-3 envelope derivation (3.1)', () => {
  it('renders every affordable mode simultaneously on an empty composition', () => {
    const hexes = buildIntentEnvelopeHexes({
      intent: EMPTY,
      unit,
      capability,
      grid,
      budgetContext,
      environmentalConditions: undefined,
      optionalRules: [],
    });

    // Walk reaches 4 MP, Run reaches 6 MP — both envelopes present at once.
    expect(maxCostForMode(hexes, MovementType.Walk)).toBe(4);
    expect(maxCostForMode(hexes, MovementType.Run)).toBe(6);
  });

  it('shrinks each envelope by the composed ledger (2 MP posture → Walk 2 / Run 4)', () => {
    const withPosture: IMovementIntentState = {
      items: [{ kind: 'posture', action: 'CAREFUL_STAND', mpCost: 2 }],
      lockedMode: null,
    };
    const hexes = buildIntentEnvelopeHexes({
      intent: withPosture,
      unit,
      capability,
      grid,
      budgetContext,
      environmentalConditions: undefined,
      optionalRules: [],
    });

    // Remaining MP: Walk 4-2=2, Run 6-2=4.
    expect(maxCostForMode(hexes, MovementType.Walk)).toBeLessThanOrEqual(2);
    expect(maxCostForMode(hexes, MovementType.Run)).toBeLessThanOrEqual(4);
    expect(maxCostForMode(hexes, MovementType.Run)).toBeGreaterThan(2);
  });

  it('renders no envelope for a budget made entirely unaffordable', () => {
    // A 6 MP posture exhausts Walk (4) and Run (6) entirely.
    const exhausted: IMovementIntentState = {
      items: [{ kind: 'posture', action: 'CAREFUL_STAND', mpCost: 6 }],
      lockedMode: null,
    };
    const hexes = buildIntentEnvelopeHexes({
      intent: exhausted,
      unit,
      capability,
      grid,
      budgetContext,
      environmentalConditions: undefined,
      optionalRules: [],
    });
    expect(hexes).toHaveLength(0);
  });
});

describe('phase-3 hover preview re-anchor (3.2)', () => {
  it('anchors at the unit and reports leg MP when the path is empty', () => {
    const preview = resolveIntentHoverPreview({
      intent: EMPTY,
      unit,
      capability,
      grid,
      budgetContext,
      hoveredHex: { q: 2, r: 0 },
      routeCache: new Map(),
      unitId: 'unit-a',
    });
    expect(preview).not.toBeNull();
    expect(preview?.unreachable).toBe(false);
    expect(preview?.path[0]).toEqual({ q: 0, r: 0 });
    expect(preview?.cumulativeMpCost).toBeGreaterThan(0);
  });

  it('anchors at the last waypoint and folds the composed ledger into cumulative MP', () => {
    // Compose one leg to {2,0} first, then hover a hex beyond it.
    const cache = new Map();
    const firstLeg = routeLegMemoized(
      {
        unitId: 'unit-a',
        grid,
        from: { hex: { q: 0, r: 0 }, facing: Facing.North },
        to: { q: 2, r: 0 },
        mode: MovementType.Walk,
        capability,
        currentHeat: 0,
        consumedMp: 0,
      },
      cache,
    );
    expect(firstLeg).not.toBeNull();
    const composed: IMovementIntentState = {
      items: [
        {
          kind: 'locomotion',
          legs: [firstLeg!],
          finalFacing: Facing.Southeast,
        },
      ],
      lockedMode: null,
    };

    const preview = resolveIntentHoverPreview({
      intent: composed,
      unit,
      capability,
      grid,
      budgetContext,
      hoveredHex: { q: 3, r: 0 },
      routeCache: new Map(),
      unitId: 'unit-a',
    });

    expect(preview).not.toBeNull();
    // Preview path starts at the LAST WAYPOINT ({2,0}), not the unit ({0,0}).
    expect(preview?.path[0]).toEqual({ q: 2, r: 0 });
    // Cumulative MP includes the already-composed leg cost.
    expect(preview?.cumulativeMpCost).toBeGreaterThan(firstLeg!.mpCost);
  });
});

describe('phase-3 click-adds-waypoint (3.3)', () => {
  it('appends a waypoint on a reachable-hex click', () => {
    const result = resolveWaypointClick({
      intent: EMPTY,
      unit,
      unitId: 'unit-a',
      capability,
      grid,
      budgetContext,
      clickedHex: { q: 2, r: 0 },
      routeCache: new Map(),
    });
    expect(result.kind).toBe('append');
    if (result.kind === 'append') {
      expect(result.leg.to.hex).toEqual({ q: 2, r: 0 });
      expect(result.leg.mpCost).toBeGreaterThan(0);
    }
  });

  it('pops when the current last waypoint is clicked', () => {
    const cache = new Map();
    const leg = routeLegMemoized(
      {
        unitId: 'unit-a',
        grid,
        from: { hex: { q: 0, r: 0 }, facing: Facing.North },
        to: { q: 2, r: 0 },
        mode: MovementType.Walk,
        capability,
        currentHeat: 0,
        consumedMp: 0,
      },
      cache,
    );
    const composed: IMovementIntentState = {
      items: [
        { kind: 'locomotion', legs: [leg!], finalFacing: Facing.Southeast },
      ],
      lockedMode: null,
    };
    const result = resolveWaypointClick({
      intent: composed,
      unit,
      unitId: 'unit-a',
      capability,
      grid,
      budgetContext,
      clickedHex: { q: 2, r: 0 },
      routeCache: new Map(),
    });
    expect(result.kind).toBe('pop');
  });

  it('ignores a click no remaining budget can reach', () => {
    // {8,0} is outside the radius-4 grid / any budget — unreachable.
    const result = resolveWaypointClick({
      intent: EMPTY,
      unit,
      unitId: 'unit-a',
      capability,
      grid,
      budgetContext,
      clickedHex: { q: 8, r: 0 },
      routeCache: new Map(),
    });
    expect(result.kind).toBe('ignore');
  });
});
