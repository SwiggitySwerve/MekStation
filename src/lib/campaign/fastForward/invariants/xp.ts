/**
 * XP progression invariants for the headless campaign fast-forward
 * suites (spec "XP Progression Invariants Through Engine-Driven Combat").
 *
 * These invariants deliberately do NOT re-derive expected XP AMOUNTS —
 * `awardScenarioXP` / `awardKillXP`'s business rules already carry 37 +
 * 17 + 427 lines of unit coverage (`xpAwards.test.ts`, `XPCalculator
 * .test.ts`, `skillCostTraits.test.ts` — see proposal "Correction to the
 * council brief"). What is genuinely uncovered before this change is
 * whether an ENGINE-DRIVEN outcome's counters move AT ALL through
 * production pilot attribution (design D9) without fixture id-rigging —
 * so these invariants check the COUNTERS `applyPilotDelta`
 * (`postBattleProcessor.helpers.ts:84-166`) owns directly:
 * `campaignMissions` (+1 per applied outcome per participating pilot)
 * and `campaignKills` (+= the outcome's per-unit kill attribution,
 * unconditional on side/win — only the XP kill BONUS is gated by
 * `delta.side === Player && outcomeWonByPlayer`, the raw counter is
 * not, confirmed at `postBattleProcessor.helpers.ts:122-133,158`), plus
 * XP monotonicity and apply-once, both of which are properties of the
 * outer `processedBattleIds` dedup guard
 * (`postBattleProcessor.ts:138-152`), not of the award math.
 *
 * No fast-forward fixture or test may seed roster pilot ids as
 * session-unit-id-shaped strings to force these invariants to pass —
 * that rig is the dual-id masking this capability exists to catch
 * (spec: "no fast-forward fixture or test SHALL rig roster pilot ids to
 * session-unit-id-shaped strings").
 *
 * @module lib/campaign/fastForward/invariants/xp
 */

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

// =============================================================================
// (a) Monotonicity across the run
// =============================================================================

/**
 * Assert no roster entry's `xp` or `campaignXpEarned` is ever lower at a
 * later day snapshot than at an earlier one (spec scenario: "XP is
 * monotonic across the run"). Pairwise-adjacent comparison is
 * sufficient — a non-decreasing sequence day-over-day is non-decreasing
 * against every earlier day by transitivity.
 *
 * @param dayRosterSnapshots - one roster-entry array per day, in day order
 *   (e.g. one entry per `advanceDay()` call across the run)
 */
export function assertXpNonDecreasing(
  dayRosterSnapshots: readonly (readonly ICampaignRosterEntry[])[],
): void {
  const seriesByPilot = new Map<
    string,
    {
      readonly dayIndex: number;
      readonly xp: number;
      readonly campaignXpEarned: number;
    }[]
  >();
  dayRosterSnapshots.forEach((day, dayIndex) => {
    for (const entry of day) {
      const series = seriesByPilot.get(entry.pilotId) ?? [];
      series.push({
        dayIndex,
        xp: entry.xp,
        campaignXpEarned: entry.campaignXpEarned,
      });
      seriesByPilot.set(entry.pilotId, series);
    }
  });

  for (const [pilotId, series] of Array.from(seriesByPilot.entries())) {
    for (let i = 1; i < series.length; i++) {
      const prior = series[i - 1]!;
      const current = series[i]!;
      if (current.xp < prior.xp) {
        throw new Error(
          `assertXpNonDecreasing: pilot ${pilotId}'s xp dropped from ${prior.xp} (day ${prior.dayIndex}) to ${current.xp} (day ${current.dayIndex}).`,
        );
      }
      if (current.campaignXpEarned < prior.campaignXpEarned) {
        throw new Error(
          `assertXpNonDecreasing: pilot ${pilotId}'s campaignXpEarned dropped from ${prior.campaignXpEarned} (day ${prior.dayIndex}) to ${current.campaignXpEarned} (day ${current.dayIndex}).`,
        );
      }
    }
  }
}

// =============================================================================
// (b) Apply-once per outcome, keyed on match id
// =============================================================================

