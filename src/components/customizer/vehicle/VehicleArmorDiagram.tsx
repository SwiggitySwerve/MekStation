/**
 * VehicleArmorDiagram
 *
 * Full per-type armor diagram for ground vehicles, VTOLs, and support vehicles.
 * Renders 4 base locations (Front/Left/Right/Rear) plus conditional locations:
 *   - Turret      when turret is configured (any non-CHIN turret type)
 *   - Chin Turret when turret.type === TurretType.CHIN
 *   - Rotor       when motionType === VTOL
 *
 * Reads state from useVehicleStore; wires inputs back via setLocationArmor /
 * autoAllocateArmor. Allocation follows the installed-location distribution
 * from pinned MegaMekLab.
 *
 * Accessibility:
 *   - Each per-location numeric input is rendered via the shared
 *     <ArmorAllocationInput> primitive which clamps to the location's max
 *     and supports ArrowLeft/ArrowRight navigation between inputs in the
 *     same group ('vehicle-armor').
 *   - Auto-Allocate prompts an app dialog when the diagram is not in
 *     its default (all-zero) state to prevent accidental loss of work.
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *        Requirement: Vehicle Diagram Geometry
 */

import React, { useCallback, useMemo, useLayoutEffect, useRef } from 'react';
import { shallow } from 'zustand/vanilla/shallow';

import { useVehicleStore, useVehicleStoreApi } from '@/stores/useVehicleStore';
import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import { getVehicleArmorProfile } from '@/utils/construction/vehicle/armorLimits';
import {
  getMaxVehicleArmorForLocation,
  getVehicleArmorEditorLayout,
  getVehicleArmorEditorFigures,
  type VehicleArmorLocation,
} from '@/utils/construction/vehicle/editorArmor';

import { ArmorAllocationInput } from '../armor/ArmorAllocationInput';
import { ArmorLocationBlock } from '../armor/ArmorLocationBlock';
import { useCustomizerConfirmation } from '../dialogs/CustomizerConfirmationProvider';
import { VehicleSixSideArmorDiagram } from './VehicleSixSideArmorDiagram';

// =============================================================================
// Types
// =============================================================================

