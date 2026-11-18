/**
 * The one owner of the LEGACY roster-unit match (T1): which roster unit a
 * battle's player unit was, when the battle has no launch-manifest entry
 * for it. Used by launch-time completion of a manifest, by the post-battle
 * apply for battles without one, and by the load-time migration of
 * session-keyed combat states, all through `resolveLegacyBattleUnitManifest`.
 *
 * ONE closed rule. A unit maps to a roster unit only on positive evidence
 * that identifies exactly one unit, with no contradicting evidence;
 * otherwise it is unresolved. With `design` the unit's `unitRef` and the
 * battle's force record being `bridgedEncounters[scenarioId]`'s player force
 * or else the team force whose id ends the scenario id
 * (`scn-<contract>-<date>-<team>`, `scenarioGenerationProcessor`):
 *
 * (A) The unit has a real `pilotRef` (not empty, not `UNKNOWN_PILOT_REF`).
 *     The only evidence is that pilot: it is linked to exactly one roster
 *     unit, that unit has the same design, and a known non-empty force
 *     record does not contradict it by omitting that unit. Nothing else
 *     (force, design) can stand in for or override a real pilot.
 * (B) The unit has no real `pilotRef` (outcomes recorded before
 *     `IUnitCombatDelta.pilotRef` was added, 2f3bd661e, 2026-07-10). Only
 *     the force record, and only if ALL hold: it is known, exists and is
 *     non-empty; every unit id it lists is still on the roster (a removed
 *     unit leaves the force record untouched and may be the one that
 *     fought); it holds exactly one unit of the design; and the design
 *     fought exactly once in the battle.
 *
 * There is no roster-pool fallback: no force record and no pilot means
 * unresolved. Around (A) and (B): a design that fought more than once is
 * attributed all or none, and two units resolving to one roster unit are
 * both refused. Slot order is never used.
 *
 * Known limit (B): a unit swapped WITHIN the force after the battle (the
 * force edited, every unit still on the roster) is not detectable without
 * a pilot, so the force record as it is now is used.
 */

import type {
  BattleUnitManifest,
  BattleUnitManifestEntry,
} from '@/types/campaign/BattleUnitManifest';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { LegacyRosterEvidence } from '@/types/campaign/LegacyCombatStateMigration';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type { IUnitCombatDelta } from '@/types/combat/CombatOutcome';

import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import type { ICampaignWithBridgeState } from './processors/scenarioEncounterBridgeProcessor';

import { UNKNOWN_PILOT_REF } from './pilotRefPlaceholder';

const SESSION_UNIT_ID = /^(player|opponent)-\d+-(.+)$/;

export function isSessionKeyedUnitId(key: string): boolean {
  return SESSION_UNIT_ID.test(key);
}

/** The identity a legacy match reads from a combat delta or a session unit. */
export type LegacyBattleUnit = Pick<
  IUnitCombatDelta,
  'unitId' | 'side' | 'unitRef' | 'pilotRef'
>;

export type LegacyUnresolvedReason =
  /** No positive evidence identifies exactly one unit. */
  | 'ambiguous'
  /** The pilot who fought points away from the unit the battle names. */
  | 'conflicting-pilot'
  /** Another unit of the same battle resolved to the same roster unit. */
  | 'double-claim';

export interface ILegacyUnresolvedUnit {
  readonly reason: LegacyUnresolvedReason;
  /** Roster units the player could check by hand (display only). */
  readonly candidates: readonly string[];
}

export interface ILegacyBattleUnitManifest {
  /** Entries only for player units matched to exactly one roster unit. */
  readonly manifest: BattleUnitManifest;
  /** How each manifest entry was matched, by session unit id. */
  readonly evidence: Readonly<Record<string, LegacyRosterEvidence>>;
  /** Player units with no match, by session unit id. */
  readonly unresolved: Readonly<Record<string, ILegacyUnresolvedUnit>>;
}

type LegacyCampaignView = Pick<ICampaign, 'forces'> &
  Pick<ICampaignWithBridgeState, 'bridgedEncounters'>;

type Match =
  | {
      readonly kind: 'resolved';
      readonly rosterUnitId: string;
      readonly evidence: LegacyRosterEvidence;
    }
  | ({ readonly kind: 'unresolved' } & ILegacyUnresolvedUnit);

/** What the battle's force record says, if anything. */
interface IForceRecordEvidence {
  /** Unit ids the record lists (non-empty), or undefined when unusable. */
  readonly members?: ReadonlySet<string>;
  /** True when it lists a unit no longer on the roster. */
  readonly listsRemovedUnit: boolean;
}

function designOf(unit: LegacyBattleUnit): string | undefined {
  return unit.unitRef ?? SESSION_UNIT_ID.exec(unit.unitId)?.[2];
}

function realPilotRef(unit: LegacyBattleUnit): string | undefined {
  return unit.pilotRef && unit.pilotRef !== UNKNOWN_PILOT_REF
    ? unit.pilotRef
    : undefined;
}

/** The battle's force record: bridged force id first, never a fallback past it. */
function forceRecord(
  campaign: LegacyCampaignView,
  scenarioId: string | null,
  rosterIds: ReadonlySet<string>,
): IForceRecordEvidence {
  if (!scenarioId) return { listsRemovedUnit: false };
  const bridgedForceId =
    campaign.bridgedEncounters?.[scenarioId]?.playerForce?.forceId;
  let force: { readonly unitIds: readonly string[] } | undefined;
  if (bridgedForceId) {
    force = campaign.forces.get(bridgedForceId);
  } else {
    const encoded = [...campaign.forces.values()].filter((candidate) =>
      scenarioId.endsWith(`-${candidate.id}`),
    );
    force = encoded.length === 1 ? encoded[0] : undefined;
  }
  if (!force || force.unitIds.length === 0) return { listsRemovedUnit: false };
  return {
    members: new Set(force.unitIds),
    listsRemovedUnit: force.unitIds.some((unitId) => !rosterIds.has(unitId)),
  };
}

