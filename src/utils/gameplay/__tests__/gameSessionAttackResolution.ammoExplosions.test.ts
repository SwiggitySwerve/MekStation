import type { IWeapon } from '@/simulation/ai/types';

import { applyCritAmmoExplosions } from '@/simulation/runner/phases/weaponAttackAmmoExplosions';
import {
  CombatLocation,
  GameEventType,
  GamePhase,
  GameSide,
  Facing,
  MovementType,
  RangeBracket,
  IAmmoExplosionPayload,
  IDamageAppliedPayload,
  IGameEvent,
  IGameConfig,
  IGameSession,
  IGameState,
  IGameUnit,
  IHexCoordinate,
  IWeaponAttack,
} from '@/types/gameplay';

import type { IResolveDamageResult } from '../damage';

import {
  buildCriticalSlotManifest,
  type CriticalHitEvent,
} from '../criticalHitResolution';
import { createDamageAppliedEvent } from '../gameEvents';
import {
  advancePhase,
  appendEvent,
  createGameSession,
  declareAttack,
  declareMovement,
  lockAttack,
  lockMovement,
  resolveAllAttacks,
  rollInitiative,
  startGame,
  type DiceRoller,
} from '../gameSession';
import { createDiceRoll } from '../hitLocation';

function config(): IGameConfig {
  return {
    mapRadius: 10,
    turnLimit: 0,
    victoryConditions: ['elimination'],
    optionalRules: [],
  };
}

const targetAmmoBins = [
  {
    binId: 'target-ct-ac20',
    weaponType: 'AC/20',
    location: 'center_torso',
    maxRounds: 5,
    damagePerRound: 20,
    isExplosive: true,
  },
  {
    binId: 'target-lt-ac20',
    weaponType: 'AC/20',
    location: 'left_torso',
    maxRounds: 5,
    damagePerRound: 20,
    isExplosive: true,
  },
  {
    binId: 'target-rt-ac20',
    weaponType: 'AC/20',
    location: 'right_torso',
    maxRounds: 5,
    damagePerRound: 20,
    isExplosive: true,
  },
] as const;

const targetAmmoBinByLocation = Object.fromEntries(
  targetAmmoBins.map((bin) => [bin.location, bin]),
) as Record<string, (typeof targetAmmoBins)[number]>;

function ammoSlotFor(binId: string) {
  return {
    slotIndex: 0,
    componentType: 'ammo' as const,
    componentName: 'AC/20 Ammo',
    ammoBinId: binId,
    destroyed: false,
  };
}

function units(): readonly IGameUnit[] {
  return [
    {
      id: 'attacker',
      name: 'Attacker',
      side: GameSide.Player,
      unitRef: 'attacker',
      pilotRef: 'pilot-1',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'target',
      name: 'Target',
      side: GameSide.Opponent,
      unitRef: 'target',
      pilotRef: 'pilot-2',
      gunnery: 4,
      piloting: 5,
      ammoConstruction: targetAmmoBins,
      caseProtection: {
        center_torso: 'case',
        left_torso: 'case',
        right_torso: 'case',
      },
      criticalSlotManifest: buildCriticalSlotManifest({
        center_torso: [ammoSlotFor('target-ct-ac20')],
        left_torso: [ammoSlotFor('target-lt-ac20')],
        right_torso: [ammoSlotFor('target-rt-ac20')],
      }),
    },
  ];
}

function advanceToWeaponAttack(session: IGameSession): IGameSession {
  let currentSession = rollInitiative(session);
  currentSession = advancePhase(currentSession);

  const attackerFrom: IHexCoordinate = { q: 0, r: 0 };
  const targetFrom: IHexCoordinate = { q: 2, r: 0 };
  currentSession = declareMovement(
    currentSession,
    'attacker',
    attackerFrom,
    { q: 1, r: 0 },
    Facing.North,
    MovementType.Walk,
    1,
    1,
  );
  currentSession = lockMovement(currentSession, 'attacker');
  currentSession = declareMovement(
    currentSession,
    'target',
    targetFrom,
    { q: 2, r: 0 },
    Facing.South,
    MovementType.Stationary,
    0,
    0,
  );
  currentSession = lockMovement(currentSession, 'target');
  return advancePhase(currentSession);
}

