/**
 * Vehicle Construction Unit Tests
 *
 * One scenario per VAL-VEHICLE-* rule plus happy-path tests for every
 * top-level calculator.  Uses named real-world vehicles as test data:
 *
 *   Manticore     — 50t tracked tank, standard fusion
 *   Savannah Master — 5t hover scout, ICE engine
 *   VTOL Warrior  — 4t VTOL gunship
 *
 * @spec openspec/changes/add-vehicle-construction/tasks.md §§ 3–9
 */

import { describe, it, expect } from '@jest/globals';

import { EngineType } from '@/types/construction/EngineType';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { computeMinimumCrew } from '@/utils/construction/vehicle/crew';
import {
  computeEngineRating,
  computeFlankMP,
} from '@/utils/construction/vehicle/engine';
import { computePowerAmplifierWeight } from '@/utils/construction/vehicle/powerAmplifier';
import {
  computeVehicleStructurePoints,
  computeVehicleStructureWeight,
  VehicleStructureType,
} from '@/utils/construction/vehicle/structure';
import { computeTurretWeight } from '@/utils/construction/vehicle/turret';
import {
  validateVehicleConstruction,
  VehicleValidationInput,
} from '@/utils/construction/vehicle/vehicleValidation';

// =============================================================================
// Shared test-data builders
// =============================================================================

/** Minimal valid input for a 50t tracked Manticore */
function manticoreInput(
  overrides: Partial<VehicleValidationInput> = {},
): VehicleValidationInput {
  return {
    tonnage: 50,
    motionType: GroundMotionType.TRACKED,
    engineType: EngineType.STANDARD,
    cruiseMP: 4,
    turretType: TurretType.SINGLE,
    turretEquipmentWeight: 10, // guns in turret
    turretStructureWeight: 1, // 10% of 10t = 1t
    secondaryTurretEquipmentWeight: 0,
    secondaryTurretStructureWeight: 0,
    armorType: 'Standard' as any,
    armorAllocation: {
      Front: 20,
      Left: 16,
      Right: 16,
      Rear: 10,
      Turret: 10,
      Body: 0,
    },
    crewSize: 4, // 50t tracked → min 4
    energyWeaponWeight: 0,
    powerAmpWeight: 0,
    structureType: VehicleStructureType.STANDARD,
    ...overrides,
  };
}

/** Minimal valid input for a 5t hover Savannah Master with ICE engine */
function savannahMasterInput(
  overrides: Partial<VehicleValidationInput> = {},
): VehicleValidationInput {
  return {
    tonnage: 5,
    motionType: GroundMotionType.HOVER,
    engineType: EngineType.STANDARD, // fusion — hover requires fusion
    cruiseMP: 8,
    turretType: TurretType.NONE,
    turretEquipmentWeight: 0,
    turretStructureWeight: 0,
    secondaryTurretEquipmentWeight: 0,
    secondaryTurretStructureWeight: 0,
    armorType: 'Standard' as any,
    armorAllocation: {
      Front: 2,
      Left: 1,
      Right: 1,
      Rear: 1,
      Turret: 0,
      Body: 0,
    },
    crewSize: 1,
    energyWeaponWeight: 0,
    powerAmpWeight: 0,
    structureType: VehicleStructureType.STANDARD,
    ...overrides,
  };
}

/** Minimal valid input for a 4t VTOL Warrior */
function vtolWarriorInput(
  overrides: Partial<VehicleValidationInput> = {},
): VehicleValidationInput {
  return {
    tonnage: 4,
    motionType: GroundMotionType.VTOL,
    engineType: EngineType.STANDARD,
    cruiseMP: 6,
    turretType: TurretType.CHIN,
    turretEquipmentWeight: 1,
    turretStructureWeight: 0.5, // 5% of 1t (chin) = 0.05 → ceil-to-half = 0.5
    secondaryTurretEquipmentWeight: 0,
    secondaryTurretStructureWeight: 0,
    armorType: 'Standard' as any,
    armorAllocation: {
      Front: 2,
      Left: 1,
      Right: 1,
      Rear: 1,
      Turret: 1,
      Body: 0,
    },
    crewSize: 2, // VTOL min = 2
    energyWeaponWeight: 0,
    powerAmpWeight: 0,
    structureType: VehicleStructureType.STANDARD,
    ...overrides,
  };
}

