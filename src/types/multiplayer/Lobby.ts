/**
 * Multiplayer Lobby Primitives
 *
 * Wave 3b of Phase 4. Defines the seat-slot data model the server uses to
 * track which players (or AI bots) occupy which side/seat in a 2-8 player
 * match. The lobby state machine in
 * `src/lib/multiplayer/server/lobby/lobbyStateMachine.ts` operates on
 * these shapes; the seats blob lives on `IMatchMeta.seats`.
 *
 * Locked design choices:
 *   - Team layouts produce 2 sides x N seats; FFA produces N sides x 1.
 *   - Side names are the first 8 letters of the NATO phonetic alphabet
 *     (`Alpha`, `Bravo`, ...) so extension to larger FFAs is mechanical.
 *   - `slotId` format: `${sideLowercase}-${seatNumber}` e.g. `alpha-1`.
 *     Seat numbers are 1-indexed for UI sanity.
 *   - Seats are flat (one array on the meta) rather than nested by side
 *     so producers/consumers don't have to walk a 2-level tree to find
 *     a slot by id.
 *
 * @spec openspec/changes/add-multiplayer-lobby-and-matchmaking-2-8/specs/multiplayer-server/spec.md
 */

import { z } from 'zod';

import { PlayerRefSchema, type IPlayerRef } from './Player';

// =============================================================================
// TeamLayout
// =============================================================================

/**
 * The complete enumeration of supported team layouts. Wave 3b ships every
 * variant in `tasks.md`; future expansion (e.g., `5v5`) would add a
 * literal here AND a matching entry in `LAYOUT_SPECS` below.
 */
export type TeamLayout =
  | '1v1'
  | '2v2'
  | '3v3'
  | '4v4'
  | 'ffa-2'
  | 'ffa-3'
  | 'ffa-4'
  | 'ffa-5'
  | 'ffa-6'
  | 'ffa-7'
  | 'ffa-8';

export const TeamLayoutSchema = z.enum([
  '1v1',
  '2v2',
  '3v3',
  '4v4',
  'ffa-2',
  'ffa-3',
  'ffa-4',
  'ffa-5',
  'ffa-6',
  'ffa-7',
  'ffa-8',
]);

// =============================================================================
// Side names
// =============================================================================

/**
 * NATO phonetic alphabet, first 8 entries — covers FFA-8 (max layout).
 * Pulled out as a module-level constant so tests can import it for
 * stable assertion strings.
 */
export const SIDE_NAMES: readonly string[] = [
  'Alpha',
  'Bravo',
  'Charlie',
  'Delta',
  'Echo',
  'Foxtrot',
  'Golf',
  'Hotel',
];

// =============================================================================
// Layout spec table
// =============================================================================

/**
 * Pure declarative table of layout -> {sides, seatsPerSide}. Centralised
 * here so `defaultSeats`, `seatLayoutSpec`, and any future helpers all
 * read the same source of truth. Avoids parsing `'ffa-N'` strings at
 * call sites.
 */
const LAYOUT_SPECS: Readonly<
  Record<TeamLayout, { sides: number; seatsPerSide: number }>
> = {
  '1v1': { sides: 2, seatsPerSide: 1 },
  '2v2': { sides: 2, seatsPerSide: 2 },
  '3v3': { sides: 2, seatsPerSide: 3 },
  '4v4': { sides: 2, seatsPerSide: 4 },
  'ffa-2': { sides: 2, seatsPerSide: 1 },
  'ffa-3': { sides: 3, seatsPerSide: 1 },
  'ffa-4': { sides: 4, seatsPerSide: 1 },
  'ffa-5': { sides: 5, seatsPerSide: 1 },
  'ffa-6': { sides: 6, seatsPerSide: 1 },
  'ffa-7': { sides: 7, seatsPerSide: 1 },
  'ffa-8': { sides: 8, seatsPerSide: 1 },
};

/**
 * Resolve a layout to its side roster + per-side seat count. Throws on
 * unknown layouts — callers should rely on the `TeamLayoutSchema` to
 * validate user input upstream.
 */
export function seatLayoutSpec(layout: TeamLayout): {
  sides: readonly string[];
  seatsPerSide: number;
} {
  const spec = LAYOUT_SPECS[layout];
  if (!spec) {
    throw new Error(`Unknown team layout: ${String(layout)}`);
  }
  return {
    sides: SIDE_NAMES.slice(0, spec.sides),
    seatsPerSide: spec.seatsPerSide,
  };
}

// =============================================================================
// IMatchSeat
// =============================================================================

/**
 * One seat in a multiplayer lobby. Every slot in a match is described by
 * exactly one of these — empty seats live in the array with `occupant:
 * null`, AI seats live with `kind: 'ai'` and a profile string.
 *
 * Why `slotId` is denormalised even though it equals `${side}-${seat}`:
 * the lobby state machine + WS broadcasts pass slot ids around as
 * opaque strings, and centralising the format in one place would force
 * every consumer to know the format. Storing the literal string keeps
 * the wire envelope flat.
 */
export interface IMatchSeat {
  readonly slotId: string;
  readonly side: string;
  readonly seatNumber: number;
  readonly occupant: IPlayerRef | null;
  readonly kind: 'human' | 'ai';
  readonly ready: boolean;
  readonly aiProfile?: string;
}

export const MatchSeatSchema = z.object({
  slotId: z.string().min(1),
  side: z.string().min(1),
  seatNumber: z.number().int().positive(),
  occupant: PlayerRefSchema.nullable(),
  kind: z.enum(['human', 'ai']),
  ready: z.boolean(),
  aiProfile: z.string().min(1).optional(),
});

// =============================================================================
// slotId helpers
// =============================================================================

/**
 * Build the canonical `slotId` for a `(side, seatNumber)` pair. Side is
 * lowercased so the wire format is stable regardless of how the side
 * name was capitalised at construction time.
 */
export function buildSlotId(side: string, seatNumber: number): string {
  return `${side.toLowerCase()}-${seatNumber}`;
}

// =============================================================================
// defaultSeats
// =============================================================================

/**
 * Build the initial empty seat array for a layout. All seats start as
 * `kind: 'human'`, `occupant: null`, `ready: false`. Match creation can
 * post-process to flip specific slot ids to AI (`setAiSlot` from the
 * lobby state machine) and to occupy the host's seat.
 */
export function defaultSeats(layout: TeamLayout): IMatchSeat[] {
  const { sides, seatsPerSide } = seatLayoutSpec(layout);
  const seats: IMatchSeat[] = [];
  for (const side of sides) {
    for (let seat = 1; seat <= seatsPerSide; seat += 1) {
      seats.push({
        slotId: buildSlotId(side, seat),
        side,
        seatNumber: seat,
        occupant: null,
        kind: 'human',
        ready: false,
      });
    }
  }
  return seats;
}

/**
 * Compute the total seat count for a layout. Used by the `MATCH_FULL`
 * gate when a sixth player tries to join a `2v2` and similar checks.
 */
export function totalSeatCount(layout: TeamLayout): number {
  const { sides, seatsPerSide } = seatLayoutSpec(layout);
  return sides.length * seatsPerSide;
}
