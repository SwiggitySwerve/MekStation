import type {
  IComponentDamageState,
  IHex,
  IHexGrid,
  IUnitGameState,
} from '@/types/gameplay';

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { Facing, TerrainType } from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

import {
  calculatePunchDamage,
  calculateKickDamage,
  calculateChargeDamageToTarget,
  calculateChargeDamageToAttacker,
  calculateDFADamageToTarget,
  calculateDFADamageToAttacker,
  calculateHatchetDamage,
  calculateSwordDamage,
  calculateMaceDamage,
  calculatePunchToHit,
  calculateKickToHit,
  calculateChargeToHit,
  calculateDFAToHit,
  calculatePushToHit,
  calculateMeleeWeaponToHit,
  calculatePhysicalToHit,
  calculatePhysicalDamage,
  getPhysicalMissConsequences,
  canPunch,
  canKick,
  canCharge,
  canPush,
  canDFA,
  canMeleeWeapon,
  getEligiblePhysicalAttacks,
  buildPhysicalTerrainContext,
  getEffectiveWeight,
  applyUnderwaterModifier,
  determinePhysicalHitLocation,
  resolvePhysicalAttack,
  chooseBestPhysicalAttack,
  PUNCH_HIT_TABLE,
  KICK_HIT_TABLE,
  TSM_ACTIVATION_HEAT,
  IPhysicalAttackInput,
} from '../physicalAttacks';

