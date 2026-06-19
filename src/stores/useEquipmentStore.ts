/**
 * Equipment Store
 *
 * Manages equipment catalog state including:
 * - Cached equipment data
 * - Filter state for equipment browser
 * - Search and pagination state
 *
 * @spec openspec/specs/equipment-browser/spec.md
 */

import { create } from 'zustand';

import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory, IEquipmentItem } from '@/types/equipment';

import {
  filterEquipment,
  updateEquipmentCategories,
} from './useEquipmentStore.filters';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sortable columns
 */
export type SortColumn =
  | 'name'
  | 'category'
  | 'techBase'
  | 'weight'
  | 'criticalSlots'
  | 'damage'
  | 'heat';

/**
 * Unit context for equipment filtering
 * These values come from the active unit and are used for availability filtering
 */
export interface UnitContext {
  /** The unit's year (used for availability filtering) */
  readonly unitYear: number | null;
  /** The unit's tech base (used for compatibility filtering) */
  readonly unitTechBase: TechBase | null;
  /** The unit's mounted weapon IDs (used for ammo filtering) */
  readonly unitWeaponIds: readonly string[];
}

/**
 * Equipment filter state
 */
export interface EquipmentFilters {
  /** Text search query */
  readonly search: string;
  /** Tech base filter (null = all) */
  readonly techBase: TechBase | null;
  /** Category filter (null = all) - legacy single category */
  readonly category: EquipmentCategory | null;
  /** Active categories for toggle filter (empty = show all) */
  readonly activeCategories: Set<EquipmentCategory>;
  /** Show all categories (overrides activeCategories) */
  readonly showAllCategories: boolean;
  /** Hide prototype equipment */
  readonly hidePrototype: boolean;
  /** Hide one-shot equipment */
  readonly hideOneShot: boolean;
  /** Hide unavailable equipment (filters by unit year and tech base) */
  readonly hideUnavailable: boolean;
  /** Hide ammunition that doesn't have a matching weapon on the unit */
  readonly hideAmmoWithoutWeapon: boolean;
  /** Maximum weight filter */
  readonly maxWeight: number | null;
  /** Maximum critical slots */
  readonly maxCriticalSlots: number | null;
  /** Filter by year availability */
  readonly maxYear: number | null;
}

/**
 * Pagination state
 */
export interface PaginationState {
  readonly currentPage: number;
  readonly pageSize: number;
  readonly totalItems: number;
}

/**
 * Sort state
 */
export interface SortState {
  readonly column: SortColumn;
  readonly direction: SortDirection;
}

/**
 * Equipment store state
 */
export interface EquipmentStoreState {
  // Data
  equipment: IEquipmentItem[];
  isLoading: boolean;
  error: string | null;

  // Unit context (from active unit)
  unitContext: UnitContext;

  // Filters
  filters: EquipmentFilters;

  // Pagination
  pagination: PaginationState;

  // Sorting
  sort: SortState;

