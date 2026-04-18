/**
 * Aerospace Status Bar Component
 *
 * Displays key aerospace statistics in a compact bar format.
 * Shows tonnage, thrust, fuel, armor, and heat tracking.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 4.4
 */

import React, { useMemo } from 'react';

import { getTotalAerospaceArmor } from '@/stores/aerospaceState';
import { useAerospaceStore } from '@/stores/useAerospaceStore';
import { getArmorDefinition } from '@/types/construction/ArmorType';
import { getEngineDefinition } from '@/types/construction/EngineType';
import {
  calculateAerospaceBV,
  type IAerospaceBVEquipment,
} from '@/utils/construction/aerospace/aerospaceBV';

// =============================================================================
// Types
// =============================================================================

interface AerospaceStatusBarProps {
  className?: string;
  compact?: boolean;
}

interface StatusItemProps {
  label: string;
  value: string | number;
  subValue?: string;
  status?: 'normal' | 'warning' | 'error' | 'success';
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
      <span className="text-text-theme-secondary text-[10px] tracking-wide uppercase">
        {label}
      </span>
      <span
        className={`text-sm font-semibold tabular-nums ${statusColors[status]}`}
      >
        {value}
      </span>
      {subValue && (
        <span className="text-text-theme-secondary text-[10px]">
          {subValue}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function AerospaceStatusBar({
  className = '',
  compact = false,
}: AerospaceStatusBarProps): React.ReactElement {
  // Get state from store
  const tonnage = useAerospaceStore((s) => s.tonnage);
  const safeThrust = useAerospaceStore((s) => s.safeThrust);
  const maxThrust = useAerospaceStore((s) => s.maxThrust);
  const fuel = useAerospaceStore((s) => s.fuel);
  const structuralIntegrity = useAerospaceStore((s) => s.structuralIntegrity);
  const armorType = useAerospaceStore((s) => s.armorType);
  const armorTonnage = useAerospaceStore((s) => s.armorTonnage);
  const armorAllocation = useAerospaceStore((s) => s.armorAllocation);
  const heatSinks = useAerospaceStore((s) => s.heatSinks);
  const doubleHeatSinks = useAerospaceStore((s) => s.doubleHeatSinks);
  const equipment = useAerospaceStore((s) => s.equipment);
  const engineType = useAerospaceStore((s) => s.engineType);
  const engineRating = useAerospaceStore((s) => s.engineRating);
  const aerospaceSubType = useAerospaceStore((s) => s.aerospaceSubType);

  // Calculate weight breakdown
  const weightBreakdown = useMemo(() => {
    const engineDef = getEngineDefinition(engineType);
    const engineWeight = engineDef
      ? Math.ceil(engineRating / 25) * 0.5 * engineDef.weightMultiplier
      : 0;

    // Simplified equipment weight
    const equipmentWeight = equipment.length * 1;

    // Cockpit weight (~3 tons for standard)
    const cockpitWeight = 3;

    // Structure weight (roughly 10% of tonnage)
    const structureWeight = tonnage * 0.1;

    const totalUsed =
      engineWeight +
      armorTonnage +
      equipmentWeight +
      cockpitWeight +
      structureWeight;
    const remaining = tonnage - totalUsed;

    return {
      engine: engineWeight,
      armor: armorTonnage,
      equipment: equipmentWeight,
      total: totalUsed,
      remaining,
    };
  }, [tonnage, engineType, engineRating, armorTonnage, equipment.length]);

  // Calculate armor stats
  const armorStats = useMemo(() => {
    const allocated = getTotalAerospaceArmor(armorAllocation);
    const armorDef = getArmorDefinition(armorType);
    const pointsPerTon = armorDef?.pointsPerTon ?? 16;
    const available = Math.floor(armorTonnage * pointsPerTon);

    return {
      allocated,
      available,
      unallocated: available - allocated,
    };
  }, [armorAllocation, armorType, armorTonnage]);

  // Heat dissipation
  const heatDissipation = doubleHeatSinks ? heatSinks * 2 : heatSinks;

  // Live BV breakdown (TechManual BV 2.0 aerospace path)
  const bv = useMemo(() => {
    const bvEquipment: IAerospaceBVEquipment[] = equipment.map((item) => ({
      id: item.equipmentId,
      location: item.location,
    }));
    return calculateAerospaceBV({
      subType: aerospaceSubType,
      tonnage,
      structuralIntegrity,
      safeThrust,
      maxThrust,
      armorType,
      totalArmorPoints: armorStats.allocated,
      equipment: bvEquipment,
    });
  }, [
    aerospaceSubType,
    tonnage,
    structuralIntegrity,
    safeThrust,
    maxThrust,
    armorType,
    armorStats.allocated,
    equipment,
  ]);

  // Locate the highest-contribution arc for status-bar display
  const primaryArcLabel = useMemo(() => {
    if (!bv.primaryArc) return '—';
    const labels: Record<string, string> = {
      Nose: 'Nose',
      LeftWing: 'L Wing',
      RightWing: 'R Wing',
      LeftSide: 'L Side',
      RightSide: 'R Side',
      Aft: 'Aft',
    };
    return labels[bv.primaryArc] ?? bv.primaryArc;
  }, [bv.primaryArc]);

  // Status indicators
  const weightStatus =
    weightBreakdown.remaining < 0
      ? 'error'
      : weightBreakdown.remaining === 0
        ? 'success'
        : 'normal';
  const armorStatus =
    armorStats.unallocated < 0
      ? 'error'
      : armorStats.unallocated > 0
        ? 'warning'
        : 'success';

  if (compact) {
    return (
      <div
        className={`bg-surface-base border-border-theme-subtle flex items-center justify-between gap-2 border-b px-3 py-1.5 text-xs ${className}`}
      >
        <span className="font-medium text-white">{tonnage}t ASF</span>
        <span className="text-text-theme-secondary">
          {safeThrust}/{maxThrust} Thrust
        </span>
        <span className="text-text-theme-secondary">{fuel} Fuel</span>
        <span
          className={
            armorStatus === 'error'
              ? 'text-red-400'
              : 'text-text-theme-secondary'
          }
        >
          {armorStats.allocated} armor
        </span>
        <span
          className={
            weightStatus === 'error'
              ? 'text-red-400'
              : 'text-text-theme-secondary'
          }
        >
          {weightBreakdown.remaining.toFixed(1)}t free
        </span>
        <span className="font-medium text-white">BV {bv.final}</span>
      </div>
    );
  }

  return (
    <div
      className={`bg-surface-base border-border-theme-subtle flex items-center justify-between border-b ${className}`}
    >
      {/* Tonnage */}
      <StatusItem label="Tonnage" value={`${tonnage}t`} subValue="ASF" />

      {/* Weight Available */}
      <StatusItem
        label="Weight Free"
        value={`${weightBreakdown.remaining.toFixed(1)}t`}
        subValue={`${((weightBreakdown.remaining / tonnage) * 100).toFixed(0)}%`}
        status={weightStatus}
      />

      {/* Thrust */}
      <StatusItem
        label="Thrust"
        value={`${safeThrust}/${maxThrust}`}
        subValue="Safe/Max"
      />

      {/* Fuel */}
      <StatusItem label="Fuel" value={fuel} subValue="points" />

      {/* Structural Integrity */}
      <StatusItem label="SI" value={structuralIntegrity} />

      {/* Armor */}
      <StatusItem
        label="Armor"
        value={armorStats.allocated}
        subValue={
          armorStats.unallocated !== 0
            ? `${armorStats.unallocated > 0 ? '+' : ''}${armorStats.unallocated}`
            : 'allocated'
        }
        status={armorStatus}
      />

      {/* Heat */}
      <StatusItem
        label="Heat"
        value={heatDissipation}
        subValue={doubleHeatSinks ? 'DHS' : 'SHS'}
      />

      {/* Equipment Count */}
      <StatusItem label="Equipment" value={equipment.length} subValue="items" />

      {/* Battle Value */}
      <StatusItem
        label="Battle Value"
        value={bv.final}
        subValue={`D ${Math.round(bv.defensive)} / O ${Math.round(bv.offensive)}`}
      />

      {/* Primary Arc */}
      <StatusItem
        label="Primary Arc"
        value={primaryArcLabel}
        subValue={`SF ×${bv.speedFactor.toFixed(2)}`}
      />
    </div>
  );
}

export default AerospaceStatusBar;
