import {
  Facing,
  GameEventType,
  GameSide,
  MovementType,
  UnitType,
  physicalPhaseSession,
  scriptedDice,
  physicalContext,
  adjacentPhysicalGrid,
  withUnitState,
  withPhysicalPositions,
  declareAdjacentPhysicalAttack,
  declarePhysicalAttack,
  resolveAllPhysicalAttacks,
  type IPhysicalAttackDeclaredPayload,
  type IPhysicalAttackResolvedPayload,
} from './battlemechPhysicalCombat.behavior.test-helpers';

describe('BattleMech physical combat behavior validation lane', () => {
  it('rejects self-targeted physical declarations before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      physicalPhaseSession(),
      'attacker',
      'attacker',
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
      targetId: 'attacker',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'SelfTarget',
    });
  });

  it('rejects friendly physical declarations before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        {},
        { side: GameSide.Player },
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
      location: 'FriendlyTarget',
    });
  });

  it('rejects side-adjacent push declarations before scheduling resolution', () => {
    let session = withUnitState(physicalPhaseSession(), 'attacker', {
      position: { q: 0, r: 0 },
      facing: Facing.North,
    });
    session = withUnitState(session, 'target', {
      position: { q: 1, r: 0 },
    });
    const rejected = declarePhysicalAttack(
      session,
      'attacker',
      'target',
      'push',
      physicalContext({ pushDestinationValid: true }),
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
      location: 'TargetNotDirectlyAhead',
    });
  });

  it('resolves stale charge declarations after backward movement as invalid events', () => {
    const context = physicalContext({
      hexesMoved: 5,
      attackerRanThisTurn: true,
    });
    const declared = declareAdjacentPhysicalAttack('charge', context, {
      movementThisTurn: MovementType.Run,
      hexesMovedThisTurn: 5,
    });
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'attacker', { movedBackwardThisTurn: true }),
      new Map([['attacker', context]]),
      scriptedDice([6, 6]),
      adjacentPhysicalGrid(),
    );
    const payload = resolved.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(payload).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'ChargeBackwardMovement',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('resolves stale charge declarations after jump movement as invalid events', () => {
    const context = physicalContext({
      hexesMoved: 5,
      attackerRanThisTurn: true,
    });
    const declared = declareAdjacentPhysicalAttack('charge', context, {
      movementThisTurn: MovementType.Run,
      hexesMovedThisTurn: 5,
    });
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'attacker', {
        movementThisTurn: MovementType.Jump,
      }),
      new Map([['attacker', context]]),
      scriptedDice([6, 6]),
      adjacentPhysicalGrid(),
    );
    const payload = resolved.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(payload).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'ChargeJumpMovement',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('ignores helper-only physical weapon modifier ids before declaration', () => {
    const session = physicalPhaseSession();
    const afterHelperOnly = declarePhysicalAttack(
      session,
      'attacker',
      'target',
      'talons',
      physicalContext(),
    );

    expect(afterHelperOnly).toBe(session);
    expect(
      afterHelperOnly.events.filter(
        (event) =>
          event.type === GameEventType.PhysicalAttackDeclared ||
          event.type === GameEventType.PhysicalAttackResolved,
      ),
    ).toHaveLength(0);
  });

  it('preserves charge movement and target movement modifiers during resolution', () => {
    const declared = declareAdjacentPhysicalAttack(
      'charge',
      physicalContext({
        hexesMoved: 5,
        attackerRanThisTurn: true,
        attackerMovementModifier: 1,
        targetMovementModifier: 2,
      }),
    );

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([
        [
          'attacker',
          physicalContext({
            hexesMoved: 5,
            attackerRanThisTurn: true,
            attackerMovementModifier: 1,
            targetMovementModifier: 2,
          }),
        ],
      ]),
      scriptedDice([3, 4]),
    );

    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;

    expect(payload.toHitNumber).toBe(8);
    expect(payload.roll).toBe(7);
    expect(payload.hit).toBe(false);
    expect(
      resolved.events.some(
        (entry) => entry.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('hydrates target evasion into event-sourced physical declaration and resolution', () => {
    const declared = declareAdjacentPhysicalAttack(
      'kick',
      physicalContext(),
      {},
      { isEvading: true },
    );

    const declaration = declared.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackDeclared,
    );
    const declaredPayload =
      declaration?.payload as IPhysicalAttackDeclaredPayload;

    expect(declaredPayload).toMatchObject({
      attackType: 'kick',
      toHitNumber: 4,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', physicalContext()]]),
      scriptedDice([3]),
    );
    const resolution = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const resolvedPayload =
      resolution?.payload as IPhysicalAttackResolvedPayload;

    expect(resolvedPayload).toMatchObject({
      attackType: 'kick',
      roll: 6,
      toHitNumber: 4,
      hit: true,
    });
  });

  it('preserves DFA Battle Armor target-class to-hit modifiers during resolution', () => {
    const declared = declareAdjacentPhysicalAttack(
      'dfa',
      physicalContext({
        attackerJumpedThisTurn: true,
        hexesMoved: 4,
      }),
      {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
      },
      { unitType: UnitType.BATTLE_ARMOR },
    );

    const event = declared.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = event?.payload as IPhysicalAttackDeclaredPayload;

    expect(payload).toMatchObject({
      attackType: 'dfa',
      toHitNumber: 6,
    });
  });

  it('preserves DFA piloting skill differential during declaration', () => {
    const declared = declareAdjacentPhysicalAttack(
      'dfa',
      physicalContext({
        pilotingSkill: 5,
        attackerJumpedThisTurn: true,
        hexesMoved: 4,
      }),
      {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
      },
      { piloting: 3 },
    );

    const event = declared.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = event?.payload as IPhysicalAttackDeclaredPayload;

    expect(payload).toMatchObject({
      attackType: 'dfa',
      toHitNumber: 7,
    });
  });
});
