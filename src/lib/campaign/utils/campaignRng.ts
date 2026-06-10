/**
 * Campaign Daily RNG — seeded random streams for day processors
 *
 * Per audit finding D-10 (2026-06-09 audit, remediation W3.4): daily
 * outcome rolls (healing checks, turnover, markets, scenario generation,
 * random events, acquisition) previously drew from raw `Math.random`,
 * making campaign days unreplayable. Every processor now derives its
 * rolls from a deterministic stream keyed by:
 *
 *   (campaign seed, processed day, processor id)
 *
 * - The campaign seed is `campaign.rngSeed`, stamped at campaign creation
 *   and persisted with the campaign (see `SerializedCampaignState.rngSeed`).
 *   Legacy campaigns without a seed fall back to a hash of the campaign id
 *   so they are replayable too (just with an id-derived seed).
 * - The day key makes consecutive days roll differently.
 * - The processor id isolates streams: registration-order changes or a
 *   processor consuming more/fewer rolls never shifts the draws another
 *   processor sees.
 *
 * @module lib/campaign/utils/campaignRng
 */

import type { ICampaign } from '@/types/campaign/Campaign';

import { SeededRandom } from '@/simulation/core/SeededRandom';

/** Random function shape every campaign roll consumer accepts: [0, 1). */
export type RandomFn = () => number;

/** Widened campaign view carrying the persisted RNG seed. */
type ISeededCampaign = ICampaign & { readonly rngSeed?: number };

/**
 * FNV-1a 32-bit hash — stable string → uint32 derivation used for the
 * legacy-campaign fallback seed and for folding day/stream keys into the
 * campaign seed. Chosen for determinism + zero dependencies, not crypto.
 */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Resolve the campaign's RNG seed. Prefers the persisted `rngSeed`
 * (stamped at creation since the D-10 fix); legacy campaigns fall back
 * to a deterministic hash of the campaign id so replays still work.
 */
export function resolveCampaignSeed(campaign: ICampaign): number {
  const seeded = campaign as ISeededCampaign;
  return seeded.rngSeed !== undefined
    ? seeded.rngSeed >>> 0
    : fnv1a(campaign.id);
}

/**
 * Create the seeded daily random stream for one processor's run.
 *
 * Same campaign state (seed + currentDate) and same processor id always
 * produce the identical roll sequence — the replayability contract the
 * D-10 determinism tests assert.
 *
 * @param campaign - campaign being processed (provides the seed)
 * @param date - the day being processed (the pipeline's `processedDate`)
 * @param streamId - the consuming processor's id (stream isolation)
 */
export function createDailyRandom(
  campaign: ICampaign,
  date: Date,
  streamId: string,
): RandomFn {
  // Day key is the calendar date only — re-running the same day (e.g. a
  // failed-save replay) must reproduce identical rolls.
  const dayKey = date.toISOString().slice(0, 10);
  const seed =
    (resolveCampaignSeed(campaign) ^ fnv1a(`${dayKey}:${streamId}`)) >>> 0;
  const rng = new SeededRandom(seed);
  return () => rng.next();
}
