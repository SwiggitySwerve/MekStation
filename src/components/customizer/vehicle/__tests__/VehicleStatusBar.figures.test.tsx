/**
 * VehicleStatusBar — figures.
 *
 * Every weight term on the bar must come from the same construction helpers
 * the validation pipeline uses (engine table, half-ton structure, turret =
 * 10% of turret equipment, power amplifiers), and the BV / armor / validity
 * figures must describe the same vehicle.
 *
 * Reference unit: Tamerlane Strike Sled (Flamer), TR:3075, mulId 3156
 * (public/data/units/vehicles/Tamerlane Strike Sled (Flamer).json): 20 t
 * hover, standard fusion 240, 48 armor points, flamer + 2 medium lasers (two
 * of them in the turret). Its canon breakdown sums to exactly 20 t:
 * engine 11.5 + structure 2 + armor 3 + equipment 3 + turret 0.5.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { getEquipmentLoader } from '@/services/equipment/EquipmentLoaderService';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { useVehicleStore, type VehicleStore } from '@/stores/useVehicleStore';
import {
  createDefaultVehicleState,
  createEmptyVehicleArmorAllocation,
} from '@/stores/vehicleState';
import { EngineType } from '@/types/construction/EngineType';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import { TechBase } from '@/types/enums/TechBase';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { VehicleStructureType } from '@/utils/construction/vehicle/structure';

import { VehicleStatusBar } from '../VehicleStatusBar';

jest.mock('@/stores/useVehicleStore');
const mockUseVehicleStore = useVehicleStore as jest.MockedFunction<
  typeof useVehicleStore
>;

jest.mock('@/hooks/useEquipmentRegistry', () => ({
  useEquipmentRegistry: () => ({ isReady: true, recheckReady: jest.fn() }),
}));

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string, basePath: string) => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    return JSON.parse(
      await fs.readFile(
        path.join(process.cwd(), 'public', basePath, file),
        'utf8',
      ),
    );
  },
}));

function mounted(
  equipmentId: string,
  id: string,
  location: VehicleLocation = VehicleLocation.BODY,
  isTurretMounted = false,
) {
  return {
    id,
    equipmentId,
    name: equipmentId,
    location,
    isRearMounted: false,
    isTurretMounted,
    isSponsonMounted: false,
    linkedAmmoId: undefined,
  };
}

const inTurret = (equipmentId: string, id: string) =>
  mounted(equipmentId, id, VehicleLocation.TURRET, true);

function turretConfig(type: TurretType = TurretType.SINGLE) {
  return { type, maxWeight: 5, currentWeight: 0, rotationArc: 360 };
}

// Rating 25 is 0.5 t both in the engine table and in the old
// ceil(rating / 25) * 0.5 approximation, so tests that are not about the
// engine are not moved by it.
const SMALL_ENGINE = { engineRating: 25, cruiseMP: 1 };

function renderBar(overrides: Record<string, unknown> = {}) {
  const state = {
    ...createDefaultVehicleState({
      name: 'Test Tank',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
      motionType: GroundMotionType.TRACKED,
    }),
    armorTonnage: 0,
    armorAllocation: createEmptyVehicleArmorAllocation(),
    equipment: [],
    ...overrides,
  };
  mockUseVehicleStore.mockImplementation((selector) =>
    selector(state as unknown as VehicleStore),
  );
  return render(<VehicleStatusBar />);
}

function item(label: string): string[] {
  const root = screen.getByText(label).parentElement as HTMLElement;
  return Array.from(root.children)
    .slice(1)
    .map((c) => c.textContent ?? '');
}

function weightFree(overrides: Record<string, unknown> = {}): number {
  const { unmount } = renderBar(overrides);
  const value = parseFloat(item('Weight Free')[0]);
  unmount();
  return value;
}

beforeAll(async () => {
  const loader = getEquipmentLoader();
  if (!loader.getIsLoaded()) {
    await loader.loadOfficialEquipment();
  }
  await getEquipmentLookupService().initialize();
}, 30000);

describe('VehicleStatusBar — reference unit', () => {
  it('the Tamerlane Strike Sled (Flamer) has no weight free', () => {
    const armor = {
      ...createEmptyVehicleArmorAllocation(),
      [VehicleLocation.FRONT]: 10,
      [VehicleLocation.RIGHT]: 10,
      [VehicleLocation.LEFT]: 10,
      [VehicleLocation.REAR]: 8,
      [VehicleLocation.TURRET]: 10,
    };
    expect(
      weightFree({
        tonnage: 20,
        motionType: GroundMotionType.HOVER,
        engineType: EngineType.STANDARD,
        engineRating: 240,
        cruiseMP: 12,
        armorTonnage: 3,
        armorAllocation: armor,
        turret: turretConfig(),
        equipment: [
          mounted('flamer', 'eq-1', VehicleLocation.FRONT),
          inTurret('medium-laser', 'eq-2'),
          inTurret('medium-laser', 'eq-3'),
        ],
      }),
    ).toBe(0);
  });
});

describe('VehicleStatusBar — engine weight', () => {
  it('uses the engine table: a standard 200 engine weighs 8.5 t, not 4 t', () => {
    // 50 t - 8.5 engine - 5 structure
    expect(weightFree({ engineRating: 200 })).toBe(36.5);
  });

  it('applies the engine type multiplier and rounds up to the half ton', () => {
    // XL 200: 8.5 * 0.5 = 4.25 -> 4.5 t. 50 - 4.5 - 5
    expect(
      weightFree({ engineRating: 200, engineType: EngineType.XL_IS }),
    ).toBe(40.5);
  });
});

describe('VehicleStatusBar — structure weight', () => {
  it('rounds structure up to the half ton', () => {
    // 52 t: 5.2 -> 5.5 t. 52 - 0.5 engine - 5.5
    expect(weightFree({ tonnage: 52, ...SMALL_ENGINE })).toBe(46);
  });

  it('honours the structure type', () => {
    // Endo-Steel 50 t: 5 * 0.5 = 2.5 t. 50 - 0.5 engine - 2.5
    expect(
      weightFree({
        structureType: VehicleStructureType.ENDO_STEEL,
        ...SMALL_ENGINE,
      }),
    ).toBe(47);
  });
});

describe('VehicleStatusBar — turret weight', () => {
  // AC/10 is 12 t in the catalog; the turret is 10% of it, 1.2 -> 1.5 t.
  const AC10_IN_TURRET = [inTurret('ac-10', 'eq-1')];

  it('charges the primary turret 10% of its equipment, to the half ton', () => {
    // 50 - 0.5 engine - 5 structure - 12 AC/10 - 1.5 turret
    expect(
      weightFree({
        turret: turretConfig(),
        equipment: AC10_IN_TURRET,
        ...SMALL_ENGINE,
      }),
    ).toBe(31);
  });

  it('charges the secondary turret for its own equipment', () => {
    expect(
      weightFree({
        turret: turretConfig(TurretType.DUAL),
        secondaryTurret: turretConfig(),
        equipment: [mounted('ac-10', 'eq-1', VehicleLocation.TURRET_2, true)],
        ...SMALL_ENGINE,
      }),
    ).toBe(31);
  });

  it('does not charge turret weight for body-mounted equipment', () => {
    // 50 - 0.5 - 5 - 12
    expect(
      weightFree({
        turret: turretConfig(),
        equipment: [mounted('ac-10', 'eq-1')],
        ...SMALL_ENGINE,
      }),
    ).toBe(32.5);
  });

  it('shows the computed turret weight on the Turret item', () => {
    renderBar({
      turret: turretConfig(),
      equipment: AC10_IN_TURRET,
    });
    expect(item('Turret')).toEqual(['1.5', ' / 5.0 t']);
  });
});

describe('VehicleStatusBar — power amplifiers', () => {
  const TWO_MEDIUM_LASERS = [
    mounted('medium-laser', 'eq-1'),
    mounted('medium-laser', 'eq-2'),
  ];
  // ICE 25: 0.5 * 2.0 = 1 t in both the helper and the old approximation.
  const ICE = { engineType: EngineType.ICE, ...SMALL_ENGINE };

  it('counts the declared power amplifier weight', () => {
    // 50 - 1 engine - 5 structure - 2 lasers - 1 amps
    expect(
      weightFree({ ...ICE, equipment: TWO_MEDIUM_LASERS, powerAmpWeight: 1 }),
    ).toBe(41);
  });

  it('reserves the required amplifiers when none are declared', () => {
    // 2 t of lasers need ceil(0.2 / 0.5) * 0.5 = 0.5 t of amps
    expect(
      weightFree({ ...ICE, equipment: TWO_MEDIUM_LASERS, powerAmpWeight: 0 }),
    ).toBe(41.5);
  });

  it('needs no amplifiers on a fusion engine', () => {
    // 50 - 0.5 - 5 - 2
    expect(weightFree({ ...SMALL_ENGINE, equipment: TWO_MEDIUM_LASERS })).toBe(
      42.5,
    );
  });
});

describe('VehicleStatusBar — Valid', () => {
  // Legal 50 t tracked tank: fusion 200 at cruise 4, crew 4, light armor.
  const LEGAL = {
    engineRating: 200,
    crewSize: 4,
    armorAllocation: {
      ...createEmptyVehicleArmorAllocation(),
      [VehicleLocation.FRONT]: 10,
    },
  };

  it('is OK for the legal baseline', () => {
    renderBar(LEGAL);
    expect(item('Valid')).toEqual(['OK', 'passes']);
  });

  it('accepts a turret whose declared weight is the computed weight', () => {
    renderBar({
      ...LEGAL,
      turret: { ...turretConfig(), currentWeight: 1.5 },
      equipment: [inTurret('ac-10', 'eq-1')],
    });
    expect(item('Valid')).toEqual(['OK', 'passes']);
  });

  it('flags missing power amplifiers on an ICE vehicle with lasers', () => {
    renderBar({
      ...LEGAL,
      engineType: EngineType.ICE,
      powerAmpWeight: 0,
      equipment: [
        mounted('medium-laser', 'eq-1'),
        mounted('medium-laser', 'eq-2'),
      ],
    });
    expect(item('Valid')).toEqual(['1 err', 'VAL-VEHICLE-POWER-AMP']);
  });
});

describe('VehicleStatusBar — BV and armor agree about the turret', () => {
  const withTurretArmor = (turretArmor: number) => ({
    armorTonnage: 8,
    armorAllocation: {
      ...createEmptyVehicleArmorAllocation(),
      [VehicleLocation.FRONT]: 30,
      [VehicleLocation.TURRET]: turretArmor,
    },
  });

  it('ignores armor left on a removed turret in the BV, as the Armor item does', () => {
    const a = renderBar(withTurretArmor(20));
    const armorWith = item('Armor');
    const bvWith = item('BV');
    a.unmount();
    const b = renderBar(withTurretArmor(0));
    expect(armorWith[0]).toBe(item('Armor')[0]);
    expect(bvWith).toEqual(item('BV'));
    b.unmount();
  });
});
