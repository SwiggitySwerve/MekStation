import {
  makeInput,
  calculatePhysicalToHit,
  calculatePhysicalDamage,
  type IPhysicalAttackInput,
} from './physicalAttacks.test-helpers';

describe('physicalAttacks', () => {
  describe('calculatePhysicalToHit (dispatch)', () => {
    it('gates Environmental Specialist physical to-hit on Light selection, dark light, and unilluminated target', () => {
      const base = {
        attackType: 'kick',
        pilotAbilities: ['env_specialist'],
        designatedEnvironment: 'light',
        environmentalLight: 'moonless',
        targetIlluminated: false,
      } as const;

      expect(calculatePhysicalToHit(makeInput(base)).modifiers).toContainEqual(
        expect.objectContaining({ name: 'Environmental Specialist (Light)' }),
      );
      expect(
        calculatePhysicalToHit(
          makeInput({ ...base, designatedEnvironment: 'snow' }),
        ).modifiers,
      ).not.toContainEqual(
        expect.objectContaining({ name: 'Environmental Specialist (Light)' }),
      );
      expect(
        calculatePhysicalToHit(
          makeInput({ ...base, environmentalLight: 'night' }),
        ).modifiers,
      ).not.toContainEqual(
        expect.objectContaining({ name: 'Environmental Specialist (Light)' }),
      );
      expect(
        calculatePhysicalToHit(makeInput({ ...base, targetIlluminated: true }))
          .modifiers,
      ).not.toContainEqual(
        expect.objectContaining({ name: 'Environmental Specialist (Light)' }),
      );
    });

    it('applies source-backed target evasion to every physical to-hit path', () => {
      const attackTypes = [
        'punch',
        'kick',
        'charge',
        'dfa',
        'push',
        'hatchet',
        'sword',
        'mace',
        'lance',
        'retractable-blade',
        'flail',
        'wrecking-ball',
      ] as const satisfies readonly IPhysicalAttackInput['attackType'][];

      for (const attackType of attackTypes) {
        const baseline = calculatePhysicalToHit(
          makeInput({
            attackType,
            pilotingSkill: 5,
          }),
        );
        const evadingTarget = calculatePhysicalToHit(
          makeInput({
            attackType,
            pilotingSkill: 5,
            targetEvading: true,
          }),
        );

        expect(evadingTarget.allowed).toBe(true);
        expect(evadingTarget.finalToHit).toBe(baseline.finalToHit + 1);
        expect(evadingTarget.modifiers).toContainEqual({
          name: 'Target Evasion',
          value: 1,
          source: 'movement',
        });
      }
    });

    it('applies explicit Skilled Evasion target bonuses to physical to-hit', () => {
      const baseline = calculatePhysicalToHit(
        makeInput({
          attackType: 'kick',
          pilotingSkill: 5,
        }),
      );
      const evadingTarget = calculatePhysicalToHit(
        makeInput({
          attackType: 'kick',
          pilotingSkill: 5,
          targetEvading: true,
          targetEvasionBonus: 3,
        }),
      );

      expect(evadingTarget.allowed).toBe(true);
      expect(evadingTarget.finalToHit).toBe(baseline.finalToHit + 3);
      expect(evadingTarget.modifiers).toContainEqual({
        name: 'Target Evasion',
        value: 3,
        source: 'movement',
      });
    });

    it('suppresses explicit zero Skilled Evasion target bonuses for physical to-hit', () => {
      const result = calculatePhysicalToHit(
        makeInput({
          attackType: 'kick',
          pilotingSkill: 5,
          targetEvading: true,
          targetEvasionBonus: 0,
        }),
      );

      expect(result.finalToHit).toBe(3);
      expect(result.modifiers).not.toContainEqual(
        expect.objectContaining({
          name: 'Target Evasion',
        }),
      );
    });

    it('suppresses source-backed target evasion against prone physical targets', () => {
      const result = calculatePhysicalToHit(
        makeInput({
          attackType: 'kick',
          pilotingSkill: 5,
          targetEvading: true,
          targetProne: true,
        }),
      );

      expect(result.finalToHit).toBe(3);
      expect(result.modifiers).not.toContainEqual(
        expect.objectContaining({
          name: 'Target Evasion',
        }),
      );
    });

    it('does not apply Frogman in shallow water or to explicit non-Mek attackers', () => {
      const shallow = calculatePhysicalToHit(
        makeInput({
          attackType: 'kick',
          pilotAbilities: ['tm_frogman'],
          attackerWaterDepth: 1,
          attackerUnitType: 'BattleMech',
        }),
      );
      const nonMek = calculatePhysicalToHit(
        makeInput({
          attackType: 'kick',
          pilotAbilities: ['tm_frogman'],
          attackerWaterDepth: 2,
          attackerUnitType: 'Tank',
        }),
      );

      expect(shallow.modifiers).not.toContainEqual(
        expect.objectContaining({ name: 'Frogman' }),
      );
      expect(nonMek.modifiers).not.toContainEqual(
        expect.objectContaining({ name: 'Frogman' }),
      );
    });
  });

  describe('calculatePhysicalDamage', () => {
    it('should return correct punch damage result', () => {
      const result = calculatePhysicalDamage(
        makeInput({ attackerTonnage: 80, attackType: 'punch' }),
      );
      expect(result.targetDamage).toBe(8);
      expect(result.attackerDamage).toBe(0);
      expect(result.targetPSR).toBe(false);
      expect(result.hitTable).toBe('punch');
    });

    it('should return correct kick damage result with PSR', () => {
      const result = calculatePhysicalDamage(
        makeInput({ attackerTonnage: 80, attackType: 'kick' }),
      );
      expect(result.targetDamage).toBe(16);
      expect(result.targetPSR).toBe(true);
      expect(result.hitTable).toBe('kick');
    });

    it('should return charge damage to both units', () => {
      const result = calculatePhysicalDamage(
        makeInput({
          attackerTonnage: 60,
          attackType: 'charge',
          hexesMoved: 5,
          targetTonnage: 75,
        }),
      );
      expect(result.targetDamage).toBe(24);
      expect(result.attackerDamage).toBe(8); // ceil(75/10)
      expect(result.targetPSR).toBe(true);
      expect(result.attackerPSR).toBe(true);
      expect(result.attackerPSRModifier).toBe(2);
    });

    it('should return DFA damage with leg damage', () => {
      const result = calculatePhysicalDamage(
        makeInput({ attackerTonnage: 70, attackType: 'dfa' }),
      );
      expect(result.targetDamage).toBe(21);
      expect(result.attackerLegDamagePerLeg).toBe(7);
      expect(result.targetPSR).toBe(true);
      expect(result.attackerPSR).toBe(true);
      expect(result.attackerPSRModifier).toBe(4);
      expect(result.hitTable).toBe('punch');
    });

    it('should return 0 damage and displacement for push', () => {
      const result = calculatePhysicalDamage(makeInput({ attackType: 'push' }));
      expect(result.targetDamage).toBe(0);
      expect(result.targetPSR).toBe(true);
      expect(result.targetDisplaced).toBe(true);
    });

    it('should return melee weapon damage with punch table', () => {
      const result = calculatePhysicalDamage(
        makeInput({ attackerTonnage: 70, attackType: 'hatchet' }),
      );
      expect(result.targetDamage).toBe(14);
      expect(result.hitTable).toBe('punch');
    });

    it('should return retractable blade damage with punch table', () => {
      const result = calculatePhysicalDamage(
        makeInput({
          attackerTonnage: 70,
          attackType: 'retractable-blade',
        }),
      );
      expect(result.targetDamage).toBe(7);
      expect(result.hitTable).toBe('punch');
    });

    it('should return flail and wrecking ball damage with punch table', () => {
      expect(
        calculatePhysicalDamage(makeInput({ attackType: 'flail' })),
      ).toMatchObject({
        targetDamage: 9,
        hitTable: 'punch',
      });
      expect(
        calculatePhysicalDamage(makeInput({ attackType: 'wrecking-ball' })),
      ).toMatchObject({
        targetDamage: 8,
        hitTable: 'punch',
      });
    });
  });
});
