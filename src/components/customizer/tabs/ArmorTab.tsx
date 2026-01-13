/**
 * Armor Tab Component
 * 
 * Configuration of armor type, tonnage, and per-location allocation.
 * Uses tonnage-first workflow where user sets armor tonnage, then
 * distributes available points to locations.
 * 
 * @spec openspec/specs/armor-system/spec.md
 * @spec openspec/specs/armor-diagram/spec.md
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useUnitStore } from '@/stores/useUnitStore';
import { useAppSettingsStore } from '@/stores/useAppSettingsStore';
import { useTechBaseSync } from '@/hooks/useTechBaseSync';
import { ArmorTypeEnum, getArmorDefinition } from '@/types/construction/ArmorType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { MechConfiguration, getLocationsForConfig, hasRearArmor } from '@/types/construction/MechConfigurationSystem';
import { LocationArmorData } from '../armor/ArmorDiagram';
import { LocationArmorEditor } from '../armor/LocationArmorEditor';
import { SchematicDiagram } from '@/components/armor/schematic';
import {
  CleanTechDiagram,
  NeonOperatorDiagram,
  TacticalHUDDiagram,
  PremiumMaterialDiagram,
  MegaMekDiagram,
  MegaMekClassicDiagram,
} from '../armor/variants';
import { QuadArmorDiagram } from '../armor/variants/QuadArmorDiagram';
import { TripodArmorDiagram } from '../armor/variants/TripodArmorDiagram';
import { LAMArmorDiagram } from '../armor/variants/LAMArmorDiagram';
import { QuadVeeArmorDiagram } from '../armor/variants/QuadVeeArmorDiagram';
import {
  calculateArmorPoints,
  getMaxArmorForLocation,
  getMaxTotalArmor,
  getArmorCriticalSlots,
} from '@/utils/construction/armorCalculations';
import { ceilToHalfTon } from '@/utils/physical/weightUtils';
import { getTotalAllocatedArmor } from '@/stores/unitState';
import { customizerStyles as cs } from '../styles';

// =============================================================================
// Types
// =============================================================================

interface ArmorTabProps {
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Armor configuration tab
 * 
 * Uses useUnitStore() to access the current unit's state.
 */
