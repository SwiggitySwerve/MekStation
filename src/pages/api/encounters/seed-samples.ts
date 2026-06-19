/**
 * Encounters API — Seed Sample Encounters
 *
 * `POST /api/encounters/seed-samples` — creates 4 starter encounters,
 * one per `ScenarioTemplateType` enum value (Duel | Skirmish | Battle |
 * Custom). Used by the empty-state CTA on `/gameplay/encounters` so a
 * user landing on a freshly-cleaned list can populate it with realistic
 * starter rows in a single click.
 *
 * Behaviour:
 *  - Names are date-suffixed (`Sample <Type> - <YYYY-MM-DD>`) so a
 *    same-day double-click hits SQLite's unique-name constraint and
 *    triggers the rollback path. A next-day click succeeds because the
 *    suffix changed.
 *  - All 4 inserts run inside a SQLite `db.transaction(...)` so a
 *    partial failure (e.g. unique-name collision on the 3rd insert)
 *    rolls back the first two — the response is then 500 with the
 *    underlying error message and the encounters table is unchanged.
 *  - On success: 200 + `{ success: true, ids: [4 strings] }`.
 *
 * @spec openspec/changes/repair-broken-encounter-drafts/specs/game-session-management/spec.md
 *       (Requirement: Empty-State Seed Samples)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { initializeApiDatabase } from '@/pages-modules/api/routeHelpers';
import { getEncounterRepository } from '@/services/encounter/EncounterRepository';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { ScenarioTemplateType } from '@/types/encounter';

// =============================================================================
// Types
// =============================================================================

type SuccessResponse = {
  readonly success: true;
  readonly ids: readonly string[];
};

type FailureResponse = {
  readonly success: false;
  readonly error: string;
};

// =============================================================================
// Sample template list
// =============================================================================

/**
 * Ordered list of templates to seed. Mirrors the four
 * `ScenarioTemplateType` values defined at
 * `src/types/encounter/EncounterInterfaces.ts:61-69`.
 *
 * Pin the order here (rather than `Object.values(ScenarioTemplateType)`)
 * so the resulting list is deterministic regardless of TS enum-emit
 * ordering — the test suite asserts ids in this order.
 */
const SAMPLE_TEMPLATES: ReadonlyArray<{
  readonly type: ScenarioTemplateType;
  readonly displayName: string;
}> = [
  { type: ScenarioTemplateType.Duel, displayName: 'Duel' },
  { type: ScenarioTemplateType.Skirmish, displayName: 'Skirmish' },
  { type: ScenarioTemplateType.Battle, displayName: 'Battle' },
  { type: ScenarioTemplateType.Custom, displayName: 'Custom' },
];

/**
 * `Sample <Type> - <YYYY-MM-DD>`. Date-suffixing avoids the unique-name
 * constraint on a same-session re-click; same-day re-click still
 * collides and triggers the rollback path (which is the documented
 * "fail cleanly" behaviour).
 */
function buildSampleName(displayName: string, dateIso: string): string {
  // ISO 8601 date prefix (`YYYY-MM-DD`) — slice off the time portion
  // so we don't wedge unreadable timestamps into the encounter name.
  const datePart = dateIso.slice(0, 10);
  return `Sample ${displayName} - ${datePart}`;
}

function seedFailureMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Failed to seed sample encounters';
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | FailureResponse>,
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: `Method ${req.method ?? 'unknown'} Not Allowed`,
    });
  }
  if (
    !initializeApiDatabase(res, (message) => ({
      success: false,
      error: message,
    }))
  )
    return;

  const dateIso = new Date().toISOString();
  const repo = getEncounterRepository();
  const db = getSQLiteService().getDatabase();

  // Atomic 4-insert: better-sqlite3's `db.transaction(fn)` returns a
  // wrapped function that runs inside BEGIN/COMMIT, rolling back the
  // entire batch if anything inside throws.
  const txn = db.transaction((): readonly string[] => {
    const ids: string[] = [];
    for (const sample of SAMPLE_TEMPLATES) {
      const name = buildSampleName(sample.displayName, dateIso);
      const result = repo.createEncounter({ name, template: sample.type });
      // `createEncounter` returns `{ success: false, error }` on a
      // unique-name collision (or any other DB error). Throw here so the
      // outer transaction rolls back the previous successful inserts.
      if (!result.success || !result.id) {
        throw new Error(
          result.error ?? `Failed to seed sample encounter "${name}"`,
        );
      }
      ids.push(result.id);
    }
    return ids;
  });

  try {
    const ids = txn();
    return res.status(200).json({ success: true, ids });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: seedFailureMessage(error),
    });
  }
}
