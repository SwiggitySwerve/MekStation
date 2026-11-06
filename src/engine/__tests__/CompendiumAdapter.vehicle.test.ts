import fs from 'node:fs';
import path from 'node:path';

import type { IFullUnit } from '@/services/units/CanonicalUnitService';
import type { IGameUnit } from '@/types/gameplay';

import { readCatalogFiles } from '@/__tests__/helpers/catalogFiles.test-helpers';
import { getCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { SeededRandom } from '@/simulation/core';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
} from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import { contractVehicleToBVUnit } from '@/utils/construction/contractBVUnitAdapter';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';
import { buildCombatStateForUnit } from '@/utils/gameplay/gameState/combatStateInitialization';

import { adaptUnit, adaptUnitFromData } from '../adapters/CompendiumAdapter';
import { GameEngine } from '../GameEngine';
import { createMinimalGrid } from '../GameEngine.helpers';
import { InteractiveSession } from '../InteractiveSession';
import { gameUnitsWithAdaptedCombatSeeds } from '../InteractiveSession.setup';

jest.mock('@/services/units/CanonicalUnitService', () => ({
  getCanonicalUnitService: () => ({ getById: lookup }),
}));
const lookup = jest.fn();

const vehicle = {
  id: 'vehicle',
  chassis: 'Vehicle',
  variant: '',
  tonnage: 35,
  unitType: 'Vehicle',
  techBase: 'INNER_SPHERE',
  era: 'SUCCESSION_WARS',
  motionType: 'Tracked',
  movement: { cruiseMP: 3, flankMP: 4 },
  engine: { type: 'FUSION', rating: 105 },
  armor: {
    type: 'STANDARD',
    byLocation: { FRONT: 12, RIGHT: 8, LEFT: 9, REAR: 6, TURRET: 0 },
  },
  equipment: [{ id: 'medium-laser', location: 'TURRET' }],
};

it('adapts vehicle armor and structure without mech locations', () => {
  const adapted = adaptUnitFromData(full(vehicle));
  expect(adapted.armor).toEqual({
    Front: 12,
    Right: 8,
    Left: 9,
    Rear: 6,
    Turret: 0,
  });
  expect(adapted.structure).toEqual({
    Front: 4,
    Right: 4,
    Left: 4,
    Rear: 4,
    Turret: 4,
  });
});

function full(
  source: Omit<typeof vehicle, 'armor'> & {
    armor: { type: string; byLocation: Record<string, number> };
  } = vehicle,
): IFullUnit {
  const { armor, ...unit } = source;
  const result: IFullUnit = unit;
  Object.assign(result, { armor });
  return result;
}

it('uses vehicle structure keys rather than mech structure keys', () => {
  expect(Object.keys(adaptUnitFromData(full(vehicle)).structure)).toEqual([
    'Front',
    'Right',
    'Left',
    'Rear',
    'Turret',
  ]);
});

function metadata(id: string): IGameUnit {
  return {
    id,
    name: id,
    unitRef: id,
    pilotRef: 'pilot',
    side: GameSide.Player,
    gunnery: 4,
    piloting: 5,
  };
}

it('rounds flank up, maps mounts, dispatches BV and seeds the vehicle envelope', () => {
  const adapted = adaptUnitFromData(full(vehicle), {
    initialDamage: { Front: 2 },
  });
  expect(adapted.walkMP).toBe(3);
  expect(adapted.runMP).toBe(5);
  expect(adapted.vehicleInit).toMatchObject({
    motionType: 'Tracked',
    originalCruiseMP: 3,
    turretType: TurretType.SINGLE,
    engineType: 'FUSION',
    armor: { Front: 10 },
  });
  expect(adapted.weapons[0]).toMatchObject({
    location: 'Turret',
    vehicleMountLocation: 'Turret',
    vehicleIsTurretMounted: true,
  });
  const expected = calculateBattleValueForUnit(
    contractVehicleToBVUnit({
      ...vehicle,
      movement: { cruiseMP: 3, flankMP: 5 },
    }),
  );
  expect(adapted.bv).toBe(expected?.breakdown.final);
  expect(adapted.bv).toBeGreaterThan(0);
  const [seeded] = gameUnitsWithAdaptedCombatSeeds(
    [metadata(adapted.id)],
    [adapted],
    [],
  );
  expect(seeded.unitType).toBe(UnitType.VEHICLE);
  expect(buildCombatStateForUnit(seeded)).toMatchObject({
    kind: 'vehicle',
    state: {
      armor: adapted.armor,
      structure: adapted.structure,
      motive: { originalCruiseMP: 3 },
    },
  });
});

