/**
 * Per `structure-psr-reason-as-discriminated-code` (PR E): each PSR
 * factory across the five module families
 * (combat / damage / environment / system / phaseChecks) MUST populate
 * `reasonCode: PSRTrigger.X` on the returned `IPendingPSR` alongside the
 * existing free-form `reason: string`. These tests are a one-per-family
 * regression net for the factory migration; they don't enumerate every
 * factory in every family.
 *
 * @spec openspec/changes/structure-psr-reason-as-discriminated-code/specs/piloting-skill-rolls/spec.md
 *   Requirement: PSR Reason Code Discriminated Field — Scenario "Factory populates reasonCode alongside reason"
 */
import {
  // combat family
  createKickedPSR,
  createChargedPSR,
  createDFAAttackerPSR,
  createDFATargetPSR,
  createDominoEffectPSR,
  createPushedPSR,
  createKickMissPSR,
  createChargeMissPSR,
  createDFAMissPSR,

  // damage family
  createDamagePSR,
  createLegDamagePSR,
  createHipActuatorPSR,
  createGyroPSR,
  createEngineHitPSR,
  createUpperLegActuatorPSR,
  createLowerLegActuatorPSR,
  createFootActuatorPSR,

  // environment family
  createShutdownPSR,
  createStandingUpPSR,
  createRubblePSR,
  createRunningRoughTerrainPSR,
  createIcePSR,
  createEnteringWaterPSR,
  createExitingWaterPSR,
  createSkiddingPSR,
  createSwampBogDownPSR,
  createBuildingCollapsePSR,

  // system family
  createRunningDamagedHipPSR,
  createRunningDamagedGyroPSR,
  createMASCFailurePSR,
  createSuperchargerFailurePSR,
  getMASCOrSuperchargerFailureTargetNumber,
  PSRTrigger,
} from '../../pilotingSkillRolls';
import { createStandUpAttempt } from '../../pilotingSkillRolls';

