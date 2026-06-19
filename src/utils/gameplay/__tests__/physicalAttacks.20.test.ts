import {
  ActuatorType,
  GroundMotionType,
  UnitType,
  DEFAULT_COMPONENT_DAMAGE,
  makeInput,
  calculatePunchDamage,
  calculatePunchToHit,
  canDFA,
  isPhysicalAirborneVtolOrWigeTarget,
} from './physicalAttacks.test-helpers';

describe('physicalAttacks', () => {
  describe('source-backed physical legality gates', () => {
    it('disallows DFA by a stuck attacker before jump/prone gates', () => {
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            attackerProne: true,
            attackerStuck: true,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerStuck',
      });
    });

    it('disallows DFA using mechanical jump boosters', () => {
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            attackerUsedMechanicalJumpBooster: true,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'MechanicalJumpBooster',
      });
    });

    it('disallows DFA by infantry-family attackers', () => {
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            attackerUnitType: 'Battle Armor',
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerInfantry',
      });
    });

    it('disallows DFA against DropShip targets', () => {
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            targetUnitType: UnitType.DROPSHIP,
            targetMovementComplete: true,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetDropShip',
      });
    });

    it('allows DFA against reachable airborne VTOL/WIGE targets', () => {
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            attackerHeight: 1,
            attackerJumpMP: 3,
            elevationDifference: 4,
            targetIsAirborne: true,
            targetIsAirborneVTOLorWIGE: true,
            targetMovementComplete: true,
          }),
        ),
      ).toMatchObject({
        allowed: true,
      });
    });

    it('recognizes airborne WIGE targets from vehicle motion type', () => {
      expect(
        isPhysicalAirborneVtolOrWigeTarget(
          UnitType.VEHICLE,
          GroundMotionType.WIGE,
          true,
        ),
      ).toBe(true);
      expect(
        isPhysicalAirborneVtolOrWigeTarget(
          UnitType.VEHICLE,
          GroundMotionType.WIGE,
          false,
        ),
      ).toBe(false);
    });

    it('disallows DFA when airborne VTOL/WIGE elevation is beyond jump MP', () => {
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            attackerHeight: 1,
            attackerJumpMP: 3,
            elevationDifference: 5,
            targetIsAirborne: true,
            targetIsAirborneVTOLorWIGE: true,
            targetMovementComplete: true,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'ElevationMismatch',
      });
    });
  });

  describe('calculatePunchToHit', () => {
    it('should use piloting skill as base', () => {
      const result = calculatePunchToHit(makeInput({ pilotingSkill: 5 }));
      expect(result.baseToHit).toBe(5);
      expect(result.finalToHit).toBe(5);
      expect(result.allowed).toBe(true);
    });

    it('applies Melee Specialist as a physical attack to-hit modifier', () => {
      const result = calculatePunchToHit(
        makeInput({ pilotingSkill: 5, pilotAbilities: ['melee-specialist'] }),
      );

      expect(result.finalToHit).toBe(4);
      expect(result.modifiers).toContainEqual(
        expect.objectContaining({
          name: 'Melee Specialist',
          value: -1,
          source: 'spa',
        }),
      );
    });

    it('applies matching Battle Fists as a punch to-hit modifier', () => {
      const result = calculatePunchToHit(
        makeInput({
          pilotingSkill: 5,
          arm: 'right',
          unitQuirks: ['battle_fists_ra'],
        }),
      );

      expect(result.finalToHit).toBe(4);
      expect(result.modifiers).toContainEqual(
        expect.objectContaining({
          name: 'Battle Fists',
          value: -1,
          source: 'quirk',
        }),
      );
    });

    it('does not apply Battle Fists without a working matching hand actuator', () => {
      expect(
        calculatePunchToHit(
          makeInput({
            pilotingSkill: 5,
            arm: 'right',
            unitQuirks: ['battle_fists_ra'],
            handActuatorPresent: false,
          }),
        ).finalToHit,
      ).toBe(5);
      expect(
        calculatePunchToHit(
          makeInput({
            pilotingSkill: 5,
            arm: 'right',
            unitQuirks: ['battle_fists_la'],
          }),
        ).finalToHit,
      ).toBe(5);
    });

    it('should add +2 for upper arm destroyed', () => {
      const result = calculatePunchToHit(
        makeInput({
          pilotingSkill: 5,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.UPPER_ARM]: true },
          },
        }),
      );
      expect(result.finalToHit).toBe(7);
    });

    it('should add +2 for lower arm destroyed', () => {
      const result = calculatePunchToHit(
        makeInput({
          pilotingSkill: 5,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.LOWER_ARM]: true },
          },
        }),
      );
      expect(result.finalToHit).toBe(7);
    });

    it('should add +1 for hand destroyed', () => {
      const result = calculatePunchToHit(
        makeInput({
          pilotingSkill: 5,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.HAND]: true },
          },
        }),
      );
      expect(result.finalToHit).toBe(6);
    });

    it('adds the source-backed claw punch modifier for the selected arm', () => {
      const result = calculatePunchToHit(
        makeInput({
          pilotingSkill: 5,
          arm: 'left',
          leftArmHasClaw: true,
        }),
      );

      expect(result.finalToHit).toBe(6);
      expect(result.modifiers).toContainEqual(
        expect.objectContaining({
          name: 'Using Claws',
          value: 1,
          source: 'physical-equipment',
        }),
      );
    });

    it('removes only the claw punch to-hit modifier when PLAYTEST_3 is enabled', () => {
      const toHit = calculatePunchToHit(
        makeInput({
          pilotingSkill: 5,
          arm: 'left',
          leftArmHasClaw: true,
          optionalRules: ['PLAYTEST_3'],
        }),
      );
      const damage = calculatePunchDamage(
        makeInput({
          attackerTonnage: 55,
          arm: 'left',
          leftArmHasClaw: true,
          optionalRules: ['PLAYTEST_3'],
        }),
      );

      expect(toHit.finalToHit).toBe(5);
      expect(toHit.modifiers).toContainEqual(
        expect.objectContaining({
          name: 'Using Claws',
          value: 0,
          source: 'physical-equipment',
        }),
      );
      expect(damage).toBe(8);
    });

    it('uses claws instead of a destroyed hand actuator modifier', () => {
      const result = calculatePunchToHit(
        makeInput({
          pilotingSkill: 5,
          arm: 'right',
          rightArmHasClaw: true,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.HAND]: true },
          },
        }),
      );

      expect(result.finalToHit).toBe(6);
      expect(result.modifiers).toContainEqual(
        expect.objectContaining({ name: 'Using Claws', value: 1 }),
      );
      expect(result.modifiers).not.toContainEqual(
        expect.objectContaining({ name: 'Hand actuator destroyed' }),
      );
    });

    it('should stack multiple actuator mods', () => {
      const result = calculatePunchToHit(
        makeInput({
          pilotingSkill: 5,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: {
              [ActuatorType.UPPER_ARM]: true,
              [ActuatorType.LOWER_ARM]: true,
              [ActuatorType.HAND]: true,
            },
          },
        }),
      );
      expect(result.finalToHit).toBe(10); // 5 + 2 + 2 + 1
    });

    it('should return not-allowed when shoulder destroyed', () => {
      const result = calculatePunchToHit(
        makeInput({
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.SHOULDER]: true },
          },
        }),
      );
      expect(result.allowed).toBe(false);
      expect(result.finalToHit).toBe(Infinity);
    });
  });
});
