import {
  ActuatorType,
  UnitType,
  DEFAULT_COMPONENT_DAMAGE,
  makeInput,
  calculateKickToHit,
  calculateChargeToHit,
  calculateDFAToHit,
  calculatePushToHit,
  calculateMeleeWeaponToHit,
} from './physicalAttacks.test-helpers';

describe('physicalAttacks', () => {
  describe('calculateKickToHit', () => {
    it('should use piloting - 2 as base', () => {
      const result = calculateKickToHit(
        makeInput({ pilotingSkill: 5, attackType: 'kick' }),
      );
      expect(result.baseToHit).toBe(3);
      expect(result.finalToHit).toBe(3);
    });

    it('should add leg actuator modifiers', () => {
      const result = calculateKickToHit(
        makeInput({
          pilotingSkill: 5,
          attackType: 'kick',
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.UPPER_LEG]: true },
          },
        }),
      );
      expect(result.finalToHit).toBe(5); // 3 + 2
    });

    it('should not allow when hip destroyed', () => {
      const result = calculateKickToHit(
        makeInput({
          attackType: 'kick',
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.HIP]: true },
          },
        }),
      );
      expect(result.allowed).toBe(false);
    });
  });

  describe('calculateChargeToHit', () => {
    it('should use piloting skill as base', () => {
      const result = calculateChargeToHit(
        makeInput({ pilotingSkill: 5, attackType: 'charge' }),
      );
      expect(result.baseToHit).toBe(5);
      expect(result.allowed).toBe(true);
    });
  });

  describe('calculateDFAToHit', () => {
    it('should use piloting skill as base', () => {
      const result = calculateDFAToHit(
        makeInput({ pilotingSkill: 4, attackType: 'dfa' }),
      );
      expect(result.baseToHit).toBe(4);
      expect(result.allowed).toBe(true);
    });

    it('applies source-backed DFA target-class modifiers', () => {
      const infantry = calculateDFAToHit(
        makeInput({
          pilotingSkill: 5,
          attackType: 'dfa',
          targetUnitType: UnitType.INFANTRY,
        }),
      );
      const battleArmor = calculateDFAToHit(
        makeInput({
          pilotingSkill: 5,
          attackType: 'dfa',
          targetUnitType: UnitType.BATTLE_ARMOR,
        }),
      );

      expect(infantry.finalToHit).toBe(8);
      expect(infantry.modifiers).toContainEqual({
        name: 'Infantry target',
        value: 3,
        source: 'target-class',
      });
      expect(battleArmor.finalToHit).toBe(6);
      expect(battleArmor.modifiers).toContainEqual({
        name: 'Battle Armor target',
        value: 1,
        source: 'target-class',
      });
    });

    it('applies source-backed DFA piloting skill differential', () => {
      const result = calculateDFAToHit(
        makeInput({
          pilotingSkill: 5,
          attackType: 'dfa',
          targetPilotingSkill: 3,
        }),
      );

      expect(result.finalToHit).toBe(7);
      expect(result.modifiers).toContainEqual({
        name: 'Piloting skill differential',
        value: 2,
        source: 'pilot-skill',
      });
    });
  });

  describe('calculatePushToHit', () => {
    it('should use piloting - 1 as base', () => {
      const result = calculatePushToHit(
        makeInput({ pilotingSkill: 5, attackType: 'push' }),
      );
      expect(result.baseToHit).toBe(4);
      expect(result.finalToHit).toBe(4);
    });
  });

  describe('calculateMeleeWeaponToHit', () => {
    it('should apply -1 for hatchet', () => {
      const result = calculateMeleeWeaponToHit(
        makeInput({ pilotingSkill: 5, attackType: 'hatchet' }),
      );
      expect(result.finalToHit).toBe(4);
    });

    it('should apply -2 for sword', () => {
      const result = calculateMeleeWeaponToHit(
        makeInput({ pilotingSkill: 5, attackType: 'sword' }),
      );
      expect(result.finalToHit).toBe(3);
    });

    it('should apply +1 for mace', () => {
      const result = calculateMeleeWeaponToHit(
        makeInput({ pilotingSkill: 5, attackType: 'mace' }),
      );
      expect(result.finalToHit).toBe(6);
    });

    it('should apply +1 for lance', () => {
      const result = calculateMeleeWeaponToHit(
        makeInput({ pilotingSkill: 5, attackType: 'lance' }),
      );
      expect(result.finalToHit).toBe(6);
    });

    it('should apply -2 for retractable blade', () => {
      const result = calculateMeleeWeaponToHit(
        makeInput({ pilotingSkill: 5, attackType: 'retractable-blade' }),
      );
      expect(result.finalToHit).toBe(3);
    });

    it('should apply 0 for flail', () => {
      const result = calculateMeleeWeaponToHit(
        makeInput({ pilotingSkill: 5, attackType: 'flail' }),
      );
      expect(result.finalToHit).toBe(5);
    });

    it('should apply +1 for wrecking ball', () => {
      const result = calculateMeleeWeaponToHit(
        makeInput({ pilotingSkill: 5, attackType: 'wrecking-ball' }),
      );
      expect(result.finalToHit).toBe(6);
    });

    it('should not allow if lower arm destroyed', () => {
      const result = calculateMeleeWeaponToHit(
        makeInput({
          attackType: 'hatchet',
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.LOWER_ARM]: true },
          },
        }),
      );
      expect(result.allowed).toBe(false);
    });
  });
});
