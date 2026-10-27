import type { ArmorDiagramMode } from '@/stores/useCustomizerSettingsStore';
import type { IArmorAllocation } from '@/types/construction/ArmorAllocation';
import type { LocationArmorData } from '@/types/construction/LocationArmorData';

import { getArmorFaceMaximums } from '@/components/customizer/armor/shared/ArmorFaceMaximums';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import {
  MechConfiguration,
  getLocationsForConfig,
  hasRearArmor,
} from '@/types/construction/MechConfigurationSystem';
import { getMaxArmorForLocation } from '@/utils/construction/armorCalculations';

function getRearValue(
  armorAllocation: IArmorAllocation,
  location: MechLocation,
): number | undefined {
  if (!hasRearArmor(location)) return undefined;
  switch (location) {
    case MechLocation.CENTER_TORSO:
      return armorAllocation.centerTorsoRear;
    case MechLocation.LEFT_TORSO:
      return armorAllocation.leftTorsoRear;
    case MechLocation.RIGHT_TORSO:
      return armorAllocation.rightTorsoRear;
    default:
      return undefined;
  }
}

export function buildArmorData(
  tonnage: number,
  configuration: MechConfiguration,
  armorAllocation: IArmorAllocation,
): LocationArmorData[] {
  const locations = getLocationsForConfig(configuration);

  return locations.map((location) => {
    const maxArmor = getMaxArmorForLocation(tonnage, location);
    const hasRear = hasRearArmor(location);
    const rear = getRearValue(armorAllocation, location);

    return {
      location,
      current: armorAllocation[location] ?? 0,
      maximum: maxArmor,
      ...(hasRear && rear !== undefined
        ? {
            rear,
            rearMaximum: getArmorFaceMaximums(
              maxArmor,
              armorAllocation[location] ?? 0,
              rear,
            ).rear,
          }
        : {}),
    };
  });
}

/**
 * Biped silhouette diagrams drop their own legend on wide layouts; the armor
 * inspector shows it beside the diagram instead. Every other configuration and
 * the schematic keep their built-in legend.
 */
export function diagramLegendMovesToInspector(
  configuration: MechConfiguration,
  mode: ArmorDiagramMode,
): boolean {
  return configuration === MechConfiguration.BIPED && mode === 'silhouette';
}

export function calculatePointsDelta(
  unallocatedPoints: number,
  maxTotalArmor: number,
  allocatedPoints: number,
): number {
  return unallocatedPoints < 0
    ? unallocatedPoints
    : Math.min(unallocatedPoints, maxTotalArmor - allocatedPoints);
}

export interface ArmorPointsExplanationInput {
  /** Points the current armor tonnage buys (tonnage x points per ton). */
  readonly availablePoints: number;
  readonly armorTonnage: number;
  readonly allocatedPoints: number;
  /** Most armor points the chassis can hold across all locations. */
  readonly maxTotalArmor: number;
  /** Smallest half-ton tonnage that covers `maxTotalArmor`. */
  readonly maxUsefulTonnage: number;
}

/**
 * Plain-words explanation of why "Allocated" may sit below the chassis max,
 * e.g. "304 pts from 19 t · 3 more need +0.5 t". Uses only values the tab
 * already computes; no new rules.
 */
export function describeArmorPoints({
  availablePoints,
  armorTonnage,
  allocatedPoints,
  maxTotalArmor,
  maxUsefulTonnage,
}: ArmorPointsExplanationInput): string {
  const parts = [`${availablePoints} pts from ${armorTonnage} t`];
  const unassigned = availablePoints - allocatedPoints;
  const room = maxTotalArmor - allocatedPoints;

  if (allocatedPoints > maxTotalArmor) {
    parts.push(`${allocatedPoints - maxTotalArmor} over the max`);
  } else if (
    allocatedPoints === maxTotalArmor &&
    availablePoints > maxTotalArmor
  ) {
    parts.push(`${availablePoints - maxTotalArmor} beyond the chassis max`);
  } else if (unassigned < 0) {
    parts.push(`${-unassigned} more than the tonnage buys`);
  } else if (unassigned > 0) {
    parts.push(`${unassigned} left to place`);
  } else if (room > 0 && armorTonnage < maxUsefulTonnage) {
    parts.push(`${room} more need +${maxUsefulTonnage - armorTonnage} t`);
  }
  return parts.join(' · ');
}
