import {
  GameEventType,
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
  it('resolves stale physical declarations against ejected targets as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'target', { hasEjected: true }),
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
      location: 'TargetEjected',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects passenger physical targets before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {}, { isPassenger: true }),
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
      location: 'TargetPassenger',
    });
  });

  it('resolves stale physical declarations against passenger targets as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'target', { isPassenger: true }),
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
      location: 'TargetPassenger',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects swarming physical targets before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {}, { isSwarming: true }),
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
      location: 'TargetSwarming',
    });
  });

  it('resolves stale physical declarations against swarming targets as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'target', { isSwarming: true }),
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
      location: 'TargetSwarming',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects targets making DFA before scheduling physical resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {}, { isMakingDFA: true }),
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
      location: 'TargetMakingDFA',
    });
  });

  it('rejects charge targets making displacement attacks before scheduling physical resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        {},
        { isMakingDisplacementAttack: true },
      ),
      'attacker',
      'target',
      'charge',
      physicalContext({ attackerRanThisTurn: true }),
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
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetMakingDisplacementAttack',
    });
  });

  it('resolves stale DFA declarations against targets owned by another displacement attacker as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack(
      'dfa',
      physicalContext({ attackerJumpedThisTurn: true }),
    );
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'target', {
        targetedByDisplacementAttackerId: 'other-attacker',
      }),
      new Map([
        ['attacker', physicalContext({ attackerJumpedThisTurn: true })],
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
      location: 'TargetOfDisplacementAttack',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('resolves stale DFA declarations against DropShip targets as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack(
      'dfa',
      physicalContext({ attackerJumpedThisTurn: true }),
    );
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'target', { unitType: UnitType.DROPSHIP }),
      new Map([
        ['attacker', physicalContext({ attackerJumpedThisTurn: true })],
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
      location: 'TargetDropShip',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects push targets making non-push displacement attacks before scheduling physical resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        {},
        { isMakingDisplacementAttack: true },
      ),
      'attacker',
      'target',
      'push',
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
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetMakingDisplacementAttack',
    });
  });
});
