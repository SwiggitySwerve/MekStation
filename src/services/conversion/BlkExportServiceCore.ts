/**
 * BLK Export Service
 *
 * Serializes unit state back to BLK (Building Block) format for round-trip validation
 * and file export. Supports vehicles, aerospace, battle armor, infantry, and protomechs.
 *
 * @spec openspec/changes/add-unit-export-integration/tasks.md
 * @see BlkParserService for the corresponding import/parser
 */

import type { AerospaceState } from '@/stores/aerospaceState';
import type { BattleArmorState } from '@/stores/battleArmorState';
import type { InfantryState } from '@/stores/infantryState';
import type { ProtoMechState } from '@/stores/protoMechState';
import type { VehicleState } from '@/stores/vehicleState';

import {
  createSingleton,
  type SingletonFactory,
} from '@/services/core/createSingleton';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  exportVehicle,
  exportAerospace,
  exportBattleArmor,
  exportInfantry,
  exportProtoMech,
} from './BlkExportServiceCore.exporters';

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

/**
 * BLK Export Service
 */
export class BlkExportService {
  /**
   * Export unit state to BLK format string
   */
  export(unit: ExportableUnitState): IBlkExportResult {
    const errors: string[] = [];

    try {
      const unitType = unit.unitType;

      if (
        unitType === UnitType.VEHICLE ||
        unitType === UnitType.VTOL ||
        unitType === UnitType.SUPPORT_VEHICLE
      ) {
        return exportVehicle(unit as VehicleState);
      }

      if (
        unitType === UnitType.AEROSPACE ||
        unitType === UnitType.CONVENTIONAL_FIGHTER
      ) {
        return exportAerospace(unit as AerospaceState);
      }

      if (unitType === UnitType.BATTLE_ARMOR) {
        return exportBattleArmor(unit as BattleArmorState);
      }

      if (unitType === UnitType.INFANTRY) {
        return exportInfantry(unit as InfantryState);
      }

      if (unitType === UnitType.PROTOMECH) {
        return exportProtoMech(unit as ProtoMechState);
      }

      // Unsupported type
      errors.push(`Unsupported unit type for BLK export: ${unitType}`);
      return { success: false, errors };
    } catch (e) {
      errors.push(`Export error: ${e}`);
      return { success: false, errors };
    }
  }
}

const blkExportServiceFactory: SingletonFactory<BlkExportService> =
  createSingleton((): BlkExportService => new BlkExportService());

export function getBlkExportService(): BlkExportService {
  return blkExportServiceFactory.get();
}

export function resetBlkExportService(): void {
  blkExportServiceFactory.reset();
}
