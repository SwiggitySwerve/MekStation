/**
 * The DISTINCT post-receipt coordinated outcome-correction COMMAND
 * (harden-gm-two-player-campaign-sessions; seam 17.1).
 *
 * 13.4 closed the combat-only rewind once a campaign receipt exists.
 * This is the other door: a GM-only intent that may be admitted only
 * AFTER that receipt, and only at the next outcome version. The version
 * is a discriminator, not a free number — skipping a version would leave
 * a hole the inbox primary key and the provenance chain cannot name.
 *
 * Admission answers `accepted-pending-saga` and writes nothing. The
 * saga (17.2) consumes that answer. The N+1 gate (17.3) is a later
 * seam. A plain rewind onto a delivered receipt is still refused
 * `campaign-receipt-delivered` in GmCombatRewindCommit; this file does
 * not call that commit. `expectedDigest` binds the inbox
 * `command_digest` of the delivered (outcomeId, version) pair.
 *
 * Not a combat-wire IntentPayload kind and not a GameEventType: those
 * unions are engine/lobby vocabulary, and an admitted combat intent
 * always dispatches into the engine. This command must not.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-combat-loop/spec.md
 */

import type Database from 'better-sqlite3';

import type { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import type { IGmAuthorityContext } from '@/types/interventions';

import { validateExpectedBranchHead } from '@/lib/events/journal/EventHistoryExpectedHead';
import { evaluateGmInterventionAuthority } from '@/lib/interventions/GmInterventionAuthority';

import { matchStreamRef } from './GmCombatRewindPreview';

export const COORDINATED_OUTCOME_CORRECTION_KIND =
  'CoordinatedOutcomeCorrection' as const;

/**
 * Closed refusal set. Authorization members come from the shared GM
 * rule; the three new ones are this door's (must already be delivered,
 * version must be exactly next, expectedDigest must name the delivered
 * receipt); the rest reuse the expected-head vocabulary the rewind
 * already answers.
 */
export const COORDINATED_OUTCOME_CORRECTION_REFUSALS = [
  'gm-role-required',
  'actor-mismatch',
  'state-not-owned',
  'outcome-not-delivered',
  'version-not-next',
  'expected-digest-mismatch',
  'no-authoritative-history',
  'STALE_BRANCH',
  'STALE_REVISION',
  'STALE_GENERATION',
] as const;

export type CoordinatedOutcomeCorrectionRefusal =
  (typeof COORDINATED_OUTCOME_CORRECTION_REFUSALS)[number];

/**
 * One operator sentence per reason. Total Record over the union so an
 * eleventh member fails compilation until someone writes its sentence
 * (LAW 40, same tripwire as GM_REWIND_REFUSAL_PHRASING).
 */
export const COORDINATED_OUTCOME_CORRECTION_REFUSAL_PHRASING: Readonly<
  Record<CoordinatedOutcomeCorrectionRefusal, string>
> = Object.freeze({
  'gm-role-required':
    'Only the game master for this match can request a coordinated outcome correction.',
  'actor-mismatch':
    'This request was signed by a different account than the one holding game master authority here.',
  'state-not-owned': 'This match is not under your game master authority.',
  'outcome-not-delivered':
    'No campaign has taken delivery of this outcome, so the door is still the plain combat rewind.',
  'version-not-next':
    'The new outcome version must be exactly the delivered version plus one.',
  'expected-digest-mismatch':
    'The expected digest does not match the digest of the delivered outcome being corrected.',
  'no-authoritative-history':
    'This match has no authoritative history to correct against.',
  STALE_BRANCH:
    'Your view names a different branch than the one this match is on. Catch up first.',
  STALE_REVISION:
    'This match has moved on since your view was built. Catch up first.',
  STALE_GENERATION:
    'This match history has been corrected since your view was built. Catch up first.',
});

/**
 * GM-only intent. `outcomeVersion` is the NEW version and must equal
 * the inbox's delivered version + 1. `expectedDigest` is the inbox
 * `command_digest` of that delivered receipt. The other expected*
 * fields are the same head the rewind commit binds; admission
 * compares them and the saga (17.2) will reuse them when it takes
 * the lease.
 */
export interface ICoordinatedOutcomeCorrectionIntent {
  readonly kind: typeof COORDINATED_OUTCOME_CORRECTION_KIND;
  readonly matchId: string;
  readonly outcomeId: string;
  readonly outcomeVersion: number;
  readonly targetRevision: number;
  readonly expectedBranchId: string;
  readonly expectedRevision: number;
  readonly expectedDigest: string;
  readonly expectedGeneration: number;
  readonly actor: string;
}

export interface ICoordinatedOutcomeCorrectionDeps {
  readonly db: Database.Database;
  readonly branches: SQLiteEventHistoryBranchStore;
  readonly priorHeadRevision: number;
}

export type CoordinatedOutcomeCorrectionResult =
  | {
      readonly kind: 'accepted-pending-saga';
      readonly matchId: string;
      readonly outcomeId: string;
      readonly outcomeVersion: number;
      readonly deliveredVersion: number;
      readonly targetRevision: number;
    }
  | {
      readonly kind: 'refused';
      readonly reason: CoordinatedOutcomeCorrectionRefusal;
      readonly detail: string;
    };

function refuse(
  reason: CoordinatedOutcomeCorrectionRefusal,
  detail: string,
): CoordinatedOutcomeCorrectionResult {
  return Object.freeze({ kind: 'refused', reason, detail });
}

/**
 * Highest inbox receipt for this outcome, or null when no campaign has
 * taken delivery. WHAT: version plus the persisted command_digest.
 * WHY: presence is the 13.4 fact, the number is the next-command
 * discriminator, and commandDigest is the binding expectedDigest must
 * name so a caller cannot advertise a digest it did not observe.
 */
export function readDeliveredOutcomeReceipt(
  db: Database.Database,
  outcomeId: string,
): {
  readonly outcomeVersion: number;
  readonly commandDigest: string;
} | null {
  const row = db
    .prepare(
      `SELECT outcome_version AS outcomeVersion,
              command_digest AS commandDigest
         FROM campaign_combat_outcome_inbox
        WHERE outcome_id = ?
        ORDER BY outcome_version DESC
        LIMIT 1`,
    )
    .get(outcomeId) as
    | { readonly outcomeVersion: number; readonly commandDigest: string }
    | undefined;
  return row === undefined ? null : row;
}

/**
 * Compare the caller's expectedDigest to the inbox command_digest.
 * WHAT: empty or unequal strings are a miss. WHY: the intent
 * advertises this binding and admission is the only door; without
 * the check any string proceeds. Equality is the same law the inbox
 * uses for expected versus applied post-state digests.
 */
function deliveredOutcomeDigestMatches(
  expectedDigest: string,
  deliveredDigest: string,
): boolean {
  return expectedDigest !== '' && expectedDigest === deliveredDigest;
}

/**
 * Admit the command or refuse it. Writes nothing on any path — the
 * intent pipeline's admission receipt for this surface is the typed
 * result itself. No GameEvent is derived because this never enters
 * handleIntent / dispatchToEngine.
 */
export function admitCoordinatedOutcomeCorrection(
  deps: ICoordinatedOutcomeCorrectionDeps,
  authority: IGmAuthorityContext,
  intent: ICoordinatedOutcomeCorrectionIntent,
): CoordinatedOutcomeCorrectionResult {
  const decision = evaluateGmInterventionAuthority(authority, {
    domain: 'post-combat',
    kind: 'fix',
    actorId: intent.actor,
    targetRefs: [`game:${intent.matchId}`],
  });
  if (decision.status === 'rejected') {
    return refuse(decision.code, decision.reason);
  }

  // Mirror of 13.4: a coordinated correction only exists after delivery.
  // An undelivered outcome still uses the plain rewind.
  const delivered = readDeliveredOutcomeReceipt(deps.db, intent.outcomeId);
  if (delivered === null) {
    return refuse(
      'outcome-not-delivered',
      `Outcome '${intent.outcomeId}' has no campaign receipt; use the combat rewind until delivery`,
    );
  }
  const deliveredVersion = delivered.outcomeVersion;

  if (intent.outcomeVersion !== deliveredVersion + 1) {
    return refuse(
      'version-not-next',
      `Outcome version ${intent.outcomeVersion} is not the next discriminator after delivered ${deliveredVersion}`,
    );
  }

  if (
    !deliveredOutcomeDigestMatches(
      intent.expectedDigest,
      delivered.commandDigest,
    )
  ) {
    return refuse(
      'expected-digest-mismatch',
      `expectedDigest does not match the delivered outcome digest for '${intent.outcomeId}' version ${deliveredVersion}`,
    );
  }

  const stream = matchStreamRef(intent.matchId);
  if (deps.branches.readEffectiveHead(stream) === null) {
    return refuse(
      'no-authoritative-history',
      `Match '${intent.matchId}' has no authoritative history to name as the expected head`,
    );
  }

  const verdict = validateExpectedBranchHead(
    deps.branches,
    stream,
    deps.priorHeadRevision,
    {
      branchId: intent.expectedBranchId,
      revision: intent.expectedRevision,
      effectiveGeneration: intent.expectedGeneration,
    },
  );
  if (verdict.kind === 'refused') {
    return refuse(
      verdict.code,
      `The named head is ${verdict.code}; resync to the active head first`,
    );
  }

  return Object.freeze({
    kind: 'accepted-pending-saga',
    matchId: intent.matchId,
    outcomeId: intent.outcomeId,
    outcomeVersion: intent.outcomeVersion,
    deliveredVersion,
    targetRevision: intent.targetRevision,
  });
}
