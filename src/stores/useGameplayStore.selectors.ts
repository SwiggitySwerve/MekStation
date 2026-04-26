/**
 * Selector hooks + projections for `useGameplayStore`.
 *
 * Pulled out of the main store file so the per-file LOC budget stays
 * under the lint warning threshold. Public API surface
 * (`useSelectedUnit`, `useIsGameCompleted`, `selectIsGameCompleted`,
 * `ISelectedUnitProjection`) is unchanged — the same names still
 * import cleanly from `@/stores/useGameplayStore` thanks to a
 * re-export in the main store file.
 */

import type { IGameSession, IGameUnit, IUnitGameState } from '@/types/gameplay';

import { GameStatus } from '@/types/gameplay';

import { useGameplayStore } from './useGameplayStore';

/**
 * Per `add-interactive-combat-core-ui` task 2.4: derived selector that
 * projects the currently selected unit's full record (config-side
 * `IGameUnit` + live `IUnitGameState`) so consumers don't need to
 * re-derive by id from `currentState.units` + `session.units` on every
 * render.
 *
 * Returns `null` when no unit is selected, the session is missing, or
 * the selected id no longer exists (e.g., unit destroyed and removed
 * from state).
 */
export interface ISelectedUnitProjection {
  readonly id: string;
  readonly unit: IGameUnit;
  readonly state: IUnitGameState;
}

/**
 * Implementation note: this hook returns a fresh object each call,
 * which would cause an infinite render loop with Zustand's default
 * reference-equality selector. We sidestep that by selecting the three
 * primitives (id / session / units record) separately and combining
 * them via plain reads — each primitive read uses Zustand's own
 * shallow-equality so re-renders only fire when the specific input
 * changes.
 */
export function useSelectedUnit(): ISelectedUnitProjection | null {
  const id = useGameplayStore((s) => s.ui.selectedUnitId);
  const session = useGameplayStore((s) => s.session);

  if (!id || !session) return null;
  const unit = session.units.find((u) => u.id === id);
  const state = session.currentState.units[id];
  if (!unit || !state) return null;
  return { id, unit, state };
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
 * Hook form of `selectIsGameCompleted` for components that prefer
 * the named-hook idiom over passing the selector directly.
 */
export function useIsGameCompleted(): boolean {
  return useGameplayStore(selectIsGameCompleted);
}
