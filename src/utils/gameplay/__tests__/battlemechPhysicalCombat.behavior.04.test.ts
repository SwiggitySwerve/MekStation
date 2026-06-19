import {
  Facing,
  GameSide,
  MovementType,
  UnitType,
  unitState,
  getEligiblePhysicalAttacks,
} from './battlemechPhysicalCombat.behavior.test-helpers';

describe('BattleMech physical combat behavior validation lane', () => {
  it('surfaces distinct physical restriction reasons instead of hiding them', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      weaponsFiredFromLeftArm: ['left-medium-laser'],
      limbsUsedThisTurn: ['rightLeg'],
      attackerRanThisTurn: false,
      attackerJumpedThisTurn: false,
      meleeWeaponsEquipped: ['hatchet'],
      pushDestinationValid: false,
    });

    const reasonByRow = new Map(
      options.map((option) => [
        `${option.attackType}:${option.limb ?? '-'}`,
        option.restrictionsFailed,
      ]),
    );

    expect(reasonByRow.get('punch:leftArm')).toEqual(['WeaponFiredThisTurn']);
    expect(reasonByRow.get('kick:rightLeg')).toEqual(['SameLimbUsedThisTurn']);
    expect(reasonByRow.get('charge:-')).toEqual(['NoRunThisTurn']);
    expect(reasonByRow.get('dfa:-')).toEqual(['NoJumpThisTurn']);
    expect(reasonByRow.get('push:-')).toEqual(['WeaponFiredThisTurn']);
    expect(reasonByRow.get('hatchet:leftArm')).toEqual(['WeaponFiredThisTurn']);
    expect(reasonByRow.get('hatchet:rightArm')).toEqual([]);
  });

  it('surfaces backward charge movement as an eligibility restriction', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
        movedBackwardThisTurn: true,
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerRanThisTurn: true,
    });

    expect(
      options.find((option) => option.attackType === 'charge')
        ?.restrictionsFailed,
    ).toEqual(['ChargeBackwardMovement']);
  });

  it('surfaces jump charge movement as an eligibility restriction', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 5,
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
    });

    expect(
      options.find((option) => option.attackType === 'charge')
        ?.restrictionsFailed,
    ).toEqual(['ChargeJumpMovement']);
  });

  it('surfaces side-adjacent push targets as not directly ahead', () => {
    const attacker = unitState('attacker', GameSide.Player);
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      pushDestinationValid: true,
    });

    expect(
      options.find((option) => option.attackType === 'push')
        ?.restrictionsFailed,
    ).toEqual(['TargetNotDirectlyAhead']);
  });

  it('surfaces non-Mek unit types in push eligibility projection', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      { facing: Facing.Southeast },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      { unitType: UnitType.BATTLE_ARMOR },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      pushDestinationValid: true,
    });

    expect(
      options.find((option) => option.attackType === 'push')
        ?.restrictionsFailed,
    ).toEqual(['TargetNotMek']);
  });

  it('surfaces airborne push attackers in eligibility projection', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      { facing: Facing.Southeast, isAirborne: true },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      pushDestinationValid: true,
    });

    expect(
      options.find((option) => option.attackType === 'push')
        ?.restrictionsFailed,
    ).toEqual(['AttackerAirborne']);
  });

  it('surfaces standing-Mek target gates in charge eligibility projection', () => {
    const attacker = unitState('attacker', GameSide.Player, { q: 0, r: 0 });
    const nonMekTarget = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      { unitType: UnitType.BATTLE_ARMOR },
    );

    const nonMekTargetOptions = getEligiblePhysicalAttacks(
      attacker,
      nonMekTarget,
      {
        attackerTonnage: 80,
        attackerPilotingSkill: 5,
        targetTonnage: 75,
        attackerRanThisTurn: true,
      },
    );

    expect(
      nonMekTargetOptions.find((option) => option.attackType === 'charge')
        ?.restrictionsFailed,
    ).toEqual(['TargetNotMek']);

    const gunEmplacementTargetOptions = getEligiblePhysicalAttacks(
      attacker,
      unitState(
        'target',
        GameSide.Opponent,
        { q: 1, r: 0 },
        { unitType: 'Gun Emplacement' },
      ),
      {
        attackerTonnage: 80,
        attackerPilotingSkill: 5,
        targetTonnage: 75,
        attackerRanThisTurn: true,
      },
    );

    expect(
      gunEmplacementTargetOptions.find(
        (option) => option.attackType === 'charge',
      )?.restrictionsFailed,
    ).toEqual(['TargetNotMek']);

    const proneTargetOptions = getEligiblePhysicalAttacks(
      attacker,
      unitState('target', GameSide.Opponent, { q: 1, r: 0 }, { prone: true }),
      {
        attackerTonnage: 80,
        attackerPilotingSkill: 5,
        targetTonnage: 75,
        attackerRanThisTurn: true,
      },
    );

    expect(
      proneTargetOptions.find((option) => option.attackType === 'charge')
        ?.restrictionsFailed,
    ).toEqual(['TargetProne']);

    const elevatedTargetOptions = getEligiblePhysicalAttacks(
      attacker,
      unitState('target', GameSide.Opponent, { q: 1, r: 0 }),
      {
        attackerTonnage: 80,
        attackerPilotingSkill: 5,
        targetTonnage: 75,
        attackerRanThisTurn: true,
        elevationDifference: 2,
      },
    );

    expect(
      elevatedTargetOptions.find((option) => option.attackType === 'charge')
        ?.restrictionsFailed,
    ).toEqual(['ElevationMismatch']);

    const targetStillMovingOptions = getEligiblePhysicalAttacks(
      attacker,
      unitState('target', GameSide.Opponent, { q: 1, r: 0 }),
      {
        attackerTonnage: 80,
        attackerPilotingSkill: 5,
        targetTonnage: 75,
        attackerRanThisTurn: true,
        targetMovementComplete: false,
      },
    );

    expect(
      targetStillMovingOptions.find((option) => option.attackType === 'charge')
        ?.restrictionsFailed,
    ).toEqual(['TargetMovementIncomplete']);
  });

  it('surfaces DFA target movement gates in eligibility projection', () => {
    const attacker = unitState('attacker', GameSide.Player, { q: 0, r: 0 });

    const targetStillMovingOptions = getEligiblePhysicalAttacks(
      attacker,
      unitState('target', GameSide.Opponent, { q: 1, r: 0 }),
      {
        attackerTonnage: 80,
        attackerPilotingSkill: 5,
        targetTonnage: 75,
        attackerJumpedThisTurn: true,
        targetMovementComplete: false,
      },
    );

    expect(
      targetStillMovingOptions.find((option) => option.attackType === 'dfa')
        ?.restrictionsFailed,
    ).toEqual(['TargetMovementIncomplete']);

    const immobileTargetOptions = getEligiblePhysicalAttacks(
      attacker,
      unitState(
        'target',
        GameSide.Opponent,
        { q: 1, r: 0 },
        { shutdown: true },
      ),
      {
        attackerTonnage: 80,
        attackerPilotingSkill: 5,
        targetTonnage: 75,
        attackerJumpedThisTurn: true,
        targetMovementComplete: false,
      },
    );

    expect(
      immobileTargetOptions.find((option) => option.attackType === 'dfa')
        ?.restrictionsFailed,
    ).toEqual([]);
  });
});
