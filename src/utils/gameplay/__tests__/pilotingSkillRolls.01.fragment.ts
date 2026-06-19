import { describe, expect, it } from '@jest/globals';

import type {
  IComponentDamageState,
  IPendingPSR,
  IUnitGameState,
} from './pilotingSkillRolls.test-helpers';

import {
  ActuatorType,
  DEFAULT_COMP_DAMAGE,
  Facing,
  GameSide,
  LockState,
  MovementType,
  PSRTrigger,
  UNIT_QUIRK_IDS,
  calculatePSRModifiers,
  checkPhaseDamagePSR,
  createBuildingCollapsePSR,
  createChargeMissPSR,
  createChargedPSR,
  createDFAAttackerPSR,
  createDFAMissPSR,
  createDFATargetPSR,
  createDamagePSR,
  createEngineHitPSR,
  createEnteringWaterPSR,
  createExitingWaterPSR,
  createFlankingAndTurningPSR,
  createFootActuatorPSR,
  createGyroPSR,
  createHipActuatorPSR,
  createIcePSR,
  createKickMissPSR,
  createKickedPSR,
  createLegDamagePSR,
  createLowerLegActuatorPSR,
  createMASCFailurePSR,
  createOutOfControlPSR,
  createPushedPSR,
  createRubblePSR,
  createRunningDamagedGyroPSR,
  createRunningDamagedHipPSR,
  createRunningRoughTerrainPSR,
  createShutdownPSR,
  createSkiddingPSR,
  createStandingUpPSR,
  createStandUpAttempt,
  createSuperchargerFailurePSR,
  createSwampBogDownPSR,
  createUpperLegActuatorPSR,
  getMASCOrSuperchargerFailureTargetNumber,
  isGyroDestroyed,
  isLegLocation,
  makeDiceSequence,
  resolveAllPSRs,
  resolvePSR,
} from './pilotingSkillRolls.test-helpers';

