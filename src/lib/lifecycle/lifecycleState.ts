/**
 * The one lifecycle vocabulary shared by the tactical, campaign, and GM
 * surfaces (umbrella 19.1).
 *
 * Each surface used to name its own postures. That is fine until a
 * player moves between them: the same underlying condition - "the thing
 * you are looking at is not the thing the server has" - was called
 * `catching-up` on one screen and `behind` on another, and a locator
 * written against one surface said nothing about the next. Naming them
 * once, here, is what lets a test, a screen reader, and a player treat
 * the three surfaces as one product.
 *
 * The union is DELIBERATELY total across all three surfaces rather than
 * per-surface. A surface that cannot reach a posture simply never
 * derives it - which is a fact its own derivation proves - instead of
 * the union quietly differing between files.
 */

/**
 * The nine degraded/decided postures the umbrella names, plus the
 * converged one. `live` is not in the letter's list because the letter
 * enumerates the states worth announcing; a surface still needs a name
 * for "nothing is wrong", and leaving it unnamed is how banners end up
 * rendering only on trouble.
 */
export type LifecycleState =
  | 'pending'
  | 'sealed'
  | 'finalized'
  | 'syncing'
  | 'reconnecting'
  | 'behind'
  | 'blocked'
  | 'rewound'
  | 'rebuilding'
  | 'live';

/**
 * Typed signals owned by `add-authoritative-history-branches`. No
 * surface emits either one today. They are declared here so the branch
 * work can route its signal into an existing derivation instead of
 * inventing a posture and a locator at the same time - and so a test can
 * prove that no LIVE signal reaches them in the meantime.
 */
export type LifecycleProjectionSignal =
  | 'PROJECTION_REWOUND'
  | 'PROJECTION_REBUILDING';

/** What every surface's derivation resolves to. */
export interface ILifecyclePosture {
  readonly state: LifecycleState;
  readonly message: string;
}

/**
 * Tone per posture, using palette classes already used by sibling
 * surfaces. Keyed by the shared state so a posture cannot pick up a
 * colour that contradicts what another surface shows for the same word.
 */
export const LIFECYCLE_TONE: Readonly<Record<LifecycleState, string>> = {
  pending: 'border-amber-700 bg-amber-900/30 text-amber-200',
  sealed: 'border-violet-700 bg-violet-950/30 text-violet-200',
  finalized: 'border-emerald-700 bg-emerald-950/30 text-emerald-200',
  syncing: 'border-amber-700 bg-amber-900/30 text-amber-200',
  reconnecting: 'border-amber-700 bg-amber-900/30 text-amber-200',
  behind: 'border-sky-700 bg-sky-900/30 text-sky-200',
  blocked: 'border-red-700 bg-red-950/40 text-red-200',
  rewound: 'border-sky-700 bg-sky-900/30 text-sky-200',
  rebuilding: 'border-sky-700 bg-sky-900/30 text-sky-200',
  live: 'border-emerald-700 bg-emerald-950/30 text-emerald-200',
};
