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

import React from 'react';

import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { MechLocation } from '@/types/construction';

import { LocationGrid } from '../critical-slots/LocationGrid';
import { VerticalSlotChip } from '../critical-slots/VerticalSlotChip';
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

export function CriticalSlotsTab({
  readOnly = false,
  selectedEquipmentId,
  onSelectEquipment,
  hideLoadoutTray = true,
  className = '',
}: CriticalSlotsTabProps): React.ReactElement {
  const {
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

  const renderLocation = (location: MechLocation) => (
    <LocationGrid
      key={location}
      location={location}
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
      <VerticalSlotChip
        key={item.instanceId}
        name={item.name}
        criticalSlots={item.criticalSlots}
        isSelected={isSelected}
        onClick={() => onSelectEquipment?.(isSelected ? null : item.instanceId)}
      />
    );
  };

  return (
    <div className={`bg-surface-deep flex h-full flex-col ${className}`}>
      <CriticalSlotsToolbar
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
      />

      {hideLoadoutTray && unassignedEquipment.length > 0 && (
        <div className="bg-surface-base/30 border-border-theme-subtle flex-shrink-0 border-b px-1.5 py-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[9px] font-medium text-amber-400 uppercase">
              Unassigned
            </span>
            <span className="text-text-theme-muted text-[9px]">
              ({unassignedEquipment.length})
            </span>
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {unassignedEquipment.map(renderUnassignedChip)}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-1 md:hidden">
        <div className="flex items-start justify-center gap-1">
          <div className="flex flex-col gap-1" style={{ marginTop: '80px' }}>
            {renderLocation(MechLocation.LEFT_ARM)}
            {renderLocation(MechLocation.LEFT_TORSO)}
            {renderLocation(MechLocation.LEFT_LEG)}
          </div>

          <div className="flex flex-col gap-1">
            {renderLocation(MechLocation.HEAD)}
            {renderLocation(MechLocation.CENTER_TORSO)}
          </div>

          <div className="flex flex-col gap-1" style={{ marginTop: '80px' }}>
            {renderLocation(MechLocation.RIGHT_ARM)}
            {renderLocation(MechLocation.RIGHT_TORSO)}
            {renderLocation(MechLocation.RIGHT_LEG)}
          </div>
        </div>
      </div>

      <div className="hidden flex-1 overflow-auto p-2 md:flex lg:p-4">
        <div className="mx-auto flex min-w-max items-start justify-center gap-2 lg:gap-3">
          <div className="flex flex-col" style={{ marginTop: '136px' }}>
            {renderLocation(MechLocation.LEFT_ARM)}
          </div>

          <div className="flex flex-col" style={{ marginTop: '40px' }}>
            {renderLocation(MechLocation.LEFT_TORSO)}
            <div className="mt-16">{renderLocation(MechLocation.LEFT_LEG)}</div>
          </div>

          <div className="flex flex-col gap-3">
            {renderLocation(MechLocation.HEAD)}
            {renderLocation(MechLocation.CENTER_TORSO)}
          </div>

          <div className="flex flex-col" style={{ marginTop: '40px' }}>
            {renderLocation(MechLocation.RIGHT_TORSO)}
            <div className="mt-16">
              {renderLocation(MechLocation.RIGHT_LEG)}
            </div>
          </div>

          <div className="flex flex-col" style={{ marginTop: '136px' }}>
            {renderLocation(MechLocation.RIGHT_ARM)}
          </div>
        </div>
      </div>

      {selectedEquipment && (
        <div className="bg-surface-base border-border-theme-subtle flex-shrink-0 border-t px-2 py-1.5 text-center">
          <span className="text-xs text-slate-300 sm:text-sm">
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

      {hideLoadoutTray && !selectedEquipment && (
        <div className="bg-surface-base border-border-theme-subtle flex flex-shrink-0 items-center justify-between border-t px-2 py-1.5 text-xs">
          <span
            className={
              unassignedEquipment.length === 0
                ? 'text-green-400'
                : 'text-amber-400'
            }
          >
            {unassignedEquipment.length === 0
              ? '✓ All equipment placed'
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
