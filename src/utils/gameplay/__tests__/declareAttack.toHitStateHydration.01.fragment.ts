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
  it('threads session-authored C3 network formation into declared direct-fire to-hit', () => {
    const c3Network = createC3MasterSlaveNetwork('session-c3', [
      createC3Unit({
        entityId: 'attacker',
        teamId: GameSide.Player,
        role: 'master',
        position: { q: 99, r: 99 },
      }),
      createC3Unit({
        entityId: 'spotter',
        teamId: GameSide.Player,
        role: 'slave',
        position: { q: 99, r: 99 },
      }),
    ]);

    expect(c3Network).not.toBeNull();

    let session = createGameSession(
      buildConfig(),
      [
        ...buildUnits(),
        {
          id: 'spotter',
          name: 'C3 Spotter',
          side: GameSide.Player,
          unitRef: 'c3-spotter',
          pilotRef: 'pilot-spotter',
          gunnery: 4,
          piloting: 5,
        } as IGameUnit,
      ],
      {
        c3Network: addC3Network(createEmptyC3State(), c3Network!),
      },
    );

    expect(session.currentState.c3Network?.networks).toHaveLength(1);
    session = startGame(session, GameSide.Player);
    session = rollInitiative(session);
    session = advancePhase(session);
    session = advancePhase(session);

    const positionedSession: IGameSession = {
      ...session,
      currentState: {
        ...session.currentState,
        units: {
          ...session.currentState.units,
          attacker: {
            ...session.currentState.units.attacker,
            position: { q: 5, r: 0 },
          },
          spotter: {
            ...session.currentState.units.spotter,
            position: { q: 2, r: 0 },
          },
          target: {
            ...session.currentState.units.target,
            position: { q: 0, r: 0 },
          },
        },
      },
    };

    const result = declareAttack(
      positionedSession,
      'attacker',
      'target',
      buildMediumLaserAttack(),
      5,
      RangeBracket.Medium,
    );

    const payload = latestAttackDeclaredPayload(result);
    expect(payload.toHitNumber).toBe(4);
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Range (short)',
          value: 0,
          source: 'range',
        }),
        expect.objectContaining({
          name: 'C3 Network',
          value: 0,
          source: 'equipment',
        }),
      ]),
    );
    expect(payload.modifiers).not.toContainEqual(
      expect.objectContaining({ name: 'Range (medium)' }),
    );
  });

  it('refreshes session-authored C3 lifecycle state before declared to-hit', () => {
    const c3Network = createC3MasterSlaveNetwork('session-c3', [
      createC3Unit({
        entityId: 'attacker',
        teamId: GameSide.Player,
        role: 'master',
        position: { q: 5, r: 0 },
      }),
      createC3Unit({
        entityId: 'spotter',
        teamId: GameSide.Player,
        role: 'slave',
        position: { q: 2, r: 0 },
      }),
    ]);

    expect(c3Network).not.toBeNull();

    let session = createGameSession(
      buildConfig(),
      [
        ...buildUnits(),
        {
          id: 'spotter',
          name: 'C3 Spotter',
          side: GameSide.Player,
          unitRef: 'c3-spotter',
          pilotRef: 'pilot-spotter',
          gunnery: 4,
          piloting: 5,
        } as IGameUnit,
      ],
      {
        c3Network: addC3Network(createEmptyC3State(), c3Network!),
      },
    );

    session = startGame(session, GameSide.Player);
    session = rollInitiative(session);
    session = advancePhase(session);
    session = advancePhase(session);

    const positionedSession: IGameSession = {
      ...session,
      currentState: {
        ...session.currentState,
        units: {
          ...session.currentState.units,
          attacker: {
            ...session.currentState.units.attacker,
            position: { q: 5, r: 0 },
          },
          spotter: {
            ...session.currentState.units.spotter,
            position: { q: 2, r: 0 },
            destroyed: true,
          },
          target: {
            ...session.currentState.units.target,
            position: { q: 0, r: 0 },
          },
        },
      },
    };

    const result = declareAttack(
      positionedSession,
      'attacker',
      'target',
      buildMediumLaserAttack(),
      5,
      RangeBracket.Medium,
    );

    const payload = latestAttackDeclaredPayload(result);
    expect(payload.toHitNumber).toBe(6);
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Range (medium)',
          value: 2,
          source: 'range',
        }),
      ]),
    );
    expect(payload.modifiers).not.toContainEqual(
      expect.objectContaining({ name: 'C3 Network' }),
    );
  });

  it('threads pilot wounds, sensor hits, actuator damage, and attacker prone state', () => {
    const session = setupWeaponAttackSession();
    const componentDamage = buildDefaultComponentDamageState();
    const hydratedSession: IGameSession = {
      ...session,
      currentState: {
        ...session.currentState,
        units: {
          ...session.currentState.units,
          attacker: {
            ...session.currentState.units.attacker,
            pilotWounds: 1,
            prone: true,
            componentDamage: {
              ...componentDamage,
              sensorHits: 1,
              actuators: { [ActuatorType.UPPER_ARM]: true },
            },
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
    expect(payload.toHitNumber).toBe(9);
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Pilot Wounds',
          value: 1,
          source: 'other',
        }),
        expect.objectContaining({
          name: 'Sensor Damage',
          value: 1,
          source: 'damage',
        }),
        expect.objectContaining({
          name: 'Actuator Damage',
          value: 1,
          source: 'damage',
        }),
        expect.objectContaining({
          name: 'Attacker Prone',
          value: 2,
          source: 'other',
        }),
      ]),
    );
  });
});
