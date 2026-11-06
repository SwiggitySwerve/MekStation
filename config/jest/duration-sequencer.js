/* eslint-disable @typescript-eslint/no-require-imports -- Jest loads this file as CommonJS */
/**
 * Jest testSequencer: duration-weighted `--shard` plus longest-first ordering.
 *
 * Jest's default sharding hands each shard a slice of the path-sorted file
 * list, so a few multi-minute suites can land in one shard (unit shard 3 ran
 * 5.4 min while the lightest shard finished in under 3). This sequencer packs
 * files into shards by recorded duration (config/jest/test-durations.json,
 * refreshed with `npm run test:durations`), then runs each shard's slowest
 * files first so they overlap with the many small ones.
 *
 * Files missing from the durations file get a small default weight, so a new
 * test never breaks sharding; it is simply balanced approximately until the
 * next refresh.
 */
const Sequencer = require('@jest/test-sequencer').default;

const {
  loadDurations,
  planShards,
  preloadFor,
  toRepoPath,
  weightOf,
} = require('./shard-planner');

class DurationSequencer extends Sequencer {
  shard(tests, { shardIndex, shardCount }) {
    if (tests.length === 0) return [];
    const durations = loadDurations();
    const rootDir = tests[0].context.config.rootDir;
    const { shardOf } = planShards(
      tests.map((test) => toRepoPath(rootDir, test.path)),
      durations,
      shardCount,
      preloadFor(
        tests.map((test) => test.context.config.displayName),
        shardCount,
      ),
    );
    return tests.filter(
      (test) => shardOf.get(toRepoPath(rootDir, test.path)) === shardIndex - 1,
    );
  }

  async sort(tests) {
    // Keep Jest's own order (failed first, then cached runtime, then size) as
    // the tie-break, and put the recorded-slowest files at the front.
    const base = await super.sort(tests);
    if (base.length === 0) return base;
    const durations = loadDurations();
    const rootDir = base[0].context.config.rootDir;
    const rank = new Map(base.map((test, index) => [test, index]));
    const weight = (test) =>
      weightOf(toRepoPath(rootDir, test.path), durations);
    return [...base].sort(
      (a, b) => weight(b) - weight(a) || rank.get(a) - rank.get(b),
    );
  }
}

module.exports = DurationSequencer;
