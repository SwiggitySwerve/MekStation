/**
 * Vehicle Diagram Component
 *
 * Visual representation of vehicle armor distribution and configuration.
 * Shows a top-down view of the vehicle with armor values per location.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 3.5
 */

import React, { useMemo } from 'react';

import { useVehicleStore } from '@/stores/useVehicleStore';
import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

// =============================================================================
// Types
// =============================================================================

interface VehicleDiagramProps {
  /** Additional CSS classes */
  className?: string;
  /** Show compact version */
  compact?: boolean;
}

interface ArmorLocationProps {
  label: string;
  value: number;
  maxValue?: number;
  className?: string;
  position: 'top' | 'left' | 'right' | 'bottom' | 'center';
}

// =============================================================================
// Helper Components
// =============================================================================

function ArmorLocation({
  label,
  value,
  maxValue,
  className = '',
  position,
}: ArmorLocationProps): React.ReactElement {
  // Calculate fill percentage
  const fillPercent = maxValue && maxValue > 0 ? (value / maxValue) * 100 : 0;

  // Position-based styling
  const positionStyles: Record<string, string> = {
    top: 'flex-col',
    bottom: 'flex-col-reverse',
    left: 'flex-row-reverse',
    right: 'flex-row',
    center: 'flex-col',
  };

  return (
    <div
      className={`flex items-center gap-1 ${positionStyles[position]} ${className}`}
    >
      <span className="text-text-theme-secondary text-[10px] tracking-wide uppercase">
        {label}
      </span>
      <div className="relative">
        <span
          className={`text-lg font-bold tabular-nums ${
            value === 0
              ? 'text-text-theme-secondary/50'
              : fillPercent > 75
                ? 'text-cyan-400'
                : fillPercent > 50
                  ? 'text-green-400'
                  : fillPercent > 25
                    ? 'text-amber-400'
                    : 'text-red-400'
          }`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Visual vehicle diagram showing armor distribution
 */
export function VehicleDiagram({
  className = '',
  compact = false,
}: VehicleDiagramProps): React.ReactElement {
  // Get state from store
  const motionType = useVehicleStore((s) => s.motionType);
  const turret = useVehicleStore((s) => s.turret);
  const armorAllocation = useVehicleStore((s) => s.armorAllocation);
  const tonnage = useVehicleStore((s) => s.tonnage);

  // Derived state
  const isVTOL = motionType === GroundMotionType.VTOL;
  const hasTurret = turret !== null;

  // Calculate max armor for each location (simplified)
  const maxArmor = useMemo(() => {
    const baseStructure = Math.floor(tonnage / 10) + 1;
    return {
      front: baseStructure * 4,
      side: baseStructure * 3,
      rear: baseStructure * 2,
      turret: hasTurret ? baseStructure * 2 : 0,
      rotor: isVTOL ? 2 : 0,
    };
  }, [tonnage, hasTurret, isVTOL]);

  // Get motion type label
  const motionTypeLabel = useMemo(() => {
    const labels: Record<GroundMotionType, string> = {
      [GroundMotionType.TRACKED]: 'Tracked',
      [GroundMotionType.WHEELED]: 'Wheeled',
      [GroundMotionType.HOVER]: 'Hover',
      [GroundMotionType.VTOL]: 'VTOL',
      [GroundMotionType.NAVAL]: 'Naval',
      [GroundMotionType.HYDROFOIL]: 'Hydrofoil',
      [GroundMotionType.SUBMARINE]: 'Submarine',
      [GroundMotionType.WIGE]: 'WiGE',
      [GroundMotionType.RAIL]: 'Rail',
      [GroundMotionType.MAGLEV]: 'Maglev',
    };
    return labels[motionType] || motionType;
  }, [motionType]);

  // Get turret type label
  const turretTypeLabel = turret?.type ?? 'None';

  if (compact) {
    return (
      <div className={`text-center ${className}`}>
        <div className="inline-grid grid-cols-3 gap-2 text-xs">
          <div />
          <div className="font-mono text-cyan-400">
            {armorAllocation[VehicleLocation.FRONT] ?? 0}
          </div>
          <div />
          <div className="font-mono text-cyan-400">
            {armorAllocation[VehicleLocation.LEFT] ?? 0}
          </div>
          {hasTurret ? (
            <div className="font-mono text-amber-400">
              {armorAllocation[VehicleLocation.TURRET] ?? 0}
            </div>
          ) : (
            <div className="text-text-theme-secondary/50">-</div>
          )}
          <div className="font-mono text-cyan-400">
            {armorAllocation[VehicleLocation.RIGHT] ?? 0}
          </div>
          <div />
          <div className="font-mono text-cyan-400">
            {armorAllocation[VehicleLocation.REAR] ?? 0}
          </div>
          <div />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Vehicle Type Header */}
      <div className="text-text-theme-secondary mb-2 text-xs">
        {motionTypeLabel} Vehicle
        {hasTurret && ` • ${turretTypeLabel} Turret`}
      </div>

      {/* Main Diagram */}
      <div className="relative aspect-[4/5] w-full max-w-xs">
        {/* Vehicle Body Outline */}
        <svg
          viewBox="0 0 200 250"
          className="h-full w-full"
          fill="none"
          stroke="currentColor"
        >
          {/* Main body */}
          <rect
            x="40"
            y="60"
            width="120"
            height="140"
            rx="8"
            className="stroke-border-theme fill-surface-raised/30"
            strokeWidth="2"
          />

          {/* Front (nose) */}
          <path
            d="M 60 60 L 100 20 L 140 60"
            className="stroke-border-theme fill-surface-raised/30"
            strokeWidth="2"
          />

          {/* Rear */}
          <rect
            x="50"
            y="200"
            width="100"
            height="20"
            rx="4"
            className="stroke-border-theme fill-surface-raised/30"
            strokeWidth="2"
          />

          {/* Turret (if present) */}
          {hasTurret && (
            <circle
              cx="100"
              cy="120"
              r="25"
              className="fill-amber-900/30 stroke-amber-500"
              strokeWidth="2"
            />
          )}

          {/* VTOL rotor indicator */}
          {isVTOL && (
            <>
              <circle
                cx="60"
                cy="100"
                r="15"
                className="fill-transparent stroke-sky-500"
                strokeWidth="1"
                strokeDasharray="4 2"
              />
              <circle
                cx="140"
                cy="100"
                r="15"
                className="fill-transparent stroke-sky-500"
                strokeWidth="1"
                strokeDasharray="4 2"
              />
            </>
          )}

          {/* Motion type indicators */}
          {motionType === GroundMotionType.TRACKED && (
            <>
              <rect
                x="30"
                y="70"
                width="10"
                height="120"
                rx="2"
                className="fill-text-theme-secondary/30"
              />
              <rect
                x="160"
                y="70"
                width="10"
                height="120"
                rx="2"
                className="fill-text-theme-secondary/30"
              />
            </>
          )}
          {motionType === GroundMotionType.WHEELED && (
            <>
              <circle
                cx="50"
                cy="80"
                r="8"
                className="fill-text-theme-secondary/30"
              />
              <circle
                cx="150"
                cy="80"
                r="8"
                className="fill-text-theme-secondary/30"
              />
              <circle
                cx="50"
                cy="180"
                r="8"
                className="fill-text-theme-secondary/30"
              />
              <circle
                cx="150"
                cy="180"
                r="8"
                className="fill-text-theme-secondary/30"
              />
            </>
          )}
        </svg>

        {/* Armor Values Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-between py-2">
          {/* Front */}
          <ArmorLocation
            label="Front"
            value={armorAllocation[VehicleLocation.FRONT] ?? 0}
            maxValue={maxArmor.front}
            position="top"
          />

          {/* Middle Row: Left - Center - Right */}
          <div className="flex w-full items-center justify-between px-2">
            <ArmorLocation
              label="Left"
              value={armorAllocation[VehicleLocation.LEFT] ?? 0}
              maxValue={maxArmor.side}
              position="left"
            />

            {/* Center: Turret or VTOL Rotor */}
            <div className="flex flex-col items-center">
              {hasTurret && (
                <ArmorLocation
                  label="Turret"
                  value={armorAllocation[VehicleLocation.TURRET] ?? 0}
                  maxValue={maxArmor.turret}
                  position="center"
                  className="text-amber-400"
                />
              )}
              {isVTOL && (
                <ArmorLocation
                  label="Rotor"
                  value={
                    (armorAllocation as Record<string, number>)[
                      VTOLLocation.ROTOR
                    ] ?? 0
                  }
                  maxValue={maxArmor.rotor}
                  position="center"
                  className="text-sky-400"
                />
              )}
              {!hasTurret && !isVTOL && (
                <span className="text-text-theme-secondary/50 text-xs">
                  Body
                </span>
              )}
            </div>

            <ArmorLocation
              label="Right"
              value={armorAllocation[VehicleLocation.RIGHT] ?? 0}
              maxValue={maxArmor.side}
              position="right"
            />
          </div>

          {/* Rear */}
          <ArmorLocation
            label="Rear"
            value={armorAllocation[VehicleLocation.REAR] ?? 0}
            maxValue={maxArmor.rear}
            position="bottom"
          />
        </div>
      </div>

      {/* Legend */}
      <div className="text-text-theme-secondary mt-2 flex items-center gap-4 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          Armor
        </span>
        {hasTurret && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Turret
          </span>
        )}
        {isVTOL && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            Rotor
          </span>
        )}
      </div>
    </div>
  );
}

export default VehicleDiagram;