/**
 * Assert re-publishing an already-applied outcome (same match id) and
 * processing another day left every roster entry's XP-adjacent counters
 * unchanged (spec scenario: "Duplicate outcomes award no duplicate
 * XP"). The apply-once guarantee lives in `postBattleProcessor.ts`'s
 * `processedBattleIds` dedup (`applyOutcome`'s `processed.includes
 * (outcome.matchId)` short-circuit, checked BEFORE any delta/XP/contract
 * application runs) — this assertion is the observable proof that guard
 * held for a real engine-driven outcome.
 *
 * @param afterFirstApply - roster snapshot right after the outcome was
 *   applied the first time
 * @param afterDuplicateApply - roster snapshot after the SAME outcome
 *   (same matchId) was re-published and a further day processed
 */
export function assertXpApplicationUnchangedByDuplicate(
  afterFirstApply: readonly ICampaignRosterEntry[],
  afterDuplicateApply: readonly ICampaignRosterEntry[],
): void {
  const firstByPilot = new Map(afterFirstApply.map((e) => [e.pilotId, e]));
  for (const entry of afterDuplicateApply) {
    const prior = firstByPilot.get(entry.pilotId);
    if (!prior) continue;
    if (
      prior.xp !== entry.xp ||
      prior.campaignXpEarned !== entry.campaignXpEarned ||
      prior.campaignKills !== entry.campaignKills ||
      prior.campaignMissions !== entry.campaignMissions
    ) {
      throw new Error(
        `assertXpApplicationUnchangedByDuplicate: pilot ${entry.pilotId}'s counters changed after a duplicate (same match id) outcome was re-applied — xp ${prior.xp}->${entry.xp}, campaignXpEarned ${prior.campaignXpEarned}->${entry.campaignXpEarned}, campaignKills ${prior.campaignKills}->${entry.campaignKills}, campaignMissions ${prior.campaignMissions}->${entry.campaignMissions}. The processedBattleIds apply-once guard did not hold.`,
      );
    }
  }
}

// =============================================================================
// (c) Awards match participation
// =============================================================================

/**
 * Assert one applied outcome's mission/kill counters landed exactly on
 * the participating pilots the outcome's linkage names (spec scenario:
 * "Awards match participation"). Resolves each delta's pilot the SAME
 * way `applyOutcomeDeltas` does — `delta.pilotRef ?? delta.unitId`
 * (design D9) — so this assertion is itself proof the fast-forward
 * fixture never rigged `unitId === pilotId` to fake a pass: an
 * unresolvable linkage silently skips (matches
 * `applyPilotDelta`'s own null-entry skip, `postBattleProcessor
 * .helpers.ts:102-107`), never fabricates a "should have happened".
 *
 * @param outcome - the applied `ICombatOutcome`
 * @param before - roster snapshot immediately before this outcome applied
 * @param after - roster snapshot immediately after this outcome applied
 */
export function assertAwardsMatchParticipation(
  outcome: ICombatOutcome,
  before: readonly ICampaignRosterEntry[],
  after: readonly ICampaignRosterEntry[],
): void {
  const beforeByPilot = new Map(before.map((e) => [e.pilotId, e]));
  const afterByPilot = new Map(after.map((e) => [e.pilotId, e]));
  const killsByUnitId = new Map(
    outcome.report.units.map((u) => [u.unitId, u.kills]),
  );

  for (const delta of outcome.unitDeltas) {
    const pilotId = delta.pilotRef ?? delta.unitId;
    const priorEntry = beforeByPilot.get(pilotId);
    if (!priorEntry) continue; // unresolvable linkage (opponent/NPC) — nothing should have moved

    const nextEntry = afterByPilot.get(pilotId);
    if (!nextEntry) {
      throw new Error(
        `assertAwardsMatchParticipation: pilot ${pilotId} had a roster entry before applying outcome ${outcome.matchId} but not after.`,
      );
    }
    if (nextEntry.campaignMissions !== priorEntry.campaignMissions + 1) {
      throw new Error(
        `assertAwardsMatchParticipation: pilot ${pilotId}'s campaignMissions did not increment by exactly one applying outcome ${outcome.matchId} (before ${priorEntry.campaignMissions}, after ${nextEntry.campaignMissions}).`,
      );
    }
    const expectedKills = Math.max(0, killsByUnitId.get(delta.unitId) ?? 0);
    const actualKillsDelta = nextEntry.campaignKills - priorEntry.campaignKills;
    if (actualKillsDelta !== expectedKills) {
      throw new Error(
        `assertAwardsMatchParticipation: pilot ${pilotId}'s campaignKills increment (${actualKillsDelta}) does not match outcome ${outcome.matchId}'s kill attribution for unit ${delta.unitId} (expected +${expectedKills}).`,
      );
    }
  }
}
