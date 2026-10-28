import type {
  ArmorDiagramMode,
  ArmorDiagramVariant,
} from '@/stores/useCustomizerSettingsStore';
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
import { formatTons } from '@/utils/formatting';

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
 * inspector shows it beside the diagram instead. The Standard (Blueprint)
 * silhouette has no status-colour legend at all: it explains fill height in
 * its own one-line key. Every other configuration and the schematic keep their
 * built-in legend.
 */
export function diagramLegendMovesToInspector(
  configuration: MechConfiguration,
  mode: ArmorDiagramMode,
  variant: ArmorDiagramVariant,
): boolean {
  return (
    configuration === MechConfiguration.BIPED &&
    mode === 'silhouette' &&
    variant !== 'clean-tech'
  );
}

/**
 * The Armor tab's xl column split. The Standard biped silhouette (Blueprint)
 * needs 40rem for the figure beside its rear inset and location list; the
 * other styles keep the wider column for their location table.
 */
export function armorTabColumns(
  configuration: MechConfiguration,
  mode: ArmorDiagramMode,
  variant: ArmorDiagramVariant,
): string {
  return configuration === MechConfiguration.BIPED &&
    mode === 'silhouette' &&
    variant === 'clean-tech'
    ? 'xl:grid-cols-[minmax(40rem,1.25fr)_minmax(19rem,1fr)]'
    : 'xl:grid-cols-[minmax(0,1.7fr)_minmax(19rem,0.8fr)]';
}

/**
 * What Maximize Tonnage adds: the tonnage step up to the smallest half ton
 * that covers the chassis maximum, and the usable points it buys (points past
 * the chassis maximum cannot be placed, so they are not counted).
 * "+0.5 t, +3 pts", or null when the tonnage is already at that maximum.
 */
export function describeMaximizeGain({
  armorTonnage,
  availablePoints,
  maxTotalArmor,
  maxUsefulTonnage,
  pointsAtMaxUsefulTonnage,
}: {
  readonly armorTonnage: number;
  readonly availablePoints: number;
  readonly maxTotalArmor: number;
  readonly maxUsefulTonnage: number;
  /** Points `maxUsefulTonnage` buys of the current armor type. */
  readonly pointsAtMaxUsefulTonnage: number;
}): string | null {
  if (armorTonnage >= maxUsefulTonnage) return null;
  const usable = (points: number) => Math.min(points, maxTotalArmor);
  const gained = usable(pointsAtMaxUsefulTonnage) - usable(availablePoints);
  return `+${formatTons(maxUsefulTonnage - armorTonnage)}, +${gained} pts`;
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
  const parts = [`${availablePoints} pts from ${formatTons(armorTonnage)}`];
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
    parts.push(
      `${room} more need +${formatTons(maxUsefulTonnage - armorTonnage)}`,
    );
  }
  return parts.join(' · ');
}
