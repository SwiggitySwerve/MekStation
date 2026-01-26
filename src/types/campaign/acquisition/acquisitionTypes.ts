/**
 * Acquisition System Types
 *
 * Defines the core types for the acquisition/procurement system:
 * - AvailabilityRating: 7-point scale (A-X) for part availability
 * - TN lookup tables: Target numbers for acquisition rolls
 * - Acquisition request/result interfaces
 * - Shopping list interface
 *
 * Based on MekHQ Procurement.java lines 226-270
 */

/**
 * Availability rating scale for parts (A=common, X=extremely rare)
 *
 * Used to determine Target Number for acquisition rolls.
 * Regular parts and consumables have different TNs for the same rating.
 */
export enum AvailabilityRating {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
  F = 'F',
  X = 'X',
}

/**
 * Target Numbers for regular parts by availability rating
 *
 * Based on MekHQ Procurement.java:
 * - A: 3 (common)
 * - B: 4
 * - C: 6
 * - D: 8 (standard)
 * - E: 10
 * - F: 11
 * - X: 13 (extremely rare)
 */
export const REGULAR_PART_TN: Record<AvailabilityRating, number> = {
  [AvailabilityRating.A]: 3,
  [AvailabilityRating.B]: 4,
  [AvailabilityRating.C]: 6,
  [AvailabilityRating.D]: 8,
  [AvailabilityRating.E]: 10,
  [AvailabilityRating.F]: 11,
  [AvailabilityRating.X]: 13,
};

/**
 * Target Numbers for consumable parts (ammo, etc.) by availability rating
 *
 * Consumables are easier to acquire than regular parts.
 * Based on MekHQ Procurement.java:
 * - A: 2 (common)
 * - B: 3
 * - C: 4
 * - D: 6 (standard)
 * - E: 8
 * - F: 10
 * - X: 13 (extremely rare, same as regular)
 */
export const CONSUMABLE_TN: Record<AvailabilityRating, number> = {
  [AvailabilityRating.A]: 2,
  [AvailabilityRating.B]: 3,
  [AvailabilityRating.C]: 4,
  [AvailabilityRating.D]: 6,
  [AvailabilityRating.E]: 8,
  [AvailabilityRating.F]: 10,
  [AvailabilityRating.X]: 13,
};

/**
 * Status of an acquisition request through its lifecycle
 */
export type AcquisitionStatus = 'pending' | 'rolling' | 'in_transit' | 'delivered' | 'failed';

/**
 * A request to acquire a specific part
 *
 * Immutable record of a part acquisition request with all metadata needed
 * to track it through the acquisition process.
 */
export interface IAcquisitionRequest {
  /** Unique identifier for this request */
  readonly id: string;

  /** ID of the part being requested */
  readonly partId: string;

  /** Human-readable name of the part */
  readonly partName: string;

  /** Quantity requested */
  readonly quantity: number;

  /** Availability rating (A-X) */
  readonly availability: AvailabilityRating;

  /** Whether this is a consumable (ammo, etc.) vs regular part */
  readonly isConsumable: boolean;

  /** Current status in acquisition lifecycle */
  readonly status: AcquisitionStatus;

  /** ISO date when acquisition roll succeeded (status changed to rolling) */
  readonly orderedDate?: string;

  /** ISO date when part arrives (status changed to delivered) */
  readonly deliveryDate?: string;

  /** Number of acquisition roll attempts made */
  readonly attempts: number;

  /** ISO date of last acquisition roll attempt (for cooldown tracking) */
  readonly lastAttemptDate?: string;
}

/**
 * Result of a single acquisition roll attempt
 *
 * Immutable record of the roll outcome, including the 2d6 result,
 * target number, margin of success/failure, and calculated transit time.
 */
export interface IAcquisitionResult {
  /** ID of the request this result is for */
  readonly requestId: string;

  /** Whether the roll succeeded (roll >= TN) */
  readonly success: boolean;

  /** 2d6 roll result */
  readonly roll: number;

  /** Target number to beat */
  readonly targetNumber: number;

  /** Margin of success/failure (roll - TN, negative if failed) */
  readonly margin: number;

  /** Days until delivery (0 if failed) */
  readonly transitDays: number;

  /** Applied modifiers (planetary, clan parts, reputation, etc.) */
  readonly modifiers: readonly { name: string; value: number }[];
}

/**
 * A shopping list of acquisition requests
 *
 * Immutable collection of parts to acquire.
 */
export interface IShoppingList {
  /** Array of acquisition requests */
  readonly items: readonly IAcquisitionRequest[];
}
