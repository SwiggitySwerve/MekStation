/** @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md */
import { createDefaultVehicleState } from '@/stores/vehicleState';
import { EngineType } from '@/types/construction/EngineType';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { IEquipmentItem } from '@/types/equipment';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import {
  computeVehicleMountedWeightBreakdown,
  type VehicleMountedWeightState,
} from '../mountedWeight';
import { validateVehicleConstruction } from '../vehicleValidation';
import { computeVehicleWeightBreakdown } from '../weightComposition';
import reference from './fixtures/turret-mass.reference.json';

const config = {
  type: TurretType.SINGLE,
  maxWeight: 0,
  currentWeight: 999,
  rotationArc: 360,
};
const mount = (
  id: string,
  location = VehicleLocation.TURRET,
  equipmentId = id,
) => ({
  id,
  equipmentId,
  name: id,
  location,
  isRearMounted: false,
  isTurretMounted:
    location === VehicleLocation.TURRET ||
    location === VehicleLocation.TURRET_2,
  isSponsonMounted: false,
});
const item = (
  id: string,
  weight: number,
  category = EquipmentCategory.ENERGY_WEAPON,
): IEquipmentItem => ({
  id,
  name: id,
  weight,
  category,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  introductionYear: 3025,
  criticalSlots: 1,
  costCBills: 0,
  battleValue: 0,
});
const state: VehicleMountedWeightState = {
  equipment: [mount('primary'), mount('secondary', VehicleLocation.TURRET_2)],
  turret: config,
  secondaryTurret: config,
};
const resolved = (id: string) => item(id, 2.5);
it('uses a resolved launcher mass and keeps a missing registry record unknown', () => {
  const launcher = {
    ...mount(
      'launcher',
      VehicleLocation.FRONT,
      'wire-guided-missile-launcher-registry',
    ),
    sourceIdentity: {
      sourceId: 'wire-guided-missile-launcher:size:1.0',
      resolvedId: 'wire-guided-missile-launcher-registry',
    },
  };
  const input: VehicleMountedWeightState = {
    equipment: [launcher],
    turret: null,
    secondaryTurret: null,
  };
  // InfantrySupportWireGuidedMissileWeapon.java:63 at MegaMek48fcb2f6.
  expect(
    computeVehicleMountedWeightBreakdown(input, (id) =>
      item(id, 0.095, EquipmentCategory.MISSILE_WEAPON),
    ),
  ).toMatchObject({
    equipment: 0.095,
    energyWeapons: 0,
    unresolvedMountIds: [],
  });
  expect(
    computeVehicleMountedWeightBreakdown(input, () => undefined),
  ).toMatchObject({
    equipment: null,
    energyWeapons: null,
    unresolvedMountIds: ['launcher'],
  });
});
it('uses resolved mass independently and ignores obsolete capacity/usage estimates', () => {
  expect(computeVehicleMountedWeightBreakdown(state, resolved)).toMatchObject({
    equipment: 5,
    turretEquipment: 2.5,
    secondaryTurretEquipment: 2.5,
    turretMounted: 2.5,
    secondaryTurretMounted: 2.5,
    energyWeapons: 5,
    turret: 0.5,
    secondaryTurret: 0.5,
    primaryAllowanceOverloaded: false,
    secondaryAllowanceOverloaded: false,
    unresolvedMountIds: [],
    issues: [],
  });
});

it('retains ammunition in total/mounted mass, excluding it only from mechanism basis', () => {
  const input = { ...state, equipment: [...state.equipment, mount('ammo')] };
  expect(
    computeVehicleMountedWeightBreakdown(input, (id) =>
      item(
        id,
        id === 'ammo' ? 5 : 2.5,
        id === 'ammo'
          ? EquipmentCategory.AMMUNITION
          : EquipmentCategory.ENERGY_WEAPON,
      ),
    ),
  ).toMatchObject({
    equipment: 10,
    turretMounted: 7.5,
    secondaryTurretMounted: 2.5,
    turretEquipment: 2.5,
    turret: 0.5,
    energyWeapons: 5,
  });
});

