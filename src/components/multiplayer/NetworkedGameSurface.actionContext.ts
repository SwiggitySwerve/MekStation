/**
 * The action bar's control context and the lifecycle gate applied to it
 * (umbrella 19.2, 3b-i).
 *
 * Extracted from `NetworkedGameSurface.actionbar.tsx` when the gate
 * pushed that file past its presentational size target, following the
 * split the surface already uses for its `.overlays` / `.panels`
 * siblings rather than inventing a new seam. The bar renders; this
 * module decides what a control is allowed to be and to do.
 */

import type {
  IGameIntent,
  IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';
import type { CommandAvailability } from '@/types/gameplay/TacticalCommandInterfaces';

/** How a control forwards an intent to the server. Never resolves locally. */
export type NetworkedIntentSender = (intent: IGameIntent) => void;

/** The id every gate-refused control names as its description. */
export const NETWORKED_ACTION_REFUSAL_ID = 'networked-action-refusal';

export interface IActionControlContext {
  readonly session: IGameSession;
  readonly enabled: boolean;
  readonly canAdvancePhase: boolean;
  readonly authorPeerId: string;
  readonly selectedUnitId: string | null;
  readonly selectedHex: { readonly q: number; readonly r: number } | null;
  readonly targetUnitId: string | null;
  readonly onSendIntent: NetworkedIntentSender;
  /** True while the lifecycle gate refuses commands on this surface. */
  readonly refused: boolean;
  /** The refusal text, or `null` when the gate allows. */
  readonly refusalReason: string | null;
  /** `aria-describedby` for a refused control; `undefined` otherwise. */
  readonly describedBy: string | undefined;
  /** Server recoveryAction, verbatim, or null when the frame named none. */
  readonly recoveryAction: string | null;
}

export interface IActionControlContextInput {
  readonly session: IGameSession;
  /** Pre-gate enablement: turn ownership and pause only. */
  readonly enabled: boolean;
  /** Pre-gate phase-advance enablement. */
  readonly canAdvancePhase: boolean;
  readonly authorPeerId: string;
  readonly selectedUnitId: string | null;
  readonly selectedHex: { readonly q: number; readonly r: number } | null;
  readonly targetUnitId: string | null;
  readonly onSendIntent: NetworkedIntentSender;
  readonly commandGate: CommandAvailability | undefined;
  readonly recoveryAction?: string | null;
}

/**
 * Applies the lifecycle gate to BOTH what a control renders as and what
 * it may dispatch.
 *
 * One construction point for the two halves: a surface that disabled the
 * button but left the dispatch path live is the silent retry 19.2
 * forbids, and it is exactly what happens when the render gate and the
 * send gate are written separately.
 *
 * The refused sender is a no-op rather than a throw. The client has
 * decided not to ask, which is an answer, and the reason is already on
 * the control that would have asked; throwing would turn a refusal the
 * player can read into a crash they cannot.
 */
export function buildActionControlContext(
  input: IActionControlContextInput,
): IActionControlContext {
  const gate = input.commandGate;
  const refusalReason =
    gate !== undefined && !gate.available ? gate.reason : null;
  const refused = refusalReason !== null;
  return {
    session: input.session,
    enabled: input.enabled && !refused,
    canAdvancePhase: input.canAdvancePhase && !refused,
    authorPeerId: input.authorPeerId,
    selectedUnitId: input.selectedUnitId,
    selectedHex: input.selectedHex,
    targetUnitId: input.targetUnitId,
    onSendIntent: refused ? () => {} : input.onSendIntent,
    refused,
    refusalReason,
    describedBy: refused ? NETWORKED_ACTION_REFUSAL_ID : undefined,
    recoveryAction:
      input.recoveryAction === undefined || input.recoveryAction === ''
        ? null
        : input.recoveryAction,
  };
}
