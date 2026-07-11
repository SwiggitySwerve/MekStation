/**
 * Deterministic per-battle engine seed derivation for the headless
 * campaign fast-forward suites.
 *
 * Why: `GameEngine`'s constructor falls back to `Date.now()` when no
 * `seed` is supplied (`GameEngine.ts`: `this.seed = config.seed ??
 * Date.now();`) — the exact wall-clock footgun every current UI call
 * site inherits (`usePreBattleLaunch.ts`: `seed: seedOverride ??
 * Date.now()`). Fast-forward battles run headlessly and must be
 * reproducible, so every call into `GameEngine` in this module tree
 * supplies an explicit seed derived from this function — never a
 * fallback.
 *
 * Design D4 (`openspec/changes/add-campaign-fast-forward-api/design.md`):
 * `seed = deriveBattleSeed(resolveCampaignSeed(campaign), scenarioId)`.
 * The scenario id already embeds the generation date, contract, and
 * force (`buildScenarioId`, `scenarioGenerationProcessor.ts:149-156`:
 * `scn-<contractId>-<dateKey>-<forceId>`), so folding it into the seed
 * makes the seed a property of the scenario FIXED AT GENERATION — never
 * of the day the battle is elected to be fought. This is load-bearing
 * for the live-parity acceptance's deferred-fight ordering variation
 * (design D7 rule 3): a scenario fought one day later than the
 * fast-forward run resolves with the IDENTICAL seed, so any divergence
 * is orchestration-order-sensitivity, not dice.
 *
 * Task 3.1 preflight (verified during authoring): `SeededRandom`
 * (`src/simulation/core/SeededRandom.ts`) is a pure Mulberry32
 * implementation — its `next()`/`nextInt()`/`nextRange()` methods derive
 * exclusively from `this.state`, seeded once in the constructor from the
 * caller-supplied `seed` (coerced via `>>> 0`). There is no internal
 * `Math.random` fallback anywhere in the file, so a seed threaded through
 * this helper into `new GameEngine({ seed })` fully determines every
 * engine-side roll.
 *
 * @module lib/campaign/fastForward/deriveBattleSeed
 */

/**
 * FNV-1a 32-bit hash — the same well-known, dependency-free string→uint32
 * mix `campaignRng.ts`'s `createDailyRandom` uses to fold a stream key
 * into the campaign seed (`(resolveCampaignSeed(campaign) ^
 * fnv1a(...)) >>> 0`). Not exported from `campaignRng.ts`, so this module
 * carries its own copy rather than reaching into that module's private
 * internals — the algorithm is generic (not fast-forward business logic),
 * so duplication here costs nothing and keeps this module's only
 * dependency on `campaignRng.ts` at the public `resolveCampaignSeed`
 * function (call site owns which campaign seed to pass).
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
 * Derive a deterministic `GameEngine` seed from the campaign's resolved
 * RNG seed and a bridged scenario's stable id.
 *
 * Pure and total: no wall-clock input, no I/O, no randomness. Same
 * inputs always produce the same output; distinct scenario ids under the
 * same campaign seed produce (with overwhelming probability) distinct
 * seeds, since `fnv1a` is a well-distributed avalanche hash.
 *
 * @param campaignSeed - `resolveCampaignSeed(campaign)` — the caller
 *   resolves this once per battle from the LIVE campaign snapshot, never
 *   cached across days (a legacy campaign's id-derived fallback seed is
 *   itself deterministic, so no behavior differs by inlining vs caching —
 *   this signature just keeps the dependency explicit at the call site).
 * @param scenarioId - the bridged scenario's stable id
 *   (`scn-<contractId>-<dateKey>-<forceId>`) — fixed at generation time,
 *   NEVER the day the battle is actually fought.
 */
export function deriveBattleSeed(
  campaignSeed: number,
  scenarioId: string,
): number {
  return (campaignSeed ^ fnv1a(scenarioId)) >>> 0;
}
