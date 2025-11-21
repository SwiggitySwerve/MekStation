/**
 * ArmorTabV2 - Unit armor configuration and allocation tab
 * 
 * Extracted from CustomizerV2Content as part of Phase 2 refactoring
 * Handles armor type selection, tonnage management, location allocation, and diagram visualization
 * 
 * @see IMPLEMENTATION_REFERENCE.md for tab component patterns
 */

import React from 'react';
import { useUnit } from '../../multiUnit/MultiUnitProvider';

// Import armor efficiency notification
import { ArmorEfficiencyNotification } from '../../armor/ArmorEfficiencyNotification';

// Import armor calculations
import { ARMOR_POINTS_PER_TON, calculateArmorWeight } from '../../../utils/armorCalculations';
import { calculateMaxArmorPoints, calculateMaxArmorTonnage, calculateRemainingTonnage, calculateRemainingTonnageForArmor } from '../../../utils/armorAllocation';
import { getAvailableArmorTypes } from '../../../utils/componentOptionFiltering';

// Import extracted armor components
import { ArmorValidationPanel } from '../armor/ArmorValidationPanel';
import { ArmorConfigurationControls } from '../armor/ArmorConfigurationControls';
import { ArmorLocationEditor } from '../armor/ArmorLocationEditor';

/**
 * Props for ArmorTabV2 component
 */
export interface ArmorTabProps {
  /** Whether the component is in read-only mode */
  readOnly?: boolean;
}

/**
 * ArmorTabV2 Component
 * 
 * Manages unit armor configuration including:
 * - Armor type selection with tech base integration
 * - Armor tonnage investment and management
 * - Individual location armor allocation
 * - Interactive armor diagram
 * - Auto-allocation algorithms
 * - Armor efficiency optimization
 */
