import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  GameEventType,
  GameSide,
  type IAttackDeclaredPayload,
  type IGameConfig,
  type IGameSession,
  type IGameUnit,
  type IWeaponAttack,
  MovementType,
  RangeBracket,
} from '@/types/gameplay';

import {
  addC3Network,
  createC3MasterSlaveNetwork,
  createC3Unit,
  createEmptyC3State,
} from '../c3Network';
import { buildDefaultComponentDamageState } from '../gameSessionAttackResolutionHelpers';
import {
  advancePhase,
  createGameSession,
  declareAttack,
  rollInitiative,
  startGame,
} from '../gameSessionCore';

function buildConfig(): IGameConfig {
  return {
    mapRadius: 5,
    turnLimit: 0,
    victoryConditions: ['elimination'],
    optionalRules: [],
  } as IGameConfig;
}

function buildUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'attacker',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-1',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
    {
      id: 'target',
      name: 'Hunchback',
      side: GameSide.Opponent,
      unitRef: 'hbk-4g',
      pilotRef: 'pilot-2',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
  ];
}

function buildMediumLaserAttack(): readonly IWeaponAttack[] {
  return [
    {
      weaponId: 'medium-laser-1',
      weaponName: 'Medium Laser',
      damage: 5,
      heat: 3,
      minRange: 0,
      shortRange: 3,
      mediumRange: 6,
      longRange: 9,
    } as unknown as IWeaponAttack,
  ];
}

function buildSemiGuidedLRMAttack(): readonly IWeaponAttack[] {
  return [
    {
      weaponId: 'lrm-10-1',
      weaponName: 'LRM 10',
      ammoType: 'semi-guided-lrm-10',
      damage: 10,
      heat: 4,
      minRange: 6,
      shortRange: 7,
      mediumRange: 14,
      longRange: 21,
    } as unknown as IWeaponAttack,
  ];
}

function setupWeaponAttackSession(): IGameSession {
  let session = createGameSession(buildConfig(), buildUnits());
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session);
  session = advancePhase(session);
  return advancePhase(session);
}

function latestAttackDeclaredPayload(
  session: IGameSession,
): IAttackDeclaredPayload {
  const event = session.events.find(
    (candidate) => candidate.type === GameEventType.AttackDeclared,
  );
  if (!event) throw new Error('AttackDeclared event not found');
  return event.payload as IAttackDeclaredPayload;
}

describe('declareAttack to-hit state hydration', () => {
  it('threads explicit target sprinted state into declared to-hit modifiers', () => {
    const session = setupWeaponAttackSession();
    const hydratedSession: IGameSession = {
      ...session,
      currentState: {
        ...session.currentState,
        units: {
          ...session.currentState.units,
          target: {
            ...session.currentState.units.target,
            sprintedThisTurn: true,
          },
        },
      },
    };

    const result = declareAttack(
      hydratedSession,
      'attacker',
      'target',
      buildMediumLaserAttack(),
      3,
      RangeBracket.Short,
    );

    const payload = latestAttackDeclaredPayload(result);
    expect(payload.toHitNumber).toBe(3);
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Target Sprinted',
          value: -1,
          source: 'target_movement',
        }),
      ]),
    );
  });

  it('threads semi-guided TAG target movement cancellation into declared to-hit modifiers', () => {
    const session = setupWeaponAttackSession();
    const hydratedSession: IGameSession = {
      ...session,
      currentState: {
        ...session.currentState,
        units: {
          ...session.currentState.units,
          target: {
            ...session.currentState.units.target,
            movementThisTurn: MovementType.Walk,
            hexesMovedThisTurn: 5,
            tagDesignated: true,
          },
        },
      },
    };

    const result = declareAttack(
      hydratedSession,
      'attacker',
      'target',
      buildSemiGuidedLRMAttack(),
      7,
      RangeBracket.Short,
    );

    const payload = latestAttackDeclaredPayload(result);
    expect(payload.toHitNumber).toBe(4);
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Target Movement (TMM)',
          value: 2,
          source: 'target_movement',
        }),
        expect.objectContaining({
          name: 'Semi-guided TAG target movement',
          value: -2,
          source: 'equipment',
        }),
      ]),
    );
  });

  it('threads semi-guided TAG indirect-fire relief into declared to-hit modifiers', () => {
    const session = setupWeaponAttackSession();
    const hydratedSession: IGameSession = {
      ...session,
      currentState: {
        ...session.currentState,
        units: {
          ...session.currentState.units,
          target: {
            ...session.currentState.units.target,
            tagDesignated: true,
          },
        },
      },
    };

    const result = declareAttack(
      hydratedSession,
      'attacker',
      'target',
      buildSemiGuidedLRMAttack(),
      7,
      RangeBracket.Short,
      {
        permitted: true,
        isIndirect: true,
        basis: 'los',
        spotterId: 'spotter-1',
        toHitPenalty: 1,
      },
    );

    const payload = latestAttackDeclaredPayload(result);
    expect(payload.toHitNumber).toBe(4);
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Semi-guided TAG indirect fire',
          value: -1,
          source: 'equipment',
        }),
        expect.objectContaining({
          name: 'Indirect fire',
          value: 1,
          source: 'other',
        }),
      ]),
    );
  });
});
