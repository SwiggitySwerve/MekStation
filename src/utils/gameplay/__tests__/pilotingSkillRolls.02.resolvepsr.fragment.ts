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
    it('applies source-backed Stable relief to kick and push PSRs', () => {
      const roller = makeDiceSequence([2, 2, 2, 2]); // total = 4 twice
      const kicked = resolvePSR(
        5,
        createKickedPSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        roller,
        [UNIT_QUIRK_IDS.STABLE],
      );
      const pushed = resolvePSR(
        5,
        createPushedPSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        roller,
        [UNIT_QUIRK_IDS.STABLE],
      );

      expect(kicked).toMatchObject({ targetNumber: 4, passed: true });
      expect(pushed).toMatchObject({ targetNumber: 4, passed: true });
      expect(kicked.modifiers).toEqual([
        { name: 'Piloting quirks', source: 'quirk', value: -1 },
      ]);
      expect(pushed.modifiers).toEqual([
        { name: 'Piloting quirks', source: 'quirk', value: -1 },
      ]);
    });

    it('applies source-backed Easy Pilot relief only to eligible PSRs for pilots worse than 3', () => {
      const roller = makeDiceSequence([2, 2, 2, 2, 2, 2, 2, 2]);
      const terrain = resolvePSR(
        5,
        createRubblePSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        roller,
        [UNIT_QUIRK_IDS.EASY_TO_PILOT],
      );
      const damage = resolvePSR(
        5,
        createDamagePSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        roller,
        [UNIT_QUIRK_IDS.EASY_TO_PILOT],
      );
      const skilledPilot = resolvePSR(
        3,
        createRubblePSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        roller,
        [UNIT_QUIRK_IDS.EASY_TO_PILOT],
      );
      const legDamage = resolvePSR(
        5,
        createLegDamagePSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        roller,
        [UNIT_QUIRK_IDS.EASY_TO_PILOT],
      );

      expect(terrain).toMatchObject({ targetNumber: 4, passed: true });
      expect(damage).toMatchObject({ targetNumber: 4, passed: true });
      expect(skilledPilot).toMatchObject({ targetNumber: 3, passed: true });
      expect(legDamage).toMatchObject({ targetNumber: 5, passed: false });
      expect(terrain.modifiers).toEqual([
        { name: 'Piloting quirks', source: 'quirk', value: -1 },
      ]);
      expect(damage.modifiers).toEqual([
        { name: 'Piloting quirks', source: 'quirk', value: -1 },
      ]);
      expect(skilledPilot.modifiers).toEqual([]);
      expect(legDamage.modifiers).toEqual([]);
    });

    it('suppresses Cramped Cockpit PSR penalties when pilot has Small Pilot', () => {
      const roller = makeDiceSequence([2, 2, 2, 2]);
      const cramped = resolvePSR(
        5,
        createDamagePSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        roller,
        [UNIT_QUIRK_IDS.CRAMPED_COCKPIT],
      );
      const smallPilot = resolvePSR(
        5,
        createDamagePSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        roller,
        [UNIT_QUIRK_IDS.CRAMPED_COCKPIT],
        ['small_pilot'],
      );

      expect(cramped).toMatchObject({ targetNumber: 6, passed: false });
      expect(smallPilot).toMatchObject({ targetNumber: 5, passed: false });
      expect(cramped.modifiers).toEqual([
        { name: 'Piloting quirks', source: 'quirk', value: 1 },
      ]);
      expect(smallPilot.modifiers).toEqual([]);
    });
  });

  describe('resolveAllPSRs — first-failure-clears-remaining', () => {
    it('should return empty result for no pending PSRs', () => {
      const result = resolveAllPSRs(5, [], DEFAULT_COMP_DAMAGE, 0);
      expect(result.results).toHaveLength(0);
      expect(result.unitFell).toBe(false);
      expect(result.clearedPSRs).toHaveLength(0);
    });

    it('should resolve all PSRs when all pass', () => {
      const psrs: IPendingPSR[] = [
        createDamagePSR('unit-1'),
        createLegDamagePSR('unit-1'),
      ];
      const roller = makeDiceSequence([4, 4, 5, 5]); // 8, 10 — both pass with skill 5
      const result = resolveAllPSRs(5, psrs, DEFAULT_COMP_DAMAGE, 0, roller);

      expect(result.results).toHaveLength(2);
      expect(result.results.every((r) => r.passed)).toBe(true);
      expect(result.unitFell).toBe(false);
      expect(result.clearedPSRs).toHaveLength(0);
    });

    it('should stop on first failure and clear remaining', () => {
      const psrs: IPendingPSR[] = [
        createDamagePSR('unit-1'),
        createLegDamagePSR('unit-1'),
        createGyroPSR('unit-1'),
      ];
      // First roll: 1+1=2 (fail), remaining cleared
      const roller = makeDiceSequence([1, 1]);
      const result = resolveAllPSRs(5, psrs, DEFAULT_COMP_DAMAGE, 0, roller);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].passed).toBe(false);
      expect(result.unitFell).toBe(true);
      expect(result.clearedPSRs).toHaveLength(2);
      expect(result.clearedPSRs[0].triggerSource).toBe(PSRTrigger.LegDamage);
      expect(result.clearedPSRs[1].triggerSource).toBe(PSRTrigger.GyroHit);
    });

    it('should stop on second failure, keeping first success', () => {
      const psrs: IPendingPSR[] = [
        createDamagePSR('unit-1'),
        createLegDamagePSR('unit-1'),
        createGyroPSR('unit-1'),
      ];
      // First roll: 6+6=12 (pass), Second roll: 1+1=2 (fail), third cleared
      const roller = makeDiceSequence([6, 6, 1, 1]);
      const result = resolveAllPSRs(5, psrs, DEFAULT_COMP_DAMAGE, 0, roller);

      expect(result.results).toHaveLength(2);
      expect(result.results[0].passed).toBe(true);
      expect(result.results[1].passed).toBe(false);
      expect(result.unitFell).toBe(true);
      expect(result.clearedPSRs).toHaveLength(1);
    });
  });
});
