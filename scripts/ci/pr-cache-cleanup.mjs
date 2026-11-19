#!/usr/bin/env node
// Delete a closed pull request's Actions caches (PR Cache Cleanup workflow).
// A PR's runs save caches under refs/pull/<n>/merge, which only that PR can
// read; once it closes they only push live caches toward the 10 GB cap.
// Only entries whose ref is exactly refs/pull/<n>/merge are deleted, even if
// the API's ref filter returned others, so main's caches are never touched.
// Usage: --repo <owner/name> --pr <number> [--dry-run]
// Needs GH_TOKEN with actions:write (unless dry).

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function prCacheRef(pr) {
  if (!/^[1-9]\d*$/.test(String(pr)))
    throw new Error(`Invalid pull request number: ${pr}`);
  return `refs/pull/${pr}/merge`;
}

function ghRequest(endpoint, { method = 'GET' } = {}) {
  const out = execFileSync('gh', ['api', endpoint, '--method', method], {
    encoding: 'utf8',
  });
  return out.trim() ? JSON.parse(out) : null;
}

/** Thin I/O runner; tests inject the gh transport and output. */
export async function cleanupPrCaches(
  { repo, pr, dryRun = false },
  { request = ghRequest, log = console.log, warn = console.warn } = {},
) {
  const ref = prCacheRef(pr);
  const listed = [];
  for (let page = 1; ; page++) {
    const response = await request(
      `repos/${repo}/actions/caches?ref=${encodeURIComponent(ref)}&per_page=100&page=${page}`,
    );
    const batch = response?.actions_caches;
    if (!Array.isArray(batch)) throw new Error('Invalid cache listing');
    listed.push(...batch);
    if (batch.length < 100) break;
  }
  const owned = listed.filter((cache) => cache.ref === ref);
  if (owned.length !== listed.length)
    warn(
      `Ignored ${listed.length - owned.length} listed cache(s) outside ${ref}.`,
    );
  let deleted = 0,
    bytes = 0,
    failed = 0;
  for (const cache of owned) {
    if (dryRun) {
      log(`Would delete cache ${cache.id} ${cache.key}`);
      continue;
    }
    try {
      await request(`repos/${repo}/actions/caches/${cache.id}`, {
        method: 'DELETE',
      });
      deleted++;
      bytes += cache.size_in_bytes ?? 0;
    } catch (error) {
      // Keep going: one failure (e.g. evicted meanwhile) must not keep the rest.
      failed++;
      warn(`Could not delete cache ${cache.id} ${cache.key}: ${error.message}`);
    }
  }
  log(
    `${ref}: ${dryRun ? 'found' : 'deleted'} ${dryRun ? owned.length : deleted} cache(s)` +
      `${dryRun ? '' : `, ${(bytes / 1e6).toFixed(1)} MB`}${failed ? `, ${failed} failed` : ''}.`,
  );
  return { ref, listed: listed.length, owned: owned.length, deleted, failed };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (name) => {
    const index = process.argv.indexOf(`--${name}`);
    return index === -1 ? undefined : process.argv[index + 1];
  };
  const repo = arg('repo'),
    pr = arg('pr');
  if (!repo || !pr) {
    console.error('usage: --repo <owner/name> --pr <number> [--dry-run]');
    process.exit(2);
  }
  try {
    const result = await cleanupPrCaches({
      repo,
      pr,
      dryRun: process.argv.includes('--dry-run'),
    });
    if (result.failed) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
