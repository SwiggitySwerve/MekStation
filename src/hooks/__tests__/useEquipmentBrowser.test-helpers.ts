import * as React from 'react';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import {
  useEquipmentStore,
  useEquipmentSelector,
} from '@/stores/useEquipmentStore';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory, IEquipmentItem } from '@/types/equipment';

jest.mock('@/stores/useEquipmentStore');
jest.mock('@/services/equipment/EquipmentLookupService', () => {
  const _mock_equipmentLookupService = {
    getAllEquipment: jest.fn(),
    getAllWeapons: jest.fn(),
    getAllAmmunition: jest.fn(),
    initialize: jest.fn(),
    getById: jest.fn(),
    query: jest.fn(),
    getDataSource: jest.fn(),
  };
  return { getEquipmentLookupService: () => _mock_equipmentLookupService };
});

jest.mock('react', () => {
  const actualReact = jest.requireActual<typeof React>('react');
  return {
    ...actualReact,
    useContext: jest.fn(() => null),
  };
});

export const mockUseEquipmentStore = useEquipmentStore as jest.MockedFunction<
  typeof useEquipmentStore
>;
export const mockUseEquipmentSelector =
  useEquipmentSelector as jest.MockedFunction<typeof useEquipmentSelector>;
export const mockEquipmentLookupService =
  getEquipmentLookupService() as jest.Mocked<
    ReturnType<typeof getEquipmentLookupService>
  >;

const createMockEquipment = (
  overrides: Partial<IEquipmentItem> = {},
): IEquipmentItem => ({
  id: 'test-weapon-1',
  name: 'Test Weapon',
  category: EquipmentCategory.ENERGY_WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 5,
  criticalSlots: 2,
  costCBills: 10000,
  battleValue: 100,
  introductionYear: 2500,
  ...overrides,
});

export const mockEquipmentList: IEquipmentItem[] = [
  createMockEquipment({
    id: 'medium-laser',
    name: 'Medium Laser',
    weight: 1,
    introductionYear: 2300,
  }),
  createMockEquipment({
    id: 'large-laser',
    name: 'Large Laser',
    weight: 5,
    introductionYear: 2316,
  }),
  createMockEquipment({
    id: 'ppc',
    name: 'PPC',
    weight: 7,
    introductionYear: 2460,
  }),
  createMockEquipment({
    id: 'er-large-laser',
    name: 'ER Large Laser',
    weight: 5,
    techBase: TechBase.CLAN,
    introductionYear: 2620,
  }),
  createMockEquipment({
    id: 'ac-10',
    name: 'AC/10',
    category: EquipmentCategory.BALLISTIC_WEAPON,
    weight: 12,
    introductionYear: 2443,
  }),
];

export const createMockStoreState = () => ({
  equipment: mockEquipmentList,
  isLoading: false,
  error: null,
  filters: {
    search: '',
    techBase: null,
    category: null,
    activeCategories: new Set<EquipmentCategory>(),
    showAllCategories: true,
    hidePrototype: false,
    hideOneShot: false,
    hideUnavailable: false,
    hideAmmoWithoutWeapon: false,
    maxWeight: null,
    maxCriticalSlots: null,
    maxYear: null,
  },
  pagination: {
    currentPage: 1,
    pageSize: 25,
    totalItems: mockEquipmentList.length,
  },
  sort: {
    column: 'name' as const,
    direction: 'asc' as const,
  },
  setEquipment: jest.fn(),
  setLoading: jest.fn(),
  setError: jest.fn(),
  setUnitContext: jest.fn(),
  setSearch: jest.fn(),
  setTechBaseFilter: jest.fn(),
  setCategoryFilter: jest.fn(),
  selectCategory: jest.fn(),
  showAllCategories: jest.fn(),
  toggleHidePrototype: jest.fn(),
  toggleHideOneShot: jest.fn(),
  toggleHideUnavailable: jest.fn(),
  toggleHideAmmoWithoutWeapon: jest.fn(),
  setMaxWeight: jest.fn(),
  setMaxCriticalSlots: jest.fn(),
  setMaxYear: jest.fn(),
  clearFilters: jest.fn(),
  setPage: jest.fn(),
  setPageSize: jest.fn(),
  setSort: jest.fn(),
  getFilteredEquipment: jest.fn(() => mockEquipmentList),
  getPaginatedEquipment: jest.fn(() => mockEquipmentList),
  unitContext: {
    unitYear: null,
    unitTechBase: null,
    unitWeaponIds: [],
  },
});

export const setupEquipmentBrowserTest = () => {
  jest.clearAllMocks();
  const mockStoreState = createMockStoreState();
  mockUseEquipmentStore.mockReturnValue(mockStoreState);
  mockUseEquipmentSelector.mockImplementation((selector) =>
    selector(mockUseEquipmentStore()),
  );
  mockEquipmentLookupService.initialize = jest
    .fn()
    .mockResolvedValue(undefined);
  mockEquipmentLookupService.getAllEquipment = jest
    .fn()
    .mockReturnValue(mockEquipmentList);
  return mockStoreState;
};