interface VehicleArmorDiagramProps {
  className?: string;
  readOnly?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Visual armor diagram for vehicles.
 * Displays all active locations with pip rows and numeric inputs.
 * Includes an Auto-Allocate action following the pinned MegaMekLab allocator.
 */
export function VehicleArmorDiagram({
  className = '',
  readOnly = false,
}: VehicleArmorDiagramProps): React.ReactElement {
  const storeApi = useVehicleStoreApi();
  const committedStore = useRef(storeApi);
  useLayoutEffect(() => {
    committedStore.current = storeApi;
  }, [storeApi]);
  const { requestConfirmation } = useCustomizerConfirmation();
  const motionType = useVehicleStore((s) => s.motionType);
  const unitType = useVehicleStore((s) => s.unitType);
  const turret = useVehicleStore((s) => s.turret);
  const secondaryTurret = useVehicleStore((s) => s.secondaryTurret);
  const armorAllocation = useVehicleStore((s) => s.armorAllocation);
  const tonnage = useVehicleStore((s) => s.tonnage);
  const armorTonnage = useVehicleStore((s) => s.armorTonnage);
  const armorType = useVehicleStore((s) => s.armorType);
  const usesBarArmor = useVehicleStore((s) => s.usesBarArmor);
  const barRating = useVehicleStore((s) => s.barRating);
  const armorTechRating = useVehicleStore((s) => s.armorTechRating);
  const setLocationArmor = useVehicleStore((s) => s.setLocationArmor);

  const armorProfile = useMemo(
    () =>
      getVehicleArmorProfile({
        tonnage,
        unitType,
        motionType,
        turret,
        secondaryTurret,
        usesBarArmor,
      }),
    [tonnage, unitType, motionType, turret, secondaryTurret, usesBarArmor],
  );
  const { isVTOL, hasTurret, isChinTurret } = armorProfile;
  const hasSecondaryTurret = armorProfile.hasSecondaryTurret ?? false;
  const layout = getVehicleArmorEditorLayout(armorProfile);

  const handleChange = useCallback(
    (location: VehicleArmorLocation, raw: number) => {
      setLocationArmor(location, raw);
    },
    [setLocationArmor],
  );

  // The shared armor owner supplies points, including native BAR armor.
  const { availablePoints } = getVehicleArmorEditorFigures({
    tonnage,
    armorType,
    armorTonnage,
    barRating,
    armorTechRating,
    armorAllocation,
    profile: armorProfile,
  });

  const handleAutoAllocate = useCallback(() => {
    const state = storeApi.getState();
    if (
      !Object.values(state.armorAllocation).some((value) => (value ?? 0) > 0)
    ) {
      state.autoAllocateArmor();
      return;
    }
    const requested = {
      id: state.id,
      unitType: state.unitType,
      tonnage: state.tonnage,
      motionType: state.motionType,
      armorType: state.armorType,
      armorTonnage: state.armorTonnage,
      barRating: state.barRating,
      armorTechRating: state.armorTechRating,
      usesBarArmor: state.usesBarArmor,
      isSuperheavy: state.isSuperheavy,
      turretType: state.turret?.type,
      secondaryTurretType: state.secondaryTurret?.type,
      allocation: { ...state.armorAllocation },
    };
    requestConfirmation({
      title: 'Auto-allocate armor?',
      message:
        'Auto-allocate will overwrite your current armor distribution. Continue?',
      confirmLabel: 'Auto-Allocate',
      isCurrent: () => {
        if (committedStore.current !== storeApi) return false;
        const current = committedStore.current.getState();
        return (
          current.id === requested.id &&
          current.unitType === requested.unitType &&
          current.tonnage === requested.tonnage &&
          current.motionType === requested.motionType &&
          current.armorType === requested.armorType &&
          current.armorTonnage === requested.armorTonnage &&
          current.barRating === requested.barRating &&
          current.armorTechRating === requested.armorTechRating &&
          current.usesBarArmor === requested.usesBarArmor &&
          current.isSuperheavy === requested.isSuperheavy &&
          current.turret?.type === requested.turretType &&
          current.secondaryTurret?.type === requested.secondaryTurretType &&
          shallow(current.armorAllocation, requested.allocation)
        );
      },
      onConfirm: () => committedStore.current.getState().autoAllocateArmor(),
    });
  }, [requestConfirmation, storeApi]);

  return (
    <fieldset
      disabled={readOnly}
      className={`bg-surface-base border-border-theme-subtle flex min-w-0 flex-col gap-4 rounded-lg border p-4 ${className}`}
      data-testid="vehicle-armor-diagram"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">Armor Diagram</h4>
        <button
          onClick={handleAutoAllocate}
          disabled={availablePoints === 0 || !layout.canAutoAllocate}
          className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="vehicle-armor-auto-allocate"
        >
          Auto-Allocate
        </button>
      </div>

      {!layout.canAutoAllocate && (
        <p className="text-text-theme-secondary text-xs">
          Automatic allocation is unavailable for this armor layout.
        </p>
      )}
      {/* Top-down vehicle schematic */}
      <div className="flex justify-center">
        {layout.isSixSide && (
          <VehicleSixSideArmorDiagram
            locations={layout.locations}
            allocation={armorAllocation}
            hasTurret={hasTurret}
            hasSecondaryTurret={hasSecondaryTurret}
          />
        )}
        <svg
          viewBox="0 0 160 200"
          className={`w-full max-w-[160px] ${layout.isSixSide ? 'hidden' : ''}`}
          aria-hidden="true"
        >
          {/* Vehicle body */}
          <rect
            x="35"
            y="50"
            width="90"
            height="120"
            rx="6"
            className="fill-surface-raised stroke-border-theme"
            strokeWidth="1.5"
          />
          {/* Front wedge */}
          <path
            d="M 50 50 L 80 20 L 110 50"
            className="fill-surface-raised stroke-border-theme"
            strokeWidth="1.5"
          />
          {/* Rear bar */}
          <rect
            x="45"
            y="170"
            width="70"
            height="14"
            rx="3"
            className="fill-surface-raised stroke-border-theme"
            strokeWidth="1.5"
          />
          {/* Turret ring (chin turret renders as a smaller forward-mounted ring) */}
          {hasTurret && !isChinTurret && (
            <circle
              cx="80"
              cy="110"
              r="20"
              className="fill-amber-900/30 stroke-amber-500"
              strokeWidth="1.5"
            />
          )}
          {hasTurret && isChinTurret && (
            <circle
              cx="80"
              cy="55"
              r="10"
              className="fill-amber-900/30 stroke-amber-500"
              strokeWidth="1.5"
            />
          )}
          {hasSecondaryTurret && !isVTOL && (
            <circle
              cx="80"
              cy="75"
              r="13"
              className="fill-orange-900/30 stroke-orange-500"
            />
          )}
          {/* Rotor dashes for VTOL */}
          {isVTOL && (
            <ellipse
              cx="80"
              cy="110"
              rx="36"
              ry="12"
              className="fill-transparent stroke-sky-400"
              strokeWidth="1"
              strokeDasharray="5 3"
            />
          )}
          {/* Direction arrow */}
          <path
            d="M 80 28 L 76 36 L 80 33 L 84 36 Z"
            fill="#22d3ee"
            opacity="0.7"
          />
        </svg>
      </div>

      {/* Location blocks grid */}
      <div className="grid grid-cols-2 gap-3">
        {layout.locations.map(({ location: key, label }) => {
          const current = (armorAllocation as Record<string, number>)[key] ?? 0;
          const max = getMaxVehicleArmorForLocation({
            tonnage,
            location: key as VehicleArmorLocation,
            profile: armorProfile,
          });
          const accentClass =
            key === VehicleLocation.TURRET
              ? 'text-amber-400'
              : key === VehicleLocation.TURRET_2
                ? 'text-orange-400'
                : key === VTOLLocation.ROTOR
                  ? 'text-sky-400'
                  : 'text-cyan-400';

          return (
            <div key={key} className="flex flex-col gap-1">
              <ArmorLocationBlock
                className="[&_span]:normal-case"
                label={label}
                current={current}
                max={max}
                accentClass={accentClass}
                showPips={!layout.isSixSide}
              />
              {/* Shared numeric input — clamps + arrow navigation */}
              <ArmorAllocationInput
                label={label}
                value={current}
                max={max}
                className="min-h-11 min-w-11"
                groupId="vehicle-armor"
                data-testid={`vehicle-armor-input-${key}`}
                onChange={(next) =>
                  handleChange(key as VehicleArmorLocation, next)
                }
              />
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

export default VehicleArmorDiagram;
