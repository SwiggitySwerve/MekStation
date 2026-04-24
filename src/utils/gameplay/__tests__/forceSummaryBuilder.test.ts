/**
 * Tests for forceSummaryBuilder (page-side glue layer).
 *
 * @spec openspec/changes/add-pre-battle-force-comparison/specs/after-combat-report/spec.md
 * @spec openspec/changes/add-pre-battle-force-comparison/specs/game-session-management/spec.md
 */

import type { IFullUnit } from '@/services/units/CanonicalUnitService';

import {
  ForcePosition,
  ForceStatus,
  ForceType,
  type IForce,
} from '@/types/force';
import { GameSide } from '@/types/gameplay';
import { PilotStatus, PilotType, type IPilot } from '@/types/pilot';

import {
  buildForceSummary,
  buildForceSummaryInput,
} from '../forceSummaryBuilder';

const fullUnit = (
  id: string,
  overrides: Partial<IFullUnit> & { bv?: number; heatSinks?: unknown } = {},
): IFullUnit =>
  ({
    id,
    chassis: 'Locust',
    variant: 'LCT-1V',
    tonnage: 20,
    techBase: 'INNER_SPHERE',
    era: 'AGE_OF_WAR',
    unitType: 'BattleMech',
    bv: 432,
    heatSinks: { type: 'SINGLE', count: 10 },
    movement: { walk: 8, jump: 0 },
    equipment: [{ id: 'medium-laser', location: 'CT' }],
    armor: {
      allocation: {
        LEFT_ARM: 4,
        RIGHT_ARM: 4,
        LEFT_TORSO: { front: 6, rear: 2 },
        RIGHT_TORSO: { front: 6, rear: 2 },
        CENTER_TORSO: { front: 8, rear: 3 },
        HEAD: 5,
        LEFT_LEG: 6,
        RIGHT_LEG: 6,
      },
    },
    ...overrides,
  }) as IFullUnit;

const pilot = (
  id: string,
  gunnery: number,
  piloting: number,
  abilityIds: string[] = [],
): IPilot => ({
  id,
  name: `Pilot ${id}`,
  type: PilotType.Persistent,
  status: PilotStatus.Active,
  skills: { gunnery, piloting },
  wounds: 0,
  abilities: abilityIds.map((abilityId) => ({
    abilityId,
    acquiredDate: '2026-01-01',
  })),
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
});

const force = (
  units: { unitId: string; pilotId: string | null }[],
): IForce => ({
  id: 'force-1',
  name: 'Player Lance',
  forceType: ForceType.Lance,
  status: ForceStatus.Active,
  childIds: [],
  assignments: units.map((u, idx) => ({
    id: `slot-${idx + 1}`,
    pilotId: u.pilotId,
    unitId: u.unitId,
    position: idx === 0 ? ForcePosition.Lead : ForcePosition.Member,
    slot: idx + 1,
  })),
  stats: {
    totalBV: 0,
    totalTonnage: 0,
    assignedPilots: 0,
    assignedUnits: 0,
    emptySlots: 0,
    averageSkill: null,
  },
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
});

