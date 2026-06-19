import {
  ActuatorType,
  DEFAULT_COMPONENT_DAMAGE,
  makeInput,
  makeDiceSequence,
  calculatePunchDamage,
  calculateBrushOffAttackDamage,
  calculatePhysicalToHit,
  resolvePhysicalAttack,
  canBrushOff,
  getBrushOffAttackToHitModifiers,
} from './physicalAttacks.test-helpers';

describe('physicalAttacks', () => {
  describe('canBrushOff', () => {
    const validBrushOffInput = {
      attackerIsMek: true,
      selectedArm: 'right',
      targetIsSwarmingInfantryOnAttacker: true,
      shoulderWorking: true,
    } as const;

    it('allows source-backed swarming-infantry and iNarc pod brush-off targets', () => {
      expect(canBrushOff(validBrushOffInput)).toEqual({ allowed: true });
      expect(
        canBrushOff({
          ...validBrushOffInput,
          targetIsSwarmingInfantryOnAttacker: false,
          targetIsINarcPod: true,
        }),
      ).toEqual({ allowed: true });
    });

    it.each([
      ['non-Mek attacker', { attackerIsMek: false }, 'AttackerNotMek'],
      [
        'missing arm selection',
        { selectedArm: undefined },
        'InvalidArmSelection',
      ],
      ['both arms selected', { selectedArm: 'both' }, 'InvalidArmSelection'],
      [
        'non-swarming non-iNarc target',
        { targetIsSwarmingInfantryOnAttacker: false },
        'InvalidTarget',
      ],
      ['quad attacker', { attackerIsQuad: true }, 'AttackerQuad'],
      ['flipped arms', { armsFlipped: true }, 'ArmsFlipped'],
      ['missing selected arm', { selectedArmMissing: true }, 'ArmMissing'],
      ['no/minimal arms quirk', { noMinimalArmsQuirk: true }, 'NoArmsQuirk'],
      ['destroyed shoulder', { shoulderWorking: false }, 'ShoulderDestroyed'],
      [
        'selected arm fired weapons',
        { armWeaponFiredThisTurn: true },
        'ArmWeaponFiredThisTurn',
      ],
      ['DFA target', { targetMakingDfa: true }, 'TargetMakingDfa'],
      ['prone attacker', { attackerProne: true }, 'AttackerProne'],
      [
        'building or hex target',
        { targetIsBuildingFuelTankOrHex: true },
        'InvalidExplicitTarget',
      ],
    ] as const)('rejects %s', (_label, overrides, reasonCode) => {
      expect(
        canBrushOff({ ...validBrushOffInput, ...overrides }),
      ).toMatchObject({
        allowed: false,
        reasonCode,
      });
    });

    it('exposes source-backed dedicated brush-off to-hit modifiers', () => {
      expect(
        getBrushOffAttackToHitModifiers({
          upperArmWorking: false,
          lowerArmWorking: false,
          armAesFunctional: true,
          handWorking: false,
          defenderHasMagneticClaws: true,
        }),
      ).toEqual({
        possible: true,
        modifiers: [
          expect.objectContaining({
            value: 4,
            reasonCode: 'BrushOffSwarmingInfantry',
          }),
          expect.objectContaining({
            value: 2,
            reasonCode: 'UpperArmActuatorDestroyed',
          }),
          expect.objectContaining({
            value: 2,
            reasonCode: 'LowerArmActuatorMissingOrDestroyed',
          }),
          expect.objectContaining({ value: -1, reasonCode: 'ArmAES' }),
          expect.objectContaining({
            value: 1,
            reasonCode: 'HandActuatorDestroyed',
          }),
          expect.objectContaining({
            value: 1,
            reasonCode: 'DefenderMagneticClaws',
          }),
        ],
      });
    });

    it('calculates runtime brush-off to-hit for swarming infantry and rejects normal targets', () => {
      expect(
        calculatePhysicalToHit(
          makeInput({
            attackType: 'brush-off',
            arm: 'right',
            limb: 'rightArm',
            targetIsSwarming: true,
            targetIsSwarmingInfantryOnAttacker: true,
            targetUnitType: 'Infantry',
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: true,
        baseToHit: 5,
        finalToHit: 9,
        modifiers: expect.arrayContaining([
          expect.objectContaining({
            value: 4,
            source: 'physical-action',
          }),
        ]),
      });

      expect(
        calculatePhysicalToHit(
          makeInput({
            attackType: 'brush-off',
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        restrictionReasonCode: 'InvalidBrushOffTarget',
      });
    });

    it('uses the source-backed hand/claw modifier precedence', () => {
      expect(
        getBrushOffAttackToHitModifiers({
          handActuatorPresent: false,
          lowerArmWorking: true,
        }).modifiers,
      ).toContainEqual(
        expect.objectContaining({ reasonCode: 'HandActuatorMissing' }),
      );
      expect(
        getBrushOffAttackToHitModifiers({ hasClaws: true }).modifiers,
      ).toContainEqual(expect.objectContaining({ reasonCode: 'UsingClaws' }));
    });

    it('exposes torso-mounted cockpit sensor branches', () => {
      expect(
        getBrushOffAttackToHitModifiers({
          torsoMountedCockpit: true,
          headSensorHits: 2,
        }).modifiers,
      ).toContainEqual(
        expect.objectContaining({
          value: 4,
          reasonCode: 'TorsoMountedCockpitHeadSensorsDestroyed',
        }),
      );
      expect(
        getBrushOffAttackToHitModifiers({
          torsoMountedCockpit: true,
          headSensorHits: 2,
          centerTorsoSensorHits: 1,
        }),
      ).toMatchObject({
        possible: false,
        impossibleReasonCode: 'TorsoMountedCockpitSensorsDestroyed',
      });
    });

    it('uses punch-equivalent damage for brush-off hit and miss damage', () => {
      const input = makeInput({ attackerTonnage: 80, arm: 'right' });
      expect(calculateBrushOffAttackDamage(input)).toBe(
        calculatePunchDamage(input),
      );
      expect(
        calculateBrushOffAttackDamage(
          makeInput({
            attackerTonnage: 80,
            arm: 'right',
            componentDamage: {
              ...DEFAULT_COMPONENT_DAMAGE,
              actuators: { [ActuatorType.UPPER_ARM]: true },
            },
          }),
        ),
      ).toBe(4);
    });

    it('resolves runtime brush-off miss as punch-equivalent self-damage', () => {
      const result = resolvePhysicalAttack(
        makeInput({
          attackType: 'brush-off',
          arm: 'right',
          limb: 'rightArm',
          targetIsSwarming: true,
          targetIsSwarmingInfantryOnAttacker: true,
          targetUnitType: 'Infantry',
          targetDistance: 1,
        }),
        makeDiceSequence([1, 1, 3]),
      );

      expect(result).toMatchObject({
        attackType: 'brush-off',
        roll: 2,
        toHitNumber: 9,
        hit: false,
        targetDamage: 0,
        attackerDamage: 8,
        hitLocation: 'center_torso',
      });
    });
  });
});
