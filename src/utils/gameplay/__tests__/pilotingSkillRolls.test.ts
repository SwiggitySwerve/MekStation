import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { IComponentDamageState, IPendingPSR, IUnitGameState, GameSide, LockState, MovementType, Facing } from '@/types/gameplay';

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
  createUpperLegActuatorPSR,
  createLowerLegActuatorPSR,
  createFootActuatorPSR,
  createKickedPSR,
  createChargedPSR,
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
  createMASCFailurePSR,
  createSuperchargerFailurePSR,
  PSRTrigger,
  IPSRResult,
} from '../pilotingSkillRolls';

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
      const compDamage: IComponentDamageState = { ...DEFAULT_COMP_DAMAGE, gyroHits: 1 };
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
      const compDamage: IComponentDamageState = { ...DEFAULT_COMP_DAMAGE, gyroHits: 1 };
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

    it('should apply DFA miss +4 modifier', () => {
      const psr: IPendingPSR = createDFAMissPSR('unit-1');
      const roller = makeDiceSequence([5, 4]); // total = 9
      const result = resolvePSR(5, psr, DEFAULT_COMP_DAMAGE, 0, roller);

      expect(result.targetNumber).toBe(9); // 5 + 4
      expect(result.passed).toBe(true); // 9 >= 9
    });

    it('should return modifier breakdown', () => {
      const psr: IPendingPSR = createDFAMissPSR('unit-1');
      const compDamage: IComponentDamageState = { ...DEFAULT_COMP_DAMAGE, gyroHits: 1 };
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
      const compDamage: IComponentDamageState = { ...DEFAULT_COMP_DAMAGE, gyroHits: 2 };
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

    it('should not include zero additional modifier', () => {
      const psr: IPendingPSR = createDamagePSR('unit-1');
      const mods = calculatePSRModifiers(psr, DEFAULT_COMP_DAMAGE, 0);
      expect(mods).toHaveLength(0);
    });
  });

  describe('PSR Trigger Generators — all 26 triggers', () => {
    const triggerTests: Array<{
      fn: (id: string) => IPendingPSR;
      expectedSource: PSRTrigger;
      expectedMod: number;
    }> = [
      { fn: createDamagePSR, expectedSource: PSRTrigger.PhaseDamage20Plus, expectedMod: 0 },
      { fn: createLegDamagePSR, expectedSource: PSRTrigger.LegDamage, expectedMod: 0 },
      { fn: createHipActuatorPSR, expectedSource: PSRTrigger.HipActuatorDestroyed, expectedMod: 0 },
      { fn: createGyroPSR, expectedSource: PSRTrigger.GyroHit, expectedMod: 0 },
      { fn: createUpperLegActuatorPSR, expectedSource: PSRTrigger.UpperLegActuatorHit, expectedMod: 0 },
      { fn: createLowerLegActuatorPSR, expectedSource: PSRTrigger.LowerLegActuatorHit, expectedMod: 0 },
      { fn: createFootActuatorPSR, expectedSource: PSRTrigger.FootActuatorHit, expectedMod: 0 },
      { fn: createKickedPSR, expectedSource: PSRTrigger.Kicked, expectedMod: 0 },
      { fn: createChargedPSR, expectedSource: PSRTrigger.Charged, expectedMod: 0 },
      { fn: createDFATargetPSR, expectedSource: PSRTrigger.DFATarget, expectedMod: 0 },
      { fn: createPushedPSR, expectedSource: PSRTrigger.Pushed, expectedMod: 0 },
      { fn: createKickMissPSR, expectedSource: PSRTrigger.KickMiss, expectedMod: 0 },
      { fn: createChargeMissPSR, expectedSource: PSRTrigger.ChargeMiss, expectedMod: 0 },
      { fn: createDFAMissPSR, expectedSource: PSRTrigger.DFAMiss, expectedMod: 4 },
      { fn: createShutdownPSR, expectedSource: PSRTrigger.Shutdown, expectedMod: 0 },
      { fn: createStandingUpPSR, expectedSource: PSRTrigger.StandingUp, expectedMod: 0 },
      { fn: createRubblePSR, expectedSource: PSRTrigger.EnteringRubble, expectedMod: 0 },
      { fn: createRunningRoughTerrainPSR, expectedSource: PSRTrigger.RunningRoughTerrain, expectedMod: 0 },
      { fn: createIcePSR, expectedSource: PSRTrigger.MovingOnIce, expectedMod: 0 },
      { fn: createEnteringWaterPSR, expectedSource: PSRTrigger.EnteringWater, expectedMod: 0 },
      { fn: createExitingWaterPSR, expectedSource: PSRTrigger.ExitingWater, expectedMod: 0 },
      { fn: createSkiddingPSR, expectedSource: PSRTrigger.Skidding, expectedMod: 0 },
      { fn: createRunningDamagedHipPSR, expectedSource: PSRTrigger.RunningDamagedHip, expectedMod: 0 },
      { fn: createRunningDamagedGyroPSR, expectedSource: PSRTrigger.RunningDamagedGyro, expectedMod: 0 },
      { fn: createBuildingCollapsePSR, expectedSource: PSRTrigger.BuildingCollapse, expectedMod: 0 },
      { fn: createMASCFailurePSR, expectedSource: PSRTrigger.MASCFailure, expectedMod: 0 },
      { fn: createSuperchargerFailurePSR, expectedSource: PSRTrigger.SuperchargerFailure, expectedMod: 0 },
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

    it('should have exactly 27 trigger types (26 + standing up)', () => {
      expect(triggerTests).toHaveLength(27);
    });
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
      expect(isGyroDestroyed({ ...DEFAULT_COMP_DAMAGE, gyroHits: 1 })).toBe(false);
    });
    it('should return true for 2 gyro hits', () => {
      expect(isGyroDestroyed({ ...DEFAULT_COMP_DAMAGE, gyroHits: 2 })).toBe(true);
    });
    it('should return true for 3+ gyro hits', () => {
      expect(isGyroDestroyed({ ...DEFAULT_COMP_DAMAGE, gyroHits: 3 })).toBe(true);
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
