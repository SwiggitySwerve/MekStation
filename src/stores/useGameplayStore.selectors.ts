/**
 * Pure selector functions + projection types for `useGameplayStore`.
 *
 * Pulled out of the main store file so the per-file LOC budget stays
 * under the lint warning threshold. Kept as pure functions (no
 * `useGameplayStore` import) to avoid a circular module dep — the
 * hook wrappers (`useSelectedUnit`, `useIsGameCompleted`) live in the
 * main store file and call into these selectors.
 */

import type { IGameSession, IGameUnit, IUnitGameState } from '@/types/gameplay';

import { GameStatus } from '@/types/gameplay';

/**
 * Per `add-interactive-combat-core-ui` task 2.4: derived projection
 * shape combining the config-side `IGameUnit` with the live
 * `IUnitGameState`. Returned by `useSelectedUnit` so consumers don't
 * need to re-derive by id from `currentState.units` + `session.units`
 * on every render.
 */
export interface ISelectedUnitProjection {
  readonly id: string;
  readonly unit: IGameUnit;
  readonly state: IUnitGameState;
}

/**
 * Per `add-victory-and-post-battle-summary` design D7 + spec
 * `game-session-management` "Game Completed Store Projection": the
 * combat page reads this selector to decide when to redirect to the
 * victory screen. Centralized here so the redirect logic in
 * `/gameplay/games/[id]` is one line and the selector itself is
 * unit-testable in isolation. Returns `true` exactly when the
 * session's `currentState.status === GameStatus.Completed`.
 *
 * Selector form is a function that takes the entire store state and
 * returns the boolean — usable directly via
 * `useGameplayStore(selectIsGameCompleted)` in components.
 */
export const selectIsGameCompleted = (state: {
  session: IGameSession | null;
}): boolean => state.session?.currentState.status === GameStatus.Completed;

/**
 * Project the currently-selected unit (or `null`) from the relevant
 * store fields. Pure helper so the hook wrapper can compose the three
 * Zustand selector reads (`id`, `session`, etc.) and combine them
 * outside of an effectful render.
 *
 * Returns `null` when:
 *   - no unit is selected,
 *   - the session is missing,
 *   - or the selected id no longer exists (e.g., unit destroyed and
 *     removed from `currentState.units`).
 */
export function projectSelectedUnit(
  id: string | null,
  session: IGameSession | null,
): ISelectedUnitProjection | null {
  if (!id || !session) return null;
  const unit = session.units.find((u) => u.id === id);
  const state = session.currentState.units[id];
  if (!unit || !state) return null;
  return { id, unit, state };
}
