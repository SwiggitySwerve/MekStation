/**
 * Equipment Tray - Expandable sidebar showing all equipment on the unit
 * Shows allocated and unallocated equipment with location information
 * Persistent across all tabs in the customizer
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useUnit } from '../multiUnit/MultiUnitProvider';
import { EquipmentAllocation } from '../../utils/criticalSlots/CriticalSlot';
import { 
  getEquipmentTypeBadgeClasses, 
  getEquipmentTypeDisplayName,
  getTechBaseColors,
  getTechBaseDisplayName,
  getEquipmentSortPriority,
  getBattleTechEquipmentClasses,
  getEquipmentCategory,
  isEquipmentCategory
} from '../../utils/equipmentColors';
import { classifyEquipment } from '../../utils/colors/battletechColors';

interface EquipmentTrayProps {
  isExpanded: boolean;
  onToggle: () => void;
}

// Individual equipment item component
interface EquipmentTrayItemProps {
  equipment: EquipmentAllocation;
  index: number;
  onRemove: (id: string) => void;
  readOnly?: boolean;
}

function EquipmentTrayItem({ equipment, index, onRemove, readOnly = false }: EquipmentTrayItemProps) {
  
  // Use standard EquipmentAllocation structure
  // If legacy support is needed, it should be handled by data migration, not UI casting
  const equipmentData = {
    name: equipment.equipmentData.name || 'Unknown Equipment',
    type: equipment.equipmentData.type || 'equipment',
    techBase: equipment.equipmentData.techBase || 'Inner Sphere',
    weight: equipment.equipmentData.weight || 0,
    slots: equipment.equipmentData.requiredSlots || 0,
    heat: equipment.equipmentData.heat || 0,
    id: equipment.equipmentGroupId || `equipment-${index}`
  };
  
  // Debug logging for development (can be removed in production)
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // console.log('EquipmentTrayItem data:', equipmentData);
    }
  }, [equipmentData]);

  // Use BattleTech color system for equipment
  const getEquipmentTypeColor = (equipmentName: string): string => {
    const battletechClasses = getBattleTechEquipmentClasses(equipmentName);
    // Extract background color and create matching border
    const bgMatch = battletechClasses.match(/bg-(\w+)-(\d+)/);
    const borderClass = bgMatch ? `border-${bgMatch[1]}-${Math.max(parseInt(bgMatch[2]) - 100, 500)}` : 'border-gray-600';
    return `${battletechClasses} ${borderClass}`;
  }

  // Tech base abbreviation helper
  const getTechAbbreviation = (techBase: string): string => {
    switch (techBase) {
      case 'Inner Sphere': return 'IS'
      case 'Clan': return 'CLAN'
      case 'Star League': return 'SL'
      default: return techBase.substring(0, 3).toUpperCase()
    }
  }

  // Check if this is a configuration-generated component that shouldn't be removable
  const isConfigurationComponent = (allocation: EquipmentAllocation): boolean => {
    const eq = allocation.equipmentData;
    const name = eq.name?.toLowerCase() || '';
    
    // Check for configuration components via componentType field if available
    // We use a type guard or check property existence safely
    const componentType = 'componentType' in eq ? (eq as any).componentType : undefined;
    
    const isConfigComponent = componentType === 'structure' || 
                             componentType === 'armor' ||
                             componentType === 'heatSink' ||
                             componentType === 'engine' ||
                             componentType === 'gyro' ||
                             componentType === 'jumpJet';
    
    // Additional name-based checks for legacy equipment or components without componentType
    const isHeatSink = name.includes('heat') && name.includes('sink');
    const isEndoSteel = name.includes('endo') || name.includes('steel');
    const isFerroFibrous = name.includes('ferro') || name.includes('fibrous');
    const isJumpJet = name.includes('jump') || name.includes('umu') || name.includes('booster');
    const isMASC = name.includes('masc');
    const isEngine = name.includes('engine') || name.includes('power plant');
    const isGyro = name.includes('gyro');
    const isCockpit = name.includes('cockpit') || name.includes('life support') || name.includes('sensors');
    const isActuator = name.includes('actuator') || name.includes('shoulder') || name.includes('hip');
    const isCASE = name.includes('case');
    const isTSM = name.includes('tsm') || name.includes('triple strength');
    const isPartialWing = name.includes('partial wing');
    const isMechTorso = name.includes('torso') || name.includes('shoulder') || name.includes('hip');
    
    return isConfigComponent || isHeatSink || isEndoSteel || isFerroFibrous || 
           isJumpJet || isMASC || isEngine || isGyro || isCockpit || isActuator ||
           isCASE || isTSM || isPartialWing || isMechTorso;
  };

  // Handle single click for testing
  const handleClick = () => {
    console.log('[EquipmentTrayItem] SINGLE CLICK detected on:', equipmentData.name);
  }

  // Handle double click for removal
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[EquipmentTrayItem] Double-click detected on:', equipmentData.name);
    
    if (readOnly) {
      console.log('[EquipmentTrayItem] Blocked - read only mode');
      return;
    }
    
    // Don't allow removal of configuration-generated components
    if (isConfigurationComponent(equipment)) {
      console.log('[EquipmentTrayItem] Cannot remove configuration component:', equipmentData.name);
      return;
    }
    
    // Use equipmentGroupId for removal since that's what the unit manager expects
    const removalId = equipment.equipmentGroupId || equipmentData.id;
    console.log('[EquipmentTrayItem] Attempting removal with ID:', removalId);
    
    onRemove(removalId);
  }

  // Dynamic tooltip based on state and equipment type
  const getTooltip = () => {
    if (readOnly) return equipmentData.name;
    
    if (isConfigurationComponent(equipment)) {
      const eq = equipment.equipmentData;
      const componentType = 'componentType' in eq ? (eq as any).componentType : undefined;
      const name = equipmentData.name.toLowerCase();
      let tabName = 'Structure';
      let reason = 'Configuration component';
      
      // Determine which tab manages this component and provide specific reason
      if (componentType === 'heatSink' || name.includes('heat sink')) {
        tabName = 'Structure';
        reason = 'Heat sink - modify via Structure tab';
      } else if (componentType === 'engine' || name.includes('engine')) {
        tabName = 'Structure';
        reason = 'Engine - modify via Structure tab';
      } else if (componentType === 'gyro' || name.includes('gyro')) {
        tabName = 'Structure';
        reason = 'Gyro - modify via Structure tab';
      } else if (componentType === 'jumpJet' || name.includes('jump')) {
        tabName = 'Movement';
        reason = 'Jump jet - modify via Movement tab';
      } else if (componentType === 'armor' || name.includes('ferro') || name.includes('endo')) {
        tabName = 'Armor';
        reason = 'Armor/Structure - modify via Armor tab';
      } else if (name.includes('masc')) {
        tabName = 'Movement';
        reason = 'MASC - modify via Movement tab';
      } else if (name.includes('case')) {
        tabName = 'Equipment';
        reason = 'CASE - modify via Equipment tab';
      } else if (name.includes('tsm')) {
        tabName = 'Equipment';
        reason = 'TSM - modify via Equipment tab';
      } else {
        reason = `Configuration component - modify via ${tabName} tab`;
      }
      
      return `${equipmentData.name} (${reason})`;
    }
    
    return 'Double-click to remove';
  }

  return (
    <div 
      className={`${getEquipmentTypeColor(equipmentData.name)} 
                 px-2 py-1 rounded border min-w-0 flex-shrink-0 cursor-pointer hover:opacity-80 select-none`}
      onDoubleClick={handleDoubleClick}
      title={getTooltip()}
      style={{ userSelect: 'none' }}
    >
      {/* Header with name and tech type */}
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-xs pr-1 truncate">{equipmentData.name}</h4>
        <span className="text-xs font-bold bg-black bg-opacity-40 px-1 py-0.5 rounded text-gray-200">
          ({getTechAbbreviation(equipmentData.techBase)})
        </span>
      </div>
      
      {/* Condensed stats in single line */}
      <div className="text-xs text-gray-300 leading-tight">
        <span>
          {equipmentData.slots}cr • {equipmentData.weight}t
          {equipmentData.heat !== undefined && equipmentData.heat !== 0 && (
            <span> • {equipmentData.heat > 0 ? '+' : ''}{equipmentData.heat}h</span>
          )}
        </span>
      </div>
    </div>
  );
}

