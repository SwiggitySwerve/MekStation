import type { IUnitContract } from '@/types/contracts';
import type { IVehicleTurretSourceContext } from '@/types/unit/VehicleInterfaces';

type AllowanceTag = keyof Pick<
  IUnitContract,
  'baseChassisTurretWeight' | 'baseChassisTurret2Weight'
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
    baseChassisTurretWeight: readAllowance('baseChassisTurretWeight'),
    baseChassisSecondaryTurretWeight: isVTOL
      ? undefined
      : readAllowance(SECONDARY_TURRET_ALLOWANCE_TAG),
  };
}
