import {
  makeInput,
  makeDiceSequence,
  getPhysicalMissConsequences,
  determinePhysicalHitLocation,
  PUNCH_HIT_TABLE,
  KICK_HIT_TABLE,
  SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES,
} from './physicalAttacks.test-helpers';

describe('physicalAttacks', () => {
  describe('getPhysicalMissConsequences', () => {
    it('kick miss triggers attacker PSR', () => {
      const result = getPhysicalMissConsequences('kick');
      expect(result.attackerPSR).toBe(true);
      expect(result.attackerPSRModifier).toBe(0);
    });

    it('DFA miss triggers attacker PSR +4', () => {
      const result = getPhysicalMissConsequences('dfa');
      expect(result.attackerPSR).toBe(true);
      expect(result.attackerPSRModifier).toBe(4);
    });

    it('punch miss has no consequence', () => {
      expect(getPhysicalMissConsequences('punch').attackerPSR).toBe(false);
    });

    it('push miss has no consequence', () => {
      expect(getPhysicalMissConsequences('push').attackerPSR).toBe(false);
    });

    it('charge miss moves the attacker without a normal PSR', () => {
      const result = getPhysicalMissConsequences('charge');
      expect(result.attackerPSR).toBe(false);
      expect(result.attackerPSRModifier).toBe(0);
    });

    it('brush-off miss damages the attacker on the punch table', () => {
      const result = getPhysicalMissConsequences(
        'brush-off',
        makeInput({ attackType: 'brush-off', attackerTonnage: 80 }),
      );
      expect(result.attackerPSR).toBe(false);
      expect(result.attackerDamage).toBe(8);
      expect(result.hitTable).toBe('punch');
    });

    it('Zweihander punch miss triggers attacker PSR only when explicitly two-handed', () => {
      const base = {
        attackType: 'punch' as const,
        pilotAbilities: ['zweihander'],
      };

      expect(
        getPhysicalMissConsequences(
          'punch',
          makeInput({ ...base, twoHandedZweihander: true }),
        ),
      ).toMatchObject({
        attackerPSR: true,
        attackerPSRModifier: 0,
        attackerDamage: 0,
      });
      expect(
        getPhysicalMissConsequences('punch', makeInput(base)).attackerPSR,
      ).toBe(false);
    });

    it('Zweihander physical-weapon misses trigger attacker PSR only when explicitly two-handed', () => {
      for (const attackType of SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES) {
        expect(
          getPhysicalMissConsequences(
            attackType,
            makeInput({
              attackType,
              pilotAbilities: ['zweihander'],
              twoHandedZweihander: true,
            }),
          ),
        ).toMatchObject({
          attackerPSR: true,
          attackerPSRModifier: 0,
          attackerDamage: 0,
        });

        expect(
          getPhysicalMissConsequences(
            attackType,
            makeInput({
              attackType,
              pilotAbilities: ['zweihander'],
            }),
          ).attackerPSR,
        ).toBe(false);
      }
    });
  });

  describe('hit location tables', () => {
    it('punch table maps 1-6 correctly', () => {
      expect(PUNCH_HIT_TABLE[1]).toBe('left_arm');
      expect(PUNCH_HIT_TABLE[2]).toBe('left_torso');
      expect(PUNCH_HIT_TABLE[3]).toBe('center_torso');
      expect(PUNCH_HIT_TABLE[4]).toBe('right_torso');
      expect(PUNCH_HIT_TABLE[5]).toBe('right_arm');
      expect(PUNCH_HIT_TABLE[6]).toBe('head');
    });

    it('kick table maps 1-3 to right leg, 4-6 to left leg', () => {
      expect(KICK_HIT_TABLE[1]).toBe('right_leg');
      expect(KICK_HIT_TABLE[2]).toBe('right_leg');
      expect(KICK_HIT_TABLE[3]).toBe('right_leg');
      expect(KICK_HIT_TABLE[4]).toBe('left_leg');
      expect(KICK_HIT_TABLE[5]).toBe('left_leg');
      expect(KICK_HIT_TABLE[6]).toBe('left_leg');
    });
  });

  describe('determinePhysicalHitLocation', () => {
    it('should use punch table for punch hit', () => {
      const roller = makeDiceSequence([3]); // CT
      expect(determinePhysicalHitLocation('punch', roller)).toBe(
        'center_torso',
      );
    });

    it('should use kick table for kick hit', () => {
      const roller = makeDiceSequence([1]); // right_leg
      expect(determinePhysicalHitLocation('kick', roller)).toBe('right_leg');
    });

    it('should clamp roll to 1-6', () => {
      const roller = makeDiceSequence([0]); // should clamp to 1
      expect(determinePhysicalHitLocation('punch', roller)).toBe('left_arm');
    });
  });
});