it.each(['Vehicle', 'VTOL', 'SupportVehicle', 'Support Vehicle'])(
  'dispatches %s and retains installed zero-armor turrets',
  (unitType) => {
    const input = full({
      ...vehicle,
      unitType,
      motionType: unitType === 'VTOL' ? 'VTOL' : 'Tracked',
      equipment: [],
    });
    const adapted = adaptUnitFromData(input);
    expect(adapted.vehicleInit?.turretType).toBe(
      unitType === 'VTOL' ? TurretType.CHIN : TurretType.SINGLE,
    );
  },
);

it('preserves rotor, dual turret and six-side layouts by name', () => {
  for (const names of [
    ['Front', 'Right', 'Left', 'Rear', 'Rotor', 'Turret'],
    [
      'Front',
      'Front Right',
      'Front Left',
      'Rear Right',
      'Rear Left',
      'Rear',
      'Turret',
      'Turret 2',
    ],
  ]) {
    const tags = names.map((name) => name.toUpperCase().replace(/ /g, '_'));
    const byLocation = Object.fromEntries(tags.map((tag, i) => [tag, i]));
    const adapted = adaptUnitFromData(
      full({ ...vehicle, armor: { type: 'STANDARD', byLocation } }),
    );
    expect(adapted.armor).toEqual(
      Object.fromEntries(names.map((name, i) => [name, i])),
    );
    expect(Object.keys(adapted.structure)).toEqual(Object.keys(adapted.armor));
    expect(new Set(Object.values(adapted.structure))).toEqual(new Set([4]));
    expect(adapted.structure.head).toBeUndefined();
    expect(adapted.vehicleInit?.turretType).toBe(
      names.includes('Turret 2') ? TurretType.DUAL : TurretType.SINGLE,
    );
  }
});

it('loads using family and id, preserving the default mech lookup', async () => {
  lookup.mockResolvedValue(full(vehicle));
  await adaptUnit('same-id', { family: 'vehicles' });
  expect(getCanonicalUnitService().getById).toHaveBeenLastCalledWith(
    'same-id',
    { family: 'vehicles' },
  );
  await adaptUnit('mech-id');
  expect(lookup).toHaveBeenLastCalledWith('mech-id');
});

it('rejects a wrong-family definition and malformed vehicle facts', () => {
  expect(() =>
    adaptUnitFromData(
      { ...full(vehicle), unitType: 'BattleMech' },
      { family: 'vehicles' },
    ),
  ).toThrow();
  expect(() =>
    adaptUnitFromData({ ...full(vehicle), motionType: 'Unknown' }),
  ).toThrow();
  expect(() => adaptUnitFromData({ ...full(vehicle), movement: {} })).toThrow();
});

