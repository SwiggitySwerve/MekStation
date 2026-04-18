/**
 * Aerospace Crew and Quarters Calculations
 *
 * Small craft require crew quarters and life support tonnage.
 * Standard quarters: 5 tons per crew member.
 * Steerage quarters: 3 tons per passenger/marine.
 *
 * @spec openspec/changes/add-aerospace-construction/specs/aerospace-unit-system/spec.md
 * Requirement: Small Craft Crew Quarters
 */

import { ISmallCraftCrew } from "../../../types/unit/AerospaceInterfaces";

// ============================================================================
// Constants
// ============================================================================

/** Tonnage cost per standard-quarters crew member (includes life support share) */
export const STANDARD_QUARTERS_TONS_PER_CREW = 5;

/** Tonnage cost per steerage-quarters passenger or marine */
export const STEERAGE_QUARTERS_TONS_PER_PERSON = 3;

// ============================================================================
// Minimum Crew Table
// ============================================================================

/**
 * Minimum crew required for a small craft by tonnage bracket.
 * Derived from TechManual small craft construction tables.
 */
const MIN_CREW_BY_TONNAGE: ReadonlyArray<{ maxTons: number; minCrew: number }> =
  [
    { maxTons: 100, minCrew: 3 },
    { maxTons: 150, minCrew: 4 },
    { maxTons: 200, minCrew: 6 },
  ];

/**
 * Return the minimum crew count for a small craft of a given tonnage.
 */
export function minSmallCraftCrew(tonnage: number): number {
  for (const entry of MIN_CREW_BY_TONNAGE) {
    if (tonnage <= entry.maxTons) return entry.minCrew;
  }
  // Fallback for very heavy craft (beyond 200t, out of scope but safe)
  return 6;
}

// ============================================================================
// Weight Calculation
// ============================================================================

/**
 * Compute total quarters tonnage for a small craft crew configuration.
 * quartersTons = (crew × 5) + (passengers × 3) + (marines × 3)
 */
export function quartersWeight(crew: ISmallCraftCrew): number {
  return (
    crew.crew * STANDARD_QUARTERS_TONS_PER_CREW +
    crew.passengers * STEERAGE_QUARTERS_TONS_PER_PERSON +
    crew.marines * STEERAGE_QUARTERS_TONS_PER_PERSON
  );
}

/**
 * Build an ISmallCraftCrew object, computing quartersTons automatically.
 */
export function makeSmallCraftCrew(
  crew: number,
  passengers: number,
  marines: number,
): ISmallCraftCrew {
  const config = { crew, passengers, marines, quartersTons: 0 };
  return { ...config, quartersTons: quartersWeight(config) };
}