function primeTargetStructure(session: IGameSession): IGameSession {
  let currentSession = session;
  for (const [location, structureRemaining] of [
    ['center_torso', 31],
    ['left_torso', 21],
    ['right_torso', 21],
  ] as const) {
    currentSession = appendEvent(
      currentSession,
      createDamageAppliedEvent({
        gameId: currentSession.id,
        sequence: currentSession.events.length,
        turn: currentSession.currentState.turn,
        phase: GamePhase.WeaponAttack,
        unitId: 'target',
        location,
        damage: 0,
        armorRemaining: 0,
        structureRemaining,
        locationDestroyed: false,
      }),
    );
  }
  return currentSession;
}

function scriptedRoller(): DiceRoller {
  const rolls = [
    createDiceRoll(6, 6), // attack roll hits
    createDiceRoll(1, 1), // TAC hit location: torso by firing arc
    createDiceRoll(4, 1), // critical determination d6 #1
    createDiceRoll(4, 1), // critical determination d6 #2 => total 8, one crit
    createDiceRoll(1, 1), // critical slot d6 #1
    createDiceRoll(1, 1), // critical slot d6 #2 => slot 0
  ];
  let index = 0;
  return () => rolls[index++] ?? createDiceRoll(6, 6);
}

function runnerCritExplosionSummary(
  sourceState: IGameState,
  location: CombatLocation,
  bin: (typeof targetAmmoBins)[number],
  preExplosionDamage: IDamageAppliedPayload,
) {
  const events: IGameEvent[] = [];
  const target = sourceState.units.target;
  const runnerState: IGameState = {
    ...sourceState,
    units: {
      ...sourceState.units,
      target: {
        ...target,
        armor: {
          ...target.armor,
          [location]: preExplosionDamage.armorRemaining,
        },
        structure: {
          ...target.structure,
          [location]: preExplosionDamage.structureRemaining,
        },
        ammoState: {
          ...target.ammoState,
          [bin.binId]: {
            ...target.ammoState?.[bin.binId],
            ...bin,
            remainingRounds: bin.maxRounds,
          },
        },
      },
    },
  };
  const targetWeapon: IWeapon = {
    id: `${bin.weaponType}-0`,
    name: bin.weaponType,
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: bin.damagePerRound,
    heat: 7,
    minRange: 0,
    ammoPerTon: bin.maxRounds,
    destroyed: false,
  };
  const criticalEvents: CriticalHitEvent[] = [
    {
      type: 'critical_hit_resolved',
      payload: {
        unitId: 'target',
        location,
        componentType: 'ammo',
        componentName: 'AC/20 Ammo',
        slotIndex: 0,
        ammoBinId: bin.binId,
        effect: 'Ammo destroyed',
        destroyed: true,
      },
    },
  ];
  const damageResult = {
    state: runnerState.units.target,
    result: {
      locationDamages: [],
      criticalHits: [],
      unitDestroyed: false,
    },
    criticalEvents,
  } as unknown as IResolveDamageResult;

  const result = applyCritAmmoExplosions({
    currentState: runnerState,
    events,
    gameId: runnerState.gameId,
    unitId: 'attacker',
    targetId: 'target',
    damageResult,
    d6Roller: () => 6,
    weaponsByUnit: new Map<string, readonly IWeapon[]>([
      ['target', [targetWeapon]],
    ]),
    critUnitDestroyed: false,
    critDestructionCause: undefined,
  });

  const explosion = events.find(
    (event) => event.type === GameEventType.AmmoExplosion,
  )?.payload as IAmmoExplosionPayload | undefined;
  const damage = events
    .filter((event) => event.type === GameEventType.DamageApplied)
    .map((event) => event.payload as IDamageAppliedPayload);

  return {
    explosion: explosion
      ? {
          location: explosion.location,
          binId: explosion.binId,
          damage: explosion.damage,
          caseProtection: explosion.caseProtection,
          source: explosion.source,
        }
      : undefined,
    damage: damage.map((payload) => ({
      location: payload.location,
      damage: payload.damage,
      structureRemaining: payload.structureRemaining,
      locationDestroyed: payload.locationDestroyed,
    })),
    transferCount: events.filter(
      (event) => event.type === GameEventType.TransferDamage,
    ).length,
    pilotHitCount: events.filter(
      (event) => event.type === GameEventType.PilotHit,
    ).length,
    remainingRounds:
      result.currentState.units.target.ammoState?.[bin.binId].remainingRounds,
    destroyedLocations: result.currentState.units.target.destroyedLocations,
  };
}

