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
import { useTechBaseSync } from '@/hooks/useTechBaseSync';
import { useUnitValidation } from '@/hooks/useUnitValidation';
import { getTotalAllocatedArmor } from '@/stores/unitState';
import { useCustomizerSettingsStore } from '@/stores/useCustomizerSettingsStore';
import { useUnitStore } from '@/stores/useUnitStore';
import {
  ArmorTypeEnum,
  getArmorDefinition,
} from '@/types/construction/ArmorType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import { getArmorLocationIssues } from '@/utils/armor/armorLocationIssues';
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
  armorTabColumns,
  buildArmorData,
  calculatePointsDelta,
  describeMaximizeGain,
  diagramLegendMovesToInspector,
} from './ArmorTab.logic';
import { ArmorTabReadouts } from './ArmorTabReadouts';
import { ArmorTabTonnageStepper } from './ArmorTabTonnageStepper';

/** The tab's one secondary-button look: an outline on the card, no fill. */
const SECONDARY_ACTION =
  'border-border-theme-strong text-text-theme-primary hover:bg-surface-raised min-h-11 rounded border bg-transparent px-3 text-sm transition-colors';

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

  // The diagram marks the locations the issue banner warns about.
  const validationResult = useUnitValidation().result;
  const locationIssues = useMemo(
    () => getArmorLocationIssues(validationResult),
    [validationResult],
  );

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

  const maximizeGain = describeMaximizeGain({
    armorTonnage,
    availablePoints,
    maxTotalArmor,
    maxUsefulTonnage,
    pointsAtMaxUsefulTonnage: calculateArmorPoints(maxUsefulTonnage, armorType),
  });

  // Calculate unallocated and wasted points
  const unallocatedPoints = availablePoints - allocatedPoints;
  const legendInInspector = diagramLegendMovesToInspector(
    configuration,
    armorDiagramMode,
    armorDiagramVariant,
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

  // Why Auto Allocate is unavailable, shown under the button in secondary text
  // so a disabled button never stands without its reason.
  const autoAllocateDisabled = readOnly || pointsDelta === 0;
  let autoAllocateReason: string | null = null;
  if (readOnly) {
    autoAllocateReason = 'Read-only: armor cannot be changed.';
  } else if (pointsDelta === 0) {
    autoAllocateReason =
      unallocatedPoints === 0
        ? 'All points assigned'
        : 'All allocatable points assigned';
  }

  const handleAutoAllocate = useCallback(() => {
    autoAllocateArmor();
  }, [autoAllocateArmor]);

  const handleMaximize = useCallback(() => {
    maximizeArmor();
  }, [maximizeArmor]);

  return (
    <div className={`${cs.layout.tabContent} ${className}`}>
      <ArmorSummaryStrip
        armorTonnage={armorTonnage}
        allocatedPoints={allocatedPoints}
        maxTotalArmor={maxTotalArmor}
        availablePoints={availablePoints}
        maxUsefulTonnage={maxUsefulTonnage}
      />

      <div
        className={`grid grid-cols-1 gap-4 ${armorTabColumns(configuration, armorDiagramMode, armorDiagramVariant)}`}
      >
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
            locationIssues={locationIssues}
            onLocationClick={handleLocationClick}
          />
        </section>

        {/* Compact inspector follows the diagram on smaller viewports. */}
        <aside className="order-2 flex min-w-0 flex-col gap-4">
          {/* Armor Configuration */}
          <div className={`${cs.panel.main} flex flex-col xl:flex-1`}>
            <h3 className="text-text-theme-primary mb-5 text-lg font-semibold">
              Armor Inspector
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
                    aria-label="Armor Type"
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
                  <ArmorTabTonnageStepper
                    value={armorTonnage}
                    max={maxUsefulTonnage}
                    disabled={readOnly}
                    onChange={handleArmorTonnageChange}
                  />
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <button
                    onClick={handleMaximize}
                    disabled={readOnly || armorTonnage >= maxUsefulTonnage}
                    className={`${SECONDARY_ACTION} font-medium ${cs.button.disabledVisible}`}
                  >
                    {maximizeGain
                      ? `Maximize Tonnage (${maximizeGain})`
                      : 'Maximize Tonnage'}
                  </button>
                  <button
                    onClick={handleAutoAllocate}
                    disabled={autoAllocateDisabled}
                    aria-describedby={
                      autoAllocateReason ? allocationStatusId : undefined
                    }
                    className={`font-semibold ${cs.button.disabledVisible} ${
                      pointsDelta !== 0
                        ? 'bg-accent hover:bg-accent-hover text-on-accent min-h-11 rounded px-3 text-sm transition-colors'
                        : SECONDARY_ACTION
                    }`}
                  >
                    Auto Allocate ({pointsDelta > 0 ? '+' : ''}
                    {pointsDelta} pts)
                  </button>
                  {autoAllocateReason && (
                    <p
                      id={allocationStatusId}
                      data-testid="armor-auto-allocate-reason"
                      className="text-text-theme-secondary text-[13px] leading-[18px] sm:col-span-2 xl:col-span-1"
                    >
                      {autoAllocateReason}
                    </p>
                  )}
                </div>
              </div>

              <ArmorTabReadouts
                unallocatedPoints={unallocatedPoints}
                allocatedPoints={allocatedPoints}
                availablePoints={availablePoints}
                maxTotalArmor={maxTotalArmor}
                wastedPoints={wastedPoints}
              />

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
