/**
 * Critical Slots Tab Component
 *
 * Displays the critical slots grid for assigning equipment to locations.
 * Layout matches MegaMekLab's diagram style with proper humanoid mech positioning.
 * Equipment selection is managed via the global loadout tray.
 *
 * @spec openspec/specs/critical-slots-display/spec.md
 * @spec openspec/specs/critical-slot-allocation/spec.md
 */

import React, { useContext } from 'react';

import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { Button } from '@/components/ui/Button';
import { MechLocation } from '@/types/construction';
import { getEquipmentSurfaceClasses } from '@/utils/colors/equipmentColors';
import { canChangeEquipmentMount } from '@/utils/construction/equipmentMutationPolicy';

import { LocationGrid } from '../critical-slots/LocationGrid';
import { PhoneLocationNavigation } from '../critical-slots/PhoneLocationNavigation';
import { useCriticalSlotOverflow } from '../critical-slots/useCriticalSlotOverflow';
import { CustomizerToolbarContext } from '../CustomizerToolbarContext';
import styles from '../CustomizerWorkbench.module.css';
import { CriticalSlotsPlaceBanner } from './CriticalSlotsPlaceBanner';
import { useCriticalSlotsTabLogic } from './CriticalSlotsTab.logic';
import { CriticalSlotsToolbar } from './CriticalSlotsToolbar';

