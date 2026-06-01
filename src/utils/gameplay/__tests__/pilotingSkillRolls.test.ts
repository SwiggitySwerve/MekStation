import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  IComponentDamageState,
  IPendingPSR,
  IUnitGameState,
  GameSide,
  LockState,
  MovementType,
  Facing,
} from '@/types/gameplay';

import {
  resolvePSR,
  resolveAllPSRs,
  calculatePSRModifiers,
  checkPhaseDamagePSR,
  isLegLocation,
  isGyroDestroyed,
  createStandUpAttempt,
  createDamagePSR,
  createLegDamagePSR,
  createHipActuatorPSR,
  createGyroPSR,
  createEngineHitPSR,
  createUpperLegActuatorPSR,
  createLowerLegActuatorPSR,
  createFootActuatorPSR,
  createKickedPSR,
  createChargedPSR,
  createDFAAttackerPSR,
  createDFATargetPSR,
  createPushedPSR,
  createKickMissPSR,
  createChargeMissPSR,
  createDFAMissPSR,
  createShutdownPSR,
  createStandingUpPSR,
  createRubblePSR,
  createRunningRoughTerrainPSR,
  createIcePSR,
  createEnteringWaterPSR,
  createExitingWaterPSR,
  createSkiddingPSR,
  createRunningDamagedHipPSR,
  createRunningDamagedGyroPSR,
  createBuildingCollapsePSR,
  createSwampBogDownPSR,
  getMASCOrSuperchargerFailureTargetNumber,
  createMASCFailurePSR,
  createSuperchargerFailurePSR,
  PSRTrigger,
  IPSRResult,
} from '../pilotingSkillRolls';
import { UNIT_QUIRK_IDS } from '../quirkModifiers';

const DEFAULT_COMP_DAMAGE: IComponentDamageState = {
  engineHits: 0,
  gyroHits: 0,
  sensorHits: 0,
  lifeSupport: 0,
  cockpitHit: false,
  actuators: {},
  weaponsDestroyed: [],
  heatSinksDestroyed: 0,
  jumpJetsDestroyed: 0,
};

function makeDiceSequence(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

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

    it('should apply Maneuvering Ace to skidding PSRs only', () => {
      const skidMods = calculatePSRModifiers(
        createSkiddingPSR('unit-1'),
        DEFAULT_COMP_DAMAGE,
        0,
        [],
        ['maneuvering-ace'],
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

    it('should have exactly 29 trigger types (28 catalog entries + standing up)', () => {
      expect(triggerTests).toHaveLength(29);
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
