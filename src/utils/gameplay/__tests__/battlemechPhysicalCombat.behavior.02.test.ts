import {
  Facing,
  GameSide,
  unitState,
  getEligiblePhysicalAttacks,
} from './battlemechPhysicalCombat.behavior.test-helpers';

describe('BattleMech physical combat behavior validation lane', () => {
  it('projects source-backed quad front-leg talon damage from arm-location state', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        isQuad: true,
        rightArmHasTalons: true,
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerJumpedThisTurn: true,
      pushDestinationValid: true,
    });
    const leftKick = options.find(
      (option) => option.attackType === 'kick' && option.limb === 'leftLeg',
    );
    const rightKick = options.find(
      (option) => option.attackType === 'kick' && option.limb === 'rightLeg',
    );
    const dfa = options.find((option) => option.attackType === 'dfa');

    expect(leftKick?.damage.targetDamage).toBe(16);
    expect(rightKick?.damage.targetDamage).toBe(24);
    expect(dfa?.damage.targetDamage).toBe(36);
  });

  it('projects source-backed claw modifiers on matching punch rows', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        leftArmHasClaw: true,
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 55,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      pushDestinationValid: true,
    });
    const leftPunch = options.find(
      (option) => option.attackType === 'punch' && option.limb === 'leftArm',
    );
    const rightPunch = options.find(
      (option) => option.attackType === 'punch' && option.limb === 'rightArm',
    );

    expect(leftPunch?.damage.targetDamage).toBe(8);
    expect(leftPunch?.toHit.finalToHit).toBe(6);
    expect(rightPunch?.damage.targetDamage).toBe(6);
    expect(rightPunch?.toHit.finalToHit).toBe(5);
  });

  it('projects PLAYTEST_3 claw to-hit relief while keeping claw punch damage', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        leftArmHasClaw: true,
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 55,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      optionalRules: ['PLAYTEST_3'],
      pushDestinationValid: true,
    });
    const leftPunch = options.find(
      (option) => option.attackType === 'punch' && option.limb === 'leftArm',
    );

    expect(leftPunch?.damage.targetDamage).toBe(8);
    expect(leftPunch?.toHit.finalToHit).toBe(5);
    expect(leftPunch?.toHit.modifiers).toContainEqual(
      expect.objectContaining({
        name: 'Using Claws',
        value: 0,
        source: 'physical-equipment',
      }),
    );
  });

  it('projects missing-limb restrictions on punch and kick rows', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        destroyedLocations: ['right_arm', 'left_leg'],
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      pushDestinationValid: true,
    });
    const optionByKey = new Map(
      options.map((option) => [
        `${option.attackType}:${option.limb ?? '-'}`,
        option,
      ]),
    );

    expect(optionByKey.get('punch:leftArm')?.restrictionsFailed).not.toContain(
      'LimbMissing',
    );
    expect(optionByKey.get('punch:rightArm')?.restrictionsFailed).toContain(
      'LimbMissing',
    );
    expect(optionByKey.get('kick:leftLeg')?.restrictionsFailed).toContain(
      'LimbMissing',
    );
    expect(optionByKey.get('kick:rightLeg')?.restrictionsFailed).toContain(
      'LimbMissing',
    );
  });

  it('projects passenger physical targets as restricted options', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
      },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      {
        isPassenger: true,
      },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerRanThisTurn: true,
      attackerJumpedThisTurn: true,
      pushDestinationValid: true,
    });

    expect(options).toHaveLength(8);
    expect(
      options.every((option) =>
        option.restrictionsFailed.includes('TargetPassenger'),
      ),
    ).toBe(true);
  });

  it('removes ejected units from physical target eligibility', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
      },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      {
        hasEjected: true,
      },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerRanThisTurn: true,
      attackerJumpedThisTurn: true,
      pushDestinationValid: true,
    });

    expect(options).toHaveLength(0);
  });

  it('removes retreated units from physical target eligibility', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
      },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      {
        hasRetreated: true,
      },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerRanThisTurn: true,
      attackerJumpedThisTurn: true,
      pushDestinationValid: true,
    });

    expect(options).toHaveLength(0);
  });

  it('projects swarming physical targets as restricted options', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
      },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      {
        isSwarming: true,
      },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerRanThisTurn: true,
      attackerJumpedThisTurn: true,
      pushDestinationValid: true,
    });

    expect(options).toHaveLength(8);
    expect(
      options.every((option) =>
        option.restrictionsFailed.includes('TargetSwarming'),
      ),
    ).toBe(true);
  });

  it('projects targets making DFA as restricted physical options', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
      },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      {
        isMakingDFA: true,
      },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerRanThisTurn: true,
      attackerJumpedThisTurn: true,
      pushDestinationValid: true,
    });

    expect(options).toHaveLength(8);
    expect(
      options.every((option) =>
        option.restrictionsFailed.includes('TargetMakingDFA'),
      ),
    ).toBe(true);
  });
});
