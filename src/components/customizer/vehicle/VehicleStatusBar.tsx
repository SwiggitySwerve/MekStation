/**
 * Vehicle Status Bar Component
 *
 * Displays key vehicle statistics in a compact bar format.
 * Shows tonnage allocation, movement points, armor coverage, and validation status.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 3.6
 */

import React, { useMemo, useState } from 'react';

import { useVehicleStore, type VehicleStore } from '@/stores/useVehicleStore';
import { getTotalVehicleArmor } from '@/stores/vehicleState';
import { getArmorDefinition } from '@/types/construction/ArmorType';
import {
  EngineType,
  getEngineDefinition,
} from '@/types/construction/EngineType';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { computeVehicleBVFromState } from '@/utils/construction/vehicle/vehicleBVAdapter';
import { validateVehicleConstruction } from '@/utils/construction/vehicle/vehicleValidation';

import { StatusItem, type StatusLevel } from '../tabs/StatusItem';
import { VehicleBVBreakdownDialog } from './VehicleBVBreakdownDialog';

// =============================================================================
// Types
// =============================================================================

interface VehicleStatusBarProps {
  /** Additional CSS classes */
  className?: string;
  /** Compact mode for smaller displays */
  compact?: boolean;
}
type VehicleBvBreakdown = ReturnType<typeof computeVehicleBVFromState>;
type VehicleValidation = ReturnType<typeof validateVehicleConstruction>;

type VehicleStatusStoreState = Pick<
  VehicleStore,
  | 'tonnage'
  | 'motionType'
  | 'cruiseMP'
  | 'engineType'
  | 'engineRating'
  | 'armorType'
  | 'armorTonnage'
  | 'armorAllocation'
  | 'turret'
  | 'secondaryTurret'
  | 'barRating'
  | 'equipment'
  | 'crewSize'
  | 'structureType'
  | 'powerAmpWeight'
>;

// =============================================================================
// Helper Functions
// =============================================================================

