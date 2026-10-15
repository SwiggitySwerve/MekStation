// Read the real catalog files at the browser file-reader boundary. All loader,
// conversion, registry, construction and weight logic remains real.
jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string, base: string): Promise<unknown> => {
    const { readFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    return JSON.parse(
      await readFile(join(process.cwd(), 'public', base, file), 'utf8'),
    );
  },
}));

import { renderHook } from '@testing-library/react';

import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { defaultCatalogAmmoLookup } from '@/simulation/runner/UnitHydrationAmmo';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { normalizeEquipmentId } from '@/utils/construction/equipmentBV/normalization';
import { getEquipmentPayloadWeight } from '@/utils/equipment/equipmentWeightAccounting';

import warhammer from '../../../../../public/data/units/battlemechs/1-age-of-war/standard/Warhammer WHM-6R.json';
import { parseUnit } from '../unitContractAdapter';
import { UnitLoaderService } from '../unitLoader';

beforeAll(async () => {
  await getEquipmentLookupService().initialize();
  await getEquipmentRegistry().initialize();
});

it('resolves the explicit full Inner Sphere MG bin without selecting a generic variant', () => {
  const token = warhammer.criticalSlots.CENTER_TORSO[10];
  expect(typeof token).toBe('string');
  if (typeof token !== 'string') return;
  const id = normalizeEquipmentId(token);
  expect(id).toBe('ammo-mg-full');
  expect(defaultCatalogAmmoLookup()(token)).toMatchObject({
    id: 'ammo-mg-full',
    shotsPerTon: 200,
  });
});

it('restores the real Warhammer ammunition in the loader and retains its 70 ton build', () => {
  const state = new UnitLoaderService().mapToUnitState(
    parseUnit(warhammer),
    true,
  );
  expect(
    state.equipment.filter((item) => item.equipmentId === 'ammo-mg-full'),
  ).toEqual([
    expect.objectContaining({
      weight: 1,
      location: MechLocation.CENTER_TORSO,
      slots: [10],
    }),
  ]);
  const { result } = renderHook(() =>
    useUnitCalculations(
      state.tonnage,
      state,
      state.armorTonnage,
      state.configuration,
    ),
  );
  expect(
    result.current.totalStructuralWeight +
      getEquipmentPayloadWeight(state.equipment),
  ).toBe(70);
});
