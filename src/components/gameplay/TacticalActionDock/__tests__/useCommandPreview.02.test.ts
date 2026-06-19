import * as H from './useCommandPreview.test-helpers';

const {
  CoverLevel,
  GamePhase,
  MovementType,
  RangeBracket,
  buildCommandPreview,
  buildMovementCommands,
  buildPhysicalAttackCommands,
  buildWeaponAttackCommands,
  charge,
  fire,
  makeCombatInfo,
  makeCtx,
  makePhysicalOption,
  makeWeapon,
  punch,
  walk,
} = H;

type ICombatRangeHex = H.ICombatRangeHex;
type IMovementRangeHex = H.IMovementRangeHex;
type IPhysicalAttackOption = H.IPhysicalAttackOption;
type ITacticalCommandContext = H.ITacticalCommandContext;
type IWeaponStatus = H.IWeaponStatus;
type PhysicalAttackInvalidReason = H.PhysicalAttackInvalidReason;
type PhysicalAttackType = H.PhysicalAttackType;
describe('buildCommandPreview', () => {
  it('weapon preview preserves the shared combat projection attack envelope', () => {
    const preview = buildCommandPreview(
      fire,
      makeCtx({ phase: GamePhase.WeaponAttack, targetUnitId: 'enemy-x' }),
      {
        hitChance: 10,
        weaponRangeBand: 'long',
        combatInfo: makeCombatInfo({
          rangeBracket: RangeBracket.Medium,
          toHitNumber: 8,
          weaponIdsAvailable: ['medium-laser', 'ac-5'],
          availableWeaponImpacts: [
            {
              weaponId: 'medium-laser',
              weaponName: 'Medium Laser',
              heat: 3,
              damage: 5,
              ammoConsumed: 0,
            },
            {
              weaponId: 'ac-5',
              weaponName: 'AC/5',
              heat: 1,
              damage: 5,
              ammoConsumed: 1,
              ammoRemaining: 20,
            },
          ],
          availableWeaponHeat: 4,
          availableWeaponDamage: 10,
          expectedDamage: 7.25,
        }),
        weaponStatuses: [
          makeWeapon({ heat: 12 }),
          makeWeapon({
            id: 'ac-5',
            name: 'AC/5',
            heat: 8,
            damage: '5',
            ammoRemaining: 20,
          }),
          makeWeapon({
            id: 'out-of-arc-ppc',
            name: 'PPC',
            heat: 10,
            damage: 10,
          }),
        ],
      },
    );

    expect(preview).not.toBeNull();
    if (preview && preview.kind === 'weapon-attack') {
      expect(preview.targetUnitId).toBe('enemy-x');
      expect(preview.attackable).toBe(true);
      expect(preview.toHit).toBe(8);
      expect(preview.rangeBand).toBe('medium');
      expect(preview.heatCost).toBe(4);
      expect(preview.weaponIds).toEqual(['medium-laser', 'ac-5']);
      expect(preview.weaponNames).toEqual(['Medium Laser', 'AC/5']);
      expect(preview.ammoUsage).toEqual({ 'AC/5': 1 });
      expect(preview.expectedDamage).toBeCloseTo(7.25, 2);
    } else {
      throw new Error('expected weapon-attack preview');
    }
  });

  it('weapon preview explains blocked projected attacks without spending heat or ammo', () => {
    const preview = buildCommandPreview(
      fire,
      makeCtx({ phase: GamePhase.WeaponAttack, targetUnitId: 'enemy-x' }),
      {
        combatInfo: makeCombatInfo({
          attackable: false,
          validTargetUnitIds: [],
          attackInvalidReason: 'NoLineOfSight',
          attackInvalidDetails: 'Blocked by building at (1, 0)',
          blockedReason: 'Blocked by building at (1, 0)',
          toHitNumber: undefined,
          weaponIdsAvailable: ['medium-laser'],
          availableWeaponHeat: 3,
        }),
        weaponStatuses: [makeWeapon()],
      },
    );

    expect(preview).not.toBeNull();
    if (preview && preview.kind === 'weapon-attack') {
      expect(preview.targetUnitId).toBe('enemy-x');
      expect(preview.attackable).toBe(false);
      expect(preview.blockedReason).toBe('Blocked by building at (1, 0)');
      expect(preview.attackInvalidReason).toBe('NoLineOfSight');
      expect(preview.attackInvalidDetails).toBe(
        'Blocked by building at (1, 0)',
      );
      expect(preview.toHit).toBeNull();
      expect(preview.heatCost).toBe(0);
      expect(preview.weaponIds).toEqual([]);
      expect(preview.weaponNames).toEqual([]);
      expect(preview.ammoUsage).toEqual({});
      expect(preview.expectedDamage).toBe(0);
    } else {
      throw new Error('expected weapon-attack preview');
    }
  });

  it('physical preview mirrors the shared physical attack option projection', () => {
    const option = makePhysicalOption({
      attackType: 'punch',
      toHit: {
        baseToHit: 4,
        finalToHit: 7,
        modifiers: [{ name: 'Target movement', value: 1, source: 'target' }],
        allowed: true,
      },
      damage: {
        targetDamage: 8,
        attackerDamage: 0,
        attackerLegDamagePerLeg: 0,
        targetPSR: false,
        attackerPSR: false,
        attackerPSRModifier: 0,
        hitTable: 'punch',
        targetDisplaced: false,
      },
    });

    const preview = buildCommandPreview(
      punch,
      makeCtx({ phase: GamePhase.PhysicalAttack, targetUnitId: null }),
      {
        physicalTargetUnitId: 'enemy-x',
        physicalAttackOption: option,
      },
    );

    expect(preview).not.toBeNull();
    if (preview && preview.kind === 'physical-attack') {
      expect(preview.targetUnitId).toBe('enemy-x');
      expect(preview.attackType).toBe('punch');
      expect(preview.limb).toBe('rightArm');
      expect(preview.attackable).toBe(true);
      expect(preview.toHit).toBe(7);
      expect(preview.damage).toBe(8);
      expect(preview.selfDamage).toBe(0);
      expect(preview.requiresPSR).toBe(false);
      expect(preview.restrictionReasonCodes).toEqual([]);
    } else {
      throw new Error('expected physical-attack preview');
    }
  });

  it('physical preview explains restricted projection rows', () => {
    const option = makePhysicalOption({
      attackType: 'charge' as PhysicalAttackType,
      toHit: {
        baseToHit: 5,
        finalToHit: Number.POSITIVE_INFINITY,
        modifiers: [],
        allowed: false,
        restrictionReasonCode: 'NoRunThisTurn',
      },
      damage: {
        targetDamage: 13,
        attackerDamage: 3,
        attackerLegDamagePerLeg: 0,
        targetPSR: true,
        attackerPSR: true,
        attackerPSRModifier: 0,
        hitTable: 'kick',
        targetDisplaced: false,
      },
      selfRisk: {
        damageToAttacker: 3,
        legDamagePerLeg: 0,
        pilotingSkillRoll: { trigger: 'ChargeCompleted', required: true },
        onMiss: 'None',
      },
      restrictionsFailed: ['NoRunThisTurn' as PhysicalAttackInvalidReason],
    });

    const preview = buildCommandPreview(
      charge,
      makeCtx({ phase: GamePhase.PhysicalAttack, targetUnitId: null }),
      {
        physicalTargetUnitId: 'enemy-x',
        physicalAttackOption: option,
      },
    );

    expect(preview).not.toBeNull();
    if (preview && preview.kind === 'physical-attack') {
      expect(preview.attackType).toBe('charge');
      expect(preview.attackable).toBe(false);
      expect(preview.toHit).toBeNull();
      expect(preview.damage).toBe(13);
      expect(preview.selfDamage).toBe(3);
      expect(preview.requiresPSR).toBe(true);
      expect(preview.restrictionReasonCodes).toEqual(['NoRunThisTurn']);
      expect(preview.blockedReasons).toEqual([
        'Charge requires running this turn',
      ]);
    } else {
      throw new Error('expected physical-attack preview');
    }
  });
});
