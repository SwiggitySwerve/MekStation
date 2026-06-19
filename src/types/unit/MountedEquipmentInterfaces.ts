/**
 * Shared mounted-equipment identity fields used by unit-specific mount types.
 */
export interface IUnitMountedEquipmentIdentity {
  /** Unique mount ID */
  readonly id: string;
  /** Equipment definition ID */
  readonly equipmentId: string;
  /** Display name */
  readonly name: string;
}
