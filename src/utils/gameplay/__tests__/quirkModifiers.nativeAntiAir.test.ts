import type { IFullUnit } from '@/services/units/CanonicalUnitService';
import type {
  IAttackerState,
  ITargetState,
  IAttackDeclaredPayload,
  IGameSession,
  IGameUnit,
  IWeaponAttack,
} from '@/types/gameplay';

import { hydrateUnitQuirksFromFullUnit } from '@/simulation/runner/UnitHydrationMovement';
import { WeaponCategory } from '@/types/equipment/weapons/interfaces';
import {
  GameEventType,
  GameSide,
  MovementType,
  RangeBracket,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import orion from '../../../../public/data/units/battlemechs/1-age-of-war/standard/Orion ON1-K.json';
import {
  createGameSession,
  startGame,
  rollInitiative,
  advancePhase,
  declareAttack,
  hydrateGameSessionFromEvents,
} from '../gameSessionCore';
import { replayToSequence } from '../gameSessionReplay';
import {
  baseGameUnit,
  SAMPLE_AERO_INIT,
  SAMPLE_VEHICLE_INIT,
} from '../gameState/__tests__/initialization.combatState.fixtures';
import { hasQuirk, QUIRK_CATALOG, UNIT_QUIRK_IDS } from '../quirkModifiers';
import { calculateToHit } from '../toHit';

// MegaMek48fcb2f64 Quirks.java:75; OptionsConstants.java:44;
// ComputeAbilityMods.java:64-68. The merged airborne owner supplies the fact.
// @spec openspec/changes/establish-all-unit-data-parity/specs/quirk-combat-integration/spec.md
const attacker: IAttackerState = {
  gunnery: 4,
  movementType: MovementType.Walk,
  heat: 0,
  damageModifiers: [],
};
const target: ITargetState = {
  movementType: MovementType.Run,
  hexesMoved: 6,
  prone: false,
  immobile: false,
  partialCover: false,
};
const spellings = [
  [],
  ['anti_air'],
  ['anti_air', 'anti_air'],
  ['anti_air_extra'],
  ['ANTI_AIR'],
] as const;
const brackets = [
  RangeBracket.Short,
  RangeBracket.Medium,
  RangeBracket.Long,
  RangeBracket.Extreme,
];

describe('native unit Anti-Air game effect', () => {
  it.each(
    spellings.flatMap((quirks) =>
      [undefined, false, true].flatMap((isAirborne) =>
        brackets.map((bracket) => ({ quirks, isAirborne, bracket })),
      ),
    ),
  )(
    '$quirks against airborne=$isAirborne at $bracket',
    ({ quirks, isAirborne, bracket }) => {
      const context = { ...target, isAirborne };
      const baseline = calculateToHit(attacker, context, bracket, 6);
      const result = calculateToHit(
        { ...attacker, unitQuirks: quirks },
        context,
        bracket,
        6,
      );
      const expected =
        quirks.some((id) => id === 'anti_air') && isAirborne === true ? -2 : 0;
      expect(result.finalToHit - baseline.finalToHit).toBe(expected);
      expect(
        result.modifiers.filter((m) => m.name === 'Anti-Air Targeting'),
      ).toHaveLength(expected === -2 ? 1 : 0);
      expect(
        result.modifiers.filter((m) => m.name !== 'Anti-Air Targeting'),
      ).toEqual(baseline.modifiers);
    },
  );

  it('registers only the native identity and does not give the target quirk to the attacker', () => {
    expect(UNIT_QUIRK_IDS.ANTI_AIR).toBe('anti_air');
    expect(QUIRK_CATALOG.anti_air).toMatchObject({
      id: 'anti_air',
      pipelines: ['to-hit'],
      isPositive: true,
    });
    expect(hasQuirk(['anti_air_extra'], 'anti_air')).toBe(false);
    const baseline = calculateToHit(
      attacker,
      { ...target, isAirborne: true },
      RangeBracket.Short,
      6,
    );
    expect(
      calculateToHit(
        attacker,
        { ...target, isAirborne: true, unitQuirks: ['anti_air'] },
        RangeBracket.Short,
        6,
      ),
    ).toEqual(baseline);
  });

  it('adds to existing unit, weapon, movement and range modifiers without replacing them', () => {
    const context = {
      ...target,
      isAirborne: true,
      unitQuirks: ['distracting'],
    };
    const firing = {
      ...attacker,
      unitQuirks: ['imp_target_short', 'sensor_ghosts'],
      weaponQuirks: { gun: ['accurate'] },
    };
    const baseline = calculateToHit(
      firing,
      context,
      RangeBracket.Short,
      6,
      0,
      'gun',
    );
    const result = calculateToHit(
      { ...firing, unitQuirks: [...firing.unitQuirks, 'anti_air'] },
      context,
      RangeBracket.Short,
      6,
      0,
      'gun',
    );
    expect(result.finalToHit).toBe(baseline.finalToHit - 2);
    expect(
      result.modifiers.filter((m) => m.name !== 'Anti-Air Targeting'),
    ).toEqual(baseline.modifiers);
  });

  it('retains the outer impossible-target clamp while recording the full -2 term', () => {
    const firing = { ...attacker, gunnery: 10, movementType: MovementType.Run };
    const context = { ...target, isAirborne: true };
    const baseline = calculateToHit(firing, context, RangeBracket.Extreme, 6);
    const result = calculateToHit(
      { ...firing, unitQuirks: ['anti_air'] },
      context,
      RangeBracket.Extreme,
      6,
    );
    expect(baseline.finalToHit).toBe(13);
    expect(result.finalToHit).toBe(13);
    expect(result.modifiers).toContainEqual(
      expect.objectContaining({ name: 'Anti-Air Targeting', value: -2 }),
    );
  });

  it('consumes the real converted Orion native key through the public source hydrator', () => {
    const source: IFullUnit = {
      id: orion.id,
      chassis: orion.chassis,
      variant: orion.model,
      tonnage: orion.tonnage,
      techBase: orion.techBase,
      era: orion.era,
      unitType: orion.unitType,
      quirks: orion.quirks,
    };
    const quirks = hydrateUnitQuirksFromFullUnit(source);
    expect(quirks).toContain('anti_air');
    const context = { ...target, isAirborne: true };
    const baseline = calculateToHit(attacker, context, RangeBracket.Short, 6);
    expect(
      calculateToHit(
        { ...attacker, unitQuirks: quirks },
        context,
        RangeBracket.Short,
        6,
      ).finalToHit,
    ).toBe(baseline.finalToHit - 2);
    expect(source.quirks).toEqual(orion.quirks);
  });
});

const config = {
  mapRadius: 8,
  turnLimit: 0,
  victoryConditions: [],
  optionalRules: [],
};
const weapon: IWeaponAttack = {
  weaponId: 'medium-laser',
  weaponName: 'Medium Laser',
  damage: 5,
  heat: 3,
  category: WeaponCategory.ENERGY,
  minRange: 0,
  shortRange: 20,
  mediumRange: 30,
  longRange: 40,
  isCluster: false,
};
const scenarios: readonly {
  name: string;
  fields: Partial<IGameUnit>;
  terrain?: TerrainType;
  delta: number;
}[] = [
  {
    name: 'airborne aerospace',
    fields: {
      unitType: UnitType.AEROSPACE,
      aerospaceInit: { ...SAMPLE_AERO_INIT, altitude: 1 },
    },
    delta: -2,
  },
  {
    name: 'liftOff(0)',
    fields: {
      unitType: UnitType.AEROSPACE,
      aerospaceInit: {
        ...SAMPLE_AERO_INIT,
        altitude: 0,
        airborneState: 'airborne',
      },
    },
    delta: -2,
  },
  {
    name: 'landed aerospace',
    fields: {
      unitType: UnitType.AEROSPACE,
      aerospaceInit: {
        ...SAMPLE_AERO_INIT,
        altitude: 0,
        airborneState: 'grounded',
      },
    },
    delta: 0,
  },
  ...[GroundMotionType.VTOL, GroundMotionType.WIGE].flatMap((motionType) =>
    [undefined, TerrainType.Building, TerrainType.Bridge].map((terrain) => ({
      name: `${motionType}/${terrain ?? 'clear'}`,
      fields: {
        unitType: UnitType.VEHICLE,
        vehicleInit: { ...SAMPLE_VEHICLE_INIT, motionType, altitude: 1 },
      },
      terrain,
      delta: terrain === undefined ? -2 : 0,
    })),
  ),
];

function sessionFor(
  fields: Partial<IGameUnit>,
  quirks: readonly string[],
  terrain?: TerrainType,
): IGameSession {
  const units = [
    baseGameUnit({ id: 'attacker', gunnery: 6, unitQuirks: quirks }),
    baseGameUnit({
      ...fields,
      id: 'target',
      side: GameSide.Opponent,
      isAirborne: false,
    }),
  ];
  const coordinate = createGameSession(config, units).currentState.units.target
    .position;
  let session = createGameSession(config, units, {
    hexTerrain: [
      {
        coordinate,
        elevation: 0,
        features: terrain === undefined ? [] : [{ type: terrain, level: 1 }],
      },
    ],
  });
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session, GameSide.Player, () => 3);
  return advancePhase(advancePhase(session));
}

