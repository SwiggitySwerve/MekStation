/**
 * VehicleStatusBar — figures.
 *
 * Every weight term on the bar must come from the same construction helpers
 * the validation pipeline uses (engine table, half-ton structure, turret =
 * 10% of turret equipment, power amplifiers), and the BV / armor / validity
 * figures must describe the same vehicle.
 *
 * Reference unit: Tamerlane Strike Sled (Flamer), TR:3075, mulId 3156. The
 * repo's converted file (public/data/units/vehicles, gitignored) stores
 * engine rating 240 (tonnage x cruise). The published unit has a Magna 155
 * engine: 20 x 12 - 85 hover suspension factor = 155
 * (MegaMek mm-data 50f7efef0c9f, vehicles/3075/Tamerlane Strike Sled
 * (Flamer).blk; rules from MegaMek 48fcb2f64a1b, Engine.java / TestTank.java).
 *
 *   Published breakdown (tons): structure 2 + engine 8.5 (155 fusion: base
 *   5.5, x1.5 vehicle shielding) + lift 2 (10%) + controls 1 (5%) + turret 0.5
 *   + armor 3 (48 / 16) + flamer and 2 medium lasers 3 = 20.
 *
 * Installed engine shielding is covered here; the converted 240 rating is
 * still wrong and the bar still omits lift and controls (3 t). At the true
 * 155 rating it therefore shows 3 t free. The whole-unit reference remains
 * an it.failing test until those separate construction gaps are corrected.
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

// Rating 25 standard fusion installs at 1 t after vehicle shielding.
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
  const TAMERLANE = {
    tonnage: 20,
    motionType: GroundMotionType.HOVER,
    engineType: EngineType.STANDARD,
    cruiseMP: 12,
    armorTonnage: 3,
    armorAllocation: {
      ...createEmptyVehicleArmorAllocation(),
      [VehicleLocation.FRONT]: 10,
      [VehicleLocation.RIGHT]: 10,
      [VehicleLocation.LEFT]: 10,
      [VehicleLocation.REAR]: 8,
      [VehicleLocation.TURRET]: 10,
    },
    turret: turretConfig(),
    equipment: [
      mounted('flamer', 'eq-1', VehicleLocation.FRONT),
      inTurret('medium-laser', 'eq-2'),
      inTurret('medium-laser', 'eq-3'),
    ],
  };

  it('exposes the unresolved converted rating with installed shielding', () => {
    expect(weightFree({ ...TAMERLANE, engineRating: 240 })).toBe(-6);
  });

  it('still omits 3 t of controls and lift at the true Magna 155 rating', () => {
    expect(weightFree({ ...TAMERLANE, engineRating: 155 })).toBe(3);
  });

  // Known gap (follow-up): controls and lift are not modelled.
  it.failing(
    'the Tamerlane Strike Sled (Flamer) has no weight free at its published Magna 155 rating',
    () => {
      expect(weightFree({ ...TAMERLANE, engineRating: 155 })).toBe(0);
    },
  );
});

describe('VehicleStatusBar — engine weight', () => {
  it('includes vehicle shielding on the table-derived standard engine weight', () => {
    // 50 t - 13 installed engine - 5 structure
    expect(weightFree({ engineRating: 200 })).toBe(32);
  });

  it('applies the engine type multiplier from computeVehicleEngineWeight', () => {
    // XL 200: 8.5 * 0.5 -> 4.5; shielding 4.5 * 1.5 -> 7. 50 - 7 - 5.
    expect(
      weightFree({ engineRating: 200, engineType: EngineType.XL_IS }),
    ).toBe(38);
  });
});

describe('VehicleStatusBar — engine rating', () => {
  it('looks up a rating that is not a multiple of 5 at the next multiple of 5', () => {
    // 52 t at cruise 3 = 156, treated as 160 (9 t installed). 52 - 9 - 5.5.
    expect(weightFree({ tonnage: 52, engineRating: 156, cruiseMP: 3 })).toBe(
      37.5,
    );
  });
});

describe('VehicleStatusBar — structure weight', () => {
  it('rounds structure up to the half ton', () => {
    // 52 t: 5.2 -> 5.5 t. 52 - 1 engine - 5.5
    expect(weightFree({ tonnage: 52, ...SMALL_ENGINE })).toBe(45.5);
  });

  it('honours the structure type', () => {
    // Endo-Steel 50 t: 5 * 0.5 = 2.5 t. 50 - 1 engine - 2.5
    expect(
      weightFree({
        structureType: VehicleStructureType.ENDO_STEEL,
        ...SMALL_ENGINE,
      }),
    ).toBe(46.5);
  });
});

describe('VehicleStatusBar — turret weight', () => {
  // AC/10 is 12 t in the catalog; the turret is 10% of it, 1.2 -> 1.5 t.
  const AC10_IN_TURRET = [inTurret('ac-10', 'eq-1')];

  it('charges the primary turret 10% of its equipment, to the half ton', () => {
    // 50 - 1 engine - 5 structure - 12 AC/10 - 1.5 turret
    expect(
      weightFree({
        turret: turretConfig(),
        equipment: AC10_IN_TURRET,
        ...SMALL_ENGINE,
      }),
    ).toBe(30.5);
  });

  it('charges the secondary turret for its own equipment', () => {
    expect(
      weightFree({
        turret: turretConfig(TurretType.DUAL),
        secondaryTurret: turretConfig(),
        equipment: [mounted('ac-10', 'eq-1', VehicleLocation.TURRET_2, true)],
        ...SMALL_ENGINE,
      }),
    ).toBe(30.5);
  });

  it('does not charge turret weight for body-mounted equipment', () => {
    // 50 - 1 - 5 - 12
    expect(
      weightFree({
        turret: turretConfig(),
        equipment: [mounted('ac-10', 'eq-1')],
        ...SMALL_ENGINE,
      }),
    ).toBe(32);
  });

  it('leaves ammunition out of the turret structure, but keeps it in the total', () => {
    // AC/5 is 8 t, so 1 t of turret structure. Three 1 t ammo bins in the
    // turret must not push it to 1.5 t.
    // 50 - 1 engine - 5 structure - 8 AC/5 - 3 ammo - 1 turret
    expect(
      weightFree({
        turret: turretConfig(),
        equipment: [
          inTurret('ac-5', 'eq-1'),
          inTurret('ac-5-ammo', 'eq-2'),
          inTurret('ac-5-ammo', 'eq-3'),
          inTurret('ac-5-ammo', 'eq-4'),
        ],
        ...SMALL_ENGINE,
      }),
    ).toBe(32);
  });

  it('leaves ammunition out of the secondary turret structure too', () => {
    expect(
      weightFree({
        turret: turretConfig(TurretType.DUAL),
        secondaryTurret: turretConfig(),
        equipment: [
          mounted('ac-5', 'eq-1', VehicleLocation.TURRET_2, true),
          mounted('ac-5-ammo', 'eq-2', VehicleLocation.TURRET_2, true),
          mounted('ac-5-ammo', 'eq-3', VehicleLocation.TURRET_2, true),
          mounted('ac-5-ammo', 'eq-4', VehicleLocation.TURRET_2, true),
        ],
        ...SMALL_ENGINE,
      }),
    ).toBe(32);
  });

  it('shows the turret equipment mass against its capacity, not the structure weight', () => {
    renderBar({
      turret: turretConfig(),
      equipment: [
        mounted('medium-laser', 'eq-1', VehicleLocation.TURRET, true),
      ],
    });
    expect(item('Turret')).toEqual(['1.0', ' / 5.0 t']);
  });

  it('shows turret overflow in the error state', () => {
    // A 12 t AC/10 against a 5 t capacity
    renderBar({ turret: turretConfig(), equipment: AC10_IN_TURRET });
    expect(item('Turret')).toEqual(['12.0', ' / 5.0 t']);
    const value = screen.getByText('12.0');
    expect(value.className).toContain('text-red-400');
  });

  it('does not flag a turret within its capacity', () => {
    renderBar({
      turret: turretConfig(),
      equipment: [
        mounted('medium-laser', 'eq-1', VehicleLocation.TURRET, true),
      ],
    });
    expect(screen.getByText('1.0').className).not.toContain('text-red-400');
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

  it.each([
    [
      'a fission engine with a medium laser',
      EngineType.FISSION,
      'medium-laser',
      36.5,
    ],
    [
      'an ICE engine with a vehicle flamer',
      EngineType.ICE,
      'vehicle-flamer',
      43.5,
    ],
    [
      'an ICE engine with a Clan medium chemical laser',
      EngineType.ICE,
      'clan-medium-chemical-laser',
      43,
    ],
  ])(
    'needs no amplifiers on %s',
    (_name, engineType, equipmentId, expected) => {
      // Fission needs none; vehicle flamers and chemical lasers burn ammo.
      expect(
        weightFree({
          engineType,
          ...SMALL_ENGINE,
          equipment: [mounted(equipmentId, 'eq-1')],
        }),
      ).toBe(expected);
    },
  );

  it('needs no amplifiers on a fusion engine', () => {
    // 50 - 1 - 5 - 2
    expect(weightFree({ ...SMALL_ENGINE, equipment: TWO_MEDIUM_LASERS })).toBe(
      42,
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

  it('raises no turret weight error for a turret carrying equipment', () => {
    renderBar({
      ...LEGAL,
      turret: turretConfig(),
      equipment: [inTurret('ac-10', 'eq-1')],
    });
    expect(item('Valid')).toEqual(['OK', 'passes']);
  });

  it('passes an ICE vehicle with lasers, whose amplifiers the bar installs', () => {
    renderBar({
      ...LEGAL,
      engineType: EngineType.ICE,
      powerAmpWeight: 0,
      equipment: [
        mounted('medium-laser', 'eq-1'),
        mounted('medium-laser', 'eq-2'),
      ],
    });
    expect(item('Valid')).toEqual(['OK', 'passes']);
  });

  it.each([
    [
      'a fission engine with a medium laser',
      EngineType.FISSION,
      'medium-laser',
    ],
    ['an ICE engine with a vehicle flamer', EngineType.ICE, 'vehicle-flamer'],
    [
      'an ICE engine with a Clan medium chemical laser',
      EngineType.ICE,
      'clan-medium-chemical-laser',
    ],
  ])('passes %s', (_name, engineType, equipmentId) => {
    renderBar({
      ...LEGAL,
      engineType,
      equipment: [mounted(equipmentId, 'eq-1')],
    });
    expect(item('Valid')).toEqual(['OK', 'passes']);
  });
});

describe('VehicleStatusBar — reacts to equipment moving', () => {
  it('weight free drops when equipment moves into the turret', () => {
    const view = renderBar({
      turret: turretConfig(),
      equipment: [mounted('ac-10', 'eq-1')],
      ...SMALL_ENGINE,
    });
    const before = parseFloat(item('Weight Free')[0]);
    mockUseVehicleStore.mockImplementation((selector) =>
      selector({
        ...createDefaultVehicleState({
          name: 'Test Tank',
          tonnage: 50,
          techBase: TechBase.INNER_SPHERE,
          motionType: GroundMotionType.TRACKED,
        }),
        armorTonnage: 0,
        ...SMALL_ENGINE,
        turret: turretConfig(),
        equipment: [inTurret('ac-10', 'eq-1')],
      } as unknown as VehicleStore),
    );
    view.rerender(<VehicleStatusBar />);
    expect(parseFloat(item('Weight Free')[0])).toBe(before - 1.5);
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