// =============================================================================
// §3  Engine calculations
// =============================================================================

describe('computeEngineRating', () => {
  it('Manticore 50t × cruiseMP 4 = 200', () => {
    expect(computeEngineRating(50, 4)).toBe(200);
  });

  it('Savannah Master 5t × cruiseMP 8 = 40', () => {
    expect(computeEngineRating(5, 8)).toBe(40);
  });

  it('VTOL Warrior 4t × cruiseMP 6 = 24', () => {
    expect(computeEngineRating(4, 6)).toBe(24);
  });
});

describe('computeFlankMP', () => {
  it('cruiseMP 4 → flank 6', () => {
    expect(computeFlankMP(4)).toBe(6);
  });

  it('cruiseMP 5 → flank 7 (floor of 7.5)', () => {
    expect(computeFlankMP(5)).toBe(7);
  });

  it('cruiseMP 8 → flank 12', () => {
    expect(computeFlankMP(8)).toBe(12);
  });
});

// =============================================================================
// §4  Internal structure
// =============================================================================

describe('computeVehicleStructureWeight', () => {
  it('20t standard → 2t', () => {
    expect(
      computeVehicleStructureWeight(20, VehicleStructureType.STANDARD),
    ).toBe(2);
  });

  it('40t standard → 4t', () => {
    expect(
      computeVehicleStructureWeight(40, VehicleStructureType.STANDARD),
    ).toBe(4);
  });

  it('60t standard → 6t', () => {
    expect(
      computeVehicleStructureWeight(60, VehicleStructureType.STANDARD),
    ).toBe(6);
  });

  it('80t standard → 8t', () => {
    expect(
      computeVehicleStructureWeight(80, VehicleStructureType.STANDARD),
    ).toBe(8);
  });

  it('100t standard → 10t', () => {
    expect(
      computeVehicleStructureWeight(100, VehicleStructureType.STANDARD),
    ).toBe(10);
  });

  it('Endo-Steel halves weight: 50t → 2.5t', () => {
    expect(
      computeVehicleStructureWeight(50, VehicleStructureType.ENDO_STEEL),
    ).toBe(2.5);
  });
});

describe('computeVehicleStructurePoints — tonnage brackets', () => {
  it('20t: front 6, side 5, rear 3', () => {
    const pts = computeVehicleStructurePoints(20);
    expect(pts.front).toBe(6);
    expect(pts.left).toBe(5);
    expect(pts.right).toBe(5);
    expect(pts.rear).toBe(3);
  });

  it('50t: front 12, side 11, rear 6', () => {
    const pts = computeVehicleStructurePoints(50);
    expect(pts.front).toBe(12);
    expect(pts.left).toBe(11);
    expect(pts.rear).toBe(6);
  });

  it('100t: front 22, side 21, rear 11', () => {
    const pts = computeVehicleStructurePoints(100);
    expect(pts.front).toBe(22);
    expect(pts.left).toBe(21);
    expect(pts.rear).toBe(11);
  });
});

// =============================================================================
// §6  Turret weight
// =============================================================================

describe('computeTurretWeight', () => {
  it('Single turret: 10t equipment → 1t', () => {
    expect(computeTurretWeight(TurretType.SINGLE, 10)).toBe(1);
  });

  it('Single turret: 7t equipment → 1t (ceil to half-ton)', () => {
    // 7 × 0.10 = 0.7 → ceil-to-half = 1.0
    expect(computeTurretWeight(TurretType.SINGLE, 7)).toBe(1);
  });

  it('Chin turret (VTOL): 1t equipment → 0.5t (5% rule)', () => {
    // 1 × 0.05 = 0.05 → ceil-to-half = 0.5
    expect(computeTurretWeight(TurretType.CHIN, 1)).toBe(0.5);
  });

  it('Sponson: 4t equipment → 0.5t per sponson', () => {
    expect(computeTurretWeight(TurretType.SPONSON_LEFT, 4)).toBe(0.5);
  });

  it('No turret → 0', () => {
    expect(computeTurretWeight(TurretType.NONE, 10)).toBe(0);
  });
});

