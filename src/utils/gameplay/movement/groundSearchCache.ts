import type {
  IHexCoordinate,
  IHexGrid,
  MovementTravelMode,
} from '@/types/gameplay';

import type { IMovementCostContext } from './calculations';

import { coordToKey } from '../hexMath';
import {
  createPathSearchSpace,
  floodSearchSpace,
  type IFindPathOptions,
  type IPathSearchSpace,
} from './pathfinding';

/**
 * The three searches a ground destination may run, in the order
 * `deriveGroundRangeHex` tries them.
 */
export type GroundSearchKind = 'budget' | 'roadBonus' | 'diagnostic';

export interface IGroundSearchBinding {
  readonly grid: IHexGrid;
  readonly origin: IHexCoordinate;
  readonly movementMode: MovementTravelMode;
  readonly pathBudget: number;
  readonly maxPathCost: number;
  readonly costContext: IMovementCostContext;
}

export function groundSearchBounds(
  binding: IGroundSearchBinding,
  kind: GroundSearchKind,
): { readonly maxCost: number; readonly options?: IFindPathOptions } {
  switch (kind) {
    case 'budget':
      return { maxCost: binding.pathBudget };
    case 'roadBonus':
      return {
        maxCost: binding.maxPathCost,
        options: { requirePavementRoadBonusSurface: true },
      };
    case 'diagnostic':
      return { maxCost: Number.MAX_SAFE_INTEGER };
  }
}

/**
 * Shared searches for one movement mode from one origin: memoised step
 * prices, and one flood per search kind. A flood only proves that the A*
 * search for a destination it never reaches would return null, so that
 * search is skipped; every path still comes from the same A*, which keeps
 * paths and their tie-breaks identical to a lone `findPath`.
 */
export class GroundSearches {
  readonly space: IPathSearchSpace;
  private readonly floods = new Map<
    GroundSearchKind,
    ReadonlyMap<string, number>
  >();

  constructor(private readonly binding: IGroundSearchBinding) {
    this.space = createPathSearchSpace(
      binding.grid,
      binding.origin,
      binding.movementMode,
      binding.costContext,
    );
  }

  mayReach(kind: GroundSearchKind, hex: IHexCoordinate): boolean {
    let flood = this.floods.get(kind);
    if (!flood) {
      const { maxCost, options } = groundSearchBounds(this.binding, kind);
      flood = floodSearchSpace(this.space, maxCost, options);
      this.floods.set(kind, flood);
    }
    return flood.has(coordToKey(hex));
  }
}

/**
 * Per-projection cache: `deriveReachableHexes` creates one, and every
 * candidate destination with the same origin, mode, budgets and cost context
 * shares its `GroundSearches`. The grid must not change while it is in use.
 */
export class GroundSearchCache {
  private readonly searches = new Map<string, GroundSearches>();

  constructor(private readonly grid: IHexGrid) {}

  searchesFor(binding: IGroundSearchBinding): GroundSearches | null {
    if (binding.grid !== this.grid) return null;
    // Every IMovementCostContext field is JSON-representable today. A Set, Map
    // or function field would stringify to {} or vanish, and two different
    // contexts would then share one cache entry: key such a field explicitly.
    const key = JSON.stringify([
      binding.origin.q,
      binding.origin.r,
      binding.movementMode,
      binding.pathBudget,
      binding.maxPathCost,
      binding.costContext,
    ]);
    let searches = this.searches.get(key);
    if (!searches) {
      searches = new GroundSearches(binding);
      this.searches.set(key, searches);
    }
    return searches;
  }
}
