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
 * order, matched by `legacyRosterResolver` (its trust order: force record,
 * then pilot, then design uniqueness; never slot alone).
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
  ILegacyCombatStateRecord,
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

import { legacyCombatStateFlagKey } from '@/types/campaign/LegacyCombatStateMigration';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import {
  isSessionKeyedUnitId,
  resolveLegacyBattleUnitManifest,
  type ILegacyBattleUnitManifest,
  type LegacyUnresolvedReason,
} from './legacyRosterResolver';
import {
  applyUnitDelta,
  isLostOnField,
  playerWon,
} from './processors/postBattleProcessor.helpers';

export { isSessionKeyedUnitId };

export interface ISessionKeyedCombatStateMigration {
  /** Campaign with roster-keyed rebuilds, no session-keyed entries, and flags. */
  readonly campaign: ICampaign;
  /** Every player original; must be stored before `campaign` is adopted. */
  readonly quarantine: readonly ILegacyCombatStateRecord[];
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
  /** Set only when the battle's legacy match resolved this unit. */
  readonly rosterUnitId?: string;
  readonly evidence?: LegacyRosterEvidence;
  readonly candidates: readonly string[];
  readonly unresolvedReason?: LegacyUnresolvedReason;
}

interface IEntryAnalysis {
  readonly key: string;
  readonly original: IUnitCombatState;
  readonly mappings: readonly IDeltaMapping[];
  reason: LegacyCombatStateFlagReason | null;
}

/** One battle's legacy match, double-claim check included. */
function mapDelta(
  battles: readonly ILegacyBattleUnitManifest[],
  retained: IRetainedDelta,
): IDeltaMapping {
  const battle = battles[retained.outcomeIndex];
  const entry = battle.manifest[retained.delta.unitId];
  if (entry && 'rosterUnitId' in entry) {
    return {
      retained,
      rosterUnitId: entry.rosterUnitId,
      evidence: battle.evidence[retained.delta.unitId],
      candidates: [entry.rosterUnitId],
    };
  }
  const unresolved = battle.unresolved[retained.delta.unitId];
  return {
    retained,
    candidates: unresolved?.candidates ?? [],
    unresolvedReason: unresolved?.reason ?? 'ambiguous',
  };
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
  battles: readonly ILegacyBattleUnitManifest[],
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
  const mappings = retained.map((entry) => mapDelta(battles, entry));
  const states = campaign.unitCombatStates ?? {};

  let reason: LegacyCombatStateFlagReason | null = null;
  if (!rebuilt || comparable(rebuilt) !== comparable(original)) {
    reason = 'not-fully-explained';
  } else if (
    mappings.some((mapping) => mapping.unresolvedReason === 'conflicting-pilot')
  ) {
    reason = 'conflicting-pilot';
  } else if (mappings.some((mapping) => mapping.rosterUnitId === undefined)) {
    reason = 'ambiguous-roster-unit';
  } else if (
    mappings.some((mapping) => states[mapping.rosterUnitId as string])
  ) {
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

function flagOf(
  analysis: IEntryAnalysis,
  deviceId: string | undefined,
): ILegacyCombatStateFlag {
  return {
    kind: 'combat-state',
    ...(deviceId === undefined ? {} : { quarantinedOnDeviceId: deviceId }),
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
  deviceId,
}: {
  readonly campaign: ICampaign;
  readonly rosterUnits: readonly IRosterUnitProjection[];
  readonly migratedAt: string;
  /**
   * The device the quarantine is written on. The caller adopts the result
   * only after that write succeeds, so the flags may name it as confirmed.
   */
  readonly deviceId?: string;
}): ISessionKeyedCombatStateMigration | null {
  const states = campaign.unitCombatStates ?? {};
  const sessionKeys = Object.keys(states).filter(isSessionKeyedUnitId);
  if (sessionKeys.length === 0) return null;

  const outcomes = campaign.recentlyAppliedOutcomes ?? [];
  const playerKeys = sessionKeys.filter((key) => key.startsWith('player-'));
  const prunedOpponentKeys = sessionKeys.filter((key) =>
    key.startsWith('opponent-'),
  );

  const battles = outcomes.map((outcome) =>
    resolveLegacyBattleUnitManifest(campaign, rosterUnits, outcome),
  );
  const analyses = playerKeys.map((key) =>
    analyse(campaign, battles, outcomes, key, states[key], migratedAt),
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
  for (const { retained, rosterUnitId: resolved } of operations) {
    const rosterUnitId = resolved as string;
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
    .map((analysis) => flagOf(analysis, deviceId));
  const flagKeys = new Set(flags.map(legacyCombatStateFlagKey));
  const legacyCombatStateFlags = [
    ...(campaign.legacyCombatStateFlags ?? []).filter(
      (flag) => !flagKeys.has(legacyCombatStateFlagKey(flag)),
    ),
    ...flags,
  ];

  const quarantine: ILegacyCombatStateRecord[] = analyses.map((analysis) => ({
    source: 'combat-state',
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
                rosterUnitId: mapping.rosterUnitId as string,
                evidence: mapping.evidence as LegacyRosterEvidence,
              }),
            ),
          }
        : { kind: 'flagged', flag: flagOf(analysis, deviceId) },
    migratedAt,
  }));

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
