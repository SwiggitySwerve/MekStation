/**
 * Expected Damage + Damage Variance helpers.
 *
 * Per `add-what-if-to-hit-preview` § 3, § 4, § 6: pure functions that
 * combine a weapon's damage profile with a `hitProbability` to produce
 * the statistical mean damage and stddev the "Preview Damage" toggle
 * surfaces in the WeaponSelector. Cluster weapons integrate the 2d6
 * cluster-hit-table expectation; Streak weapons treat the rack as
 * all-or-nothing; one-shot launchers respect remaining shots.
 *
 * Zero side effects, no dice rolls, no state mutation. Same input →
 * same output. The helpers are designed to be called O(N_weapons) per
 * UI render and never block on async work.
 *
 * @spec openspec/changes/add-what-if-to-hit-preview/specs/damage-system/spec.md
 */

import type { IWeapon } from '@/simulation/ai/types';

import {
  CLUSTER_HIT_TABLE,
  CLUSTER_SIZES,
  getNearestClusterSize,
  type ClusterSize,
} from '../clusterWeapons/hitTable';
import { isStreakWeapon } from '../clusterWeapons/streak';
import { getClusterSizeForWeapon } from '../clusterWeapons/weaponSizes';

/**
 * 2d6 probability mass (rolls 2..12). Hard-coded as the canonical
 * BattleTech distribution: P(2) = 1/36, P(3) = 2/36, ... P(7) = 6/36,
 * ... P(12) = 1/36. Sum is 1.0.
 *
 * Reasoning: we keep this as `Record<number, number>` (rather than a
 * sparse array) so we can dot-product directly against
 * `CLUSTER_HIT_TABLE` without index gymnastics.
 */
export const TWO_D6_PROBABILITY_MASS: Readonly<Record<number, number>> = {
  2: 1 / 36,
  3: 2 / 36,
  4: 3 / 36,
  5: 4 / 36,
  6: 5 / 36,
  7: 6 / 36,
  8: 5 / 36,
  9: 4 / 36,
  10: 3 / 36,
  11: 2 / 36,
  12: 1 / 36,
};

/**
 * Compute the expected (mean) hit count for a single cluster-table
 * column (rack size). Dot product of the 2d6 PMF with the cluster
 * table row for `clusterSize`.
 *
 * Pure function — kept separate so the cached lookup table can build
 * itself eagerly at module-load.
 */
function computeExpectedClusterHits(clusterSize: ClusterSize): number {
  let sum = 0;
  for (let roll = 2; roll <= 12; roll++) {
    const row = CLUSTER_HIT_TABLE[roll];
    if (!row) continue;
    const hits = row[clusterSize] ?? 0;
    const pmf = TWO_D6_PROBABILITY_MASS[roll] ?? 0;
    sum += hits * pmf;
  }
  return sum;
}

/**
 * Compute the variance (not stddev) of cluster hits for a given rack
 * size. We keep variance internal because combining it with the
 * Bernoulli hit factor needs E[hits²] not stddev.
 *
 * Variance formula: Var(X) = E[X²] − (E[X])²
 */
function computeClusterHitsVariance(clusterSize: ClusterSize): number {
  let eXSquared = 0;
  for (let roll = 2; roll <= 12; roll++) {
    const row = CLUSTER_HIT_TABLE[roll];
    if (!row) continue;
    const hits = row[clusterSize] ?? 0;
    const pmf = TWO_D6_PROBABILITY_MASS[roll] ?? 0;
    eXSquared += hits * hits * pmf;
  }
  const mean = computeExpectedClusterHits(clusterSize);
  // Reasoning: rounding errors can push var slightly negative when
  // the table is degenerate (all-same hits). Clamp to zero so callers
  // can take sqrt safely.
  return Math.max(0, eXSquared - mean * mean);
}

/**
 * Pre-computed expected cluster hits indexed by rack size.
 * Built once at module load — see § 6.2 cache requirement.
 */
const EXPECTED_CLUSTER_HITS_INTERNAL: Record<number, number> = {};
const CLUSTER_HITS_VARIANCE_INTERNAL: Record<number, number> = {};
for (const size of CLUSTER_SIZES) {
  EXPECTED_CLUSTER_HITS_INTERNAL[size] = computeExpectedClusterHits(size);
  CLUSTER_HITS_VARIANCE_INTERNAL[size] = computeClusterHitsVariance(size);
}