describe('interactive attack critical ammo explosions', () => {
  it('applies loaded ammo-bin explosion damage through the live resolveAttack path', () => {
    let session = createGameSession(config(), units());
    session = startGame(session, GameSide.Player);
    session = advanceToWeaponAttack(session);
    session = primeTargetStructure(session);

    const attack: IWeaponAttack[] = [
      {
        weaponId: 'medium-laser-1',
        weaponName: 'Medium Laser',
        damage: 5,
        heat: 3,
        category: 'energy' as never,
        minRange: 0,
        shortRange: 3,
        mediumRange: 6,
        longRange: 9,
        isCluster: false,
      },
    ];
    session = declareAttack(
      session,
      'attacker',
      'target',
      attack,
      2,
      RangeBracket.Short,
    );
    session = lockAttack(session, 'attacker');
    session = lockAttack(session, 'target');

    const next = resolveAllAttacks(session, scriptedRoller());

    const explosion = next.events.find(
      (event) => event.type === GameEventType.AmmoExplosion,
    );
    expect(explosion?.phase).toBe(GamePhase.WeaponAttack);
    const explosionPayload = explosion?.payload as IAmmoExplosionPayload;
    expect(explosionPayload).toMatchObject({
      unitId: 'target',
      weaponType: 'AC/20',
      roundsDestroyed: 5,
      damage: 100,
      caseProtection: 'case',
      source: 'CritInduced',
    });
    const explodedBin = targetAmmoBinByLocation[explosionPayload.location];
    expect(explodedBin).toBeDefined();
    expect(explosionPayload.binId).toBe(explodedBin.binId);

    const explosionIndex = next.events.findIndex(
      (event) => event.type === GameEventType.AmmoExplosion,
    );
    const preExplosionDamage = next.events
      .slice(0, explosionIndex)
      .reverse()
      .find(
        (event) =>
          event.type === GameEventType.DamageApplied &&
          (event.payload as IDamageAppliedPayload).unitId === 'target' &&
          (event.payload as IDamageAppliedPayload).location ===
            explosionPayload.location,
      )?.payload as IDamageAppliedPayload | undefined;
    expect(preExplosionDamage).toBeDefined();
    const damageAfterExplosion = next.events
      .slice(explosionIndex + 1)
      .filter((event) => event.type === GameEventType.DamageApplied)
      .map((event) => event.payload as IDamageAppliedPayload);
    expect(damageAfterExplosion).toEqual([
      expect.objectContaining({
        location: explosionPayload.location,
        damage: expect.any(Number),
        armorRemaining: 0,
        structureRemaining: 0,
        locationDestroyed: true,
      }),
    ]);
    expect(damageAfterExplosion[0].damage).toBeGreaterThan(0);
    expect(
      next.events.some((event) => event.type === GameEventType.TransferDamage),
    ).toBe(false);
    expect(
      next.events.some((event) => event.type === GameEventType.PilotHit),
    ).toBe(false);
    expect(
      next.currentState.units.target.ammoState?.[explodedBin.binId]
        .remainingRounds,
    ).toBe(0);
    expect(
      next.currentState.units.target.criticalSlotManifest?.[
        explosionPayload.location
      ][0].destroyed,
    ).toBe(true);
    expect(next.currentState.units.target.destroyedLocations).toContain(
      explosionPayload.location,
    );

    const interactiveSummary = {
      explosion: {
        location: explosionPayload.location,
        binId: explosionPayload.binId,
        damage: explosionPayload.damage,
        caseProtection: explosionPayload.caseProtection,
        source: explosionPayload.source,
      },
      damage: damageAfterExplosion.map((payload) => ({
        location: payload.location,
        damage: payload.damage,
        structureRemaining: payload.structureRemaining,
        locationDestroyed: payload.locationDestroyed,
      })),
      transferCount: next.events.filter(
        (event) => event.type === GameEventType.TransferDamage,
      ).length,
      pilotHitCount: next.events.filter(
        (event) => event.type === GameEventType.PilotHit,
      ).length,
      remainingRounds:
        next.currentState.units.target.ammoState?.[explodedBin.binId]
          .remainingRounds,
      destroyedLocations: next.currentState.units.target.destroyedLocations,
    };
    expect(
      runnerCritExplosionSummary(
        session.currentState,
        explosionPayload.location as CombatLocation,
        explodedBin,
        preExplosionDamage!,
      ),
    ).toEqual(interactiveSummary);
  });
});
