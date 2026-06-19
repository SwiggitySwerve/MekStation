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
    it('should return empty for undamaged unit with no wounds', () => {
      const psr: IPendingPSR = createDamagePSR('unit-1');
      const mods = calculatePSRModifiers(psr, DEFAULT_COMP_DAMAGE, 0);
      expect(mods).toHaveLength(0);
    });

    it('should include gyro +3 per hit', () => {
      const psr: IPendingPSR = createDamagePSR('unit-1');
      const compDamage: IComponentDamageState = {
        ...DEFAULT_COMP_DAMAGE,
        gyroHits: 2,
      };
      const mods = calculatePSRModifiers(psr, compDamage, 0);
      const gyroMod = mods.find((m) => m.source === 'gyro');
      expect(gyroMod).toBeDefined();
      expect(gyroMod!.value).toBe(6); // 2 * 3
    });

    it('should include pilot wounds +1 per wound', () => {
      const psr: IPendingPSR = createDamagePSR('unit-1');
      const mods = calculatePSRModifiers(psr, DEFAULT_COMP_DAMAGE, 3);
      const pilotMod = mods.find((m) => m.source === 'pilot');
      expect(pilotMod).toBeDefined();
      expect(pilotMod!.value).toBe(3);
    });

    it('should include hip actuator +2', () => {
      const psr: IPendingPSR = createDamagePSR('unit-1');
      const compDamage: IComponentDamageState = {
        ...DEFAULT_COMP_DAMAGE,
        actuators: { [ActuatorType.HIP]: true },
      };
      const mods = calculatePSRModifiers(psr, compDamage, 0);
      const hipMod = mods.find((m) => m.name === 'Hip actuator destroyed');
      expect(hipMod).toBeDefined();
      expect(hipMod!.value).toBe(2);
    });

    it('should include upper/lower leg and foot +1 each', () => {
      const psr: IPendingPSR = createDamagePSR('unit-1');
      const compDamage: IComponentDamageState = {
        ...DEFAULT_COMP_DAMAGE,
        actuators: {
          [ActuatorType.UPPER_LEG]: true,
          [ActuatorType.LOWER_LEG]: true,
          [ActuatorType.FOOT]: true,
        },
      };
      const mods = calculatePSRModifiers(psr, compDamage, 0);
      const actuatorMods = mods.filter((m) => m.source === 'actuator');
      expect(actuatorMods).toHaveLength(3);
      expect(actuatorMods.reduce((s, m) => s + m.value, 0)).toBe(3);
    });

    it('should include PSR additional modifier', () => {
      const psr: IPendingPSR = createDFAMissPSR('unit-1');
      const mods = calculatePSRModifiers(psr, DEFAULT_COMP_DAMAGE, 0);
      const dfaMod = mods.find((m) => m.source === PSRTrigger.DFAMiss);
      expect(dfaMod).toBeDefined();
      expect(dfaMod!.value).toBe(4);
    });

    it('should include source-backed skidding movement-distance modifier', () => {
      const psr: IPendingPSR = createSkiddingPSR('unit-1', undefined, 2);
      const mods = calculatePSRModifiers(psr, DEFAULT_COMP_DAMAGE, 0);
      const skidMod = mods.find((m) => m.source === PSRTrigger.Skidding);

      expect(skidMod).toEqual({
        name: 'Skidding modifier',
        source: PSRTrigger.Skidding,
        value: 2,
      });
    });

    it('should not include zero additional modifier', () => {
      const psr: IPendingPSR = createDamagePSR('unit-1');
      const mods = calculatePSRModifiers(psr, DEFAULT_COMP_DAMAGE, 0);
      expect(mods).toHaveLength(0);
    });

    it.each([
      [UNIT_QUIRK_IDS.HARD_TO_PILOT, 1],
      [UNIT_QUIRK_IDS.CRAMPED_COCKPIT, 1],
    ])('should apply %s to non-terrain PSRs', (quirkId, expectedValue) => {
      const psr: IPendingPSR = createDamagePSR('unit-1');
      const mods = calculatePSRModifiers(psr, DEFAULT_COMP_DAMAGE, 0, [
        quirkId,
      ]);

      expect(mods).toEqual([
        {
          name: 'Piloting quirks',
          source: 'quirk',
          value: expectedValue,
        },
      ]);
    });

    it('suppresses source-backed Cramped Cockpit PSR penalties for Small Pilot', () => {
      const psr: IPendingPSR = createDamagePSR('unit-1');
      const crampedMods = calculatePSRModifiers(
        psr,
        DEFAULT_COMP_DAMAGE,
        0,
        [UNIT_QUIRK_IDS.CRAMPED_COCKPIT],
        [],
        false,
        undefined,
        5,
      );
      const smallPilotMods = calculatePSRModifiers(
        psr,
        DEFAULT_COMP_DAMAGE,
        0,
        [UNIT_QUIRK_IDS.CRAMPED_COCKPIT],
        ['small_pilot'],
        false,
        undefined,
        5,
      );

      expect(crampedMods).toEqual([
        { name: 'Piloting quirks', source: 'quirk', value: 1 },
      ]);
      expect(smallPilotMods).toHaveLength(0);
    });

    it('should apply Stable only to source-backed kick/push PSRs', () => {
      const kickedMods = calculatePSRModifiers(
        createKickedPSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        [UNIT_QUIRK_IDS.STABLE],
      );
      const pushedMods = calculatePSRModifiers(
        createPushedPSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        [UNIT_QUIRK_IDS.STABLE],
      );
      const damageMods = calculatePSRModifiers(
        createDamagePSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        [UNIT_QUIRK_IDS.STABLE],
      );

      expect(kickedMods).toEqual([
        { name: 'Piloting quirks', source: 'quirk', value: -1 },
      ]);
      expect(pushedMods).toEqual([
        { name: 'Piloting quirks', source: 'quirk', value: -1 },
      ]);
      expect(damageMods).toHaveLength(0);
    });
  });
});
