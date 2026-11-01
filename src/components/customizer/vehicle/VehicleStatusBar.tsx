/**
 * Vehicle Status Bar Component
 *
 * Displays key vehicle statistics in a compact bar format.
 * Shows tonnage allocation, movement points, armor coverage, and validation status.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 3.6
 */

import React, { useMemo, useState } from 'react';

import { useEquipmentRegistry } from '@/hooks/useEquipmentRegistry';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { useVehicleStore, type VehicleStore } from '@/stores/useVehicleStore';
import { getTotalVehicleArmor } from '@/stores/vehicleState';
import { getArmorDefinition } from '@/types/construction/ArmorType';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { getInstalledArmorAllocation } from '@/utils/construction/vehicle/armor';
import { computeFlankMP } from '@/utils/construction/vehicle/engine';
import { computeVehicleBVFromState } from '@/utils/construction/vehicle/vehicleBVAdapter';
import { validateVehicleConstruction } from '@/utils/construction/vehicle/vehicleValidation';
import { formatTons } from '@/utils/formatting';

import { StatusItem, type StatusLevel } from '../tabs/StatusItem';
import { VehicleBVBreakdownDialog } from './VehicleBVBreakdownDialog';
import {
  computeVehicleWeightBreakdown,
  type VehicleWeightBreakdown,
} from './VehicleStatusBar.utils';

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
  | 'unitType'
  | 'hasNoControlSystems'
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

function calculateWeightBreakdown(
  state: Pick<
    VehicleStatusStoreState,
    | 'unitType'
    | 'hasNoControlSystems'
    | 'tonnage'
    | 'motionType'
    | 'engineRating'
    | 'engineType'
    | 'structureType'
    | 'armorTonnage'
    | 'equipment'
    | 'turret'
    | 'secondaryTurret'
    | 'powerAmpWeight'
  >,
  catalogReady: boolean,
): VehicleWeightBreakdown {
  // Before the catalog has loaded no mounted item can be resolved, so every
  // equipment-derived term is 0.
  const lookup = getEquipmentLookupService();
  return computeVehicleWeightBreakdown(state, (equipmentId) =>
    catalogReady ? lookup.getById(equipmentId) : undefined,
  );
}

