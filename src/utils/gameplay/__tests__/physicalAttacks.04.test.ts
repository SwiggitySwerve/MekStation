import {
  makeInput,
  calculateDFADamageToTarget,
  calculateDFADamageToAttacker,
  calculateFlailDamage,
  calculateHatchetDamage,
  calculateSwordDamage,
  calculateMaceDamage,
  calculateRetractableBladeDamage,
  calculateWreckingBallDamage,
  resolveDfaMissFallPilotDamageAvoidance,
} from './physicalAttacks.test-helpers';

describe('physicalAttacks', () => {
  describe('calculateDFADamageToTarget', () => {
    it('should compute ceil(weight/10) × 3 for 70-ton mech', () => {
      // ceil(70/10) × 3 = 7 × 3 = 21
      const damage = calculateDFADamageToTarget(
        makeInput({ attackerTonnage: 70, attackType: 'dfa' }),
      );
      expect(damage).toBe(21);
    });

    it('should compute ceil(weight/10) × 3 for 80-ton mech', () => {
      // ceil(80/10) × 3 = 8 × 3 = 24
      expect(
        calculateDFADamageToTarget(
          makeInput({ attackerTonnage: 80, attackType: 'dfa' }),
        ),
      ).toBe(24);
    });

    it('applies source-backed talon damage when either DFA leg has working talons', () => {
      expect(
        calculateDFADamageToTarget(
          makeInput({
            attackerTonnage: 70,
            attackType: 'dfa',
            leftLegHasTalons: true,
          }),
        ),
      ).toBe(31);
    });

    it('does not apply DFA talon damage without a working foot actuator', () => {
      expect(
        calculateDFADamageToTarget(
          makeInput({
            attackerTonnage: 70,
            attackType: 'dfa',
            leftLegHasTalons: true,
            leftFootActuatorPresent: false,
          }),
        ),
      ).toBe(21);
    });

    it('applies source-backed quad DFA talon damage from arm-location front legs', () => {
      expect(
        calculateDFADamageToTarget(
          makeInput({
            attackerTonnage: 70,
            attackType: 'dfa',
            attackerIsQuad: true,
            rightArmHasTalons: true,
          }),
        ),
      ).toBe(31);
    });

    it('honors MegaMek non-biped DFA right-arm talon gate for arm-location talons', () => {
      expect(
        calculateDFADamageToTarget(
          makeInput({
            attackerTonnage: 70,
            attackType: 'dfa',
            attackerIsQuad: true,
            leftArmHasTalons: true,
          }),
        ),
      ).toBe(21);
    });
  });

  describe('calculateDFADamageToAttacker', () => {
    it('should compute ceil(weight/5) per leg (split) for 70-ton mech', () => {
      // Total = ceil(70/5) = 14, per leg = ceil(14/2) = 7
      const perLeg = calculateDFADamageToAttacker(
        makeInput({ attackerTonnage: 70, attackType: 'dfa' }),
      );
      expect(perLeg).toBe(7);
    });

    it('should round up for odd total', () => {
      // 50t: ceil(50/5)=10, per leg = 5
      expect(
        calculateDFADamageToAttacker(
          makeInput({ attackerTonnage: 50, attackType: 'dfa' }),
        ),
      ).toBe(5);
    });
  });

  describe('resolveDfaMissFallPilotDamageAvoidance', () => {
    it('applies the source-backed fall-height modifier and wounds on failure', () => {
      const rolls = [2, 3];
      const result = resolveDfaMissFallPilotDamageAvoidance(
        5,
        2,
        () => rolls.shift() ?? 1,
      );

      expect(result).toMatchObject({
        targetNumber: 6,
        roll: 5,
        dice: [2, 3],
        passed: false,
        pilotDamage: 1,
      });
    });

    it('avoids missed-DFA fall pilot damage on a successful roll', () => {
      const rolls = [3, 3];
      const result = resolveDfaMissFallPilotDamageAvoidance(
        5,
        2,
        () => rolls.shift() ?? 1,
      );

      expect(result).toMatchObject({
        targetNumber: 6,
        roll: 6,
        dice: [3, 3],
        passed: true,
        pilotDamage: 0,
      });
    });

    it.each(['dermal_armor', 'tsm_implant'] as const)(
      'honors source-backed Manei Domini fall-pilot-damage immunity for %s',
      (abilityId) => {
        const result = resolveDfaMissFallPilotDamageAvoidance(5, 2, () => 1, [
          abilityId,
        ]);

        expect(result).toMatchObject({
          targetNumber: 6,
          dice: [],
          passed: true,
          pilotDamage: 0,
        });
      },
    );
  });

  describe('calculateHatchetDamage', () => {
    it('should compute floor(weight/5) for 70-ton mech', () => {
      // floor(70/5) = 14
      expect(
        calculateHatchetDamage(
          makeInput({ attackerTonnage: 70, attackType: 'hatchet' }),
        ),
      ).toBe(14);
    });
  });

  describe('calculateSwordDamage', () => {
    it('should compute ceil(weight/10) + 1 for 70-ton mech', () => {
      // ceil(70/10) + 1 = 7 + 1 = 8
      expect(
        calculateSwordDamage(
          makeInput({ attackerTonnage: 70, attackType: 'sword' }),
        ),
      ).toBe(8);
    });

    it('should round sword damage up for non-even tonnage', () => {
      // MegaMek ClubAttackAction uses ceil(weight / 10) + 1.
      expect(
        calculateSwordDamage(
          makeInput({ attackerTonnage: 65, attackType: 'sword' }),
        ),
      ).toBe(8);
    });
  });

  describe('calculateMaceDamage', () => {
    it('should compute ceil(weight/4) for 70-ton mech', () => {
      // MegaMek ClubAttackAction uses ceil(weight / 4).
      expect(
        calculateMaceDamage(
          makeInput({ attackerTonnage: 70, attackType: 'mace' }),
        ),
      ).toBe(18);
    });

    it('should round mace damage up for non-even tonnage', () => {
      expect(
        calculateMaceDamage(
          makeInput({ attackerTonnage: 65, attackType: 'mace' }),
        ),
      ).toBe(17);
    });
  });

  describe('calculateRetractableBladeDamage', () => {
    it('computes ceil(weight/10) for a 70-ton mech', () => {
      expect(
        calculateRetractableBladeDamage(
          makeInput({
            attackerTonnage: 70,
            attackType: 'retractable-blade',
          }),
        ),
      ).toBe(7);
    });

    it('rounds retractable blade damage up for non-even tonnage', () => {
      expect(
        calculateRetractableBladeDamage(
          makeInput({
            attackerTonnage: 65,
            attackType: 'retractable-blade',
          }),
        ),
      ).toBe(7);
    });
  });

  describe('source-backed constant physical weapon damage', () => {
    it('computes constant flail and wrecking ball damage', () => {
      expect(calculateFlailDamage(makeInput({ attackType: 'flail' }))).toBe(9);
      expect(
        calculateWreckingBallDamage(makeInput({ attackType: 'wrecking-ball' })),
      ).toBe(8);
    });

    it('does not double flail or wrecking ball damage with active TSM', () => {
      const activeTsm = {
        hasTSM: true,
        heat: 9,
      };

      expect(
        calculateFlailDamage(makeInput({ ...activeTsm, attackType: 'flail' })),
      ).toBe(9);
      expect(
        calculateWreckingBallDamage(
          makeInput({ ...activeTsm, attackType: 'wrecking-ball' }),
        ),
      ).toBe(8);
    });

    it('applies Melee Specialist and underwater modifiers to constant weapons', () => {
      expect(
        calculateFlailDamage(
          makeInput({
            attackType: 'flail',
            pilotAbilities: ['melee-specialist'],
            isUnderwater: true,
          }),
        ),
      ).toBe(5);
      expect(
        calculateWreckingBallDamage(
          makeInput({
            attackType: 'wrecking-ball',
            pilotAbilities: ['melee-specialist'],
            isUnderwater: true,
          }),
        ),
      ).toBe(4);
    });

    it('does not apply Melee Master as flat constant weapon damage', () => {
      expect(
        calculateFlailDamage(
          makeInput({
            attackType: 'flail',
            pilotAbilities: ['melee-master'],
            isUnderwater: true,
          }),
        ),
      ).toBe(4);
    });
  });
});
