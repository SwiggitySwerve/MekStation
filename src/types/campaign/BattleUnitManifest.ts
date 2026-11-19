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

/**
 * A player session unit with no roster link at launch that the legacy
 * match could not attribute either. Final: at apply its delta is never
 * re-resolved; it is written to no unit, flagged and quarantined, with the
 * candidates recorded here.
 */
export interface IUnresolvedBattleUnitManifestEntry {
  readonly unresolved: true;
  readonly candidates: readonly string[];
}

export type BattleUnitManifestEntry =
  | IRosterBattleUnitManifestEntry
  | INotOnRosterBattleUnitManifestEntry
  | IUnresolvedBattleUnitManifestEntry;

/** Keyed by the exact session unit id the session builder produced. */
export type BattleUnitManifest = Readonly<
  Record<string, BattleUnitManifestEntry>
>;

/**
 * A manifest held on the campaign until its battle is applied. Its date
 * lets a battle that never produced an outcome be pruned after the
 * retained-outcome window.
 */
export interface IPendingBattleUnitManifest {
  readonly units: BattleUnitManifest;
  /**
   * True when every player session unit has a roster or not-on-roster
   * entry: a missing entry is then an error (T3). False when some unit is
   * recorded unresolved: that unit's delta is unapplied (flagged and
   * quarantined) at apply, and a delta with no entry at all takes the
   * legacy match.
   */
  readonly complete: boolean;
  /** ISO campaign date (not wall clock) the session was created on. */
  readonly recordedOn: string;
}