function calculateArmorStats(
  state: Pick<
    VehicleStatusStoreState,
    'armorAllocation' | 'armorType' | 'armorTonnage'
  >,
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
  state: Pick<
    VehicleStatusStoreState,
    | 'motionType'
    | 'tonnage'
    | 'cruiseMP'
    | 'armorType'
    | 'armorAllocation'
    | 'structureType'
    | 'turret'
    | 'secondaryTurret'
    | 'barRating'
    | 'equipment'
  >,
): VehicleBvBreakdown | null {
  try {
    return computeVehicleBVFromState({
      motionType: state.motionType,
      tonnage: state.tonnage,
      cruiseMP: state.cruiseMP,
      armorType: String(state.armorType),
      armorAllocation: getInstalledArmorAllocation(
        state.armorAllocation,
        state.turret !== null,
        state.secondaryTurret !== null,
      ) as Record<string, unknown>,
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
  state: Pick<
    VehicleStatusStoreState,
    | 'unitType'
    | 'hasNoControlSystems'
    | 'tonnage'
    | 'motionType'
    | 'engineType'
    | 'cruiseMP'
    | 'turret'
    | 'armorType'
    | 'armorAllocation'
    | 'crewSize'
    | 'structureType'
  >,
  weights: VehicleWeightBreakdown,
): VehicleValidation {
  return validateVehicleConstruction({
    unitType: state.unitType,
    hasNoControlSystems: state.hasNoControlSystems,
    tonnage: state.tonnage,
    motionType: state.motionType,
    engineType: state.engineType,
    cruiseMP: state.cruiseMP,
    turretType: state.turret?.type ?? TurretType.NONE,
    turretEquipmentWeight: weights.turretEquipment,
    // Nothing declares turret structure weight; it is derived from the
    // turret's equipment, so the turret weight rule checks the derived value.
    turretStructureWeight: weights.turret,
    secondaryTurretEquipmentWeight: weights.secondaryTurretEquipment,
    secondaryTurretStructureWeight: weights.secondaryTurret,
    armorType: state.armorType,
    armorAllocation: state.armorAllocation as Record<string, number>,
    crewSize: state.crewSize,
    energyWeaponWeight: weights.energyWeapons,
    // Derived like the turret weight: the bar installs (and charges) the
    // amplifiers the energy weapons require.
    powerAmpWeight: weights.powerAmplifiers,
    structureType: state.structureType,
  });
}

function useVehicleStatusStoreState(): VehicleStatusStoreState {
  return {
    unitType: useVehicleStore((s) => s.unitType),
    hasNoControlSystems: useVehicleStore((s) => s.hasNoControlSystems),
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
  const {
    unitType,
    hasNoControlSystems,
    tonnage,
    motionType,
    cruiseMP,
    engineType,
    engineRating,
    armorType,
    armorTonnage,
    armorAllocation,
    turret,
    secondaryTurret,
    barRating,
    equipment,
    crewSize,
    structureType,
    powerAmpWeight,
  } = storeState;
  const { isReady: catalogReady } = useEquipmentRegistry();
  const hasTurret = turret !== null;
  const hasSecondaryTurret = secondaryTurret !== null;

  const weightBreakdown = useMemo(
    () =>
      calculateWeightBreakdown(
        {
          unitType,
          hasNoControlSystems,
          tonnage,
          motionType,
          engineRating,
          engineType,
          structureType,
          armorTonnage,
          equipment,
          turret,
          secondaryTurret,
          powerAmpWeight,
        },
        catalogReady,
      ),
    [
      unitType,
      hasNoControlSystems,
      tonnage,
      motionType,
      engineRating,
      engineType,
      structureType,
      armorTonnage,
      equipment,
      turret,
      secondaryTurret,
      powerAmpWeight,
      catalogReady,
    ],
  );

  const armorStats = useMemo(
    () =>
      calculateArmorStats(
        { armorAllocation, armorType, armorTonnage },
        hasTurret,
        hasSecondaryTurret,
      ),
    [armorAllocation, hasTurret, hasSecondaryTurret, armorType, armorTonnage],
  );

  // Compute live Battle Value (defensive/offensive split + pilot-adjusted final)
  // @spec openspec/changes/add-vehicle-battle-value/specs/vehicle-unit-system/spec.md
  const bvBreakdown = useMemo(
    () =>
      computeBvBreakdown({
        motionType,
        tonnage,
        cruiseMP,
        armorType,
        armorAllocation,
        structureType,
        turret,
        secondaryTurret,
        barRating,
        equipment,
      }),
    [
      motionType,
      tonnage,
      cruiseMP,
      armorType,
      armorAllocation,
      structureType,
      turret,
      secondaryTurret,
      barRating,
      equipment,
    ],
  );

  // Run full VAL-VEHICLE-* validation result surfaced in status bar.
  const validationResult = useMemo(
    () =>
      validateStatusBarState(
        {
          unitType,
          hasNoControlSystems,
          tonnage,
          motionType,
          engineType,
          cruiseMP,
          turret,
          armorType,
          armorAllocation,
          crewSize,
          structureType,
        },
        weightBreakdown,
      ),
    [
      unitType,
      hasNoControlSystems,
      tonnage,
      motionType,
      engineType,
      cruiseMP,
      turret,
      armorType,
      armorAllocation,
      crewSize,
      structureType,
      weightBreakdown,
    ],
  );

  return {
    ...storeState,
    armorStats,
    armorStatus: getArmorStatus(armorStats.unallocated),
    bvBreakdown,
    flankMP: computeFlankMP(storeState.cruiseMP),
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
        <span className="text-text-theme-primary font-medium">
          {formatTons(tonnage)} {viewState.motionLabel}
        </span>
        <span className="text-text-theme-secondary">
          {cruiseMP}/{flankMP} MP
        </span>
        <span className={getCompactStatusClass(armorStatus)}>
          {armorStats.allocated} armor
        </span>
        <span className={getCompactStatusClass(weightStatus)}>
          {formatTons(weightBreakdown.remaining)} free
        </span>
        {bvBreakdown && (
          <span
            className="text-text-theme-primary font-medium"
            title="Battle Value"
          >
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
        value={formatTons(tonnage)}
        subValue={viewState.motionLabel}
      />

      <StatusItem
        label="Weight Free"
        value={formatTons(weightBreakdown.remaining)}
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
          value={weightBreakdown.turretMounted.toFixed(1)}
          subValue={` / ${formatTons(turret.maxWeight)}`}
          status={
            weightBreakdown.turretMounted > turret.maxWeight
              ? 'error'
              : 'normal'
          }
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
