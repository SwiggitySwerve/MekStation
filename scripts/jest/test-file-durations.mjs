// Shared extraction for the scheduling seed updater and advisory CI reports.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { toRepoPath } = require('../../config/jest/shard-planner.js');

export function mergeFileDurations(target, incoming) {
  for (const [file, ms] of Object.entries(incoming))
    target[file] = Math.max(target[file] ?? 0, ms);
}

export function measureJestFiles(parsed, root) {
  if (!Array.isArray(parsed.testResults))
    throw new Error('no testResults array; is it a jest --json report?');
  const durations = {};
  let filesSeen = 0;
  for (const result of parsed.testResults) {
    const ms = result.endTime - result.startTime;
    if (!Number.isFinite(ms)) continue;
    filesSeen += 1;
    const file = toRepoPath(root, result.name);
    // Preserve the existing updater's slower-measurement and zero-clamp policy.
    mergeFileDurations(durations, { [file]: ms });
  }
  return { filesSeen, durations };
}
