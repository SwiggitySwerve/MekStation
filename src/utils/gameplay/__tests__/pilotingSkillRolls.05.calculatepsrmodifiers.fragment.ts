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
  describe('calculatePSRModifiers', () => {
    it('should apply Frogman only to depth-2+ entering-water PSRs for Meks', () => {
      const depthTwoMods = calculatePSRModifiers(
        createEnteringWaterPSR('unit-1', undefined, { waterDepth: 2 }),
        DEFAULT_COMP_DAMAGE,
        0,
        [],
        ['terrain-master-frogman'],
        false,
        'BattleMech',
      );
      const shallowWaterMods = calculatePSRModifiers(
        createEnteringWaterPSR('unit-1', undefined, { waterDepth: 1 }),
        DEFAULT_COMP_DAMAGE,
        0,
        [],
        ['tm_frogman'],
        false,
        'BattleMech',
      );
      const vehicleMods = calculatePSRModifiers(
        createEnteringWaterPSR('unit-1', undefined, { waterDepth: 2 }),
        DEFAULT_COMP_DAMAGE,
        0,
        [],
        ['tm_frogman'],
        false,
        'Vehicle',
      );

      expect(depthTwoMods).toEqual([
        {
          name: 'Frogman',
          source: 'spa',
          value: -1,
        },
      ]);
      expect(shallowWaterMods).toContainEqual({
        name: 'Entering water modifier',
        source: PSRTrigger.EnteringWater,
        value: -1,
      });
      expect(shallowWaterMods).not.toContainEqual(
        expect.objectContaining({ name: 'Frogman' }),
      );
      expect(vehicleMods).toHaveLength(0);
    });

    it('should apply Mountaineer only to entering-rubble PSRs', () => {
      const rubbleMods = calculatePSRModifiers(
        createRubblePSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        [],
        ['terrain-master-mountaineer'],
      );
      const damageMods = calculatePSRModifiers(
        createDamagePSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        [],
        ['tm_mountaineer'],
      );

      expect(rubbleMods).toEqual([
        {
          name: 'Mountaineer',
          source: 'spa',
          value: -1,
        },
      ]);
      expect(damageMods).toHaveLength(0);
    });

    it('should apply Swamp Beast only to swamp bog-down PSRs', () => {
      const swampMods = calculatePSRModifiers(
        createSwampBogDownPSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        [],
        ['terrain-master-swamp-beast'],
      );
      const damageMods = calculatePSRModifiers(
        createDamagePSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        [],
        ['tm_swamp_beast'],
      );

      expect(swampMods).toEqual([
        {
          name: 'Swamp Beast',
          source: 'spa',
          value: -1,
        },
      ]);
      expect(damageMods).toHaveLength(0);
    });
  });
});