it.each([undefined, -1, NaN, Infinity])(
  'keeps unresolved or invalid mass %s unknown, preserving the other turret',
  (weight) => {
    const result = computeVehicleMountedWeightBreakdown(state, (id) =>
      id === 'secondary'
        ? weight === undefined
          ? undefined
          : item(id, weight)
        : resolved(id),
    );
    expect(result).toMatchObject({
      equipment: null,
      secondaryTurretEquipment: null,
      secondaryTurretMounted: null,
      secondaryTurret: null,
      energyWeapons: null,
      turretEquipment: 2.5,
      turretMounted: 2.5,
      turret: 0.5,
      secondaryAllowanceOverloaded: null,
      unresolvedMountIds: ['secondary'],
    });
    expect(result.issues.length).toBeGreaterThan(0);
  },
);

it('reports instance ids when multiple unresolved mounts share one definition', () => {
  expect(
    computeVehicleMountedWeightBreakdown(
      {
        ...state,
        equipment: [
          mount('instance-a', VehicleLocation.BODY, 'missing'),
          mount('instance-b', VehicleLocation.BODY, 'missing'),
        ],
      },
      () => undefined,
    ).unresolvedMountIds,
  ).toEqual(['instance-a', 'instance-b']);
});

it('does not make ammo classification uncertain when only its mass is invalid', () => {
  expect(
    computeVehicleMountedWeightBreakdown(state, (id) =>
      id === 'primary'
        ? item(id, NaN, EquipmentCategory.AMMUNITION)
        : resolved(id),
    ),
  ).toMatchObject({
    equipment: null,
    turretMounted: null,
    turretEquipment: 0,
    turret: 0,
    energyWeapons: 2.5,
    secondaryTurret: 0.5,
  });
});

it('preserves real zero and includes all retained hull mounts', () => {
  const result = computeVehicleMountedWeightBreakdown(
    {
      ...state,
      equipment: [mount('zero'), mount('body', VehicleLocation.BODY)],
    },
    (id) => item(id, id === 'zero' ? 0 : 7),
  );
  expect(result).toMatchObject({
    equipment: 7,
    turretMounted: 0,
    turretEquipment: 0,
    turret: 0,
    unresolvedMountIds: [],
  });
});

it.each([
  [undefined, undefined, 0.5, 0.5, false, false],
  [-1, -1, 0.5, 0.5, false, false],
  [0, 0, 0, 0, true, true],
  [1, 1.5, 1, 1.5, false, false],
  [0, 0.5, 0, 0.5, true, false],
  [0.5, 0, 0.5, 0, false, true],
  [0.25, 0.25, 0.5, 0.5, true, true],
])(
  'charges Omni allowances %s/%s independently',
  (primary, secondary, mass, secondaryMass, overload, secondaryOverload) => {
    expect(
      computeVehicleMountedWeightBreakdown(
        {
          ...state,
          isOmni: true,
          baseChassisTurretWeight: primary,
          baseChassisSecondaryTurretWeight: secondary,
        },
        resolved,
      ),
    ).toMatchObject({
      turret: mass,
      secondaryTurret: secondaryMass,
      primaryAllowanceOverloaded: overload,
      secondaryAllowanceOverloaded: secondaryOverload,
    });
  },
);

it('ignores a non-Omni allowance', () => {
  expect(
    computeVehicleMountedWeightBreakdown(
      { ...state, baseChassisTurretWeight: 20 },
      resolved,
    ).turret,
  ).toBe(0.5);
  expect(
    computeVehicleMountedWeightBreakdown(
      {
        ...state,
        baseChassisTurretWeight: 20,
        baseChassisSecondaryTurretWeight: 20,
        turret: null,
        secondaryTurret: null,
      },
      resolved,
    ),
  ).toMatchObject({ turret: 0, secondaryTurret: 0 });
});

// Pinned TestTank.getWeightMisc sums getTankWeightTurret + getTankWeightDualTurret
// with no installation check, so a nonnegative explicit allowance is charged
// even for an absent turret. The allowance still never installs one.
it.each([
  [1, 1.5, 1, 1.5],
  [0, 0, 0, 0],
  [0.25, 0.25, 0.5, 0.5],
  [undefined, undefined, 0, 0],
  [-1, -1, 0, 0],
  [1, -1, 1, 0],
  [-1, 1.5, 0, 1.5],
  [0.5, undefined, 0.5, 0],
])(
  'charges Omni allowances %s/%s on absent turrets independently',
  (primary, secondary, mass, secondaryMass) => {
    const absent = {
      ...state,
      isOmni: true,
      baseChassisTurretWeight: primary,
      baseChassisSecondaryTurretWeight: secondary,
    };
    for (const turrets of [
      { turret: null, secondaryTurret: null },
      {
        turret: { ...config, type: TurretType.NONE },
        secondaryTurret: { ...config, type: TurretType.NONE },
      },
    ]) {
      expect(
        computeVehicleMountedWeightBreakdown(
          { ...absent, ...turrets },
          () => undefined,
        ),
      ).toMatchObject({
        turret: mass,
        secondaryTurret: secondaryMass,
        primaryAllowanceOverloaded: false,
        secondaryAllowanceOverloaded: false,
        issues: expect.arrayContaining([expect.stringContaining('unresolved')]),
      });
    }
  },
);

