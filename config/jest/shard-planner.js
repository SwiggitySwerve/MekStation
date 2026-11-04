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

function weightOf(file, durations) {
  const ms = durations[file];
  return Number.isFinite(ms) && ms > 0 ? ms : UNKNOWN_FILE_MS;
}

/**
 * Longest-processing-time-first bin packing: heaviest file first, each onto
 * the currently lightest shard. Ties break on path then shard index so the
 * result never depends on input order.
 *
 * @returns {{ shardOf: Map<string, number>, loads: number[] }} zero-based
 */
function planShards(files, durations, shardCount) {
  if (!Number.isInteger(shardCount) || shardCount < 1) {
    throw new Error(`shardCount must be a positive integer, got ${shardCount}`);
  }
  const items = [...new Set(files)]
    .map((file) => ({ file, weight: weightOf(file, durations) }))
    .sort(
      (a, b) =>
        b.weight - a.weight || (a.file < b.file ? -1 : a.file > b.file ? 1 : 0),
    );
  const loads = new Array(shardCount).fill(0);
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
};
