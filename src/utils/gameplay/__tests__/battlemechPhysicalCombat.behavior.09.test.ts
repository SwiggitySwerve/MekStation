import {
  GameEventType,
  MovementType,
  physicalPhaseSession,
  scriptedDice,
  physicalContext,
  withUnitState,
  withPhysicalPositions,
  withoutUnitState,
  declareAdjacentPhysicalAttack,
  declarePhysicalAttack,
  resolveAllPhysicalAttacks,
  type IPhysicalAttackResolvedPayload,
} from './battlemechPhysicalCombat.behavior.test-helpers';

describe('BattleMech physical combat behavior validation lane', () => {
  it('rejects missing physical targets before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      physicalPhaseSession(),
      'attacker',
      'missing-target',
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
      targetId: 'missing-target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetMissing',
    });
  });

  it('rejects explicit non-unit physical target declarations before scheduling resolution', () => {
    const cases = [
      {
        attackType: 'kick',
        targetObjectType: 'hexClear',
        expectedLocation: 'InvalidPhysicalTarget',
      },
      {
        attackType: 'push',
        targetObjectType: 'building',
        expectedLocation: 'TargetBuilding',
      },
      {
        attackType: 'charge',
        targetObjectType: 'building',
        expectedLocation: 'InvalidPhysicalTarget',
      },
      {
        attackType: 'dfa',
        targetObjectType: 'fuelTank',
        expectedLocation: 'InvalidPhysicalTarget',
      },
    ] as const;

    for (const { attackType, expectedLocation, targetObjectType } of cases) {
      const rejected = declarePhysicalAttack(
        physicalPhaseSession(),
        'attacker',
        `${targetObjectType}-target`,
        attackType,
        physicalContext({ targetObjectType }),
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
        targetId: `${targetObjectType}-target`,
        attackType,
        roll: 0,
        toHitNumber: Infinity,
        hit: false,
        location: expectedLocation,
      });
    }
  });

  it('resolves stale physical declarations against missing targets as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const resolved = resolveAllPhysicalAttacks(
      withoutUnitState(declared, 'target'),
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
      location: 'TargetMissing',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('resolves stale physical declarations against explicit non-unit target context as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack(
      'charge',
      physicalContext({ attackerRanThisTurn: true, hexesMoved: 5 }),
      { movementThisTurn: MovementType.Run, hexesMovedThisTurn: 5 },
    );
    const resolved = resolveAllPhysicalAttacks(
      withoutUnitState(declared, 'target'),
      new Map([
        [
          'attacker',
          physicalContext({
            attackerRanThisTurn: true,
            hexesMoved: 5,
            targetObjectType: 'building',
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
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'InvalidPhysicalTarget',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects destroyed physical targets before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {}, { destroyed: true }),
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
      location: 'TargetDestroyed',
    });
  });

  it('resolves stale physical declarations against destroyed targets as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'target', { destroyed: true }),
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
      location: 'TargetDestroyed',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects retreated physical targets before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {}, { hasRetreated: true }),
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
      location: 'TargetRetreated',
    });
  });

  it('resolves stale physical declarations against retreated targets as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'target', { hasRetreated: true }),
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
      location: 'TargetRetreated',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects ejected physical targets before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {}, { hasEjected: true }),
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
      location: 'TargetEjected',
    });
  });
});