/**
 * Public read-only view of the cached expected-cluster-hits table.
 * `expectedClusterHits[10] ≈ 6.14` for the standard TechManual table.
 *
 * @spec § 6 — cluster hit table expectations cached as module constant
 */
export const expectedClusterHits: Readonly<Record<number, number>> =
  EXPECTED_CLUSTER_HITS_INTERNAL;

/**
 * Public read-only view of the cached cluster-hit variance table.
 * Stddev = sqrt(variance); we expose variance so callers can combine
 * it with the Bernoulli hit variance via the law of total variance
 * before taking the square root.
 */
export const clusterHitsVariance: Readonly<Record<number, number>> =
  CLUSTER_HITS_VARIANCE_INTERNAL;

/**
 * Resolve the cluster rack size for an arbitrary weapon. Falls back
 * to the catalog's `getClusterSizeForWeapon` (matches the canonical
 * id list), then to common name patterns, then to `null` for plain
 * single-shot weapons.
 */
function resolveClusterSize(weapon: IWeapon): number | null {
  const catalogHit = getClusterSizeForWeapon(weapon.id);
  if (catalogHit !== undefined) return catalogHit;

  // Defensive: weapon id may not match the catalog (mocks, custom
  // mods, Streak/IS/Clan prefixes, "(OS)" suffixes, etc.). Inspect
  // the name for a "<family>-<size>" pattern. The optional `streak`
  // / `clan` / `is` prefixes let us catch "Streak SRM-4", "Clan LRM
  // 20", "IS-LRM-15" without listing every variant in the catalog.
  const familyPattern =
    /(?:streak|clan|is)?[\s-]?(?:lrm|srm|mrm|atm|lb-?\d+-?x|rac|uac)[\s-]?(\d+)/i;
  const fromName = familyPattern.exec(weapon.name);
  if (fromName) {
    const size = Number.parseInt(fromName[1] ?? '', 10);
    if (Number.isFinite(size) && size > 1) return size;
  }
  // Same pattern against the id as a last resort — covers ids like
  // `clan-streak-srm-6` that the catalog table doesn't enumerate.
  const fromId = familyPattern.exec(weapon.id);
  if (fromId) {
    const size = Number.parseInt(fromId[1] ?? '', 10);
    if (Number.isFinite(size) && size > 1) return size;
  }
  return null;
}

/**
 * Detect a Streak missile launcher. Streak SRM/LRM either all-hit on
 * a successful lock-on or no missiles fire — modeled here as
 * `expectedDamage = P(hit) × rackSize × damagePerMissile`.
 */
function isStreak(weapon: IWeapon): boolean {
  return isStreakWeapon(weapon.id) || /streak/i.test(weapon.name);
}

/**
 * Detect a one-shot launcher. The `os-` id prefix and `(OS)` name
 * suffix are the existing repo-wide conventions.
 */
function isOneShot(weapon: IWeapon): boolean {
  const id = weapon.id.toLowerCase();
  return (
    id.startsWith('os-') ||
    id.endsWith('-os') ||
    /\(os\)|one[\s-]?shot/i.test(weapon.name)
  );
}

/**
 * Look up the expected cluster hits for an arbitrary rack size.
 * Snaps to the nearest supported column per the standard table
 * (e.g. rack size 11 falls back to the 10-column).
 */
function expectedClusterHitsForSize(rackSize: number): number {
  const nearest = getNearestClusterSize(rackSize);
  return EXPECTED_CLUSTER_HITS_INTERNAL[nearest] ?? 0;
}

/**
 * Look up the cluster-hit variance for an arbitrary rack size.
 */
function clusterHitsVarianceForSize(rackSize: number): number {
  const nearest = getNearestClusterSize(rackSize);
  return CLUSTER_HITS_VARIANCE_INTERNAL[nearest] ?? 0;
}

/**
 * Optional ammo lookup — when the caller can prove the weapon has
 * zero remaining shots (one-shot already fired, ammo bin depleted)
 * we want preview to read 0 not the rack-size estimate.
 */
export interface IExpectedDamageOptions {
  /**
   * Shots the weapon can still fire. `undefined` means "treat as
   * unlimited" (energy weapons or unknown ammo state). `0` forces
   * the preview to zero so the UI can render "—".
   */
  readonly remainingShots?: number;
}

/**
 * Mean damage for a single firing of `weapon` weighted by
 * `hitProbability`.
 *
 * @spec § 3 (single-shot, cluster, Streak, one-shot variants)
 */