// =============================================================================
// §7  Crew calculation
// =============================================================================

describe('computeMinimumCrew', () => {
  it('5t hover → 1 crew', () => {
    expect(computeMinimumCrew(5, GroundMotionType.HOVER)).toBe(1);
  });

  it('20t tracked → 2 crew', () => {
    expect(computeMinimumCrew(20, GroundMotionType.TRACKED)).toBe(2);
  });

  it('40t tracked → 3 crew', () => {
    expect(computeMinimumCrew(40, GroundMotionType.TRACKED)).toBe(3);
  });

  it('50t tracked → 4 crew', () => {
    expect(computeMinimumCrew(50, GroundMotionType.TRACKED)).toBe(4);
  });

  it('VTOL (any tonnage) → always 2 crew minimum', () => {
    expect(computeMinimumCrew(4, GroundMotionType.VTOL)).toBe(2);
    expect(computeMinimumCrew(30, GroundMotionType.VTOL)).toBe(2);
  });
});

// =============================================================================
// §8  Power amplifier weight
// =============================================================================

describe('computePowerAmplifierWeight', () => {
  it('10t of energy weapons → 1t power amp', () => {
    expect(computePowerAmplifierWeight(10)).toBe(1);
  });

  it('7t of energy weapons → 1t (ceil to half-ton)', () => {
    // 7 × 0.10 = 0.7 → ceil to 1.0
    expect(computePowerAmplifierWeight(7)).toBe(1);
  });

  it('3t of energy weapons → 0.5t', () => {
    // 3 × 0.10 = 0.3 → ceil to 0.5
    expect(computePowerAmplifierWeight(3)).toBe(0.5);
  });

  it('no energy weapons → 0', () => {
    expect(computePowerAmplifierWeight(0)).toBe(0);
  });
});

// =============================================================================
// §9  Validation rules — VAL-VEHICLE-*
// =============================================================================

describe('VAL-VEHICLE-TONNAGE', () => {
  it('valid: Manticore 50t tracked passes', () => {
    const result = validateVehicleConstruction(manticoreInput());
    const tonnageErrors = result.errors.filter(
      (e) => e.ruleId === 'VAL-VEHICLE-TONNAGE',
    );
    expect(tonnageErrors).toHaveLength(0);
  });

  it('error: Hover vehicle over 50t exceeds motion-type limit', () => {
    const result = validateVehicleConstruction(
      savannahMasterInput({ tonnage: 55 }),
    );
    const tonnageErrors = result.errors.filter(
      (e) => e.ruleId === 'VAL-VEHICLE-TONNAGE',
    );
    expect(tonnageErrors.length).toBeGreaterThan(0);
  });

  it('error: VTOL over 30t exceeds limit', () => {
    const result = validateVehicleConstruction(
      vtolWarriorInput({ tonnage: 35 }),
    );
    const tonnageErrors = result.errors.filter(
      (e) => e.ruleId === 'VAL-VEHICLE-TONNAGE',
    );
    expect(tonnageErrors.length).toBeGreaterThan(0);
  });
});

describe('VAL-VEHICLE-ENGINE', () => {
  it('valid: Manticore fusion engine at rating 200 passes', () => {
    const result = validateVehicleConstruction(manticoreInput());
    const engineErrors = result.errors.filter(
      (e) => e.ruleId === 'VAL-VEHICLE-ENGINE',
    );
    expect(engineErrors).toHaveLength(0);
  });

  it('error: engine rating exceeds 400', () => {
    // 100t × cruiseMP 5 = 500 > 400
    const result = validateVehicleConstruction(
      manticoreInput({ tonnage: 100, cruiseMP: 5, crewSize: 5 }),
    );
    const engineErrors = result.errors.filter(
      (e) => e.ruleId === 'VAL-VEHICLE-ENGINE',
    );
    expect(engineErrors.length).toBeGreaterThan(0);
  });

  it('error: ICE engine on Hover vehicle', () => {
    const result = validateVehicleConstruction(
      savannahMasterInput({ engineType: EngineType.ICE }),
    );
    const engineErrors = result.errors.filter(
      (e) => e.ruleId === 'VAL-VEHICLE-ENGINE',
    );
    expect(engineErrors.length).toBeGreaterThan(0);
  });
});

