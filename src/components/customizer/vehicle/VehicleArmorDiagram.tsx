/**
 * VehicleArmorDiagram
 *
 * Full per-type armor diagram for ground vehicles, VTOLs, and support vehicles.
 * Renders 4 base locations (Front/Left/Right/Rear) plus conditional locations:
 *   - Turret      when turret is configured (any non-CHIN turret type)
 *   - Chin Turret when turret.type === TurretType.CHIN
 *   - Rotor       when motionType === VTOL
 *   - Body        when the vehicle is a support vehicle
 *
 * Reads state from useVehicleStore; wires inputs back via setLocationArmor /
 * autoAllocateArmor. Auto-allocate follows TM pp.86-87 distribution:
 *   40% Front, 20% Left, 20% Right, 10% Rear, remainder Turret.
 *
 * Accessibility:
 *   - Each per-location numeric input is rendered via the shared
 *     <ArmorAllocationInput> primitive which clamps to the location's max
 *     and supports ArrowLeft/ArrowRight navigation between inputs in the
 *     same group ('vehicle-armor').
 *   - Auto-Allocate prompts a confirm() dialog when the diagram is not in
 *     its default (all-zero) state to prevent accidental loss of work.
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *        Requirement: Vehicle Diagram Geometry
 */

import React, { useCallback, useMemo } from "react";

import { useVehicleStore } from "@/stores/useVehicleStore";
import {
  VehicleLocation,
  VTOLLocation,
} from "@/types/construction/UnitLocation";
import { GroundMotionType } from "@/types/unit/BaseUnitInterfaces";
import { UnitType } from "@/types/unit/BattleMechInterfaces";
import { TurretType } from "@/types/unit/VehicleInterfaces";

import { ArmorAllocationInput } from "../armor/ArmorAllocationInput";
import { ArmorLocationBlock } from "../armor/ArmorLocationBlock";
import {
  getMaxVehicleArmorForLocation,
  type VehicleArmorLocation,
} from "./VehicleArmorTab.utils";

// =============================================================================
// Types
// =============================================================================

interface VehicleArmorDiagramProps {
  className?: string;
}

// Synthetic location key used for the chin-turret slot.
// (TurretType.CHIN exists but the VehicleLocation enum has no CHIN_TURRET
//  member yet; until the construction proposal lands we route chin armor
//  through the existing VehicleLocation.TURRET slot but display it under
//  the "Chin Turret" label.)
const CHIN_TURRET_KEY = VehicleLocation.TURRET;

// =============================================================================
// Component
// =============================================================================

/**
 * Visual armor diagram for vehicles.
 * Displays all active locations with pip rows and numeric inputs.
 * Includes an Auto-Allocate action following TechManual distribution tables.
 */
export function VehicleArmorDiagram({
  className = "",
}: VehicleArmorDiagramProps): React.ReactElement {
  const motionType = useVehicleStore((s) => s.motionType);
  const unitType = useVehicleStore((s) => s.unitType);
  const turret = useVehicleStore((s) => s.turret);
  const armorAllocation = useVehicleStore((s) => s.armorAllocation);
  const tonnage = useVehicleStore((s) => s.tonnage);
  const armorTonnage = useVehicleStore((s) => s.armorTonnage);
  const setLocationArmor = useVehicleStore((s) => s.setLocationArmor);
  const autoAllocateArmor = useVehicleStore((s) => s.autoAllocateArmor);

  const isVTOL = motionType === GroundMotionType.VTOL;
  // Support vehicles carry a Body location per spec
  const isSupport = unitType === UnitType.SUPPORT_VEHICLE;
  const hasTurret = turret !== null;
  const isChinTurret = turret?.type === TurretType.CHIN;

  // Build ordered list of active locations for this vehicle configuration.
  // The turret slot's label switches to "Chin Turret" when turret.type === CHIN
  // so the user sees the configured variant clearly.
  const locations = useMemo<{ key: string; label: string }[]>(() => {
    const base: { key: string; label: string }[] = [
      { key: VehicleLocation.FRONT, label: "Front" },
      { key: VehicleLocation.LEFT, label: "Left Side" },
      { key: VehicleLocation.RIGHT, label: "Right Side" },
      { key: VehicleLocation.REAR, label: "Rear" },
    ];
    if (hasTurret) {
      base.push({
        key: isChinTurret ? CHIN_TURRET_KEY : VehicleLocation.TURRET,
        label: isChinTurret ? "Chin Turret" : "Turret",
      });
    }
    if (isVTOL) base.push({ key: VTOLLocation.ROTOR, label: "Rotor" });
    if (isSupport) base.push({ key: VehicleLocation.BODY, label: "Body" });
    return base;
  }, [hasTurret, isChinTurret, isVTOL, isSupport]);

  const handleChange = useCallback(
    (location: VehicleArmorLocation, raw: number) => {
      const max = getMaxVehicleArmorForLocation(
        tonnage,
        location,
        hasTurret,
        isVTOL,
      );
      setLocationArmor(location, Math.max(0, Math.min(max, raw)));
    },
    [setLocationArmor, tonnage, hasTurret, isVTOL],
  );

  // Available points derived from armor tonnage (standard 16 pts/ton for display)
  const availablePoints = Math.floor(armorTonnage * 16);

  // Detect "non-default" state for the confirm-on-auto-allocate UX.
  // Default = every location at 0; if any location has armor, prompt before
  // clobbering the user's manual allocation.
  const hasNonDefaultArmor = useMemo(
    () =>
      Object.values(armorAllocation as Record<string, number>).some(
        (v) => (v ?? 0) > 0,
      ),
    [armorAllocation],
  );

  const handleAutoAllocate = useCallback(() => {
    if (hasNonDefaultArmor) {
      const ok =
        typeof window === "undefined" ||
        // eslint-disable-next-line no-alert -- intentional confirm for destructive action
        window.confirm(
          "Auto-allocate will overwrite your current armor distribution. Continue?",
        );
      if (!ok) return;
    }
    autoAllocateArmor();
  }, [autoAllocateArmor, hasNonDefaultArmor]);

  return (
    <div
      className={`bg-surface-base border-border-theme-subtle flex flex-col gap-4 rounded-lg border p-4 ${className}`}
      data-testid="vehicle-armor-diagram"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">Armor Diagram</h4>
        <button
          onClick={handleAutoAllocate}
          disabled={availablePoints === 0}
          className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="vehicle-armor-auto-allocate"
        >
          Auto-Allocate
        </button>
      </div>

      {/* Top-down vehicle schematic */}
      <div className="flex justify-center">
        <svg
          viewBox="0 0 160 200"
          className="w-full max-w-[160px]"
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
        {locations.map(({ key, label }) => {
          const current = (armorAllocation as Record<string, number>)[key] ?? 0;
          const max = getMaxVehicleArmorForLocation(
            tonnage,
            key as VehicleArmorLocation,
            hasTurret,
            isVTOL,
          );
          const accentClass =
            key === VehicleLocation.TURRET
              ? "text-amber-400"
              : key === VTOLLocation.ROTOR
                ? "text-sky-400"
                : "text-cyan-400";

          return (
            <div key={key} className="flex flex-col gap-1">
              <ArmorLocationBlock
                label={label}
                current={current}
                max={max}
                accentClass={accentClass}
              />
              {/* Shared numeric input — clamps + arrow navigation */}
              <ArmorAllocationInput
                label={label}
                value={current}
                max={max}
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
    </div>
  );
}

export default VehicleArmorDiagram;
