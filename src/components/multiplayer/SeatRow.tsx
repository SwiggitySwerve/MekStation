/**
 * SeatRow — single seat row in the lobby grid.
 *
 * Pure presentational component. Renders one `IMatchSeat` with a
 * compact label, an occupant pill, an AI badge when relevant, and a
 * column of action buttons. Action availability is computed by the
 * parent (`LobbyPanel`) and threaded through props so this component
 * never has to know about host-vs-self vs joiner authorization.
 *
 * Wave 5 of Phase 4 (capstone integration).
 */

import type { IMatchSeat } from '@/types/multiplayer/Lobby';

// =============================================================================
// Props
// =============================================================================

export interface ISeatRowProps {
  readonly seat: IMatchSeat;
  /** Show the "occupy" button when the seat is empty + caller can sit. */
  readonly canOccupy: boolean;
  /** Show "leave" when the caller is the current occupant. */
  readonly canLeave: boolean;
  /** Show ready toggle (caller is the occupant). */
  readonly canToggleReady: boolean;
  /** Host-only: show "set AI" / "set human" buttons. */
  readonly canHostManage: boolean;
  readonly onOccupy: () => void;
  readonly onLeave: () => void;
  readonly onToggleReady: (ready: boolean) => void;
  readonly onSetAi: () => void;
  readonly onSetHuman: () => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Render one lobby seat row. Layout: side+seat label on the left,
 * occupant info in the middle, action buttons on the right. Action
 * buttons are flat — no dropdown — because the seat row is dense.
 */
export function SeatRow(props: ISeatRowProps): React.ReactElement {
  const { seat } = props;
  const isAi = seat.kind === 'ai';
  const isEmpty = !isAi && !seat.occupant;

  // Status pill colour: ai = amber, ready = emerald, occupied-not-ready
  // = sky, empty = slate. Centralised here so all rows render
  // consistent badges without duplicating the colour logic.
  const statusLabel = isAi
    ? `AI (${seat.aiProfile ?? 'basic'})`
    : seat.occupant
      ? seat.ready
        ? 'Ready'
        : 'Not ready'
      : 'Empty';

  const statusBadge = isAi
    ? 'bg-amber-700 text-amber-100'
    : seat.occupant && seat.ready
      ? 'bg-emerald-700 text-emerald-100'
      : seat.occupant
        ? 'bg-sky-700 text-sky-100'
        : 'bg-slate-700 text-slate-300';

  return (
    <div
      data-slot-id={seat.slotId}
      className="flex items-center justify-between gap-3 rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2"
    >
      <div className="flex flex-col">
        <span className="text-xs tracking-wide text-slate-400 uppercase">
          {seat.side} #{seat.seatNumber}
        </span>
        <span className="text-sm font-medium text-slate-100">
          {seat.occupant?.displayName ?? (isAi ? 'AI bot' : '—')}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${statusBadge}`}
        >
          {statusLabel}
        </span>
        <div className="flex gap-1">
          {props.canOccupy && isEmpty && (
            <button
              type="button"
              className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-500"
              onClick={props.onOccupy}
            >
              Sit here
            </button>
          )}
          {props.canLeave && (
            <button
              type="button"
              className="rounded bg-rose-700 px-2 py-1 text-xs font-medium text-white hover:bg-rose-600"
              onClick={props.onLeave}
            >
              Leave
            </button>
          )}
          {props.canToggleReady && (
            <button
              type="button"
              className={`rounded px-2 py-1 text-xs font-medium text-white ${
                seat.ready
                  ? 'bg-amber-700 hover:bg-amber-600'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
              onClick={() => props.onToggleReady(!seat.ready)}
            >
              {seat.ready ? 'Unready' : 'Ready'}
            </button>
          )}
          {props.canHostManage && !isAi && (
            <button
              type="button"
              className="rounded bg-amber-700 px-2 py-1 text-xs font-medium text-white hover:bg-amber-600"
              onClick={props.onSetAi}
            >
              Set AI
            </button>
          )}
          {props.canHostManage && isAi && (
            <button
              type="button"
              className="rounded bg-slate-600 px-2 py-1 text-xs font-medium text-white hover:bg-slate-500"
              onClick={props.onSetHuman}
            >
              Set human
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
