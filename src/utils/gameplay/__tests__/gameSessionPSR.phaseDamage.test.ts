import { WeaponCategory } from '@/types/equipment/weapons/interfaces';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  MovementType,
  PSRTrigger,
  RangeBracket,
  type IGameSession,
  type IPSRTriggeredPayload,
} from '@/types/gameplay';

import {
  createDamageAppliedEvent,
  createPSRTriggeredEvent,
} from '../gameEvents';
import { resolveAllAttacks } from '../gameSessionAttackResolution';
import {
  advancePhase,
  appendEvent,
  createGameSession,
  declareAttack,
  declareMovement,
  startGame,
} from '../gameSessionCore';
import { checkAndQueueDamagePSRs } from '../gameSessionPSR';
import { resolvePendingPSRs } from '../gameSessionPSRResolution';
import { createDiceRoll } from '../hitLocation';

function weaponPhase(): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 10,
      turnLimit: 10,
      victoryConditions: ['destruction'],
      optionalRules: [],
    },
    ['attacker', 'target', 'control'].map((id) => ({
      id,
      name: id,
      side: id === 'attacker' ? GameSide.Player : GameSide.Opponent,
      unitRef: id,
      pilotRef: id,
      gunnery: 4,
      piloting: 5,
    })),
  );
  session = advancePhase(startGame(session, GameSide.Player));
  session = declareMovement(
    session,
    'attacker',
    session.currentState.units.attacker.position,
    { q: 0, r: 0 },
    Facing.North,
    MovementType.Stationary,
    0,
    0,
  );
  session = declareMovement(
    session,
    'target',
    { q: 0, r: 0 },
    { q: 0, r: -2 },
    Facing.South,
    MovementType.Stationary,
    0,
    0,
  );
  return advancePhase(session);
}

function damage(
  session: IGameSession,
  unitId: string,
  amount: number,
): IGameSession {
  return appendEvent(
    session,
    createDamageAppliedEvent({
      gameId: session.id,
      sequence: session.events.length,
      turn: session.currentState.turn,
      phase: session.currentState.phase,
      unitId,
      location: 'center_torso',
      damage: amount,
      armorRemaining: 100,
      structureRemaining: 30,
      locationDestroyed: false,
    }),
  );
}

function thresholds(session: IGameSession) {
  return session.events.filter(
    (event) =>
      event.type === GameEventType.PSRTriggered &&
      (event.payload as IPSRTriggeredPayload).reasonCode ===
        PSRTrigger.PhaseDamage20Plus,
  );
}

describe('phase damage PSR ownership', () => {
  it('queues and rolls exactly once after real attacks cross the threshold', () => {
    let session = damage(weaponPhase(), 'target', 15);
    session = declareAttack(
      session,
      'attacker',
      'target',
      [
        {
          weaponId: 'laser',
          weaponName: 'Medium Laser',
          damage: 5,
          heat: 3,
          category: WeaponCategory.ENERGY,
          minRange: 0,
          shortRange: 3,
          mediumRange: 6,
          longRange: 9,
          isCluster: false,
        },
      ],
      2,
      RangeBracket.Short,
    );
    session = resolveAllAttacks(session, () => createDiceRoll(3, 4));
    expect(session.currentState.units.target.damageThisPhase).toBe(20);
    session = checkAndQueueDamagePSRs(session);
    expect(thresholds(session)).toHaveLength(1);
    expect(session.currentState.units.target.pendingPSRs).toHaveLength(1);
    expect(session.currentState.units.control.pendingPSRs ?? []).toHaveLength(
      0,
    );
    const roller = jest.fn(() => createDiceRoll(6, 6));
    session = resolvePendingPSRs(session, roller);
    expect(roller).toHaveBeenCalledTimes(2); // Two d6 draws for one PSR.
    expect(
      session.events.filter(
        (event) => event.type === GameEventType.PSRResolved,
      ),
    ).toHaveLength(1);
  });

  it('keeps qualifying weapon and physical phases separate for the same unit', () => {
    let session = checkAndQueueDamagePSRs(damage(weaponPhase(), 'target', 20));
    session = advancePhase(session);
    expect(session.currentState.phase).toBe(GamePhase.PhysicalAttack);
    session = checkAndQueueDamagePSRs(damage(session, 'target', 20));
    session = checkAndQueueDamagePSRs(session);
    expect(thresholds(session).map((event) => event.phase)).toEqual([
      GamePhase.WeaponAttack,
      GamePhase.PhysicalAttack,
    ]);
    expect(session.currentState.units.target.pendingPSRs).toHaveLength(2);
  });

  it('does not requeue a pending threshold PSR when the same phase is checked twice', () => {
    let session = checkAndQueueDamagePSRs(damage(weaponPhase(), 'target', 20));
    session = checkAndQueueDamagePSRs(session);
    expect(thresholds(session)).toHaveLength(1);
    expect(session.currentState.units.target.pendingPSRs).toHaveLength(1);
  });

  it('preserves under-threshold, other-unit, and unrelated-PSR controls', () => {
    let session = damage(weaponPhase(), 'target', 19);
    session = appendEvent(
      session,
      createPSRTriggeredEvent(
        session.id,
        session.events.length,
        session.currentState.turn,
        GamePhase.WeaponAttack,
        'target',
        'Leg damage',
        0,
        'leg_damage',
        5,
        PSRTrigger.LegDamage,
      ),
    );
    session = checkAndQueueDamagePSRs(session);
    expect(thresholds(session)).toHaveLength(0);
    expect(session.currentState.units.target.pendingPSRs).toHaveLength(1);
    session = checkAndQueueDamagePSRs(damage(session, 'target', 1));
    expect(thresholds(session)).toHaveLength(1);
    expect(
      session.currentState.units.target.pendingPSRs?.map(
        (psr) => psr.reasonCode,
      ),
    ).toEqual([PSRTrigger.LegDamage, PSRTrigger.PhaseDamage20Plus]);
    expect(session.currentState.units.control.pendingPSRs ?? []).toHaveLength(
      0,
    );
  });
});