describe('PSR factory reasonCode population (PR E)', () => {
  const ENTITY = 'unit-1';

  describe('combat factories', () => {
    it.each([
      ['createKickedPSR', createKickedPSR(ENTITY), PSRTrigger.Kicked],
      ['createChargedPSR', createChargedPSR(ENTITY), PSRTrigger.Charged],
      ['createDFATargetPSR', createDFATargetPSR(ENTITY), PSRTrigger.DFATarget],
      [
        'createDFAAttackerPSR',
        createDFAAttackerPSR(ENTITY),
        PSRTrigger.DFATarget,
      ],
      ['createPushedPSR', createPushedPSR(ENTITY), PSRTrigger.Pushed],
      [
        'createDominoEffectPSR',
        createDominoEffectPSR(ENTITY),
        PSRTrigger.DominoEffect,
      ],
      ['createKickMissPSR', createKickMissPSR(ENTITY), PSRTrigger.KickMiss],
      [
        'createChargeMissPSR',
        createChargeMissPSR(ENTITY),
        PSRTrigger.ChargeMiss,
      ],
      ['createDFAMissPSR', createDFAMissPSR(ENTITY), PSRTrigger.DFAMiss],
    ])('%s populates reasonCode', (_name, psr, expected) => {
      expect(psr.reasonCode).toBe(expected);
      expect(typeof psr.reason).toBe('string');
      expect(psr.reason.length).toBeGreaterThan(0);
    });

    it('system booster factories stamp source-backed fixed failure target numbers', () => {
      expect(getMASCOrSuperchargerFailureTargetNumber(undefined)).toBe(3);
      expect(getMASCOrSuperchargerFailureTargetNumber(0)).toBe(3);
      expect(getMASCOrSuperchargerFailureTargetNumber(1)).toBe(5);
      expect(getMASCOrSuperchargerFailureTargetNumber(2)).toBe(7);
      expect(getMASCOrSuperchargerFailureTargetNumber(3)).toBe(11);
      expect(getMASCOrSuperchargerFailureTargetNumber(99)).toBe(13);
      expect(createMASCFailurePSR(ENTITY, 2)).toMatchObject({
        reasonCode: PSRTrigger.MASCFailure,
        fixedTargetNumber: 7,
      });
      expect(createSuperchargerFailurePSR(ENTITY, 3)).toMatchObject({
        reasonCode: PSRTrigger.SuperchargerFailure,
        fixedTargetNumber: 11,
      });
    });
  });

  describe('damage factories', () => {
    it.each([
      [
        'createDamagePSR',
        createDamagePSR(ENTITY),
        PSRTrigger.PhaseDamage20Plus,
      ],
      ['createLegDamagePSR', createLegDamagePSR(ENTITY), PSRTrigger.LegDamage],
      [
        'createHipActuatorPSR',
        createHipActuatorPSR(ENTITY),
        PSRTrigger.HipActuatorDestroyed,
      ],
      ['createGyroPSR', createGyroPSR(ENTITY), PSRTrigger.GyroHit],
      ['createEngineHitPSR', createEngineHitPSR(ENTITY), PSRTrigger.EngineHit],
      [
        'createUpperLegActuatorPSR',
        createUpperLegActuatorPSR(ENTITY),
        PSRTrigger.UpperLegActuatorHit,
      ],
      [
        'createLowerLegActuatorPSR',
        createLowerLegActuatorPSR(ENTITY),
        PSRTrigger.LowerLegActuatorHit,
      ],
      [
        'createFootActuatorPSR',
        createFootActuatorPSR(ENTITY),
        PSRTrigger.FootActuatorHit,
      ],
    ])('%s populates reasonCode', (_name, psr, expected) => {
      expect(psr.reasonCode).toBe(expected);
      expect(typeof psr.reason).toBe('string');
      expect(psr.reason.length).toBeGreaterThan(0);
    });
  });

  describe('environment factories', () => {
    it.each([
      ['createShutdownPSR', createShutdownPSR(ENTITY), PSRTrigger.Shutdown],
      [
        'createStandingUpPSR',
        createStandingUpPSR(ENTITY),
        PSRTrigger.StandingUp,
      ],
      ['createRubblePSR', createRubblePSR(ENTITY), PSRTrigger.EnteringRubble],
      [
        'createRunningRoughTerrainPSR',
        createRunningRoughTerrainPSR(ENTITY),
        PSRTrigger.RunningRoughTerrain,
      ],
      ['createIcePSR', createIcePSR(ENTITY), PSRTrigger.MovingOnIce],
      [
        'createEnteringWaterPSR',
        createEnteringWaterPSR(ENTITY),
        PSRTrigger.EnteringWater,
      ],
      [
        'createExitingWaterPSR',
        createExitingWaterPSR(ENTITY),
        PSRTrigger.ExitingWater,
      ],
      ['createSkiddingPSR', createSkiddingPSR(ENTITY), PSRTrigger.Skidding],
      [
        'createSwampBogDownPSR',
        createSwampBogDownPSR(ENTITY),
        PSRTrigger.SwampBogDown,
      ],
      [
        'createBuildingCollapsePSR',
        createBuildingCollapsePSR(ENTITY),
        PSRTrigger.BuildingCollapse,
      ],
    ])('%s populates reasonCode', (_name, psr, expected) => {
      expect(psr.reasonCode).toBe(expected);
      expect(typeof psr.reason).toBe('string');
      expect(psr.reason.length).toBeGreaterThan(0);
    });

    it('environment factories preserve the optional movement-step trigger source while still stamping reasonCode', () => {
      // PR-C invariant: passing stepIndex overrides triggerSource to
      // `'movement-step:<n>'` but reasonCode stays the canonical enum
      // value so consumers can still bucket.
      const stepBound = createIcePSR(ENTITY, 3);
      expect(stepBound.triggerSource).toBe('movement-step:3');
      expect(stepBound.reasonCode).toBe(PSRTrigger.MovingOnIce);
    });
  });

  describe('system factories', () => {
    it.each([
      [
        'createRunningDamagedHipPSR',
        createRunningDamagedHipPSR(ENTITY),
        PSRTrigger.RunningDamagedHip,
      ],
      [
        'createRunningDamagedGyroPSR',
        createRunningDamagedGyroPSR(ENTITY),
        PSRTrigger.RunningDamagedGyro,
      ],
      [
        'createMASCFailurePSR',
        createMASCFailurePSR(ENTITY),
        PSRTrigger.MASCFailure,
      ],
      [
        'createSuperchargerFailurePSR',
        createSuperchargerFailurePSR(ENTITY),
        PSRTrigger.SuperchargerFailure,
      ],
    ])('%s populates reasonCode', (_name, psr, expected) => {
      expect(psr.reasonCode).toBe(expected);
      expect(typeof psr.reason).toBe('string');
      expect(psr.reason.length).toBeGreaterThan(0);
    });
  });

  describe('phaseChecks factory', () => {
    it('createStandUpAttempt produces a PSR with reasonCode StandingUp', () => {
      const stub = {
        id: ENTITY,
        prone: true,
      } as unknown as Parameters<typeof createStandUpAttempt>[0];
      const result = createStandUpAttempt(stub, 4);
      expect(result).not.toBeNull();
      expect(result!.psr.reasonCode).toBe(PSRTrigger.StandingUp);
    });
  });
});
