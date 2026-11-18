/** Total-mass rule used by AbstractUnitTypeHandler.validate for every unit type that requires tonnage. */
export function unitOverweightErrors(
  totalWeight: number,
  tonnage: number,
): string[] {
  return totalWeight > tonnage
    ? [
        `Total weight (${totalWeight.toFixed(2)}t) exceeds tonnage (${tonnage}t)`,
      ]
    : [];
}