export function ArmorTab({
  readOnly = false,
  className = '',
}: ArmorTabProps): React.ReactElement {
  // Get app settings - use effective getters for draft preview support
  const getEffectiveArmorDiagramMode = useAppSettingsStore((s) => s.getEffectiveArmorDiagramMode);
  const getEffectiveArmorDiagramVariant = useAppSettingsStore((s) => s.getEffectiveArmorDiagramVariant);
  const armorDiagramMode = getEffectiveArmorDiagramMode();
  const armorDiagramVariant = getEffectiveArmorDiagramVariant();

  // Get unit state from context
  const tonnage = useUnitStore((s) => s.tonnage);
  const configuration = useUnitStore((s) => s.configuration);
  const componentTechBases = useUnitStore((s) => s.componentTechBases);
  const armorType = useUnitStore((s) => s.armorType);
  const armorTonnage = useUnitStore((s) => s.armorTonnage);
  const armorAllocation = useUnitStore((s) => s.armorAllocation);
  
  // Get actions from context
  const setArmorType = useUnitStore((s) => s.setArmorType);
  const setArmorTonnage = useUnitStore((s) => s.setArmorTonnage);
  const setLocationArmor = useUnitStore((s) => s.setLocationArmor);
  const autoAllocateArmor = useUnitStore((s) => s.autoAllocateArmor);
  const maximizeArmor = useUnitStore((s) => s.maximizeArmor);
  
  // Get filtered armor options based on tech base
  const { filteredOptions } = useTechBaseSync(componentTechBases);
  
  // Selected location for editing
  const [selectedLocation, setSelectedLocation] = useState<MechLocation | null>(null);
  
  // Calculate derived values
  const armorDef = useMemo(() => getArmorDefinition(armorType), [armorType]);
  const pointsPerTon = armorDef?.pointsPerTon ?? 16;
  const availablePoints = useMemo(
    () => calculateArmorPoints(armorTonnage, armorType),
    [armorTonnage, armorType]
  );
  const allocatedPoints = useMemo(
    () => getTotalAllocatedArmor(armorAllocation, configuration),
    [armorAllocation, configuration]
  );
  const maxTotalArmor = useMemo(() => getMaxTotalArmor(tonnage, configuration), [tonnage, configuration]);
  const armorSlots = useMemo(() => getArmorCriticalSlots(armorType), [armorType]);
  
  // Calculate max useful tonnage (ceiling to half-ton of max points / points per ton)
  const maxUsefulTonnage = useMemo(
    () => ceilToHalfTon(maxTotalArmor / pointsPerTon),
    [maxTotalArmor, pointsPerTon]
  );
  
  // Calculate unallocated and wasted points
  const unallocatedPoints = availablePoints - allocatedPoints;
  const wastedPoints = Math.max(0, availablePoints - maxTotalArmor);
  
  // Points delta for Auto-Allocate button:
  // - Negative when allocated > available (need to remove points)
  // - Positive when can allocate more (capped at max armor remaining)
  const pointsDelta = unallocatedPoints < 0
    ? unallocatedPoints // Show negative as-is (over-allocated)
    : Math.min(unallocatedPoints, maxTotalArmor - allocatedPoints); // Cap at max allocatable
  
  // Convert allocation to diagram format
  // For torso locations, maximum represents the total max for front+rear combined
  // rearMaximum represents how much of the total max can still go to rear
  // Uses getLocationsForConfig to get configuration-specific locations
  const armorData: LocationArmorData[] = useMemo(() => {
    const locations = getLocationsForConfig(configuration);

    // Helper to get rear armor value for a torso location
    const getRearValue = (location: MechLocation): number | undefined => {
      if (!hasRearArmor(location)) return undefined;
      switch (location) {
        case MechLocation.CENTER_TORSO:
          return armorAllocation.centerTorsoRear;
        case MechLocation.LEFT_TORSO:
          return armorAllocation.leftTorsoRear;
        case MechLocation.RIGHT_TORSO:
          return armorAllocation.rightTorsoRear;
        default:
          return undefined;
      }
    };

    return locations.map((location) => {
      const maxArmor = getMaxArmorForLocation(tonnage, location);
      const hasRear = hasRearArmor(location);
      const rear = getRearValue(location);

      return {
        location,
        current: armorAllocation[location] ?? 0,
        maximum: maxArmor,
        ...(hasRear && rear !== undefined
          ? {
              rear,
              rearMaximum: maxArmor - (armorAllocation[location] ?? 0),
            }
          : {}),
      };
    });
  }, [tonnage, configuration, armorAllocation]);
  
  // Get selected location data
  const selectedLocationData = useMemo(() => {
    if (!selectedLocation) return null;
    return armorData.find(d => d.location === selectedLocation) ?? null;
  }, [selectedLocation, armorData]);
  
  // Handlers
  const handleArmorTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setArmorType(e.target.value as ArmorTypeEnum);
  }, [setArmorType]);
  
  const handleArmorTonnageChange = useCallback((newTonnage: number) => {
    // Clamp between 0 and max useful tonnage
    setArmorTonnage(Math.max(0, Math.min(newTonnage, maxUsefulTonnage)));
  }, [setArmorTonnage, maxUsefulTonnage]);
  
  const handleLocationClick = useCallback((location: MechLocation) => {
    setSelectedLocation(prev => prev === location ? null : location);
  }, []);
  
  const handleLocationArmorChange = useCallback((front: number, rear?: number) => {
    if (!selectedLocation) return;
    setLocationArmor(selectedLocation, front, rear);
  }, [selectedLocation, setLocationArmor]);
  
  const handleAutoAllocate = useCallback(() => {
    autoAllocateArmor();
  }, [autoAllocateArmor]);
  
  const handleMaximize = useCallback(() => {
    maximizeArmor();
  }, [maximizeArmor]);
  
  return (
    <div className={`${cs.layout.tabContent} ${className}`}>
      {/* Compact Summary Bar - responsive */}
      <div className={cs.panel.summary}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-6 text-sm overflow-x-auto pb-1 sm:pb-0">
            <div className={`${cs.layout.statRow} flex-shrink-0`}>
              <span className={cs.text.label}>Type:</span>
              <span className={cs.text.value}>{armorDef?.name ?? 'Standard'}</span>
            </div>
            <div className={`${cs.layout.statRow} flex-shrink-0`}>
              <span className={cs.text.label}>Pts/Ton:</span>
              <span className={cs.text.value}>{pointsPerTon}</span>
            </div>
            <div className={`${cs.layout.statRow} flex-shrink-0`}>
              <span className={cs.text.label}>Slots:</span>
              <span className={cs.text.value}>{armorSlots}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l border-border-theme-subtle sm:pl-4">
            <div className={cs.layout.statRow}>
              <span className={`text-sm ${cs.text.label}`}>Tonnage:</span>
              <span className="text-lg font-bold text-accent">{armorTonnage}t</span>
            </div>
            <div className={cs.layout.statRow}>
              <span className={`text-sm ${cs.text.label}`}>Points:</span>
              <span className={`text-lg font-bold ${allocatedPoints > maxTotalArmor ? 'text-red-400' : 'text-green-400'}`}>
                {allocatedPoints} / {maxTotalArmor}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className={cs.layout.twoColumn}>
        
        {/* LEFT: Location Editor (when selected) + Armor Configuration */}
        <div className="space-y-4">
          {/* Location Editor - shown at top when a location is selected */}
          {selectedLocation && selectedLocationData && (
            <LocationArmorEditor
              location={selectedLocation}
              data={selectedLocationData}
              tonnage={tonnage}
              readOnly={readOnly}
              onChange={handleLocationArmorChange}
              onClose={() => setSelectedLocation(null)}
            />
          )}
          
          {/* Armor Configuration */}
          <div className={cs.panel.main}>
            <h3 className={cs.text.sectionTitle}>Armor Configuration</h3>
            
            <div className="space-y-4">
              {/* Armor Type */}
              <div className={cs.layout.field}>
                <div className={cs.layout.rowBetween}>
                  <label className={cs.text.label}>Armor Type</label>
                  <span className={cs.text.secondary}>{armorSlots} slots</span>
                </div>
                <select 
                  className={cs.select.compact}
                  disabled={readOnly}
                  value={armorType}
                  onChange={handleArmorTypeChange}
                >
                  {filteredOptions.armors.map((armor) => (
                    <option key={armor.type} value={armor.type}>
                      {armor.name} ({armor.pointsPerTon} pts/ton)
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Armor Tonnage */}
              <div className={cs.layout.field}>
                <label className={cs.text.label}>Armor Tonnage</label>
                <div className={cs.layout.rowGap}>
                  <button
                    onClick={() => handleArmorTonnageChange(armorTonnage - 0.5)}
                    disabled={readOnly || armorTonnage <= 0}
                    className={cs.button.stepper}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={armorTonnage}
                    onChange={(e) => handleArmorTonnageChange(parseFloat(e.target.value) || 0)}
                    disabled={readOnly}
                    min={0}
                    step={0.5}
                    className={`w-20 ${cs.input.compact} text-center ${cs.input.noSpinners}`}
                  />
                  <button
                    onClick={() => handleArmorTonnageChange(armorTonnage + 0.5)}
                    disabled={readOnly || armorTonnage >= maxUsefulTonnage}
                    className={cs.button.stepper}
                  >
                    +
                  </button>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleMaximize}
                  disabled={readOnly || armorTonnage >= maxUsefulTonnage}
                  className={cs.button.actionFull}
                >
                  Maximize Tonnage
                </button>
                <button
                  onClick={handleAutoAllocate}
                  disabled={readOnly}
                  className={`${cs.button.actionFull} ${
                    unallocatedPoints < 0 
                      ? 'bg-red-600 hover:bg-red-500' 
                      : unallocatedPoints > 0 
                        ? 'bg-amber-600 hover:bg-amber-500' 
                        : 'bg-green-600 hover:bg-green-500'
                  }`}
                >
                  Auto Allocate ({pointsDelta > 0 ? '+' : ''}{pointsDelta} pts)
                </button>
              </div>
              
              {/* Summary Stats */}
              <div className={`${cs.layout.divider} space-y-2`}>
                <div className={`${cs.layout.rowBetween} text-sm`}>
                  <span className={cs.text.label}>Unallocated Armor Points</span>
                  <span className={`font-medium ${unallocatedPoints < 0 ? 'text-red-400' : unallocatedPoints > 0 ? 'text-accent' : 'text-green-400'}`}>
                    {unallocatedPoints}
                  </span>
                </div>
                <div className={`${cs.layout.rowBetween} text-sm`}>
                  <span className={cs.text.label}>Allocated Armor Points</span>
                  <span className={cs.text.value}>{allocatedPoints}</span>
                </div>
                <div className={`${cs.layout.rowBetween} text-sm`}>
                  <span className={cs.text.label}>Total Armor Points</span>
                  <span className={cs.text.value}>{availablePoints}</span>
                </div>
                <div className={`${cs.layout.rowBetween} text-sm`}>
                  <span className={cs.text.label}>Maximum Possible Armor Points</span>
                  <span className="font-medium text-slate-300">{maxTotalArmor}</span>
                </div>
                {wastedPoints > 0 && (
                  <div className={`${cs.layout.rowBetween} text-sm`}>
                    <span className={cs.text.label}>Wasted Armor Points</span>
                    <span className={cs.text.valueWarning}>{wastedPoints}</span>
                  </div>
                )}
                <div className={`${cs.layout.rowBetween} text-sm pt-2 border-t border-border-theme`}>
                  <span className={cs.text.label}>Points Per Ton</span>
                  <span className="font-medium text-slate-300">{pointsPerTon.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Armor Diagram - Configuration-aware */}
        <div className="space-y-4" data-testid="armor-diagram">
          {/* QUAD configuration */}
          {configuration === MechConfiguration.QUAD && armorDiagramVariant === 'megamek-classic' && (
            <MegaMekClassicDiagram
              armorData={armorData}
              selectedLocation={selectedLocation}
              unallocatedPoints={pointsDelta}
              onLocationClick={handleLocationClick}
              configuration={configuration}
            />
          )}
          {configuration === MechConfiguration.QUAD && armorDiagramVariant !== 'megamek-classic' && (
            <QuadArmorDiagram
              armorData={armorData}
              selectedLocation={selectedLocation}
              unallocatedPoints={pointsDelta}
              onLocationClick={handleLocationClick}
              variant={armorDiagramVariant}
            />
          )}

          {/* TRIPOD configuration */}
          {configuration === MechConfiguration.TRIPOD && armorDiagramVariant === 'megamek-classic' && (
            <MegaMekClassicDiagram
              armorData={armorData}
              selectedLocation={selectedLocation}
              unallocatedPoints={pointsDelta}
              onLocationClick={handleLocationClick}
              configuration={configuration}
            />
          )}
          {configuration === MechConfiguration.TRIPOD && armorDiagramVariant !== 'megamek-classic' && (
            <TripodArmorDiagram
              armorData={armorData}
              selectedLocation={selectedLocation}
              unallocatedPoints={pointsDelta}
              onLocationClick={handleLocationClick}
              variant={armorDiagramVariant}
            />
          )}

          {/* LAM configuration */}
          {configuration === MechConfiguration.LAM && armorDiagramVariant === 'megamek-classic' && (
            <MegaMekClassicDiagram
              armorData={armorData}
              selectedLocation={selectedLocation}
              unallocatedPoints={pointsDelta}
              onLocationClick={handleLocationClick}
              configuration={configuration}
            />
          )}
          {configuration === MechConfiguration.LAM && armorDiagramVariant !== 'megamek-classic' && (
            <LAMArmorDiagram
              armorData={armorData}
              selectedLocation={selectedLocation}
              unallocatedPoints={pointsDelta}
              onLocationClick={handleLocationClick}
              variant={armorDiagramVariant}
            />
          )}

          {/* QUADVEE configuration */}
          {configuration === MechConfiguration.QUADVEE && armorDiagramVariant === 'megamek-classic' && (
            <MegaMekClassicDiagram
              armorData={armorData}
              selectedLocation={selectedLocation}
              unallocatedPoints={pointsDelta}
              onLocationClick={handleLocationClick}
              configuration={configuration}
            />
          )}
          {configuration === MechConfiguration.QUADVEE && armorDiagramVariant !== 'megamek-classic' && (
            <QuadVeeArmorDiagram
              armorData={armorData}
              selectedLocation={selectedLocation}
              unallocatedPoints={pointsDelta}
              onLocationClick={handleLocationClick}
              variant={armorDiagramVariant}
            />
          )}

          {/* Biped configuration uses variant-based diagrams */}
          {configuration === MechConfiguration.BIPED && (
            <>
              {/* Schematic Mode */}
              {armorDiagramMode === 'schematic' && (
                <SchematicDiagram
                  armorData={armorData}
                  selectedLocation={selectedLocation}
                  onLocationClick={handleLocationClick}
                />
              )}

              {/* Silhouette Mode - render based on variant */}
              {armorDiagramMode === 'silhouette' && armorDiagramVariant === 'clean-tech' && (
                <CleanTechDiagram
                  armorData={armorData}
                  selectedLocation={selectedLocation}
                  unallocatedPoints={pointsDelta}
                  onLocationClick={handleLocationClick}
                />
              )}
              {armorDiagramMode === 'silhouette' && armorDiagramVariant === 'neon-operator' && (
                <NeonOperatorDiagram
                  armorData={armorData}
                  selectedLocation={selectedLocation}
                  unallocatedPoints={pointsDelta}
                  onLocationClick={handleLocationClick}
                />
              )}
              {armorDiagramMode === 'silhouette' && armorDiagramVariant === 'tactical-hud' && (
                <TacticalHUDDiagram
                  armorData={armorData}
                  selectedLocation={selectedLocation}
                  unallocatedPoints={pointsDelta}
                  onLocationClick={handleLocationClick}
                />
              )}
              {armorDiagramMode === 'silhouette' && armorDiagramVariant === 'premium-material' && (
                <PremiumMaterialDiagram
                  armorData={armorData}
                  selectedLocation={selectedLocation}
                  unallocatedPoints={pointsDelta}
                  onLocationClick={handleLocationClick}
                />
              )}
              {armorDiagramMode === 'silhouette' && armorDiagramVariant === 'megamek' && (
                <MegaMekDiagram
                  armorData={armorData}
                  selectedLocation={selectedLocation}
                  unallocatedPoints={pointsDelta}
                  onLocationClick={handleLocationClick}
                />
              )}
              {armorDiagramMode === 'silhouette' && armorDiagramVariant === 'megamek-classic' && (
                <MegaMekClassicDiagram
                  armorData={armorData}
                  selectedLocation={selectedLocation}
                  unallocatedPoints={pointsDelta}
                  onLocationClick={handleLocationClick}
                  configuration={configuration}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

