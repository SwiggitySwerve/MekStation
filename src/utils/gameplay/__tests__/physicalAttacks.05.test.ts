import {
  ActuatorType,
  DEFAULT_COMPONENT_DAMAGE,
  makeInput,
  calculatePunchDamage,
  calculateKickDamage,
  calculateFlailDamage,
  calculateHatchetDamage,
  calculateSwordDamage,
  calculateMaceDamage,
  calculateRetractableBladeDamage,
  calculateWreckingBallDamage,
  canPunch,
  canKick,
  getEffectiveWeight,
  applyUnderwaterModifier,
} from './physicalAttacks.test-helpers';

describe('physicalAttacks', () => {
  describe('TSM double damage', () => {
    it('should double punch damage with TSM at heat 9+', () => {
      const input = makeInput({
        attackerTonnage: 50,
        hasTSM: true,
        heat: 9,
      });
      // Effective weight = 100, ceil(100/10) = 10
      expect(calculatePunchDamage(input)).toBe(10);
    });

    it('should double kick damage with TSM at heat 9+', () => {
      const input = makeInput({
        attackerTonnage: 50,
        hasTSM: true,
        heat: 9,
      });
      // Effective weight = 100, floor(100/5) = 20
      expect(calculateKickDamage(input)).toBe(20);
    });

    it('should NOT double damage below heat 9', () => {
      const input = makeInput({
        attackerTonnage: 50,
        hasTSM: true,
        heat: 8,
      });
      expect(calculatePunchDamage(input)).toBe(5); // ceil(50/10) = 5
    });

    it('should NOT double damage without TSM even at heat 9+', () => {
      const input = makeInput({
        attackerTonnage: 50,
        hasTSM: false,
        heat: 12,
      });
      expect(calculatePunchDamage(input)).toBe(5);
    });

    it('should double hatchet damage with TSM at heat 9+', () => {
      // 70t with TSM at heat 9: effective 140, floor(140/5) = 28
      expect(
        calculateHatchetDamage(
          makeInput({
            attackerTonnage: 70,
            attackType: 'hatchet',
            hasTSM: true,
            heat: 10,
          }),
        ),
      ).toBe(28);
    });

    it('should double sword damage with TSM at heat 9+', () => {
      // 70t TSM: effective 140, ceil(140/10) + 1 = 14 + 1 = 15
      expect(
        calculateSwordDamage(
          makeInput({
            attackerTonnage: 70,
            attackType: 'sword',
            hasTSM: true,
            heat: 9,
          }),
        ),
      ).toBe(15);
    });

    it('should double mace damage with TSM at heat 9+', () => {
      // 70t TSM: effective 140, ceil(140 / 4) = 35
      expect(
        calculateMaceDamage(
          makeInput({
            attackerTonnage: 70,
            attackType: 'mace',
            hasTSM: true,
            heat: 9,
          }),
        ),
      ).toBe(35);
    });

    it('should double retractable blade damage with TSM at heat 9+', () => {
      // 70t TSM: effective 140, ceil(140 / 10) = 14
      expect(
        calculateRetractableBladeDamage(
          makeInput({
            attackerTonnage: 70,
            attackType: 'retractable-blade',
            hasTSM: true,
            heat: 9,
          }),
        ),
      ).toBe(14);
    });

    it('should not double flail or wrecking ball damage with TSM at heat 9+', () => {
      expect(
        calculateFlailDamage(
          makeInput({
            attackerTonnage: 70,
            attackType: 'flail',
            hasTSM: true,
            heat: 9,
          }),
        ),
      ).toBe(9);
      expect(
        calculateWreckingBallDamage(
          makeInput({
            attackerTonnage: 70,
            attackType: 'wrecking-ball',
            hasTSM: true,
            heat: 9,
          }),
        ),
      ).toBe(8);
    });
  });

  describe('getEffectiveWeight', () => {
    it('should return normal weight without TSM', () => {
      expect(getEffectiveWeight(50, 15, false)).toBe(50);
    });

    it('should double weight with TSM at 9+', () => {
      expect(getEffectiveWeight(50, 9, true)).toBe(100);
    });

    it('should return normal weight with TSM below 9', () => {
      expect(getEffectiveWeight(50, 8, true)).toBe(50);
    });
  });

  describe('underwater halving', () => {
    it('should halve punch damage underwater', () => {
      const damage = calculatePunchDamage(
        makeInput({ attackerTonnage: 80, isUnderwater: true }),
      );
      expect(damage).toBe(4); // floor(8/2)
    });

    it('should halve kick damage underwater', () => {
      const damage = calculateKickDamage(
        makeInput({ attackerTonnage: 80, isUnderwater: true }),
      );
      expect(damage).toBe(8); // floor(16/2)
    });

    it('should round down odd values', () => {
      const damage = calculatePunchDamage(
        makeInput({ attackerTonnage: 75, isUnderwater: true }),
      );
      // ceil(75/10) = 8, floor(8/2) = 4
      expect(damage).toBe(4);
    });
  });

  describe('applyUnderwaterModifier', () => {
    it('should halve damage when underwater', () => {
      expect(applyUnderwaterModifier(10, true)).toBe(5);
    });

    it('should not modify when not underwater', () => {
      expect(applyUnderwaterModifier(10, false)).toBe(10);
    });

    it('should floor odd halved values', () => {
      expect(applyUnderwaterModifier(7, true)).toBe(3);
    });
  });

  describe('canPunch', () => {
    it('should allow punch with intact arm', () => {
      expect(canPunch(makeInput()).allowed).toBe(true);
    });

    it('should disallow punch with shoulder destroyed', () => {
      const result = canPunch(
        makeInput({
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.SHOULDER]: true },
          },
        }),
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Shoulder');
    });

    it('should disallow punch if arm fired weapon', () => {
      const result = canPunch(makeInput({ weaponsFiredFromArm: ['ml-1'] }));
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('fired');
    });

    it('disallows punch with the selected arm missing', () => {
      expect(
        canPunch(
          makeInput({
            limb: 'leftArm',
            attackerDestroyedLocations: ['left_arm'],
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'LimbMissing',
      });

      expect(
        canPunch(
          makeInput({
            arm: 'right',
            attackerDestroyedLocations: ['right_arm'],
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'LimbMissing',
      });
    });

    it('disallows punch when No Arms quirk is present', () => {
      const result = canPunch(makeInput({ unitQuirks: ['no_arms'] }));

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'NoArmsQuirk',
      });
    });

    it('does not apply Low Arms without a source-backed combat resolver', () => {
      const result = canPunch(
        makeInput({ unitQuirks: ['low_arms'], elevationDifference: 1 }),
      );

      expect(result).toMatchObject({
        allowed: true,
      });
    });
  });

  describe('canKick', () => {
    it('should allow kick when standing', () => {
      expect(canKick(makeInput({ attackType: 'kick' })).allowed).toBe(true);
    });

    it('should disallow kick when prone', () => {
      const result = canKick(
        makeInput({ attackType: 'kick', attackerProne: true }),
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('prone');
    });

    it('should disallow kick with hip destroyed', () => {
      const result = canKick(
        makeInput({
          attackType: 'kick',
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.HIP]: true },
          },
        }),
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Hip');
    });

    it('disallows kick when either leg is missing', () => {
      expect(
        canKick(
          makeInput({
            attackType: 'kick',
            limb: 'leftLeg',
            attackerDestroyedLocations: ['left_leg'],
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'LimbMissing',
      });

      expect(
        canKick(
          makeInput({
            attackType: 'kick',
            limb: 'rightLeg',
            attackerDestroyedLocations: ['left_leg'],
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'LimbMissing',
      });
    });
  });
});
