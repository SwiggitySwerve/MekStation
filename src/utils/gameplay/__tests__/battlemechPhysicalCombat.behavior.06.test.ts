import {
  GameEventType,
  MovementType,
  UnitType,
  physicalPhaseSession,
  physicalContext,
  withPhysicalPositions,
  declarePhysicalAttack,
  type IPhysicalAttackResolvedPayload,
} from './battlemechPhysicalCombat.behavior.test-helpers';

describe('BattleMech physical combat behavior validation lane', () => {
  it('rejects a Melee Master second declaration that reuses the same limb', () => {
    const meleeMasterContext = physicalContext({
      pilotAbilities: ['melee_master'],
    });
    let session = withPhysicalPositions(physicalPhaseSession(), {
      abilities: ['melee_master'],
    });
    session = declarePhysicalAttack(session, 'attacker', 'target', 'punch', {
      ...meleeMasterContext,
      limb: 'rightArm',
    });
    session = withPhysicalPositions(session, { abilities: ['melee_master'] });
    session = declarePhysicalAttack(session, 'attacker', 'target', 'punch', {
      ...meleeMasterContext,
      limb: 'rightArm',
    });

    const declarations = session.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const rejection = session.events.findLast(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = rejection?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(1);
    expect(payload.location).toBe('SameLimbUsedThisTurn');
  });

  it('rejects push declarations against prone targets before scheduling resolution', () => {
    const session = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {}, { prone: true }),
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
      location: 'TargetProne',
    });
  });

  it('rejects charge declarations with prone attackers, prone targets, or explicit non-Mek targets before scheduling resolution', () => {
    const proneAttacker = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
        prone: true,
      }),
      'attacker',
      'target',
      'charge',
      physicalContext({ attackerRanThisTurn: true, hexesMoved: 5 }),
    );
    const proneAttackerPayload = proneAttacker.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      proneAttacker.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(proneAttackerPayload).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'AttackerProne',
    });

    const proneTarget = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        {
          movementThisTurn: MovementType.Run,
          hexesMovedThisTurn: 5,
        },
        { prone: true },
      ),
      'attacker',
      'target',
      'charge',
      physicalContext({ attackerRanThisTurn: true, hexesMoved: 5 }),
    );
    const proneTargetPayload = proneTarget.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      proneTarget.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(proneTargetPayload).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetProne',
    });

    const nonMekTarget = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        {
          movementThisTurn: MovementType.Run,
          hexesMovedThisTurn: 5,
        },
        { unitType: UnitType.PROTOMECH },
      ),
      'attacker',
      'target',
      'charge',
      physicalContext({ attackerRanThisTurn: true, hexesMoved: 5 }),
    );
    const nonMekTargetPayload = nonMekTarget.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      nonMekTarget.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(nonMekTargetPayload).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetNotMek',
    });

    const gunEmplacementTarget = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        {
          movementThisTurn: MovementType.Run,
          hexesMovedThisTurn: 5,
        },
        { unitType: 'Gun Emplacement' },
      ),
      'attacker',
      'target',
      'charge',
      physicalContext({ attackerRanThisTurn: true, hexesMoved: 5 }),
    );
    const gunEmplacementTargetPayload = gunEmplacementTarget.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      gunEmplacementTarget.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(gunEmplacementTargetPayload).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetNotMek',
    });
    expect(gunEmplacementTargetPayload.automaticHit).toBeUndefined();
  });

  it('rejects charge declarations after backward movement before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
        movedBackwardThisTurn: true,
      }),
      'attacker',
      'target',
      'charge',
      physicalContext({ attackerRanThisTurn: true, hexesMoved: 5 }),
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      rejected.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(payload).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'ChargeBackwardMovement',
    });
  });

  it('rejects charge declarations after jump movement before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 5,
      }),
      'attacker',
      'target',
      'charge',
      physicalContext({ hexesMoved: 5 }),
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      rejected.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(payload).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'ChargeJumpMovement',
    });
  });

  it('rejects non-Mek charge declarations against infantry or ProtoMech targets', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        {
          movementThisTurn: MovementType.Run,
          hexesMovedThisTurn: 5,
          unitType: UnitType.VEHICLE,
        },
        { unitType: UnitType.PROTOMECH },
      ),
      'attacker',
      'target',
      'charge',
      physicalContext({ attackerRanThisTurn: true, hexesMoved: 5 }),
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
      location: 'TargetInfantryOrProtoMek',
    });
  });

  it('rejects charge declarations when target elevation does not overlap the attacker', () => {
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
        elevationDifference: 2,
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
      location: 'ElevationMismatch',
    });
  });
});
