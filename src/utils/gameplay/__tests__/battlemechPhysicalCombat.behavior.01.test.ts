import {
  Facing,
  GameSide,
  MovementType,
  UnitType,
  unitState,
  getEligiblePhysicalAttacks,
  type PhysicalAttackType,
} from './battlemechPhysicalCombat.behavior.test-helpers';

describe('BattleMech physical combat behavior validation lane', () => {
  it('projects every runtime-supported physical action with rule modifiers', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });
    const meleeWeapons: readonly PhysicalAttackType[] = [
      'hatchet',
      'sword',
      'mace',
      'lance',
      'retractable-blade',
      'flail',
      'wrecking-ball',
    ];

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      targetMovementModifier: 2,
      attackerMovementModifier: 1,
      attackerRanThisTurn: true,
      attackerJumpedThisTurn: true,
      meleeWeaponsEquipped: meleeWeapons,
      optionalRules: ['tacops_trip_attack', 'tacops_grappling'],
      pushDestinationValid: true,
    });

    expect(
      options.map((option) => `${option.attackType}:${option.limb ?? '-'}`),
    ).toEqual([
      'punch:leftArm',
      'punch:rightArm',
      'kick:leftLeg',
      'kick:rightLeg',
      'charge:-',
      'dfa:-',
      'push:-',
      'grapple:-',
      'trip:-',
      'hatchet:leftArm',
      'hatchet:rightArm',
      'sword:leftArm',
      'sword:rightArm',
      'mace:leftArm',
      'mace:rightArm',
      'lance:leftArm',
      'lance:rightArm',
      'retractable-blade:leftArm',
      'retractable-blade:rightArm',
      'flail:leftArm',
      'flail:rightArm',
      'wrecking-ball:-',
    ]);
    expect(
      options.every((option) => option.restrictionsFailed.length === 0),
    ).toBe(true);

    const byType = new Map(
      options.map((option) => [option.attackType, option]),
    );
    expect(byType.get('kick')?.toHit.finalToHit).toBe(5);
    expect(byType.get('charge')?.toHit.finalToHit).toBe(8);
    expect(byType.get('dfa')?.toHit.finalToHit).toBe(7);
    expect(byType.get('grapple')?.toHit.finalToHit).toBe(7);
    expect(byType.get('sword')?.toHit.finalToHit).toBe(5);
    expect(byType.get('mace')?.toHit.finalToHit).toBe(8);
    expect(byType.get('lance')?.toHit.finalToHit).toBe(8);
    expect(byType.get('retractable-blade')?.toHit.finalToHit).toBe(5);
    expect(byType.get('flail')?.toHit.finalToHit).toBe(7);
    expect(byType.get('wrecking-ball')?.toHit.finalToHit).toBe(8);
    expect(byType.get('sword')?.damage.targetDamage).toBe(9);
    expect(byType.get('mace')?.damage.targetDamage).toBe(20);
    expect(byType.get('lance')?.damage.targetDamage).toBe(16);
    expect(byType.get('retractable-blade')?.damage.targetDamage).toBe(8);
    expect(byType.get('flail')?.damage.targetDamage).toBe(9);
    expect(byType.get('wrecking-ball')?.damage.targetDamage).toBe(8);
  });

  it('applies attacker spotting to every physical to-hit family', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        isSpotting: true,
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerMovementModifier: 1,
      attackerRanThisTurn: true,
      attackerJumpedThisTurn: true,
      meleeWeaponsEquipped: ['sword'],
      pushDestinationValid: true,
    });
    const byType = new Map(
      options.map((option) => [option.attackType, option]),
    );

    for (const attackType of [
      'punch',
      'kick',
      'charge',
      'dfa',
      'push',
      'sword',
    ] as const) {
      expect(byType.get(attackType)?.toHit.modifiers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Attacker spotting',
            value: 1,
            source: 'other',
          }),
        ]),
      );
    }
    expect(byType.get('punch')?.toHit.finalToHit).toBe(6);
    expect(byType.get('charge')?.toHit.finalToHit).toBe(7);
  });

  it('projects break-grapple only for the current grappled target', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        grappledUnitId: 'target',
        isGrappleAttacker: true,
      },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 0, r: 0 },
      {
        grappledUnitId: 'attacker',
        isGrappleAttacker: false,
      },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      optionalRules: ['tacops_grappling'],
    });
    const breakGrapple = options.find(
      (option) => option.attackType === 'break-grapple',
    );

    expect(breakGrapple).toBeDefined();
    expect(breakGrapple?.restrictionsFailed).toEqual([]);
    expect(breakGrapple?.toHit).toMatchObject({
      automaticHit: true,
      finalToHit: 0,
    });
  });

  it('projects optional jump jet attack when TacOps state and selected-leg jump jets are supplied', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      { facing: Facing.Southeast },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      optionalRules: ['tacops_jump_jet_attack'],
      rightReadyJumpJetCount: 2,
      standingAttackerHeightAboveTargetHeight: 1,
    });
    const jumpJetAttack = options.find(
      (option) => option.attackType === 'jump-jet-attack',
    );

    expect(jumpJetAttack).toMatchObject({
      attackType: 'jump-jet-attack',
      limb: 'rightLeg',
      restrictionsFailed: [],
      toHit: { finalToHit: 7 },
      damage: { targetDamage: 6, attackerDamage: 0 },
    });
  });

  it('projects source-backed brush-off against swarming infantry with miss self-damage risk', () => {
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
      {
        isSwarming: true,
        unitType: UnitType.INFANTRY,
      },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
    });
    const brushOff = options.find(
      (option) => option.attackType === 'brush-off',
    );

    expect(brushOff).toMatchObject({
      attackType: 'brush-off',
      limb: 'rightArm',
      restrictionsFailed: [],
      toHit: { finalToHit: 9 },
      damage: { targetDamage: 8, attackerDamage: 0 },
      selfRisk: { damageToAttacker: 8, onMiss: 'None' },
    });
  });

  it('projects source-backed optional TacOps grapple as zero-damage state attack', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      { facing: Facing.Southeast },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      optionalRules: ['tacops_grappling'],
      targetMovementModifier: 2,
    });
    const grapple = options.find((option) => option.attackType === 'grapple');

    expect(grapple).toMatchObject({
      attackType: 'grapple',
      restrictionsFailed: [],
      toHit: { finalToHit: 7 },
      damage: { targetDamage: 0, attackerDamage: 0 },
      selfRisk: { damageToAttacker: 0, onMiss: null },
    });
  });

  it('projects source-backed talon damage on kick and DFA rows', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        leftLegHasTalons: true,
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

    expect(leftKick?.damage.targetDamage).toBe(24);
    expect(rightKick?.damage.targetDamage).toBe(16);
    expect(dfa?.damage.targetDamage).toBe(36);
  });
});