describe('buildForceSummaryInput', () => {
  it('returns empty units when force is undefined', async () => {
    const input = await buildForceSummaryInput({
      side: GameSide.Player,
      force: undefined,
      pilots: [],
    });
    expect(input.side).toBe(GameSide.Player);
    expect(input.units).toEqual([]);
  });

  it('builds inputs from preloaded units (no network)', async () => {
    const preloaded = new Map<string, IFullUnit>([
      ['locust', fullUnit('locust', { tonnage: 20, bv: 432 })],
      [
        'wasp',
        fullUnit('wasp', {
          chassis: 'Wasp',
          variant: 'WSP-1A',
          tonnage: 20,
          bv: 580,
        }),
      ],
    ]);
    const pilots = [pilot('p-1', 4, 5, ['marksman']), pilot('p-2', 3, 4)];
    const f = force([
      { unitId: 'locust', pilotId: 'p-1' },
      { unitId: 'wasp', pilotId: 'p-2' },
    ]);

    const input = await buildForceSummaryInput({
      side: GameSide.Player,
      force: f,
      pilots,
      preloadedUnits: preloaded,
    });

    expect(input.units).toHaveLength(2);
    expect(input.units[0].battleValue).toBe(432);
    expect(input.units[1].battleValue).toBe(580);
    expect(input.units[0].tonnage).toBe(20);
    expect(input.units[0].gunnery).toBe(4);
    expect(input.units[0].piloting).toBe(5);
    expect(input.units[1].gunnery).toBe(3);
    // SPA aggregation: marksman from pilot 1
    expect(input.units[0].spas.map((s) => s.spaId)).toContain('marksman');
  });

  it('marks units invalid when no canonical record exists', async () => {
    const f = force([{ unitId: 'unknown-id', pilotId: 'p-1' }]);
    const input = await buildForceSummaryInput({
      side: GameSide.Player,
      force: f,
      pilots: [pilot('p-1', 4, 5)],
      preloadedUnits: new Map(), // empty → all units invalid
    });
    expect(input.units).toHaveLength(1);
    expect(input.units[0].invalid).toBe(true);
  });

  it('treats double heat sinks as 2 per sink in derived summary', async () => {
    const preloaded = new Map<string, IFullUnit>([
      [
        'doubleheat',
        fullUnit('doubleheat', {
          heatSinks: { type: 'DOUBLE', count: 10 },
        }),
      ],
    ]);
    const summary = await buildForceSummary({
      side: GameSide.Player,
      force: force([{ unitId: 'doubleheat', pilotId: null }]),
      pilots: [],
      preloadedUnits: preloaded,
    });
    expect(summary.heatDissipation).toBe(20);
  });

  it('treats single heat sinks as 1 per sink in derived summary', async () => {
    const preloaded = new Map<string, IFullUnit>([
      [
        'singleheat',
        fullUnit('singleheat', {
          heatSinks: { type: 'SINGLE', count: 12 },
        }),
      ],
    ]);
    const summary = await buildForceSummary({
      side: GameSide.Player,
      force: force([{ unitId: 'singleheat', pilotId: null }]),
      pilots: [],
      preloadedUnits: preloaded,
    });
    expect(summary.heatDissipation).toBe(12);
  });

  it('falls back to default skills (4/5) when assigned pilot is missing', async () => {
    const preloaded = new Map<string, IFullUnit>([
      ['locust', fullUnit('locust')],
    ]);
    const summary = await buildForceSummary({
      side: GameSide.Player,
      force: force([{ unitId: 'locust', pilotId: 'unknown-pilot' }]),
      pilots: [],
      preloadedUnits: preloaded,
    });
    expect(summary.avgGunnery).toBe(4);
    expect(summary.avgPiloting).toBe(5);
  });
});

// =============================================================================
// onForcesChange Callback Contract — game-session-management spec
//
// The pre-battle page wires `onForcesChange` via a React `useEffect`
// with dep array `[playerForce, opponentForce, pilots]`. This suite
// exercises the derivation contract that backs the effect: same inputs
// → deep-equal summary, changed forces → re-derivation, unrelated
// changes (map radius / mode) → no re-derivation needed.
//
// @spec openspec/changes/add-pre-battle-force-comparison/specs/game-session-management/spec.md
// =============================================================================

