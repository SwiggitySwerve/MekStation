/**
 * Shared types for BlkExportService — leaf module to break circular dependency
 * between BlkExportServiceCore.ts and BlkExportServiceCore.exporters.ts.
 */

import type { AerospaceState } from '@/stores/aerospaceState';
import type { BattleArmorState } from '@/stores/battleArmorState';
import type { InfantryState } from '@/stores/infantryState';
import type { ProtoMechState } from '@/stores/protoMechState';
import type { VehicleState } from '@/stores/vehicleState';

/**
 * Result of exporting to BLK format
 */
export interface IBlkExportResult {
  readonly success: boolean;
  readonly content?: string;
  readonly errors: string[];
}

/**
 * Union type for all exportable unit states
 */
export type ExportableUnitState =
  | VehicleState
  | AerospaceState
  | BattleArmorState
  | InfantryState
  | ProtoMechState;
