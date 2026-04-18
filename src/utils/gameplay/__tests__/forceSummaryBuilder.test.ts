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