const DEFAULT_COMPONENT_DAMAGE: IComponentDamageState = {
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

function makeInput(
  overrides: Partial<IPhysicalAttackInput> = {},
): IPhysicalAttackInput {
  return {
    attackerTonnage: 80,
    pilotingSkill: 5,
    componentDamage: DEFAULT_COMPONENT_DAMAGE,
    attackType: 'punch',
    ...overrides,
  };
}

function makeDiceSequence(values: number[]) {
  let i = 0;
  return () => {
    if (i >= values.length) return values[values.length - 1];
    return values[i++];
  };
}

function makeTerrainGrid(terrainByKey: Record<string, string>): IHexGrid {
  const hexes = new Map<string, IHex>();
  Object.entries(terrainByKey).forEach(([key, terrain]) => {
    const [q, r] = key.split(',').map(Number);
    hexes.set(key, {
      coord: { q, r },
      occupantId: null,
      terrain,
      elevation: 0,
    });
  });
  return { config: { radius: 2 }, hexes };
}

function unitAt(id: string, q: number, r: number): IUnitGameState {
  return { id, position: { q, r } } as IUnitGameState;
}

// =============================================================================
// Punch Damage Tests
// =============================================================================

describe('physicalAttacks', () => {
  describe('calculatePunchDamage', () => {
    it('should compute ceil(weight/10) for 80-ton mech', () => {
      expect(calculatePunchDamage(makeInput({ attackerTonnage: 80 }))).toBe(8);
    });

    it('should compute ceil(weight/10) for 50-ton mech', () => {
      expect(calculatePunchDamage(makeInput({ attackerTonnage: 50 }))).toBe(5);
    });

    it('should compute ceil(weight/10) for 75-ton mech', () => {
      expect(calculatePunchDamage(makeInput({ attackerTonnage: 75 }))).toBe(8);
    });

    it('should compute ceil(weight/10) for 20-ton mech', () => {
      expect(calculatePunchDamage(makeInput({ attackerTonnage: 20 }))).toBe(2);
    });

    it('should halve damage with upper arm actuator destroyed', () => {
      const damage = calculatePunchDamage(
        makeInput({
          attackerTonnage: 80,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.UPPER_ARM]: true },
          },
        }),
      );
      expect(damage).toBe(4); // floor(8/2)
    });

    it('should halve damage with lower arm actuator destroyed', () => {
      const damage = calculatePunchDamage(
        makeInput({
          attackerTonnage: 80,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.LOWER_ARM]: true },
          },
        }),
      );
      expect(damage).toBe(4);
    });

    it('should quarter damage with both upper and lower arm destroyed', () => {
      const damage = calculatePunchDamage(
        makeInput({
          attackerTonnage: 80,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: {
              [ActuatorType.UPPER_ARM]: true,
              [ActuatorType.LOWER_ARM]: true,
            },
          },
        }),
      );
      // 8 -> floor(8/2)=4 -> floor(4/2)=2
      expect(damage).toBe(2);
    });
  });

  // =============================================================================
  // Kick Damage Tests
  // =============================================================================

  describe('calculateKickDamage', () => {
    it('should compute floor(weight/5) for 80-ton mech', () => {
      expect(calculateKickDamage(makeInput({ attackerTonnage: 80 }))).toBe(16);
    });

    it('should compute floor(weight/5) for 50-ton mech', () => {
      expect(calculateKickDamage(makeInput({ attackerTonnage: 50 }))).toBe(10);
    });

    it('should compute floor(weight/5) for 73-ton mech', () => {
      // floor(73/5) = 14
      expect(calculateKickDamage(makeInput({ attackerTonnage: 73 }))).toBe(14);
    });
  });

  // =============================================================================
  // Charge Damage Tests
  // =============================================================================

  describe('calculateChargeDamageToTarget', () => {
    it('should compute ceil(weight/10) × (hexesMoved - 1) for 60t, 5 hexes', () => {
      // ceil(60/10) × (5-1) = 6 × 4 = 24
      const damage = calculateChargeDamageToTarget(
        makeInput({ attackerTonnage: 60, attackType: 'charge', hexesMoved: 5 }),
      );
      expect(damage).toBe(24);
    });

    it('should return 0 for 0 hexes moved', () => {
      const damage = calculateChargeDamageToTarget(
        makeInput({ attackerTonnage: 60, attackType: 'charge', hexesMoved: 0 }),
      );
      expect(damage).toBe(0);
    });

    it('should return 0 for 1 hex moved', () => {
      const damage = calculateChargeDamageToTarget(
        makeInput({ attackerTonnage: 60, attackType: 'charge', hexesMoved: 1 }),
      );
      expect(damage).toBe(0);
    });
  });

  describe('calculateChargeDamageToAttacker', () => {
    it('should compute ceil(targetTonnage/10) for 75-ton target', () => {
      // ceil(75/10) = 8
      const damage = calculateChargeDamageToAttacker(
        makeInput({ attackType: 'charge', targetTonnage: 75 }),
      );
      expect(damage).toBe(8);
    });
  });

  // =============================================================================
  // DFA Damage Tests
  // =============================================================================

  describe('calculateDFADamageToTarget', () => {
    it('should compute ceil(weight/10) × 3 for 70-ton mech', () => {
      // ceil(70/10) × 3 = 7 × 3 = 21
      const damage = calculateDFADamageToTarget(
        makeInput({ attackerTonnage: 70, attackType: 'dfa' }),
      );
      expect(damage).toBe(21);
    });

    it('should compute ceil(weight/10) × 3 for 80-ton mech', () => {
      // ceil(80/10) × 3 = 8 × 3 = 24
      expect(
        calculateDFADamageToTarget(
          makeInput({ attackerTonnage: 80, attackType: 'dfa' }),
        ),
      ).toBe(24);
    });
  });

  describe('calculateDFADamageToAttacker', () => {
    it('should compute ceil(weight/5) per leg (split) for 70-ton mech', () => {
      // Total = ceil(70/5) = 14, per leg = ceil(14/2) = 7
      const perLeg = calculateDFADamageToAttacker(
        makeInput({ attackerTonnage: 70, attackType: 'dfa' }),
      );
      expect(perLeg).toBe(7);
    });

    it('should round up for odd total', () => {
      // 50t: ceil(50/5)=10, per leg = 5
      expect(
        calculateDFADamageToAttacker(
          makeInput({ attackerTonnage: 50, attackType: 'dfa' }),
        ),
      ).toBe(5);
    });
  });

  // =============================================================================
  // Melee Weapon Damage Tests
  // =============================================================================

  describe('calculateHatchetDamage', () => {
    it('should compute floor(weight/5) for 70-ton mech', () => {
      // floor(70/5) = 14
      expect(
        calculateHatchetDamage(
          makeInput({ attackerTonnage: 70, attackType: 'hatchet' }),
        ),
      ).toBe(14);
    });
  });

  describe('calculateSwordDamage', () => {
    it('should compute floor(weight/10) + 1 for 70-ton mech', () => {
      // floor(70/10) + 1 = 7 + 1 = 8
      expect(
        calculateSwordDamage(
          makeInput({ attackerTonnage: 70, attackType: 'sword' }),
        ),
      ).toBe(8);
    });
  });

  describe('calculateMaceDamage', () => {
    it('should compute floor(weight×2/5) for 70-ton mech', () => {
      // floor(70 × 2 / 5) = floor(140/5) = 28
      expect(
        calculateMaceDamage(
          makeInput({ attackerTonnage: 70, attackType: 'mace' }),
        ),
      ).toBe(28);
    });
  });

  // =============================================================================
  // TSM Tests
  // =============================================================================

  describe('TSM double damage', () => {
    it('should double punch damage with TSM at heat 9+', () => {
      const input = makeInput({
        attackerTonnage: 50,
        hasTSM: true,
        heat: 9,
      });
      // Effective weight = 100, ceil(100/10) = 10
      expect(calculatePunchDamage(input)).toBe(10);
    });

    it('should double kick damage with TSM at heat 9+', () => {
      const input = makeInput({
        attackerTonnage: 50,
        hasTSM: true,
        heat: 9,
      });
      // Effective weight = 100, floor(100/5) = 20
      expect(calculateKickDamage(input)).toBe(20);
    });

    it('should NOT double damage below heat 9', () => {
      const input = makeInput({
        attackerTonnage: 50,
        hasTSM: true,
        heat: 8,
      });
      expect(calculatePunchDamage(input)).toBe(5); // ceil(50/10) = 5
    });

    it('should NOT double damage without TSM even at heat 9+', () => {
      const input = makeInput({
        attackerTonnage: 50,
        hasTSM: false,
        heat: 12,
      });
      expect(calculatePunchDamage(input)).toBe(5);
    });

    it('should double hatchet damage with TSM at heat 9+', () => {
      // 70t with TSM at heat 9: effective 140, floor(140/5) = 28
      expect(
        calculateHatchetDamage(
          makeInput({
            attackerTonnage: 70,
            attackType: 'hatchet',
            hasTSM: true,
            heat: 10,
          }),
        ),
      ).toBe(28);
    });

    it('should double sword damage with TSM at heat 9+', () => {
      // 70t TSM: effective 140, floor(140/10) + 1 = 14 + 1 = 15
      expect(
        calculateSwordDamage(
          makeInput({
            attackerTonnage: 70,
            attackType: 'sword',
            hasTSM: true,
            heat: 9,
          }),
        ),
      ).toBe(15);
    });

    it('should double mace damage with TSM at heat 9+', () => {
      // 70t TSM: effective 140, floor(140 × 2 / 5) = floor(280/5) = 56
      expect(
        calculateMaceDamage(
          makeInput({
            attackerTonnage: 70,
            attackType: 'mace',
            hasTSM: true,
            heat: 9,
          }),
        ),
      ).toBe(56);
    });
  });

  describe('getEffectiveWeight', () => {
    it('should return normal weight without TSM', () => {
      expect(getEffectiveWeight(50, 15, false)).toBe(50);
    });

    it('should double weight with TSM at 9+', () => {
      expect(getEffectiveWeight(50, 9, true)).toBe(100);
    });

    it('should return normal weight with TSM below 9', () => {
      expect(getEffectiveWeight(50, 8, true)).toBe(50);
    });
  });

  // =============================================================================
  // Underwater Halving Tests
  // =============================================================================

  describe('underwater halving', () => {
    it('should halve punch damage underwater', () => {
      const damage = calculatePunchDamage(
        makeInput({ attackerTonnage: 80, isUnderwater: true }),
      );
      expect(damage).toBe(4); // floor(8/2)
    });

    it('should halve kick damage underwater', () => {
      const damage = calculateKickDamage(
        makeInput({ attackerTonnage: 80, isUnderwater: true }),
      );
      expect(damage).toBe(8); // floor(16/2)
    });

    it('should round down odd values', () => {
      const damage = calculatePunchDamage(
        makeInput({ attackerTonnage: 75, isUnderwater: true }),
      );
      // ceil(75/10) = 8, floor(8/2) = 4
      expect(damage).toBe(4);
    });
  });

  describe('applyUnderwaterModifier', () => {
    it('should halve damage when underwater', () => {
      expect(applyUnderwaterModifier(10, true)).toBe(5);
    });

    it('should not modify when not underwater', () => {
      expect(applyUnderwaterModifier(10, false)).toBe(10);
    });

    it('should floor odd halved values', () => {
      expect(applyUnderwaterModifier(7, true)).toBe(3);
    });
  });

  // =============================================================================
  // Restriction Tests
  // =============================================================================

  describe('canPunch', () => {
    it('should allow punch with intact arm', () => {
      expect(canPunch(makeInput()).allowed).toBe(true);
    });

    it('should disallow punch for battle armor attackers', () => {
      const result = canPunch(
        makeInput({ attackerUnitType: UnitType.BATTLE_ARMOR }),
      );

      expect(result).toEqual({
        allowed: false,
        reason: "Non-meks can't punch",
        reasonCode: 'AttackerNotMek',
      });
    });

    it('should disallow punch with shoulder destroyed', () => {
      const result = canPunch(
        makeInput({
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.SHOULDER]: true },
          },
        }),
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Shoulder');
    });

    it('should disallow punch if arm fired weapon', () => {
      const result = canPunch(makeInput({ weaponsFiredFromArm: ['ml-1'] }));
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('fired');
    });

    it('should disallow punch when target elevation is outside arm height', () => {
      const result = canPunch(
        makeInput({
          elevationContext: {
            attackerBaseElevation: 0,
            attackerArmElevation: 1,
            targetBaseElevation: 2,
            targetTopElevation: 3,
          },
        }),
      );

      expect(result).toEqual({
        allowed: false,
        reason: 'Target elevation not in range',
        reasonCode: 'TargetElevationNotInRange',
      });
    });
  });

  describe('canKick', () => {
    it('should allow kick when standing', () => {
      expect(canKick(makeInput({ attackType: 'kick' })).allowed).toBe(true);
    });

    it('should disallow kick for battle armor attackers', () => {
      const result = canKick(
        makeInput({
          attackType: 'kick',
          attackerUnitType: UnitType.BATTLE_ARMOR,
        }),
      );

      expect(result).toEqual({
        allowed: false,
        reason: "Non-meks can't kick",
        reasonCode: 'AttackerNotMek',
      });
    });

    it('should disallow kick when prone', () => {
      const result = canKick(
        makeInput({ attackType: 'kick', attackerProne: true }),
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('prone');
    });

    it('should disallow kick when attacker is hull-down', () => {
      const result = canKick(
        makeInput({ attackType: 'kick', attackerHullDown: true }),
      );

      expect(result).toEqual({
        allowed: false,
        reason: 'Attacker is hull down',
        reasonCode: 'AttackerHullDown',
      });
    });

    it('should disallow kick with hip destroyed', () => {
      const result = canKick(
        makeInput({
          attackType: 'kick',
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.HIP]: true },
          },
        }),
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Hip');
    });

    it('should disallow kick when attacker elevation is outside target height', () => {
      const result = canKick(
        makeInput({
          attackType: 'kick',
          elevationContext: {
            attackerBaseElevation: 0,
            attackerArmElevation: 1,
            targetBaseElevation: 1,
            targetTopElevation: 2,
          },
        }),
      );

      expect(result).toEqual({
        allowed: false,
        reason: 'Target elevation not in range',
        reasonCode: 'TargetElevationNotInRange',
      });
    });
  });

  describe('canPush', () => {
    it('should disallow airborne AirMek pushes', () => {
      const result = canPush(
        makeInput({
          attackType: 'push',
          attackerUnitType: UnitType.BATTLEMECH,
          attackerConversionMode: 'airmek',
          attackerIsAirborneVTOLOrWiGE: true,
          targetUnitType: UnitType.BATTLEMECH,
        }),
      );

      expect(result).toEqual({
        allowed: false,
        reason: 'Cannot push while airborne',
        reasonCode: 'AttackerAirborne',
      });
    });

    it('should disallow non-Mek push targets', () => {
      const result = canPush(
        makeInput({
          attackType: 'push',
          targetUnitType: UnitType.VEHICLE,
        }),
      );

      expect(result).toEqual({
        allowed: false,
        reason: 'Target is not a mek',
        reasonCode: 'TargetNotMek',
      });
    });

    it('should disallow push targets that are not directly ahead', () => {
      const result = canPush(
        makeInput({
          attackType: 'push',
          attackerPosition: { q: 0, r: 0 },
          targetPosition: { q: 0, r: 1 },
          attackerFacing: Facing.Southeast,
        }),
      );

      expect(result).toEqual({
        allowed: false,
        reason: 'Target not directly ahead of feet',
        reasonCode: 'TargetNotDirectlyAhead',
      });
    });

    it('should disallow push when either attacker arm is missing', () => {
      const result = canPush(
        makeInput({
          attackType: 'push',
          attackerDestroyedLocations: ['left_arm'],
        }),
      );

      expect(result).toEqual({
        allowed: false,
        reason: 'Arm missing',
        reasonCode: 'LimbMissing',
      });
    });

    it('should disallow outside pushes against targets in building hexes', () => {
      const result = canPush(
        makeInput({
          attackType: 'push',
          terrainContext: {
            attackerInBuilding: false,
            targetInBuilding: true,
          },
        }),
      );

      expect(result).toEqual({
        allowed: false,
        reason: 'Target is inside building',
        reasonCode: 'TargetInsideBuilding',
      });
    });

    it('should disallow pushes against a different known building', () => {
      const result = canPush(
        makeInput({
          attackType: 'push',
          terrainContext: {
            attackerInBuilding: true,
            targetInBuilding: true,
            attackerBuildingId: 'warehouse-a',
            targetBuildingId: 'warehouse-b',
          },
        }),
      );

      expect(result).toEqual({
        allowed: false,
        reason: 'Target is inside building',
        reasonCode: 'TargetInsideBuilding',
      });
    });

    it('should allow pushes inside the same known building', () => {
      const result = canPush(
        makeInput({
          attackType: 'push',
          terrainContext: {
            attackerInBuilding: true,
            targetInBuilding: true,
            attackerBuildingId: 'warehouse-a',
            targetBuildingId: 'warehouse-a',
          },
        }),
      );

      expect(result).toEqual({ allowed: true });
    });

    it('should derive known building ids from encoded terrain context', () => {
      const grid = makeTerrainGrid({
        '0,0': terrainStringFromFeatures([
          {
            type: TerrainType.Building,
            level: 1,
            buildingId: 'warehouse-a',
          },
        ]),
        '1,0': terrainStringFromFeatures([
          {
            type: TerrainType.Building,
            level: 2,
            buildingId: 'warehouse-b',
          },
        ]),
      });

      expect(
        buildPhysicalTerrainContext(
          unitAt('attacker', 0, 0),
          unitAt('target', 1, 0),
          grid,
        ),
      ).toEqual({
        attackerInBuilding: true,
        targetInBuilding: true,
        attackerBuildingId: 'warehouse-a',
        targetBuildingId: 'warehouse-b',
      });
    });

    it('should disallow push targets on a different base elevation', () => {
      const result = canPush(
        makeInput({
          attackType: 'push',
          elevationContext: {
            attackerBaseElevation: 0,
            attackerArmElevation: 1,
            targetBaseElevation: 1,
            targetTopElevation: 2,
          },
        }),
      );

      expect(result).toEqual({
        allowed: false,
        reason: 'Target elevation not in range',
        reasonCode: 'TargetElevationNotInRange',
      });
    });

    it('should allow a same-elevation Mek directly ahead', () => {
      const result = canPush(
        makeInput({
          attackType: 'push',
          attackerUnitType: UnitType.BATTLEMECH,
          targetUnitType: UnitType.OMNIMECH,
          attackerPosition: { q: 0, r: 0 },
          targetPosition: { q: 1, r: 0 },
          attackerFacing: Facing.Southeast,
          elevationContext: {
            attackerBaseElevation: 0,
            attackerArmElevation: 1,
            targetBaseElevation: 0,
            targetTopElevation: 1,
          },
        }),
      );

      expect(result).toEqual({ allowed: true });
    });
  });

  describe('canMeleeWeapon', () => {
    it('should allow melee with intact arm', () => {
      expect(canMeleeWeapon(makeInput({ attackType: 'hatchet' })).allowed).toBe(
        true,
      );
    });

    it('should disallow mech melee weapons for battle armor attackers', () => {
      const result = canMeleeWeapon(
        makeInput({
          attackType: 'hatchet',
          attackerUnitType: UnitType.BATTLE_ARMOR,
        }),
      );

      expect(result).toEqual({
        allowed: false,
        reason: "Non-meks can't use mech melee weapons",
        reasonCode: 'AttackerNotMek',
      });
    });

    it('should disallow if lower arm destroyed', () => {
      const result = canMeleeWeapon(
        makeInput({
          attackType: 'hatchet',
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.LOWER_ARM]: true },
          },
        }),
      );
      expect(result.allowed).toBe(false);
    });

    it('should disallow if hand destroyed', () => {
      const result = canMeleeWeapon(
        makeInput({
          attackType: 'sword',
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.HAND]: true },
          },
        }),
      );
      expect(result.allowed).toBe(false);
    });

    it('should disallow if arm fired weapon', () => {
      const result = canMeleeWeapon(
        makeInput({ attackType: 'hatchet', weaponsFiredFromArm: ['ppc-1'] }),
      );
      expect(result.allowed).toBe(false);
    });
  });

  describe('canDFA', () => {
    it('should disallow DFA for battle armor attackers', () => {
      const result = canDFA(
        makeInput({
          attackType: 'dfa',
          attackerUnitType: UnitType.BATTLE_ARMOR,
          attackerJumpedThisTurn: true,
        }),
      );

      expect(result).toEqual({
        allowed: false,
        reason: "Non-meks can't DFA",
        reasonCode: 'AttackerNotMek',
      });
    });
  });

  describe('canCharge', () => {
    it.each([
      UnitType.BATTLE_ARMOR,
      UnitType.INFANTRY,
      UnitType.PROTOMECH,
      UnitType.VTOL,
      UnitType.AEROSPACE,
    ])('should disallow charge for %s attackers', (attackerUnitType) => {
      const result = canCharge(
        makeInput({
          attackType: 'charge',
          attackerUnitType,
          attackerRanThisTurn: true,
        }),
      );

      expect(result).toEqual({
        allowed: false,
        reason: "This unit type can't charge",
        reasonCode: 'AttackerCannotCharge',
      });
    });

    it('should preserve represented vehicle charge eligibility when run-gated', () => {
      const result = canCharge(
        makeInput({
          attackType: 'charge',
          attackerUnitType: UnitType.VEHICLE,
          attackerRanThisTurn: true,
        }),
      );

      expect(result).toEqual({ allowed: true });
    });

    it('should disallow WiGE vehicle charge even after a run', () => {
      const result = canCharge(
        makeInput({
          attackType: 'charge',
          attackerUnitType: UnitType.VEHICLE,
          attackerMovementMode: 'wige',
          attackerRanThisTurn: true,
        }),
      );

      expect(result).toEqual({
        allowed: false,
        reason: "This movement mode can't charge",
        reasonCode: 'AttackerCannotCharge',
      });
    });

    it('should allow grounded AirMek charge while blocking fighter mode and airborne AirMek', () => {
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerUnitType: UnitType.BATTLEMECH,
            attackerMovementMode: 'wige',
            attackerConversionMode: 'airmek',
            attackerIsAirborneVTOLOrWiGE: false,
            attackerRanThisTurn: true,
          }),
        ),
      ).toEqual({ allowed: true });

      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerUnitType: UnitType.BATTLEMECH,
            attackerMovementMode: 'wige',
            attackerConversionMode: 'fighter',
            attackerRanThisTurn: true,
          }),
        ),
      ).toEqual({
        allowed: false,
        reason: "This movement mode can't charge",
        reasonCode: 'AttackerCannotCharge',
      });

      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerUnitType: UnitType.BATTLEMECH,
            attackerMovementMode: 'wige',
            attackerConversionMode: 'airmek',
            attackerIsAirborneVTOLOrWiGE: true,
            attackerRanThisTurn: true,
          }),
        ),
      ).toEqual({
        allowed: false,
        reason: "This movement mode can't charge",
        reasonCode: 'AttackerCannotCharge',
      });
    });

    it('should allow hover charge unless the optional no-hover-charge rule is enabled', () => {
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerUnitType: UnitType.VEHICLE,
            attackerMovementMode: 'hover',
            attackerRanThisTurn: true,
          }),
        ),
      ).toEqual({ allowed: true });

      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerUnitType: UnitType.VEHICLE,
            attackerMovementMode: 'hover',
            attackerRanThisTurn: true,
            optionalRules: ['no_hover_charge'],
          }),
        ),
      ).toEqual({
        allowed: false,
        reason: "This movement mode can't charge",
        reasonCode: 'AttackerCannotCharge',
      });
    });

    it('should disallow stunned vehicle charge even after a run', () => {
      const result = canCharge(
        makeInput({
          attackType: 'charge',
          attackerUnitType: UnitType.VEHICLE,
          attackerRanThisTurn: true,
          attackerVehicleCrewStunned: true,
        }),
      );

      expect(result).toEqual({
        allowed: false,
        reason: "Stunned vehicle crew can't charge",
        reasonCode: 'AttackerCannotCharge',
      });
    });
  });

  describe('LAM fighter physical eligibility', () => {
    it.each([
      ['punch', canPunch],
      ['kick', canKick],
      ['push', canPush],
      ['dfa', canDFA],
      ['hatchet', canMeleeWeapon],
    ] as const)('should block %s in fighter mode', (attackType, validator) => {
      const result = validator(
        makeInput({
          attackType,
          attackerUnitType: UnitType.BATTLEMECH,
          attackerConversionMode: 'fighter',
          attackerRanThisTurn: true,
          attackerJumpedThisTurn: true,
        }),
      );

      expect(result).toEqual({
        allowed: false,
        reason: "LAM fighter mode can't make physical attacks",
        reasonCode: 'AttackerCannotUsePhysical',
      });
    });
  });

  describe('getEligiblePhysicalAttacks', () => {
    it('blocks stunned vehicle charge rows from generic physical highlights', () => {
      const attacker = {
        ...unitAt('stunned-vehicle-1', 0, 0),
        combatState: {
          kind: 'vehicle',
          state: { motive: { crewStunnedPhases: 1 } },
        },
      } as IUnitGameState;
      const target = unitAt('mech-1', 1, 0);

      const options = getEligiblePhysicalAttacks(attacker, target, {
        attackerTonnage: 45,
        attackerPilotingSkill: 4,
        targetTonnage: 55,
        attackerUnitType: UnitType.VEHICLE,
        targetUnitType: UnitType.BATTLEMECH,
        attackerRanThisTurn: true,
      });

      const charge = options.find((option) => option.attackType === 'charge');
      expect(charge).toBeDefined();
      expect(charge!.toHit.allowed).toBe(false);
      expect(charge!.restrictionsFailed).toEqual(['AttackerCannotCharge']);
    });

    it('blocks WiGE vehicle charge rows from generic physical highlights', () => {
      const attacker = unitAt('wige-1', 0, 0);
      const target = unitAt('mech-1', 1, 0);

      const options = getEligiblePhysicalAttacks(attacker, target, {
        attackerTonnage: 45,
        attackerPilotingSkill: 4,
        targetTonnage: 55,
        attackerUnitType: UnitType.VEHICLE,
        attackerMovementMode: 'wige',
        targetUnitType: UnitType.BATTLEMECH,
        attackerRanThisTurn: true,
      });

      const charge = options.find((option) => option.attackType === 'charge');
      expect(charge).toBeDefined();
      expect(charge!.toHit.allowed).toBe(false);
      expect(charge!.restrictionsFailed).toEqual(['AttackerCannotCharge']);
    });

    it('derives represented LAM AirMek charge eligibility from runtime conversion state', () => {
      const attacker = {
        ...unitAt('airmek-1', 0, 0),
        conversionMode: 'airmek',
      } as IUnitGameState;
      const target = unitAt('mech-1', 1, 0);

      const options = getEligiblePhysicalAttacks(attacker, target, {
        attackerTonnage: 45,
        attackerPilotingSkill: 4,
        targetTonnage: 55,
        attackerUnitType: UnitType.BATTLEMECH,
        attackerMovementMode: 'wige',
        targetUnitType: UnitType.BATTLEMECH,
        attackerRanThisTurn: true,
      });

      const charge = options.find((option) => option.attackType === 'charge');
      expect(charge).toBeDefined();
      expect(charge!.toHit.allowed).toBe(true);
      expect(charge!.restrictionsFailed).toEqual([]);
    });

    it('blocks represented airborne AirMek charge rows from runtime state', () => {
      const attacker = {
        ...unitAt('airborne-airmek-1', 0, 0),
        conversionMode: 'airmek',
        combatState: {
          kind: 'aero',
          state: { altitude: 1 },
        },
      } as IUnitGameState;
      const target = unitAt('mech-1', 1, 0);

      const options = getEligiblePhysicalAttacks(attacker, target, {
        attackerTonnage: 45,
        attackerPilotingSkill: 4,
        targetTonnage: 55,
        attackerUnitType: UnitType.BATTLEMECH,
        attackerMovementMode: 'wige',
        targetUnitType: UnitType.BATTLEMECH,
        attackerRanThisTurn: true,
      });

      const charge = options.find((option) => option.attackType === 'charge');
      expect(charge).toBeDefined();
      expect(charge!.toHit.allowed).toBe(false);
      expect(charge!.restrictionsFailed).toEqual(['AttackerCannotCharge']);
    });

    it('blocks represented airborne AirMek push rows from runtime state', () => {
      const attacker = {
        ...unitAt('airborne-airmek-1', 0, 0),
        conversionMode: 'airmek',
        combatState: {
          kind: 'aero',
          state: { altitude: 1 },
        },
      } as IUnitGameState;
      const target = unitAt('mech-1', 1, 0);

      const options = getEligiblePhysicalAttacks(attacker, target, {
        attackerTonnage: 45,
        attackerPilotingSkill: 4,
        targetTonnage: 55,
        attackerUnitType: UnitType.BATTLEMECH,
        attackerMovementMode: 'wige',
        targetUnitType: UnitType.BATTLEMECH,
        attackerRanThisTurn: true,
      });

      const push = options.find((option) => option.attackType === 'push');
      expect(push).toBeDefined();
      expect(push!.toHit.allowed).toBe(false);
      expect(push!.restrictionsFailed).toEqual(['AttackerAirborne']);
    });

    it('blocks represented LAM fighter physical rows from runtime state', () => {
      const attacker = {
        ...unitAt('fighter-lam-1', 0, 0),
        conversionMode: 'fighter',
      } as IUnitGameState;
      const target = unitAt('mech-1', 1, 0);

      const options = getEligiblePhysicalAttacks(attacker, target, {
        attackerTonnage: 45,
        attackerPilotingSkill: 4,
        targetTonnage: 55,
        attackerUnitType: UnitType.BATTLEMECH,
        attackerMovementMode: 'wheeled',
        targetUnitType: UnitType.BATTLEMECH,
        attackerRanThisTurn: true,
        attackerJumpedThisTurn: true,
      });

      expect(options).not.toHaveLength(0);
      expect(options.every((option) => option.toHit.allowed === false)).toBe(
        true,
      );
      expect(
        options
          .filter((option) => option.attackType !== 'charge')
          .every((option) =>
            option.restrictionsFailed.includes('AttackerCannotUsePhysical'),
          ),
      ).toBe(true);
    });

    it('blocks kick rows when the runtime attacker is hull-down', () => {
      const attacker = {
        ...unitAt('hull-down-mek-1', 0, 0),
        hullDown: true,
      } as IUnitGameState;
      const target = unitAt('mech-1', 1, 0);

      const options = getEligiblePhysicalAttacks(attacker, target, {
        attackerTonnage: 55,
        attackerPilotingSkill: 4,
        targetTonnage: 55,
        attackerUnitType: UnitType.BATTLEMECH,
        targetUnitType: UnitType.BATTLEMECH,
        attackerRanThisTurn: true,
        attackerJumpedThisTurn: true,
      });

      const kicks = options.filter((option) => option.attackType === 'kick');
      expect(kicks).toHaveLength(2);
      expect(kicks.every((option) => option.toHit.allowed === false)).toBe(
        true,
      );
      expect(kicks.map((option) => option.restrictionsFailed)).toEqual([
        ['AttackerHullDown'],
        ['AttackerHullDown'],
      ]);
    });

    it('projects MegaMek hull-down punch and club hit tables from elevation context', () => {
      const attacker = {
        ...unitAt('hull-down-mek-1', 0, 0),
        hullDown: true,
      } as IUnitGameState;
      const target = unitAt('mech-1', 1, 0);

      const options = getEligiblePhysicalAttacks(attacker, target, {
        attackerTonnage: 55,
        attackerPilotingSkill: 4,
        targetTonnage: 55,
        attackerUnitType: UnitType.BATTLEMECH,
        targetUnitType: UnitType.BATTLEMECH,
        meleeWeaponsEquipped: ['hatchet'],
        elevationContext: {
          attackerBaseElevation: 0,
          attackerArmElevation: 1,
          targetBaseElevation: 1,
          targetTopElevation: 2,
        },
      });

      const punch = options.find(
        (option) => option.attackType === 'punch' && option.limb === 'rightArm',
      );
      const hatchet = options.find((option) => option.attackType === 'hatchet');

      expect(punch).toBeDefined();
      expect(punch!.toHit.allowed).toBe(true);
      expect(punch!.damage.hitTable).toBe('kick');
      expect(hatchet).toBeDefined();
      expect(hatchet!.toHit.allowed).toBe(true);
      expect(hatchet!.damage.hitTable).toBe('kick');
    });

    it('keeps battle armor from producing generic physical target highlights', () => {
      const attacker = unitAt('ba-1', 0, 0);
      const target = unitAt('mech-1', 1, 0);

      const options = getEligiblePhysicalAttacks(attacker, target, {
        attackerTonnage: 1,
        attackerPilotingSkill: 4,
        targetTonnage: 55,
        attackerUnitType: UnitType.BATTLE_ARMOR,
        targetUnitType: UnitType.BATTLEMECH,
        attackerRanThisTurn: true,
        attackerJumpedThisTurn: true,
      });

      expect(
        options.filter(
          (option) =>
            option.toHit.allowed && option.restrictionsFailed.length === 0,
        ),
      ).toHaveLength(0);
      expect(options.map((option) => option.attackType)).toEqual(
        expect.arrayContaining(['punch', 'kick', 'charge', 'dfa']),
      );
      expect(
        options
          .filter((option) =>
            ['punch', 'kick', 'charge', 'dfa'].includes(option.attackType),
          )
          .flatMap((option) => option.restrictionsFailed),
      ).toEqual(
        expect.arrayContaining([
          'AttackerNotMek',
          'AttackerNotMek',
          'AttackerNotMek',
          'AttackerCannotCharge',
        ]),
      );
    });
  });

  // =============================================================================
  // To-Hit Calculation Tests
  // =============================================================================

  describe('calculatePunchToHit', () => {
    it('should use piloting skill as base', () => {
      const result = calculatePunchToHit(makeInput({ pilotingSkill: 5 }));
      expect(result.baseToHit).toBe(5);
      expect(result.finalToHit).toBe(5);
      expect(result.allowed).toBe(true);
    });

    it('should add +2 for upper arm destroyed', () => {
      const result = calculatePunchToHit(
        makeInput({
          pilotingSkill: 5,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.UPPER_ARM]: true },
          },
        }),
      );
      expect(result.finalToHit).toBe(7);
    });

    it('should add +2 for lower arm destroyed', () => {
      const result = calculatePunchToHit(
        makeInput({
          pilotingSkill: 5,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.LOWER_ARM]: true },
          },
        }),
      );
      expect(result.finalToHit).toBe(7);
    });

    it('should add +1 for hand destroyed', () => {
      const result = calculatePunchToHit(
        makeInput({
          pilotingSkill: 5,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.HAND]: true },
          },
        }),
      );
      expect(result.finalToHit).toBe(6);
    });

    it('should stack multiple actuator mods', () => {
      const result = calculatePunchToHit(
        makeInput({
          pilotingSkill: 5,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: {
              [ActuatorType.UPPER_ARM]: true,
              [ActuatorType.LOWER_ARM]: true,
              [ActuatorType.HAND]: true,
            },
          },
        }),
      );
      expect(result.finalToHit).toBe(10); // 5 + 2 + 2 + 1
    });

    it('should return not-allowed when shoulder destroyed', () => {
      const result = calculatePunchToHit(
        makeInput({
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.SHOULDER]: true },
          },
        }),
      );
      expect(result.allowed).toBe(false);
      expect(result.finalToHit).toBe(Infinity);
    });
  });

  describe('calculateKickToHit', () => {
    it('should use piloting - 2 as base', () => {
      const result = calculateKickToHit(
        makeInput({ pilotingSkill: 5, attackType: 'kick' }),
      );
      expect(result.baseToHit).toBe(3);
      expect(result.finalToHit).toBe(3);
    });

    it('should add leg actuator modifiers', () => {
      const result = calculateKickToHit(
        makeInput({
          pilotingSkill: 5,
          attackType: 'kick',
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.UPPER_LEG]: true },
          },
        }),
      );
      expect(result.finalToHit).toBe(5); // 3 + 2
    });

    it('should not allow when hip destroyed', () => {
      const result = calculateKickToHit(
        makeInput({
          attackType: 'kick',
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.HIP]: true },
          },
        }),
      );
      expect(result.allowed).toBe(false);
    });
  });

  describe('calculateChargeToHit', () => {
    it('should use piloting skill as base', () => {
      const result = calculateChargeToHit(
        makeInput({ pilotingSkill: 5, attackType: 'charge' }),
      );
      expect(result.baseToHit).toBe(5);
      expect(result.allowed).toBe(true);
    });

    it('should reject Battle Armor charge to-hit even after a run', () => {
      const result = calculateChargeToHit(
        makeInput({
          pilotingSkill: 5,
          attackType: 'charge',
          attackerUnitType: UnitType.BATTLE_ARMOR,
          attackerRanThisTurn: true,
        }),
      );

      expect(result.allowed).toBe(false);
      expect(result.restrictionReasonCode).toBe('AttackerCannotCharge');
    });
  });

  describe('calculateDFAToHit', () => {
    it('should use piloting skill as base', () => {
      const result = calculateDFAToHit(
        makeInput({ pilotingSkill: 4, attackType: 'dfa' }),
      );
      expect(result.baseToHit).toBe(4);
      expect(result.allowed).toBe(true);
    });
  });

  describe('calculatePushToHit', () => {
    it('should use piloting - 1 as base', () => {
      const result = calculatePushToHit(
        makeInput({ pilotingSkill: 5, attackType: 'push' }),
      );
      expect(result.baseToHit).toBe(4);
      expect(result.finalToHit).toBe(4);
    });
  });

  describe('calculateMeleeWeaponToHit', () => {
    it('should apply -1 for hatchet', () => {
      const result = calculateMeleeWeaponToHit(
        makeInput({ pilotingSkill: 5, attackType: 'hatchet' }),
      );
      expect(result.finalToHit).toBe(4);
    });

    it('should apply -2 for sword', () => {
      const result = calculateMeleeWeaponToHit(
        makeInput({ pilotingSkill: 5, attackType: 'sword' }),
      );
      expect(result.finalToHit).toBe(3);
    });

    it('should apply +1 for mace', () => {
      const result = calculateMeleeWeaponToHit(
        makeInput({ pilotingSkill: 5, attackType: 'mace' }),
      );
      expect(result.finalToHit).toBe(6);
    });

    it('should not allow if lower arm destroyed', () => {
      const result = calculateMeleeWeaponToHit(
        makeInput({
          attackType: 'hatchet',
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.LOWER_ARM]: true },
          },
        }),
      );
      expect(result.allowed).toBe(false);
    });
  });

  describe('calculatePhysicalToHit (dispatch)', () => {
    it('should dispatch punch', () => {
      const result = calculatePhysicalToHit(
        makeInput({ attackType: 'punch', pilotingSkill: 5 }),
      );
      expect(result.baseToHit).toBe(5);
    });

    it('should dispatch kick', () => {
      const result = calculatePhysicalToHit(
        makeInput({ attackType: 'kick', pilotingSkill: 5 }),
      );
      expect(result.baseToHit).toBe(3);
    });

    it('should dispatch push', () => {
      const result = calculatePhysicalToHit(
        makeInput({ attackType: 'push', pilotingSkill: 5 }),
      );
      expect(result.baseToHit).toBe(4);
    });
  });

  // =============================================================================
  // Damage Result Tests
  // =============================================================================

  describe('calculatePhysicalDamage', () => {
    it('should return correct punch damage result', () => {
      const result = calculatePhysicalDamage(
        makeInput({ attackerTonnage: 80, attackType: 'punch' }),
      );
      expect(result.targetDamage).toBe(8);
      expect(result.attackerDamage).toBe(0);
      expect(result.targetPSR).toBe(false);
      expect(result.hitTable).toBe('punch');
    });

    it('uses the kick hit table for a hull-down punch at attacker arm level', () => {
      const result = calculatePhysicalDamage(
        makeInput({
          attackerTonnage: 80,
          attackType: 'punch',
          attackerHullDown: true,
          elevationContext: {
            attackerBaseElevation: 0,
            attackerArmElevation: 1,
            targetBaseElevation: 1,
            targetTopElevation: 2,
          },
        }),
      );

      expect(result.targetDamage).toBe(8);
      expect(result.hitTable).toBe('kick');
    });

    it('keeps the punch hit table for a hull-down punch from above the target base', () => {
      const result = calculatePhysicalDamage(
        makeInput({
          attackerTonnage: 80,
          attackType: 'punch',
          attackerHullDown: true,
          elevationContext: {
            attackerBaseElevation: 1,
            attackerArmElevation: 2,
            targetBaseElevation: 0,
            targetTopElevation: 1,
          },
        }),
      );

      expect(result.hitTable).toBe('punch');
    });

    it('should return correct kick damage result with PSR', () => {
      const result = calculatePhysicalDamage(
        makeInput({ attackerTonnage: 80, attackType: 'kick' }),
      );
      expect(result.targetDamage).toBe(16);
      expect(result.targetPSR).toBe(true);
      expect(result.hitTable).toBe('kick');
    });

    it('should return charge damage to both units', () => {
      const result = calculatePhysicalDamage(
        makeInput({
          attackerTonnage: 60,
          attackType: 'charge',
          hexesMoved: 5,
          targetTonnage: 75,
        }),
      );
      expect(result.targetDamage).toBe(24);
      expect(result.attackerDamage).toBe(8); // ceil(75/10)
      expect(result.targetPSR).toBe(true);
      expect(result.attackerPSR).toBe(true);
    });

    it('should return DFA damage with leg damage', () => {
      const result = calculatePhysicalDamage(
        makeInput({ attackerTonnage: 70, attackType: 'dfa' }),
      );
      expect(result.targetDamage).toBe(21);
      expect(result.attackerLegDamagePerLeg).toBe(7);
      expect(result.targetPSR).toBe(true);
      expect(result.attackerPSR).toBe(true);
      expect(result.hitTable).toBe('punch');
    });

    it('should return 0 damage and displacement for push', () => {
      const result = calculatePhysicalDamage(makeInput({ attackType: 'push' }));
      expect(result.targetDamage).toBe(0);
      expect(result.targetPSR).toBe(true);
      expect(result.targetDisplaced).toBe(true);
    });

    it('should return melee weapon damage with punch table', () => {
      const result = calculatePhysicalDamage(
        makeInput({ attackerTonnage: 70, attackType: 'hatchet' }),
      );
      expect(result.targetDamage).toBe(14);
      expect(result.hitTable).toBe('punch');
    });

    it('uses the kick hit table for a hull-down club attack against a represented Mek', () => {
      const result = calculatePhysicalDamage(
        makeInput({
          attackerTonnage: 70,
          attackType: 'hatchet',
          attackerHullDown: true,
          targetUnitType: UnitType.BATTLEMECH,
        }),
      );

      expect(result.targetDamage).toBe(14);
      expect(result.hitTable).toBe('kick');
    });
  });

  // =============================================================================
  // Miss Consequences Tests
  // =============================================================================

  describe('getPhysicalMissConsequences', () => {
    it('kick miss triggers attacker PSR', () => {
      const result = getPhysicalMissConsequences('kick');
      expect(result.attackerPSR).toBe(true);
      expect(result.attackerPSRModifier).toBe(0);
    });

    it('DFA miss triggers attacker PSR +4', () => {
      const result = getPhysicalMissConsequences('dfa');
      expect(result.attackerPSR).toBe(true);
      expect(result.attackerPSRModifier).toBe(4);
    });

    it('punch miss has no consequence', () => {
      expect(getPhysicalMissConsequences('punch').attackerPSR).toBe(false);
    });

    it('push miss has no consequence', () => {
      expect(getPhysicalMissConsequences('push').attackerPSR).toBe(false);
    });

    it('charge miss has no consequence', () => {
      expect(getPhysicalMissConsequences('charge').attackerPSR).toBe(false);
    });
  });

  // =============================================================================
  // Hit Location Tables Tests
  // =============================================================================

  describe('hit location tables', () => {
    it('punch table maps 1-6 correctly', () => {
      expect(PUNCH_HIT_TABLE[1]).toBe('left_arm');
      expect(PUNCH_HIT_TABLE[2]).toBe('left_torso');
      expect(PUNCH_HIT_TABLE[3]).toBe('center_torso');
      expect(PUNCH_HIT_TABLE[4]).toBe('right_torso');
      expect(PUNCH_HIT_TABLE[5]).toBe('right_arm');
      expect(PUNCH_HIT_TABLE[6]).toBe('head');
    });

    it('kick table maps 1-3 to right leg, 4-6 to left leg', () => {
      expect(KICK_HIT_TABLE[1]).toBe('right_leg');
      expect(KICK_HIT_TABLE[2]).toBe('right_leg');
      expect(KICK_HIT_TABLE[3]).toBe('right_leg');
      expect(KICK_HIT_TABLE[4]).toBe('left_leg');
      expect(KICK_HIT_TABLE[5]).toBe('left_leg');
      expect(KICK_HIT_TABLE[6]).toBe('left_leg');
    });
  });

  describe('determinePhysicalHitLocation', () => {
    it('should use punch table for punch hit', () => {
      const roller = makeDiceSequence([3]); // CT
      expect(determinePhysicalHitLocation('punch', roller)).toBe(
        'center_torso',
      );
    });

    it('should use kick table for kick hit', () => {
      const roller = makeDiceSequence([1]); // right_leg
      expect(determinePhysicalHitLocation('kick', roller)).toBe('right_leg');
    });

    it('should clamp roll to 1-6', () => {
      const roller = makeDiceSequence([0]); // should clamp to 1
      expect(determinePhysicalHitLocation('punch', roller)).toBe('left_arm');
    });
  });

  // =============================================================================
  // Full Resolution Tests
  // =============================================================================

  describe('resolvePhysicalAttack', () => {
    it('should resolve a hitting punch', () => {
      // dice: 4+3=7 (to-hit), 3 (location = CT)
      const roller = makeDiceSequence([4, 3, 3]);
      const result = resolvePhysicalAttack(
        makeInput({ pilotingSkill: 5 }),
        roller,
      );
      expect(result.hit).toBe(true);
      expect(result.roll).toBe(7);
      expect(result.targetDamage).toBe(8);
      expect(result.hitLocation).toBe('center_torso');
    });

    it('resolves a hull-down punch against a level arm-height target on the kick table', () => {
      // dice: 6+6=12 (to-hit), 4 (kick table location = left leg)
      const roller = makeDiceSequence([6, 6, 4]);
      const result = resolvePhysicalAttack(
        makeInput({
          attackerTonnage: 80,
          attackType: 'punch',
          pilotingSkill: 5,
          attackerHullDown: true,
          elevationContext: {
            attackerBaseElevation: 0,
            attackerArmElevation: 1,
            targetBaseElevation: 1,
            targetTopElevation: 2,
          },
        }),
        roller,
      );

      expect(result.hit).toBe(true);
      expect(result.hitTable).toBe('kick');
      expect(result.hitLocation).toBe('left_leg');
    });

    it('should resolve a missing punch', () => {
      // dice: 1+2=3 (to-hit, miss)
      const roller = makeDiceSequence([1, 2]);
      const result = resolvePhysicalAttack(
        makeInput({ pilotingSkill: 5 }),
        roller,
      );
      expect(result.hit).toBe(false);
      expect(result.targetDamage).toBe(0);
      expect(result.hitLocation).toBeUndefined();
      expect(result.attackerPSR).toBe(false);
    });

    it('should trigger attacker PSR on kick miss', () => {
      // dice: 1+1=2 (miss vs TN 3)
      const roller = makeDiceSequence([1, 1]);
      const result = resolvePhysicalAttack(
        makeInput({ attackType: 'kick', pilotingSkill: 5 }),
        roller,
      );
      expect(result.hit).toBe(false);
      expect(result.attackerPSR).toBe(true);
      expect(result.attackerPSRModifier).toBe(0);
    });

    it('should trigger attacker PSR +4 on DFA miss', () => {
      // dice: 1+1=2 (miss)
      const roller = makeDiceSequence([1, 1]);
      const result = resolvePhysicalAttack(
        makeInput({ attackType: 'dfa', pilotingSkill: 5 }),
        roller,
      );
      expect(result.hit).toBe(false);
      expect(result.attackerPSR).toBe(true);
      expect(result.attackerPSRModifier).toBe(4);
    });

    it('should not be allowed with shoulder destroyed', () => {
      const roller = makeDiceSequence([6, 6]);
      const result = resolvePhysicalAttack(
        makeInput({
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.SHOULDER]: true },
          },
        }),
        roller,
      );
      expect(result.hit).toBe(false);
      expect(result.toHitNumber).toBe(Infinity);
    });

    it('should resolve kick with target PSR on hit', () => {
      // dice: 6+6=12 (hit), 4 (location = left_leg)
      const roller = makeDiceSequence([6, 6, 4]);
      const result = resolvePhysicalAttack(
        makeInput({
          attackType: 'kick',
          attackerTonnage: 80,
          pilotingSkill: 5,
        }),
        roller,
      );
      expect(result.hit).toBe(true);
      expect(result.targetDamage).toBe(16);
      expect(result.targetPSR).toBe(true);
      expect(result.hitLocation).toBe('left_leg');
    });

    it('should resolve push with displacement and no damage', () => {
      // dice: 5+4=9 (hit vs TN 4)
      const roller = makeDiceSequence([5, 4]);
      const result = resolvePhysicalAttack(
        makeInput({ attackType: 'push', pilotingSkill: 5 }),
        roller,
      );
      expect(result.hit).toBe(true);
      expect(result.targetDamage).toBe(0);
      expect(result.targetDisplaced).toBe(true);
      expect(result.targetPSR).toBe(true);
    });

    it('should resolve charge with damage to both', () => {
      // dice: 4+4=8 (hit), 2 (location = LT)
      const roller = makeDiceSequence([4, 4, 2]);
      const result = resolvePhysicalAttack(
        makeInput({
          attackType: 'charge',
          attackerTonnage: 60,
          pilotingSkill: 5,
          hexesMoved: 5,
          targetTonnage: 75,
        }),
        roller,
      );
      expect(result.hit).toBe(true);
      expect(result.targetDamage).toBe(24);
      expect(result.attackerDamage).toBe(8);
      expect(result.targetPSR).toBe(true);
      expect(result.attackerPSR).toBe(true);
    });

    it('should resolve DFA with leg damage to attacker', () => {
      // dice: 5+5=10 (hit), 6 (location = head)
      const roller = makeDiceSequence([5, 5, 6]);
      const result = resolvePhysicalAttack(
        makeInput({
          attackType: 'dfa',
          attackerTonnage: 70,
          pilotingSkill: 5,
        }),
        roller,
      );
      expect(result.hit).toBe(true);
      expect(result.targetDamage).toBe(21);
      expect(result.attackerLegDamagePerLeg).toBe(7);
      expect(result.hitLocation).toBe('head');
    });
  });

  // =============================================================================
  // AI Decision Logic Tests
  // =============================================================================

  describe('chooseBestPhysicalAttack', () => {
    it('should prefer kick over punch (higher damage)', () => {
      const result = chooseBestPhysicalAttack(80, 5, DEFAULT_COMPONENT_DAMAGE);
      expect(result).toBe('kick'); // 16 vs 8
    });

    it('should return null if all attacks restricted', () => {
      const compDamage = {
        ...DEFAULT_COMPONENT_DAMAGE,
        actuators: {
          [ActuatorType.SHOULDER]: true,
          [ActuatorType.HIP]: true,
        },
      };
      const result = chooseBestPhysicalAttack(80, 5, compDamage, {
        attackerProne: true,
      });
      expect(result).toBeNull();
    });

    it('should prefer DFA when jumping', () => {
      const result = chooseBestPhysicalAttack(80, 5, DEFAULT_COMPONENT_DAMAGE, {
        isJumping: true,
      });
      // DFA = ceil(80/10)×3 = 24 > kick = 16
      expect(result).toBe('dfa');
    });

    it('should prefer charge with many hexes moved', () => {
      const result = chooseBestPhysicalAttack(80, 5, DEFAULT_COMPONENT_DAMAGE, {
        canReachForCharge: true,
        hexesMoved: 6,
      });
      // Charge = ceil(80/10)×(6-1) = 8×5 = 40 > kick = 16
      expect(result).toBe('charge');
    });

    it('should consider melee weapon', () => {
      const result = chooseBestPhysicalAttack(80, 5, DEFAULT_COMPONENT_DAMAGE, {
        hasMeleeWeapon: 'mace',
      });
      // Mace for 80t = floor(80×2/5) = 32 > kick = 16
      expect(result).toBe('mace');
    });

    it('should fall back to punch if kick unavailable', () => {
      const compDamage = {
        ...DEFAULT_COMPONENT_DAMAGE,
        actuators: { [ActuatorType.HIP]: true },
      };
      const result = chooseBestPhysicalAttack(80, 5, compDamage, {
        attackerProne: true,
      });
      // Prone prevents kick, hip destroyed prevents kick
      // Only punch available
      expect(result).toBe('punch');
    });
  });

  // =============================================================================
  // Constants Tests
  // =============================================================================

  describe('TSM_ACTIVATION_HEAT', () => {
    it('should be 9', () => {
      expect(TSM_ACTIVATION_HEAT).toBe(9);
    });
  });

  // =============================================================================
  // Phase Activation Tests (gameSession integration)
  // =============================================================================

  describe('phase sequence (via gameSession)', () => {
    // Import inline to avoid circular deps
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getNextPhase } = require('../gameSession');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GamePhase: GP } = require('@/types/gameplay');

    it('should have PhysicalAttack between WeaponAttack and Heat', () => {
      expect(getNextPhase(GP.WeaponAttack)).toBe(GP.PhysicalAttack);
      expect(getNextPhase(GP.PhysicalAttack)).toBe(GP.Heat);
    });

    it('should have correct full phase order', () => {
      expect(getNextPhase(GP.Initiative)).toBe(GP.Movement);
      expect(getNextPhase(GP.Movement)).toBe(GP.WeaponAttack);
      expect(getNextPhase(GP.WeaponAttack)).toBe(GP.PhysicalAttack);
      expect(getNextPhase(GP.PhysicalAttack)).toBe(GP.Heat);
      expect(getNextPhase(GP.Heat)).toBe(GP.End);
      expect(getNextPhase(GP.End)).toBe(GP.Initiative);
    });
  });

  // =============================================================================
  // Event Reducer Tests (gameState integration)
  // =============================================================================

  describe('event reducers (via gameState)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { applyEvent, createInitialGameState } = require('../gameState');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {
      GameEventType: GE,
      GamePhase: GP,
      LockState: LS,
    } = require('@/types/gameplay');

    function makeState() {
      const state = createInitialGameState('test-game');
      return {
        ...state,
        units: {
          'unit-1': {
            id: 'unit-1',
            side: 'player',
            position: { q: 0, r: 0 },
            facing: 'N',
            heat: 0,
            movementThisTurn: 'stationary',
            hexesMovedThisTurn: 0,
            armor: {},
            structure: {},
            destroyedLocations: [],
            destroyedEquipment: [],
            ammo: {},
            pilotWounds: 0,
            pilotConscious: true,
            destroyed: false,
            lockState: LS.Pending,
            damageThisPhase: 0,
          },
          'unit-2': {
            id: 'unit-2',
            side: 'opponent',
            position: { q: 1, r: 0 },
            facing: 'S',
            heat: 0,
            movementThisTurn: 'stationary',
            hexesMovedThisTurn: 0,
            armor: {},
            structure: {},
            destroyedLocations: [],
            destroyedEquipment: [],
            ammo: {},
            pilotWounds: 0,
            pilotConscious: true,
            destroyed: false,
            lockState: LS.Pending,
            damageThisPhase: 0,
          },
        },
      };
    }

    it('PhysicalAttackDeclared should set attacker to Planning', () => {
      const state = makeState();
      const event = {
        id: 'evt-1',
        gameId: 'test-game',
        sequence: 1,
        timestamp: new Date().toISOString(),
        type: GE.PhysicalAttackDeclared,
        turn: 1,
        phase: GP.PhysicalAttack,
        actorId: 'unit-1',
        payload: {
          attackerId: 'unit-1',
          targetId: 'unit-2',
          attackType: 'punch',
          toHitNumber: 5,
        },
      };
      const newState = applyEvent(state, event);
      expect(newState.units['unit-1'].lockState).toBe(LS.Planning);
    });

    it('PhysicalAttackResolved (hit) should accumulate damageThisPhase on target', () => {
      const state = makeState();
      const event = {
        id: 'evt-2',
        gameId: 'test-game',
        sequence: 2,
        timestamp: new Date().toISOString(),
        type: GE.PhysicalAttackResolved,
        turn: 1,
        phase: GP.PhysicalAttack,
        actorId: 'unit-1',
        payload: {
          attackerId: 'unit-1',
          targetId: 'unit-2',
          attackType: 'punch',
          roll: 8,
          toHitNumber: 5,
          hit: true,
          damage: 8,
          location: 'center_torso',
        },
      };
      const newState = applyEvent(state, event);
      expect(newState.units['unit-2'].damageThisPhase).toBe(8);
    });

    it('PhysicalAttackResolved (miss) should not change state', () => {
      const state = makeState();
      const event = {
        id: 'evt-3',
        gameId: 'test-game',
        sequence: 3,
        timestamp: new Date().toISOString(),
        type: GE.PhysicalAttackResolved,
        turn: 1,
        phase: GP.PhysicalAttack,
        actorId: 'unit-1',
        payload: {
          attackerId: 'unit-1',
          targetId: 'unit-2',
          attackType: 'punch',
          roll: 3,
          toHitNumber: 5,
          hit: false,
        },
      };
      const newState = applyEvent(state, event);
      expect(newState.units['unit-2'].damageThisPhase).toBe(0);
    });
  });
});
