/**
 * Campaign parts warehouse.
 *
 * Salvage, acquisitions, and repair all feed/drain the same pool so the
 * campaign economy can survive repeated day advancement and persistence
 * round-trips without parallel "part-like" shapes.
 */

export type PartsInventorySource =
  | 'salvage'
  | 'acquisition'
  | 'manual'
  | 'repair-return';

export interface IPartsInventoryItem {
  /** Stable inventory lot id. Used for idempotency. */
  readonly inventoryId: string;
  /** Canonical part id, such as `medium-laser` or `standard-armor-plate`. */
  readonly partId: string;
  /** Display name for UI/logging. */
  readonly partName: string;
  /** Quantity currently in this lot. */
  readonly quantity: number;
  /** Source path that added this lot. */
  readonly source: PartsInventorySource;
  /** ISO timestamp when the lot entered the warehouse. */
  readonly acquiredAt: string;
  /** Optional quality grade when market/salvage source provides one. */
  readonly quality?: string;
  /** Source unit id when a salvaged part came from a known unit. */
  readonly unitId?: string;
  /** Source unit location when known. */
  readonly location?: string;
}

export type IPartsInventory = readonly IPartsInventoryItem[];
