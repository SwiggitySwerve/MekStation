/**
 * Tech Rating Utilities - STUB FILE
 * TODO: Replace with spec-driven implementation
 */

export type TechRating = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'X';

export function getTechRating(component: unknown): TechRating {
  return 'C'; // Stub
}

export function formatTechRating(rating: TechRating): string {
  return rating;
}

export function compareTechRatings(a: TechRating, b: TechRating): number {
  const order = ['A', 'B', 'C', 'D', 'E', 'F', 'X'];
  return order.indexOf(a) - order.indexOf(b);
}


