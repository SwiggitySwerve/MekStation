import {
  GameEventType,
  GameSide,
  type IGameConfig,
  type IGameSession,
  type IGameUnit,
  type IHexCoordinate,
  type IRepresentedGroundObjectState,
} from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  createGameSession,
  declareGroundObjectDrop,
  declareGroundObjectPickup,
  declareGroundObjectThrow,
  hydrateGameSessionFromEvents,
  startGame,
} from '../gameSession';

const CARRIER_ID = 'player-heavy-lifter';
const OBJECT_ID = 'collapsed-gantry';
const UNIT_POSITION: IHexCoordinate = { q: -2, r: 5 };

function makeConfig(): IGameConfig {
  return {
    mapRadius: 5,
    turnLimit: 30,
    victoryConditions: ['elimination'],
    optionalRules: [],
  };
}

function makeUnits(): readonly IGameUnit[] {
  return [
    {
      id: CARRIER_ID,
      name: 'Heavy Lifter Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-heavy-lifter',
      gunnery: 4,
      piloting: 5,
      unitType: UnitType.BATTLEMECH,
      tonnage: 100,
      abilities: ['hvy_lifter'],
    },
  ];
}

function makeGroundObject(
  tonnage: number,
): Readonly<Record<string, IRepresentedGroundObjectState>> {
  return {
    [OBJECT_ID]: {
      id: OBJECT_ID,
      name: 'Collapsed Gantry',
      tonnage,
      position: UNIT_POSITION,
    },
  };
}

function makeSession(objectTonnage: number): IGameSession {
  return startGame(
    createGameSession(makeConfig(), makeUnits(), {
      groundObjects: makeGroundObject(objectTonnage),
    }),
    GameSide.Player,
  );
}

function replay(session: IGameSession): IGameSession {
  return hydrateGameSessionFromEvents(session.id, session.events);
}

describe('ground object carry actions', () => {
  it('event-sources successful pickup from a represented object at the unit position', () => {
    const session = makeSession(12);

    const result = declareGroundObjectPickup(session, CARRIER_ID, OBJECT_ID);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const pickupEvent = result.session.events.at(-1);
    expect(pickupEvent?.type).toBe(GameEventType.GroundObjectPickedUp);
    expect(pickupEvent?.payload).toMatchObject({
      unitId: CARRIER_ID,
      objectId: OBJECT_ID,
      from: UNIT_POSITION,
      carryLocation: 'both',
      capacityTonnage: 15,
      capacityMarginTonnage: 3,
    });

    const replayed = replay(result.session);
    expect(replayed.currentState.groundObjects?.[OBJECT_ID]).toMatchObject({
      id: OBJECT_ID,
      carriedByUnitId: CARRIER_ID,
      carryLocation: 'both',
    });
    expect(
      replayed.currentState.groundObjects?.[OBJECT_ID].position,
    ).toBeUndefined();
    expect(replayed.currentState.units[CARRIER_ID]).toMatchObject({
      leftArmCarryingCargo: true,
      rightArmCarryingCargo: true,
      isLoadingOrUnloadingCargo: true,
      carriedGroundObjectIds: [OBJECT_ID],
    });
  });

  it('rejects overweight pickup without appending an event or changing state', () => {
    const session = makeSession(16);

    const result = declareGroundObjectPickup(session, CARRIER_ID, OBJECT_ID);

    expect(result).toMatchObject({
      ok: false,
      reason: 'object-too-heavy',
    });
    expect(result.session).toBe(session);
    expect(result.session.events).toHaveLength(session.events.length);
    expect(result.session.currentState).toEqual(session.currentState);
    expect(result.session.currentState.groundObjects?.[OBJECT_ID]).toEqual(
      session.currentState.groundObjects?.[OBJECT_ID],
    );
    expect(result.session.currentState.units[CARRIER_ID]).toEqual(
      session.currentState.units[CARRIER_ID],
    );
  });

  it('event-sources drop after pickup and clears carried object state', () => {
    const pickupResult = declareGroundObjectPickup(
      makeSession(12),
      CARRIER_ID,
      OBJECT_ID,
    );
    expect(pickupResult.ok).toBe(true);
    if (!pickupResult.ok) return;

    const dropResult = declareGroundObjectDrop(
      pickupResult.session,
      CARRIER_ID,
      OBJECT_ID,
    );

    expect(dropResult.ok).toBe(true);
    if (!dropResult.ok) return;

    const dropEvent = dropResult.session.events.at(-1);
    expect(dropEvent?.type).toBe(GameEventType.GroundObjectDropped);
    expect(dropEvent?.payload).toMatchObject({
      unitId: CARRIER_ID,
      objectId: OBJECT_ID,
      to: UNIT_POSITION,
      reason: 'drop',
    });

    const replayed = replay(dropResult.session);
    expect(replayed.currentState.groundObjects?.[OBJECT_ID]).toMatchObject({
      id: OBJECT_ID,
      position: UNIT_POSITION,
    });
    expect(
      replayed.currentState.groundObjects?.[OBJECT_ID].carriedByUnitId,
    ).toBeUndefined();
    expect(
      replayed.currentState.groundObjects?.[OBJECT_ID].carryLocation,
    ).toBeUndefined();
    expect(replayed.currentState.units[CARRIER_ID]).toMatchObject({
      leftArmCarryingCargo: false,
      rightArmCarryingCargo: false,
      isLoadingOrUnloadingCargo: true,
      carriedGroundObjectIds: [],
    });
  });

  it('event-sources throw release to a declared hex without claiming throw damage', () => {
    const thrownTo = { q: -1, r: 4 };
    const pickupResult = declareGroundObjectPickup(
      makeSession(12),
      CARRIER_ID,
      OBJECT_ID,
    );
    expect(pickupResult.ok).toBe(true);
    if (!pickupResult.ok) return;

    const throwResult = declareGroundObjectThrow(
      pickupResult.session,
      CARRIER_ID,
      OBJECT_ID,
      thrownTo,
    );

    expect(throwResult.ok).toBe(true);
    if (!throwResult.ok) return;

    const throwEvent = throwResult.session.events.at(-1);
    expect(throwEvent?.type).toBe(GameEventType.GroundObjectDropped);
    expect(throwEvent?.payload).toMatchObject({
      unitId: CARRIER_ID,
      objectId: OBJECT_ID,
      to: thrownTo,
      reason: 'throw',
    });

    const replayed = replay(throwResult.session);
    expect(replayed.currentState.groundObjects?.[OBJECT_ID]).toMatchObject({
      id: OBJECT_ID,
      position: thrownTo,
    });
    expect(
      replayed.currentState.groundObjects?.[OBJECT_ID].carriedByUnitId,
    ).toBeUndefined();
    expect(replayed.currentState.units[CARRIER_ID]).toMatchObject({
      leftArmCarryingCargo: false,
      rightArmCarryingCargo: false,
      isLoadingOrUnloadingCargo: true,
      carriedGroundObjectIds: [],
    });
  });
});
