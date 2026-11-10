import { act, renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLoader } from '@/services/equipment/EquipmentLoaderService';
import {
  getEquipmentLookupService,
  resetEquipmentLookupService,
} from '@/services/equipment/EquipmentLookupService';
import { useEquipmentStore } from '@/stores/useEquipmentStore';
import { EquipmentCategory } from '@/types/equipment';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { isProtoMechCatalogEquipment } from '@/utils/construction/protomech/equipmentLegality';

import { useEquipmentBrowser } from '../useEquipmentBrowser';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));

beforeAll(async () => {
  getEquipmentLoader().clear();
  resetEquipmentLookupService();
  await getEquipmentLookupService().initialize();
});
beforeEach(() => {
  const store = useEquipmentStore.getState();
  store.clearFilters();
  store.toggleHideUnavailable();
  store.setUnitContext(null, null, []);
  store.setEquipment(getEquipmentLookupService().getAllEquipment());
});

it.each(Object.values(UnitType))(
  'applies %s eligibility before ammo matching and paging',
  (unitType) => {
    const service = getEquipmentLookupService();
    const expectedCandidates = service.getBrowserEquipment(unitType);
    const { result } = renderHook(() => useEquipmentBrowser({ unitType }));
    const expected = useEquipmentStore
      .getState()
      .getFilteredEquipment(expectedCandidates);
    expect(result.current.filteredEquipment).toEqual(expected);
    expect(result.current.totalItems).toBe(expected.length);
    expect(result.current.paginatedEquipment).toEqual(expected.slice(0, 25));
    expect(
      expected.every(
        (item) =>
          item.allowedUnitTypes === undefined ||
          item.allowedUnitTypes.includes(unitType),
      ),
    ).toBe(true);
  },
);

it('does not retain ammunition whose only compatible launcher was removed by catalogFilter', () => {
  const { result } = renderHook(() =>
    useEquipmentBrowser({
      catalogFilter: (item) => item.category === EquipmentCategory.AMMUNITION,
    }),
  );
  expect(result.current.filteredEquipment).toEqual([]);
  expect(result.current.totalItems).toBe(0);
});

it('keeps family candidates local and resets the page when switching family without reloading', () => {
  const shared = useEquipmentStore.getState().equipment;
  const { result, rerender } = renderHook(
    ({ unitType }) =>
      useEquipmentBrowser({
        unitType,
        catalogFilter:
          unitType === UnitType.PROTOMECH
            ? isProtoMechCatalogEquipment
            : undefined,
      }),
    { initialProps: { unitType: UnitType.BATTLEMECH } },
  );
  const mech = result.current.filteredEquipment;
  act(() => result.current.setPage(4));
  rerender({ unitType: UnitType.PROTOMECH });
  expect(result.current.currentPage).toBe(1);
  expect(
    result.current.filteredEquipment.every(isProtoMechCatalogEquipment),
  ).toBe(true);
  act(() => result.current.setSearch('Bombast Laser'));
  expect(result.current.totalItems).toBe(0);
  rerender({ unitType: UnitType.BATTLEMECH });
  expect(
    result.current.filteredEquipment.some(
      (item) => item.id === 'bombast-laser',
    ),
  ).toBe(true);
  act(() => result.current.setSearch(''));
  expect(result.current.filteredEquipment).toEqual(mech);
  expect(useEquipmentStore.getState().equipment).toBe(shared);
});