describe('Piloting Skill Rolls', () => {
  describe('resolvePSR', () => {
    it('should pass when 2d6 >= piloting skill (no modifiers)', () => {
      const psr: IPendingPSR = createDamagePSR('unit-1');
      const roller = makeDiceSequence([4, 3]); // total = 7
      const result = resolvePSR(5, psr, DEFAULT_COMP_DAMAGE, 0, roller);

      expect(result.targetNumber).toBe(5);
      expect(result.roll).toBe(7);
      expect(result.passed).toBe(true);
    });

    it('should fail when 2d6 < piloting skill', () => {
      const psr: IPendingPSR = createDamagePSR('unit-1');
      const roller = makeDiceSequence([1, 2]); // total = 3
      const result = resolvePSR(5, psr, DEFAULT_COMP_DAMAGE, 0, roller);

      expect(result.targetNumber).toBe(5);
      expect(result.roll).toBe(3);
      expect(result.passed).toBe(false);
    });

    it('should pass when roll exactly meets target number (meet-or-beat)', () => {
      const psr: IPendingPSR = createDamagePSR('unit-1');
      const roller = makeDiceSequence([3, 2]); // total = 5
      const result = resolvePSR(5, psr, DEFAULT_COMP_DAMAGE, 0, roller);

      expect(result.targetNumber).toBe(5);
      expect(result.roll).toBe(5);
      expect(result.passed).toBe(true);
    });

    it('should add gyro damage modifier (+3 per hit)', () => {
      const psr: IPendingPSR = createDamagePSR('unit-1');
      const compDamage: IComponentDamageState = {
        ...DEFAULT_COMP_DAMAGE,
        gyroHits: 1,
      };
      const roller = makeDiceSequence([4, 3]); // total = 7
      const result = resolvePSR(5, psr, compDamage, 0, roller);

      expect(result.targetNumber).toBe(8); // 5 + 3
      expect(result.passed).toBe(false); // 7 < 8
    });

    it('should add pilot wounds modifier (+1 per wound)', () => {
      const psr: IPendingPSR = createDamagePSR('unit-1');
      const roller = makeDiceSequence([4, 3]); // total = 7
      const result = resolvePSR(5, psr, DEFAULT_COMP_DAMAGE, 2, roller);

      expect(result.targetNumber).toBe(7); // 5 + 2
      expect(result.passed).toBe(true); // 7 >= 7
    });

    it('should stack gyro + pilot wound modifiers', () => {
      const psr: IPendingPSR = createDamagePSR('unit-1');
      const compDamage: IComponentDamageState = {
        ...DEFAULT_COMP_DAMAGE,
        gyroHits: 1,
      };
      const roller = makeDiceSequence([5, 5]); // total = 10
      const result = resolvePSR(5, psr, compDamage, 2, roller);

      expect(result.targetNumber).toBe(10); // 5 + 3 (gyro) + 2 (wounds)
      expect(result.passed).toBe(true); // 10 >= 10
    });

    it('should add actuator damage modifiers', () => {
      const psr: IPendingPSR = createDamagePSR('unit-1');
      const compDamage: IComponentDamageState = {
        ...DEFAULT_COMP_DAMAGE,
        actuators: { [ActuatorType.HIP]: true, [ActuatorType.FOOT]: true },
      };
      const roller = makeDiceSequence([5, 5]); // total = 10
      const result = resolvePSR(5, psr, compDamage, 0, roller);

      expect(result.targetNumber).toBe(8); // 5 + 2 (hip) + 1 (foot)
      expect(result.passed).toBe(true);
    });

    it('should use fixed TN 3 for shutdown PSR (ignoring piloting skill)', () => {
      const psr: IPendingPSR = createShutdownPSR('unit-1');
      const roller = makeDiceSequence([2, 1]); // total = 3
      const result = resolvePSR(5, psr, DEFAULT_COMP_DAMAGE, 0, roller);

      expect(result.targetNumber).toBe(3);
      expect(result.roll).toBe(3);
      expect(result.passed).toBe(true);
    });

    it('uses source-backed fixed MASC/Supercharger target numbers without piloting modifiers', () => {
      const psr: IPendingPSR = createMASCFailurePSR('unit-1', 2);
      const compDamage: IComponentDamageState = {
        ...DEFAULT_COMP_DAMAGE,
        gyroHits: 1,
      };
      const roller = makeDiceSequence([3, 3]); // total = 6
      const result = resolvePSR(3, psr, compDamage, 2, roller, [
        UNIT_QUIRK_IDS.STABLE,
      ]);

      expect(getMASCOrSuperchargerFailureTargetNumber(2)).toBe(7);
      expect(psr.fixedTargetNumber).toBe(7);
      expect(result.targetNumber).toBe(7);
      expect(result.roll).toBe(6);
      expect(result.passed).toBe(false);
      expect(result.modifiers).toEqual([]);
    });

    it('applies explicit trigger modifiers on fixed target numbers without piloting modifiers', () => {
      const psr: IPendingPSR = {
        entityId: 'unit-1',
        reason: 'Fixed system check',
        additionalModifier: 1,
        triggerSource: 'system_check',
        fixedTargetNumber: 7,
      };
      const compDamage: IComponentDamageState = {
        ...DEFAULT_COMP_DAMAGE,
        gyroHits: 1,
      };
      const roller = makeDiceSequence([3, 5]); // total = 8
      const result = resolvePSR(3, psr, compDamage, 2, roller, [
        UNIT_QUIRK_IDS.STABLE,
      ]);

      expect(result.targetNumber).toBe(8);
      expect(result.roll).toBe(8);
      expect(result.passed).toBe(true);
      expect(result.modifiers).toEqual([
        {
          name: 'Fixed system check modifier',
          value: 1,
          source: 'system_check',
        },
      ]);
    });

    it('should apply DFA miss +4 modifier', () => {
      const psr: IPendingPSR = createDFAMissPSR('unit-1');
      const roller = makeDiceSequence([5, 4]); // total = 9
      const result = resolvePSR(5, psr, DEFAULT_COMP_DAMAGE, 0, roller);

      expect(result.targetNumber).toBe(9); // 5 + 4
      expect(result.passed).toBe(true); // 9 >= 9
    });

    it('should apply source-backed DFA attacker +4 modifier', () => {
      const psr: IPendingPSR = createDFAAttackerPSR('unit-1');
      const roller = makeDiceSequence([5, 4]); // total = 9
      const result = resolvePSR(5, psr, DEFAULT_COMP_DAMAGE, 0, roller);

      expect(psr).toMatchObject({
        reason: 'Executed DFA',
        reasonCode: PSRTrigger.DFATarget,
        triggerSource: 'dfa_attacker_hit',
      });
      expect(result.targetNumber).toBe(9);
      expect(result.passed).toBe(true);
    });

    it('should return modifier breakdown', () => {
      const psr: IPendingPSR = createDFAMissPSR('unit-1');
      const compDamage: IComponentDamageState = {
        ...DEFAULT_COMP_DAMAGE,
        gyroHits: 1,
      };
      const roller = makeDiceSequence([6, 6]); // total = 12
      const result = resolvePSR(5, psr, compDamage, 1, roller);

      expect(result.modifiers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Gyro damage', value: 3 }),
          expect.objectContaining({ name: 'Pilot wounds', value: 1 }),
          expect.objectContaining({ value: 4, source: PSRTrigger.DFAMiss }),
        ]),
      );
      expect(result.targetNumber).toBe(13); // 5 + 3 + 1 + 4
    });

    it('does not apply Stable to non-kick/push PSR target numbers', () => {
      const psr: IPendingPSR = createDamagePSR('unit-1');
      const roller = makeDiceSequence([2, 2]); // total = 4
      const result = resolvePSR(5, psr, DEFAULT_COMP_DAMAGE, 0, roller, [
        UNIT_QUIRK_IDS.STABLE,
      ]);

      expect(result.targetNumber).toBe(5);
      expect(result.roll).toBe(4);
      expect(result.passed).toBe(false);
      expect(result.modifiers).toEqual([]);
    });
  });
});