interface CriticalSlotsTabProps {
  /** Read-only mode */
  readOnly?: boolean;
  /** Currently selected equipment ID (from loadout tray) */
  selectedEquipmentId?: string | null;
  /** Called when selection should change */
  onSelectEquipment?: (id: string | null) => void;
  /** Whether to hide the external loadout tray (uses inline unassigned section instead) */
  hideLoadoutTray?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/** Record-sheet order: the unit's left side on the viewer's left. */
const PHONE_LOCATION_ORDER = [
  MechLocation.LEFT_ARM,
  MechLocation.LEFT_TORSO,
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
];

export function CriticalSlotsTab({
  readOnly = false,
  selectedEquipmentId,
  onSelectEquipment,
  hideLoadoutTray = true,
  className = '',
}: CriticalSlotsTabProps): React.ReactElement {
  const workbench = useContext(CustomizerToolbarContext);
  const {
    locations,
    isBiped,
    handlePlaceInLocation,
    placementIssues,
    placementOptions,
    handleUnassignSelected,
    isSuperheavy,
    selectedEquipment,
    unassignedEquipment,
    isOmni,
    autoModeSettings,
    toggleAutoFillUnhittables,
    toggleAutoCompact,
    toggleAutoSort,
    getLocationData,
    getAssignableSlots,
    handleSlotClick,
    handleEquipmentDrop,
    handleEquipmentRemove,
    handleReset,
    handleFill,
    handleCompact,
    handleSort,
    handleEquipmentDragStart,
  } = useCriticalSlotsTabLogic({
    readOnly,
    selectedEquipmentId,
    onSelectEquipment,
  });

  const { rootRef, hasMoreBelow } = useCriticalSlotOverflow(isBiped);

  const renderLocation = (location: MechLocation, hideHeader = false) => (
    <LocationGrid
      key={location}
      location={location}
      hideHeader={hideHeader}
      data={getLocationData(location)}
      selectedEquipmentId={selectedEquipmentId || undefined}
      assignableSlots={getAssignableSlots(location)}
      isOmni={isOmni}
      onSlotClick={(index) => handleSlotClick(location, index)}
      onEquipmentDrop={(index, equipmentId) =>
        handleEquipmentDrop(location, index, equipmentId)
      }
      onEquipmentRemove={(index) => handleEquipmentRemove(location, index)}
      onEquipmentDragStart={handleEquipmentDragStart}
    />
  );

  const renderUnassignedChip = (item: IMountedEquipmentInstance) => {
    const isSelected = selectedEquipmentId === item.instanceId;

    return (
      <Button
        key={item.instanceId}
        variant={isSelected ? 'primary' : 'secondary'}
        size="sm"
        aria-pressed={isSelected}
        onClick={() => onSelectEquipment?.(isSelected ? null : item.instanceId)}
      >
        <span
          className={`rounded border px-2 py-1 ${getEquipmentSurfaceClasses(item.category, item.name)}`}
        >
          {item.name} · {item.criticalSlots} cr
        </span>
      </Button>
    );
  };

  return (
    <div
      ref={rootRef}
      className={`bg-surface-deep flex h-full min-h-0 flex-col max-sm:h-auto max-sm:min-h-[calc(100%+var(--workspace-bottom-gap))] ${className}`}
    >
      <CriticalSlotsToolbar
        equipmentNames={[
          ...locations.flatMap((location) =>
            getLocationData(location).slots.flatMap((slot) =>
              slot.type === 'equipment' && slot.name ? [slot.name] : [],
            ),
          ),
          ...unassignedEquipment.map((item) => item.name),
        ]}
        hasMoreLocationsBelow={hasMoreBelow}
        caption={
          isBiped
            ? 'Matches the record sheet · left side on the left'
            : undefined
        }
        autoFillUnhittables={autoModeSettings.autoFillUnhittables}
        autoCompact={autoModeSettings.autoCompact}
        autoSort={autoModeSettings.autoSort}
        onAutoFillToggle={toggleAutoFillUnhittables}
        onAutoCompactToggle={toggleAutoCompact}
        onAutoSortToggle={toggleAutoSort}
        onFill={handleFill}
        onCompact={handleCompact}
        onSort={handleSort}
        onReset={handleReset}
        readOnly={readOnly}
        placementIssues={workbench ? placementIssues : []}
        onSelectIssue={(id) => {
          onSelectEquipment?.(id);
          workbench?.requestLoadout();
        }}
        notice={
          isSuperheavy
            ? 'Shared-slot pairing is not supported by this editor. Place equipment in separate empty slots.'
            : undefined
        }
      />

      <CriticalSlotsPlaceBanner
        unassignedEquipment={unassignedEquipment}
        selectedEquipmentId={selectedEquipmentId}
        readOnly={readOnly}
        onSelectEquipment={onSelectEquipment}
      />

      {isSuperheavy && !workbench && (
        <p className="text-text-theme-secondary px-4 py-2 text-sm">
          Shared-slot pairing is not supported by this editor. Place equipment
          in separate empty slots.
        </p>
      )}
      {placementIssues.length > 0 && !workbench && (
        <details className="border-border-theme border-b bg-amber-500/5 px-4 py-2 text-sm">
          <summary className="focus-visible:ring-accent cursor-pointer font-medium text-amber-400 focus-visible:ring-2 focus-visible:outline-none">
            {placementIssues.length} placement issues
          </summary>
          <ul className="mt-2 space-y-1">
            {placementIssues.map((issue, index) => (
              <li key={index}>
                <button
                  type="button"
                  className="text-text-theme-secondary focus-visible:ring-accent text-left underline focus-visible:ring-2"
                  onClick={() => onSelectEquipment?.(issue.instanceId)}
                >
                  {issue.message}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {selectedEquipment && !workbench && (
        <section
          aria-label="Equipment placement"
          className="border-border-theme bg-surface-base/90 border-l-accent border-b border-l-2 p-3"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-text-theme-primary text-sm font-medium">
              Place {selectedEquipment.name} · {selectedEquipment.criticalSlots}{' '}
              cr
            </span>
            {selectedEquipment.location && (
              <Button
                size="sm"
                variant="secondary"
                disabled={
                  readOnly ||
                  !canChangeEquipmentMount(isOmni, selectedEquipment)
                }
                title={
                  !canChangeEquipmentMount(isOmni, selectedEquipment)
                    ? 'Fixed OmniMech equipment'
                    : undefined
                }
                onClick={handleUnassignSelected}
              >
                Unassign {selectedEquipment.name}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSelectEquipment?.(null)}
            >
              Cancel Selection
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {placementOptions.map((option) => (
              <Button
                key={option.location}
                size="sm"
                variant="secondary"
                disabled={readOnly || !option.canFit}
                title={option.reason}
                onClick={() => handlePlaceInLocation(option.location)}
              >
                <span>
                  {option.location}
                  <span className="block text-xs font-normal">
                    {option.reason ?? 'Place in first free slot'}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </section>
      )}
      {hideLoadoutTray && !workbench && unassignedEquipment.length > 0 && (
        <div className="bg-surface-base/50 border-border-theme-subtle flex-shrink-0 border-b px-3 py-2">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-medium text-red-400 uppercase">
              Needs Placement
            </span>
            <span className="text-text-theme-muted text-xs tabular-nums">
              ({unassignedEquipment.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {unassignedEquipment.map(renderUnassignedChip)}
          </div>
        </div>
      )}

      {!isBiped && (
        <div
          className="min-h-0 flex-1 overflow-y-auto p-3"
          role="region"
          aria-label="Critical slot locations"
          tabIndex={0}
        >
          <div className="grid grid-cols-1 items-start gap-3 min-[480px]:grid-cols-2 min-[720px]:grid-cols-3 xl:grid-cols-4">
            {locations.map((location) => renderLocation(location))}
          </div>
        </div>
      )}
      {isBiped && (
        <>
          {/* Phones: the location grows with the page, so every slot is
              reachable by scrolling the page, not a nested scroll box. Its
              end padding matches the Loadout bar's height, so the last slot
              scrolls fully clear of the fade and the bar. */}
          <div className="relative flex min-h-0 flex-1 flex-col max-sm:flex-none lg:hidden">
            <div
              className="min-h-0 flex-1 overflow-y-auto p-2 max-sm:flex-none max-sm:overflow-visible max-sm:pb-[var(--loadout-bar-height,45px)]"
              data-testid="critical-slots-grid-mobile"
              role="region"
              aria-label="Critical slot locations"
              tabIndex={0}
            >
              <PhoneLocationNavigation
                selectedEquipmentId={selectedEquipmentId}
                locations={PHONE_LOCATION_ORDER}
                getLocationData={getLocationData}
                getAssignableSlots={getAssignableSlots}
                renderLocation={renderLocation}
              />
              <div className="hidden grid-cols-2 items-start gap-3 min-[720px]:grid-cols-3 sm:grid">
                {PHONE_LOCATION_ORDER.map((location) =>
                  renderLocation(location),
                )}
              </div>
            </div>
            {/* Phones: a fade pinned to the bottom of the visible page, just
                above the Loadout bar, so a slot cut by the screen edge reads
                as continuing below, not clipped. Tablets get the toolbar's
                "Scroll for more locations" text instead. */}
            <div
              aria-hidden="true"
              data-testid="critical-slots-end-fade"
              className="pointer-events-none sticky bottom-0 -mt-8 h-8 shrink-0 bg-gradient-to-b from-transparent to-[var(--surface-deep)] sm:hidden"
            />
          </div>
          <div
            className={`${styles.criticalDesktopViewport} hidden min-h-0 flex-1 overflow-y-auto px-3 py-2 lg:block`}
            data-testid="critical-slots-grid-desktop"
            role="region"
            aria-label="Critical slot locations"
            tabIndex={0}
          >
            <div className={styles.criticalDesktopGrid}>
              {renderLocation(MechLocation.LEFT_ARM)}
              {renderLocation(MechLocation.LEFT_TORSO)}
              <div className={styles.criticalCenterColumn}>
                {renderLocation(MechLocation.HEAD)}
                {renderLocation(MechLocation.CENTER_TORSO)}
              </div>
              {renderLocation(MechLocation.RIGHT_TORSO)}
              {renderLocation(MechLocation.RIGHT_ARM)}
              <div className={styles.criticalLeftLeg}>
                {renderLocation(MechLocation.LEFT_LEG)}
              </div>
              <div className={styles.criticalRightLeg}>
                {renderLocation(MechLocation.RIGHT_LEG)}
              </div>
            </div>
          </div>
        </>
      )}
      {selectedEquipment && !workbench && (
        <div className="bg-surface-base/90 border-border-theme-subtle flex-shrink-0 border-t px-3 py-2 text-center">
          <span className="text-text-theme-secondary text-xs sm:text-sm">
            Tap a slot to place:{' '}
            <span className="text-accent font-medium">
              {selectedEquipment.name}
            </span>
            <span className="text-text-theme-muted ml-1">
              ({selectedEquipment.criticalSlots}cr)
            </span>
          </span>
        </div>
      )}

      {hideLoadoutTray && !workbench && !selectedEquipment && (
        <div className="bg-surface-base/90 border-border-theme-subtle flex flex-shrink-0 items-center justify-between border-t px-3 py-2 text-xs">
          <span
            className={
              unassignedEquipment.length === 0
                ? 'text-green-400'
                : 'text-red-400'
            }
          >
            {unassignedEquipment.length === 0
              ? 'All equipment has slot assignments'
              : `${unassignedEquipment.length} unassigned`}
          </span>
          <span className="text-text-theme-muted">
            Tap equipment above, then tap a slot
          </span>
        </div>
      )}
    </div>
  );
}

export default CriticalSlotsTab;