describe('onForcesChange callback contract (pre-battle useEffect)', () => {
  const baseUnits = new Map<string, IFullUnit>([
    ['locust', fullUnit('locust', { tonnage: 20, bv: 432 })],
    [
      'wasp',
      fullUnit('wasp', {
        chassis: 'Wasp',
        variant: 'WSP-1A',
        tonnage: 20,
        bv: 580,
      }),
    ],
  ]);

  it('re-derives with the new unit when a mech is added to the player force', async () => {
    // Scenario: Callback fires on unit addition — verify that adding a
    // second mech yields a new summary with both units counted.
    const pilots = [pilot('p-1', 4, 5), pilot('p-2', 3, 4)];

    const before = await buildForceSummary({
      side: GameSide.Player,
      force: force([{ unitId: 'locust', pilotId: 'p-1' }]),
      pilots,
      preloadedUnits: baseUnits,
    });
    expect(before.unitCount).toBe(1);
    expect(before.totalBV).toBe(432);

    const after = await buildForceSummary({
      side: GameSide.Player,
      force: force([
        { unitId: 'locust', pilotId: 'p-1' },
        { unitId: 'wasp', pilotId: 'p-2' },
      ]),
      pilots,
      preloadedUnits: baseUnits,
    });
    expect(after.unitCount).toBe(2);
    expect(after.totalBV).toBe(432 + 580);
    // Snapshot must be a NEW object (useEffect should trigger a
    // re-render with the changed reference).
    expect(after).not.toBe(before);
  });

  it('re-derives with the new pilot skills when the pilot on a mech is swapped', async () => {
    // Scenario: Callback fires on pilot swap — swapping from a 4/5
    // pilot to a 2/3 pilot must change the derived avg skills.
    const initialPilots = [pilot('p-1', 4, 5)];
    const swappedPilots = [pilot('p-2', 2, 3)];

    const before = await buildForceSummary({
      side: GameSide.Player,
      force: force([{ unitId: 'locust', pilotId: 'p-1' }]),
      pilots: initialPilots,
      preloadedUnits: baseUnits,
    });
    expect(before.avgGunnery).toBe(4);
    expect(before.avgPiloting).toBe(5);

    const after = await buildForceSummary({
      side: GameSide.Player,
      force: force([{ unitId: 'locust', pilotId: 'p-2' }]),
      pilots: swappedPilots,
      preloadedUnits: baseUnits,
    });
    expect(after.avgGunnery).toBe(2);
    expect(after.avgPiloting).toBe(3);
  });

  it('re-derives with a reduced total when a mech is removed from the force', async () => {
    // Scenario: Callback fires on unit removal — removing one of two
    // mechs must halve the derived unitCount.
    const pilots = [pilot('p-1', 4, 5), pilot('p-2', 3, 4)];

    const before = await buildForceSummary({
      side: GameSide.Player,
      force: force([
        { unitId: 'locust', pilotId: 'p-1' },
        { unitId: 'wasp', pilotId: 'p-2' },
      ]),
      pilots,
      preloadedUnits: baseUnits,
    });
    expect(before.unitCount).toBe(2);

    const after = await buildForceSummary({
      side: GameSide.Player,
      force: force([{ unitId: 'locust', pilotId: 'p-1' }]),
      pilots,
      preloadedUnits: baseUnits,
    });
    expect(after.unitCount).toBe(1);
    expect(after.totalBV).toBe(432);
  });

  it('produces deeply-equal snapshots when the inputs are unchanged (map radius / mode unchanged)', async () => {
    // Scenario: Callback not invoked for unrelated changes — pre-battle
    // useEffect dep array is `[playerForce, opponentForce, pilots]`,
    // so map radius / battle mode changes DO NOT re-trigger derivation.
    // Proxy test: calling buildForceSummary twice with the same inputs
    // yields deep-equal output, so even if a spurious re-run happened,
    // the downstream state would not observe a diff.
    const pilots = [pilot('p-1', 4, 5)];
    const f = force([{ unitId: 'locust', pilotId: 'p-1' }]);

    const first = await buildForceSummary({
      side: GameSide.Player,
      force: f,
      pilots,
      preloadedUnits: baseUnits,
    });
    const second = await buildForceSummary({
      side: GameSide.Player,
      force: f,
      pilots,
      preloadedUnits: baseUnits,
    });
    expect(second).toEqual(first);
  });

  it('does not throw when no subscriber is attached (empty / undefined force)', async () => {
    // Scenario: Callback omission does not affect launch — the
    // derivation layer must handle "no force" (undefined) without
    // throwing. The page-level useEffect treats a null summary as
    // "configure forces" and still renders.
    await expect(
      buildForceSummary({
        side: GameSide.Player,
        force: undefined,
        pilots: [],
      }),
    ).resolves.toMatchObject({
      side: GameSide.Player,
      unitCount: 0,
      totalBV: 0,
    });
  });

  it('emitted summaries are immutable — mutation does not affect a subsequent emission', async () => {
    // Scenario: Mutation of snapshot does not affect session —
    // attempting to mutate the returned summary (e.g., the warnings
    // array) must not leak into the next derivation.
    const pilots = [pilot('p-1', 4, 5)];
    const f = force([{ unitId: 'locust', pilotId: 'p-1' }]);

    const first = await buildForceSummary({
      side: GameSide.Player,
      force: f,
      pilots,
      preloadedUnits: baseUnits,
    });

    // Attempt tampering — frozen, so this throws in strict mode;
    // swallow the error so we still exercise the "next emission is
    // clean" invariant.
    try {
      (first.warnings as string[]).push('tampered');
    } catch {
      /* expected — object is frozen */
    }

    const second = await buildForceSummary({
      side: GameSide.Player,
      force: f,
      pilots,
      preloadedUnits: baseUnits,
    });
    expect(second.warnings).not.toContain('tampered');
  });
});