export function expectedDamage(
  weapon: IWeapon,
  hitProbability: number,
  options: IExpectedDamageOptions = {},
): number {
  // Reasoning: Probabilities outside [0, 1] would propagate garbage
  // into stddev calculations; clamp before any math runs.
  const p = Math.max(0, Math.min(1, hitProbability));
  if (p === 0) return 0;

  // One-shot launchers: if remainingShots is explicitly 0 the preview
  // should read zero (already fired). Other shot counts behave like
  // single-shot — capping at one shot per UI preview.
  if (isOneShot(weapon) && options.remainingShots === 0) return 0;

  // Catalog ammo bin empty → zero expected damage even if the
  // weapon isn't tagged one-shot. Energy weapons report `ammoPerTon =
  // -1`; we never zero those out.
  if (
    weapon.ammoPerTon !== -1 &&
    options.remainingShots !== undefined &&
    options.remainingShots <= 0
  ) {
    return 0;
  }

  const damage = weapon.damage;
  const rackSize = resolveClusterSize(weapon);

  if (rackSize !== null) {
    if (isStreak(weapon)) {
      // Streak: all missiles hit on a successful lock-on.
      return p * rackSize * damage;
    }
    // Cluster: integrate the 2d6 cluster-table expectation.
    const meanHits = expectedClusterHitsForSize(rackSize);
    return p * meanHits * damage;
  }

  // Default single-shot.
  return p * damage;
}

/**
 * Standard deviation of damage for a single firing.
 *
 * Reasoning for the cluster formula: total damage D = Hit × ClusterHits
 * × damage, where Hit is Bernoulli(p) and ClusterHits is the cluster
 * distribution. Using the law of total variance:
 *
 *   Var(D) = damage² × ( p × Var(C) + p × (1-p) × E[C]² )
 *
 * The first term is the cluster variance conditional on a hit; the
 * second is the Bernoulli factor on the conditional mean. Streak +
 * single-shot reduce to the simple `sqrt(p(1-p)) × totalDamage` case.
 *
 * @spec § 4 (single-shot Bernoulli, cluster combined, clamps at p∈{0,1})
 */
export function damageVariance(
  weapon: IWeapon,
  hitProbability: number,
  options: IExpectedDamageOptions = {},
): number {
  const p = Math.max(0, Math.min(1, hitProbability));
  // Certain hit / certain miss → no variance.
  if (p === 0 || p === 1) return 0;

  if (isOneShot(weapon) && options.remainingShots === 0) return 0;
  if (
    weapon.ammoPerTon !== -1 &&
    options.remainingShots !== undefined &&
    options.remainingShots <= 0
  ) {
    return 0;
  }

  const damage = weapon.damage;
  const rackSize = resolveClusterSize(weapon);

  if (rackSize !== null && !isStreak(weapon)) {
    const meanHits = expectedClusterHitsForSize(rackSize);
    const varianceHits = clusterHitsVarianceForSize(rackSize);
    // Var(D) = damage² × (p × Var(C) + p × (1−p) × E[C]²)
    const variance =
      damage * damage * (p * varianceHits + p * (1 - p) * meanHits * meanHits);
    return Math.sqrt(Math.max(0, variance));
  }

  if (rackSize !== null && isStreak(weapon)) {
    // Streak: all-or-nothing → Bernoulli(p) × (rackSize × damage).
    const total = rackSize * damage;
    return Math.sqrt(p * (1 - p)) * total;
  }

  // Single-shot Bernoulli: stddev = sqrt(p(1-p)) × damage.
  return Math.sqrt(p * (1 - p)) * damage;
}

/**
 * Mean and stddev of the cluster-hit count alone (excluding the
 * Bernoulli hit factor). Useful when the UI wants to show "expected
 * missiles to land" alongside expected damage.
 *
 * For non-cluster weapons this returns `{mean: 1, stddev: 0}` — every
 * shot lands one "hit" by definition.
 */
export interface IClusterHitStats {
  readonly mean: number;
  readonly stddev: number;
}

export function clusterHitStats(weapon: IWeapon): IClusterHitStats {
  const rackSize = resolveClusterSize(weapon);
  if (rackSize === null || isStreak(weapon)) {
    if (isStreak(weapon) && rackSize !== null) {
      // Streak: all missiles hit on a lock — mean = rackSize, stddev = 0.
      return { mean: rackSize, stddev: 0 };
    }
    return { mean: 1, stddev: 0 };
  }
  const mean = expectedClusterHitsForSize(rackSize);
  const variance = clusterHitsVarianceForSize(rackSize);
  return { mean, stddev: Math.sqrt(variance) };
}