describe('VAL-VEHICLE-TURRET', () => {
  it('valid: Manticore single turret on 50t tracked', () => {
    const result = validateVehicleConstruction(manticoreInput());
    const turretErrors = result.errors.filter(
      (e) => e.ruleId === 'VAL-VEHICLE-TURRET',
    );
    expect(turretErrors).toHaveLength(0);
  });

  it('error: dual turret on 40t vehicle (< 50t minimum)', () => {
    const result = validateVehicleConstruction(
      manticoreInput({ tonnage: 40, turretType: TurretType.DUAL }),
    );
    const turretErrors = result.errors.filter(
      (e) => e.ruleId === 'VAL-VEHICLE-TURRET',
    );
    expect(turretErrors.length).toBeGreaterThan(0);
  });

  it('error: single turret on VTOL', () => {
    const result = validateVehicleConstruction(
      vtolWarriorInput({
        turretType: TurretType.SINGLE,
        turretStructureWeight: 0.5,
      }),
    );
    const turretErrors = result.errors.filter(
      (e) => e.ruleId === 'VAL-VEHICLE-TURRET',
    );
    expect(turretErrors.length).toBeGreaterThan(0);
  });

  it('error: chin turret on non-VTOL vehicle', () => {
    const result = validateVehicleConstruction(
      manticoreInput({ turretType: TurretType.CHIN }),
    );
    const turretErrors = result.errors.filter(
      (e) => e.ruleId === 'VAL-VEHICLE-TURRET',
    );
    expect(turretErrors.length).toBeGreaterThan(0);
  });
});

describe('VAL-VEHICLE-ARMOR-LOC', () => {
  it('valid: Manticore armor within 2× structure limits', () => {
    const result = validateVehicleConstruction(manticoreInput());
    const armorErrors = result.errors.filter(
      (e) => e.ruleId === 'VAL-VEHICLE-ARMOR-LOC',
    );
    expect(armorErrors).toHaveLength(0);
  });

  it('error: front armor exceeds 2× structure (50t front structure = 12 → max 24)', () => {
    const result = validateVehicleConstruction(
      manticoreInput({
        armorAllocation: {
          Front: 30, // 30 > 24 (2 × 12)
          Left: 16,
          Right: 16,
          Rear: 10,
          Turret: 10,
          Body: 0,
        },
      }),
    );
    const armorErrors = result.errors.filter(
      (e) => e.ruleId === 'VAL-VEHICLE-ARMOR-LOC',
    );
    expect(armorErrors.length).toBeGreaterThan(0);
  });
});

describe('VAL-VEHICLE-CREW', () => {
  it('valid: Manticore with 4 crew (minimum for 50t tracked)', () => {
    const result = validateVehicleConstruction(manticoreInput());
    const crewErrors = result.errors.filter(
      (e) => e.ruleId === 'VAL-VEHICLE-CREW',
    );
    expect(crewErrors).toHaveLength(0);
  });

  it('error: Manticore with only 2 crew (below minimum of 4)', () => {
    const result = validateVehicleConstruction(manticoreInput({ crewSize: 2 }));
    const crewErrors = result.errors.filter(
      (e) => e.ruleId === 'VAL-VEHICLE-CREW',
    );
    expect(crewErrors.length).toBeGreaterThan(0);
  });

  it('valid: VTOL Warrior with 2 crew (VTOL minimum)', () => {
    const result = validateVehicleConstruction(vtolWarriorInput());
    const crewErrors = result.errors.filter(
      (e) => e.ruleId === 'VAL-VEHICLE-CREW',
    );
    expect(crewErrors).toHaveLength(0);
  });

  it('error: VTOL Warrior with only 1 crew (below VTOL minimum of 2)', () => {
    const result = validateVehicleConstruction(
      vtolWarriorInput({ crewSize: 1 }),
    );
    const crewErrors = result.errors.filter(
      (e) => e.ruleId === 'VAL-VEHICLE-CREW',
    );
    expect(crewErrors.length).toBeGreaterThan(0);
  });
});