it('adapts every committed vehicle and constructs its engine combat state', async () => {
  const root = path.join(process.cwd(), 'public/data/units/vehicles');
  const index: { units: { id: string; path: string }[] } = JSON.parse(
    fs.readFileSync(path.join(root, 'index.json'), 'utf8'),
  );
  const failures: string[] = [];
  for await (const { entry: row, read } of readCatalogFiles(
    root,
    index.units,
  )) {
    try {
      const data: IFullUnit = JSON.parse(read());
      const adapted = adaptUnitFromData(data, { family: 'vehicles' });
      const [seeded] = gameUnitsWithAdaptedCombatSeeds(
        [metadata(data.id)],
        [adapted],
        [],
      );
      expect(buildCombatStateForUnit(seeded)?.kind).toBe('vehicle');
      expect(adapted.bv).toBeGreaterThanOrEqual(0);
      expect(Object.keys(adapted.armor)).toEqual(
        Object.keys(adapted.structure),
      );
    } catch (error) {
      failures.push(`${row.id}: ${String(error)}`);
    }
  }
  expect(index.units).toHaveLength(1444);
  expect(failures).toEqual([]);
});
it.each([
  'Tracked',
  'Wheeled',
  'Hover',
  'VTOL',
  'Naval',
  'Hydrofoil',
  'Submarine',
  'WiGE',
  'Rail',
  'Maglev',
])(
  'runs %s through scripted fire, motive damage and completion',
  (motionType) => {
    const source = (id: string): IFullUnit => {
      const unit: IFullUnit = {
        id,
        chassis: id,
        variant: '',
        tonnage: 100,
        techBase: 'INNER_SPHERE',
        era: 'SUCCESSION_WARS',
        unitType: motionType === 'VTOL' ? 'VTOL' : 'Vehicle',
        motionType,
        movement: { cruiseMP: 3, flankMP: 5 },
        engine: { type: 'FUSION', rating: 300 },
        equipment: [{ id: 'medium-laser', location: 'FRONT' }],
      };
      Object.assign(unit, {
        armor: {
          type: 'STANDARD',
          byLocation: {
            FRONT: 0,
            LEFT: 0,
            RIGHT: 0,
            REAR: 0,
            ...(motionType === 'VTOL' ? { ROTOR: 2 } : {}),
          },
        },
      });
      return unit;
    };
    const player = adaptUnitFromData(source('player'));
    const target = adaptUnitFromData(source('target'), {
      side: GameSide.Opponent,
    });
    const metadata: IGameUnit[] = [player, target].map((unit) => ({
      id: unit.id,
      name: unit.id,
      unitRef: unit.id,
      pilotRef: unit.id,
      side: unit.side,
      gunnery: 0,
      piloting: 5,
    }));
    const dice: number[] = [];
    const session = new InteractiveSession(
      3,
      5,
      new SeededRandom(7),
      createMinimalGrid(3),
      [player],
      [target],
      metadata,
      {},
      () => dice.shift() ?? 3,
      [],
      ['elimination'],
      7,
    );
    for (
      let shot = 0;
      shot < 4 &&
      session.getSession().currentState.status !== GameStatus.Completed;
      shot++
    ) {
      for (
        let step = 0;
        step < 8 &&
        session.getSession().currentState.phase !== GamePhase.WeaponAttack;
        step++
      )
        session.advancePhase();
      const state = session.getSession().currentState;
      // Place adjacent units on the front arc; all resolution still uses session commands.
      state.units.player = {
        ...state.units.player,
        position: { q: 0, r: 1 },
        facing: Facing.North,
      };
      state.units.target = {
        ...state.units.target,
        position: { q: 0, r: 0 },
        facing: Facing.South,
      };
      session.applyAttack(player.id, target.id, [player.weapons[0].id]);
      // Vehicle D6 adaptation consumes a 2D6 pair for each die, taking its first.
      dice.push(6, 6, 3, 3, 4, 1, 4, 1, 1, 1, 1, 1);
      session.advancePhase();
    }
    const result = session.getSession();
    expect(
      result.events.some((event) => event.type === GameEventType.MotiveDamaged),
    ).toBe(true);
    expect(result.currentState.status).toBe(GameStatus.Completed);
    const combat = result.currentState.units.target.combatState;
    expect(combat?.kind).toBe('vehicle');
    if (combat?.kind === 'vehicle')
      expect(
        combat.state.motive.penaltyMP + Number(combat.state.motive.immobilized),
      ).toBeGreaterThan(0);
    expect(
      hydrateGameSessionFromEvents(result.id, result.events).currentState.units
        .target.combatState,
    ).toEqual(combat);
    const complete = new GameEngine({
      mapRadius: 3,
      turnLimit: 3,
      seed: 17,
    }).runToCompletion([player], [target], metadata);
    expect(
      complete.events.some((event) => event.type === GameEventType.GameEnded),
    ).toBe(true);
  },
);
