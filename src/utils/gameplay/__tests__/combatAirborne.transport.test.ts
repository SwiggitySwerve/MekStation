import type {
  IAttackDeclaredPayload,
  IGameSession,
  IUnitToken,
  IWeaponAttack,
  IWeaponStatus,
  IGameCreatedPayload,
} from '@/types/gameplay';
import type { ITerrainFeature } from '@/types/gameplay/TerrainTypes';

import { WeaponCategory } from '@/types/equipment/weapons/interfaces';
import {
  GameEventType,
  GamePhase,
  GameSide,
  RangeBracket,
  TokenUnitType,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { deriveCombatRangeHexes } from '../combatProjection';
import { createTerrainChangedEvent } from '../gameEvents';
import {
  createGameSession,
  hydrateGameSessionFromEvents,
  startGame,
  rollInitiative,
  advancePhase,
  declareAttack,
} from '../gameSessionCore';
import { appendEvent } from '../gameSessionEvents';
import {
  baseGameUnit,
  SAMPLE_VEHICLE_INIT,
} from '../gameState/__tests__/initialization.combatState.fixtures';
import { createHexGrid } from '../hexGrid';
import { terrainStringFromFeatures } from '../terrainEncoding';

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
const status: IWeaponStatus = {
  id: weapon.weaponId,
  name: weapon.weaponName,
  damage: 5,
  heat: 3,
  location: 'right_arm',
  destroyed: false,
  firedThisTurn: false,
  ranges: { short: 20, medium: 30, long: 40 },
};
const config = {
  mapRadius: 8,
  turnLimit: 0,
  victoryConditions: [],
  optionalRules: [],
};

function setup(
  motionType: GroundMotionType,
  features: readonly ITerrainFeature[],
  abilities: readonly string[] = ['shaky_stick'],
) {
  const units = [
    baseGameUnit({ id: 'attacker' }),
    baseGameUnit({
      id: 'target',
      side: GameSide.Opponent,
      abilities,
      isAirborne: true,
      unitType: UnitType.VEHICLE,
      vehicleInit: { ...SAMPLE_VEHICLE_INIT, motionType, altitude: 1 },
    }),
  ];
  const placement = createGameSession(config, units).currentState.units.target
    .position;
  let session = createGameSession(config, units, {
    hexTerrain: [{ coordinate: placement, elevation: 0, features }],
  });
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session, GameSide.Player, () => 3);
  return advancePhase(advancePhase(session));
}

function payload(session: IGameSession): IAttackDeclaredPayload {
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
  if (!event) throw Error('Expected a real attack declaration');
  return event.payload as IAttackDeclaredPayload;
}

function token(session: IGameSession, id: string): IUnitToken {
  const unit = session.currentState.units[id];
  return {
    unitId: id,
    name: id,
    side: unit.side,
    position: unit.position,
    facing: unit.facing,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: id,
    unitType: TokenUnitType.Mech,
  };
}

function projection(
  session: IGameSession,
  features: readonly ITerrainFeature[],
) {
  const grid = createHexGrid({ radius: 8 });
  const target = token(session, 'target');
  const attacker = token(session, 'attacker');
  const key = `${target.position.q},${target.position.r}`;
  const hex = grid.hexes.get(key);
  if (!hex) throw Error('Missing target hex');
  grid.hexes.set(key, { ...hex, terrain: terrainStringFromFeatures(features) });
  const result = deriveCombatRangeHexes({
    attacker,
    targetUnitId: 'target',
    hexes: [target.position],
    grid,
    tokens: [attacker, target],
    weapons: [status],
    combatState: session.currentState,
  })[0];
  expect(result.attackable).toBe(true);
  return result;
}

const cases = [GroundMotionType.VTOL, GroundMotionType.WIGE].flatMap(
  (motionType) =>
    [undefined, TerrainType.Building, TerrainType.Bridge].map((type) => ({
      motionType,
      type,
    })),
);

describe('native airborne terrain transport reaches actual to-hit effects', () => {
  it.each(cases)(
    '$motionType at $type agrees in session, serialized replay and volley/per-weapon projection',
    ({ motionType, type }) => {
      const features = type === undefined ? [] : [{ type, level: 1 }];
      const session = setup(motionType, features);
      const replay = hydrateGameSessionFromEvents(
        session.id,
        JSON.parse(JSON.stringify(session.events)),
      );
      const expected =
        type === undefined
          ? [expect.objectContaining({ name: 'Shaky Stick', value: 1 })]
          : [];
      for (const candidate of [session, replay]) {
        expect(
          payload(candidate).modifiers.filter((m) => m.name === 'Shaky Stick'),
        ).toEqual(expected);
        const projected = projection(candidate, features);
        expect(
          projected.toHitModifiers?.filter((m) => m.name === 'Shaky Stick'),
        ).toEqual(expected);
        expect(
          projected.weaponRangeOptions[0].toHitModifiers?.filter(
            (m) => m.name === 'Shaky Stick',
          ),
        ).toEqual(expected);
      }
    },
  );

  it('uses current terrain overrides after a roof is removed and survives serialized replay', () => {
    let session = setup(GroundMotionType.VTOL, [
      { type: TerrainType.Building, level: 1 },
    ]);
    expect(
      payload(session).modifiers.some((m) => m.name === 'Shaky Stick'),
    ).toBe(false);
    session = appendEvent(
      session,
      createTerrainChangedEvent(
        session.id,
        session.events.length,
        1,
        GamePhase.WeaponAttack,
        {
          hex: session.currentState.units.target.position,
          terrain: 'clear',
          reason: 'battlefield_wreckage',
        },
      ),
    );
    const replay = hydrateGameSessionFromEvents(
      session.id,
      JSON.parse(JSON.stringify(session.events)),
    );
    expect(payload(replay).modifiers).toContainEqual(
      expect.objectContaining({ name: 'Shaky Stick', value: 1 }),
    );
  });

  it.each(cases)(
    'without airborne-sensitive abilities $motionType/$type numerical outputs stay equal across flight flags',
    ({ motionType, type }) => {
      const features = type === undefined ? [] : [{ type, level: 1 }];
      const session = setup(motionType, features, []);
      const expected = payload(session);
      for (const isAirborne of [undefined, false, true]) {
        const candidate = {
          ...session,
          currentState: {
            ...session.currentState,
            units: {
              ...session.currentState.units,
              target: { ...session.currentState.units.target, isAirborne },
            },
          },
        };
        expect(payload(candidate).toHitNumber).toBe(expected.toHitNumber);
        expect(payload(candidate).modifiers).toEqual(expected.modifiers);
      }
      const created = session.events[0].payload as IGameCreatedPayload;
      expect(created.hexTerrain?.[0].features).toEqual(features);
    },
  );
});
