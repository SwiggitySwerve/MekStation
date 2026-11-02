import { getHeatSinkDefinition } from '@/types/construction/HeatSinkType';

import { calculateAdjustedBV } from '../battleValuePilot';
import { calculateBaseBV, getCockpitModifier } from '../battleValueTotals';
import { getEquipmentEntry } from '../equipmentBVResolver';
import { calculateHeatDissipation } from '../heatSinkCalculations';
import { getAerospacePilotMultiplier } from './aerospaceBVCalculator';
import {
  calculateDropShipDefensiveBV,
  type IDropShipBVUnit,
  type IDropShipDefensiveBVBreakdown,
} from './dropShipBV';
import {
  resolveDropShipMountBV,
  type IDropShipMountBV,
} from './dropShipMountBV';
import { calculateLargeAerospaceFirePool } from './largeAerospaceFirePool';

interface IDropShipFinalOptions {
  readonly gunnery?: number;
  readonly piloting?: number;
  readonly cockpit?: string;
  readonly hasDroneOperatingSystem?: boolean;
}

/** Pinned BVCalculator/Aero summary, then BVCalculator.adjustBV. */
export function calculateDropShipFinalBV(
  defensive: number,
  offensive: number,
  options: IDropShipFinalOptions = {},
): { baseBV: number; pilotMultiplier: number; final: number } {
  const drone = options.hasDroneOperatingSystem;
  const aeroCockpit =
    options.cockpit === 'SMALL' || options.cockpit === 'COMMAND_CONSOLE';
  const baseBV = calculateBaseBV(defensive, offensive, [
    getCockpitModifier(drone ? 'drone-operating-system' : 'standard'),
    getCockpitModifier(
      aeroCockpit ? 'small' : drone ? 'drone-operating-system' : 'standard',
    ),
  ]);
  // Crew.java:233-234 and BVCalculator.java:1307-1313 default to G4/P5.
  return {
    baseBV,
    pilotMultiplier: getAerospacePilotMultiplier(
      options.gunnery,
      options.piloting,
    ),
    final: calculateAdjustedBV(
      baseBV,
      options.gunnery ?? 4,
      options.piloting ?? 5,
    ),
  };
}

type Defense = Omit<
  IDropShipDefensiveBVBreakdown,
  'calculationScope' | 'offensive' | 'final'
>;
export type IDropShipBVBreakdown =
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

/** @spec establish-all-unit-data-parity: DropShip defensive BV dispatch */
export function calculateDropShipBV(
  unit: IDropShipBVUnit,
  options: Pick<IDropShipFinalOptions, 'gunnery' | 'piloting'> = {},
): IDropShipBVBreakdown {
  const defense = calculateDropShipDefensiveBV(unit);
  const equipment = unit.equipment ?? [];
  const resolution = resolveDropShipMountBV(equipment);
  const reasons = resolution.unresolved.map(
    (m) => `Mount ${m.mountIndex} (${m.equipmentId}): ${m.reason}`,
  );
  const maxThrust = unit.maxThrust;
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
    maxThrust,
    heatCapacity: calculateHeatDissipation(sinks.type, sinks.count),
  });
  return {
    ...defense,
    ...stage,
    ...calculateDropShipFinalBV(defense.defensive, stage.offensive, {
      ...options,
      cockpit: unit.cockpit,
      hasDroneOperatingSystem: equipment.some(
        (m) => getEquipmentEntry(m.equipmentId)?.id === 'droneoperatingsystem',
      ),
    }),
    calculationScope: 'complete',
    unresolvedMounts: [],
    incompleteReasons: [],
  };
}
