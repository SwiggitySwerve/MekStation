/**
 * LobbyPanel — full lobby view: seats grouped by side + host controls.
 *
 * Wave 5 of Phase 4 (capstone integration). Pure presentational component:
 * receives the lobby snapshot + caller identity + an `onIntent` dispatcher
 * and renders. No network / store coupling. Pages own composition with
 * the multiplayer client hook.
 *
 * Responsibilities:
 *   - Group seats by side so 2v2 / 3v3 / FFA-N all render with a clean
 *     visual split
 *   - Wire each `SeatRow`'s actions to the right `IIntentPayload`
 *   - Show host-only controls (LaunchMatch, ForfeitMatch) at the bottom
 *   - Disable Launch when `canLaunch` is false (every seat must be
 *     ai-ready or human+occupant+ready)
 */

import type { IMatchSeat } from '@/types/multiplayer/Lobby';
import type { ILobbyUpdated } from '@/types/multiplayer/Protocol';
import type { IIntentPayload } from '@/types/multiplayer/Protocol';

import { canLaunch } from '@/lib/multiplayer/server/lobby/lobbyStateMachine';

import { SeatRow } from './SeatRow';

// =============================================================================
// Props
// =============================================================================

export interface ILobbyPanelProps {
  readonly lobbyState: ILobbyUpdated;
  readonly myPlayerId: string;
  readonly onIntent: (intent: IIntentPayload) => void;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Group seats by side (`Alpha`, `Bravo`, ...). Stable order — relies on
 * the array order returned by the server which itself comes from
 * `defaultSeats` / mutations through the lobby state machine. Keeps the
 * UI deterministic across renders.
 */
function groupSeatsBySide(
  seats: readonly IMatchSeat[],
): Map<string, IMatchSeat[]> {
  const map = new Map<string, IMatchSeat[]>();
  for (const seat of seats) {
    const list = map.get(seat.side);
    if (list) {
      list.push(seat);
    } else {
      map.set(seat.side, [seat]);
    }
  }
  // Sort each side's seats by seatNumber so the UI is predictable even
  // if the server reordered them. Using `forEach` here instead of a
  // `for-of map.values()` keeps the build target compatible without
  // requiring downlevelIteration.
  map.forEach((list: IMatchSeat[]) => {
    list.sort((a, b) => a.seatNumber - b.seatNumber);
  });
  return map;
}

/**
 * Does the caller currently sit somewhere in this lobby? Returns the
 * seat if yes, undefined if not. Used to gate the "Sit here" buttons
 * (no double-occupancy per Wave 3b spec) and to expose Leave/Ready on
 * the right row.
 */
function findOwnSeat(
  seats: readonly IMatchSeat[],
  myPlayerId: string,
): IMatchSeat | undefined {
  return seats.find(
    (s) => s.occupant != null && s.occupant.playerId === myPlayerId,
  );
}

// =============================================================================
// Component
// =============================================================================

export function LobbyPanel(props: ILobbyPanelProps): React.ReactElement {
  const { lobbyState, myPlayerId, onIntent } = props;
  const seats = lobbyState.seats;
  const isHost = lobbyState.hostPlayerId === myPlayerId;
  const ownSeat = findOwnSeat(seats, myPlayerId);
  const launchReady = canLaunch(seats);
  const grouped = groupSeatsBySide(seats);

  return (
    <div className="space-y-6">
      {/* Match info banner */}
      <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900 p-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Lobby — {lobbyState.matchId.slice(0, 8)}
          </h2>
          <p className="text-xs text-slate-400">
            Status: {lobbyState.status} · Host:{' '}
            {isHost ? 'you' : lobbyState.hostPlayerId.slice(0, 12)}
          </p>
        </div>
        {isHost && (
          <span className="rounded bg-violet-700 px-2 py-1 text-xs font-medium text-violet-100">
            Host controls
          </span>
        )}
      </div>

      {/* Seat grid by side */}
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from(grouped.entries()).map(([side, sideSeats]) => (
          <div key={side} className="space-y-2">
            <h3 className="text-sm font-semibold tracking-wide text-slate-300 uppercase">
              {side}
            </h3>
            {sideSeats.map((seat) => {
              const isOwn = ownSeat && ownSeat.slotId === seat.slotId;
              return (
                <SeatRow
                  key={seat.slotId}
                  seat={seat}
                  // Only allow Sit when the caller has no current seat
                  // and the slot is empty + human (the row checks the
                  // empty/ai constraints itself).
                  canOccupy={!ownSeat}
                  canLeave={Boolean(isOwn)}
                  canToggleReady={Boolean(isOwn)}
                  canHostManage={isHost}
                  onOccupy={() =>
                    onIntent({ kind: 'OccupySeat', slotId: seat.slotId })
                  }
                  onLeave={() =>
                    onIntent({ kind: 'LeaveSeat', slotId: seat.slotId })
                  }
                  onToggleReady={(ready) =>
                    onIntent({
                      kind: 'SetReady',
                      slotId: seat.slotId,
                      ready,
                    })
                  }
                  onSetAi={() =>
                    onIntent({ kind: 'SetAiSlot', slotId: seat.slotId })
                  }
                  onSetHuman={() =>
                    onIntent({ kind: 'SetHumanSlot', slotId: seat.slotId })
                  }
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Host-only controls */}
      {isHost && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900 p-4">
          <div className="text-xs text-slate-400">
            {launchReady
              ? 'All seats ready — you can launch the match.'
              : 'Waiting for every seat to be filled and ready.'}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!launchReady}
              onClick={() => onIntent({ kind: 'LaunchMatch' })}
              className={`rounded px-4 py-2 text-sm font-medium text-white ${
                launchReady
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'cursor-not-allowed bg-slate-700'
              }`}
            >
              Launch match
            </button>
            <button
              type="button"
              onClick={() => onIntent({ kind: 'ForfeitMatch' })}
              className="rounded bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600"
            >
              Forfeit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
