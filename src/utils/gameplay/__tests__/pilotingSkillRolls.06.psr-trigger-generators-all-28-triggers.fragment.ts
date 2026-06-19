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
  describe('PSR Trigger Generators — all 28 triggers', () => {
    const triggerTests: Array<{
      fn: (id: string) => IPendingPSR;
      expectedSource: PSRTrigger;
      expectedMod: number;
    }> = [
      {
        fn: createDamagePSR,
        expectedSource: PSRTrigger.PhaseDamage20Plus,
        expectedMod: 0,
      },
      {
        fn: createLegDamagePSR,
        expectedSource: PSRTrigger.LegDamage,
        expectedMod: 0,
      },
      {
        fn: createHipActuatorPSR,
        expectedSource: PSRTrigger.HipActuatorDestroyed,
        expectedMod: 0,
      },
      { fn: createGyroPSR, expectedSource: PSRTrigger.GyroHit, expectedMod: 0 },
      {
        fn: createEngineHitPSR,
        expectedSource: PSRTrigger.EngineHit,
        expectedMod: 0,
      },
      {
        fn: createUpperLegActuatorPSR,
        expectedSource: PSRTrigger.UpperLegActuatorHit,
        expectedMod: 0,
      },
      {
        fn: createLowerLegActuatorPSR,
        expectedSource: PSRTrigger.LowerLegActuatorHit,
        expectedMod: 0,
      },
      {
        fn: createFootActuatorPSR,
        expectedSource: PSRTrigger.FootActuatorHit,
        expectedMod: 0,
      },
      {
        fn: createKickedPSR,
        expectedSource: PSRTrigger.Kicked,
        expectedMod: 0,
      },
      {
        fn: createChargedPSR,
        expectedSource: PSRTrigger.Charged,
        expectedMod: 2,
      },
      {
        fn: createDFATargetPSR,
        expectedSource: PSRTrigger.DFATarget,
        expectedMod: 2,
      },
      {
        fn: createPushedPSR,
        expectedSource: PSRTrigger.Pushed,
        expectedMod: 0,
      },
      {
        fn: createKickMissPSR,
        expectedSource: PSRTrigger.KickMiss,
        expectedMod: 0,
      },
      {
        fn: createChargeMissPSR,
        expectedSource: PSRTrigger.ChargeMiss,
        expectedMod: 0,
      },
      {
        fn: createDFAMissPSR,
        expectedSource: PSRTrigger.DFAMiss,
        expectedMod: 4,
      },
      {
        fn: createShutdownPSR,
        expectedSource: PSRTrigger.Shutdown,
        expectedMod: 0,
      },
      {
        fn: createStandingUpPSR,
        expectedSource: PSRTrigger.StandingUp,
        expectedMod: 0,
      },
      {
        fn: createRubblePSR,
        expectedSource: PSRTrigger.EnteringRubble,
        expectedMod: 0,
      },
      {
        fn: createRunningRoughTerrainPSR,
        expectedSource: PSRTrigger.RunningRoughTerrain,
        expectedMod: 0,
      },
      {
        fn: createIcePSR,
        expectedSource: PSRTrigger.MovingOnIce,
        expectedMod: 0,
      },
      {
        fn: createEnteringWaterPSR,
        expectedSource: PSRTrigger.EnteringWater,
        expectedMod: 0,
      },
      {
        fn: createExitingWaterPSR,
        expectedSource: PSRTrigger.ExitingWater,
        expectedMod: 0,
      },
      {
        fn: createSwampBogDownPSR,
        expectedSource: PSRTrigger.SwampBogDown,
        expectedMod: 0,
      },
      {
        fn: createSkiddingPSR,
        expectedSource: PSRTrigger.Skidding,
        expectedMod: 0,
      },
      {
        fn: createRunningDamagedHipPSR,
        expectedSource: PSRTrigger.RunningDamagedHip,
        expectedMod: 0,
      },
      {
        fn: createRunningDamagedGyroPSR,
        expectedSource: PSRTrigger.RunningDamagedGyro,
        expectedMod: 0,
      },
      {
        fn: createFlankingAndTurningPSR,
        expectedSource: PSRTrigger.FlankingAndTurning,
        expectedMod: 0,
      },
      {
        fn: createOutOfControlPSR,
        expectedSource: PSRTrigger.OutOfControl,
        expectedMod: 0,
      },
      {
        fn: createBuildingCollapsePSR,
        expectedSource: PSRTrigger.BuildingCollapse,
        expectedMod: 0,
      },
      {
        fn: createMASCFailurePSR,
        expectedSource: PSRTrigger.MASCFailure,
        expectedMod: 0,
      },
      {
        fn: createSuperchargerFailurePSR,
        expectedSource: PSRTrigger.SuperchargerFailure,
        expectedMod: 0,
      },
    ];

    it.each(triggerTests)(
      'trigger $expectedSource should create valid IPendingPSR',
      ({ fn, expectedSource, expectedMod }) => {
        const psr = fn('test-unit');
        expect(psr.entityId).toBe('test-unit');
        expect(psr.triggerSource).toBe(expectedSource);
        expect(psr.additionalModifier).toBe(expectedMod);
        expect(psr.reason).toBeTruthy();
      },
    );

    it('should have exactly 31 trigger types (30 catalog entries + standing up)', () => {
      expect(triggerTests).toHaveLength(31);
    });

    it.each([
      [1, -1],
      [2, 0],
      [3, 1],
    ])(
      'stamps source-backed Depth %s water-entry modifier',
      (waterDepth, mod) => {
        const psr = createEnteringWaterPSR('test-unit', undefined, {
          waterDepth,
        });

        expect(psr.additionalModifier).toBe(mod);
        expect(psr.terrainLevel).toBe(waterDepth);
      },
    );
  });
});