export function EquipmentTray({ isExpanded, onToggle }: EquipmentTrayProps) {
  const router = useRouter();
  const { unit, unallocatedEquipment, removeEquipment } = useUnit();

  // State for hiding structural components
  const [hideStructural, setHideStructural] = useState(false);

  // Group and sort equipment
  const groupedEquipment = useMemo(() => {
    const groups: { [key: string]: EquipmentAllocation[] } = {
      'Energy Weapons': [],
      'Ballistic Weapons': [],
      'Missile Weapons': [],
      'Melee Weapons': [],
      'Equipment': [],
      'Structural': [],
      'Ammunition': []
    };

    // Process and categorize equipment
    unallocatedEquipment.forEach((equipment: EquipmentAllocation) => {
      const actualEquipment = equipment.equipmentData || equipment;
      const equipmentName = actualEquipment.name || 'Unknown Equipment';
      
      // Classify using BattleTech color system
      const category = classifyEquipment(equipmentName);
      
      // Map category to display groups
      switch (category) {
        case 'energy':
          groups['Energy Weapons'].push(equipment);
          break;
        case 'ballistic':
          groups['Ballistic Weapons'].push(equipment);
          break;
        case 'missile':
          groups['Missile Weapons'].push(equipment);
          break;
        case 'melee':
          groups['Melee Weapons'].push(equipment);
          break;
        case 'unhittable':
          groups['Structural'].push(equipment);
          break;
        case 'equipment':
        case 'engine':
        case 'gyro':
          groups['Equipment'].push(equipment);
          break;
        default:
          // Check if it's ammo
          const lowerName = equipmentName.toLowerCase();
          if (lowerName.includes('ammo') || lowerName.includes('ammunition')) {
            groups['Ammunition'].push(equipment);
          } else {
            groups['Equipment'].push(equipment);
          }
      }
    });

    // Sort equipment within each group alphabetically
    Object.keys(groups).forEach(groupName => {
      groups[groupName].sort((a, b) => {
        const nameA = (a.equipmentData?.name || '').toLowerCase();
        const nameB = (b.equipmentData?.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    });

    // Filter out empty groups and apply structural hiding
    const filteredGroups: { [key: string]: EquipmentAllocation[] } = {};
    Object.entries(groups).forEach(([groupName, items]) => {
      if (items.length > 0) {
        if (hideStructural && groupName === 'Structural') {
          return; // Skip structural components if hidden
        }
        filteredGroups[groupName] = items;
      }
    });

    return filteredGroups;
  }, [unallocatedEquipment, hideStructural]);

  // Calculate equipment statistics with V2 structure support
  const equipmentStats = useMemo(() => {
    let totalWeight = 0;
    let totalSlots = 0;
    let totalHeat = 0;

    unallocatedEquipment.forEach((equipment: EquipmentAllocation) => {
      // Check for V2 EquipmentAllocation structure first
      const actualEquipment = equipment.equipmentData || equipment;
      
      // Extract values with comprehensive fallback patterns
      const weight = actualEquipment.weight || 0;
      
      const slots = actualEquipment.requiredSlots || 0;
      
      const heat = actualEquipment.heat || 0;
      
      totalWeight += weight;
      totalSlots += slots;
      totalHeat += heat;
    });

    return {
      totalWeight,
      totalSlots,
      totalHeat,
      count: unallocatedEquipment.length
    };
  }, [unallocatedEquipment]);

  // Calculate capacity using new breakdown system
  const remainingWeight = unit.getRemainingTonnage();
  const breakdown = unit.getCriticalSlotBreakdown();
  const slotsOverage = breakdown.totals.overCapacity;

  // Handle equipment removal
  const handleRemoveEquipment = (equipmentId: string) => {
    removeEquipment(equipmentId);
  };

  // Handle navigation to equipment tab
  const handleGoToEquipmentTab = () => {
    const newQuery = { ...router.query, tab: 'equipment' };
    router.replace(
      {
        pathname: router.pathname,
        query: newQuery,
      },
      undefined,
      { shallow: true }
    );
  };

  return (
    <>
      {/* Toggle Button - Always visible */}
      <button
        onClick={onToggle}
        className={`fixed top-1/4 z-50 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-l-md border-l border-t border-b border-slate-600 transition-all duration-300 shadow-lg`}
        title={isExpanded ? 'Collapse Equipment Tray' : 'Expand Equipment Tray'}
        style={{ 
          right: isExpanded ? '320px' : '-2px',
          height: '50vh', // Middle half of screen height
          width: '20px'
        }}
      >
        <div className="flex flex-col items-center justify-between h-full py-2">
          <div className={`transform transition-transform text-xs ${isExpanded ? 'rotate-0' : 'rotate-180'}`}>
            ▶
          </div>
          <div className="text-xs font-medium transform -rotate-90 whitespace-nowrap" style={{ transformOrigin: 'center' }}>
            Equipment
          </div>
          <div className="flex items-center justify-center">
            {equipmentStats.count > 0 && (
              <div className="bg-orange-600 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center font-bold" style={{ fontSize: '10px' }}>
                {equipmentStats.count > 9 ? '9' : equipmentStats.count}
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Equipment Tray Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-slate-800 border-l border-slate-700 transform transition-transform duration-300 ease-in-out z-40 ${
          isExpanded ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col`}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-slate-100 font-medium">Equipment Tray</h3>
            <button
              onClick={onToggle}
              className="text-slate-400 hover:text-slate-100 transition-colors"
              title="Close tray"
            >
              ×
            </button>
          </div>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-700/30 rounded p-2 text-center">
              <div className="text-slate-400">Items</div>
              <div className="font-medium text-slate-100">{equipmentStats.count}</div>
            </div>
            <div className="bg-slate-700/30 rounded p-2 text-center">
              <div className="text-slate-400">Weight</div>
              <div className={`font-medium ${
                equipmentStats.totalWeight > remainingWeight ? 'text-red-400' : 'text-slate-100'
              }`}>
                {equipmentStats.totalWeight.toFixed(1)}t
              </div>
            </div>
            <div className="bg-slate-700/30 rounded p-2 text-center">
              <div className="text-slate-400">Slots</div>
              <div className={`font-medium ${
                slotsOverage > 0 ? 'text-red-400' : 'text-slate-100'
              }`}>
                {equipmentStats.totalSlots}
              </div>
            </div>
            <div className="bg-slate-700/30 rounded p-2 text-center">
              <div className="text-slate-400">Heat</div>
              <div className="font-medium text-orange-400">+{equipmentStats.totalHeat}</div>
            </div>
          </div>

          {/* Hide Structural Components Checkbox */}
          <div className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              id="hideStructural"
              checked={hideStructural}
              onChange={(e) => setHideStructural(e.target.checked)}
              className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
            />
            <label htmlFor="hideStructural" className="text-slate-300 text-xs">
              Hide structural components
            </label>
          </div>

          {/* Capacity Warnings */}
          {(equipmentStats.totalWeight > remainingWeight || slotsOverage > 0) && (
            <div className="mt-3 p-2 bg-red-900/20 border border-red-600/30 rounded text-red-300 text-xs">
              <div className="font-medium mb-1">⚠️ Capacity Exceeded</div>
              {equipmentStats.totalWeight > remainingWeight && (
                <div>• Weight over by {(equipmentStats.totalWeight - remainingWeight).toFixed(1)}t</div>
              )}
              {slotsOverage > 0 && (
                <div>• Slots over by {slotsOverage}</div>
              )}
            </div>
          )}
        </div>

        {/* Equipment List */}
        <div className="flex-1 overflow-auto p-4">
          {unallocatedEquipment.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              <div className="text-4xl mb-4">⚙️</div>
              <h4 className="font-medium mb-2">No Equipment Added</h4>
              <p className="text-sm mb-4">
                Use the Equipment Browser to add weapons and equipment to your unit
              </p>
              <button
                onClick={handleGoToEquipmentTab}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-2 mx-auto"
              >
                <span>🔧</span>
                Go to Equipment Tab
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedEquipment).map(([groupName, items]) => (
                <div key={groupName} className="space-y-2">
                  {/* Group Header */}
                  <div className="flex items-center gap-2">
                    <h4 className="text-slate-300 font-medium text-sm">{groupName}</h4>
                    <div className="flex-1 h-px bg-slate-600"></div>
                    <span className="text-slate-400 text-xs">{items.length}</span>
                  </div>
                  
                  {/* Group Items */}
                  <div className="space-y-1 pl-2">
                    {items.map((equipment: EquipmentAllocation, index: number) => (
                      <EquipmentTrayItem
                        key={`${equipment.equipmentGroupId}-${index}`}
                        equipment={equipment}
                        index={index}
                        onRemove={handleRemoveEquipment}
                        readOnly={false}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Backdrop overlay when expanded (for mobile) */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
}
