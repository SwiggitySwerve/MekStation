import { WeaponCategory } from '@/types/equipment/weapons/interfaces';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  LockState,
  MovementType,
  RangeBracket,
  type IGameSession,
  type IGameUnit,
  type IWeaponAttack,
} from '@/types/gameplay';

import { createPhaseChangedEvent } from '../gameEvents';
import {
  advancePhase,
  appendEvent,
  createGameSession,
  declareAttack,
  declareMovement,
  declarePhysicalAttack,
  lockAttack,
  resolveAllAttacks,
  resolveAllPhysicalAttacks,
  rollInitiative,
  startGame,
} from '../gameSession';
import { lockPhysicalAttack } from '../gameSessionCore';

const physicalContext = {
  attackerTonnage: 55,
  pilotingSkill: 5,
  limb: 'leftArm' as const,
};
const weapon: IWeaponAttack = {
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
};
const miss = () => ({
  dice: [1, 1] as const,
  total: 2,
  isSnakeEyes: true,
  isBoxcars: false,
});

function sessionAt(phase: GamePhase): IGameSession {
  const units: IGameUnit[] = ['attacker', 'other', 'target'].map((id) => ({
    id,
    name: id,
    unitRef: id,
    pilotRef: id,
    gunnery: 4,
    piloting: 5,
    side: id === 'target' ? GameSide.Opponent : GameSide.Player,
    abilities: ['melee_master'],
  }));
  let session = startGame(
    createGameSession(
      { mapRadius: 7, turnLimit: 10, victoryConditions: [], optionalRules: [] },
      units,
    ),
    GameSide.Player,
  );
  session = advancePhase(rollInitiative(session, GameSide.Player, () => 6));
  for (const [id, position] of [
    ['attacker', { q: 0, r: 0 }],
    ['target', { q: 0, r: -1 }],
  ] as const) {
    const unit = session.currentState.units[id];
    session = declareMovement(
      session,
      id,
      unit.position,
      position,
      Facing.North,
      MovementType.Stationary,
      0,
      0,
    );
  }
  session = advancePhase(session);
  return phase === GamePhase.WeaponAttack
    ? session
    : appendEvent(
        session,
        createPhaseChangedEvent(
          session.id,
          session.events.length,
          session.currentState.turn,
          session.currentState.phase,
          phase,
        ),
      );
}

function ranged(
  session: IGameSession,
  attackerId = 'attacker',
  targetId = 'target',
): IGameSession {
  return declareAttack(
    session,
    attackerId,
    targetId,
    [weapon],
    1,
    RangeBracket.Short,
  );
}

function physical(
  session: IGameSession,
  limb: 'leftArm' | 'rightArm' = 'leftArm',
): IGameSession {
  return declarePhysicalAttack(session, 'attacker', 'target', 'punch', {
    ...physicalContext,
    limb,
  });
}

describe('committed declaration admission', () => {
  it.each([LockState.Locked, LockState.Revealed, LockState.Resolved])(
    'refuses ranged retries in %s without any event or state change',
    (lockState) => {
      const locked = lockAttack(
        ranged(sessionAt(GamePhase.WeaponAttack)),
        'attacker',
      );
      locked.currentState.units.attacker = {
        ...locked.currentState.units.attacker,
        lockState,
      };
      const before = JSON.stringify(locked);
      expect(ranged(locked)).toBe(locked);
      expect(ranged(locked, 'attacker', 'missing-target')).toBe(locked);
      expect(JSON.stringify(locked)).toBe(before);
    },
  );

  it.each([LockState.Locked, LockState.Revealed, LockState.Resolved])(
    'refuses physical retries in %s before the existing attack-count refusal',
    (lockState) => {
      const locked = lockPhysicalAttack(
        physical(sessionAt(GamePhase.PhysicalAttack)),
        'attacker',
      );
      expect(locked.currentState.units.attacker.lockState).toBe(
        LockState.Locked,
      );
      locked.currentState.units.attacker = {
        ...locked.currentState.units.attacker,
        lockState,
      };
      const before = JSON.stringify(locked);
      expect(physical(locked, 'rightArm')).toBe(locked);
      expect(JSON.stringify(locked)).toBe(before);
    },
  );

  it('leaves the first ranged declaration to resolve exactly once and other units free to declare', () => {
    const locked = lockAttack(
      ranged(sessionAt(GamePhase.WeaponAttack)),
      'attacker',
    );
    const resolved = resolveAllAttacks(ranged(locked), miss);
    expect(
      resolved.events.filter(
        (event) => event.type === GameEventType.AttackResolved,
      ),
    ).toHaveLength(1);
    const other = ranged(locked, 'other');
    expect(
      other.events.slice(locked.events.length).map((event) => event.type),
    ).toEqual([GameEventType.AttackDeclared]);
    expect(other.currentState.units.attacker.lockState).toBe(LockState.Locked);
  });

  it('leaves the first physical declaration to resolve exactly once', () => {
    const locked = lockPhysicalAttack(
      physical(sessionAt(GamePhase.PhysicalAttack)),
      'attacker',
    );
    const resolved = resolveAllPhysicalAttacks(
      physical(locked, 'rightArm'),
      new Map([['attacker', physicalContext]]),
      miss,
    );
    expect(
      resolved.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackResolved,
      ),
    ).toHaveLength(1);
  });

  it('preserves multiple ranged groups and Melee Master declarations before lock', () => {
    const rangedSession = ranged(ranged(sessionAt(GamePhase.WeaponAttack)));
    expect(
      rangedSession.events.filter(
        (event) => event.type === GameEventType.AttackDeclared,
      ),
    ).toHaveLength(2);
    const physicalSession = physical(
      physical(sessionAt(GamePhase.PhysicalAttack)),
      'rightArm',
    );
    expect(
      physicalSession.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(2);
    const limited = physical(physicalSession);
    expect(limited.events.at(-1)).toMatchObject({
      type: GameEventType.PhysicalAttackResolved,
      payload: { location: 'PhysicalAttackLimitReached' },
    });
  });
});
