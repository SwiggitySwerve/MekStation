/**
 * Launch manifest: which roster unit each player session unit is.
 *
 * A campaign battle's session units carry session-scoped ids
 * (`player-<slot+1>-<unitRef>`), never the roster `unitId`. The manifest is
 * written when the session is built, keyed by the exact session unit id
 * string, so post-battle code can key campaign state by roster unit without
 * re-deriving identity from slot order or design.
 *
 * Campaign-side only: it never reaches `IGameUnit`, `GameCreated` or any
 * recorded or broadcast game event.
 */

/** A player session unit that is a campaign roster unit. */
export interface IRosterBattleUnitManifestEntry {
  readonly rosterUnitId: string;
}

/** A player session unit with no roster unit behind it (e.g. an ally). */
export interface INotOnRosterBattleUnitManifestEntry {
  readonly notOnRoster: true;
}

export type BattleUnitManifestEntry =
  | IRosterBattleUnitManifestEntry
  | INotOnRosterBattleUnitManifestEntry;

/** Keyed by the exact session unit id the session builder produced. */
export type BattleUnitManifest = Readonly<
  Record<string, BattleUnitManifestEntry>
>;
