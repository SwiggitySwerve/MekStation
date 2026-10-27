/**
 * Armor face maximums
 *
 * Owns how much armor one face (front or rear) of a location can hold given
 * the location's total cap and what the other face already uses. The location
 * editor sliders and the diagram cells both read this so they never disagree.
 *
 * @spec openspec/specs/armor-diagram/spec.md
 */

export interface IArmorFaceMaximums {
  readonly front: number;
  readonly rear: number;
}

/**
 * @param locationMaximum - Max armor points for the whole location
 * @param front - Front armor currently allocated
 * @param rear - Rear armor currently allocated (0 for locations without rear)
 */
export function getArmorFaceMaximums(
  locationMaximum: number,
  front: number,
  rear: number,
): IArmorFaceMaximums {
  return {
    front: locationMaximum - rear,
    rear: locationMaximum - front,
  };
}
