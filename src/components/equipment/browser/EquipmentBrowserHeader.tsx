/**
 * Equipment Browser Header - Search, filters, and sort controls
 * Handles user input for filtering and sorting equipment data
 * Follows SOLID principles with single responsibility for filter UI
 */

import React from 'react';

export interface FilterState {
  searchTerm: string;
  categoryFilter: string;
  techBaseFilter: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

export interface EquipmentBrowserHeaderProps {
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  categories: string[];
  techBases: string[];
  totalResults: number;
  filteredResults: number;
  isLoading?: boolean;
  className?: string;
}

export interface SortOption {
  value: string;
  label: string;
  field: string;
  order: 'ASC' | 'DESC';
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'name-ASC', label: 'Name (A-Z)', field: 'name', order: 'ASC' },
  { value: 'name-DESC', label: 'Name (Z-A)', field: 'name', order: 'DESC' },
  { value: 'weight-ASC', label: 'Weight (Low-High)', field: 'weight', order: 'ASC' },
  { value: 'weight-DESC', label: 'Weight (High-Low)', field: 'weight', order: 'DESC' },
  { value: 'crits-ASC', label: 'Slots (Low-High)', field: 'crits', order: 'ASC' },
  { value: 'crits-DESC', label: 'Slots (High-Low)', field: 'crits', order: 'DESC' },
  { value: 'damage-ASC', label: 'Damage (Low-High)', field: 'damage', order: 'ASC' },
  { value: 'damage-DESC', label: 'Damage (High-Low)', field: 'damage', order: 'DESC' },
  { value: 'heat-ASC', label: 'Heat (Low-High)', field: 'heat', order: 'ASC' },
  { value: 'heat-DESC', label: 'Heat (High-Low)', field: 'heat', order: 'DESC' },
  { value: 'techBase-ASC', label: 'Tech Base (IS first)', field: 'techBase', order: 'ASC' },
  { value: 'techBase-DESC', label: 'Tech Base (Clan first)', field: 'techBase', order: 'DESC' },
];

const TECH_BASE_OPTIONS = [
  { value: 'all', label: 'All Tech Bases' },
  { value: 'IS', label: 'Inner Sphere' },
  { value: 'Clan', label: 'Clan' },
];

