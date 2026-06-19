import {
  GameEventType,
  MovementType,
  UnitType,
  physicalPhaseSession,
  scriptedDice,
  physicalContext,
  withPhysicalPositions,
  declareAdjacentPhysicalAttack,
  declarePhysicalAttack,
  resolveAllPhysicalAttacks,
  type IDamageAppliedPayload,
  type IPhysicalAttackDeclaredPayload,
  type IPhysicalAttackResolvedPayload,
} from './battlemechPhysicalCombat.behavior.test-helpers';

describe('BattleMech physical combat behavior validation lane', () => {
  it('rejects charge declarations against targets that have not completed movement', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      }),
      'attacker',
      'target',
      'charge',
      physicalContext({
        attackerRanThisTurn: true,
        hexesMoved: 5,
        targetMovementComplete: false,
      }),
    );
    const rejection = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = rejection?.payload as IPhysicalAttackResolvedPayload;

    expect(
      rejected.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetMovementIncomplete',
    });
  });

  it('rejects DFA declarations against targets that have not completed movement', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
      }),
      'attacker',
      'target',
      'dfa',
      physicalContext({
        attackerJumpedThisTurn: true,
        hexesMoved: 4,
        targetMovementComplete: false,
      }),
    );
    const rejection = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = rejection?.payload as IPhysicalAttackResolvedPayload;

    expect(
      rejected.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'dfa',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetMovementIncomplete',
    });
  });

  it('allows DFA declarations against immobile targets that have not completed movement', () => {
    const declared = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        {
          movementThisTurn: MovementType.Jump,
          hexesMovedThisTurn: 4,
        },
        { shutdown: true },
      ),
      'attacker',
      'target',
      'dfa',
      physicalContext({
        attackerJumpedThisTurn: true,
        hexesMoved: 4,
        targetMovementComplete: false,
      }),
    );

    expect(
      declared.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(1);
    expect(
      declared.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackResolved,
      ),
    ).toHaveLength(0);
  });

  it('rejects DFA declarations by infantry-family attackers before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
        unitType: UnitType.INFANTRY,
      }),
      'attacker',
      'target',
      'dfa',
      physicalContext({
        attackerJumpedThisTurn: true,
        hexesMoved: 4,
      }),
    );
    const rejection = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = rejection?.payload as IPhysicalAttackResolvedPayload;

    expect(
      rejected.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'dfa',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'AttackerInfantry',
    });
  });

  it('rejects DFA declarations against DropShip targets before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        {
          movementThisTurn: MovementType.Jump,
          hexesMovedThisTurn: 4,
        },
        { unitType: UnitType.DROPSHIP },
      ),
      'attacker',
      'target',
      'dfa',
      physicalContext({
        attackerJumpedThisTurn: true,
        hexesMoved: 4,
      }),
    );
    const rejection = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = rejection?.payload as IPhysicalAttackResolvedPayload;

    expect(
      rejected.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'dfa',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetDropShip',
    });
  });

  it('rejects push declarations after arm-mounted weapons fired', () => {
    const session = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession()),
      'attacker',
      'target',
      'push',
      physicalContext({
        pushDestinationValid: true,
        weaponsFiredFromArm: ['right-arm-medium-laser'],
      }),
    );

    const declarations = session.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const rejection = session.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = rejection?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'WeaponFiredThisTurn',
    });
  });

  it('derives push arm-fire rejection from hydrated attacker weapon locations', () => {
    const session = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {
        weaponsFiredThisTurn: ['medium-laser-0'],
        weaponLocationById: { 'medium-laser-0': 'LEFT_ARM' },
      }),
      'attacker',
      'target',
      'push',
      physicalContext({ pushDestinationValid: true }),
    );

    const declarations = session.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const rejection = session.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = rejection?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'WeaponFiredThisTurn',
    });
  });

  it('does not reject push declarations after hydrated torso-mounted weapon fire', () => {
    const session = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {
        weaponsFiredThisTurn: ['medium-laser-0'],
        weaponLocationById: { 'medium-laser-0': 'CENTER_TORSO' },
      }),
      'attacker',
      'target',
      'push',
      physicalContext({ pushDestinationValid: true }),
    );

    const declarations = session.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const rejection = session.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );

    expect(declarations).toHaveLength(1);
    expect(rejection).toBeUndefined();
  });

  it('declares and resolves source-backed jump jet attacks through the event-sourced physical path', () => {
    const context = physicalContext({
      optionalRules: ['tacops_jump_jet_attack'],
      limb: 'rightLeg',
      rightReadyJumpJetCount: 2,
      standingAttackerHeightAboveTargetHeight: 1,
    });
    const declared = declareAdjacentPhysicalAttack('jump-jet-attack', context);
    const declaration = declared.events.find(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    )?.payload as IPhysicalAttackDeclaredPayload;

    expect(declaration).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'jump-jet-attack',
      limb: 'rightLeg',
      toHitNumber: 7,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6, 3]),
    );
    const resolution = resolved.events.findLast(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;
    const damage = resolved.events.find(
      (event) => event.type === GameEventType.DamageApplied,
    )?.payload as IDamageAppliedPayload;

    expect(resolution).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'jump-jet-attack',
      roll: 12,
      toHitNumber: 7,
      hit: true,
      damage: 6,
    });
    expect(damage).toMatchObject({
      unitId: 'target',
      damage: 6,
    });
  });
});
