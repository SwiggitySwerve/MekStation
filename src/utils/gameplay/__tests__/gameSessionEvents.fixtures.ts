import {
  GameEventType,
  GamePhase,
  GameSide,
  type IGameEvent,
} from '@/types/gameplay';
import { createGameSession } from '@/utils/gameplay/gameSessionCore';

export function makeReconnectHostEvents(): readonly IGameEvent[] {
  const session = createGameSession(
    {
      mapRadius: 4,
      turnLimit: 10,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    [
      {
        id: 'unit-1',
        name: 'Test Mek',
        side: GameSide.Player,
        unitRef: 'test',
        pilotRef: 'pilot-1',
        gunnery: 4,
        piloting: 5,
      },
    ],
    { id: 'match-1' },
  );
  const events = [...session.events];
  const add = (
    type: GameEventType,
    payload: IGameEvent['payload'],
    turn = 1,
  ) => {
    events.push({
      id: `event-${events.length}`,
      gameId: session.id,
      sequence: events.length,
      timestamp: session.events[0].timestamp,
      type,
      turn,
      phase: GamePhase.Heat,
      payload,
    });
  };
  add(GameEventType.GameStarted, { firstSide: GameSide.Player });
  add(GameEventType.InitiativeOrderSet, {
    winner: GameSide.Player,
    firstMover: GameSide.Opponent,
    secondMover: GameSide.Player,
  });
  add(GameEventType.PhaseChanged, {
    fromPhase: GamePhase.Initiative,
    toPhase: GamePhase.Heat,
  });
  add(GameEventType.HeatGenerated, {
    unitId: 'unit-1',
    amount: 5,
    source: 'firing',
    newTotal: 5,
  });
  add(GameEventType.PilotHit, {
    unitId: 'unit-1',
    totalWounds: 1,
    wounds: 1,
    source: 'head_hit',
    consciousnessCheckRequired: false,
  });
  add(GameEventType.PSRTriggered, {
    unitId: 'unit-1',
    reason: 'damage',
    additionalModifier: 0,
    triggerSource: 'damage',
  });
  add(GameEventType.TerrainChanged, {
    hex: { q: 0, r: 0 },
    terrain: 'rubble',
    elevation: 1,
    reason: 'battlefield_wreckage',
  });
  add(GameEventType.MoraleShifted, {
    side: GameSide.Player,
    from: 'STEADY',
    to: 'SHAKEN',
    cause: 'test',
    turn: 1,
  });
  add(GameEventType.CriticalHitResolved, {
    unitId: 'unit-1',
    location: 'center_torso',
    slotIndex: 0,
    componentType: 'engine',
    componentName: 'Engine',
    effect: 'engine_hit',
    destroyed: true,
  });
  add(GameEventType.AMSInterception, {
    defenderId: 'unit-1',
    targetId: 'unit-1',
    attackerId: 'attacker',
    incomingWeaponId: 'lrm',
    resolution: 'cluster-table',
    incomingProjectiles: 5,
    projectilesIntercepted: 1,
    projectilesRemaining: 4,
    ammoConsumed: 1,
    roll: [3, 3],
    amsWeaponId: 'ams-1',
  });
  add(GameEventType.HeatDissipated, {
    unitId: 'unit-1',
    amount: -2,
    source: 'dissipation',
    newTotal: 3,
  });
  add(GameEventType.PSRResolved, {
    unitId: 'unit-1',
    reason: 'damage',
    targetNumber: 5,
    roll: 7,
    modifiers: 0,
    passed: true,
  });
  add(GameEventType.TurnStarted, {}, 2);
  add(
    GameEventType.PhaseChanged,
    { fromPhase: GamePhase.Initiative, toPhase: GamePhase.WeaponAttack },
    2,
  );
  add(
    GameEventType.DamageApplied,
    {
      unitId: 'unit-1',
      location: 'center_torso',
      damage: 3,
      armorRemaining: 7,
      structureRemaining: 10,
      locationDestroyed: false,
    },
    2,
  );
  add(
    GameEventType.AttackResolved,
    {
      targetId: 'unit-1',
      attackerId: 'attacker',
      weaponId: 'laser',
      roll: 8,
      toHitNumber: 7,
      hit: true,
      edgePointsRemaining: 1,
    },
    2,
  );
  add(
    GameEventType.EmpMinefieldEffectApplied,
    { unitId: 'unit-1', effect: 'interference', durationTurns: 2 },
    2,
  );
  add(
    GameEventType.SpottingDeclared,
    { unitId: 'unit-1', targetId: 'target' },
    2,
  );
  add(
    GameEventType.HeatGenerated,
    { unitId: 'unit-1', amount: 4, source: 'firing', newTotal: 7 },
    2,
  );
  return events;
}