const MOTION_LABELS: Record<GroundMotionType, string> = {
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

/**
 * Calculate engine weight based on type and rating
 */
function calculateEngineWeight(
  engineRating: number,
  engineType: EngineType,
): number {
  const engineDef = getEngineDefinition(engineType);
  if (!engineDef) return 0;

  // Base engine weight calculation (simplified)
  const baseWeight = Math.ceil(engineRating / 25) * 0.5;
  return baseWeight * engineDef.weightMultiplier;
}

function getWeightStatus(remainingWeight: number): StatusLevel {
  if (remainingWeight < 0) return 'error';
  if (remainingWeight === 0) return 'success';
  return 'normal';
}

function getArmorStatus(unallocatedArmor: number): StatusLevel {
  if (unallocatedArmor < 0) return 'error';
  if (unallocatedArmor > 0) return 'warning';
  return 'success';
}

function getCompactStatusClass(status: StatusLevel): string {
  if (status === 'error') return 'text-red-400';
  return 'text-text-theme-secondary';
}

function getArmorSubValue(unallocatedArmor: number): string {
  if (unallocatedArmor === 0) return 'allocated';
  const sign = unallocatedArmor > 0 ? '+' : '';
  return `${sign}${unallocatedArmor} unalloc`;
}

function getTurretStatus(
  currentWeight: number,
  maxWeight: number,
): StatusLevel {
  if (currentWeight > maxWeight) return 'error';
  return 'normal';
}

function getValidationValue(validationResult: VehicleValidation): string {
  if (validationResult.isValid) return 'OK';
  return `${validationResult.errors.length} err`;
}

function getValidationSubValue(
  validationResult: VehicleValidation,
): string | undefined {
  if (validationResult.isValid) return 'passes';
  return validationResult.errors[0]?.ruleId;
}

function calculateWeightBreakdown(state: VehicleStatusStoreState) {
  const engineWeight = calculateEngineWeight(
    state.engineRating,
    state.engineType,
  );
  const armorWeight = state.armorTonnage;

  // Simplified equipment weight (would need equipment database for real values)
  const equipmentWeight = state.equipment.length * 1; // Placeholder

  // Turret weight (typically 10% of weapon weight in turret)
  const turretWeight = state.turret?.currentWeight ?? 0;

  // Internal structure (roughly 10% of tonnage)
  const structureWeight = state.tonnage * 0.1;

  const totalUsed =
    engineWeight +
    armorWeight +
    equipmentWeight +
    turretWeight +
    structureWeight;

  return { remaining: state.tonnage - totalUsed };
}

function calculateArmorStats(
  state: VehicleStatusStoreState,
  hasTurret: boolean,
  hasSecondaryTurret: boolean,
) {
  const allocated = getTotalVehicleArmor(
    state.armorAllocation,
    hasTurret,
    hasSecondaryTurret,
  );
  const armorDef = getArmorDefinition(state.armorType);
  const pointsPerTon = armorDef?.pointsPerTon ?? 16;
  const available = Math.floor(state.armorTonnage * pointsPerTon);

  return {
    allocated,
    unallocated: available - allocated,
  };
}

function computeBvBreakdown(
  state: VehicleStatusStoreState,
): VehicleBvBreakdown | null {
  try {
    return computeVehicleBVFromState({
      motionType: state.motionType,
      tonnage: state.tonnage,
      cruiseMP: state.cruiseMP,
      armorType: String(state.armorType),
      armorAllocation: state.armorAllocation as Record<string, unknown>,
      structureType: String(state.structureType),
      turret: state.turret ? { type: state.turret.type } : null,
      secondaryTurret: state.secondaryTurret
        ? { type: state.secondaryTurret.type }
        : null,
      barRating: state.barRating,
      equipment: state.equipment,
    });
  } catch {
    return null;
  }
}

function validateStatusBarState(
  state: VehicleStatusStoreState,
): VehicleValidation {
  return validateVehicleConstruction({
    tonnage: state.tonnage,
    motionType: state.motionType,
    engineType: state.engineType,
    cruiseMP: state.cruiseMP,
    turretType: state.turret?.type ?? TurretType.NONE,
    turretEquipmentWeight: 0, // equipment weights not fully resolved here
    turretStructureWeight: state.turret?.currentWeight ?? 0,
    secondaryTurretEquipmentWeight: 0,
    secondaryTurretStructureWeight: 0,
    armorType: state.armorType,
    armorAllocation: state.armorAllocation as Record<string, number>,
    crewSize: state.crewSize,
    energyWeaponWeight: 0, // resolved by equipment tab; power amp check deferred
    powerAmpWeight: state.powerAmpWeight,
    structureType: state.structureType,
  });
}

function useVehicleStatusStoreState(): VehicleStatusStoreState {
  return {
    tonnage: useVehicleStore((s) => s.tonnage),
    motionType: useVehicleStore((s) => s.motionType),
    cruiseMP: useVehicleStore((s) => s.cruiseMP),
    engineType: useVehicleStore((s) => s.engineType),
    engineRating: useVehicleStore((s) => s.engineRating),
    armorType: useVehicleStore((s) => s.armorType),
    armorTonnage: useVehicleStore((s) => s.armorTonnage),
    armorAllocation: useVehicleStore((s) => s.armorAllocation),
    turret: useVehicleStore((s) => s.turret),
    secondaryTurret: useVehicleStore((s) => s.secondaryTurret),
    barRating: useVehicleStore((s) => s.barRating),
    equipment: useVehicleStore((s) => s.equipment),
    crewSize: useVehicleStore((s) => s.crewSize),
    structureType: useVehicleStore((s) => s.structureType),
    powerAmpWeight: useVehicleStore((s) => s.powerAmpWeight),
  };
}

function useVehicleStatusViewState(storeState: VehicleStatusStoreState) {
  const hasTurret = storeState.turret !== null;
  const hasSecondaryTurret = storeState.secondaryTurret !== null;

  const weightBreakdown = useMemo(
    () => calculateWeightBreakdown(storeState),
    [
      storeState.tonnage,
      storeState.engineRating,
      storeState.engineType,
      storeState.armorTonnage,
      storeState.equipment.length,
      storeState.turret,
    ],
  );

  const armorStats = useMemo(
    () => calculateArmorStats(storeState, hasTurret, hasSecondaryTurret),
    [
      storeState.armorAllocation,
      hasTurret,
      hasSecondaryTurret,
      storeState.armorType,
      storeState.armorTonnage,
    ],
  );

  // Compute live Battle Value (defensive/offensive split + pilot-adjusted final)
  // @spec openspec/changes/add-vehicle-battle-value/specs/vehicle-unit-system/spec.md
  const bvBreakdown = useMemo(
    () => computeBvBreakdown(storeState),
    [
      storeState.motionType,
      storeState.tonnage,
      storeState.cruiseMP,
      storeState.armorType,
      storeState.armorAllocation,
      storeState.structureType,
      storeState.turret,
      storeState.secondaryTurret,
      storeState.barRating,
      storeState.equipment,
    ],
  );

  // Run full VAL-VEHICLE-* validation result surfaced in status bar.
  const validationResult = useMemo(
    () => validateStatusBarState(storeState),
    [
      storeState.tonnage,
      storeState.motionType,
      storeState.engineType,
      storeState.cruiseMP,
      storeState.turret,
      storeState.armorType,
      storeState.armorAllocation,
      storeState.crewSize,
      storeState.powerAmpWeight,
      storeState.structureType,
    ],
  );

  return {
    ...storeState,
    armorStats,
    armorStatus: getArmorStatus(armorStats.unallocated),
    bvBreakdown,
    flankMP: Math.floor(storeState.cruiseMP * 1.5),
    motionLabel: MOTION_LABELS[storeState.motionType],
    validationResult,
    weightBreakdown,
    weightStatus: getWeightStatus(weightBreakdown.remaining),
  };
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
  const storeState = useVehicleStatusStoreState();
  const viewState = useVehicleStatusViewState(storeState);
  const [bvDialogOpen, setBvDialogOpen] = useState(false);
  const {
    armorStats,
    armorStatus,
    bvBreakdown,
    cruiseMP,
    equipment,
    flankMP,
    tonnage,
    turret,
    validationResult,
    weightBreakdown,
    weightStatus,
  } = viewState;

  // Run full VAL-VEHICLE-* validation — result surfaced in status bar
  if (compact) {
    return (
      <div
        className={`bg-surface-base border-border-theme-subtle flex items-center justify-between gap-2 border-b px-3 py-1.5 text-xs ${className}`}
      >
        <span className="font-medium text-white">
          {tonnage}t {viewState.motionLabel}
        </span>
        <span className="text-text-theme-secondary">
          {cruiseMP}/{flankMP} MP
        </span>
        <span className={getCompactStatusClass(armorStatus)}>
          {armorStats.allocated} armor
        </span>
        <span className={getCompactStatusClass(weightStatus)}>
          {weightBreakdown.remaining.toFixed(1)}t free
        </span>
        {bvBreakdown && (
          <span className="font-medium text-white" title="Battle Value">
            BV {bvBreakdown.final}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`bg-surface-base border-border-theme-subtle flex items-center justify-between border-b ${className}`}
    >
      <StatusItem
        label="Tonnage"
        value={`${tonnage}t`}
        subValue={viewState.motionLabel}
      />

      <StatusItem
        label="Weight Free"
        value={`${weightBreakdown.remaining.toFixed(1)}t`}
        subValue={`${((weightBreakdown.remaining / tonnage) * 100).toFixed(0)}%`}
        status={weightStatus}
      />

      <StatusItem
        label="Movement"
        value={`${cruiseMP}/${flankMP}`}
        subValue="Cruise/Flank"
      />

      <StatusItem
        label="Armor"
        value={armorStats.allocated}
        subValue={
          armorStats.unallocated !== 0
            ? `${armorStats.unallocated > 0 ? '+' : ''}${armorStats.unallocated} unalloc`
            : 'allocated'
        }
        status={armorStatus}
      />

      {turret && (
        <StatusItem
          label="Turret"
          value={`${turret.currentWeight.toFixed(1)}t`}
          subValue={`/${turret.maxWeight.toFixed(1)}t`}
          status={turret.currentWeight > turret.maxWeight ? 'error' : 'normal'}
        />
      )}

      <StatusItem label="Equipment" value={equipment.length} subValue="items" />

      {/* Battle Value — final + defensive/offensive split; click opens dialog */}
      {bvBreakdown && (
        <button
          type="button"
          onClick={() => setBvDialogOpen(true)}
          className="hover:bg-surface-hover focus:ring-accent-theme/40 rounded transition focus:ring-2 focus:outline-none"
          aria-label="Show Battle Value breakdown"
          data-testid="vehicle-bv-status-item"
        >
          <StatusItem
            label="BV"
            value={bvBreakdown.final}
            subValue={`${Math.round(bvBreakdown.defensive)}D / ${Math.round(bvBreakdown.offensive)}O`}
          />
        </button>
      )}

      <StatusItem
        label="Valid"
        value={
          validationResult.isValid
            ? 'OK'
            : `${validationResult.errors.length} err`
        }
        subValue={
          validationResult.isValid
            ? 'passes'
            : validationResult.errors[0]?.ruleId
        }
        status={validationResult.isValid ? 'success' : 'error'}
      />

      {bvDialogOpen && bvBreakdown && (
        <VehicleBVBreakdownDialog
          breakdown={bvBreakdown}
          onClose={() => setBvDialogOpen(false)}
        />
      )}
    </div>
  );
}

export default VehicleStatusBar;
