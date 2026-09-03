/**
 * N+1 scenario-launch clauses in front of participant convergence
 * (seam 17.3).
 *
 * `evaluateScenarioLaunch` used to answer convergence only. A campaign
 * whose combat outcome is still being replaced, or whose replacement
 * branch is still a candidate, must not launch the next scenario even
 * when every retained client has caught up. The extra readers live here
 * so `CampaignSyncSession` stays a session, not a journal/saga client.
 *
 * Clause order is load-bearing: a candidate head is a stronger fact
 * than a pending saga, and a pending saga is a stronger fact than an
 * unverifiable manifest. Convergence stays last so existing behind
 * rows keep their meaning once the earlier clauses are satisfied.
 */

import type {
  EventHistoryBranchStatus,
  IEventHistoryBranch,
  IEventHistoryEffectiveHead,
} from '@/lib/events/journal/EventHistoryBranchContract';

import type {
  CoordinatedCorrectionSagaState,
  ICoordinatedCorrectionSaga,
  ICoordinatedCorrectionSagaKey,
} from './history/CoordinatedOutcomeCorrectionSaga';

/** Convergence: a retained participant has not applied the live head. */
export const PROGRESSION_BLOCKED_BEHIND = 'participants-behind' as const;

/** A coordinated correction saga for this campaign is not yet completed. */
export const PROGRESSION_BLOCKED_CORRECTION_PENDING =
  'correction-pending' as const;

/**
 * The saga named a replacement branch whose manifest is missing or
 * whose sealed header does not match its rows.
 */
export const PROGRESSION_BLOCKED_REPLACEMENT_UNVERIFIED =
  'replacement-artifacts-unverified' as const;

/**
 * The campaign stream's effective head points at a branch that is not
 * the live (`effective`) status — a candidate still awaiting activation.
 */
export const PROGRESSION_BLOCKED_BRANCH_NOT_ACTIVE =
  'branch-not-active' as const;

/**
 * Domain status for an installed live head. The branch contract has no
 * `active` member; `effective` is that member.
 */
export const PROGRESSION_BRANCH_ACTIVE_STATUS = 'effective' as const;

export interface ICampaignParticipantConvergence {
  readonly participantId: string;
  readonly acknowledgedRevision: number;
}

export type CampaignManifestVerdict =
  | { readonly kind: 'verified' }
  | { readonly kind: 'unverified' };

/**
 * Optional ports the session consults before the retained-map check.
 * Absent readers skip the extra clauses, which is why suites that never
 * inject them stay byte-identical to the convergence-only gate.
 */
export interface ICampaignProgressionReaders {
  readonly readEffectiveHead: (
    campaignId: string,
  ) => IEventHistoryEffectiveHead | null;
  readonly readBranch: (
    campaignId: string,
    branchId: string,
  ) => IEventHistoryBranch | null;
  /**
   * Latest saga for this campaign, or null when none. Indexed by the
   * inbox `outcome_id`: the inbox row does not carry `match_id`.
   */
  readonly readSagaForCampaign: (
    campaignId: string,
  ) => ICoordinatedCorrectionSaga | null;
  readonly readManifestVerdict: (
    campaignId: string,
    branchId: string,
  ) => CampaignManifestVerdict | null;
}

interface ICampaignProgressionRefusalBase {
  readonly ok: false;
  readonly requiredRevision: number;
  /**
   * On every refusal so existing `if (!gate.ok) gate.behind` rows keep
   * compiling. Empty when the reason is not convergence.
   */
  readonly behind: readonly ICampaignParticipantConvergence[];
}

export type CampaignProgressionGate =
  | { readonly ok: true; readonly requiredRevision: number }
  | (ICampaignProgressionRefusalBase & {
      readonly reason: typeof PROGRESSION_BLOCKED_BEHIND;
    })
  | (ICampaignProgressionRefusalBase & {
      readonly reason: typeof PROGRESSION_BLOCKED_CORRECTION_PENDING;
      readonly sagaKey: ICoordinatedCorrectionSagaKey;
      readonly state: CoordinatedCorrectionSagaState;
    })
  | (ICampaignProgressionRefusalBase & {
      readonly reason: typeof PROGRESSION_BLOCKED_REPLACEMENT_UNVERIFIED;
      readonly branchId: string;
    })
  | (ICampaignProgressionRefusalBase & {
      readonly reason: typeof PROGRESSION_BLOCKED_BRANCH_NOT_ACTIVE;
      readonly branchId: string;
      readonly status: EventHistoryBranchStatus;
    });

