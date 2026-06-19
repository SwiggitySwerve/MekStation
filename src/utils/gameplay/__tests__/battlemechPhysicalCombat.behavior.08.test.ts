import {
  GameEventType,
  UnitType,
  physicalPhaseSession,
  physicalContext,
  withUnitState,
  withPhysicalPositions,
  declarePhysicalAttack,
  type IPhysicalAttackResolvedPayload,
} from './battlemechPhysicalCombat.behavior.test-helpers';

describe('BattleMech physical combat behavior validation lane', () => {
  it('rejects jump jet attacks after hydrated selected-leg weapon fire', () => {
    const session = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {
        weaponsFiredThisTurn: ['medium-laser-0'],
        weaponLocationById: { 'medium-laser-0': 'RIGHT_LEG' },
      }),
      'attacker',
      'target',
      'jump-jet-attack',
      physicalContext({
        optionalRules: ['tacops_jump_jet_attack'],
        limb: 'rightLeg',
        rightReadyJumpJetCount: 2,
        standingAttackerHeightAboveTargetHeight: 1,
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
      attackType: 'jump-jet-attack',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'LegWeaponFiredThisTurn',
    });
  });

  it('rejects push declarations when either attacker arm is missing', () => {
    const session = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        { destroyedLocations: ['right_arm'] },
        {},
      ),
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
      location: 'LimbMissing',
    });
  });

  it('rejects punch and kick declarations when source-required limbs are missing', () => {
    const missingArm = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        { destroyedLocations: ['right_arm'] },
        {},
      ),
      'attacker',
      'target',
      'punch',
      physicalContext({ limb: 'rightArm' }),
    );
    const missingArmPayload = missingArm.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      missingArm.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(missingArmPayload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'punch',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'LimbMissing',
    });

    const missingLeg = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        { destroyedLocations: ['left_leg'] },
        {},
      ),
      'attacker',
      'target',
      'kick',
      physicalContext({ limb: 'rightLeg' }),
    );
    const missingLegPayload = missingLeg.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      missingLeg.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(missingLegPayload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'LimbMissing',
    });
  });

  it('rejects push declarations when attacker or target is explicitly non-Mek', () => {
    const nonMekAttacker = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        { unitType: UnitType.VEHICLE },
        {},
      ),
      'attacker',
      'target',
      'push',
      physicalContext({ pushDestinationValid: true }),
    );
    const nonMekAttackerPayload = nonMekAttacker.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      nonMekAttacker.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(nonMekAttackerPayload).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'AttackerNotMek',
    });

    const nonMekTarget = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        {},
        { unitType: UnitType.PROTOMECH },
      ),
      'attacker',
      'target',
      'push',
      physicalContext({ pushDestinationValid: true }),
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
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetNotMek',
    });
  });

  it('rejects quad BattleMech push declarations before scheduling resolution', () => {
    const session = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), { isQuad: true }, {}),
      'attacker',
      'target',
      'push',
      physicalContext({ pushDestinationValid: true }),
    );
    const payload = session.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      session.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(payload).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'AttackerQuad',
    });
  });

  it('rejects airborne push attackers before scheduling resolution', () => {
    const session = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), { isAirborne: true }, {}),
      'attacker',
      'target',
      'push',
      physicalContext({ pushDestinationValid: true }),
    );
    const payload = session.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      session.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(payload).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'AttackerAirborne',
    });
  });

  it('rejects rear-flipped-arm push declarations before scheduling resolution', () => {
    const session = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), { armsFlipped: true }, {}),
      'attacker',
      'target',
      'push',
      physicalContext({ pushDestinationValid: true }),
    );
    const payload = session.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      session.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(payload).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'ArmsFlipped',
    });
  });

  it('rejects non-adjacent physical declarations before scheduling resolution', () => {
    let session = withUnitState(physicalPhaseSession(), 'attacker', {
      position: { q: 0, r: 0 },
    });
    session = withUnitState(session, 'target', {
      position: { q: 2, r: 0 },
    });
    const rejected = declarePhysicalAttack(
      session,
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
      location: 'TargetNotAdjacent',
    });
  });
});
