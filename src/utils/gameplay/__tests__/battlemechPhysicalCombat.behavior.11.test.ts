import {
  GameEventType,
  MovementType,
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
  it('resolves stale push declarations by attackers targeted by another displacement attacker as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack(
      'push',
      physicalContext(),
      {},
      {},
    );
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'attacker', {
        targetedByDisplacementAttackerId: 'other-attacker',
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
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'AttackerTargetOfDisplacementAttack',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('resolves stale physical declarations against targets making DFA as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'target', { isMakingDFA: true }),
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
      location: 'TargetMakingDFA',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects physical targets inside another building before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        {},
        { occupiedBuildingId: 'building-east' },
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
      location: 'TargetInsideBuilding',
    });
  });

  it('resolves stale physical declarations against targets inside another building as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'target', {
        occupiedBuildingId: 'building-east',
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
      location: 'TargetInsideBuilding',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects airborne physical targets before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {}, { isAirborne: true }),
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
      location: 'TargetAirborne',
    });
  });

  it('resolves stale physical declarations against airborne targets as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'target', { isAirborne: true }),
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
      location: 'TargetAirborne',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects unreachable airborne VTOL DFA declarations before scheduling resolution', () => {
    const context = physicalContext({
      attackerJumpedThisTurn: true,
      attackerJumpMP: 3,
      elevationDifference: 5,
    });
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        {
          movementThisTurn: MovementType.Jump,
          hexesMovedThisTurn: 4,
        },
        {
          isAirborne: true,
          unitType: UnitType.VTOL,
        },
      ),
      'attacker',
      'target',
      'dfa',
      context,
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
      location: 'ElevationMismatch',
    });
  });

  it('resolves stale DFA declarations against unreachable airborne VTOL targets as invalid events', () => {
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
        unitType: UnitType.VTOL,
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
      location: 'ElevationMismatch',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });
});
