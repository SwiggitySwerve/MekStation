/** Existing handler total-mass rule, shared by loaded-editor validation. */
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
