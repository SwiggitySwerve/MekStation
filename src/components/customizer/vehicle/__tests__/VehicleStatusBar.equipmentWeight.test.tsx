/**
 * VehicleStatusBar — equipment weight.
 *
 * The "Weight Free" figure must subtract the real tonnage of the mounted
 * equipment (resolved from the equipment catalog by equipmentId), not a flat
 * one ton per item.
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
import { VehicleLocation } from '@/types/construction/UnitLocation';
import { TechBase } from '@/types/enums/TechBase';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

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

function mounted(equipmentId: string, name: string, id: string) {
  return {
    id,
    equipmentId,
    name,
    location: VehicleLocation.BODY,
    isRearMounted: false,
    isTurretMounted: false,
    isSponsonMounted: false,
    linkedAmmoId: undefined,
  };
}

// Known loadout (catalog weights in tons): 2 x Medium Laser (1.0 each),
// AC/10 (12.0), AC/10 ammo (1.0 per ton of ammo) = 15.0 t.
const LOADOUT = [
  mounted('medium-laser', 'Medium Laser', 'eq-1'),
  mounted('medium-laser', 'Medium Laser', 'eq-2'),
  mounted('ac-10', 'AC/10', 'eq-3'),
  mounted('ac-10-ammo', 'AC/10 Ammo', 'eq-4'),
];

function renderWeightFree(equipment: unknown[]): number {
  const state = {
    ...createDefaultVehicleState({
      name: 'Test Tank',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
      motionType: GroundMotionType.TRACKED,
    }),
    armorTonnage: 8,
    armorAllocation: createEmptyVehicleArmorAllocation(),
    equipment,
  };
  mockUseVehicleStore.mockImplementation((selector) =>
    selector(state as unknown as VehicleStore),
  );
  const { unmount } = render(<VehicleStatusBar />);
  const root = screen.getByText('Weight Free').parentElement as HTMLElement;
  const value = parseFloat(root.children[1].textContent ?? '');
  unmount();
  return value;
}

describe('VehicleStatusBar — equipment weight', () => {
  beforeAll(async () => {
    const loader = getEquipmentLoader();
    if (!loader.getIsLoaded()) {
      await loader.loadOfficialEquipment();
    }
    await getEquipmentLookupService().initialize();
  }, 30000);

  it('uses the catalog weights of the mounted equipment', () => {
    const lookup = getEquipmentLookupService();
    expect(lookup.getById('medium-laser')?.weight).toBe(1);
    expect(lookup.getById('ac-10')?.weight).toBe(12);
    expect(lookup.getById('ac-10-ammo')?.weight).toBe(1);
  });

  it('subtracts the real tonnage of a known loadout from Weight Free', () => {
    const empty = renderWeightFree([]);
    const loaded = renderWeightFree(LOADOUT);
    expect(empty - loaded).toBeCloseTo(15, 5);
  });

  it('does not charge one ton per item', () => {
    const empty = renderWeightFree([]);
    const oneHeavyItem = renderWeightFree([mounted('ac-10', 'AC/10', 'eq-1')]);
    expect(empty - oneHeavyItem).toBeCloseTo(12, 5);
  });
});