function matchUnit(
  unit: LegacyBattleUnit,
  design: string,
  timesFought: number,
  rosterUnits: readonly IRosterUnitProjection[],
  force: IForceRecordEvidence,
): Match {
  const ofDesign = rosterUnits.filter(
    (rosterUnit) => rosterUnit.unitRef === design,
  );
  const inForce = force.members
    ? ofDesign.filter((rosterUnit) => force.members!.has(rosterUnit.unitId))
    : [];
  const candidates = (inForce.length > 0 ? inForce : ofDesign).map(
    (rosterUnit) => rosterUnit.unitId,
  );
  const unresolved = (reason: LegacyUnresolvedReason): Match => ({
    kind: 'unresolved',
    reason,
    candidates,
  });

  const pilotRef = realPilotRef(unit);
  if (pilotRef) {
    // (A) the pilot is the only evidence.
    const holders = rosterUnits.filter(
      (rosterUnit) => rosterUnit.pilotId === pilotRef,
    );
    if (holders.length === 0) {
      // The pilot is on no unit: nothing identifies the unit. A single
      // candidate that now has another pilot is evidence against it.
      return unresolved(
        candidates.length === 1 &&
          (inForce[0] ?? ofDesign[0])?.pilotId !== undefined
          ? 'conflicting-pilot'
          : 'ambiguous',
      );
    }
    const holder = holders[0];
    if (
      holders.length > 1 ||
      holder.unitRef !== design ||
      (force.members !== undefined && !force.members.has(holder.unitId))
    ) {
      return unresolved('conflicting-pilot');
    }
    return { kind: 'resolved', rosterUnitId: holder.unitId, evidence: 'pilot' };
  }

  // (B) no pilot: the force record alone, only when it is complete.
  if (
    !force.members ||
    force.listsRemovedUnit ||
    timesFought !== 1 ||
    inForce.length !== 1
  ) {
    return unresolved('ambiguous');
  }
  return {
    kind: 'resolved',
    rosterUnitId: inForce[0].unitId,
    evidence: 'force',
  };
}

/**
 * Resolve every player unit of one battle. `battle.unitDeltas` may be the
 * outcome's deltas or the session's player units at launch.
 */
export function resolveLegacyBattleUnitManifest(
  campaign: LegacyCampaignView,
  rosterUnits: readonly IRosterUnitProjection[],
  battle: {
    readonly scenarioId: string | null;
    readonly unitDeltas: readonly LegacyBattleUnit[];
  },
): ILegacyBattleUnitManifest {
  const players = battle.unitDeltas.filter(
    (unit) => unit.side === GameSide.Player,
  );
  const timesFought = new Map<string, number>();
  for (const unit of players) {
    const design = designOf(unit);
    if (design) timesFought.set(design, (timesFought.get(design) ?? 0) + 1);
  }
  const rosterIds = new Set(rosterUnits.map((rosterUnit) => rosterUnit.unitId));
  const force = forceRecord(campaign, battle.scenarioId, rosterIds);

  const matches = players.map((unit) => {
    const design = designOf(unit);
    const match: Match = design
      ? matchUnit(
          unit,
          design,
          timesFought.get(design) ?? 0,
          rosterUnits,
          force,
        )
      : { kind: 'unresolved', reason: 'ambiguous', candidates: [] };
    return { unit, design, match };
  });

  // A design that fought more than once is attributed all or none.
  const designsWithGaps = new Set(
    matches.flatMap(({ design, match }) =>
      design &&
      match.kind === 'unresolved' &&
      (timesFought.get(design) ?? 0) > 1
        ? [design]
        : [],
    ),
  );
  for (const entry of matches) {
    if (
      entry.design &&
      entry.match.kind === 'resolved' &&
      designsWithGaps.has(entry.design)
    ) {
      entry.match = {
        kind: 'unresolved',
        reason: 'ambiguous',
        candidates: [entry.match.rosterUnitId],
      };
    }
  }

  // Two units resolving to one roster unit are both refused.
  const claims = new Map<string, number>();
  for (const { match } of matches) {
    if (match.kind === 'resolved') {
      claims.set(match.rosterUnitId, (claims.get(match.rosterUnitId) ?? 0) + 1);
    }
  }
  const manifest: Record<string, BattleUnitManifestEntry> = {};
  const evidence: Record<string, LegacyRosterEvidence> = {};
  const unresolved: Record<string, ILegacyUnresolvedUnit> = {};
  for (const { unit, match } of matches) {
    if (match.kind === 'unresolved') {
      unresolved[unit.unitId] = {
        reason: match.reason,
        candidates: match.candidates,
      };
    } else if (claims.get(match.rosterUnitId) === 1) {
      manifest[unit.unitId] = { rosterUnitId: match.rosterUnitId };
      evidence[unit.unitId] = match.evidence;
    } else {
      unresolved[unit.unitId] = {
        reason: 'double-claim',
        candidates: [match.rosterUnitId],
      };
    }
  }
  return { manifest, evidence, unresolved };
}
