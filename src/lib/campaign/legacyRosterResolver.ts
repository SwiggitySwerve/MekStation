/**
 * The one owner of the LEGACY roster-unit match (T1): which roster unit a
 * battle's player unit was, when the battle has no launch manifest entry
 * for it. Used by the load-time migration of session-keyed combat states,
 * by the post-battle apply for battles queued or started before manifests
 * existed, and by the launch recorder for assignments with no roster link.
 *
 * It never invents an attribution. For each player unit of the battle,
 * with `design` the unit's `unitRef`:
 *   - Pool: roster units of that design; when the mission's force record is
 *     known (`bridgedEncounters[scenarioId]`'s player force, or the team
 *     force whose id ends the scenario id, `scn-<contract>-<date>-<team>`
 *     per `scenarioGenerationProcessor.buildScenarioId`) and holds some of
 *     them, only those.
 *   - A design that fought more than once in this battle resolves only by
 *     the unit's `pilotRef` matching exactly one pool unit's pilot.
 *   - A design that fought once resolves to the single pool unit, unless
 *     that unit's current pilot disagrees with a non-empty `pilotRef`
 *     (conflicting evidence: the force or roster changed since). With
 *     several pool units it resolves only by pilot.
 *   - Two player units resolving to the same roster unit are both refused.
 * Slot order is never used.
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

const SESSION_UNIT_ID = /^(player|opponent)-\d+-(.+)$/;

/**
 * The campaign session builder stamps unassigned units with this pilotRef
 * (`buildGameUnits` in `preBattleSessionBuilder.ts`); it is not evidence.
 */
const UNASSIGNED_PILOT_REF = 'Unknown';

export function isSessionKeyedUnitId(key: string): boolean {
  return SESSION_UNIT_ID.test(key);
}

/** The identity a legacy match reads from a combat delta or a session unit. */
export type LegacyBattleUnit = Pick<
  IUnitCombatDelta,
  'unitId' | 'side' | 'unitRef' | 'pilotRef'
>;

export type LegacyUnresolvedReason =
  /** No pool unit, or several and no pilot evidence picks one. */
  | 'ambiguous'
  /** The only candidate's current pilot is not the pilot who fought. */
  | 'conflicting-pilot'
  /** Another unit of the same battle resolved to the same roster unit. */
  | 'double-claim';

export interface ILegacyUnresolvedUnit {
  readonly reason: LegacyUnresolvedReason;
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

function designOf(unit: LegacyBattleUnit): string | undefined {
  return unit.unitRef ?? SESSION_UNIT_ID.exec(unit.unitId)?.[2];
}

function missionForce(
  campaign: LegacyCampaignView,
  scenarioId: string | null,
): { readonly unitIds: readonly string[] } | undefined {
  if (!scenarioId) return undefined;
  const bridgedForceId =
    campaign.bridgedEncounters?.[scenarioId]?.playerForce?.forceId;
  if (bridgedForceId) return campaign.forces.get(bridgedForceId);
  const encoded = [...campaign.forces.values()].filter((force) =>
    scenarioId.endsWith(`-${force.id}`),
  );
  return encoded.length === 1 ? encoded[0] : undefined;
}

function matchUnit(
  unit: LegacyBattleUnit,
  timesFought: number,
  pool: readonly IRosterUnitProjection[],
  fromForce: boolean,
): Match {
  const candidates = pool.map((rosterUnit) => rosterUnit.unitId);
  const pilotRef =
    unit.pilotRef && unit.pilotRef !== UNASSIGNED_PILOT_REF
      ? unit.pilotRef
      : undefined;
  const byPilot = pilotRef
    ? pool.filter((rosterUnit) => rosterUnit.pilotId === pilotRef)
    : [];
  if (timesFought === 1 && pool.length === 1) {
    const only = pool[0];
    if (pilotRef && only.pilotId && only.pilotId !== pilotRef) {
      return { kind: 'unresolved', reason: 'conflicting-pilot', candidates };
    }
    return {
      kind: 'resolved',
      rosterUnitId: only.unitId,
      evidence: fromForce ? 'force' : 'design',
    };
  }
  // Fought more than once, or several pool units: only the pilot decides.
  if (byPilot.length === 1) {
    return {
      kind: 'resolved',
      rosterUnitId: byPilot[0].unitId,
      evidence: 'pilot',
    };
  }
  return { kind: 'unresolved', reason: 'ambiguous', candidates };
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
  const force = missionForce(campaign, battle.scenarioId);
  const members = force ? new Set(force.unitIds) : undefined;

  const matches = players.map((unit) => {
    const design = designOf(unit);
    if (!design) {
      return {
        unit,
        match: {
          kind: 'unresolved',
          reason: 'ambiguous',
          candidates: [],
        } as Match,
      };
    }
    const ofDesign = rosterUnits.filter(
      (rosterUnit) => rosterUnit.unitRef === design,
    );
    const inForce = members
      ? ofDesign.filter((rosterUnit) => members.has(rosterUnit.unitId))
      : [];
    const fromForce = inForce.length > 0;
    return {
      unit,
      match: matchUnit(
        unit,
        timesFought.get(design) ?? 0,
        fromForce ? inForce : ofDesign,
        fromForce,
      ),
    };
  });

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
