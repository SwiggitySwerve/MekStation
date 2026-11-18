/**
 * Legacy migration for session-keyed combat states (T1).
 *
 * Before the launch manifest, `postBattleProcessor` wrote
 * `unitCombatStates[<session unit id>]` (`player-1-atlas-as7-d`), a key no
 * reader looks up; opponents got entries too. Pure and idempotent: once no
 * session-keyed entry is left it returns null.
 *
 * Player entries are never moved. Each retained delta in
 * `recentlyAppliedOutcomes` that carries the session key is mapped to its
 * roster unit on its own and re-applied under the roster key in apply
 * order. Trust order for a delta, never slot alone:
 *   1. the mission's force record: `bridgedEncounters[scenarioId]`'s player
 *      force, or (bridged encounters are not persisted) the team force
 *      whose id ends the scenario id (`scn-<contract>-<date>-<teamForceId>`,
 *      `scenarioGenerationProcessor.buildScenarioId`), intersected with the
 *      roster and matched on `unitRef`;
 *   2. `delta.pilotRef` against the roster unit's `pilotId`;
 *   3. the design being unique on that mission and on the roster.
 *
 * An entry is left for the user (flagged) when its retained deltas do not
 * rebuild it, a delta has no single candidate, its roster unit already has
 * state, or it shares a roster unit with a flagged entry. Every player
 * original, migrated or flagged, goes to a quarantine record the caller
 * stores outside the campaign payload; opponent entries are pruned.
 */

