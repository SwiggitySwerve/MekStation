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
  type IPhysicalAttackResolvedPayload,
} from '@/types/gameplay';

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

function buildPhysicalSession(targetPosition: IHexCoordinate): IGameSession {
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
    units: [],
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
          destroyedLocations: [],
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
      location: 'TargetNotInPhysicalRange',
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
});
