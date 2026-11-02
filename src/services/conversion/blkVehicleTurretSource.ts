import type { IBlkDocument } from '@/types/formats/BlkFormat';
import type { IVehicleTurretSourceContext } from '@/types/unit/VehicleInterfaces';

import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { mapBlkUnitType, trimBlkWhitespace } from './BlkParserService.helpers';
import {
  mapVehicleTurretContext,
  SECONDARY_TURRET_ALLOWANCE_TAG,
} from './vehicleTurretContext';

export type CombatVehicleTurretSourceResult = {
  readonly document: IBlkDocument;
  readonly warnings: readonly string[];
} & (
  | { readonly success: true; readonly facts: IVehicleTurretSourceContext }
  | { readonly success: false; readonly errors: readonly string[] }
);

/**
 * Source allowances only: existing owners retain geometry, legality and mass.
 * @spec openspec/changes/preserve-combat-vehicle-turret-source-facts/specs/vehicle-unit-system/spec.md
 * MegaMek 48fcb2f: BLKTankFile:240-250; BLKVTOLFile:174-191.
 */
export function projectCombatVehicleTurretSource(
  document: IBlkDocument,
): CombatVehicleTurretSourceResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const family = document.mappedUnitType ?? mapBlkUnitType(document.unitType);
  if (family !== UnitType.VEHICLE && family !== UnitType.VTOL) {
    return {
      success: false,
      document,
      warnings,
      errors: [`Unsupported combat turret source family: ${document.unitType}`],
    };
  }
  const vtol = family === UnitType.VTOL;
  const tags = Object.entries(document.rawTags ?? {}).map(([name, value]) => ({
    name,
    key: name.toLowerCase(),
    value,
  }));
  const finiteDecimal = (key: string): number | undefined => {
    const matches = tags.filter((tag) => tag.key === key.toLowerCase());
    if (!matches.length) return undefined;
    if (matches.length > 1) {
      errors.push(
        `Ambiguous case-insensitive allowance ${key}: ${matches.map((tag) => tag.name).join(', ')}; strict finite decimal allowance parsing differs from permissive Java BuildingBlock numeric loading`,
      );
      return undefined;
    }
    const raw = matches[0].value;
    const lines = (Array.isArray(raw) ? raw : raw.split(/\r\n|\r|\n/)).map(
      trimBlkWhitespace,
    );
    if (
      !lines.length ||
      lines.some(
        (line) =>
          !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(line) ||
          !Number.isFinite(Number(line)),
      )
    ) {
      errors.push(
        `Invalid ${key}: ${JSON.stringify(raw)}; strict finite decimal allowance parsing differs from permissive Java BuildingBlock numeric loading`,
      );
      return undefined;
    }
    return Number(lines[0]);
  };
  const facts = mapVehicleTurretContext(
    tags.some((tag) => tag.key === 'omni'),
    vtol,
    finiteDecimal,
  );
  if (
    vtol &&
    tags.some((tag) => tag.key === SECONDARY_TURRET_ALLOWANCE_TAG.toLowerCase())
  )
    warnings.push(
      `VTOL ignores ${SECONDARY_TURRET_ALLOWANCE_TAG}; raw tag retained`,
    );
  if (errors.length) return { success: false, document, errors, warnings };
  return {
    success: true,
    document,
    warnings,
    facts,
  };
}