  // Actions
  setEquipment: (equipment: IEquipmentItem[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Unit context actions
  setUnitContext: (
    year: number | null,
    techBase: TechBase | null,
    weaponIds?: readonly string[],
  ) => void;

  // Filter actions
  setSearch: (search: string) => void;
  setTechBaseFilter: (techBase: TechBase | null) => void;
  setCategoryFilter: (category: EquipmentCategory | null) => void;
  /**
   * Handle category click - exclusive select by default, toggle if isMultiSelect is true (Ctrl+click)
   */
  selectCategory: (category: EquipmentCategory, isMultiSelect: boolean) => void;
  showAllCategories: () => void;
  toggleHidePrototype: () => void;
  toggleHideOneShot: () => void;
  toggleHideUnavailable: () => void;
  toggleHideAmmoWithoutWeapon: () => void;
  setMaxWeight: (weight: number | null) => void;
  setMaxCriticalSlots: (slots: number | null) => void;
  setMaxYear: (year: number | null) => void;
  clearFilters: () => void;

  // Pagination actions
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // Sort actions
  setSort: (column: SortColumn) => void;

  // Computed
  getFilteredEquipment: () => IEquipmentItem[];
  getPaginatedEquipment: () => IEquipmentItem[];
}

/**
 * Default unit context
 */
const DEFAULT_UNIT_CONTEXT: UnitContext = {
  unitYear: null,
  unitTechBase: null,
  unitWeaponIds: [],
};

/**
 * Default filter state
 */
const DEFAULT_FILTERS: EquipmentFilters = {
  search: '',
  techBase: null,
  category: null,
  activeCategories: new Set<EquipmentCategory>(),
  showAllCategories: true,
  hidePrototype: false,
  hideOneShot: false,
  hideUnavailable: true, // Default to hiding unavailable
  hideAmmoWithoutWeapon: false, // Default to showing all ammo
  maxWeight: null,
  maxCriticalSlots: null,
  maxYear: null,
};

/**
 * Default pagination state
 */
const DEFAULT_PAGINATION: PaginationState = {
  currentPage: 1,
  pageSize: 25,
  totalItems: 0,
};

/**
 * Default sort state
 */
const DEFAULT_SORT: SortState = {
  column: 'name',
  direction: 'asc',
};

/**
 * Equipment store for managing equipment browser state
 */
export const useEquipmentStore = create<EquipmentStoreState>((set, get) => ({
  // Initial state
  equipment: [],
  isLoading: false,
  error: null,
  unitContext: DEFAULT_UNIT_CONTEXT,
  filters: DEFAULT_FILTERS,
  pagination: DEFAULT_PAGINATION,
  sort: DEFAULT_SORT,

  // Data actions
  setEquipment: (equipment) =>
    set({
      equipment,
      pagination: { ...get().pagination, totalItems: equipment.length },
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  // Unit context actions
  setUnitContext: (year, techBase, weaponIds = []) =>
    set((state) => ({
      unitContext: {
        unitYear: year,
        unitTechBase: techBase,
        unitWeaponIds: weaponIds,
      },
      pagination: { ...state.pagination, currentPage: 1 },
    })),

  // Filter actions
  setSearch: (search) =>
    set((state) => ({
      filters: { ...state.filters, search },
      pagination: { ...state.pagination, currentPage: 1 },
    })),

  setTechBaseFilter: (techBase) =>
    set((state) => ({
      filters: { ...state.filters, techBase },
      pagination: { ...state.pagination, currentPage: 1 },
    })),

  setCategoryFilter: (category) =>
    set((state) => ({
      filters: { ...state.filters, category },
      pagination: { ...state.pagination, currentPage: 1 },
    })),

  selectCategory: (category, isMultiSelect) =>
    set((state) => {
      return {
        filters: {
          ...state.filters,
          activeCategories: updateEquipmentCategories(
            state.filters.activeCategories,
            category,
            isMultiSelect,
          ),
          showAllCategories: false,
        },
        pagination: { ...state.pagination, currentPage: 1 },
      };
    }),

  showAllCategories: () =>
    set((state) => ({
      filters: {
        ...state.filters,
        activeCategories: new Set<EquipmentCategory>(),
        showAllCategories: true,
      },
      pagination: { ...state.pagination, currentPage: 1 },
    })),

  toggleHidePrototype: () =>
    set((state) => ({
      filters: {
        ...state.filters,
        hidePrototype: !state.filters.hidePrototype,
      },
      pagination: { ...state.pagination, currentPage: 1 },
    })),

  toggleHideOneShot: () =>
    set((state) => ({
      filters: { ...state.filters, hideOneShot: !state.filters.hideOneShot },
      pagination: { ...state.pagination, currentPage: 1 },
    })),

  toggleHideUnavailable: () =>
    set((state) => ({
      filters: {
        ...state.filters,
        hideUnavailable: !state.filters.hideUnavailable,
      },
      pagination: { ...state.pagination, currentPage: 1 },
    })),

  toggleHideAmmoWithoutWeapon: () =>
    set((state) => ({
      filters: {
        ...state.filters,
        hideAmmoWithoutWeapon: !state.filters.hideAmmoWithoutWeapon,
      },
      pagination: { ...state.pagination, currentPage: 1 },
    })),

  setMaxWeight: (maxWeight) =>
    set((state) => ({
      filters: { ...state.filters, maxWeight },
      pagination: { ...state.pagination, currentPage: 1 },
    })),

  setMaxCriticalSlots: (maxCriticalSlots) =>
    set((state) => ({
      filters: { ...state.filters, maxCriticalSlots },
      pagination: { ...state.pagination, currentPage: 1 },
    })),

  setMaxYear: (maxYear) =>
    set((state) => ({
      filters: { ...state.filters, maxYear },
      pagination: { ...state.pagination, currentPage: 1 },
    })),

  clearFilters: () =>
    set({
      filters: {
        ...DEFAULT_FILTERS,
        activeCategories: new Set<EquipmentCategory>(),
      },
      pagination: { ...get().pagination, currentPage: 1 },
    }),

  // Pagination actions
  setPage: (page) =>
    set((state) => ({
      pagination: { ...state.pagination, currentPage: page },
    })),

  setPageSize: (size) =>
    set((state) => ({
      pagination: { ...state.pagination, pageSize: size, currentPage: 1 },
    })),

  // Sort actions
  setSort: (column) =>
    set((state) => ({
      sort: {
        column,
        direction:
          state.sort.column === column && state.sort.direction === 'asc'
            ? 'desc'
            : 'asc',
      },
      pagination: { ...state.pagination, currentPage: 1 },
    })),

  // Computed - get filtered equipment
  getFilteredEquipment: () => {
    const { equipment, filters, sort, unitContext } = get();
    return filterEquipment(equipment, filters, unitContext, sort);
  },

  // Computed - get paginated equipment
  getPaginatedEquipment: () => {
    const { pagination } = get();
    const filtered = get().getFilteredEquipment();

    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;

    return filtered.slice(startIndex, endIndex);
  },
}));

export function useEquipmentSelector<T>(
  selector: (state: EquipmentStoreState) => T,
): T {
  return useEquipmentStore(selector);
}
