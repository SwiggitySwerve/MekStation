import {
  Facing,
  GameSide,
  MovementType,
  UnitType,
  unitState,
  getEligiblePhysicalAttacks,
} from './battlemechPhysicalCombat.behavior.test-helpers';

describe('BattleMech physical combat behavior validation lane', () => {
  it('projects charge and DFA displacement conflicts as restricted options', () => {
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
        isMakingDisplacementAttack: true,
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
    const byType = new Map(
      options.map((option) => [option.attackType, option]),
    );

    expect(options).toHaveLength(8);
    expect(byType.get('charge')?.restrictionsFailed).toContain(
      'TargetMakingDisplacementAttack',
    );
    expect(byType.get('dfa')?.restrictionsFailed).toContain(
      'TargetMakingDisplacementAttack',
    );
    expect(byType.get('kick')?.restrictionsFailed).not.toContain(
      'TargetMakingDisplacementAttack',
    );
    expect(byType.get('push')?.restrictionsFailed).toContain(
      'TargetMakingDisplacementAttack',
    );
  });

  it('projects push displacement conflicts with counter-push ownership', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        targetedByDisplacementAttackerId: 'other-attacker',
      },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      {
        isMakingDisplacementAttack: true,
        isPushing: true,
        displacementAttackTargetId: 'third-unit',
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
    const byType = new Map(
      options.map((option) => [option.attackType, option]),
    );

    expect(options).toHaveLength(8);
    expect(byType.get('push')?.restrictionsFailed).toContain(
      'TargetPushingAnotherMek',
    );
    expect(byType.get('charge')?.restrictionsFailed).toContain(
      'TargetMakingDisplacementAttack',
    );
    expect(byType.get('dfa')?.restrictionsFailed).toContain(
      'TargetMakingDisplacementAttack',
    );
  });

  it('projects targets inside another building as restricted physical options', () => {
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
        occupiedBuildingId: 'building-east',
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
        option.restrictionsFailed.includes('TargetInsideBuilding'),
      ),
    ).toBe(true);
  });

  it('projects airborne targets as restricted physical options', () => {
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
        isAirborne: true,
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
        option.restrictionsFailed.includes('TargetAirborne'),
      ),
    ).toBe(true);
  });

  it('projects reachable airborne VTOL targets as DFA candidates', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        movementThisTurn: MovementType.Jump,
      },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      {
        isAirborne: true,
        unitType: UnitType.VTOL,
      },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerJumpedThisTurn: true,
      attackerJumpMP: 3,
      elevationDifference: 4,
    });
    const dfa = options.find((option) => option.attackType === 'dfa');
    const kick = options.find((option) => option.attackType === 'kick');

    expect(dfa?.restrictionsFailed).toEqual([]);
    expect(kick?.restrictionsFailed).toContain('TargetAirborne');
  });

  it('projects mechanical jump booster DFA attempts as restricted', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        movementThisTurn: MovementType.Jump,
        usedMechanicalJumpBoosterThisTurn: true,
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
    });
    const dfa = options.find((option) => option.attackType === 'dfa');

    expect(dfa?.restrictionsFailed).toContain('MechanicalJumpBooster');
  });

  it('projects evading attackers as restricted physical options', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        isEvading: true,
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

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
        option.restrictionsFailed.includes('AttackerEvading'),
      ),
    ).toBe(true);
  });

  it('projects cargo-interacting attackers as restricted physical options', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        isLoadingOrUnloadingCargo: true,
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

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
        option.restrictionsFailed.includes('AttackerCargoInteraction'),
      ),
    ).toBe(true);
  });

  it('projects different-board physical targets as restricted options', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        boardId: 'board-alpha',
        facing: Facing.Southeast,
      },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      {
        boardId: 'board-beta',
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
        option.restrictionsFailed.includes('DifferentBoard'),
      ),
    ).toBe(true);
  });
});
