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
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { getInstalledArmorAllocation } from '@/utils/construction/vehicle/armor';
import { getVehicleArmorProfile } from '@/utils/construction/vehicle/armorLimits';
import { getVehicleArmorEditorFigures } from '@/utils/construction/vehicle/editorArmor';
import { computeFlankMP } from '@/utils/construction/vehicle/engine';
import { computeVehicleBVFromState } from '@/utils/construction/vehicle/vehicleBVAdapter';
import { validateVehicleConstruction } from '@/utils/construction/vehicle/vehicleValidation';
import { formatTons } from '@/utils/formatting';

import { StatusItem, type StatusLevel } from '../tabs/StatusItem';
import { VehicleBVBreakdownDialog } from './VehicleBVBreakdownDialog';
import {
  computeVehicleWeightBreakdown,
  formatVehicleWeight,
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
  | 'techBase'
  | 'transporters'
  | 'year'
  | 'hasEnvironmentalSealing'
  | 'hasFlotationHull'
  | 'hasNoControlSystems'
  | 'tonnage'
  | 'motionType'
  | 'cruiseMP'
  | 'engineType'
  | 'engineRating'
  | 'engineTechRating'
  | 'structuralTechRating'
  | 'isOmni'
  | 'baseChassisTurretWeight'
  | 'baseChassisSecondaryTurretWeight'
  | 'armorType'
  | 'armorTonnage'
  | 'usesBarArmor'
  | 'armorTechRating'
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

function getWeightStatus(remainingWeight: number | null): StatusLevel {
  if (remainingWeight === null) return 'warning';
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
  if (status === 'warning') return 'text-warning';
  return 'text-text-theme-secondary';
}

function calculateWeightBreakdown(
  state: Pick<
    VehicleStatusStoreState,
    | 'unitType'
    | 'techBase'
    | 'transporters'
    | 'year'
    | 'hasNoControlSystems'
    | 'tonnage'
    | 'motionType'
    | 'engineRating'
    | 'engineType'
    | 'engineTechRating'
    | 'structuralTechRating'
    | 'isOmni'
    | 'baseChassisTurretWeight'
    | 'baseChassisSecondaryTurretWeight'
    | 'cruiseMP'
    | 'structureType'
    | 'armorTonnage'
    | 'armorType'
    | 'equipment'
    | 'turret'
    | 'secondaryTurret'
    | 'powerAmpWeight'
  >,
  catalogReady: boolean,
): VehicleWeightBreakdown {
  // Before catalog readiness, mounted definitions remain unresolved.
  const lookup = getEquipmentLookupService();
  return computeVehicleWeightBreakdown(state, (equipmentId, isAmmo) =>
    catalogReady
      ? lookup.getMountedById(equipmentId, isAmmo === true)
      : undefined,
  );
}

function calculateArmorStats(
  state: Pick<
    VehicleStatusStoreState,
    | 'tonnage'
    | 'unitType'
    | 'motionType'
    | 'usesBarArmor'
    | 'armorTechRating'
    | 'barRating'
    | 'armorType'
    | 'armorTonnage'
    | 'armorAllocation'
    | 'turret'
    | 'secondaryTurret'
  >,
): { allocated: number; unallocated: number } {
  const figures = getVehicleArmorEditorFigures({
    ...state,
    profile: getVehicleArmorProfile(state),
  });
  return {
    allocated: figures.allocatedPoints,
    unallocated: figures.unallocatedPoints,
  };
}

function computeBvBreakdown(
  state: Pick<
    VehicleStatusStoreState,
    | 'unitType'
    | 'hasEnvironmentalSealing'
    | 'hasFlotationHull'
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
      unitType: state.unitType,
      hasEnvironmentalSealing: state.hasEnvironmentalSealing,
      hasFlotationHull: state.hasFlotationHull,
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
    | 'engineTechRating'
    | 'cruiseMP'
    | 'turret'
    | 'secondaryTurret'
    | 'isOmni'
    | 'baseChassisTurretWeight'
    | 'baseChassisSecondaryTurretWeight'
    | 'armorType'
    | 'armorAllocation'
    | 'crewSize'
    | 'structureType'
  >,
  weights: VehicleWeightBreakdown,
): VehicleValidation {
  return validateVehicleConstruction({
    weightCalculationComplete: weights.isComplete,
    unitType: state.unitType,
    hasNoControlSystems: state.hasNoControlSystems,
    tonnage: state.tonnage,
    motionType: state.motionType,
    engineType: state.engineType,
    engineTechRating: state.engineTechRating,
    cruiseMP: state.cruiseMP,
    turretType: state.turret?.type ?? TurretType.NONE,
    secondaryTurretType: state.secondaryTurret?.type ?? TurretType.NONE,
    isOmni: state.isOmni,
    baseChassisTurretWeight: state.baseChassisTurretWeight,
    baseChassisSecondaryTurretWeight: state.baseChassisSecondaryTurretWeight,
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
    techBase: useVehicleStore((s) => s.techBase),
    transporters: useVehicleStore((s) => s.transporters),
    year: useVehicleStore((s) => s.year),
    hasEnvironmentalSealing: useVehicleStore((s) => s.hasEnvironmentalSealing),
    hasFlotationHull: useVehicleStore((s) => s.hasFlotationHull),
    hasNoControlSystems: useVehicleStore((s) => s.hasNoControlSystems),
    tonnage: useVehicleStore((s) => s.tonnage),
    motionType: useVehicleStore((s) => s.motionType),
    cruiseMP: useVehicleStore((s) => s.cruiseMP),
    engineType: useVehicleStore((s) => s.engineType),
    engineRating: useVehicleStore((s) => s.engineRating),
    engineTechRating: useVehicleStore((s) => s.engineTechRating),
    structuralTechRating: useVehicleStore((s) => s.structuralTechRating),
    isOmni: useVehicleStore((s) => s.isOmni),
    baseChassisTurretWeight: useVehicleStore((s) => s.baseChassisTurretWeight),
    baseChassisSecondaryTurretWeight: useVehicleStore(
      (s) => s.baseChassisSecondaryTurretWeight,
    ),
    armorType: useVehicleStore((s) => s.armorType),
    armorTonnage: useVehicleStore((s) => s.armorTonnage),
    armorAllocation: useVehicleStore((s) => s.armorAllocation),
    turret: useVehicleStore((s) => s.turret),
    secondaryTurret: useVehicleStore((s) => s.secondaryTurret),
    barRating: useVehicleStore((s) => s.barRating),
    armorTechRating: useVehicleStore((s) => s.armorTechRating),
    usesBarArmor: useVehicleStore((s) => s.usesBarArmor),
    equipment: useVehicleStore((s) => s.equipment),
    crewSize: useVehicleStore((s) => s.crewSize),
    structureType: useVehicleStore((s) => s.structureType),
    powerAmpWeight: useVehicleStore((s) => s.powerAmpWeight),
  };
}

function useVehicleStatusViewState(storeState: VehicleStatusStoreState) {
  const {
    unitType,
    techBase,
    transporters,
    year,
    hasEnvironmentalSealing,
    hasFlotationHull,
    hasNoControlSystems,
    tonnage,
    motionType,
    cruiseMP,
    engineType,
    engineRating,
    engineTechRating,
    structuralTechRating,
    isOmni,
    baseChassisTurretWeight,
    baseChassisSecondaryTurretWeight,
    armorType,
    armorTonnage,
    armorAllocation,
    turret,
    secondaryTurret,
    barRating,
    armorTechRating,
    usesBarArmor,
    equipment,
    crewSize,
    structureType,
    powerAmpWeight,
  } = storeState;
  const { isReady: catalogReady } = useEquipmentRegistry();

  const weightBreakdown = useMemo(
    () =>
      calculateWeightBreakdown(
        {
          unitType,
          techBase,
          transporters,
          year,
          hasNoControlSystems,
          tonnage,
          motionType,
          engineRating,
          engineType,
          engineTechRating,
          structuralTechRating,
          isOmni,
          baseChassisTurretWeight,
          baseChassisSecondaryTurretWeight,
          cruiseMP,
          structureType,
          armorTonnage,
          armorType,
          equipment,
          turret,
          secondaryTurret,
          powerAmpWeight,
        },
        catalogReady,
      ),
    [
      unitType,
      techBase,
      transporters,
      year,
      hasNoControlSystems,
      tonnage,
      motionType,
      engineRating,
      engineType,
      engineTechRating,
      structuralTechRating,
      isOmni,
      baseChassisTurretWeight,
      baseChassisSecondaryTurretWeight,
      cruiseMP,
      structureType,
      armorTonnage,
      armorType,
      equipment,
      turret,
      secondaryTurret,
      powerAmpWeight,
      catalogReady,
    ],
  );

  const armorStats = useMemo(
    () =>
      calculateArmorStats({
        tonnage,
        unitType,
        motionType,
        usesBarArmor,
        armorTechRating,
        barRating,
        armorType,
        armorTonnage,
        armorAllocation,
        turret,
        secondaryTurret,
      }),
    [
      tonnage,
      unitType,
      motionType,
      usesBarArmor,
      armorTechRating,
      barRating,
      armorType,
      armorTonnage,
      armorAllocation,
      turret,
      secondaryTurret,
    ],
  );

  // Compute live Battle Value (defensive/offensive split + pilot-adjusted final)
  // @spec openspec/changes/add-vehicle-battle-value/specs/vehicle-unit-system/spec.md
  const bvBreakdown = useMemo(
    () =>
      computeBvBreakdown({
        unitType,
        hasEnvironmentalSealing,
        hasFlotationHull,
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
      unitType,
      hasEnvironmentalSealing,
      hasFlotationHull,
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
          engineTechRating,
          cruiseMP,
          turret,
          secondaryTurret,
          isOmni,
          baseChassisTurretWeight,
          baseChassisSecondaryTurretWeight,
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
      secondaryTurret,
      isOmni,
      baseChassisTurretWeight,
      baseChassisSecondaryTurretWeight,
      armorType,
      armorAllocation,
      crewSize,
      structureType,
      weightBreakdown,
      engineTechRating,
    ],
  );

  const massPending =
    !catalogReady && weightBreakdown.unresolvedMountIds.length > 0;
  const validationStatus: StatusLevel = validationResult.isValid
    ? 'success'
    : validationResult.errors.length
      ? 'error'
      : 'warning';
  return {
    ...storeState,
    armorStats,
    armorStatus: getArmorStatus(armorStats.unallocated),
    bvBreakdown,
    flankMP: computeFlankMP(storeState.cruiseMP),
    motionLabel: MOTION_LABELS[storeState.motionType],
    validationResult,
    validationStatus,
    validationText: validationResult.isValid
      ? 'OK'
      : validationResult.errors.length
        ? `${validationResult.errors.length} err`
        : massPending
          ? 'Loading'
          : 'Incomplete',
    validationHint: validationResult.isValid
      ? 'passes'
      : (validationResult.errors[0]?.ruleId ?? 'Mass unavailable'),
    weightText: formatVehicleWeight(weightBreakdown.remaining, massPending),
    turretMountedText: formatVehicleWeight(
      weightBreakdown.turretMounted,
      massPending,
    ),
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
    validationText,
    validationHint,
    validationStatus,
    weightText,
    turretMountedText,
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
          {weightText} free
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
        value={weightText}
        subValue={
          weightBreakdown.remaining === null
            ? undefined
            : `${((weightBreakdown.remaining / tonnage) * 100).toFixed(0)}%`
        }
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
          value={turretMountedText}
          subValue="mounted"
          status={weightStatus}
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
        value={validationText}
        subValue={validationHint}
        status={validationStatus}
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
