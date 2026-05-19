/**
 * Co-op post-battle reconciliation (CO2).
 *
 * Per design D8, when a co-op encounter resolves its campaign-level
 * consequences — salvage, funds change, roster change, pilot XP — are
 * reconciled into the shared campaign by emitting CO1 campaign events
 * (`SalvageAllocated`, `FundsChanged`, `RosterUnitChanged`, …) through
 * the `CampaignMatchHost`.
 *
 * Because both players' campaign views are CO1 mirrors fed by the same
 * event log, the deploying player and the `command-hq` player converge
 * on the same post-battle campaign state (design D8 / spec scenario
 * "Both players converge on the post-battle state").
 *
 * The co-op combat event log (from `ServerMatchHost`) and the campaign
 * event log stay SEPARATE — they are linked only by id. This module
 * never merges combat events into the campaign log: it derives a small
 * set of campaign intents from the `ICombatOutcome` and commits them
 * through the host's authoritative path (design D8 / spec scenario
 * "Combat and campaign logs stay separate").
 *
 * @spec openspec/changes/add-coop-campaign-play/specs/coop-campaign-sync/spec.md
 * @spec openspec/changes/add-coop-campaign-play/design.md (D8)
 * @module lib/campaign/coop/reconcileCoopBattle
 */

import type { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import { UnitFinalStatus } from '@/types/combat/CombatOutcome';

// =============================================================================
// Reconciliation input
// =============================================================================

/**
 * The campaign-facing consequences derived from a resolved co-op
 * encounter. The caller (the post-battle pipeline) derives these from
 * the `ICombatOutcome`; `deriveCoopBattleConsequences` provides a
 * default derivation, but a richer campaign loop may supply its own.
 */
export interface ICoopBattleConsequences {
  /** Campaign id the resolved co-op encounter belongs to. */
  readonly campaignId: string;
  /** Combat session id — the LINK between the combat log and this. */
  readonly matchId: string;
  /**
   * Net C-bill change from the battle (mission payout, repair costs).
   * Positive credits the campaign; negative debits it. Zero emits no
   * `FundsChanged` event.
   */
  readonly fundsDelta: number;
  /** Human-readable reason stamped on the `FundsChanged` event. */
  readonly fundsReason: string;
  /**
   * C-bill value of salvage recovered from the battle. Added to the
   * campaign salvage pool; zero emits no `SalvageAllocated` event.
   */
  readonly salvageValue: number;
  /**
   * Roster units whose status changed in the battle (damaged,
   * destroyed). Emitted as `RosterUnitChanged` events so both mirrors
   * converge on the post-battle roster.
   */
  readonly rosterChanges: readonly ICoopRosterChange[];
}

/**
 * One roster-unit change produced by a co-op battle.
 */
export interface ICoopRosterChange {
  /** Stable unit id. */
  readonly unitId: string;
  /** Unit display designation. */
  readonly designation: string;
  /** The unit's coarse status after the battle. */
  readonly status: 'operational' | 'damaged' | 'destroyed';
}

// =============================================================================
// Reconciliation
// =============================================================================

/**
 * The outcome of reconciling a co-op battle into the shared campaign.
 */
export interface ICoopReconciliationResult {
  /** True when every derived campaign event committed. */
  readonly ok: boolean;
  /** The CO1 campaign events committed and broadcast, in order. */
  readonly events: readonly ICampaignEvent[];
  /** The first failure reason, when `ok` is false. */
  readonly error?: string;
}

/**
 * Reconcile a resolved co-op encounter into the shared campaign.
 *
 * Derives a small ordered set of CO1 campaign intents from the battle
 * consequences and commits each through the `CampaignMatchHost`'s
 * authoritative `applyHostIntent` path — so the resulting events are
 * appended to the SHARED campaign event log and broadcast to BOTH
 * players' CO1 mirrors (design D8).
 *
 * The commit order is deterministic: funds, then salvage, then roster
 * changes. A `command-hq` player and a deploying player both receive
 * exactly these events through their mirror, so they converge.
 *
 * @param host - the campaign host owning the shared campaign event log
 * @param consequences - the battle's campaign-facing consequences
 */
export async function reconcileCoopBattle(
  host: CampaignMatchHost,
  consequences: ICoopBattleConsequences,
): Promise<ICoopReconciliationResult> {
  const committed: ICampaignEvent[] = [];

  // 1. Funds — a mission payout (or net repair cost). A positive delta
  //    cannot be expressed as a `SpendFunds` intent, so a credit is
  //    committed directly as a host intent below; CO1's `SpendFunds`
  //    only debits. We model both directions via the host's hooks:
  //    a debit is a `SpendFunds`, a credit is a salvage-style allocation
  //    handled by the caller. To keep reconciliation purely additive on
  //    CO1's intent set, a credit is folded into the salvage pool path
  //    and a debit uses `SpendFunds`.
  if (consequences.fundsDelta < 0) {
    const result = await host.applyHostIntent({
      kind: 'SpendFunds',
      campaignId: consequences.campaignId,
      intentId: `coop-recon-funds-${consequences.matchId}`,
      payload: {
        amount: Math.abs(consequences.fundsDelta),
        reason: consequences.fundsReason,
      },
    });
    if (!result.ok) {
      return {
        ok: false,
        events: committed,
        error: `Funds reconciliation rejected: ${result.reason}`,
      };
    }
    committed.push(...result.events);
  }

  // 2. Salvage — the battle's salvage value plus any positive funds
  //    delta (a mission payout). Both feed the campaign salvage pool so
  //    the players allocate them through CO1's `AllocateSalvage` flow.
  //    The host has a dedicated salvage-credit path; reconciliation uses
  //    it so the pool grows before any allocation intent runs.
  const salvageCredit =
    consequences.salvageValue + Math.max(0, consequences.fundsDelta);
  if (salvageCredit > 0) {
    const result = await host.creditSalvagePool(
      salvageCredit,
      `Co-op battle salvage (${consequences.matchId})`,
    );
    if (!result.ok) {
      return {
        ok: false,
        events: committed,
        error: `Salvage reconciliation rejected: ${result.reason}`,
      };
    }
    committed.push(...result.events);
  }

  // 3. Roster changes — each damaged / destroyed unit is committed as a
  //    `RosterUnitChanged` event so both mirrors converge on the
  //    post-battle roster.
  for (const change of consequences.rosterChanges) {
    const result = await host.applyRosterUnitChange(
      consequences.campaignId,
      change.status === 'destroyed' ? 'removed' : 'repaired',
      {
        unitId: change.unitId,
        designation: change.designation,
        status: change.status,
      },
      `coop-recon-roster-${consequences.matchId}-${change.unitId}`,
    );
    if (!result.ok) {
      return {
        ok: false,
        events: committed,
        error: `Roster reconciliation rejected: ${result.reason}`,
      };
    }
    committed.push(...result.events);
  }

  return { ok: true, events: committed };
}

// =============================================================================
// Default derivation from a combat outcome
// =============================================================================

/**
 * Derive a default `ICoopBattleConsequences` from a resolved
 * `ICombatOutcome`. A richer campaign loop may compute its own (mission
 * payout, contract terms); this default covers the salvage/roster facts
 * that are directly readable from the per-unit combat deltas.
 *
 * Only the PLAYER side's units are considered for roster changes — the
 * OpFor is not on the campaign roster.
 *
 * @param outcome - the resolved co-op combat outcome
 * @param campaignId - the shared campaign id
 * @param playerSide - the `GameSide` both co-op forces fought on
 * @param missionPayout - net C-bill mission payout (caller-supplied)
 * @param designations - unit id → display designation lookup
 */
export function deriveCoopBattleConsequences(input: {
  readonly outcome: ICombatOutcome;
  readonly campaignId: string;
  readonly playerSide: string;
  readonly missionPayout: number;
  readonly designations: Readonly<Record<string, string>>;
}): ICoopBattleConsequences {
  const { outcome, campaignId, playerSide, missionPayout, designations } =
    input;

  // Roster changes — every player-side unit that took damage or was
  // destroyed. An intact unit produces no change event.
  const rosterChanges: ICoopRosterChange[] = [];
  // Salvage — a coarse estimate from destroyed OpFor units. A richer
  // loop computes BV-weighted salvage; the default credits a flat
  // per-wreck value so the pool reflects the battle.
  let salvageValue = 0;
  const PER_WRECK_SALVAGE = 50_000;

  for (const delta of outcome.unitDeltas) {
    if (delta.side === playerSide) {
      if (delta.finalStatus === UnitFinalStatus.Intact) {
        continue;
      }
      rosterChanges.push({
        unitId: delta.unitId,
        designation: designations[delta.unitId] ?? delta.unitId,
        status:
          delta.finalStatus === UnitFinalStatus.Destroyed
            ? 'destroyed'
            : 'damaged',
      });
    } else if (delta.destroyed) {
      // A destroyed OpFor unit yields salvage.
      salvageValue += PER_WRECK_SALVAGE;
    }
  }

  return {
    campaignId,
    matchId: outcome.matchId,
    fundsDelta: missionPayout,
    fundsReason: `Co-op mission resolution (${outcome.matchId})`,
    salvageValue,
    rosterChanges,
  };
}
