/**
 * Shared invariant-level run-state comparator for the group-5 integration
 * suites (determinism run-twice, live-parity acceptance).
 *
 * Why a shared module (task 5.2's hint, "if it earns reuse from 5.3"): both
 * suites need the IDENTICAL "seam invariant set" comparison — design D4's
 * determinism field list and design D7's parity field list are the SAME
 * enumeration (unit survival set, per-unit armor/structure deltas, balance
 * delta, transaction types+amounts, XP counters, scenario/contract
 * statuses, repair-ticket counts/kinds). Building it once here means both
 * suites compare on the literal same field set by construction, rather
 * than risking two hand-rolled comparisons drifting apart.
 *
 * Identifier hygiene (design R3 + the matchId finding made during
 * authoring): three kinds of identifiers are NEVER safe to compare
 * literally across two independent runs and are deliberately excluded
 * from every field below:
 *  - wall-clock-bearing fields (design's documented exclusion list) —
 *    transaction ids (`tx-contract-close-<contractId>-<nowIso>`,
 *    `contractClosure.ts:44`) and repair-ticket `createdAt`/`updatedAt`.
 *  - `ICombatOutcome.matchId` (`session.id`) — `createGameSession`
 *    (`gameSessionCore.ts:103`) stamps `uuidv4()` when no `options.id` is
 *    supplied, and `GameEngine.runToCompletion` never supplies one, so
 *    `matchId` is cryptographically random, not seed-derived. Battles are
 *    therefore correlated across runs by `scenarioId` (deterministic —
 *    `buildScenarioId`, `scenarioGenerationProcessor.ts:149-156`), never
 *    by `matchId`.
 *  - SQLite `PilotRepository` ids (`pilot-${uuidv4()}`,
 *    `PilotRepository.ts:98`) — `ensureRealPilotIds`
 *    (`fastForwardCombatRunner.ts`) mints a fresh random SQLite pilot id
 *    per run, so two runs' roster entries for "the same" fixture pilot
 *    have DIFFERENT `pilotId` strings. XP counters are therefore
 *    correlated by the STABLE roster-projection `unitId`
 *    (`ff-roster-unit-N`, fixed by the fixture), resolving each run's
 *    CURRENT `pilotId` for that unit at snapshot time rather than
 *    comparing `pilotId` literals.
 *
 * Session-scoped unit ids (`IGameUnit.id` /
 * `IUnitCombatDelta.unitId`, `${side}-${slot}-${unitRef}` via
 * `buildSessionUnitId`, `preBattleSessionBuilder.ts:83-89`) ARE safely
 * comparable across runs — they are built from campaign-forces/roster
 * assignment order, not randomness, so an identical fixture reproduces
 * identical session unit ids.
 *
 * @module lib/campaign/fastForward/invariants/comparableRunState
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IRepairTicket } from '@/types/campaign/RepairTicket';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

// =============================================================================
// Campaign extension (repair queue lives on the same extension surface the
// repair processors themselves declare — see `repairQueueBuilderProcessor
// .ts`'s `ICampaignWithBattleState`; duplicated locally so this module
// stays dependency-light on processor-internal types).
// =============================================================================

type ICampaignWithRepairQueue = ICampaign & {
  readonly repairQueue?: readonly IRepairTicket[];
};

// =============================================================================
// Comparable shapes
// =============================================================================

/** One fought battle, correlated by the deterministic scenario id (never matchId). */
export interface ComparableBattle {
  readonly scenarioId: string;
  readonly contractId: string | null;
  readonly winner: string;
  readonly endReason: string;
  readonly unitDeltas: readonly ComparableUnitDelta[];
}

/** Per-unit survival + armor/structure delta, keyed by the deterministic session unit id. */
export interface ComparableUnitDelta {
  readonly unitId: string;
  readonly side: string;
  readonly destroyed: boolean;
  readonly finalStatus: string;
  readonly armorRemaining: Readonly<Record<string, number>>;
  readonly internalsRemaining: Readonly<Record<string, number>>;
}

export interface ComparableTransaction {
  readonly type: string;
  readonly amountCents: number;
}

/** XP counters keyed by the STABLE roster-projection unitId, never the per-run-random SQLite pilotId. */
export interface ComparableXpCounter {
  readonly unitId: string;
  readonly xp: number;
  readonly campaignXpEarned: number;
  readonly campaignKills: number;
  readonly campaignMissions: number;
}

export interface ComparableContractStatus {
  readonly contractId: string;
  readonly status: string;
}

export interface ComparableRepairTicketTally {
  readonly kind: string;
  readonly count: number;
}

/** The full seam invariant set (design D4 / D7's shared field enumeration). */
export interface ComparableRunState {
  readonly battles: readonly ComparableBattle[];
  readonly balanceDeltaCents: number;
  readonly transactions: readonly ComparableTransaction[];
  readonly xpCounters: readonly ComparableXpCounter[];
  readonly contractStatuses: readonly ComparableContractStatus[];
  readonly repairTickets: readonly ComparableRepairTicketTally[];
}

// =============================================================================
// Builder
// =============================================================================