export function EquipmentBrowserHeader({
  filters,
  onFiltersChange,
  categories,
  techBases,
  totalResults,
  filteredResults,
  isLoading = false,
  className = ''
}: EquipmentBrowserHeaderProps) {
  
  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ searchTerm: event.target.value });
  };

  // Handle category filter change
  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ categoryFilter: event.target.value });
  };

  // Handle tech base filter change
  const handleTechBaseChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ techBaseFilter: event.target.value });
  };

  // Handle sort change
  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOption = SORT_OPTIONS.find(option => option.value === event.target.value);
    if (selectedOption) {
      onFiltersChange({
        sortBy: selectedOption.field,
        sortOrder: selectedOption.order
      });
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    onFiltersChange({
      searchTerm: '',
      categoryFilter: 'all',
      techBaseFilter: 'all',
      sortBy: 'name',
      sortOrder: 'ASC'
    });
  };

  // Check if any filters are active
  const hasActiveFilters = filters.searchTerm !== '' || 
                          filters.categoryFilter !== 'all' || 
                          filters.techBaseFilter !== 'all';

  // Get current sort value for select
  const currentSortValue = `${filters.sortBy}-${filters.sortOrder}`;

  return (
    <div className={`equipment-browser-header ${className}`}>
      {/* Title and Results Summary */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-lg font-bold">Equipment Browser</h2>
        <div className="flex items-center space-x-4">
          {isLoading && (
            <div className="flex items-center text-blue-400 text-sm">
              <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading...
            </div>
          )}
          <div className="text-gray-400 text-sm">
            {hasActiveFilters && filteredResults !== totalResults ? (
              <span>
                <span className="text-white font-medium">{filteredResults}</span> of{' '}
                <span className="text-white font-medium">{totalResults}</span> items
              </span>
            ) : (
              <span>
                <span className="text-white font-medium">{totalResults}</span> items total
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Search Input */}
        <div className="space-y-2">
          <label className="block text-gray-300 text-sm font-medium">
            Search Equipment
          </label>
          <div className="relative">
            <input
              type="text"
              value={filters.searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by name or description..."
              className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2 pl-9 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              disabled={isLoading}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {filters.searchTerm && (
              <button
                onClick={() => onFiltersChange({ searchTerm: '' })}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                title="Clear search"
              >
                <svg className="h-4 w-4 text-gray-400 hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div className="space-y-2">
          <label className="block text-gray-300 text-sm font-medium">
            Category
          </label>
          <select
            value={filters.categoryFilter}
            onChange={handleCategoryChange}
            className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            disabled={isLoading}
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Tech Base Filter */}
        <div className="space-y-2">
          <label className="block text-gray-300 text-sm font-medium">
            Tech Base
          </label>
          <select
            value={filters.techBaseFilter}
            onChange={handleTechBaseChange}
            className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            disabled={isLoading}
          >
            {TECH_BASE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Control */}
        <div className="space-y-2">
          <label className="block text-gray-300 text-sm font-medium">
            Sort By
          </label>
          <select
            value={currentSortValue}
            onChange={handleSortChange}
            className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            disabled={isLoading}
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Actions */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between mb-4 p-3 bg-gray-700/50 rounded border border-gray-600">
          <div className="flex items-center space-x-2">
            <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
            </svg>
            <span className="text-blue-400 text-sm font-medium">
              Active Filters
            </span>
            <div className="flex items-center space-x-2 text-xs">
              {filters.searchTerm && (
                <span className="bg-blue-600 text-white px-2 py-1 rounded">
                  Search: "{filters.searchTerm}"
                </span>
              )}
              {filters.categoryFilter !== 'all' && (
                <span className="bg-green-600 text-white px-2 py-1 rounded">
                  Category: {filters.categoryFilter}
                </span>
              )}
              {filters.techBaseFilter !== 'all' && (
                <span className="bg-purple-600 text-white px-2 py-1 rounded">
                  Tech: {filters.techBaseFilter === 'IS' ? 'Inner Sphere' : 'Clan'}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleClearFilters}
            className="text-gray-400 hover:text-white text-sm underline"
            disabled={isLoading}
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Quick Filter Suggestions */}
      {!hasActiveFilters && (
        <div className="mb-4 p-3 bg-gray-800/50 rounded border border-gray-700">
          <div className="text-gray-400 text-sm mb-2">Quick Filters:</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onFiltersChange({ categoryFilter: 'Energy Weapons' })}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition-colors"
              disabled={isLoading}
            >
              Energy Weapons
            </button>
            <button
              onClick={() => onFiltersChange({ categoryFilter: 'Ballistic Weapons' })}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition-colors"
              disabled={isLoading}
            >
              Ballistic Weapons
            </button>
            <button
              onClick={() => onFiltersChange({ categoryFilter: 'Missile Weapons' })}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition-colors"
              disabled={isLoading}
            >
              Missile Weapons
            </button>
            <button
              onClick={() => onFiltersChange({ techBaseFilter: 'Clan' })}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-green-300 px-2 py-1 rounded transition-colors"
              disabled={isLoading}
            >
              Clan Tech
            </button>
            <button
              onClick={() => onFiltersChange({ sortBy: 'damage', sortOrder: 'DESC' })}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-red-300 px-2 py-1 rounded transition-colors"
              disabled={isLoading}
            >
              High Damage
            </button>
            <button
              onClick={() => onFiltersChange({ sortBy: 'weight', sortOrder: 'ASC' })}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-blue-300 px-2 py-1 rounded transition-colors"
              disabled={isLoading}
            >
              Lightweight
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Export utility functions for other components
export { SORT_OPTIONS, TECH_BASE_OPTIONS };
