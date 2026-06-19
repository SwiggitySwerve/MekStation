import {
  ActuatorType,
  GameEventType,
  GameSide,
  UnitType,
  DEFAULT_COMPONENT_DAMAGE,
  unitState,
  physicalPhaseSession,
  physicalContext,
  withPhysicalPositions,
  declarePhysicalAttack,
  chooseBestPhysicalAttack,
  getEligiblePhysicalAttacks,
  type IPhysicalAttackDeclaredPayload,
  type IPhysicalAttackResolvedPayload,
} from './battlemechPhysicalCombat.behavior.test-helpers';

describe('BattleMech physical combat behavior validation lane', () => {
  it('surfaces DFA target-class to-hit modifiers in eligibility projection', () => {
    const attacker = unitState('attacker', GameSide.Player, { q: 0, r: 0 });

    const infantryOptions = getEligiblePhysicalAttacks(
      attacker,
      unitState(
        'target',
        GameSide.Opponent,
        { q: 1, r: 0 },
        {
          unitType: UnitType.INFANTRY,
        },
      ),
      {
        attackerTonnage: 80,
        attackerPilotingSkill: 5,
        targetTonnage: 75,
        attackerJumpedThisTurn: true,
      },
    );
    const battleArmorOptions = getEligiblePhysicalAttacks(
      attacker,
      unitState(
        'target',
        GameSide.Opponent,
        { q: 1, r: 0 },
        {
          unitType: UnitType.BATTLE_ARMOR,
        },
      ),
      {
        attackerTonnage: 80,
        attackerPilotingSkill: 5,
        targetTonnage: 75,
        attackerJumpedThisTurn: true,
      },
    );

    expect(
      infantryOptions.find((option) => option.attackType === 'dfa')?.toHit
        .finalToHit,
    ).toBe(8);
    expect(
      battleArmorOptions.find((option) => option.attackType === 'dfa')?.toHit
        .finalToHit,
    ).toBe(6);
  });

  it('surfaces DFA piloting skill differential in eligibility projection', () => {
    const attacker = unitState('attacker', GameSide.Player, { q: 0, r: 0 });
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      { piloting: 3 },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerJumpedThisTurn: true,
    });

    expect(
      options.find((option) => option.attackType === 'dfa')?.toHit.finalToHit,
    ).toBe(7);
  });

  it('surfaces non-Mek charge target-class gates in eligibility projection', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      { unitType: UnitType.VEHICLE },
    );
    const infantryTarget = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      { unitType: UnitType.INFANTRY },
    );

    const options = getEligiblePhysicalAttacks(attacker, infantryTarget, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerRanThisTurn: true,
    });

    expect(
      options.find((option) => option.attackType === 'charge')
        ?.restrictionsFailed,
    ).toEqual(['TargetInfantryOrProtoMek']);
  });

  it('surfaces infantry-family attacker gates in DFA eligibility projection', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      { unitType: UnitType.BATTLE_ARMOR },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerJumpedThisTurn: true,
    });

    expect(
      options.find((option) => option.attackType === 'dfa')?.restrictionsFailed,
    ).toEqual(['AttackerInfantry']);
  });

  it('surfaces DropShip target gates in DFA eligibility projection', () => {
    const attacker = unitState('attacker', GameSide.Player, { q: 0, r: 0 });
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      { unitType: UnitType.DROPSHIP },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerJumpedThisTurn: true,
    });

    expect(
      options.find((option) => option.attackType === 'dfa')?.restrictionsFailed,
    ).toEqual(['TargetDropShip']);
  });

  it('projects source-backed thrash eligibility and rejects any prior weapon fire', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        prone: true,
      },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 0, r: 0 },
      { unitType: UnitType.INFANTRY },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 5,
      weaponsFiredThisTurn: [],
      thrashBlockingTerrains: [],
    });
    const thrash = options.find((option) => option.attackType === 'thrash');

    expect(thrash).toMatchObject({
      restrictionsFailed: [],
      damage: {
        targetDamage: 27,
        attackerPSR: true,
        targetPSR: false,
      },
      selfRisk: {
        pilotingSkillRoll: {
          trigger: 'ThrashCompleted',
          required: true,
        },
      },
      toHit: {
        finalToHit: 0,
        automaticHit: true,
      },
    });

    const afterWeaponFire = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 5,
      weaponsFiredThisTurn: ['center-torso-medium-laser'],
      thrashBlockingTerrains: [],
    });

    expect(
      afterWeaponFire.find((option) => option.attackType === 'thrash')
        ?.restrictionsFailed,
    ).toEqual(['WeaponFiredThisTurn']);
  });

  it('lets AI choose a lance when leg attacks are blocked', () => {
    const componentDamage = {
      ...DEFAULT_COMPONENT_DAMAGE,
      actuators: { [ActuatorType.HIP]: true },
    };

    expect(
      chooseBestPhysicalAttack(80, 5, componentDamage, {
        attackerProne: true,
        hasMeleeWeapon: 'lance',
      }),
    ).toBe('lance');
  });

  it('rejects blocked push declarations without scheduling a physical attack', () => {
    const session = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession()),
      'attacker',
      'target',
      'push',
      physicalContext({ pushDestinationValid: false }),
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
      location: 'DestinationBlocked',
    });
  });

  it('caps non-Melee Master units at one accepted physical attack declaration per turn', () => {
    let session = withPhysicalPositions(physicalPhaseSession());
    session = declarePhysicalAttack(
      session,
      'attacker',
      'target',
      'punch',
      physicalContext({ limb: 'rightArm' }),
    );
    session = withPhysicalPositions(session);
    session = declarePhysicalAttack(
      session,
      'attacker',
      'target',
      'kick',
      physicalContext({ limb: 'rightLeg' }),
    );

    const declarations = session.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const rejection = session.events.findLast(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = rejection?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(1);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'PhysicalAttackLimitReached',
    });
  });

  it('lets Melee Master declare two physical attacks but rejects the third', () => {
    const meleeMasterContext = physicalContext({
      pilotAbilities: ['melee_master'],
    });
    const meleeMasterState = { abilities: ['melee_master'] };
    let session = withPhysicalPositions(
      physicalPhaseSession(),
      meleeMasterState,
    );
    session = declarePhysicalAttack(session, 'attacker', 'target', 'punch', {
      ...meleeMasterContext,
      limb: 'rightArm',
    });
    session = withPhysicalPositions(session, meleeMasterState);
    session = declarePhysicalAttack(session, 'attacker', 'target', 'kick', {
      ...meleeMasterContext,
      limb: 'rightLeg',
    });
    session = withPhysicalPositions(session, meleeMasterState);
    session = declarePhysicalAttack(session, 'attacker', 'target', 'push', {
      ...meleeMasterContext,
      pushDestinationValid: true,
    });

    const declarations = session.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const declaredPayloads = declarations.map(
      (event) => event.payload as IPhysicalAttackDeclaredPayload,
    );
    const rejection = session.events.findLast(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const rejectionPayload =
      rejection?.payload as IPhysicalAttackResolvedPayload;

    expect(declaredPayloads).toMatchObject([
      { attackType: 'punch', limb: 'rightArm' },
      { attackType: 'kick', limb: 'rightLeg' },
    ]);
    expect(rejectionPayload.location).toBe('PhysicalAttackLimitReached');
  });
});
