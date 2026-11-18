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
 * - A player delta with no manifest, or no entry in it, is unmapped: the
 *   caller must treat that as an error, never guess.
 */

import type {
  BattleUnitManifest,
  IPendingBattleUnitManifest,
} from '@/types/campaign/BattleUnitManifest';
import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  IAppliedCombatOutcome,
  ICombatOutcome,
  IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';

import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import { APPLIED_OUTCOME_RETENTION_DAYS } from './appliedOutcomes';
import { campaignDaysBetween } from './campaignCalendar';

export type DeltaRosterResolution =
  | { readonly kind: 'roster'; readonly rosterUnitId: string }
  | { readonly kind: 'skip'; readonly reason: 'opponent' | 'not-on-roster' }
  | { readonly kind: 'unmapped'; readonly message: string };

/**
 * The manifest for an outcome: the one recorded on the applied outcome, or
 * the campaign's pending manifest for that match.
 */
export function battleUnitManifestFor(
  campaign: Pick<ICampaign, 'battleUnitManifests'>,
  outcome: ICombatOutcome | IAppliedCombatOutcome,
): BattleUnitManifest | undefined {
  return (
    (outcome as IAppliedCombatOutcome).unitManifest ??
    campaign.battleUnitManifests?.[outcome.matchId]?.units
  );
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
  if (!entry) {
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
