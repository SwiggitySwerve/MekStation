/**
 * Shared prop types and projected event state for all per-type token components.
 *
 * Every token component receives an `eventState` projection already computed
 * by the dispatcher (UnitTokenForType) from the full event log. This keeps
 * the projection logic in one place and makes individual token components
 * purely presentational.
 */

import type { DamageFloaterEntry } from "@/components/gameplay/DamageFloater";

/**
 * Per-unit event projection passed to each token renderer.
 * Computed once by UnitTokenForType from the full event array.
 */
export interface IUnitEventState {
  readonly critCount: number;
  readonly pilotHitCount: number;
  readonly unconscious: boolean;
  readonly killed: boolean;
  readonly destroyed: boolean;
  readonly damageEntries: readonly DamageFloaterEntry[];
}

export const EMPTY_EVENT_STATE: IUnitEventState = {
  critCount: 0,
  pilotHitCount: 0,
  unconscious: false,
  killed: false,
  destroyed: false,
  damageEntries: [],
};

/**
 * Props shared by every per-type token component.
 * Each component additionally accepts `token: IUnitToken` (typed per its own
 * needs) which is declared in the component's own props interface.
 */
export interface ITokenSharedProps {
  /** Pre-computed event projection for this unit. */
  readonly eventState: IUnitEventState;
}
