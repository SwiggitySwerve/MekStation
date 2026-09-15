/**
 * Forward-only integrity guards for existing history-branch tables.
 *
 * Migration 23 is already applied in persisted databases and must remain
 * immutable. These triggers constrain future raw SQL writes while store reads
 * refuse pre-existing malformed authority rows without rewriting or deleting.
 */

import { EVENT_HISTORY_GENESIS_DIGEST_LITERAL } from './SQLiteService.historyBranches.migration';

export const EVENT_HISTORY_BRANCH_INTEGRITY_MIGRATION = {
  version: 31,
  name: 'event_history_branch_integrity_guards',
  up: `
    CREATE TRIGGER IF NOT EXISTS event_history_branches_root_genesis_digest_guard
      BEFORE INSERT ON event_history_branches
      WHEN NEW.parent_branch_id IS NULL
        AND NEW.base_digest <> '${EVENT_HISTORY_GENESIS_DIGEST_LITERAL}'
      BEGIN
        SELECT RAISE(ABORT,
          'event_history_branches root base digest must equal the defined genesis digest');
      END;

    CREATE TRIGGER IF NOT EXISTS event_history_effective_heads_branch_must_be_effective_on_insert
      BEFORE INSERT ON event_history_effective_heads
      WHEN NOT EXISTS (
        SELECT 1 FROM event_history_branches AS branch
        WHERE branch.stream_type = NEW.stream_type
          AND branch.stream_id = NEW.stream_id
          AND branch.branch_id = NEW.branch_id
          AND branch.status = 'effective')
      BEGIN
        SELECT RAISE(ABORT,
          'event_history_effective_heads must name an effective branch');
      END;

    CREATE TRIGGER IF NOT EXISTS event_history_effective_heads_branch_must_be_effective_on_update
      BEFORE UPDATE ON event_history_effective_heads
      WHEN NOT EXISTS (
        SELECT 1 FROM event_history_branches AS branch
        WHERE branch.stream_type = NEW.stream_type
          AND branch.stream_id = NEW.stream_id
          AND branch.branch_id = NEW.branch_id
          AND branch.status = 'effective')
      BEGIN
        SELECT RAISE(ABORT,
          'event_history_effective_heads must name an effective branch');
      END;
  `,
} as const;
