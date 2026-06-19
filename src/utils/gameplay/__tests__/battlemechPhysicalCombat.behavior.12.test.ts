import {
  GameEventType,
  MovementType,
  GroundMotionType,
  UnitType,
  physicalPhaseSession,
  scriptedDice,
  physicalContext,
  withUnitState,
  withPhysicalPositions,
  declareAdjacentPhysicalAttack,
  declarePhysicalAttack,
  resolveAllPhysicalAttacks,
  type IPhysicalAttackResolvedPayload,
} from './battlemechPhysicalCombat.behavior.test-helpers';

describe('BattleMech physical combat behavior validation lane', () => {
  it('resolves stale DFA declarations against unreachable airborne WIGE targets from motion type', () => {
    const declared = declareAdjacentPhysicalAttack(
      'dfa',
      physicalContext({
        attackerJumpedThisTurn: true,
        attackerJumpMP: 3,
        elevationDifference: 3,
      }),
      {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
      },
    );
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'target', {
        isAirborne: true,
        unitType: UnitType.VEHICLE,
        motionType: GroundMotionType.WIGE,
      }),
      new Map([
        [
          'attacker',
          physicalContext({
            attackerJumpedThisTurn: true,
            attackerJumpMP: 3,
            elevationDifference: 5,
          }),
        ],
      ]),
      scriptedDice([6, 6, 3]),
    );

    const payload = resolved.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'dfa',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'ElevationMismatch',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects mechanical jump booster DFA declarations from hydrated movement state', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
        usedMechanicalJumpBoosterThisTurn: true,
      }),
      'attacker',
      'target',
      'dfa',
      physicalContext(),
    );

    const declarations = rejected.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'dfa',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'MechanicalJumpBooster',
    });
  });

  it('resolves stale DFA declarations against mechanical jump booster state as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('dfa', physicalContext(), {
      movementThisTurn: MovementType.Jump,
      hexesMovedThisTurn: 4,
    });
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'attacker', {
        usedMechanicalJumpBoosterThisTurn: true,
      }),
      new Map([['attacker', physicalContext()]]),
      scriptedDice([6, 6, 3]),
    );

    const resolvedEvents = resolved.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = resolvedEvents.at(-1)
      ?.payload as IPhysicalAttackResolvedPayload;

    expect(resolvedEvents).toHaveLength(1);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'dfa',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'MechanicalJumpBooster',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects evading physical attackers before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), { isEvading: true }),
      'attacker',
      'target',
      'kick',
      physicalContext(),
    );

    const declarations = rejected.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'AttackerEvading',
    });
  });

  it('resolves stale physical declarations by evading attackers as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'attacker', { isEvading: true }),
      new Map([['attacker', physicalContext()]]),
      scriptedDice([6, 6, 3]),
    );

    const resolvedEvents = resolved.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = resolvedEvents.at(-1)
      ?.payload as IPhysicalAttackResolvedPayload;

    expect(resolvedEvents).toHaveLength(1);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'AttackerEvading',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects cargo-interacting physical attackers before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {
        isLoadingOrUnloadingCargo: true,
      }),
      'attacker',
      'target',
      'kick',
      physicalContext(),
    );

    const declarations = rejected.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'AttackerCargoInteraction',
    });
  });

  it('resolves stale physical declarations by cargo-interacting attackers as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'attacker', {
        isLoadingOrUnloadingCargo: true,
      }),
      new Map([['attacker', physicalContext()]]),
      scriptedDice([6, 6, 3]),
    );

    const resolvedEvents = resolved.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = resolvedEvents.at(-1)
      ?.payload as IPhysicalAttackResolvedPayload;

    expect(resolvedEvents).toHaveLength(1);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'AttackerCargoInteraction',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects different-board physical declarations before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        { boardId: 'board-alpha' },
        { boardId: 'board-beta' },
      ),
      'attacker',
      'target',
      'kick',
      physicalContext(),
    );

    const declarations = rejected.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'DifferentBoard',
    });
  });

  it('resolves stale physical declarations against different-board targets as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const separated = withUnitState(
      withUnitState(declared, 'attacker', { boardId: 'board-alpha' }),
      'target',
      { boardId: 'board-beta' },
    );
    const resolved = resolveAllPhysicalAttacks(
      separated,
      new Map([['attacker', physicalContext()]]),
      scriptedDice([6, 6, 3]),
    );

    const resolvedEvents = resolved.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = resolvedEvents.at(-1)
      ?.payload as IPhysicalAttackResolvedPayload;

    expect(resolvedEvents).toHaveLength(1);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'DifferentBoard',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });
});
