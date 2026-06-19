import {
  ActuatorType,
  DEFAULT_COMPONENT_DAMAGE,
  makeInput,
  calculatePunchDamage,
  calculateKickDamage,
  calculateChargeDamageToTarget,
  calculateChargeDamageToAttacker,
  calculatePhysicalDamage,
  SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES,
} from './physicalAttacks.test-helpers';

describe('physicalAttacks', () => {
  describe('calculatePunchDamage', () => {
    it('should compute ceil(weight/10) for 80-ton mech', () => {
      expect(calculatePunchDamage(makeInput({ attackerTonnage: 80 }))).toBe(8);
    });

    it('should compute ceil(weight/10) for 50-ton mech', () => {
      expect(calculatePunchDamage(makeInput({ attackerTonnage: 50 }))).toBe(5);
    });

    it('should compute ceil(weight/10) for 75-ton mech', () => {
      expect(calculatePunchDamage(makeInput({ attackerTonnage: 75 }))).toBe(8);
    });

    it('should compute ceil(weight/10) for 20-ton mech', () => {
      expect(calculatePunchDamage(makeInput({ attackerTonnage: 20 }))).toBe(2);
    });

    it('applies source-backed claw damage to the selected punching arm', () => {
      expect(
        calculatePunchDamage(
          makeInput({
            attackerTonnage: 55,
            arm: 'left',
            leftArmHasClaw: true,
          }),
        ),
      ).toBe(8);
    });

    it('does not apply claw damage when the selected punching arm lacks claws', () => {
      expect(
        calculatePunchDamage(
          makeInput({
            attackerTonnage: 55,
            arm: 'left',
            rightArmHasClaw: true,
          }),
        ),
      ).toBe(6);
    });

    it('applies arm actuator damage after the claw punch base', () => {
      expect(
        calculatePunchDamage(
          makeInput({
            attackerTonnage: 55,
            arm: 'left',
            leftArmHasClaw: true,
            componentDamage: {
              ...DEFAULT_COMPONENT_DAMAGE,
              actuators: { [ActuatorType.UPPER_ARM]: true },
            },
          }),
        ),
      ).toBe(4);
    });

    it('should halve damage with upper arm actuator destroyed', () => {
      const damage = calculatePunchDamage(
        makeInput({
          attackerTonnage: 80,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.UPPER_ARM]: true },
          },
        }),
      );
      expect(damage).toBe(4); // floor(8/2)
    });

    it('should halve damage with lower arm actuator destroyed', () => {
      const damage = calculatePunchDamage(
        makeInput({
          attackerTonnage: 80,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.LOWER_ARM]: true },
          },
        }),
      );
      expect(damage).toBe(4);
    });

    it('should quarter damage with both upper and lower arm destroyed', () => {
      const damage = calculatePunchDamage(
        makeInput({
          attackerTonnage: 80,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: {
              [ActuatorType.UPPER_ARM]: true,
              [ActuatorType.LOWER_ARM]: true,
            },
          },
        }),
      );
      // 8 -> floor(8/2)=4 -> floor(4/2)=2
      expect(damage).toBe(2);
    });

    it('applies Melee Specialist but not Battle Fists to punch damage', () => {
      const damage = calculatePunchDamage(
        makeInput({
          attackerTonnage: 80,
          arm: 'right',
          pilotAbilities: ['melee-specialist'],
          unitQuirks: ['battle_fists_ra'],
        }),
      );

      expect(damage).toBe(9);
    });

    it('does not apply Melee Master as a flat punch damage bonus', () => {
      const damage = calculatePunchDamage(
        makeInput({
          attackerTonnage: 80,
          arm: 'right',
          pilotAbilities: ['melee-master'],
        }),
      );

      expect(damage).toBe(8);
    });

    it('applies Zweihander punch damage only for explicit two-handed declarations', () => {
      const base = {
        attackerTonnage: 80,
        arm: 'right' as const,
        pilotAbilities: ['zweihander'],
      };

      expect(
        calculatePunchDamage(makeInput({ ...base, twoHandedZweihander: true })),
      ).toBe(16);
      expect(calculatePunchDamage(makeInput(base))).toBe(8);
    });

    it('does not apply explicit two-handed punch damage without Zweihander', () => {
      expect(
        calculatePunchDamage(
          makeInput({
            attackerTonnage: 80,
            arm: 'right',
            twoHandedZweihander: true,
          }),
        ),
      ).toBe(8);
    });

    it('applies Zweihander bonus damage to supported physical-weapon declarations', () => {
      for (const attackType of SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES) {
        const baseline = calculatePhysicalDamage(
          makeInput({ attackType, attackerTonnage: 80 }),
        );
        const twoHanded = calculatePhysicalDamage(
          makeInput({
            attackType,
            attackerTonnage: 80,
            pilotAbilities: ['zweihander'],
            twoHandedZweihander: true,
          }),
        );

        expect(twoHanded.targetDamage).toBe(baseline.targetDamage + 8);
      }
    });
  });

  describe('calculateKickDamage', () => {
    it('should compute floor(weight/5) for 80-ton mech', () => {
      expect(calculateKickDamage(makeInput({ attackerTonnage: 80 }))).toBe(16);
    });

    it('should compute floor(weight/5) for 50-ton mech', () => {
      expect(calculateKickDamage(makeInput({ attackerTonnage: 50 }))).toBe(10);
    });

    it('should compute floor(weight/5) for 73-ton mech', () => {
      // floor(73/5) = 14
      expect(calculateKickDamage(makeInput({ attackerTonnage: 73 }))).toBe(14);
    });

    it('applies source-backed talon damage to the selected kicking leg', () => {
      expect(
        calculateKickDamage(
          makeInput({
            attackerTonnage: 50,
            attackType: 'kick',
            limb: 'leftLeg',
            leftLegHasTalons: true,
          }),
        ),
      ).toBe(15);
    });

    it('does not apply talon damage when the selected leg lacks working talons', () => {
      expect(
        calculateKickDamage(
          makeInput({
            attackerTonnage: 50,
            attackType: 'kick',
            limb: 'leftLeg',
            rightLegHasTalons: true,
          }),
        ),
      ).toBe(10);
    });

    it('requires a working foot actuator for talon kick damage', () => {
      expect(
        calculateKickDamage(
          makeInput({
            attackerTonnage: 50,
            attackType: 'kick',
            limb: 'leftLeg',
            leftLegHasTalons: true,
            leftFootActuatorPresent: false,
          }),
        ),
      ).toBe(10);
    });

    it('maps quad kick talons through the matching arm-location front leg', () => {
      expect(
        calculateKickDamage(
          makeInput({
            attackerTonnage: 50,
            attackType: 'kick',
            attackerIsQuad: true,
            limb: 'rightLeg',
            rightArmHasTalons: true,
          }),
        ),
      ).toBe(15);
    });

    it('requires the quad arm-location foot actuator for front-leg talon kick damage', () => {
      expect(
        calculateKickDamage(
          makeInput({
            attackerTonnage: 50,
            attackType: 'kick',
            attackerIsQuad: true,
            limb: 'rightLeg',
            rightArmHasTalons: true,
            rightArmFootActuatorPresent: false,
          }),
        ),
      ).toBe(10);
    });
  });

  describe('calculateChargeDamageToTarget', () => {
    it('should compute ceil(weight/10) × (hexesMoved - 1) for 60t, 5 hexes', () => {
      // ceil(60/10) × (5-1) = 6 × 4 = 24
      const damage = calculateChargeDamageToTarget(
        makeInput({ attackerTonnage: 60, attackType: 'charge', hexesMoved: 5 }),
      );
      expect(damage).toBe(24);
    });

    it('should return 0 for 0 hexes moved', () => {
      const damage = calculateChargeDamageToTarget(
        makeInput({ attackerTonnage: 60, attackType: 'charge', hexesMoved: 0 }),
      );
      expect(damage).toBe(0);
    });

    it('should return 0 for 1 hex moved', () => {
      const damage = calculateChargeDamageToTarget(
        makeInput({ attackerTonnage: 60, attackType: 'charge', hexesMoved: 1 }),
      );
      expect(damage).toBe(0);
    });
  });

  describe('calculateChargeDamageToAttacker', () => {
    it('should compute ceil(targetTonnage/10) for 75-ton target', () => {
      // ceil(75/10) = 8
      const damage = calculateChargeDamageToAttacker(
        makeInput({ attackType: 'charge', targetTonnage: 75 }),
      );
      expect(damage).toBe(8);
    });
  });
});
