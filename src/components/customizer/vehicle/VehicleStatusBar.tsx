/**
 * Vehicle Status Bar Component
 *
 * Displays key vehicle statistics in a compact bar format.
 * Shows tonnage allocation, movement points, armor coverage, and validation status.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 3.6
 */

import React, { useMemo } from 'react';
import { useVehicleStore } from '@/stores/useVehicleStore';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import { getArmorDefinition } from '@/types/construction/ArmorType';
import { EngineType, getEngineDefinition } from '@/types/construction/EngineType';
import { getTotalVehicleArmor } from '@/stores/vehicleState';

// =============================================================================
// Types
// =============================================================================

interface VehicleStatusBarProps {
  /** Additional CSS classes */
  className?: string;
  /** Compact mode for smaller displays */
  compact?: boolean;
}

interface StatusItemProps {
  label: string;
  value: string | number;
  subValue?: string;
  status?: 'normal' | 'warning' | 'error' | 'success';
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate engine weight based on type and rating
 */
function calculateEngineWeight(
  engineRating: number,
  engineType: EngineType
): number {
  const engineDef = getEngineDefinition(engineType);
  if (!engineDef) return 0;

  // Base engine weight calculation (simplified)
  const baseWeight = Math.ceil(engineRating / 25) * 0.5;
  return baseWeight * engineDef.weightMultiplier;
}

/**
 * Calculate armor weight from tonnage and type
 */
function getArmorWeight(armorTonnage: number): number {
  return armorTonnage;
}

// =============================================================================
// Status Item Component
// =============================================================================

function StatusItem({
  label,
  value,
  subValue,
  status = 'normal',
}: StatusItemProps): React.ReactElement {
  const statusColors: Record<string, string> = {
    normal: 'text-white',
    warning: 'text-amber-400',
    error: 'text-red-400',
    success: 'text-green-400',
  };

  return (
    <div className="flex flex-col items-center px-3 py-1">
      <span className="text-[10px] text-text-theme-secondary uppercase tracking-wide">
        {label}
      </span>
      <span className={`text-sm font-semibold tabular-nums ${statusColors[status]}`}>
        {value}
      </span>
      {subValue && (
        <span className="text-[10px] text-text-theme-secondary">{subValue}</span>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Compact status bar showing vehicle statistics
 */
export function VehicleStatusBar({
  className = '',
  compact = false,
}: VehicleStatusBarProps): React.ReactElement {
  // Get state from store
  const tonnage = useVehicleStore((s) => s.tonnage);
  const motionType = useVehicleStore((s) => s.motionType);
  const cruiseMP = useVehicleStore((s) => s.cruiseMP);
  const engineType = useVehicleStore((s) => s.engineType);
  const engineRating = useVehicleStore((s) => s.engineRating);
  const armorType = useVehicleStore((s) => s.armorType);
  const armorTonnage = useVehicleStore((s) => s.armorTonnage);
  const armorAllocation = useVehicleStore((s) => s.armorAllocation);
  const turret = useVehicleStore((s) => s.turret);
  const equipment = useVehicleStore((s) => s.equipment);

  // Derived state
  const isVTOL = motionType === GroundMotionType.VTOL;
  const hasTurret = turret !== null;
  const flankMP = Math.floor(cruiseMP * 1.5);

  // Calculate weight breakdown
  const weightBreakdown = useMemo(() => {
    const engineWeight = calculateEngineWeight(engineRating, engineType);
    const armorWeight = getArmorWeight(armorTonnage);

    // Simplified equipment weight (would need equipment database for real values)
    const equipmentWeight = equipment.length * 1; // Placeholder

    // Turret weight (typically 10% of weapon weight in turret)
    const turretWeight = turret?.currentWeight ?? 0;

    // Internal structure (roughly 10% of tonnage)
    const structureWeight = tonnage * 0.1;

    const totalUsed = engineWeight + armorWeight + equipmentWeight + turretWeight + structureWeight;
    const remaining = tonnage - totalUsed;

    return {
      engine: engineWeight,
      armor: armorWeight,
      equipment: equipmentWeight,
      turret: turretWeight,
      structure: structureWeight,
      total: totalUsed,
      remaining,
    };
  }, [tonnage, engineRating, engineType, armorTonnage, equipment.length, turret]);

  // Calculate armor stats
  const armorStats = useMemo(() => {
    const allocated = getTotalVehicleArmor(armorAllocation, hasTurret);
    const armorDef = getArmorDefinition(armorType);
    const pointsPerTon = armorDef?.pointsPerTon ?? 16;
    const available = Math.floor(armorTonnage * pointsPerTon);

    return {
      allocated,
      available,
      unallocated: available - allocated,
    };
  }, [armorAllocation, hasTurret, armorType, armorTonnage]);

  // Determine status indicators
  const weightStatus = weightBreakdown.remaining < 0 ? 'error' : weightBreakdown.remaining === 0 ? 'success' : 'normal';
  const armorStatus = armorStats.unallocated < 0 ? 'error' : armorStats.unallocated > 0 ? 'warning' : 'success';

  // Get motion type label
  const motionLabel: Record<GroundMotionType, string> = {
    [GroundMotionType.TRACKED]: 'TRK',
    [GroundMotionType.WHEELED]: 'WHL',
    [GroundMotionType.HOVER]: 'HVR',
    [GroundMotionType.VTOL]: 'VTOL',
    [GroundMotionType.NAVAL]: 'NAV',
    [GroundMotionType.HYDROFOIL]: 'HYD',
    [GroundMotionType.SUBMARINE]: 'SUB',
    [GroundMotionType.WIGE]: 'WiGE',
    [GroundMotionType.RAIL]: 'RAIL',
    [GroundMotionType.MAGLEV]: 'MAG',
  };

  if (compact) {
    return (
      <div
        className={`flex items-center justify-between gap-2 px-3 py-1.5 bg-surface-base border-b border-border-theme-subtle text-xs ${className}`}
      >
        <span className="font-medium text-white">{tonnage}t {motionLabel[motionType]}</span>
        <span className="text-text-theme-secondary">
          {cruiseMP}/{flankMP} MP
        </span>
        <span className={armorStatus === 'error' ? 'text-red-400' : 'text-text-theme-secondary'}>
          {armorStats.allocated} armor
        </span>
        <span className={weightStatus === 'error' ? 'text-red-400' : 'text-text-theme-secondary'}>
          {weightBreakdown.remaining.toFixed(1)}t free
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between bg-surface-base border-b border-border-theme-subtle ${className}`}
    >
      {/* Tonnage */}
      <StatusItem
        label="Tonnage"
        value={`${tonnage}t`}
        subValue={motionLabel[motionType]}
      />

      {/* Weight Available */}
      <StatusItem
        label="Weight Free"
        value={`${weightBreakdown.remaining.toFixed(1)}t`}
        subValue={`${((weightBreakdown.remaining / tonnage) * 100).toFixed(0)}%`}
        status={weightStatus}
      />

      {/* Movement */}
      <StatusItem
        label="Movement"
        value={`${cruiseMP}/${flankMP}`}
        subValue={isVTOL ? 'Cruise/Flank' : 'Cruise/Flank'}
      />

      {/* Armor */}
      <StatusItem
        label="Armor"
        value={armorStats.allocated}
        subValue={armorStats.unallocated !== 0 ? `${armorStats.unallocated > 0 ? '+' : ''}${armorStats.unallocated} unalloc` : 'allocated'}
        status={armorStatus}
      />

      {/* Turret (if applicable) */}
      {hasTurret && (
        <StatusItem
          label="Turret"
          value={`${turret.currentWeight.toFixed(1)}t`}
          subValue={`/${turret.maxWeight.toFixed(1)}t`}
          status={turret.currentWeight > turret.maxWeight ? 'error' : 'normal'}
        />
      )}

      {/* Equipment Count */}
      <StatusItem
        label="Equipment"
        value={equipment.length}
        subValue="items"
      />
    </div>
  );
}

export default VehicleStatusBar;
