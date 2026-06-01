import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  type IGameSession,
  type IHexCoordinate,
  type IPhysicalAttackDeclaredPayload,
  type IPhysicalAttackResolvedPayload,
} from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  declarePhysicalAttack,
  type IPhysicalAttackContext,
} from '../gameSessionPhysical';

const PUNCH_CONTEXT: IPhysicalAttackContext = {
  attackerTonnage: 55,
  targetTonnage: 55,
  pilotingSkill: 5,
  arm: 'right',
};

function buildPhysicalSession(
  targetPosition: IHexCoordinate,
  targetUnitType: UnitType = UnitType.BATTLEMECH,
  attackerDestroyedLocations: readonly string[] = [],
): IGameSession {
  return {
    id: 'physical-range-session',
    createdAt: '',
    updatedAt: '',
    config: {
      mapRadius: 5,
      turnLimit: 0,
      victoryConditions: [],
      optionalRules: [],
    },
    units: [
      {
        id: 'attacker',
        name: 'Attacker',
        side: GameSide.Player,
        unitRef: 'attacker-ref',
        pilotRef: 'pilot-a',
        gunnery: 4,
        piloting: 5,
        unitType: UnitType.BATTLEMECH,
      },
      {
        id: 'target',
        name: 'Target',
        side: GameSide.Opponent,
        unitRef: 'target-ref',
        pilotRef: 'pilot-t',
        gunnery: 4,
        piloting: 5,
        unitType: targetUnitType,
      },
    ],
    events: [],
    currentState: {
      gameId: 'physical-range-session',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.PhysicalAttack,
      activationIndex: 0,
      units: {
        attacker: {
          id: 'attacker',
          side: GameSide.Player,
          position: { q: 0, r: 0 },
          facing: Facing.Southeast,
          heat: 0,
          movementThisTurn: MovementType.Stationary,
          hexesMovedThisTurn: 0,
          armor: {},
          structure: {},
          destroyedLocations: attackerDestroyedLocations,
          destroyedEquipment: [],
          ammo: {},
          pilotWounds: 0,
          pilotConscious: true,
          destroyed: false,
          lockState: LockState.Planning,
        },
        target: {
          id: 'target',
          side: GameSide.Opponent,
          position: targetPosition,
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
          lockState: LockState.Planning,
        },
      },
      turnEvents: [],
    },
  };
}

describe('declarePhysicalAttack target range', () => {
  it('emits an impossible resolution instead of declaring non-adjacent targets', () => {
    const session = buildPhysicalSession({ q: 2, r: 0 });

    const next = declarePhysicalAttack(
      session,
      'attacker',
      'target',
      'punch',
      PUNCH_CONTEXT,
    );

    expect(
      next.events.some(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toBe(false);
    const rejection = next.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    expect(rejection).toBeDefined();
    expect(rejection?.payload as IPhysicalAttackResolvedPayload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'punch',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetNotAdjacent',
    });
  });

  it('still declares adjacent physical targets', () => {
    const session = buildPhysicalSession({ q: 1, r: 0 });

    const next = declarePhysicalAttack(
      session,
      'attacker',
      'target',
      'punch',
      PUNCH_CONTEXT,
    );

    expect(
      next.events.some(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toBe(true);
    expect(
      next.events.some(
        (event) => event.type === GameEventType.PhysicalAttackResolved,
      ),
    ).toBe(false);
  });

  it('persists MegaMek hull-down punch hit-table selection on declaration', () => {
    const session = buildPhysicalSession({ q: 1, r: 0 });
    session.currentState.units.attacker = {
      ...session.currentState.units.attacker,
      hullDown: true,
    };

    const next = declarePhysicalAttack(session, 'attacker', 'target', 'punch', {
      ...PUNCH_CONTEXT,
      limb: 'rightArm',
      attackerUnitType: UnitType.BATTLEMECH,
      targetUnitType: UnitType.BATTLEMECH,
      elevationContext: {
        attackerBaseElevation: 0,
        attackerArmElevation: 1,
        targetBaseElevation: 1,
        targetTopElevation: 2,
      },
    });

    const declared = next.events.find(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    expect(declared?.payload as IPhysicalAttackDeclaredPayload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'punch',
      limb: 'rightArm',
      hitTable: 'kick',
    });
  });

  it('rejects hull-down kick commits before declaration', () => {
    const session = buildPhysicalSession({ q: 1, r: 0 });
    session.currentState.units.attacker = {
      ...session.currentState.units.attacker,
      hullDown: true,
    };

    const next = declarePhysicalAttack(session, 'attacker', 'target', 'kick', {
      ...PUNCH_CONTEXT,
      limb: 'rightLeg',
      attackerUnitType: UnitType.BATTLEMECH,
      targetUnitType: UnitType.BATTLEMECH,
    });

    expect(
      next.events.some(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toBe(false);
    const rejection = next.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    expect(rejection?.payload as IPhysicalAttackResolvedPayload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'AttackerHullDown',
    });
  });

  it('rejects adjacent physical targets when elevation blocks the attack', () => {
    const session = buildPhysicalSession({ q: 1, r: 0 });

    const next = declarePhysicalAttack(session, 'attacker', 'target', 'kick', {
      ...PUNCH_CONTEXT,
      elevationContext: {
        attackerBaseElevation: 0,
        attackerArmElevation: 1,
        targetBaseElevation: 1,
        targetTopElevation: 2,
      },
    });

    expect(
      next.events.some(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toBe(false);
    const rejection = next.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    expect(rejection?.payload as IPhysicalAttackResolvedPayload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetElevationNotInRange',
    });
  });

  it('rejects push declarations against represented non-Mek targets', () => {
    const session = buildPhysicalSession({ q: 1, r: 0 }, UnitType.VEHICLE);

    const next = declarePhysicalAttack(
      session,
      'attacker',
      'target',
      'push',
      PUNCH_CONTEXT,
    );

    expect(
      next.events.some(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toBe(false);
    const rejection = next.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    expect(rejection?.payload as IPhysicalAttackResolvedPayload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetNotMek',
    });
  });

  it('rejects push declarations when the target is not directly ahead', () => {
    const session = buildPhysicalSession({ q: 0, r: 1 });

    const next = declarePhysicalAttack(
      session,
      'attacker',
      'target',
      'push',
      PUNCH_CONTEXT,
    );

    expect(
      next.events.some(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toBe(false);
    const rejection = next.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    expect(rejection?.payload as IPhysicalAttackResolvedPayload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetNotDirectlyAhead',
    });
  });

  it('rejects push declarations when either attacker arm is missing', () => {
    const session = buildPhysicalSession({ q: 1, r: 0 }, UnitType.BATTLEMECH, [
      'right_arm',
    ]);

    const next = declarePhysicalAttack(
      session,
      'attacker',
      'target',
      'push',
      PUNCH_CONTEXT,
    );

    expect(
      next.events.some(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toBe(false);
    const rejection = next.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    expect(rejection?.payload as IPhysicalAttackResolvedPayload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'LimbMissing',
    });
  });

  it('rejects push declarations against represented building occupants', () => {
    const session = buildPhysicalSession({ q: 1, r: 0 });

    const next = declarePhysicalAttack(session, 'attacker', 'target', 'push', {
      ...PUNCH_CONTEXT,
      terrainContext: {
        attackerInBuilding: false,
        targetInBuilding: true,
      },
    });

    expect(
      next.events.some(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toBe(false);
    const rejection = next.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    expect(rejection?.payload as IPhysicalAttackResolvedPayload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetInsideBuilding',
    });
  });
});
