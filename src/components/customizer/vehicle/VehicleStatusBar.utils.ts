import { formatTons } from '@/utils/formatting';
/** Compatibility facade; construction owns vehicle weight composition. */
export { computeVehicleWeightBreakdown } from '@/utils/construction/vehicle/weightComposition';
export type {
  EquipmentResolver,
  VehicleWeightState,
  VehicleWeightBreakdown,
} from '@/utils/construction/vehicle/weightComposition';

/** Numeric formatting preserves unavailable mass instead of displaying zero. */
export function formatVehicleWeight(weight: number | null): string {
  return weight === null || !Number.isFinite(weight)
    ? 'Unknown'
    : formatTons(weight);
}
