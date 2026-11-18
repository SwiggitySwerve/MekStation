/**
 * The one owner of "which roster unit is this combat delta?" (T1).
 *
 * Session unit ids (`player-<slot+1>-<unitRef>`) are not roster unit ids.
 * Every campaign reader that keys campaign state by roster unit from an
 * outcome's `unitDeltas` resolves each delta here, through the launch
 * manifest the session builder wrote when it built those ids.
 *
 * Rules:
 * - Opponent deltas never map to a roster unit.
 * - A player delta whose manifest entry is `notOnRoster` is skipped.
 * - With a complete recorded manifest, a player delta with no entry is an
 *   error (T3). Without one, the delta takes the legacy path
 *   (`planOutcomeUnitWrites`): the legacy match, else written to no unit
 *   and flagged. Nothing is ever guessed.
 */

import type {
  BattleUnitManifest,
  BattleUnitManifestEntry,
  IPendingBattleUnitManifest,
} from '@/types/campaign/BattleUnitManifest';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { LegacyCombatStateFlagReason } from '@/types/campaign/LegacyCombatStateMigration';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type {
  IAppliedCombatOutcome,
  ICombatOutcome,
  IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';

import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import type { ICampaignWithBridgeState } from './processors/scenarioEncounterBridgeProcessor';

import { APPLIED_OUTCOME_RETENTION_DAYS } from './appliedOutcomes';
import { campaignDaysBetween } from './campaignCalendar';
import {
  resolveLegacyBattleUnitManifest,
  type ILegacyBattleUnitManifest,
} from './legacyRosterResolver';

export type DeltaRosterResolution =
  | { readonly kind: 'roster'; readonly rosterUnitId: string }
  | { readonly kind: 'skip'; readonly reason: 'opponent' | 'not-on-roster' }
  | { readonly kind: 'unmapped'; readonly message: string };

export interface IRecordedBattleUnitManifest {
  readonly units: BattleUnitManifest;
  readonly complete: boolean;
}

/**
 * The manifest recorded for an outcome: the one on the applied outcome
 * (always complete: it lists every unit the apply wrote), or the campaign's
 * pending manifest for that match.
 */
export function battleUnitManifestFor(
  campaign: Pick<ICampaign, 'battleUnitManifests'>,
  outcome: ICombatOutcome | IAppliedCombatOutcome,
): IRecordedBattleUnitManifest | undefined {
  const applied = (outcome as IAppliedCombatOutcome).unitManifest;
  if (applied) return { units: applied, complete: true };
  return campaign.battleUnitManifests?.[outcome.matchId];
}

/** A player delta that will be written under a roster unit. */
export interface IPlannedUnitWrite {
  readonly delta: IUnitCombatDelta;
  readonly rosterUnitId: string;
}

/** A player delta no evidence attributes: written to no unit, flagged. */
export interface IUnappliedLegacyDelta {
  readonly delta: IUnitCombatDelta;
  readonly reason: Extract<
    LegacyCombatStateFlagReason,
    'ambiguous-roster-unit' | 'conflicting-pilot'
  >;
  readonly candidates: readonly string[];
}

export interface IOutcomeUnitWritePlan {
  readonly writes: readonly IPlannedUnitWrite[];
  readonly unapplied: readonly IUnappliedLegacyDelta[];
  /** Forward-path errors (T3): the outcome must stay queued. */
  readonly errors: readonly string[];
  /** The mapping the apply used, recorded on the applied outcome. */
  readonly appliedManifest: BattleUnitManifest;
}

/**
 * The legacy matches that may be used for units WITHOUT a manifest entry,
 * in the given order: a match is refused when it claims a roster unit the
 * manifest already names, or one an earlier accepted match took. The one
 * owner of that rule for launch-time completion and for the apply.
 */
function acceptUnclaimedLegacyMatches(
  manifest: BattleUnitManifest,
  legacy: ILegacyBattleUnitManifest,
  unitIds: readonly string[],
): Map<string, string> {
  const claimed = new Set(
    Object.values(manifest).flatMap((entry) =>
      'rosterUnitId' in entry ? [entry.rosterUnitId] : [],
    ),
  );
  const accepted = new Map<string, string>();
  for (const unitId of unitIds) {
    if (manifest[unitId]) continue;
    const match = legacy.manifest[unitId];
    if (match && 'rosterUnitId' in match && !claimed.has(match.rosterUnitId)) {
      claimed.add(match.rosterUnitId);
      accepted.set(unitId, match.rosterUnitId);
    }
  }
  return accepted;
}

/**
 * Which roster unit each player delta of `outcome` is written under.
 *
 * - A COMPLETE recorded manifest is authoritative: a player delta with no
 *   roster or not-on-roster entry is an error (T3, stays queued).
 * - Otherwise (no manifest, an aged-out one, or one with unresolved units)
 *   a delta with NO entry takes the legacy match (`legacyRosterResolver`).
 *   A launch-time `unresolved` entry, or a delta the legacy match cannot
 *   attribute, is written to no unit and returned in `unapplied` for the
 *   caller to flag and quarantine. The rest of the outcome still applies.
 * Opponent deltas and not-on-roster units are never written.
 */
export function planOutcomeUnitWrites(
  campaign: Pick<ICampaign, 'battleUnitManifests' | 'forces'> &
    Pick<ICampaignWithBridgeState, 'bridgedEncounters'>,
  rosterUnits: readonly IRosterUnitProjection[],
  outcome: ICombatOutcome,
): IOutcomeUnitWritePlan {
  const recorded = battleUnitManifestFor(campaign, outcome);
  const players = outcome.unitDeltas.filter(
    (delta) => delta.side === GameSide.Player,
  );
  const writes: IPlannedUnitWrite[] = [];
  const unapplied: IUnappliedLegacyDelta[] = [];
  const errors: string[] = [];
  const appliedManifest: Record<string, BattleUnitManifestEntry> = {};
  const entryOf = (unitId: string) => recorded?.units[unitId];

  if (recorded?.complete) {
    for (const delta of players) {
      const entry = entryOf(delta.unitId);
      if (entry && 'rosterUnitId' in entry) {
        writes.push({ delta, rosterUnitId: entry.rosterUnitId });
        appliedManifest[delta.unitId] = entry;
      } else if (entry && 'notOnRoster' in entry) {
        appliedManifest[delta.unitId] = entry;
      } else {
        errors.push(
          `unit ${delta.unitId}: session unit is not in the launch manifest`,
        );
      }
    }
    return { writes, unapplied, errors, appliedManifest };
  }

  // Only a delta with NO entry takes the legacy match. A launch-time
  // `unresolved` entry stays unresolved: re-matching it against the force
  // as it is at apply could attribute it to the wrong unit.
  const needsLegacy = players.some((delta) => !entryOf(delta.unitId));
  const legacy = needsLegacy
    ? resolveLegacyBattleUnitManifest(campaign, rosterUnits, outcome)
    : undefined;
  const accepted = legacy
    ? acceptUnclaimedLegacyMatches(
        recorded?.units ?? {},
        legacy,
        players.map((delta) => delta.unitId),
      )
    : new Map<string, string>();
  for (const delta of players) {
    const entry = entryOf(delta.unitId);
    if (entry && 'rosterUnitId' in entry) {
      writes.push({ delta, rosterUnitId: entry.rosterUnitId });
      appliedManifest[delta.unitId] = entry;
      continue;
    }
    if (entry && 'notOnRoster' in entry) {
      appliedManifest[delta.unitId] = entry;
      continue;
    }
    if (entry && 'unresolved' in entry) {
      unapplied.push({
        delta,
        reason: 'ambiguous-roster-unit',
        candidates: entry.candidates,
      });
      continue;
    }
    const match = legacy?.manifest[delta.unitId];
    const acceptedRosterUnitId = accepted.get(delta.unitId);
    if (acceptedRosterUnitId !== undefined) {
      writes.push({ delta, rosterUnitId: acceptedRosterUnitId });
      appliedManifest[delta.unitId] = { rosterUnitId: acceptedRosterUnitId };
      continue;
    }
    const unresolved = legacy?.unresolved[delta.unitId];
    unapplied.push({
      delta,
      reason:
        unresolved?.reason === 'conflicting-pilot'
          ? 'conflicting-pilot'
          : 'ambiguous-roster-unit',
      candidates:
        unresolved?.candidates ??
        (match && 'rosterUnitId' in match ? [match.rosterUnitId] : []),
    });
  }
  return { writes, unapplied, errors, appliedManifest };
}

type PendingManifests = Readonly<Record<string, IPendingBattleUnitManifest>>;

/**
 * Drop the manifests of battles that never produced an outcome: a match
 * that is not pending is pruned once it is older than the retained-outcome
 * window in CAMPAIGN days. A relaunch of the same mission prunes nothing,
 * because the earlier battle may still be in progress; a battle that
 * finishes after its manifest aged out applies through the legacy path.
 * Returns the same object when nothing is pruned.
 */
export function prunePendingBattleUnitManifests(
  manifests: PendingManifests,
  {
    pendingMatchIds,
    asOf,
  }: {
    readonly pendingMatchIds: ReadonlySet<string>;
    readonly asOf: Date;
  },
): PendingManifests {
  const kept = Object.entries(manifests).filter(
    ([matchId, entry]) =>
      pendingMatchIds.has(matchId) ||
      campaignDaysBetween(new Date(entry.recordedOn), asOf) <=
        APPLIED_OUTCOME_RETENTION_DAYS,
  );
  return kept.length === Object.keys(manifests).length
    ? manifests
    : Object.fromEntries(kept);
}

/**
 * `campaign` with its aged-out pending manifests pruned
 * (`prunePendingBattleUnitManifests`); the same object when none are.
 */
export function withPrunedBattleUnitManifests<
  T extends Pick<ICampaign, 'battleUnitManifests'>,
>(
  campaign: T,
  pending: readonly { readonly matchId: string }[],
  asOf: Date,
): T {
  const manifests = campaign.battleUnitManifests;
  if (!manifests) return campaign;
  const pruned = prunePendingBattleUnitManifests(manifests, {
    pendingMatchIds: new Set(pending.map((outcome) => outcome.matchId)),
    asOf,
  });
  return pruned === manifests
    ? campaign
    : { ...campaign, battleUnitManifests: pruned };
}

/** A player session unit as the launch sees it. */
export interface ILaunchPlayerUnit {
  readonly unitId: string;
  readonly unitRef?: string;
  readonly pilotRef?: string | null;
}

/**
 * Fill in a launch manifest at launch time (R4). Player units the session
 * builder had no roster link for (reused pre-upgrade encounters, cleared or
 * cloned assignments) are matched now with the legacy resolver against the
 * current force and roster, the launch-time truth; one claiming a roster
 * unit already linked is refused. What still cannot be matched is recorded
 * as unresolved, and the manifest is complete only when nothing is.
 */
export function completeLaunchManifest(
  campaign: Pick<ICampaign, 'forces'> &
    Pick<ICampaignWithBridgeState, 'bridgedEncounters'>,
  rosterUnits: readonly IRosterUnitProjection[],
  {
    units,
    playerUnits,
    scenarioId,
  }: {
    readonly units: BattleUnitManifest;
    readonly playerUnits: readonly ILaunchPlayerUnit[];
    readonly scenarioId: string | null;
  },
): IRecordedBattleUnitManifest {
  const unlinked = playerUnits.filter((unit) => !units[unit.unitId]);
  if (unlinked.length === 0) return { units, complete: true };
  const legacy = resolveLegacyBattleUnitManifest(campaign, rosterUnits, {
    scenarioId,
    unitDeltas: playerUnits.map((unit) => ({
      unitId: unit.unitId,
      side: GameSide.Player,
      unitRef: unit.unitRef,
      pilotRef: unit.pilotRef,
    })),
  });
  const accepted = acceptUnclaimedLegacyMatches(
    units,
    legacy,
    unlinked.map((unit) => unit.unitId),
  );
  const completed: Record<string, BattleUnitManifestEntry> = { ...units };
  let complete = true;
  for (const unit of unlinked) {
    const rosterUnitId = accepted.get(unit.unitId);
    if (rosterUnitId !== undefined) {
      completed[unit.unitId] = { rosterUnitId };
    } else {
      complete = false;
      completed[unit.unitId] = {
        unresolved: true,
        candidates: legacy.unresolved[unit.unitId]?.candidates ?? [],
      };
    }
  }
  return { units: completed, complete };
}

export function resolveDeltaRosterUnit(
  delta: Pick<IUnitCombatDelta, 'unitId' | 'side'>,
  manifest: BattleUnitManifest | undefined,
): DeltaRosterResolution {
  if (delta.side !== GameSide.Player) {
    return { kind: 'skip', reason: 'opponent' };
  }
  if (!manifest) {
    return {
      kind: 'unmapped',
      message: 'battle has no launch manifest; cannot identify the roster unit',
    };
  }
  const entry = manifest[delta.unitId];
  if (!entry || 'unresolved' in entry) {
    return {
      kind: 'unmapped',
      message: 'session unit is not in the launch manifest',
    };
  }
  if ('notOnRoster' in entry) {
    return { kind: 'skip', reason: 'not-on-roster' };
  }
  return { kind: 'roster', rosterUnitId: entry.rosterUnitId };
}
