/**
 * The live command path's rejection-audit port (umbrella task 18.2;
 * `Audit Captures Action Provenance`).
 *
 * The store this writes to is not new: `action_audit` shipped with
 * authority-audit PR 4, append-once on `command_id`, with
 * `command-rejected` already reserved in its closed safe-reason set and
 * a CHECK that forbids a rejected row from carrying a committed
 * revision range. What was missing was a caller - `recordLifecycle` had
 * test callers only - so a refusal on the wire left no trace anywhere.
 * This module is that caller, and nothing more.
 *
 * Three laws it exists to keep:
 *
 *   APPEND-ONCE. The audit row is keyed by the command's own id, which
 *   is the journal's global command identity, so a client that retries
 *   a refused envelope reuses the key and the repository answers
 *   `existing` instead of writing a second row. Idempotency is the
 *   primary key, not a check-then-insert race.
 *
 *   SAFE CLASS ONLY. Every live refusal maps to the single closed code
 *   `command-rejected`. Publishing a finer reason (paused / rate-limited
 *   / already-completed) into a row a player can read through the
 *   timeline projection would turn the audit into a side channel about
 *   authority state; the finer detail belongs in the PR 5 private
 *   record class, whose `rejection-detail` kind is reserved for it.
 *
 *   NEVER FATAL. A rejection is terminal either way - the command
 *   cannot be accepted because the audit failed. So an audit failure
 *   degrades to `skipped`/`conflict` and the refusal still reaches the
 *   player. Losing the row is bad; converting a clean refusal into an
 *   internal error would be worse, and would be a denial-of-service
 *   lever on any command whose id collided.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/audit-timeline/spec.md
 */

import { sha256 } from 'js-sha256';

import type {
  IActionAuditRepository,
  IFailedActionAuditInsert,
} from '@/lib/events/audit/IActionAuditRepository';
import type { IAuthorizedViewer } from '@/lib/multiplayer/server/authorization/AuthorizedViewer';

import { isActionAuditError } from '@/lib/events/audit/IActionAuditRepository';
import { SQLiteActionAuditRepository } from '@/lib/events/audit/SQLiteActionAuditRepository';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

/**
 * What the recorder did.
 *
 * `skipped` covers the two honest no-ops: an envelope that named no
 * command id (nothing to be idempotent about) and a process with no
 * durable audit. `conflict` is a reused id whose content differs - the
 * first row stands, deliberately, because rewriting it would break
 * append-once.
 */
export type CommandRejectionAuditOutcome =
  | 'created'
  | 'existing'
  | 'skipped'
  | 'conflict';

export interface ICommandRejectionAuditInput {
  /** Server-derived viewer. Actor identity never comes off the wire. */
  readonly viewer: IAuthorizedViewer;
  /** The match whose host refused the command. */
  readonly matchId: string;
  /** The envelope's command identity; null when it named none. */
  readonly commandId: string | null;
  /** The refused command payload, digested as integrity linkage. */
  readonly intent: unknown;
  /** Caller-supplied clock reading; this module reads no clock. */
  readonly occurredAt: string;
}

/**
 * Records one terminal command rejection. Synchronous because the
 * underlying repository is (better-sqlite3), which is what lets a
 * caller place the write strictly before it broadcasts the refusal.
 */
export interface ICommandRejectionAuditPort {
  recordCommandRejection(
    input: ICommandRejectionAuditInput,
  ): CommandRejectionAuditOutcome;
}

/**
 * Key-sorted JSON so a retried envelope digests identically even when
 * its keys arrive in a different order.
 *
 * Not cosmetic: the repository treats the same command id with a
 * different digest as an identity conflict, so an order-sensitive
 * digest would turn an honest retry into a conflict and lose the
 * append-once property this seam exists to prove.
 */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const members = keys.map(
    (key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`,
  );
  return `{${members.join(',')}}`;
}

/**
 * Integrity linkage for a refused command: a digest over the identity
 * and the payload, so a later reader can tell "this id was refused"
 * from "a DIFFERENT command reused this id".
 */
export function commandRejectionDigest(
  matchId: string,
  commandId: string,
  intent: unknown,
): string {
  return sha256(canonicalJson({ commandId, intent, matchId }));
}

/** Writes rejections to the append-once `action_audit` table. */
export class ActionAuditCommandRejectionPort implements ICommandRejectionAuditPort {
  public constructor(private readonly repository: IActionAuditRepository) {}

  /**
   * Appends the single rejected row for this command, or reports why
   * it did not. Never throws: see the NEVER FATAL law above.
   */
  public recordCommandRejection(
    input: ICommandRejectionAuditInput,
  ): CommandRejectionAuditOutcome {
    const commandId = input.commandId;
    if (commandId === null || commandId.trim().length === 0) return 'skipped';

    const insert: IFailedActionAuditInsert = {
      campaignSessionId: input.viewer.campaignSessionId,
      matchId: input.matchId,
      streamType: 'match',
      streamId: input.matchId,
      commandId,
      commandDigest: commandRejectionDigest(
        input.matchId,
        commandId,
        input.intent,
      ),
      actor: {
        principalId: input.viewer.principalId,
        participantId: input.viewer.participantId,
        role: input.viewer.role,
      },
      lifecycleState: 'rejected',
      safeReasonCode: 'command-rejected',
      correlationId: null,
      createdAt: input.occurredAt,
      committedFirstRevision: null,
      committedLastRevision: null,
      committedEventCount: null,
    };

    try {
      return this.repository.recordLifecycle(insert).kind;
    } catch (error) {
      // A typed audit refusal (conflicting reuse of a command id, or a
      // row the closed-set guards reject) must not escalate a clean
      // command refusal into an internal error.
      if (isActionAuditError(error)) return 'conflict';
      throw error;
    }
  }
}

/**
 * Picks this process's rejection-audit port.
 *
 * Shaped like `selectCampaignEventStore` but with a null arm instead of
 * a throwing one, and for a different reason than convenience: the
 * campaign journal IS the authority, so a process without one must fail
 * loudly. The audit is a record ABOUT authority - a browser host or a
 * unit-test host that has no database must still be able to refuse a
 * command, so "no audit here" is a legitimate configuration rather than
 * a durability lie.
 */
export function selectCommandRejectionAudit(): ICommandRejectionAuditPort | null {
  const service = getSQLiteService();
  if (!service.isInitialized()) return null;
  return new ActionAuditCommandRejectionPort(
    new SQLiteActionAuditRepository(service.getDatabase()),
  );
}
