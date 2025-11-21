import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { FullEquipment } from '../../types';
import { EditableUnit } from '../../types/editor';
import { useEquipmentFiltering } from './hooks/useEquipmentFiltering';
import { useEquipmentPlacement } from './hooks/useEquipmentPlacement';
import { useEquipmentValidation } from './hooks/useEquipmentValidation';
import { useEquipmentDragDrop, useDropZones, DragItem } from './hooks/useEquipmentDragDrop';
// Icon components
const Search = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const Filter = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const Settings = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const Package = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const AlertCircle = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Info = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronRight = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const ChevronDown = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

interface EquipmentManagementComponentProps {
  unit: EditableUnit;
  equipment: FullEquipment[];
  onUnitChange: (updates: Partial<EditableUnit>) => void;
  showFilters?: boolean;
  showPlacementTools?: boolean;
  showValidation?: boolean;
  allowDragDrop?: boolean;
  compact?: boolean;
}

export const EquipmentManagementComponent: React.FC<EquipmentManagementComponentProps> = ({
  unit,
  equipment,
  onUnitChange,
  showFilters = true,
  showPlacementTools = true,
  showValidation = true,
  allowDragDrop = true,
  compact = false,
}) => {
  const [selectedEquipment, setSelectedEquipment] = useState<FullEquipment | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Energy', 'Ballistic', 'Missile']));
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Custom hooks
  const {
    filters,
    setFilter,
    resetFilters,
    filteredEquipment,
    activeFilterCount,
    filterPresets,
    loadFilterPreset,
  } = useEquipmentFiltering(equipment);

  const {
    suggestPlacement,
    autoPlace,
    validatePlacement,
    optimizePlacements,
    placementOptions,
    setPlacementOptions,
  } = useEquipmentPlacement();

  const {
    validateEquipment,
    validateLoadout,
    validationOptions,
    setValidationOptions,
  } = useEquipmentValidation();

  const { dropZones, updateDropZonesForDrag, clearDropZones } = useDropZones(unit);

  // Handle equipment drop
  const handleEquipmentDrop = useCallback((item: DragItem, location: string, slotIndex?: number) => {
    if (!item.equipment) return;

    // Validate the placement
    const validation = validatePlacement(item.equipment, location, unit);
    if (!validation.valid) {
      console.error('Invalid placement:', validation.errors);
      return;
    }

    // Update unit with new equipment placement
    const newPlacements = [...unit.equipmentPlacements];
    const newCriticalSlots = [...unit.criticalSlots];

    // If moving from another location, remove from old location
    if (item.sourceLocation && !item.isNew) {
      const oldPlacementIndex = newPlacements.findIndex(
        p => p.equipment.id === item.equipment.id && p.location === item.sourceLocation
      );
      if (oldPlacementIndex >= 0) {
        newPlacements.splice(oldPlacementIndex, 1);
      }

      // Clear old critical slots
      newCriticalSlots.forEach(slot => {
        if (slot.location === item.sourceLocation && 
            slot.equipment?.id === item.equipment.id) {
          slot.equipment = undefined;
          slot.isEmpty = true;
        }
      });
    }

    // Add to new location
    const slots: number[] = [];
    const slotsNeeded = item.equipment.space || 1;
    
    if (slotIndex !== undefined) {
      for (let i = 0; i < slotsNeeded; i++) {
        slots.push(slotIndex + i);
      }
    }

    newPlacements.push({
      id: `${item.equipment.id}-${location}`,
      equipment: item.equipment,
      location,
      criticalSlots: slots,
    });

    // Update critical slots
    slots.forEach(slot => {
      const existingSlotIndex = newCriticalSlots.findIndex(
        s => s.location === location && s.slotIndex === slot
      );
      
      if (existingSlotIndex >= 0) {
        newCriticalSlots[existingSlotIndex] = {
          ...newCriticalSlots[existingSlotIndex],
          equipment: item.equipment,
          isEmpty: false,
        };
      } else {
        newCriticalSlots.push({
          location,
          slotIndex: slot,
          equipment: item.equipment,
          isFixed: false,
          isEmpty: false,
        });
      }
    });

    onUnitChange({
      equipmentPlacements: newPlacements,
      criticalSlots: newCriticalSlots,
    });
  }, [unit, onUnitChange, validatePlacement]);

  const {
    dragState,
    getDragHandleProps,
    getDropZoneProps,
    updateDropTargets,
  } = useEquipmentDragDrop(handleEquipmentDrop);

  // Update drop zones when dragging
  useEffect(() => {
    if (dragState.isDragging && dragState.draggedItem) {
      updateDropZonesForDrag(dragState.draggedItem);
      updateDropTargets(dropZones);
    } else {
      clearDropZones();
      updateDropTargets([]);
    }
  }, [dragState.isDragging, dragState.draggedItem, dropZones, updateDropZonesForDrag, clearDropZones, updateDropTargets]);

  // Group equipment by category
  const groupedEquipment = useMemo(() => {
    const groups: Record<string, FullEquipment[]> = {};
    
    filteredEquipment.forEach(item => {
      const category = item.data?.category || item.type || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });
    
    return groups;
  }, [filteredEquipment]);

  // Get validation status
  const loadoutValidation = useMemo(() => {
    return validateLoadout(unit);
  }, [unit, validateLoadout]);

  // Toggle category expansion
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  // Handle auto-place all
  const handleAutoPlaceAll = useCallback(() => {
    const unplacedEquipment = equipment.filter(
      eq => !unit.equipmentPlacements.some(p => p.equipment.id === eq.id)
    );
    
    const result = autoPlace(unplacedEquipment, unit, placementOptions);
    
    if (result.placements.length > 0) {
      // Convert placements to unit updates
      const newPlacements = [...unit.equipmentPlacements];
      const newCriticalSlots = [...unit.criticalSlots];
      
      result.placements.forEach(placement => {
        if (placement.success) {
          newPlacements.push({
            id: `${placement.equipment.id}-${placement.location}`,
            equipment: placement.equipment,
            location: placement.location,
            criticalSlots: placement.slots,
          });
          
          placement.slots.forEach(slot => {
            const existingIndex = newCriticalSlots.findIndex(
              s => s.location === placement.location && s.slotIndex === slot
            );
            
            if (existingIndex >= 0) {
              newCriticalSlots[existingIndex] = {
                ...newCriticalSlots[existingIndex],
                equipment: placement.equipment,
                isEmpty: false,
              };
            } else {
              newCriticalSlots.push({
                location: placement.location,
                slotIndex: slot,
                equipment: placement.equipment,
                isFixed: false,
                isEmpty: false,
              });
            }
          });
        }
      });
      
      onUnitChange({
        equipmentPlacements: newPlacements,
        criticalSlots: newCriticalSlots,
      });
    }
  }, [equipment, unit, autoPlace, placementOptions, onUnitChange]);

  // Handle optimize placements
  const handleOptimizePlacements = useCallback(() => {
    const result = optimizePlacements(unit, placementOptions);
    
    if (result.changes.length > 0) {
      console.log('Optimization suggestions:', result.changes);
      // Could show a dialog with suggested changes
    }
  }, [unit, optimizePlacements, placementOptions]);

  return (
    <div className={`equipment-management ${compact ? 'compact' : ''}`}>
      {/* Header with search and controls */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => setFilter('searchTerm', e.target.value)}
              placeholder="Search equipment..."
              className="w-full pl-10 pr-4 py-2 border rounded-md"
            />
          </div>
          
          {showFilters && (
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="p-2 border rounded-md hover:bg-gray-50 relative"
            >
              <Filter className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
          
          {showPlacementTools && (
            <button
              onClick={handleAutoPlaceAll}
              className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              Auto-Place All
            </button>
          )}
        </div>

        {/* Filter presets */}
        {showFilters && (
          <div className="flex flex-wrap gap-2">
            {Object.keys(filterPresets).slice(0, 5).map(preset => (
              <button
                key={preset}
                onClick={() => loadFilterPreset(preset)}
                className="px-2 py-1 text-sm border rounded-md hover:bg-gray-50"
              >
                {preset}
              </button>
            ))}
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="px-2 py-1 text-sm text-red-600 hover:text-red-700"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Advanced filters */}
      {showAdvancedFilters && showFilters && (
        <div className="mb-4 p-4 border rounded-md bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Tech Base */}
            <div>
              <label className="block text-sm font-medium mb-1">Tech Base</label>
              <select
                value={filters.techBase[0] || ''}
                onChange={(e) => setFilter('techBase', e.target.value ? [e.target.value as any] : [])}
                className="w-full px-2 py-1 border rounded"
              >
                <option value="">All</option>
                <option value="Inner Sphere">Inner Sphere</option>
                <option value="Clan">Clan</option>
                <option value="Both">Both</option>
              </select>
            </div>

            {/* Weight Range */}
            <div>
              <label className="block text-sm font-medium mb-1">Max Weight</label>
              <input
                type="number"
                value={filters.weightRange.max}
                onChange={(e) => setFilter('weightRange', { ...filters.weightRange, max: Number(e.target.value) })}
                className="w-full px-2 py-1 border rounded"
                min={0}
                step={0.5}
              />
            </div>

            {/* Heat Range */}
            <div>
              <label className="block text-sm font-medium mb-1">Max Heat</label>
              <input
                type="number"
                value={filters.heatRange.max}
                onChange={(e) => setFilter('heatRange', { ...filters.heatRange, max: Number(e.target.value) })}
                className="w-full px-2 py-1 border rounded"
                min={0}
              />
            </div>
          </div>
        </div>
      )}

      {/* Validation warnings */}
      {showValidation && loadoutValidation.issues.length > 0 && (
        <div className="mb-4 space-y-2">
          {loadoutValidation.issues.map((issue, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 p-2 rounded-md ${
                issue.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
              }`}
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{issue.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Equipment list */}
      <div className="border rounded-md overflow-hidden">
        {Object.entries(groupedEquipment).map(([category, items]) => (
          <div key={category} className="border-b last:border-b-0">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 flex items-center justify-between"
            >
              <span className="font-medium">{category}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{items.length}</span>
                {expandedCategories.has(category) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </div>
            </button>
            
            {expandedCategories.has(category) && (
              <div className="divide-y">
                {items.map(item => {
                  const validation = validateEquipment(item, unit);
                  const isPlaced = unit.equipmentPlacements.some(p => p.equipment.id === item.id);
                  
                  return (
                    <div
                      key={item.name}
                      className={`px-4 py-2 hover:bg-gray-50 ${
                        isPlaced ? 'bg-green-50' : ''
                      } ${!validation.canAdd ? 'opacity-50' : ''}`}
                      {...(allowDragDrop && !isPlaced && validation.canAdd ? getDragHandleProps(item) : {})}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${isPlaced ? 'text-green-700' : ''}`}>
                              {item.name}
                            </span>
                            {item.tech_base && (
                              <span className="text-xs px-2 py-0.5 bg-gray-200 rounded">
                                {item.tech_base}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            {item.weight && <span>{item.weight}t</span>}
                            {item.space && <span>{item.space} slots</span>}
                            {item.heat && <span>{item.heat} heat</span>}
                            {item.damage && <span>{item.damage} damage</span>}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {!validation.canAdd && (
                            <div className="relative group">
                              <AlertCircle className="w-4 h-4 text-red-500" />
                              <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block z-10">
                                <div className="bg-gray-900 text-white text-sm rounded p-2 max-w-xs">
                                  {validation.issues.map((issue, i) => (
                                    <div key={i}>{issue.message}</div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {showPlacementTools && !isPlaced && validation.canAdd && (
                            <button
                              onClick={() => {
                                const suggestions = suggestPlacement(item, unit);
                                if (suggestions.length > 0) {
                                  handleEquipmentDrop(
                                    { equipment: item, isNew: true },
                                    suggestions[0].location,
                                    suggestions[0].slots[0]
                                  );
                                }
                              }}
                              className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                              Place
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {selectedEquipment?.id === item.id && (
                        <div className="mt-2 pt-2 border-t text-sm text-gray-600">
                          {/* Additional equipment details */}
                          {item.data?.manufacturer && (
                            <div>Manufacturer: {item.data.manufacturer}</div>
                          )}
                          {validation.suggestions && (
                            <div className="mt-1 text-blue-600">
                              <Info className="inline w-3 h-3 mr-1" />
                              {validation.suggestions.join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Placement options */}
      {showPlacementTools && (
        <div className="mt-4 p-4 border rounded-md bg-gray-50">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Placement Options
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Strategy</label>
              <select
                value={placementOptions.strategy}
                onChange={(e) => setPlacementOptions({ strategy: e.target.value as any })}
                className="w-full px-2 py-1 border rounded text-sm"
              >
                <option value="balanced">Balanced</option>
                <option value="concentrated">Concentrated</option>
                <option value="distributed">Distributed</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Prioritize</label>
              <select
                value={placementOptions.prioritize}
                onChange={(e) => setPlacementOptions({ prioritize: e.target.value as any })}
                className="w-full px-2 py-1 border rounded text-sm"
              >
                <option value="protection">Protection</option>
                <option value="heat">Heat Distribution</option>
                <option value="weight">Weight Balance</option>
                <option value="criticals">Space Efficiency</option>
              </select>
            </div>
          </div>
          
          <div className="mt-2 space-y-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={placementOptions.restrictions.noExplosivesInCT}
                onChange={(e) => setPlacementOptions({
                  restrictions: { ...placementOptions.restrictions, noExplosivesInCT: e.target.checked }
                })}
              />
              Avoid explosives in Center Torso
            </label>
            
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={placementOptions.restrictions.symmetricArms}
                onChange={(e) => setPlacementOptions({
                  restrictions: { ...placementOptions.restrictions, symmetricArms: e.target.checked }
                })}
              />
              Symmetric arm weapons
            </label>
          </div>
          
          {showPlacementTools && (
            <button
              onClick={handleOptimizePlacements}
              className="mt-2 px-3 py-1 text-sm border rounded hover:bg-gray-100"
            >
              Optimize Current Placements
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EquipmentManagementComponent;
