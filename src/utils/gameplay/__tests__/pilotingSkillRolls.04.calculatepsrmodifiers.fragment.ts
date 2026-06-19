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
    it('should apply Easy Pilot to source-backed PSRs only when piloting is worse than 3', () => {
      const terrainMods = calculatePSRModifiers(
        createRubblePSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        [UNIT_QUIRK_IDS.EASY_TO_PILOT],
        [],
        false,
        undefined,
        5,
      );
      const damageMods = calculatePSRModifiers(
        createDamagePSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        [UNIT_QUIRK_IDS.EASY_TO_PILOT],
        [],
        false,
        undefined,
        5,
      );
      const skilledPilotMods = calculatePSRModifiers(
        createRubblePSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        [UNIT_QUIRK_IDS.EASY_TO_PILOT],
        [],
        false,
        undefined,
        3,
      );
      const legDamageMods = calculatePSRModifiers(
        createLegDamagePSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        [UNIT_QUIRK_IDS.EASY_TO_PILOT],
        [],
        false,
        undefined,
        5,
      );

      expect(terrainMods).toEqual([
        {
          name: 'Piloting quirks',
          source: 'quirk',
          value: -1,
        },
      ]);
      expect(damageMods).toEqual([
        {
          name: 'Piloting quirks',
          source: 'quirk',
          value: -1,
        },
      ]);
      expect(skilledPilotMods).toHaveLength(0);
      expect(legDamageMods).toHaveLength(0);
    });

    it('should apply Unbalanced only to terrain PSRs', () => {
      const terrainMods = calculatePSRModifiers(
        createRubblePSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        [UNIT_QUIRK_IDS.UNBALANCED],
      );
      const damageMods = calculatePSRModifiers(
        createDamagePSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        [UNIT_QUIRK_IDS.UNBALANCED],
      );

      expect(terrainMods).toEqual([
        {
          name: 'Piloting quirks',
          source: 'quirk',
          value: 1,
        },
      ]);
      expect(damageMods).toHaveLength(0);
    });

    it('should apply No Arms only to stand-up PSRs', () => {
      const standUpMods = calculatePSRModifiers(
        createStandingUpPSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        [UNIT_QUIRK_IDS.NO_ARMS],
      );
      const damageMods = calculatePSRModifiers(
        createDamagePSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        [UNIT_QUIRK_IDS.NO_ARMS],
      );

      expect(standUpMods).toEqual([
        {
          name: 'Piloting quirks',
          source: 'quirk',
          value: 2,
        },
      ]);
      expect(damageMods).toHaveLength(0);
    });

    it('should apply Maneuvering Ace to skidding, flanking-and-turning, and out-of-control PSRs only', () => {
      const skidMods = calculatePSRModifiers(
        createSkiddingPSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        [],
        ['maneuvering-ace'],
      );
      const flankingAndTurningMods = calculatePSRModifiers(
        createFlankingAndTurningPSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        [],
        ['maneuvering_ace'],
      );
      const outOfControlMods = calculatePSRModifiers(
        createOutOfControlPSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        [],
        ['maneuvering_ace'],
      );
      const damageMods = calculatePSRModifiers(
        createDamagePSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        [],
        ['maneuvering_ace'],
      );

      expect(skidMods).toEqual([
        {
          name: 'Maneuvering Ace',
          source: 'spa',
          value: -1,
        },
      ]);
      expect(flankingAndTurningMods).toEqual([
        {
          name: 'Maneuvering Ace',
          source: 'spa',
          value: -1,
        },
      ]);
      expect(outOfControlMods).toEqual([
        {
          name: 'Maneuvering Ace',
          source: 'spa',
          value: -1,
        },
      ]);
      expect(damageMods).toHaveLength(0);
    });

    it('should apply Animal Mimicry only to quad Mek PSRs', () => {
      const quadMods = calculatePSRModifiers(
        createDamagePSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        [],
        ['animal-mimicry'],
        true,
      );
      const bipedMods = calculatePSRModifiers(
        createDamagePSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        [],
        ['animal_mimic'],
        false,
      );

      expect(quadMods).toEqual([
        {
          name: 'Animal Mimicry',
          source: 'spa',
          value: -1,
        },
      ]);
      expect(bipedMods).toHaveLength(0);
    });
  });
});