function declared(session: IGameSession) {
  const next = declareAttack(
    session,
    'attacker',
    'target',
    [weapon],
    10,
    RangeBracket.Short,
  );
  const event = next.events
    .slice(session.events.length)
    .find((event) => event.type === GameEventType.AttackDeclared);
  if (!event) throw new Error('Expected real AttackDeclared');
  return { next, payload: event.payload as IAttackDeclaredPayload };
}

describe('native Anti-Air session and replay', () => {
  it.each(scenarios)(
    '$name uses the merged native fact despite represented false',
    ({ fields, terrain, delta }) => {
      const baseline = declared(sessionFor(fields, [], terrain)).payload;
      const session = sessionFor(fields, ['anti_air'], terrain);
      const last = session.events.at(-1);
      if (!last) throw new Error('Expected event log');
      const replay = hydrateGameSessionFromEvents(
        session.id,
        JSON.parse(JSON.stringify(session.events)),
      );
      for (const candidate of [
        session,
        replay,
        { ...session, currentState: replayToSequence(session, last.sequence) },
      ]) {
        const result = declared(candidate);
        expect(result.payload.toHitNumber - baseline.toHitNumber).toBe(delta);
        expect(
          result.payload.modifiers.filter(
            (m) => m.name !== 'Anti-Air Targeting',
          ),
        ).toEqual(baseline.modifiers);
        const serialized = hydrateGameSessionFromEvents(
          result.next.id,
          JSON.parse(JSON.stringify(result.next.events)),
        );
        const retained = serialized.events.findLast(
          (event) => event.type === GameEventType.AttackDeclared,
        )?.payload as IAttackDeclaredPayload;
        expect(retained.toHitNumber).toBe(result.payload.toHitNumber);
        expect(retained.modifiers).toEqual(result.payload.modifiers);
        expect(serialized.currentState.units.attacker.unitQuirks).toEqual([
          'anti_air',
        ]);
      }
    },
  );
});