export type CampaignProgressionRefusal = Exclude<
  CampaignProgressionGate,
  { readonly ok: true }
>;

/**
 * The three N+1 clauses, or null when they do not refuse. Null means
 * "continue to the retained-participant check", not "launch is ok".
 */
export function evaluateCampaignProgressionClauses(input: {
  readonly campaignId: string;
  readonly requiredRevision: number;
  readonly readers: ICampaignProgressionReaders | undefined;
}): CampaignProgressionRefusal | null {
  if (input.readers === undefined) return null;
  const requiredRevision = input.requiredRevision;

  const head = input.readers.readEffectiveHead(input.campaignId);
  const branch =
    head === null
      ? null
      : input.readers.readBranch(input.campaignId, head.branchId);
  if (branch !== null && branch.status !== PROGRESSION_BRANCH_ACTIVE_STATUS) {
    return {
      ok: false,
      reason: PROGRESSION_BLOCKED_BRANCH_NOT_ACTIVE,
      requiredRevision,
      branchId: branch.branchId,
      status: branch.status,
      behind: [],
    };
  }

  const saga = input.readers.readSagaForCampaign(input.campaignId);
  if (saga !== null && saga.state !== 'completed') {
    return {
      ok: false,
      reason: PROGRESSION_BLOCKED_CORRECTION_PENDING,
      requiredRevision,
      sagaKey: {
        matchId: saga.matchId,
        outcomeId: saga.outcomeId,
        outcomeVersion: saga.outcomeVersion,
      },
      state: saga.state,
      behind: [],
    };
  }

  const artifactBranchId = saga?.candidateBranchId;
  if (
    artifactBranchId !== null &&
    artifactBranchId !== undefined &&
    artifactBranchId.length > 0
  ) {
    const verdict = input.readers.readManifestVerdict(
      input.campaignId,
      artifactBranchId,
    );
    if (verdict !== null && verdict.kind === 'unverified') {
      return {
        ok: false,
        reason: PROGRESSION_BLOCKED_REPLACEMENT_UNVERIFIED,
        requiredRevision,
        branchId: artifactBranchId,
        behind: [],
      };
    }
  }

  return null;
}

/**
 * Same CAMPAIGN_NOT_CONVERGED reason string the behind-case already
 * sends; new reasons reuse that frame with their carried fields.
 */
export function formatCampaignProgressionRefusalReason(
  gate: CampaignProgressionRefusal,
): string {
  switch (gate.reason) {
    case PROGRESSION_BLOCKED_BEHIND: {
      const behind = gate.behind
        .map((row) => `${row.participantId}:${row.acknowledgedRevision}`)
        .join(',');
      return `participants-behind ${behind}; requiredRevision ${gate.requiredRevision}`;
    }
    case PROGRESSION_BLOCKED_CORRECTION_PENDING:
      return (
        `correction-pending matchId ${gate.sagaKey.matchId} ` +
        `outcomeId ${gate.sagaKey.outcomeId} ` +
        `outcomeVersion ${String(gate.sagaKey.outcomeVersion)} ` +
        `state ${gate.state}; requiredRevision ${gate.requiredRevision}`
      );
    case PROGRESSION_BLOCKED_REPLACEMENT_UNVERIFIED:
      return (
        `replacement-artifacts-unverified branchId ${gate.branchId}; ` +
        `requiredRevision ${gate.requiredRevision}`
      );
    case PROGRESSION_BLOCKED_BRANCH_NOT_ACTIVE:
      return (
        `branch-not-active branchId ${gate.branchId} status ${gate.status}; ` +
        `requiredRevision ${gate.requiredRevision}`
      );
  }
}
