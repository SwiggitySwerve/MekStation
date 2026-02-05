import React, { useState } from 'react';

import { IEquipmentItem, EquipmentCategory } from '../../types/equipment';

/**
 * Filter options for equipment catalog
 * Uses EquipmentCategory from base types
 */
export interface FilterOptions {
  categories: EquipmentCategory[];
  weightRange: [number, number];
}

export interface EquipmentCatalogProps {
  items: IEquipmentItem[];
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  onItemSelect: (item: IEquipmentItem) => void;
  className?: string;
}

export function EquipmentCatalog({
  items,
  filters,
  onFilterChange,
  onItemSelect,
  className = '',
}: EquipmentCatalogProps): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleItemTap = (item: IEquipmentItem) => {
    onItemSelect(item);
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      filters.categories.length === 0 ||
      filters.categories.includes(item.category);
    const matchesWeight =
      item.weight >= filters.weightRange[0] &&
      item.weight <= filters.weightRange[1];
    return matchesSearch && matchesCategory && matchesWeight;
  });

  return (
    <div
      className={`equipment-catalog flex h-screen flex-col bg-white dark:bg-gray-900 ${className}`.trim()}
    >
      {/* Sticky Search Bar */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="p-safe px-4 pt-4 pb-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="search"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search equipment..."
                className="min-h-[44px] w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-3 pl-10 dark:border-gray-600 dark:bg-gray-800"
                aria-label="Search equipment"
              />
              <svg
                className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <button
              type="button"
              onClick={() => setShowFilterDrawer(true)}
              className="min-h-[44px] min-w-[44px] rounded-md bg-gray-200 px-4 py-2 dark:bg-gray-700"
              aria-label="Open filters"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredItems.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No equipment found
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemTap(item)}
                className="min-h-[44px] w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {item.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.category} • {item.weight} tons
                    </p>
                  </div>
                  <svg
                    className="ml-2 h-5 w-5 flex-shrink-0 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Filter Drawer */}
      {showFilterDrawer && (
        <FilterDrawer
          filters={filters}
          onFilterChange={onFilterChange}
          onClose={() => setShowFilterDrawer(false)}
        />
      )}
    </div>
  );
}

/**
 * Equipment categories available for filtering
 */
const FILTER_CATEGORIES: readonly EquipmentCategory[] = [
  EquipmentCategory.ENERGY_WEAPON,
  EquipmentCategory.BALLISTIC_WEAPON,
  EquipmentCategory.MISSILE_WEAPON,
  EquipmentCategory.AMMUNITION,
  EquipmentCategory.ELECTRONICS,
  EquipmentCategory.MISC_EQUIPMENT,
] as const;

function FilterDrawer({
  filters,
  onFilterChange,
  onClose,
}: {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  onClose: () => void;
}): React.ReactElement {
  return (
    <div
      className="bg-opacity-50 fixed inset-0 z-50 bg-black"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="absolute right-0 bottom-0 left-0 h-[80%] rounded-t-lg bg-white shadow-lg dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Filter equipment"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Filters
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close filters"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Filters */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Equipment Category
              </label>
              <div className="space-y-2">
                {FILTER_CATEGORIES.map((category) => (
                  <label
                    key={category}
                    className="flex min-h-[44px] items-center gap-2"
                  >
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(category)}
                      onChange={(e) => {
                        const newCategories = e.target.checked
                          ? [...filters.categories, category]
                          : filters.categories.filter((c) => c !== category);
                        onFilterChange({
                          ...filters,
                          categories: newCategories,
                        });
                      }}
                      className="h-5 w-5 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-900 dark:text-white">
                      {category}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Apply Button */}
          <div className="p-safe border-t border-gray-200 p-4 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] w-full rounded-md bg-blue-500 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-600"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
