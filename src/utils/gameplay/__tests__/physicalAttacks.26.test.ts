import {
  ActuatorType,
  GamePhase,
  GameSide,
  MovementType,
  UnitType,
  DEFAULT_COMPONENT_DAMAGE,
  makePhysicalProjectionUnit,
  chooseBestPhysicalAttack,
  TSM_ACTIVATION_HEAT,
  getEligiblePhysicalAttacks,
} from './physicalAttacks.test-helpers';

describe('physicalAttacks', () => {
  describe('chooseBestPhysicalAttack', () => {
    it('should prefer kick over punch (higher damage)', () => {
      const result = chooseBestPhysicalAttack(80, 5, DEFAULT_COMPONENT_DAMAGE);
      expect(result).toBe('kick'); // 16 vs 8
    });

    it('should return null if all attacks restricted', () => {
      const compDamage = {
        ...DEFAULT_COMPONENT_DAMAGE,
        actuators: {
          [ActuatorType.SHOULDER]: true,
          [ActuatorType.HIP]: true,
        },
      };
      const result = chooseBestPhysicalAttack(80, 5, compDamage, {
        attackerProne: true,
      });
      expect(result).toBeNull();
    });

    it('should prefer DFA when jumping', () => {
      const result = chooseBestPhysicalAttack(80, 5, DEFAULT_COMPONENT_DAMAGE, {
        isJumping: true,
      });
      // DFA = ceil(80/10)×3 = 24 > kick = 16
      expect(result).toBe('dfa');
    });

    it('should prefer charge with many hexes moved', () => {
      const result = chooseBestPhysicalAttack(80, 5, DEFAULT_COMPONENT_DAMAGE, {
        canReachForCharge: true,
        hexesMoved: 6,
      });
      // Charge = ceil(80/10)×(6-1) = 8×5 = 40 > kick = 16
      expect(result).toBe('charge');
    });

    it('should consider melee weapon', () => {
      const result = chooseBestPhysicalAttack(80, 5, DEFAULT_COMPONENT_DAMAGE, {
        hasMeleeWeapon: 'mace',
      });
      // Mace for 80t = ceil(80/4) = 20 > kick = 16
      expect(result).toBe('mace');
    });

    it('should fall back to punch if kick unavailable', () => {
      const compDamage = {
        ...DEFAULT_COMPONENT_DAMAGE,
        actuators: { [ActuatorType.HIP]: true },
      };
      const result = chooseBestPhysicalAttack(80, 5, compDamage, {
        attackerProne: true,
      });
      // Prone prevents kick, hip destroyed prevents kick
      // Only punch available
      expect(result).toBe('punch');
    });

    it('considers matching claw punch damage when choosing the best attack', () => {
      const compDamage = {
        ...DEFAULT_COMPONENT_DAMAGE,
        actuators: { [ActuatorType.HIP]: true },
      };
      const result = chooseBestPhysicalAttack(80, 5, compDamage, {
        leftArmHasClaw: true,
        rightArmHasClaw: false,
      });

      expect(result).toBe('punch');
    });

    it('should return null when the attacker is evading', () => {
      const result = chooseBestPhysicalAttack(80, 5, DEFAULT_COMPONENT_DAMAGE, {
        attackerEvading: true,
        canReachForCharge: true,
        hexesMoved: 6,
        isJumping: true,
        hasMeleeWeapon: 'mace',
      });
      expect(result).toBeNull();
    });
  });

  describe('getEligiblePhysicalAttacks self-risk projection', () => {
    function optionFor(
      attackType: string,
      options: ReturnType<typeof getEligiblePhysicalAttacks>,
    ) {
      return options.find((option) => option.attackType === attackType);
    }

    it('projects runtime physical self-risk for charge, DFA, kick, and brush-off rows', () => {
      const attacker = makePhysicalProjectionUnit(
        'attacker',
        GameSide.Player,
        { q: 0, r: 0 },
        {
          hexesMovedThisTurn: 5,
          movementThisTurn: MovementType.Run,
        },
      );
      const target = makePhysicalProjectionUnit(
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
        targetTonnage: 75,
        attackerRanThisTurn: true,
        attackerJumpedThisTurn: true,
        targetIsSwarmingInfantryOnAttacker: true,
      });

      expect(optionFor('charge', options)?.selfRisk).toEqual({
        damageToAttacker: 8,
        legDamagePerLeg: 0,
        pilotingSkillRoll: {
          trigger: 'ChargeCompleted',
          required: true,
        },
        onMiss: 'None',
      });
      expect(optionFor('dfa', options)?.selfRisk).toEqual({
        damageToAttacker: 0,
        legDamagePerLeg: 8,
        pilotingSkillRoll: {
          trigger: 'DFACompleted',
          required: true,
        },
        onMiss: 'AttackerFalls',
      });
      expect(optionFor('kick', options)?.selfRisk).toEqual({
        damageToAttacker: 0,
        legDamagePerLeg: 0,
        pilotingSkillRoll: {
          trigger: 'KickMiss',
          required: false,
        },
        onMiss: 'AttackerFalls',
      });
      expect(optionFor('brush-off', options)?.selfRisk).toEqual({
        damageToAttacker: 8,
        legDamagePerLeg: 0,
        pilotingSkillRoll: null,
        onMiss: 'None',
      });
    });
  });

  describe('TSM_ACTIVATION_HEAT', () => {
    it('should be 9', () => {
      expect(TSM_ACTIVATION_HEAT).toBe(9);
    });
  });

  describe('phase sequence (via gameSession)', () => {
    // Import inline to avoid circular deps
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getNextPhase } = require('../gameSession');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GamePhase: GP } = require('@/types/gameplay');

    it('should have PhysicalAttack between WeaponAttack and Heat', () => {
      expect(getNextPhase(GP.WeaponAttack)).toBe(GP.PhysicalAttack);
      expect(getNextPhase(GP.PhysicalAttack)).toBe(GP.Heat);
    });

    it('should have correct full phase order', () => {
      expect(getNextPhase(GP.Initiative)).toBe(GP.Movement);
      expect(getNextPhase(GP.Movement)).toBe(GP.WeaponAttack);
      expect(getNextPhase(GP.WeaponAttack)).toBe(GP.PhysicalAttack);
      expect(getNextPhase(GP.PhysicalAttack)).toBe(GP.Heat);
      expect(getNextPhase(GP.Heat)).toBe(GP.End);
      expect(getNextPhase(GP.End)).toBe(GP.Initiative);
    });
  });
});
