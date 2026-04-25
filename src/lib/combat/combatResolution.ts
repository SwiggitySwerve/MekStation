/**
 * Combat Resolution — Finalize Hook
 *
 * Per `add-victory-and-post-battle-summary` design D5 + spec delta
 * `combat-resolution`: single converge point for both tactical
 * (interactive) and ACAR (auto-resolve) end-of-match flows.
 *
 *  - Tactical: `InteractiveSession.onCompleted(report → ...)` calls
 *    `finalize(session)` which derives the report and POSTs to
 *    `/api/matches`.
 *  - Quick Sim (Phase 2): calls `finalize(session, { persist: false })`
 *    so the aggregator gets the report shape without storage churn.
 *
 * The function is intentionally indirection-light: derive once,
 * persist once. Network errors are surfaced to the caller — the
 * gameplay page's hook converts them to a toast but does NOT block
 * navigation to the victory screen (per design risks section).
 *
 * @spec openspec/changes/add-victory-and-post-battle-summary/specs/combat-resolution/spec.md
 * @spec openspec/changes/add-victory-and-post-battle-summary/design.md (D5)
 */

import type { IGameSession } from '@/types/gameplay';

import {
  derivePostBattleReport,
  type IPostBattleReport,
} from '@/utils/gameplay/postBattleReport';

// =============================================================================
// Types
// =============================================================================

export interface FinalizeOptions {
  /**
   * When `false`, suppresses the POST to `/api/matches`. Quick Sim
   * (Phase 2) opts out so thousands of matches per second don't
   * pollute the match log table. Default: `true` — every interactive
   * end-of-match persists.
   */
  readonly persist?: boolean;
  /**
   * Injectable POST function so unit tests can assert "POSTed exactly
   * once with body X" without a live HTTP listener. Defaults to
   * `globalThis.fetch`.
   */
  readonly fetchImpl?: typeof fetch;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Derive an `IPostBattleReport` from `session`, optionally persist it
 * via POST `/api/matches`, and return the report.
 *
 * Spec scenarios:
 *  - "Tactical resolution returns IPostBattleReport"
 *  - "ACAR resolution returns IPostBattleReport"
 *  - "Tactical finalize persists by default"
 *  - "Quick Sim finalize skips persistence"
 */
export async function finalize(
  session: IGameSession,
  opts: FinalizeOptions = {},
): Promise<IPostBattleReport> {
  const report = derivePostBattleReport(session);
  if (opts.persist === false) {
    return report;
  }
  const fetchImpl = opts.fetchImpl ?? fetch;
  const response = await fetchImpl('/api/matches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
  });
  if (!response.ok) {
    // Surface the API error to the caller; gameplay page renders a
    // toast but the in-memory report is still returned so the UI
    // can render the victory screen even if persistence failed.
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(
      body.error ?? `match log POST failed (status ${response.status})`,
    );
  }
  return report;
}

// =============================================================================
// Namespace export
// =============================================================================

/**
 * Namespace bundle so callers can write `combatResolution.finalize(...)`
 * matching the spec's wording. Pure cosmetic — the named export above
 * is the canonical entry point.
 */
export const combatResolution = {
  finalize,
};
