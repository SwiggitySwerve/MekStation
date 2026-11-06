import type { IUnitContract } from '@/types/contracts';
import type { IVehicleTurretSourceContext } from '@/types/unit/VehicleInterfaces';

type AllowanceTag = keyof Pick<
  IUnitContract,
  | 'baseChassisTurretWeight'
  | 'baseChassisTurret2Weight'
  | 'baseChassisSponsonPintleWeight'
>;
export const SECONDARY_TURRET_ALLOWANCE_TAG: AllowanceTag =
  'baseChassisTurret2Weight';

/** One owner for the secondary source/store rename and its VTOL applicability. */
export function mapVehicleTurretContext(
  isOmni: boolean | undefined,
  isVTOL: boolean,
  readAllowance: (tag: AllowanceTag) => number | undefined,
): IVehicleTurretSourceContext & { readonly isOmni: boolean } {
  return {
    isOmni: isOmni ?? false,
    baseChassisSponsonPintleWeight: readAllowance(
      'baseChassisSponsonPintleWeight',
    ),
    baseChassisTurretWeight: readAllowance('baseChassisTurretWeight'),
    baseChassisSecondaryTurretWeight: isVTOL
      ? undefined
      : readAllowance(SECONDARY_TURRET_ALLOWANCE_TAG),
  };
}

/** Inverse mapping for the normalized custom-library contract. */
export function serializeVehicleTurretContext(
  context: IVehicleTurretSourceContext,
): Pick<IUnitContract, 'isOmni' | AllowanceTag> {
  return {
    isOmni: context.isOmni,
    baseChassisSponsonPintleWeight: context.baseChassisSponsonPintleWeight,
    baseChassisTurretWeight: context.baseChassisTurretWeight,
    [SECONDARY_TURRET_ALLOWANCE_TAG]: context.baseChassisSecondaryTurretWeight,
  };
}
