/**
 * The S7 marker migration: DESIGNED AND STUBBED, NOT ACTIVATED (S1b).
 *
 * When S7 raises the contract-rules writer above 1 it ships this migration as
 * the new highest version. It changes no schema. Its only job is the version
 * row: every S1b-or-later build whose catalog lacks it then refuses the file at
 * startup (`DatabaseNewerThanAppError`), and it is the one marker the shipped
 * runner records atomically with the change. It is raised at first startup of
 * the S7 build, a superset of "when the first v2 contract is written".
 *
 * S7 activates it by appending `buildLifecycleRulesMarkerMigration(<head>)`'s
 * result to `MIGRATIONS` (a literal version number, not a computed one). Until
 * then nothing imports this for the runner, and a test pins that it is absent.
 *
 * @spec openspec/changes/add-contract-lifecycle-s1b/specs/mission-contracts/spec.md
 */
import type { IMigration } from './SQLiteService.migrations';

export const LIFECYCLE_RULES_MARKER_NAME = 'contract-lifecycle-rules-v2';

export function buildLifecycleRulesMarkerMigration(head: number): IMigration {
  return {
    version: head + 1,
    name: LIFECYCLE_RULES_MARKER_NAME,
    up: 'SELECT 1;',
  };
}