export const ArmorTab: React.FC<ArmorTabProps> = ({ readOnly = false }) => {
  const { unit, updateConfiguration } = useUnit();
  const config = unit.getConfiguration();

  // Enhanced configuration with tech progression (with defaults for missing fields)
  const enhancedConfig = {
    ...config,
    introductionYear: config.introductionYear || 3068,
    rulesLevel: config.rulesLevel || 'Standard',
    techProgression: config.techProgression || {
      chassis: config.techBase.includes('Clan') ? 'Clan' : 'Inner Sphere',
      gyro: config.techBase.includes('Clan') ? 'Clan' : 'Inner Sphere',
      engine: config.techBase.includes('Clan') ? 'Clan' : 'Inner Sphere',
      heatsink: config.techBase.includes('Clan') ? 'Clan' : 'Inner Sphere',
      targeting: config.techBase.includes('Clan') ? 'Clan' : 'Inner Sphere',
      myomer: config.techBase.includes('Clan') ? 'Clan' : 'Inner Sphere',
      movement: config.techBase.includes('Clan') ? 'Clan' : 'Inner Sphere',
      armor: config.techBase.includes('Clan') ? 'Clan' : 'Inner Sphere'
    }
  };

  // Selection state for side panel editing
  const [selectedSection, setSelectedSection] = React.useState<string | null>(null);

  // Use the armor subsystem tech base for filtering
  const armorTechBase = enhancedConfig.techProgression?.armor || enhancedConfig.techBase || 'Inner Sphere';
  const armorTypeOptions = getAvailableArmorTypes(enhancedConfig, armorTechBase).map(option => option.type);

  // ===== USE DATA MODEL ONLY - NO MANUAL CALCULATIONS =====
  // All calculations come from the data model to ensure consistency

  const maxArmorTonnage = unit.getMaxArmorTonnage();
  const maxArmorPoints = unit.getMaxArmorPoints();
  const currentArmorTonnage = config.armorTonnage;
  const armorAllocation = config.armorAllocation;

  // Use ONLY data model computed properties
  const availableArmorPoints = unit.getAvailableArmorPoints();    // From tonnage
  const allocatedArmorPoints = unit.getAllocatedArmorPoints();    // From allocation
  const unallocatedArmorPoints = unit.getUnallocatedArmorPoints(); // Available - allocated
  const remainingTonnage = unit.getRemainingTonnage();

  // Cap available points to theoretical maximum using data model method
  const cappedAvailablePoints = Math.min(availableArmorPoints, maxArmorPoints);

  // FIXED: Cap displayUnallocatedPoints to only show points that can actually be allocated
  // When unit reaches physical armor limit, show 0 available instead of wasted tonnage points
  // This makes the UI intuitive: "Available" only shows points that can be used
  // The efficiency warning separately handles wasted tonnage investment
  const actuallyAvailablePoints = Math.max(0, maxArmorPoints - allocatedArmorPoints);
  const displayUnallocatedPoints = Math.min(unallocatedArmorPoints, actuallyAvailablePoints);

  // Get max armor for specific location using data model
  const getLocationMaxArmor = (location: string): number => {
    return unit.getMaxArmorPointsForLocation(location);
  };

  // Configuration update wrapper with armor tonnage validation
  const updateConfigurationWithValidation = (newConfig: any) => {
    // Validate armor tonnage if it's being updated
    if ('armorTonnage' in newConfig) {
      newConfig.armorTonnage = Math.min(Math.max(newConfig.armorTonnage, 0), maxArmorTonnage);

      // Recalculate armor points based on validated tonnage
      const armorEfficiency = unit.getArmorEfficiency();
      newConfig.totalArmorPoints = Math.floor(newConfig.armorTonnage * armorEfficiency);
      newConfig.maxArmorPoints = newConfig.totalArmorPoints;
    }

    updateConfiguration(newConfig);
  };

  // Handle armor type change with memory integration and tech progression sync
  const handleArmorTypeChange = (newArmorType: string) => {
    if (readOnly) return;
    
    // Determine tech base from the new value
    const newTechBase = newArmorType.includes('Clan') ? 'Clan' : 'Inner Sphere';
    
    // Get current tech progression (or use defaults)
    const currentProgression = config.techProgression || {
      chassis: 'Inner Sphere',
      gyro: 'Inner Sphere',
      engine: 'Inner Sphere',
      heatsink: 'Inner Sphere',
      targeting: 'Inner Sphere',
      myomer: 'Inner Sphere',
      movement: 'Inner Sphere',
      armor: 'Inner Sphere'
    };
    
    // Update tech progression for armor subsystem
    const newProgression = {
      ...currentProgression,
      armor: newTechBase
    };
    
    // Create the component configuration update
    const componentUpdate = { armorType: newArmorType };
    
    // If we're changing to Mixed tech, update the master tech base
    const isMixed = Object.values(newProgression).some(tech => tech === 'Inner Sphere') && 
                   Object.values(newProgression).some(tech => tech === 'Clan');
    
    // ARMOR TONNAGE PRESERVATION FIX
    // Preserve current armor tonnage investment, capping to new maximum if needed
    const currentTonnage = config.armorTonnage;
    
    // Calculate new maximum tonnage for the new armor type
    // Create a temporary unit configuration to get the new max
    const tempConfig = { ...config, armorType: newArmorType };
    const newMaxTonnage = Math.floor(tempConfig.tonnage / 2); // Standard max is 50% of mech tonnage
    
    // Preserve tonnage but cap to new maximum if necessary
    const preservedTonnage = Math.min(currentTonnage, newMaxTonnage);
    
    const finalUpdates = {
      ...componentUpdate,
      techProgression: newProgression,
      armorTonnage: preservedTonnage, // Preserve/cap armor tonnage
      ...(isMixed && config.techBase !== 'Mixed' ? { techBase: 'Mixed' } : {})
    };
    
    updateConfigurationWithValidation(finalUpdates);
  };

  // Simple, direct armor tonnage update - single source of truth
  const handleArmorTonnageChange = (value: number) => {
    if (readOnly) return;

    // Always cap to maximum
    const cappedValue = Math.min(Math.max(value, 0), maxArmorTonnage);

    // Calculate armor points based on capped tonnage
    const armorEfficiency = unit.getArmorEfficiency();
    const newTotalArmorPoints = Math.floor(cappedValue * armorEfficiency);

    updateConfiguration({
      ...config,
      armorTonnage: cappedValue
    });
  };

  // Auto-reduce armor tonnage when maximum changes (unit tonnage or armor type changes)
  React.useEffect(() => {
    if (currentArmorTonnage > maxArmorTonnage) {
      handleArmorTonnageChange(maxArmorTonnage);
    }
  }, [maxArmorTonnage, config.tonnage, config.armorType]);

  // Ensure armor points are calculated from tonnage on load
  React.useEffect(() => {
    if (currentArmorTonnage > 0 && availableArmorPoints === 0) {
      // The data model will automatically calculate points from tonnage
      // No manual update needed - computed properties handle this
    }
  }, [currentArmorTonnage, availableArmorPoints, unit, config]);

  // Handle maximize armor tonnage (set tonnage to maximum allowed)
  const handleMaximizeArmor = () => {
    if (readOnly) return;

    updateConfigurationWithValidation({
      ...config,
      armorTonnage: maxArmorTonnage
      // Keep existing armorAllocation unchanged
    });
  };

  // Handle individual armor location changes
  const handleArmorLocationChange = (location: string, front: number, rear: number = 0) => {
    if (readOnly) return

    const newAllocation = {
      ...armorAllocation,
      [location as keyof typeof armorAllocation]: { front, rear }
    };

    updateConfiguration({
      ...config,
      armorAllocation: newAllocation
    });
  };

  // Enhanced auto-allocate armor using data model only
  const handleAutoAllocate = () => {
    if (readOnly) return;
    unit.autoAllocateArmor();
  };

  // Handle use remaining tonnage using data model
  const handleUseRemainingTonnage = () => {
    if (readOnly) return;

    // Use data model method for remaining tonnage calculation
    const newArmorTonnage = unit.getRemainingTonnageForArmor();

    updateConfigurationWithValidation({
      ...config,
      armorTonnage: newArmorTonnage
      // Keep existing armorAllocation unchanged
    });
  };

  // Calculate remaining tonnage for display using data model
  const getRemainingTonnage = (): number => {
    return unit.getRemainingTonnage();
  };

  // Handle armor optimization from notification
  const handleOptimizeArmor = (newTonnage: number) => {
    if (readOnly) return;
    updateConfigurationWithValidation({
      ...config,
      armorTonnage: newTonnage
    });
  };

  // Helper to safely get armor type string
  const getArmorTypeString = (armorType: unknown): string => {
    if (typeof armorType === 'string') return armorType;
    if (armorType && typeof armorType === 'object' && 'type' in armorType) {
      return (armorType as { type: string }).type;
    }
    return 'Standard';
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Armor Configuration Controls */}
      <ArmorConfigurationControls
        armorType={getArmorTypeString(config.armorType)}
        armorTypeOptions={armorTypeOptions}
        currentArmorTonnage={currentArmorTonnage}
        maxArmorTonnage={maxArmorTonnage}
        remainingTonnage={getRemainingTonnage()}
        readOnly={readOnly}
        onArmorTypeChange={handleArmorTypeChange}
        onArmorTonnageChange={handleArmorTonnageChange}
        onUseRemainingTonnage={handleUseRemainingTonnage}
        onMaximizeArmor={handleMaximizeArmor}
      />

      {/* Armor Efficiency Notification */}
      <ArmorEfficiencyNotification
        unit={unit}
        onOptimizeArmor={handleOptimizeArmor}
        readOnly={readOnly}
      />

      {/* Two-Column Layout: Diagram + Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Armor Diagram (2/3 width) */}
        <div className="lg:col-span-2 bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className={`font-medium mb-3 ${displayUnallocatedPoints < 0 ? 'text-orange-300' : 'text-slate-100'
            }`}>
            Armor Diagram ({displayUnallocatedPoints < 0 ? 'Over-allocated' : 'Available'}: {displayUnallocatedPoints} pts / {cappedAvailablePoints} total)
          </h3>
          {/* Auto Allocate Button - full width below title */}
          <button
            onClick={handleAutoAllocate}
            disabled={readOnly}
            className={`w-full px-4 py-2 disabled:bg-gray-600 text-white rounded text-sm font-medium transition-colors mb-4 flex items-center justify-center gap-2 ${displayUnallocatedPoints < 0
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-purple-600 hover:bg-purple-700'
              }`}
          >
            <span>⚡</span>
            <span>Auto-Allocate Armor Points</span>
            <span className={`text-xs ${displayUnallocatedPoints < 0 ? 'text-orange-200 font-medium' : 'opacity-75'
              }`}>
              {displayUnallocatedPoints < 0
                ? `(${displayUnallocatedPoints} pts over-allocated)`
                : `(${displayUnallocatedPoints} pts available)`
              }
            </span>
          </button>

          {/* Simple clickable diagram without overlays */}
          <div className="bg-slate-900 rounded-lg p-6">
            <svg
              width="400"
              height="500"
              viewBox="0 0 400 500"
              className="w-full h-full max-w-md mx-auto"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Head */}
              <g>
                <rect
                  x={175}
                  y={20}
                  width={50}
                  height={40}
                  fill={selectedSection === 'HD' ? "#3b82f6" : "#16a34a"}
                  stroke="#22c55e"
                  strokeWidth="2"
                  rx="4"
                  className="cursor-pointer hover:fill-blue-500 transition-all"
                  onClick={() => setSelectedSection('HD')}
                />
                <text x={200} y={35} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">HD</text>
                <text x={200} y={50} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
                  {armorAllocation.HD.front}
                </text>
              </g>

              {/* Center Torso */}
              <g>
                <rect
                  x={150}
                  y={80}
                  width={100}
                  height={120}
                  fill={selectedSection === 'CT' ? "#3b82f6" : "#d97706"}
                  stroke="#f59e0b"
                  strokeWidth="2"
                  rx="4"
                  className="cursor-pointer hover:fill-blue-600 transition-all"
                  onClick={() => setSelectedSection('CT')}
                />
                <text x={200} y={125} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">CT</text>
                <text x={200} y={145} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
                  {armorAllocation.CT.front}
                </text>
                <rect x={150} y={205} width={100} height={20} fill="#92400e" stroke="#d97706" strokeWidth="1" rx="2" className="cursor-pointer" onClick={() => setSelectedSection('CT')} />
                <text x={200} y={215} textAnchor="middle" fill="white" fontSize="10">
                  {armorAllocation.CT.rear}
                </text>
              </g>

              {/* Left Torso */}
              <g>
                <rect
                  x={60}
                  y={90}
                  width={80}
                  height={100}
                  fill={selectedSection === 'LT' ? "#3b82f6" : "#d97706"}
                  stroke="#f59e0b"
                  strokeWidth="2"
                  rx="4"
                  className="cursor-pointer hover:fill-blue-600 transition-all"
                  onClick={() => setSelectedSection('LT')}
                />
                <text x={100} y={125} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">LT</text>
                <text x={100} y={145} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
                  {armorAllocation.LT.front}
                </text>
                <rect x={60} y={195} width={80} height={20} fill="#92400e" stroke="#d97706" strokeWidth="1" rx="2" className="cursor-pointer" onClick={() => setSelectedSection('LT')} />
                <text x={100} y={208} textAnchor="middle" fill="white" fontSize="10">
                  {armorAllocation.LT.rear}
                </text>
              </g>

              {/* Right Torso */}
              <g>
                <rect
                  x={260}
                  y={90}
                  width={80}
                  height={100}
                  fill={selectedSection === 'RT' ? "#3b82f6" : "#d97706"}
                  stroke="#f59e0b"
                  strokeWidth="2"
                  rx="4"
                  className="cursor-pointer hover:fill-blue-600 transition-all"
                  onClick={() => setSelectedSection('RT')}
                />
                <text x={300} y={125} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">RT</text>
                <text x={300} y={145} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
                  {armorAllocation.RT.front}
                </text>
                <rect x={260} y={195} width={80} height={20} fill="#92400e" stroke="#d97706" strokeWidth="1" rx="2" className="cursor-pointer" onClick={() => setSelectedSection('RT')} />
                <text x={300} y={208} textAnchor="middle" fill="white" fontSize="10">
                  {armorAllocation.RT.rear}
                </text>
              </g>

              {/* Left Arm */}
              <g>
                <rect
                  x={10}
                  y={100}
                  width={40}
                  height={140}
                  fill={selectedSection === 'LA' ? "#3b82f6" : "#d97706"}
                  stroke="#f59e0b"
                  strokeWidth="2"
                  rx="4"
                  className="cursor-pointer hover:fill-blue-600 transition-all"
                  onClick={() => setSelectedSection('LA')}
                />
                <text x={30} y={160} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">LA</text>
                <text x={30} y={180} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
                  {armorAllocation.LA.front}
                </text>
              </g>

              {/* Right Arm */}
              <g>
                <rect
                  x={350}
                  y={100}
                  width={40}
                  height={140}
                  fill={selectedSection === 'RA' ? "#3b82f6" : "#d97706"}
                  stroke="#f59e0b"
                  strokeWidth="2"
                  rx="4"
                  className="cursor-pointer hover:fill-blue-600 transition-all"
                  onClick={() => setSelectedSection('RA')}
                />
                <text x={370} y={160} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">RA</text>
                <text x={370} y={180} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
                  {armorAllocation.RA.front}
                </text>
              </g>

              {/* Left Leg */}
              <g>
                <rect
                  x={110}
                  y={230}
                  width={60}
                  height={180}
                  fill={selectedSection === 'LL' ? "#3b82f6" : "#d97706"}
                  stroke="#f59e0b"
                  strokeWidth="2"
                  rx="4"
                  className="cursor-pointer hover:fill-blue-600 transition-all"
                  onClick={() => setSelectedSection('LL')}
                />
                <text x={140} y={310} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">LL</text>
                <text x={140} y={330} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
                  {armorAllocation.LL.front}
                </text>
              </g>

              {/* Right Leg */}
              <g>
                <rect
                  x={230}
                  y={230}
                  width={60}
                  height={180}
                  fill={selectedSection === 'RL' ? "#3b82f6" : "#d97706"}
                  stroke="#f59e0b"
                  strokeWidth="2"
                  rx="4"
                  className="cursor-pointer hover:fill-blue-600 transition-all"
                  onClick={() => setSelectedSection('RL')}
                />
                <text x={260} y={310} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">RL</text>
                <text x={260} y={330} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
                  {armorAllocation.RL.front}
                </text>
              </g>
            </svg>
          </div>
        </div>

        {/* Right: Side Panel Editor (1/3 width) */}
        <div className="space-y-6">
          {/* Armor Location Editor */}
          <ArmorLocationEditor
            selectedSection={selectedSection}
            armorAllocation={armorAllocation}
            getLocationMaxArmor={getLocationMaxArmor}
            readOnly={readOnly}
            onArmorLocationChange={handleArmorLocationChange}
            onSectionSelect={setSelectedSection}
          />

          {/* Armor Validation Panel */}
          <ArmorValidationPanel
            armorAllocation={armorAllocation}
            getLocationMaxArmor={getLocationMaxArmor}
            selectedSection={selectedSection}
            onSectionSelect={setSelectedSection}
            readOnly={readOnly}
          />
        </div>
      </div>
    </div>
  );
};
