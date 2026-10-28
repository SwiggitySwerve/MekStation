/**
 * First assignment for one player. Shared by command admission, concessions
 * and sealed delivery; this is not a single-owner lookup for a whole side.
 * @spec openspec/specs/multiplayer-server/spec.md
 */
export function sideOfPlayer<Side extends string>(
  assignments:
    | readonly { readonly playerId: string; readonly side: Side }[]
    | null
    | undefined,
  playerId: string,
): Side | undefined {
  return assignments?.find((assignment) => assignment.playerId === playerId)
    ?.side;
}
