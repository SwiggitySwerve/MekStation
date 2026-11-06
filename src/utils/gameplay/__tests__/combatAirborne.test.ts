import type { IGameUnit } from '@/types/gameplay';

import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  createGameSession,
  hydrateGameSessionFromEvents,
} from '../gameSessionCore';
import { replayToSequence } from '../gameSessionReplay';
import {
  baseGameUnit,
  SAMPLE_AERO_INIT,
  SAMPLE_VEHICLE_INIT,
} from '../gameState/__tests__/initialization.combatState.fixtures';
import { createInitialUnitState } from '../gameState/initialization';
import { buildWeaponAttackTargetToHitState } from '../toHit/stateHydration';

// MegaMek 48fcb2f64 Entity.java:14126-14148,15944-15948;
// IAero.java:945-979. @spec establish-all-unit-data-parity/quirk-combat-integration
const config = {
  mapRadius: 8,
  turnLimit: 0,
  victoryConditions: [],
  optionalRules: [],
};
const designs: readonly [string, Partial<IGameUnit>][] = [
  [
    'aero',
    {
      unitType: UnitType.AEROSPACE,
      aerospaceInit: { ...SAMPLE_AERO_INIT, altitude: 1 },
    },
  ],
  ...[GroundMotionType.VTOL, GroundMotionType.WIGE].map(
    (motionType): [string, Partial<IGameUnit>] => [
      motionType,
      {
        unitType: UnitType.VEHICLE,
        motionType,
        vehicleInit: { ...SAMPLE_VEHICLE_INIT, motionType, altitude: 1 },
      },
    ],
  ),
];
const matrix = designs.flatMap(([name, fields]) =>
  [undefined, false, true].flatMap((flag) =>
    (['direct', 'session', 'serialized', 'sequence'] as const).map(
      (boundary) => ({
        name,
        fields,
        flag,
        boundary,
      }),
    ),
  ),
);

describe('native target airborne fact', () => {
  it.each(matrix)(
    '$name flag=$flag through $boundary replaces the represented flag',
    ({ fields, flag, boundary }) => {
      const unit = baseGameUnit({ ...fields, isAirborne: flag });
      const session = createGameSession(config, [unit]);
      const replay = hydrateGameSessionFromEvents(
        session.id,
        JSON.parse(JSON.stringify(session.events)),
      );
      const lastEvent = session.events.at(-1);
      if (!lastEvent) throw new Error('Expected GameCreated');
      const states = {
        direct: createInitialUnitState(unit, { q: 0, r: 0 }),
        session: session.currentState.units[unit.id],
        serialized: replay.currentState.units[unit.id],
        sequence: replayToSequence(session, lastEvent.sequence).units[unit.id],
      };
      expect(
        buildWeaponAttackTargetToHitState(states[boundary], false).isAirborne,
      ).toBe(true);
    },
  );

  it.each(
    [0, 1].flatMap((altitude) =>
      (
        [undefined, 'grounded', 'taking-off', 'airborne', 'landing'] as const
      ).map((airborneState) => ({ altitude, airborneState })),
    ),
  )(
    'aero altitude=$altitude lifecycle=$airborneState retains the flight-mode disjunction',
    ({ altitude, airborneState }) => {
      const unit = baseGameUnit({
        unitType: UnitType.AEROSPACE,
        aerospaceInit: { ...SAMPLE_AERO_INIT, altitude, airborneState },
      });
      const session = createGameSession(config, [unit]);
      const replay = hydrateGameSessionFromEvents(
        session.id,
        JSON.parse(JSON.stringify(session.events)),
      );
      const expected =
        altitude > 0 || (airborneState ?? 'grounded') !== 'grounded';
      expect(
        buildWeaponAttackTargetToHitState(
          replay.currentState.units[unit.id],
          false,
        ).isAirborne,
      ).toBe(expected);
    },
  );

  it.each(
    [GroundMotionType.VTOL, GroundMotionType.WIGE].flatMap((motionType) =>
      [undefined, TerrainType.Building, TerrainType.Bridge].map((terrain) => ({
        motionType,
        terrain,
      })),
    ),
  )(
    '$motionType on $terrain checks roof/bridge height against elevation',
    ({ motionType, terrain }) => {
      const unit = baseGameUnit({
        unitType: UnitType.VEHICLE,
        vehicleInit: { ...SAMPLE_VEHICLE_INIT, motionType, altitude: 1 },
      });
      const session = createGameSession(config, [unit]);
      const replay = hydrateGameSessionFromEvents(
        session.id,
        JSON.parse(JSON.stringify(session.events)),
      );
      const features =
        terrain === undefined ? [] : [{ type: terrain, level: 1 }];
      expect(
        buildWeaponAttackTargetToHitState(
          replay.currentState.units[unit.id],
          false,
          features,
        ).isAirborne,
      ).toBe(terrain === undefined);
      if (terrain !== undefined) {
        expect(
          buildWeaponAttackTargetToHitState(
            replay.currentState.units[unit.id],
            false,
            [{ type: terrain, level: 0 }],
          ).isAirborne,
        ).toBe(true);
      }
    },
  );

  it.each([
    { lifecycle: 'airborne' as const, altitude: 0, expected: true },
    { lifecycle: 'airborne' as const, altitude: 1, expected: true },
    { lifecycle: 'grounded' as const, altitude: 1, expected: false },
  ])(
    'destruction gates altitude, not flight mode: $lifecycle at $altitude',
    ({ lifecycle, altitude, expected }) => {
      const unit = baseGameUnit({
        unitType: UnitType.AEROSPACE,
        aerospaceInit: {
          ...SAMPLE_AERO_INIT,
          altitude,
          airborneState: lifecycle,
        },
      });
      const state = createInitialUnitState(unit, { q: 0, r: 0 });
      expect(
        buildWeaponAttackTargetToHitState({ ...state, destroyed: true }, false)
          .isAirborne,
      ).toBe(expected);
    },
  );

  it.each([GroundMotionType.VTOL, GroundMotionType.WIGE])(
    'destroyed $motionType cannot be airborne',
    (motionType) => {
      const unit = baseGameUnit({
        isAirborne: true,
        unitType: UnitType.VEHICLE,
        vehicleInit: { ...SAMPLE_VEHICLE_INIT, motionType, altitude: 1 },
      });
      const state = createInitialUnitState(unit, { q: 0, r: 0 });
      expect(
        buildWeaponAttackTargetToHitState({ ...state, destroyed: true }, false)
          .isAirborne,
      ).toBe(false);
    },
  );

  it.each([
    GroundMotionType.VTOL,
    GroundMotionType.WIGE,
    GroundMotionType.TRACKED,
  ])(
    'grounded or nonflight mode $motionType ignores represented true',
    (motionType) => {
      const unit = baseGameUnit({
        isAirborne: true,
        unitType: UnitType.VEHICLE,
        vehicleInit: {
          ...SAMPLE_VEHICLE_INIT,
          motionType,
          altitude: motionType === GroundMotionType.TRACKED ? 1 : 0,
        },
      });
      expect(
        buildWeaponAttackTargetToHitState(
          createInitialUnitState(unit, { q: 0, r: 0 }),
          false,
        ).isAirborne,
      ).toBe(false);
    },
  );
});