it('charges an absent primary allowance without disturbing an installed secondary', () => {
  expect(
    computeVehicleMountedWeightBreakdown(
      {
        ...state,
        isOmni: true,
        baseChassisTurretWeight: 1,
        baseChassisSecondaryTurretWeight: 0.25,
        turret: null,
      },
      resolved,
    ),
  ).toMatchObject({
    turret: 1,
    secondaryTurret: 0.5,
    primaryAllowanceOverloaded: false,
    secondaryAllowanceOverloaded: true,
  });
});

it('removes an absent-turret Omni allowance from remaining weight', () => {
  const base = createDefaultVehicleState({
    name: 'Absent turret allowance',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  const input = {
    ...base,
    equipment: [],
    turret: null,
    secondaryTurret: null,
    isOmni: true,
  };
  const without = computeVehicleWeightBreakdown(input, resolved);
  const charged = computeVehicleWeightBreakdown(
    { ...input, baseChassisTurretWeight: 1 },
    resolved,
  );
  expect(charged.turret).toBe(1);
  expect(charged.remaining).toBe((without.remaining as number) - 1);
});

it.each([NaN, Infinity, -Infinity])(
  'rejects nonfinite Omni allowance %s on an absent turret',
  (allowance) => {
    const result = computeVehicleMountedWeightBreakdown(
      {
        ...state,
        isOmni: true,
        baseChassisTurretWeight: allowance,
        turret: null,
      },
      resolved,
    );
    expect(result.turret).toBeNull();
    expect(result.primaryAllowanceOverloaded).toBeNull();
    expect(result.issues.join(' ')).toMatch(/allowance/i);
  },
);

it('reports an unsupported Omni support allowance on an absent turret', () => {
  const result = computeVehicleMountedWeightBreakdown(
    {
      ...state,
      unitType: UnitType.SUPPORT_VEHICLE,
      isOmni: true,
      baseChassisTurretWeight: 1,
      turret: null,
    },
    resolved,
  );
  expect(result.turret).toBeNull();
  expect(result.issues.join(' ')).toMatch(/unsupported/i);
});

it('keeps an assigned mechanism known while its overload basis is unknown', () => {
  expect(
    computeVehicleMountedWeightBreakdown(
      { ...state, isOmni: true, baseChassisTurretWeight: 0.25 },
      (id) => (id === 'primary' ? undefined : resolved(id)),
    ),
  ).toMatchObject({
    turret: 0.5,
    turretEquipment: null,
    turretMounted: null,
    primaryAllowanceOverloaded: null,
    secondaryTurret: 0.5,
  });
});

it.each([NaN, Infinity, -Infinity])(
  'rejects nonfinite Omni allowance %s',
  (allowance) => {
    const result = computeVehicleMountedWeightBreakdown(
      { ...state, isOmni: true, baseChassisTurretWeight: allowance },
      resolved,
    );
    expect(result).toMatchObject({
      turret: null,
      primaryAllowanceOverloaded: null,
      secondaryTurret: 0.5,
    });
    expect(result.issues.join(' ')).toMatch(/allowance/i);
  },
);

it.each([UnitType.SUPPORT_VEHICLE, UnitType.VEHICLE] as const)(
  'reports unsupported Omni family/turret context %s',
  (unitType) => {
    const result = computeVehicleMountedWeightBreakdown(
      {
        ...state,
        unitType,
        isOmni: true,
        turret:
          unitType === UnitType.SUPPORT_VEHICLE
            ? config
            : { ...config, type: TurretType.SPONSON_LEFT },
      },
      resolved,
    );
    expect(result.turret).toBeNull();
    expect(result.issues.join(' ')).toMatch(/unsupported/i);
  },
);

it('does not invent Weight Free from unknown equipment or amplifier mass', () => {
  const base = createDefaultVehicleState({
    name: 'Incomplete mass',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  const input = { ...base, ...state, engineType: EngineType.ICE };
  expect(computeVehicleWeightBreakdown(input, () => undefined)).toMatchObject({
    equipment: null,
    powerAmplifiers: null,
    remaining: null,
  });
  expect(
    computeVehicleWeightBreakdown(
      { ...input, engineType: EngineType.STANDARD },
      () => undefined,
    ),
  ).toMatchObject({ equipment: null, powerAmplifiers: 0, remaining: null });
  expect(
    computeVehicleWeightBreakdown({ ...input, powerAmpWeight: NaN }, resolved),
  ).toMatchObject({ powerAmplifiers: null, remaining: null });
});

it.each(reference.cases)(
  'matches observed Java turret terms: $name',
  (referenceCase) => {
    const equipment = referenceCase.mounts.map((m) =>
      mount(
        m.id,
        m.location === 'primary'
          ? VehicleLocation.TURRET
          : m.location === 'secondary'
            ? VehicleLocation.TURRET_2
            : VehicleLocation.BODY,
      ),
    );
    const result = computeVehicleMountedWeightBreakdown(
      {
        equipment,
        turret: referenceCase.primaryInstalled ? config : null,
        secondaryTurret: referenceCase.secondaryInstalled ? config : null,
        isOmni: referenceCase.isOmni,
        baseChassisTurretWeight: referenceCase.baseChassisTurretWeight,
        baseChassisSecondaryTurretWeight:
          referenceCase.baseChassisSecondaryTurretWeight,
      },
      (id) => {
        const observed = referenceCase.mounts.find((m) => m.id === id);
        if (!observed) throw new Error(`Missing projected Java mount ${id}`);
        // Only mechanism terms are compared: these projected classifications do not
        // certify weapon identity or power amplifiers.
        return item(
          id,
          observed.weight,
          observed.isAmmo
            ? EquipmentCategory.AMMUNITION
            : EquipmentCategory.MISC_EQUIPMENT,
        );
      },
    );
    expect(result).toMatchObject(referenceCase.expected);
    expect(result.issues).toEqual([]);
    expect(result.equipment).toBe(
      referenceCase.mounts.reduce((sum, m) => sum + m.weight, 0),
    );
  },
);

it('rejects finite inputs whose summed or rounded masses overflow', () => {
  const sum = computeVehicleMountedWeightBreakdown(state, (id) =>
    item(id, Number.MAX_VALUE),
  );
  expect(sum.equipment).toBeNull();
  expect(sum.issues.join(' ')).toMatch(/nonfinite/);
  const assigned = computeVehicleMountedWeightBreakdown(
    { ...state, isOmni: true, baseChassisTurretWeight: Number.MAX_VALUE },
    resolved,
  );
  expect(assigned.turret).toBeNull();
  expect(assigned.issues.join(' ')).toMatch(/nonfinite/);
});

it('keeps known non-energy classification independent of invalid mass', () => {
  const input = {
    ...createDefaultVehicleState({
      name: 'Known classification',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
    }),
    engineType: EngineType.ICE,
    equipment: [mount('bad', VehicleLocation.BODY)],
  };
  expect(
    computeVehicleWeightBreakdown(input, (id) =>
      item(id, NaN, EquipmentCategory.BALLISTIC_WEAPON),
    ),
  ).toMatchObject({
    equipment: null,
    energyWeapons: 0,
    powerAmplifiers: 0,
    remaining: null,
    isComplete: false,
  });
});
it('rejects a nonfinite remaining budget and retains real overweight values', () => {
  const input = createDefaultVehicleState({
    name: 'Finite budget',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  expect(
    computeVehicleWeightBreakdown({ ...input, armorTonnage: NaN }, resolved),
  ).toMatchObject({ remaining: null, isComplete: false });
  const overweight = computeVehicleWeightBreakdown(
    { ...input, armorTonnage: 100 },
    resolved,
  );
  expect(overweight.isComplete).toBe(true);
  expect(overweight.remaining).toBeLessThan(0);
});

it('transports incomplete full weight into construction validation without inventing errors', () => {
  const input = createDefaultVehicleState({
    name: 'Incomplete full calculation',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  expect(
    validateVehicleConstruction({
      ...input,
      armorAllocation: {},
      crewSize: 4,
      turretType: TurretType.NONE,
      turretEquipmentWeight: 0,
      turretStructureWeight: 0,
      secondaryTurretEquipmentWeight: 0,
      secondaryTurretStructureWeight: 0,
      energyWeaponWeight: 0,
      weightCalculationComplete: false,
    }),
  ).toMatchObject({ isComplete: false, isValid: false, errors: [] });
});
