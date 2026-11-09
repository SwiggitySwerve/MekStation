import { getHeatSinkDefinition } from '@/types/construction/HeatSinkType';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { hasBVDroneOS } from '../battleValueEquipment';
import { calculateHeatDissipation } from '../heatSinkCalculations';
import {
  calculateAerospaceFinalBV as calculateDropShipFinalBV,
  type IAerospaceFinalOptions as IDropShipFinalOptions,
} from './aerospaceBVCalculations';
import {
  calculateCapitalShipDefensiveBV,
  type ICapitalShipBVUnit,
} from './capitalShipBV';
import {
  calculateDropShipDefensiveBV,
  type IDropShipBVUnit,
  type IDropShipDefensiveBVBreakdown,
} from './dropShipBV';
import {
  resolveLargeAerospaceMountBV,
  type IDropShipMountBV,
} from './dropShipMountBV';
import { calculateLargeAerospaceFirePool } from './largeAerospaceFirePool';
import { largeAerospaceBVTerms } from './largeBVTrace';

export { calculateAerospaceFinalBV as calculateDropShipFinalBV } from './aerospaceBVCalculations';

type Defense = Omit<
  IDropShipDefensiveBVBreakdown,
  'calculationScope' | 'offensive' | 'final'
>;
export type ILargeAerospaceBVBreakdown =
  | (IDropShipDefensiveBVBreakdown & {
      readonly unresolvedMounts: IDropShipMountBV['unresolved'];
      readonly incompleteReasons: readonly string[];
    })
  | (Defense &
      ReturnType<typeof calculateLargeAerospaceFirePool> &
      ReturnType<typeof calculateDropShipFinalBV> & {
        readonly calculationScope: 'complete';
        readonly unresolvedMounts: readonly [];
        readonly incompleteReasons: readonly [];
      });
export type IDropShipBVBreakdown = ILargeAerospaceBVBreakdown;

/** Shared complete composition; unresolved facts retain defensive-only scope. */
export function calculateLargeAerospaceBV(
  unit: IDropShipBVUnit | ICapitalShipBVUnit,
  options: Pick<IDropShipFinalOptions, 'gunnery' | 'piloting'> = {},
): ILargeAerospaceBVBreakdown {
  const defense =
    unit.unitType === UnitType.DROPSHIP
      ? calculateDropShipDefensiveBV(unit)
      : calculateCapitalShipDefensiveBV(unit);
  const equipment = unit.equipment ?? [];
  const resolution = resolveLargeAerospaceMountBV(
    equipment,
    unit.unitType === UnitType.DROPSHIP ? undefined : unit.unitType,
    unit.year,
  );
  const reasons = resolution.unresolved.map(
    (m) => `Mount ${m.mountIndex} (${m.equipmentId}): ${m.reason}`,
  );
  // JumpShipBVCalculator.offensiveSpeedFactorMP: fixed 1 (station: 0), not thrust.
  const maxThrust =
    unit.unitType === UnitType.JUMPSHIP
      ? 1
      : unit.unitType === UnitType.SPACE_STATION
        ? 0
        : unit.maxThrust;
  const sinks = unit.heatSinks;
  if (maxThrust === undefined || !Number.isFinite(maxThrust) || maxThrust < 0)
    reasons.push('Missing or invalid maximum thrust');
  if (!sinks || !Number.isSafeInteger(sinks.count) || sinks.count < 0)
    reasons.push('Missing or invalid heat sink count');
  if (!sinks || !getHeatSinkDefinition(sinks.type))
    reasons.push('Missing or unsupported heat sink type');
  if (
    unit.cockpit !== undefined &&
    !['STANDARD', 'SMALL', 'COMMAND_CONSOLE', 'PRIMITIVE'].includes(
      unit.cockpit,
    )
  )
    reasons.push(`Unsupported aerospace cockpit: ${unit.cockpit}`);
  if (reasons.length || maxThrust === undefined || !sinks)
    return {
      ...defense,
      unresolvedMounts: resolution.unresolved,
      incompleteReasons: reasons,
    };
  const stage = calculateLargeAerospaceFirePool({
    arcs: resolution.arcs,
    isWarship: unit.unitType === UnitType.WARSHIP,
    maxThrust,
    heatCapacity: calculateHeatDissipation(sinks.type, sinks.count),
  });
  return largeAerospaceBVTerms(
    {
      ...defense,
      ...stage,
      ...calculateDropShipFinalBV(defense.defensive, stage.offensive, {
        ...options,
        cockpit: unit.cockpit,
        hasDroneOperatingSystem: hasBVDroneOS(
          equipment.map((m) => m.equipmentId),
        ),
      }),
      calculationScope: 'complete',
      unresolvedMounts: [],
      incompleteReasons: [],
    },
    {
      isDropShip: unit.unitType === UnitType.DROPSHIP,
      arcs: resolution.arcs,
    },
  );
}

/** Existing DropShip entry delegates to the shared composition owner. */
export function calculateDropShipBV(
  unit: IDropShipBVUnit,
  options: Pick<IDropShipFinalOptions, 'gunnery' | 'piloting'> = {},
): IDropShipBVBreakdown {
  return calculateLargeAerospaceBV(unit, options);
}
