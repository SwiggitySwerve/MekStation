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

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { LocationArmorData } from '@/types/construction/LocationArmorData';

import { ArmorStatusLegend } from '@/components/armor/shared/ArmorStatusLegend';
import { AppIcon } from '@/components/ui/AppIcon';
import { useTechBaseSync } from '@/hooks/useTechBaseSync';
import { getTotalAllocatedArmor } from '@/stores/unitState';
import { useCustomizerSettingsStore } from '@/stores/useCustomizerSettingsStore';
import { useUnitStore } from '@/stores/useUnitStore';
import {
  ArmorTypeEnum,
  getArmorDefinition,
} from '@/types/construction/ArmorType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import {
  calculateArmorPoints,
  getMaxTotalArmor,
  getArmorCriticalSlots,
} from '@/utils/construction/armorCalculations';
import { ceilToHalfTon } from '@/utils/physical/weightUtils';

import { LocationArmorEditor } from '../armor/LocationArmorEditor';
import { customizerStyles as cs } from '../styles';
import { ArmorDiagramPanel } from './ArmorDiagramPanel';
import { ArmorSummaryStrip } from './ArmorSummaryStrip';
import {
  buildArmorData,
  calculatePointsDelta,
  diagramLegendMovesToInspector,
} from './ArmorTab.logic';

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
  const allocationStatusId = useId();
  // Get app settings - subscribe to computed values for reactivity
  const armorDiagramMode = useCustomizerSettingsStore((s) =>
    s.getEffectiveArmorDiagramMode(),
  );
  const armorDiagramVariant = useCustomizerSettingsStore((s) =>
    s.getEffectiveArmorDiagramVariant(),
  );

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
  const [selectedLocation, setSelectedLocation] = useState<MechLocation | null>(
    null,
  );

  const locationEditorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (
      selectedLocation &&
      configuration === MechConfiguration.BIPED &&
      armorDiagramMode === 'silhouette' &&
      window.matchMedia?.('(max-width: 767px)').matches
    ) {
      locationEditorRef.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedLocation, configuration, armorDiagramMode, armorDiagramVariant]);

  // Calculate derived values
  const armorDef = useMemo(() => getArmorDefinition(armorType), [armorType]);
  const pointsPerTon = armorDef?.pointsPerTon ?? 16;
  const availablePoints = useMemo(
    () => calculateArmorPoints(armorTonnage, armorType),
    [armorTonnage, armorType],
  );
  const allocatedPoints = useMemo(
    () => getTotalAllocatedArmor(armorAllocation, configuration),
    [armorAllocation, configuration],
  );
  const maxTotalArmor = useMemo(
    () => getMaxTotalArmor(tonnage, configuration),
    [tonnage, configuration],
  );
  const armorSlots = useMemo(
    () => getArmorCriticalSlots(armorType),
    [armorType],
  );

  // Calculate max useful tonnage (ceiling to half-ton of max points / points per ton)
  const maxUsefulTonnage = useMemo(
    () => ceilToHalfTon(maxTotalArmor / pointsPerTon),
    [maxTotalArmor, pointsPerTon],
  );

  // Calculate unallocated and wasted points
  const unallocatedPoints = availablePoints - allocatedPoints;
  const legendInInspector = diagramLegendMovesToInspector(
    configuration,
    armorDiagramMode,
  );
  const wastedPoints = Math.max(0, availablePoints - maxTotalArmor);

  const pointsDelta = useMemo(
    () =>
      calculatePointsDelta(unallocatedPoints, maxTotalArmor, allocatedPoints),
    [unallocatedPoints, maxTotalArmor, allocatedPoints],
  );

  const armorData: LocationArmorData[] = useMemo(() => {
    return buildArmorData(tonnage, configuration, armorAllocation);
  }, [tonnage, configuration, armorAllocation]);

  // Get selected location data
  const selectedLocationData = useMemo(() => {
    if (!selectedLocation) return null;
    return armorData.find((d) => d.location === selectedLocation) ?? null;
  }, [selectedLocation, armorData]);

  // Handlers
  const handleArmorTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setArmorType(e.target.value as ArmorTypeEnum);
    },
    [setArmorType],
  );

  const handleArmorTonnageChange = useCallback(
    (newTonnage: number) => {
      // Clamp between 0 and max useful tonnage
      setArmorTonnage(Math.max(0, Math.min(newTonnage, maxUsefulTonnage)));
    },
    [setArmorTonnage, maxUsefulTonnage],
  );

  const handleLocationClick = useCallback((location: MechLocation) => {
    setSelectedLocation((prev) => (prev === location ? null : location));
  }, []);

  const handleLocationArmorChange = useCallback(
    (front: number, rear?: number) => {
      if (!selectedLocation) return;
      setLocationArmor(selectedLocation, front, rear);
    },
    [selectedLocation, setLocationArmor],
  );

  const handleAutoAllocate = useCallback(() => {
    autoAllocateArmor();
  }, [autoAllocateArmor]);

  const handleMaximize = useCallback(() => {
    maximizeArmor();
  }, [maximizeArmor]);

  return (
    <div className={`${cs.layout.tabContent} ${className}`}>
      <ArmorSummaryStrip
        armorTypeName={armorDef?.name ?? 'Standard'}
        pointsPerTon={pointsPerTon}
        armorSlots={armorSlots}
        armorTonnage={armorTonnage}
        allocatedPoints={allocatedPoints}
        maxTotalArmor={maxTotalArmor}
        availablePoints={availablePoints}
        maxUsefulTonnage={maxUsefulTonnage}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(19rem,0.8fr)]">
        {/* Both columns stretch so the diagram and inspector cards end together. */}
        <section
          className="order-1 flex min-w-0 flex-col"
          aria-label="Armor diagram"
        >
          <ArmorDiagramPanel
            configuration={configuration}
            armorDiagramMode={armorDiagramMode}
            armorDiagramVariant={armorDiagramVariant}
            armorData={armorData}
            selectedLocation={selectedLocation}
            unallocatedPoints={unallocatedPoints}
            onLocationClick={handleLocationClick}
          />
        </section>

        {/* Compact inspector follows the diagram on smaller viewports. */}
        <aside className="order-2 flex min-w-0 flex-col gap-4">
          {/* Armor Configuration */}
          <div className={`${cs.panel.main} flex flex-col xl:flex-1`}>
            <h3 className="text-text-theme-primary mb-5 text-lg font-semibold">
              Armor inspector
            </h3>

            {/* The selected location's editor sits at the top of the inspector.
                On wide layouts it takes the place of the type/tonnage controls
                (hidden until the editor closes) so nothing is pushed below the
                fold; below xl everything stacks and stays reachable. */}
            {selectedLocation && selectedLocationData && (
              <div ref={locationEditorRef} className="mb-5">
                <LocationArmorEditor
                  embedded
                  location={selectedLocation}
                  data={selectedLocationData}
                  tonnage={tonnage}
                  readOnly={readOnly}
                  onChange={handleLocationArmorChange}
                  onClose={() => setSelectedLocation(null)}
                />
              </div>
            )}

            <div className="flex flex-1 flex-col gap-2">
              <div
                className={
                  selectedLocation
                    ? 'flex flex-col gap-6 xl:hidden'
                    : 'flex flex-col gap-6'
                }
                data-testid="armor-inspector-controls"
              >
                {/* Armor Type */}
                <div className={cs.layout.field}>
                  <div className={cs.layout.rowBetween}>
                    <label className={cs.text.label}>Armor Type</label>
                    <span className={cs.text.secondary}>
                      {armorSlots} slots
                    </span>
                  </div>
                  <select
                    className={`${cs.select.compact} min-h-11`}
                    aria-label="Armor type"
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
                      onClick={() =>
                        handleArmorTonnageChange(armorTonnage - 0.5)
                      }
                      disabled={readOnly || armorTonnage <= 0}
                      className={cs.button.stepper}
                    >
                      {' '}
                      <AppIcon name="remove" size="inline" aria-hidden="true" />
                    </button>
                    <input
                      type="number"
                      aria-label="Armor tonnage"
                      value={armorTonnage}
                      onChange={(e) =>
                        handleArmorTonnageChange(
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      disabled={readOnly}
                      min={0}
                      step={0.5}
                      className={`min-h-11 w-20 ${cs.input.compact} text-center tabular-nums ${cs.input.noSpinners}`}
                    />
                    <button
                      onClick={() =>
                        handleArmorTonnageChange(armorTonnage + 0.5)
                      }
                      disabled={readOnly || armorTonnage >= maxUsefulTonnage}
                      className={cs.button.stepper}
                    >
                      {' '}
                      <AppIcon name="add" size="inline" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <button
                    onClick={handleMaximize}
                    disabled={readOnly || armorTonnage >= maxUsefulTonnage}
                    className="border-border-theme bg-surface-raised hover:bg-surface-raised-hover text-text-theme-primary min-h-11 rounded border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Maximize Tonnage
                  </button>
                  <button
                    onClick={handleAutoAllocate}
                    disabled={readOnly || pointsDelta === 0}
                    aria-describedby={
                      pointsDelta === 0 ? allocationStatusId : undefined
                    }
                    className={`min-h-11 rounded px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      pointsDelta !== 0
                        ? 'bg-accent hover:bg-accent-hover text-on-accent'
                        : 'border-border-theme bg-surface-raised hover:bg-surface-raised-hover text-text-theme-primary border'
                    }`}
                  >
                    Auto Allocate ({pointsDelta > 0 ? '+' : ''}
                    {pointsDelta} pts)
                  </button>
                  {pointsDelta === 0 && (
                    <p
                      id={allocationStatusId}
                      className="text-text-theme-secondary text-xs sm:col-span-2 xl:col-span-1"
                    >
                      All allocatable points assigned
                    </p>
                  )}
                </div>
              </div>

              <div className="border-border-theme-subtle border-t pt-2">
                <div className={`${cs.layout.rowBetween} text-sm`}>
                  <span className={cs.text.label}>
                    Unallocated Armor Points
                  </span>
                  <span
                    className={`font-medium tabular-nums ${
                      unallocatedPoints < 0
                        ? 'text-red-400'
                        : unallocatedPoints > 0
                          ? 'text-amber-400'
                          : 'text-text-theme-primary'
                    }`}
                  >
                    {unallocatedPoints}
                  </span>
                </div>
                <details className="group mt-3">
                  <summary className="text-text-theme-secondary hover:text-text-theme-primary focus-visible:ring-accent cursor-pointer text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none">
                    Advanced allocation details
                  </summary>
                  <div className="border-border-theme-subtle mt-3 space-y-2 border-l pl-3">
                    <div className={`${cs.layout.rowBetween} text-sm`}>
                      <span className={cs.text.label}>
                        Allocated Armor Points
                      </span>
                      <span className={`${cs.text.value} tabular-nums`}>
                        {allocatedPoints}
                      </span>
                    </div>
                    <div className={`${cs.layout.rowBetween} text-sm`}>
                      <span className={cs.text.label}>Points from Tonnage</span>
                      <span className={`${cs.text.value} tabular-nums`}>
                        {availablePoints}
                      </span>
                    </div>
                    <div className={`${cs.layout.rowBetween} text-sm`}>
                      <span className={cs.text.label}>
                        Maximum Possible Armor Points
                      </span>
                      <span className="text-text-theme-secondary font-medium tabular-nums">
                        {maxTotalArmor}
                      </span>
                    </div>
                    {wastedPoints > 0 && (
                      <div className={`${cs.layout.rowBetween} text-sm`}>
                        <span className={cs.text.label}>
                          Wasted Armor Points
                        </span>
                        <span
                          className={`${cs.text.valueWarning} tabular-nums`}
                        >
                          {wastedPoints}
                        </span>
                      </div>
                    )}
                    <div className={`${cs.layout.rowBetween} text-sm`}>
                      <span className={cs.text.label}>Points Per Ton</span>
                      <span className="text-text-theme-secondary font-medium tabular-nums">
                        {pointsPerTon.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </details>
              </div>

              {/* Wide layouts: the diagram's legend lives here, filling the
                  card's bottom edge so both columns end together. */}
              {legendInInspector && (
                <div
                  className="border-border-theme-subtle hidden flex-col gap-2 border-t pt-3 xl:flex"
                  data-testid="armor-inspector-legend"
                >
                  <ArmorStatusLegend className="mt-0! justify-start!" />
                  <span className="text-text-theme-secondary text-xs">
                    F = front · R = rear armor
                  </span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
