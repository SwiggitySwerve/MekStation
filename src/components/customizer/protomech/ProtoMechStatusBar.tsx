/**
 * ProtoMech Status Bar Component.
 *
 * Displays a compact banner with the key ProtoMech statistics:
 *   - Tonnage and chassis type
 *   - Walk / Flank / Jump MP
 *   - Total armor allocated
 *   - BV 2.0 (single-unit) from {@link calculateProtoMechBV}
 *   - Point BV (5 × single BV) — matches Task 6 point-aggregation semantics
 *
 * Reads the live store via {@link useProtoMechStore}. Uses a synthesised
 * `IProtoMechUnit` shape so the BV calculator can consume the store without
 * a round trip through the persistence layer.
 *
 * @spec openspec/changes/add-protomech-battle-value/tasks.md §8
 * @spec openspec/changes/add-protomech-battle-value/specs/protomech-unit-system/spec.md
 */

import React, { useMemo } from 'react';

import { useProtoMechStore } from '@/stores/useProtoMechStore';
import {
  ProtoChassis,
  type IProtoMechUnit,
} from '@/types/unit/ProtoMechInterfaces';
import { calculateProtoMechBV } from '@/utils/construction/protomech/protoMechBV';

// =============================================================================
// Types
// =============================================================================

interface ProtoMechStatusBarProps {
  /** Additional CSS classes */
  className?: string;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Gunnery skill override (defaults to 4 = baseline) */
  gunnery?: number;
  /** Piloting skill override (defaults to 5 = baseline) */
  piloting?: number;
}

interface StatusItemProps {
  label: string;
  value: string | number;
  subValue?: string;
  status?: 'normal' | 'warning' | 'error' | 'success';
}

// =============================================================================
// Status Item
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
// Helpers
// =============================================================================

/**
 * Sum all per-location numeric values (armor or structure) into a total.
 * Kept local so the status bar does not depend on calculator internals.
 */
function sumByLocation(rec: unknown): number {
  if (!rec || typeof rec !== 'object') return 0;
  let total = 0;
  for (const v of Object.values(rec as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v)) total += v;
  }
  return total;
}

/** Human label for a `ProtoChassis` value. */
function chassisLabel(c: ProtoChassis): string {
  switch (c) {
    case ProtoChassis.BIPED:
      return 'BIPED';
    case ProtoChassis.QUAD:
      return 'QUAD';
    case ProtoChassis.GLIDER:
      return 'GLIDER';
    case ProtoChassis.ULTRAHEAVY:
      return 'UHVY';
    default:
      return String(c).toUpperCase();
  }
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Compact status bar showing ProtoMech stats + BV.
 *
 * The BV breakdown is recomputed on every relevant store change (tonnage,
 * chassis, MP, equipment, armor, structure). The point BV is `final × 5` per
 * §6 point-aggregation semantics — used for force-level reporting only.
 */
export function ProtoMechStatusBar({
  className = '',
  compact = false,
  gunnery = 4,
  piloting = 5,
}: ProtoMechStatusBarProps): React.ReactElement {
  // Store slices — one hook per slice so only the relevant fields trigger
  // re-render (matches the pattern used by the other per-type status bars).
  const tonnage = useProtoMechStore((s) => s.tonnage);
  const chassisType = useProtoMechStore((s) => s.chassisType);
  const walkMP = useProtoMechStore((s) => s.walkMP);
  const flankMP = useProtoMechStore((s) => s.flankMP);
  const jumpMP = useProtoMechStore((s) => s.jumpMP);
  const equipment = useProtoMechStore((s) => s.equipment);
  const armorByLocation = useProtoMechStore((s) => s.armorByLocation);
  const structureByLocation = useProtoMechStore((s) => s.structureByLocation);
  const unitType = useProtoMechStore((s) => s.unitType);
  const techBase = useProtoMechStore((s) => s.techBase);
  const mulId = useProtoMechStore((s) => s.mulId);

  const totalArmor = useMemo(
    () => sumByLocation(armorByLocation),
    [armorByLocation],
  );

  // Synthesise just enough of the `IProtoMechUnit` shape for the calculator.
  // The BV path only reads tonnage / chassis / MP / equipment / armor /
  // structure — matching the shape of the persisted proto unit record.
  const breakdown = useMemo(() => {
    const unit = {
      id: mulId,
      unitType,
      techBase,
      tonnage,
      chassisType,
      walkMP,
      runMP: flankMP,
      jumpMP,
      armorByLocation,
      structureByLocation,
      equipment,
    } as unknown as IProtoMechUnit;
    return calculateProtoMechBV(unit, { gunnery, piloting });
  }, [
    mulId,
    unitType,
    techBase,
    tonnage,
    chassisType,
    walkMP,
    flankMP,
    jumpMP,
    armorByLocation,
    structureByLocation,
    equipment,
    gunnery,
    piloting,
  ]);

  // Point BV = single BV × 5 (standard proto point size).
  const pointBV = breakdown.final * 5;

  if (compact) {
    return (
      <div
        className={`bg-surface-base border-border-theme-subtle flex items-center justify-between gap-2 border-b px-3 py-1.5 text-xs ${className}`}
      >
        <span className="font-medium text-white">
          {tonnage}t {chassisLabel(chassisType)}
        </span>
        <span className="text-text-theme-secondary">
          {walkMP}/{flankMP}
          {jumpMP > 0 ? `/${jumpMP}J` : ''}
        </span>
        <span className="text-text-theme-secondary">{totalArmor} armor</span>
        <span className="font-semibold text-white">
          BV {breakdown.final}
          <span className="text-text-theme-secondary ml-1 font-normal">
            (pt {pointBV})
          </span>
        </span>
      </div>
    );
  }

  return (
    <div
      className={`bg-surface-base border-border-theme-subtle flex items-center justify-between border-b ${className}`}
      data-testid="proto-status-bar"
    >
      <StatusItem
        label="Tonnage"
        value={`${tonnage}t`}
        subValue={chassisLabel(chassisType)}
      />

      <StatusItem
        label="Movement"
        value={`${walkMP}/${flankMP}${jumpMP > 0 ? `/${jumpMP}J` : ''}`}
        subValue="Walk/Flank/Jump"
      />

      <StatusItem
        label="Armor"
        value={totalArmor}
        subValue="points allocated"
      />

      <StatusItem
        label="Structure"
        value={sumByLocation(structureByLocation)}
        subValue="points"
      />

      <StatusItem
        label="BV"
        value={breakdown.final}
        subValue={`def ${Math.round(breakdown.defensiveBV)} / off ${Math.round(breakdown.offensiveBV)}`}
        status="success"
      />

      <StatusItem
        label="Point BV"
        value={pointBV}
        subValue="5-proto aggregate"
      />
    </div>
  );
}

export default ProtoMechStatusBar;
