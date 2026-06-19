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
  describe('checkPhaseDamagePSR', () => {
    const makeUnitState = (damageThisPhase: number): IUnitGameState => ({
      id: 'unit-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      facing: Facing.North,
      heat: 0,
      movementThisTurn: MovementType.Stationary,
      hexesMovedThisTurn: 0,
      armor: {},
      structure: {},
      destroyedLocations: [],
      destroyedEquipment: [],
      ammo: {},
      pilotWounds: 0,
      pilotConscious: true,
      destroyed: false,
      lockState: LockState.Pending,
      damageThisPhase,
    });

    it('should return PSR when damageThisPhase >= 20', () => {
      const result = checkPhaseDamagePSR(makeUnitState(20));
      expect(result).not.toBeNull();
      expect(result!.triggerSource).toBe(PSRTrigger.PhaseDamage20Plus);
    });

    it('should return PSR when damageThisPhase > 20', () => {
      const result = checkPhaseDamagePSR(makeUnitState(35));
      expect(result).not.toBeNull();
    });

    it('should return null when damageThisPhase < 20', () => {
      const result = checkPhaseDamagePSR(makeUnitState(19));
      expect(result).toBeNull();
    });

    it('should return null when damageThisPhase is 0', () => {
      const result = checkPhaseDamagePSR(makeUnitState(0));
      expect(result).toBeNull();
    });
  });

  describe('isLegLocation', () => {
    it('should return true for left_leg', () => {
      expect(isLegLocation('left_leg')).toBe(true);
    });
    it('should return true for right_leg', () => {
      expect(isLegLocation('right_leg')).toBe(true);
    });
    it('should return false for non-leg locations', () => {
      expect(isLegLocation('left_arm')).toBe(false);
      expect(isLegLocation('center_torso')).toBe(false);
      expect(isLegLocation('head')).toBe(false);
    });
  });

  describe('isGyroDestroyed', () => {
    it('should return false for 0 gyro hits', () => {
      expect(isGyroDestroyed(DEFAULT_COMP_DAMAGE)).toBe(false);
    });
    it('should return false for 1 gyro hit', () => {
      expect(isGyroDestroyed({ ...DEFAULT_COMP_DAMAGE, gyroHits: 1 })).toBe(
        false,
      );
    });
    it('should return true for 2 gyro hits', () => {
      expect(isGyroDestroyed({ ...DEFAULT_COMP_DAMAGE, gyroHits: 2 })).toBe(
        true,
      );
    });
    it('should return true for 3+ gyro hits', () => {
      expect(isGyroDestroyed({ ...DEFAULT_COMP_DAMAGE, gyroHits: 3 })).toBe(
        true,
      );
    });
  });

  describe('createStandUpAttempt', () => {
    const makeProneUnit = (prone: boolean): IUnitGameState => ({
      id: 'unit-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      facing: Facing.North,
      heat: 0,
      movementThisTurn: MovementType.Stationary,
      hexesMovedThisTurn: 0,
      armor: {},
      structure: {},
      destroyedLocations: [],
      destroyedEquipment: [],
      ammo: {},
      pilotWounds: 0,
      pilotConscious: true,
      destroyed: false,
      lockState: LockState.Pending,
      prone,
    });

    it('should return stand-up attempt for prone unit', () => {
      const result = createStandUpAttempt(makeProneUnit(true), 4);
      expect(result).not.toBeNull();
      expect(result!.psr.triggerSource).toBe(PSRTrigger.StandingUp);
      expect(result!.mpCost).toBe(4);
    });

    it('should return null for non-prone unit', () => {
      const result = createStandUpAttempt(makeProneUnit(false), 4);
      expect(result).toBeNull();
    });

    it('should use correct walking MP cost', () => {
      const result = createStandUpAttempt(makeProneUnit(true), 6);
      expect(result!.mpCost).toBe(6);
    });
  });

  describe('deterministic resolution with seeded dice', () => {
    it('should produce identical results with same dice sequence', () => {
      const psr: IPendingPSR = createDamagePSR('unit-1');
      const roller1 = makeDiceSequence([3, 4]);
      const roller2 = makeDiceSequence([3, 4]);

      const result1 = resolvePSR(5, psr, DEFAULT_COMP_DAMAGE, 0, roller1);
      const result2 = resolvePSR(5, psr, DEFAULT_COMP_DAMAGE, 0, roller2);

      expect(result1.roll).toBe(result2.roll);
      expect(result1.passed).toBe(result2.passed);
      expect(result1.targetNumber).toBe(result2.targetNumber);
    });
  });
});
