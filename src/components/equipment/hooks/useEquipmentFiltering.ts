import { useState, useMemo, useCallback } from 'react';
import { FullEquipment } from '../../../types';
import { isEquipmentAvailable } from '../../../utils/techProgression';

export interface EquipmentFilters {
  categories: string[];
  techBase: ('Inner Sphere' | 'Clan' | 'Both')[];
  techLevel: string[];
  weightRange: { min: number; max: number };
  heatRange: { min: number; max: number };
  damageRange: { min: number; max: number };
  rangeType: ('short' | 'medium' | 'long')[];
  availability: {
    year: number;
    faction?: string;
    showUnavailable: boolean;
  };
  special: string[]; // Special abilities like TAG, ECM, etc.
  searchTerm: string;
}

const DEFAULT_FILTERS: EquipmentFilters = {
  categories: [],
  techBase: [],
  techLevel: [],
  weightRange: { min: 0, max: 100 },
  heatRange: { min: 0, max: 50 },
  damageRange: { min: 0, max: 100 },
  rangeType: [],
  availability: {
    year: 3025,
    faction: undefined,
    showUnavailable: false,
  },
  special: [],
  searchTerm: '',
};

export interface UseEquipmentFilteringReturn {
  filters: EquipmentFilters;
  setFilter: <K extends keyof EquipmentFilters>(key: K, value: EquipmentFilters[K]) => void;
  resetFilters: () => void;
  resetFilter: (key: keyof EquipmentFilters) => void;
  filteredEquipment: FullEquipment[];
  activeFilterCount: number;
  isFilterActive: (key: keyof EquipmentFilters) => boolean;
  saveFilterPreset: (name: string) => void;
  loadFilterPreset: (name: string) => void;
  filterPresets: Record<string, Partial<EquipmentFilters>>;
}

// Predefined filter presets
const FILTER_PRESETS: Record<string, Partial<EquipmentFilters>> = {
  'Energy Weapons': {
    categories: ['Energy'],
    techBase: ['Inner Sphere', 'Clan'],
  },
  'Ballistic Weapons': {
    categories: ['Ballistic'],
    techBase: ['Inner Sphere', 'Clan'],
  },
  'Missile Weapons': {
    categories: ['Missile'],
    techBase: ['Inner Sphere', 'Clan'],
  },
  'Long Range': {
    rangeType: ['long'],
    damageRange: { min: 5, max: 100 },
  },
  'Heat Efficient': {
    heatRange: { min: 0, max: 5 },
  },
  'Clan Tech': {
    techBase: ['Clan'],
  },
  'Introductory': {
    techLevel: ['Introductory'],
  },
};