describe('VAL-VEHICLE-POWER-AMP', () => {
  it('valid: fusion engine — no power amps required', () => {
    const result = validateVehicleConstruction(
      manticoreInput({ energyWeaponWeight: 5, powerAmpWeight: 0 }),
    );
    const ampErrors = result.errors.filter(
      (e) => e.ruleId === 'VAL-VEHICLE-POWER-AMP',
    );
    expect(ampErrors).toHaveLength(0);
  });

  it('error: ICE engine with energy weapons and missing power amps', () => {
    // Wheeled ICE vehicle — legally can use ICE (not hover)
    const result = validateVehicleConstruction({
      tonnage: 30,
      motionType: GroundMotionType.WHEELED,
      engineType: EngineType.ICE,
      cruiseMP: 4,
      turretType: TurretType.NONE,
      turretEquipmentWeight: 0,
      turretStructureWeight: 0,
      secondaryTurretEquipmentWeight: 0,
      secondaryTurretStructureWeight: 0,
      armorType: 'Standard' as any,
      armorAllocation: {
        Front: 8,
        Left: 6,
        Right: 6,
        Rear: 4,
        Turret: 0,
        Body: 0,
      },
      crewSize: 3,
      energyWeaponWeight: 10, // has energy weapons
      powerAmpWeight: 0, // but no power amps declared
      structureType: VehicleStructureType.STANDARD,
    });
    const ampErrors = result.errors.filter(
      (e) => e.ruleId === 'VAL-VEHICLE-POWER-AMP',
    );
    expect(ampErrors.length).toBeGreaterThan(0);
  });

  it('valid: ICE engine with energy weapons AND correct power amps', () => {
    // 10t energy weapons → 1t power amps needed
    const result = validateVehicleConstruction({
      tonnage: 30,
      motionType: GroundMotionType.WHEELED,
      engineType: EngineType.ICE,
      cruiseMP: 4,
      turretType: TurretType.NONE,
      turretEquipmentWeight: 0,
      turretStructureWeight: 0,
      secondaryTurretEquipmentWeight: 0,
      secondaryTurretStructureWeight: 0,
      armorType: 'Standard' as any,
      armorAllocation: {
        Front: 8,
        Left: 6,
        Right: 6,
        Rear: 4,
        Turret: 0,
        Body: 0,
      },
      crewSize: 3,
      energyWeaponWeight: 10,
      powerAmpWeight: 1,
      structureType: VehicleStructureType.STANDARD,
    });
    const ampErrors = result.errors.filter(
      (e) => e.ruleId === 'VAL-VEHICLE-POWER-AMP',
    );
    expect(ampErrors).toHaveLength(0);
  });
});

// =============================================================================
// §10.4  Integration: legal 40t tracked tank end-to-end
// =============================================================================

describe('Integration: legal 40t tracked tank', () => {
  it('passes all VAL-VEHICLE-* rules with a minimal-but-valid build', () => {
    const result = validateVehicleConstruction({
      tonnage: 40,
      motionType: GroundMotionType.TRACKED,
      engineType: EngineType.STANDARD,
      cruiseMP: 4, // rating = 160, well within 400
      turretType: TurretType.SINGLE,
      turretEquipmentWeight: 6,
      turretStructureWeight: 1, // 10% of 6t = 0.6 → ceil-to-half = 1.0
      secondaryTurretEquipmentWeight: 0,
      secondaryTurretStructureWeight: 0,
      armorType: 'Standard' as any,
      armorAllocation: {
        Front: 16, // max at 40t front = 2 × 10 = 20 ✓
        Left: 12,
        Right: 12,
        Rear: 8,
        Turret: 8,
        Body: 0,
      },
      crewSize: 3, // 40t tracked minimum = 3
      energyWeaponWeight: 0,
      powerAmpWeight: 0,
      structureType: VehicleStructureType.STANDARD,
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