import type { BattleUnitManifest } from '@/types/campaign/BattleUnitManifest';
import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  ILegacyCombatStateFlag,
  ILegacyCombatStateQuarantineRecord,
  ILegacyCombatStateTarget,
  LegacyCombatStateFlagReason,
  LegacyRosterEvidence,
} from '@/types/campaign/LegacyCombatStateMigration';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type { IUnitCombatState } from '@/types/campaign/UnitCombatState';
import type {
  IAppliedCombatOutcome,
  IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';

import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import type { ICampaignWithBridgeState } from './processors/scenarioEncounterBridgeProcessor';

import {
  applyUnitDelta,
  isLostOnField,
  playerWon,
} from './processors/postBattleProcessor.helpers';

const SESSION_UNIT_ID = /^(player|opponent)-\d+-(.+)$/;

export function isSessionKeyedUnitId(key: string): boolean {
  return SESSION_UNIT_ID.test(key);
}

export interface ISessionKeyedCombatStateMigration {
  /** Campaign with roster-keyed rebuilds, no session-keyed entries, and flags. */
  readonly campaign: ICampaign;
  /** Every player original; must be stored before `campaign` is adopted. */
  readonly quarantine: readonly ILegacyCombatStateQuarantineRecord[];
  readonly flags: readonly ILegacyCombatStateFlag[];
  readonly prunedOpponentKeys: readonly string[];
}

interface IRetainedDelta {
  readonly outcome: IAppliedCombatOutcome;
  readonly outcomeIndex: number;
  readonly deltaIndex: number;
  readonly delta: IUnitCombatDelta;
}

interface IDeltaMapping {
  readonly retained: IRetainedDelta;
  readonly candidates: readonly string[];
  readonly evidence?: LegacyRosterEvidence;
}

interface IEntryAnalysis {
  readonly key: string;
  readonly original: IUnitCombatState;
  readonly mappings: readonly IDeltaMapping[];
  reason: LegacyCombatStateFlagReason | null;
}

function unitRefOf(delta: IUnitCombatDelta): string | undefined {
  return delta.unitRef ?? SESSION_UNIT_ID.exec(delta.unitId)?.[2];
}

function missionForce(
  campaign: ICampaign,
  scenarioId: string | null,
): { readonly unitIds: readonly string[] } | undefined {
  if (!scenarioId) return undefined;
  const bridgedForceId = (campaign as ICampaignWithBridgeState)
    .bridgedEncounters?.[scenarioId]?.playerForce?.forceId;
  if (bridgedForceId) return campaign.forces.get(bridgedForceId);
  const encoded = [...campaign.forces.values()].filter((force) =>
    scenarioId.endsWith(`-${force.id}`),
  );
  return encoded.length === 1 ? encoded[0] : undefined;
}

function mapDelta(
  campaign: ICampaign,
  roster: readonly IRosterUnitProjection[],
  retained: IRetainedDelta,
): IDeltaMapping {
  const { delta, outcome } = retained;
  const unitRef = unitRefOf(delta);
  if (!unitRef) return { retained, candidates: [] };
  let pool = roster.filter((unit) => unit.unitRef === unitRef);

  const force = missionForce(campaign, outcome.scenarioId);
  if (force) {
    const members = new Set(force.unitIds);
    const inForce = pool.filter((unit) => members.has(unit.unitId));
    if (inForce.length === 1) {
      return { retained, candidates: [inForce[0].unitId], evidence: 'force' };
    }
    if (inForce.length > 1) pool = inForce;
  }

  if (delta.pilotRef) {
    const byPilot = pool.filter((unit) => unit.pilotId === delta.pilotRef);
    if (byPilot.length === 1) {
      return { retained, candidates: [byPilot[0].unitId], evidence: 'pilot' };
    }
  }

  const sameDesignOnMission = outcome.unitDeltas.filter(
    (other) => other.side === GameSide.Player && unitRefOf(other) === unitRef,
  ).length;
  if (sameDesignOnMission === 1 && pool.length === 1) {
    return { retained, candidates: [pool[0].unitId], evidence: 'design' };
  }
  return { retained, candidates: pool.map((unit) => unit.unitId) };
}

/**
 * `lastUpdated` is the campaign day the outcome was applied on (loads stamp
 * `appliedOn` on old records), else the migration instant; the wall-clock
 * `capturedAt` is never read as a campaign time.
 */
function applyRetained(
  state: IUnitCombatState | undefined,
  unitId: string,
  { delta, outcome }: IRetainedDelta,
  migratedAt: string,
): IUnitCombatState {
  return applyUnitDelta(
    state,
    { ...delta, unitId },
    outcome.matchId,
    outcome.appliedOn ?? migratedAt,
    isLostOnField(outcome, delta, playerWon(outcome)),
  );
}

/** Keys whose stored value is not a finite number carry no reading (old NaN writes persist as null). */
function finiteOnly(
  values: Readonly<Record<string, number>>,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => Number.isFinite(value))
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

function comparable(state: IUnitCombatState): string {
  return JSON.stringify({
    armor: finiteOnly(state.currentArmorPerLocation),
    structure: finiteOnly(state.currentStructurePerLocation),
    ammo: finiteOnly(state.ammoRemaining),
    destroyedLocations: [...state.destroyedLocations].sort(),
    destroyedComponents: state.destroyedComponents,
    heatEnd: state.heatEnd,
    combatReady: state.combatReady,
    lastCombatOutcomeId: state.lastCombatOutcomeId,
  });
}

function analyse(
  campaign: ICampaign,
  roster: readonly IRosterUnitProjection[],
  outcomes: readonly IAppliedCombatOutcome[],
  key: string,
  original: IUnitCombatState,
  migratedAt: string,
): IEntryAnalysis {
  const retained: IRetainedDelta[] = outcomes.flatMap((outcome, outcomeIndex) =>
    outcome.unitDeltas.flatMap((delta, deltaIndex) =>
      delta.unitId === key && delta.side === GameSide.Player
        ? [{ outcome, outcomeIndex, deltaIndex, delta }]
        : [],
    ),
  );
  const rebuilt = retained.reduce<IUnitCombatState | undefined>(
    (state, entry) => applyRetained(state, key, entry, migratedAt),
    undefined,
  );
  const mappings = retained.map((entry) => mapDelta(campaign, roster, entry));
  const states = campaign.unitCombatStates ?? {};

  let reason: LegacyCombatStateFlagReason | null = null;
  if (!rebuilt || comparable(rebuilt) !== comparable(original)) {
    reason = 'not-fully-explained';
  } else if (mappings.some((mapping) => mapping.candidates.length !== 1)) {
    reason = 'ambiguous-roster-unit';
  } else if (mappings.some((mapping) => states[mapping.candidates[0]])) {
    reason = 'roster-unit-has-state';
  }
  return { key, original, mappings, reason };
}

function candidatesOf(analysis: IEntryAnalysis): Set<string> {
  return new Set(analysis.mappings.flatMap((mapping) => mapping.candidates));
}

/** An entry sharing a possible roster unit with a flagged one cannot migrate alone. */
function taintSharedRosterUnits(analyses: readonly IEntryAnalysis[]): void {
  let changed = true;
  while (changed) {
    changed = false;
    const tainted = new Set(
      analyses
        .filter((analysis) => analysis.reason !== null)
        .flatMap((analysis) => [...candidatesOf(analysis)]),
    );
    for (const analysis of analyses) {
      if (analysis.reason !== null) continue;
      if ([...candidatesOf(analysis)].some((id) => tainted.has(id))) {
        analysis.reason = 'shares-roster-unit-with-flagged-entry';
        changed = true;
      }
    }
  }
}

function flagOf(analysis: IEntryAnalysis): ILegacyCombatStateFlag {
  return {
    sessionUnitId: analysis.key,
    reason: analysis.reason as LegacyCombatStateFlagReason,
    candidateRosterUnitIds: [...candidatesOf(analysis)],
    matchIds: [
      ...new Set(
        analysis.mappings.map((mapping) => mapping.retained.outcome.matchId),
      ),
    ],
  };
}

export function migrateSessionKeyedCombatStates({
  campaign,
  rosterUnits,
  migratedAt,
}: {
  readonly campaign: ICampaign;
  readonly rosterUnits: readonly IRosterUnitProjection[];
  readonly migratedAt: string;
}): ISessionKeyedCombatStateMigration | null {
  const states = campaign.unitCombatStates ?? {};
  const sessionKeys = Object.keys(states).filter(isSessionKeyedUnitId);
  if (sessionKeys.length === 0) return null;

  const outcomes = campaign.recentlyAppliedOutcomes ?? [];
  const playerKeys = sessionKeys.filter((key) => key.startsWith('player-'));
  const prunedOpponentKeys = sessionKeys.filter((key) =>
    key.startsWith('opponent-'),
  );

  const analyses = playerKeys.map((key) =>
    analyse(campaign, rosterUnits, outcomes, key, states[key], migratedAt),
  );
  taintSharedRosterUnits(analyses);

  const nextStates: Record<string, IUnitCombatState> = { ...states };
  for (const key of sessionKeys) delete nextStates[key];

  const migrated = analyses.filter((analysis) => analysis.reason === null);
  const operations = migrated
    .flatMap((analysis) => analysis.mappings)
    .sort(
      (a, b) =>
        a.retained.outcomeIndex - b.retained.outcomeIndex ||
        a.retained.deltaIndex - b.retained.deltaIndex,
    );
  const manifests = new Map<number, Record<string, { rosterUnitId: string }>>();
  for (const { retained, candidates } of operations) {
    const rosterUnitId = candidates[0];
    nextStates[rosterUnitId] = applyRetained(
      nextStates[rosterUnitId],
      rosterUnitId,
      retained,
      migratedAt,
    );
    const manifest = manifests.get(retained.outcomeIndex) ?? {};
    manifest[retained.delta.unitId] = { rosterUnitId };
    manifests.set(retained.outcomeIndex, manifest);
  }

  // The resolved manifest goes on the retained outcome so the repair queue
  // maps those deltas the same way it maps new ones.
  const recentlyAppliedOutcomes = outcomes.map((outcome, index) => {
    const resolved = manifests.get(index);
    if (!resolved) return outcome;
    const unitManifest: BattleUnitManifest = {
      ...outcome.unitManifest,
      ...resolved,
    };
    return { ...outcome, unitManifest };
  });

  const flags = analyses
    .filter((analysis) => analysis.reason !== null)
    .map(flagOf);
  const flaggedIds = new Set(flags.map((flag) => flag.sessionUnitId));
  const legacyCombatStateFlags = [
    ...(campaign.legacyCombatStateFlags ?? []).filter(
      (flag) => !flaggedIds.has(flag.sessionUnitId),
    ),
    ...flags,
  ];

  const quarantine: ILegacyCombatStateQuarantineRecord[] = analyses.map(
    (analysis) => ({
      campaignId: campaign.id,
      sessionUnitId: analysis.key,
      original: analysis.original,
      resolution:
        analysis.reason === null
          ? {
              kind: 'migrated',
              targets: analysis.mappings.map(
                (mapping): ILegacyCombatStateTarget => ({
                  matchId: mapping.retained.outcome.matchId,
                  rosterUnitId: mapping.candidates[0],
                  evidence: mapping.evidence as LegacyRosterEvidence,
                }),
              ),
            }
          : { kind: 'flagged', flag: flagOf(analysis) },
      migratedAt,
    }),
  );

  return {
    campaign: {
      ...campaign,
      unitCombatStates: nextStates,
      ...(campaign.recentlyAppliedOutcomes === undefined
        ? {}
        : { recentlyAppliedOutcomes }),
      ...(legacyCombatStateFlags.length > 0 ? { legacyCombatStateFlags } : {}),
    },
    quarantine,
    flags,
    prunedOpponentKeys,
  };
}