export function useEquipmentFiltering(
  equipment: FullEquipment[],
  initialFilters?: Partial<EquipmentFilters>
): UseEquipmentFilteringReturn {
  const [filters, setFilters] = useState<EquipmentFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const [customPresets, setCustomPresets] = useState<Record<string, EquipmentFilters>>({});

  // Set individual filter
  const setFilter = useCallback(<K extends keyof EquipmentFilters>(
    key: K,
    value: EquipmentFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Reset individual filter
  const resetFilter = useCallback((key: keyof EquipmentFilters) => {
    setFilters(prev => ({
      ...prev,
      [key]: DEFAULT_FILTERS[key],
    }));
  }, []);

  // Check if a filter is active (different from default)
  const isFilterActive = useCallback((key: keyof EquipmentFilters): boolean => {
    const currentValue = filters[key];
    const defaultValue = DEFAULT_FILTERS[key];
    
    if (Array.isArray(currentValue)) {
      return currentValue.length > 0;
    }
    
    if (typeof currentValue === 'object' && currentValue !== null) {
      return JSON.stringify(currentValue) !== JSON.stringify(defaultValue);
    }
    
    return currentValue !== defaultValue;
  }, [filters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return Object.keys(filters).filter(key => 
      isFilterActive(key as keyof EquipmentFilters)
    ).length;
  }, [filters, isFilterActive]);

  // Filter equipment based on all criteria
  const filteredEquipment = useMemo(() => {
    return equipment.filter(item => {
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = 
          item.name.toLowerCase().includes(searchLower) ||
          item.type.toLowerCase().includes(searchLower) ||
          (item.data?.weapon_type || '').toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Category filter
      if (filters.categories.length > 0) {
        const category = item.data?.category || item.type;
        if (!filters.categories.includes(category)) return false;
      }

      // Tech base filter
      if (filters.techBase.length > 0) {
        const techBase = item.tech_base;
        // Type-safe tech base matching
        const validTechBases: Array<'Inner Sphere' | 'Clan' | 'Both'> = ['Inner Sphere', 'Clan', 'Both'];
        const safeTechBase = validTechBases.includes(techBase as any) ? techBase as 'Inner Sphere' | 'Clan' | 'Both' : 'Inner Sphere';
        
        const matchesTechBase = 
          filters.techBase.includes(safeTechBase) ||
          (filters.techBase.includes('Both') && (safeTechBase === 'Inner Sphere' || safeTechBase === 'Clan'));
        
        if (!matchesTechBase) return false;
      }

      // Weight range filter
      const weight = item.weight || 0;
      if (weight < filters.weightRange.min || weight > filters.weightRange.max) {
        return false;
      }

      // Heat range filter (for weapons)
      const heat = item.heat || 0;
      if (heat < filters.heatRange.min || heat > filters.heatRange.max) {
        return false;
      }

      // Damage range filter (for weapons)
      const damage = typeof item.damage === 'number' 
        ? item.damage 
        : parseInt(String(item.damage)) || 0;
      if (damage < filters.damageRange.min || damage > filters.damageRange.max) {
        return false;
      }

      // Range type filter
      if (filters.rangeType.length > 0 && item.data?.range) {
        const hasShortRange = (item.data.range.short || 0) <= 5;
        const hasLongRange = (item.data.range.long || 0) >= 15;
        const hasMediumRange = !hasShortRange && !hasLongRange;

        const matchesRange = 
          (filters.rangeType.includes('short') && hasShortRange) ||
          (filters.rangeType.includes('medium') && hasMediumRange) ||
          (filters.rangeType.includes('long') && hasLongRange);
        
        if (!matchesRange) return false;
      }

      // Availability filter
      if (!filters.availability.showUnavailable) {
        const techId = item.id.replace(/_/g, '_');
        const isAvailable = isEquipmentAvailable(
          techId,
          filters.availability.year,
          filters.availability.faction
        );
        if (!isAvailable) return false;
      }

      // Special abilities filter
      if (filters.special.length > 0) {
        const specials = item.data?.specials || [];
        const specialsArray = Array.isArray(specials) ? specials : [specials];
        const hasRequiredSpecials = filters.special.every(special =>
          specialsArray.some(s => s.toLowerCase().includes(special.toLowerCase()))
        );
        if (!hasRequiredSpecials) return false;
      }

      return true;
    });
  }, [equipment, filters]);

  // Save custom filter preset
  const saveFilterPreset = useCallback((name: string) => {
    setCustomPresets(prev => ({
      ...prev,
      [name]: { ...filters },
    }));
  }, [filters]);

  // Load filter preset
  const loadFilterPreset = useCallback((name: string) => {
    const preset = FILTER_PRESETS[name] || customPresets[name];
    if (preset) {
      setFilters({
        ...DEFAULT_FILTERS,
        ...preset,
      });
    }
  }, [customPresets]);

  // Combine predefined and custom presets
  const filterPresets = useMemo(() => ({
    ...FILTER_PRESETS,
    ...customPresets,
  }), [customPresets]);

  return {
    filters,
    setFilter,
    resetFilters,
    resetFilter,
    filteredEquipment,
    activeFilterCount,
    isFilterActive,
    saveFilterPreset,
    loadFilterPreset,
    filterPresets,
  };
}

// Helper function to get unique values for filter options
export function getFilterOptions(equipment: FullEquipment[]) {
  const categories = new Set<string>();
  const techBases = new Set<string>();
  const techLevels = new Set<string>();
  const specials = new Set<string>();

  equipment.forEach(item => {
    // Categories
    const category = item.data?.category || item.type;
    categories.add(category);

    // Tech bases
    if (item.tech_base) {
      techBases.add(item.tech_base);
    }

    // Tech levels (would need to be added to equipment data)
    // techLevels.add(item.techLevel);

    // Special abilities
    if (item.data?.specials) {
      const specialsArray = Array.isArray(item.data.specials) 
        ? item.data.specials 
        : [item.data.specials];
      specialsArray.forEach(special => specials.add(special));
    }
  });

  return {
    categories: Array.from(categories).sort(),
    techBases: Array.from(techBases).sort(),
    techLevels: Array.from(techLevels).sort(),
    specials: Array.from(specials).sort(),
  };
}
