/**
 * The one owner of the LEGACY roster-unit match (T1): which roster unit a
 * combat delta belongs to when its battle has no launch manifest. Used by
 * the load-time migration of session-keyed combat states and by the
 * post-battle apply for battles queued or started before the manifest
 * existed.
 *
 * Trust order for a player delta, never slot alone:
 *   1. the mission's force record: `bridgedEncounters[scenarioId]`'s player
 *      force, or (bridged encounters are not persisted) the team force
 *      whose id ends the scenario id (`scn-<contract>-<date>-<teamForceId>`,
 *      `scenarioGenerationProcessor.buildScenarioId`), intersected with the
 *      roster and matched on `unitRef`;
 *   2. `delta.pilotRef` against the roster unit's `pilotId`;
 *   3. the design being unique on that mission and on the roster.
 */

import type {
  BattleUnitManifest,
  BattleUnitManifestEntry,
} from '@/types/campaign/BattleUnitManifest';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { LegacyRosterEvidence } from '@/types/campaign/LegacyCombatStateMigration';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type {
  ICombatOutcome,
  IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';

import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import type { ICampaignWithBridgeState } from './processors/scenarioEncounterBridgeProcessor';

const SESSION_UNIT_ID = /^(player|opponent)-\d+-(.+)$/;

export function isSessionKeyedUnitId(key: string): boolean {
  return SESSION_UNIT_ID.test(key);
}

export interface ILegacyRosterMatch {
  /** Exactly one entry means a match; zero or several mean none. */
  readonly candidates: readonly string[];
  readonly evidence?: LegacyRosterEvidence;
}

type LegacyCampaignView = Pick<ICampaign, 'forces'> &
  Pick<ICampaignWithBridgeState, 'bridgedEncounters'>;

function unitRefOf(delta: IUnitCombatDelta): string | undefined {
  return delta.unitRef ?? SESSION_UNIT_ID.exec(delta.unitId)?.[2];
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

/** Match one player delta of `outcome` to a roster unit. */
export function resolveLegacyRosterUnit(
  campaign: LegacyCampaignView,
  rosterUnits: readonly IRosterUnitProjection[],
  outcome: Pick<ICombatOutcome, 'scenarioId' | 'unitDeltas'>,
  delta: IUnitCombatDelta,
): ILegacyRosterMatch {
  const unitRef = unitRefOf(delta);
  if (!unitRef) return { candidates: [] };
  let pool = rosterUnits.filter((unit) => unit.unitRef === unitRef);

  const force = missionForce(campaign, outcome.scenarioId);
  if (force) {
    const members = new Set(force.unitIds);
    const inForce = pool.filter((unit) => members.has(unit.unitId));
    if (inForce.length === 1) {
      return { candidates: [inForce[0].unitId], evidence: 'force' };
    }
    if (inForce.length > 1) pool = inForce;
  }

  if (delta.pilotRef) {
    const byPilot = pool.filter((unit) => unit.pilotId === delta.pilotRef);
    if (byPilot.length === 1) {
      return { candidates: [byPilot[0].unitId], evidence: 'pilot' };
    }
  }

  const sameDesignOnMission = outcome.unitDeltas.filter(
    (other) => other.side === GameSide.Player && unitRefOf(other) === unitRef,
  ).length;
  if (sameDesignOnMission === 1 && pool.length === 1) {
    return { candidates: [pool[0].unitId], evidence: 'design' };
  }
  return { candidates: pool.map((unit) => unit.unitId) };
}

export interface ILegacyBattleUnitManifest {
  /** Entries only for the player units matched to exactly one roster unit. */
  readonly manifest: BattleUnitManifest;
  /** Player units with no single match, keyed by session unit id. */
  readonly unresolved: Readonly<Record<string, readonly string[]>>;
}

/**
 * A launch manifest for a battle that has none, built from the legacy
 * trust order. Two player units resolving to the same roster unit are
 * both left unresolved rather than guessed.
 */
export function resolveLegacyBattleUnitManifest(
  campaign: LegacyCampaignView,
  rosterUnits: readonly IRosterUnitProjection[],
  outcome: Pick<ICombatOutcome, 'scenarioId' | 'unitDeltas'>,
): ILegacyBattleUnitManifest {
  const matches = outcome.unitDeltas
    .filter((delta) => delta.side === GameSide.Player)
    .map((delta) => ({
      unitId: delta.unitId,
      match: resolveLegacyRosterUnit(campaign, rosterUnits, outcome, delta),
    }));
  const claims = new Map<string, number>();
  for (const { match } of matches) {
    if (match.candidates.length === 1) {
      const rosterUnitId = match.candidates[0];
      claims.set(rosterUnitId, (claims.get(rosterUnitId) ?? 0) + 1);
    }
  }
  const manifest: Record<string, BattleUnitManifestEntry> = {};
  const unresolved: Record<string, readonly string[]> = {};
  for (const { unitId, match } of matches) {
    const rosterUnitId = match.candidates[0];
    if (match.candidates.length === 1 && claims.get(rosterUnitId) === 1) {
      manifest[unitId] = { rosterUnitId };
    } else {
      unresolved[unitId] = match.candidates;
    }
  }
  return { manifest, unresolved };
}