export interface BuildComparableRunStateInput {
  /** The run's final campaign snapshot. */
  readonly campaign: ICampaign;
  /** `campaign.finances.balance.centsValue` at the START of the run. */
  readonly startingBalanceCents: number;
  /** Every battle fought during the run, keyed by its (deterministic) scenario id. */
  readonly battleOutcomes: readonly {
    readonly scenarioId: string;
    readonly outcome: ICombatOutcome;
  }[];
  /** Roster-projection units at the END of the run (stable unitIds). */
  readonly rosterUnits: readonly IRosterUnitProjection[];
  /** Roster pilot entries at the END of the run. */
  readonly rosterPilots: readonly ICampaignRosterEntry[];
}

/** Build a `ComparableRunState` snapshot from one fast-forward (or hand-cranked live-equivalent) run's end state. */
export function buildComparableRunState(
  input: BuildComparableRunStateInput,
): ComparableRunState {
  const extended = input.campaign as ICampaignWithRepairQueue;

  const battles: ComparableBattle[] = [...input.battleOutcomes]
    .sort((a, b) => a.scenarioId.localeCompare(b.scenarioId))
    .map(({ scenarioId, outcome }) => ({
      scenarioId,
      contractId: outcome.contractId,
      winner: String(outcome.report.winner),
      endReason: String(outcome.endReason),
      unitDeltas: [...outcome.unitDeltas]
        .map((delta) => ({
          unitId: delta.unitId,
          side: String(delta.side),
          destroyed: delta.destroyed,
          finalStatus: String(delta.finalStatus),
          armorRemaining: { ...delta.armorRemaining },
          internalsRemaining: { ...delta.internalsRemaining },
        }))
        .sort((a, b) => a.unitId.localeCompare(b.unitId)),
    }));

  const balanceDeltaCents =
    input.campaign.finances.balance.centsValue - input.startingBalanceCents;

  const transactions: ComparableTransaction[] = [
    ...input.campaign.finances.transactions,
  ]
    .map((tx) => ({ type: String(tx.type), amountCents: tx.amount.centsValue }))
    .sort((a, b) =>
      a.type === b.type
        ? a.amountCents - b.amountCents
        : a.type.localeCompare(b.type),
    );

  const xpCounters: ComparableXpCounter[] = [...input.rosterUnits]
    .map((unit) => {
      const pilot = input.rosterPilots.find((p) => p.pilotId === unit.pilotId);
      return {
        unitId: unit.unitId,
        xp: pilot?.xp ?? 0,
        campaignXpEarned: pilot?.campaignXpEarned ?? 0,
        campaignKills: pilot?.campaignKills ?? 0,
        campaignMissions: pilot?.campaignMissions ?? 0,
      };
    })
    .sort((a, b) => a.unitId.localeCompare(b.unitId));

  const contractStatuses: ComparableContractStatus[] = Array.from(
    input.campaign.missions.values(),
  )
    .map((mission) => ({
      contractId: mission.id,
      status: String(mission.status),
    }))
    .sort((a, b) => a.contractId.localeCompare(b.contractId));

  const ticketCounts = new Map<string, number>();
  for (const ticket of extended.repairQueue ?? []) {
    ticketCounts.set(ticket.kind, (ticketCounts.get(ticket.kind) ?? 0) + 1);
  }
  const repairTickets: ComparableRepairTicketTally[] = Array.from(
    ticketCounts.entries(),
  )
    .map(([kind, count]) => ({ kind, count }))
    .sort((a, b) => a.kind.localeCompare(b.kind));

  return {
    battles,
    balanceDeltaCents,
    transactions,
    xpCounters,
    contractStatuses,
    repairTickets,
  };
}

// =============================================================================
// Comparator
// =============================================================================

export interface AssertRunStatesEqualOptions {
  readonly labelA?: string;
  readonly labelB?: string;
  /**
   * Appended verbatim to the thrown message. Design D7's anti-tautology
   * rule 2 + the acceptance's "Divergence carries the recorded
   * consequence" scenario: the live-parity suite passes the council
   * consequence text here so a red run cannot be mistaken for flake.
   */
  readonly consequenceMessage?: string;
}

const SEAM_INVARIANT_FIELDS: readonly (keyof ComparableRunState)[] = [
  'battles',
  'balanceDeltaCents',
  'transactions',
  'xpCounters',
  'contractStatuses',
  'repairTickets',
];

/**
 * Assert two `ComparableRunState` snapshots are equal, field by field, on
 * the seam invariant set. Throws naming the FIRST diverging field (design
 * R3: a divergence is a real bug to trace, never to mask by widening the
 * comparator) — never a single opaque deep-equal failure.
 */
export function assertRunStatesEqual(
  a: ComparableRunState,
  b: ComparableRunState,
  options: AssertRunStatesEqualOptions = {},
): void {
  const labelA = options.labelA ?? 'run A';
  const labelB = options.labelB ?? 'run B';
  for (const field of SEAM_INVARIANT_FIELDS) {
    const left = JSON.stringify(a[field]);
    const right = JSON.stringify(b[field]);
    if (left !== right) {
      const consequence = options.consequenceMessage
        ? ` ${options.consequenceMessage}`
        : '';
      throw new Error(
        `assertRunStatesEqual: seam invariant "${field}" diverged between ${labelA} and ${labelB}.\n${labelA}.${field} = ${left}\n${labelB}.${field} = ${right}${consequence}`,
      );
    }
  }
}
