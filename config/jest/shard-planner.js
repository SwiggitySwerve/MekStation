/* eslint-disable @typescript-eslint/no-require-imports -- Jest loads this file as CommonJS */
/**
 * Duration-weighted shard planning shared by the Jest sequencer
 * (duration-sequencer.js) and the durations updater
 * (scripts/jest/update-test-durations.mjs).
 *
 * Pure and deterministic: every shard process computes the same plan from the
 * same file list and the same committed durations, so the shards partition the
 * run with no gaps and no overlap without talking to each other.
 */
const fs = require('fs');
const path = require('path');

/** Weight (ms) for a file with no recorded duration, e.g. a brand-new test. */
const UNKNOWN_FILE_MS = 400;

const DEFAULT_DURATIONS_FILE = path.join(__dirname, 'test-durations.json');

/** Absolute test path -> repo-relative POSIX path (the durations file's keys). */
function toRepoPath(rootDir, absolutePath) {
  return path.relative(rootDir, absolutePath).split(path.sep).join('/');
}

/**
 * Read the committed { "<repo path>": <ms> } map. A missing or unreadable file
 * is not an error: with no durations every file weighs the same and the plan
 * degrades to an even split by count.
 */
function loadDurations(
  file = process.env.JEST_TEST_DURATIONS_FILE || DEFAULT_DURATIONS_FILE,
) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Work a CI job does besides its Jest shard, in the unit of the recorded durations
 * (committed ms), so the Jest share of the busiest job is smaller. Keyed
 * `<project>/<shardCount>`; a project and count with no entry get an even plan.
 *
 * `unit/3` follows the pr-checks.yml job layout: shards 1 and 2 also run a corpus
 * shard (about 71 s and 92 s on main, uncached) and shard 3 the Validate Combat Suite
 * (about 225 s), which made shard 3 the longest job (489 s against 339 s and 334 s).
 * Seconds became weight at 4,157 committed ms per second (the unit steps ran 231 s
 * for a planned 960,000 each). Re-measure these when the job layout changes.
 */
const SHARD_PRELOAD_MS = { 'unit/3': [295000, 380000, 935000] };

/** The preload for a project's shard plan, or undefined for an even plan. */
function preloadFor(displayName, shardCount) {
  const name =
    displayName && typeof displayName === 'object'
      ? displayName.name
      : displayName;
  const preload = SHARD_PRELOAD_MS[`${name}/${shardCount}`];
  return Array.isArray(preload) && preload.length === shardCount
    ? preload
    : undefined;
}

function weightOf(file, durations) {
  const ms = durations[file];
  return Number.isFinite(ms) && ms > 0 ? ms : UNKNOWN_FILE_MS;
}

/**
 * Longest-processing-time-first bin packing: heaviest file first, each onto
 * the currently lightest shard. Ties break on path then shard index so the
 * result never depends on input order.
 *
 * `preload` is each shard's work outside this plan (see SHARD_PRELOAD_MS): the shards
 * start at those loads, so `loads` includes them.
 *
 * @returns {{ shardOf: Map<string, number>, loads: number[] }} zero-based
 */
function planShards(files, durations, shardCount, preload) {
  if (!Number.isInteger(shardCount) || shardCount < 1) {
    throw new Error(`shardCount must be a positive integer, got ${shardCount}`);
  }
  const items = [...new Set(files)]
    .map((file) => ({ file, weight: weightOf(file, durations) }))
    .sort(
      (a, b) =>
        b.weight - a.weight || (a.file < b.file ? -1 : a.file > b.file ? 1 : 0),
    );
  const loads =
    preload && preload.length === shardCount
      ? [...preload]
      : new Array(shardCount).fill(0);
  const shardOf = new Map();
  for (const { file, weight } of items) {
    let target = 0;
    for (let i = 1; i < shardCount; i += 1) {
      if (loads[i] < loads[target]) target = i;
    }
    shardOf.set(file, target);
    loads[target] += weight;
  }
  return { shardOf, loads };
}

module.exports = {
  UNKNOWN_FILE_MS,
  DEFAULT_DURATIONS_FILE,
  toRepoPath,
  loadDurations,
  weightOf,
  planShards,
  preloadFor,
  SHARD_PRELOAD_MS,
};
