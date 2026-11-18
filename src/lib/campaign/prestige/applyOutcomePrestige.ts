/**
 * Apply-Outcome Prestige Step — post-battle prestige update
 *
 * Pure function, no IO. `applyOutcomePrestige` runs when a battle outcome
 * is applied (design D7): for every unit in the outcome's per-unit deltas
 * it derives a deterministic prestige signal and adjusts that unit's
 * prestige record, returning the updated `unitPrestige` list. Units with
 * no prior record are seeded at `PRESTIGE_DEFAULT` before adjustment.
 *
 * Prestige tracks combat results deterministically — calling this twice on
 * the same outcome and the same starting list is idempotent at the
 * processor level because the post-battle processor de-dupes outcomes by
 * `matchId` before this step ever runs.
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 * @module lib/campaign/prestige/applyOutcomePrestige
 */

import type { BattleUnitManifest } from '@/types/campaign/BattleUnitManifest';
import type { IUnitPrestige } from '@/types/campaign/Prestige';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import { resolveDeltaRosterUnit } from '../battleUnitManifest';
import {
  adjustPrestige,
  createDefaultUnitPrestige,
  deriveUnitPrestigeSignal,
} from './prestigeScorer';

/**
 * Apply a battle outcome's prestige effects to a campaign's prestige list.
 *
 * @param outcome - the combat outcome being applied
 * @param current - the campaign's current `unitPrestige` list (may be empty)
 * @param appliedAt - ISO-8601 timestamp the outcome is applied
 * @param manifest - the battle's launch manifest; prestige is keyed by the
 *   roster unit it names, and units with no roster unit get none (T1)
 * @returns the updated `unitPrestige` list
 */
export function applyOutcomePrestige(
  outcome: ICombatOutcome,
  current: readonly IUnitPrestige[],
  appliedAt: string,
  manifest: BattleUnitManifest | undefined,
): readonly IUnitPrestige[] {
  if (outcome.unitDeltas.length === 0) {
    return current;
  }

  // Index existing records by unit id for O(1) lookup.
  const byUnit = new Map<string, IUnitPrestige>();
  for (const record of current) {
    byUnit.set(record.unitId, record);
  }

  const winner = outcome.report.winner;

  for (const delta of outcome.unitDeltas) {
    const resolution = resolveDeltaRosterUnit(delta, manifest);
    if (resolution.kind !== 'roster') continue;
    const unitId = resolution.rosterUnitId;
    // A unit "won" when its side matches the outcome winner. A draw or a
    // loss is not a win.
    const won = winner !== 'draw' && delta.side === winner;
    const signal = deriveUnitPrestigeSignal(
      delta,
      won,
      outcome.matchId,
      appliedAt,
    );
    const existing = byUnit.get(unitId) ?? createDefaultUnitPrestige(unitId);
    byUnit.set(unitId, adjustPrestige(existing, signal));
  }

  return Array.from(byUnit.values());
}

/**
 * Determine whether a `GameSide` is the player's side. Exposed so callers
 * can reason about "the player's units" without re-importing the enum.
 *
 * @param side - the side to test
 * @returns true when the side is the player's
 */
export function isPlayerSide(side: GameSide): boolean {
  return side === GameSide.Player;
}
