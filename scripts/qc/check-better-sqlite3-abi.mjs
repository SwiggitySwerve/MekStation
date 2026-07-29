#!/usr/bin/env node

import { createRequire } from 'node:module';

const BLOCKER_PREFIX = '[qc:better-sqlite3-abi]';

function fail(code, details, status = 1) {
  console.error(`${BLOCKER_PREFIX} ${code} ${details}`);
  process.exitCode = status;
}

function parseExpectedModules(argv) {
  if (argv.length === 0) return undefined;
  if (argv.length !== 1 || !argv[0].startsWith('--expect-modules=')) {
    throw new Error('expected only --expect-modules=<abi>');
  }

  const value = argv[0].slice('--expect-modules='.length);
  if (!/^\d+$/.test(value)) {
    throw new Error('--expect-modules must be a non-negative integer');
  }
  return value;
}

let expectedModules;
try {
  expectedModules = parseExpectedModules(process.argv.slice(2));
} catch (error) {
  fail(
    'INVALID_ARGUMENT',
    error instanceof Error ? error.message : String(error),
    2,
  );
}

const actualModules = process.versions.modules;
if (
  process.exitCode === undefined &&
  expectedModules !== undefined &&
  expectedModules !== actualModules
) {
  fail(
    'ABI_MISMATCH',
    `expected=${expectedModules} actual=${actualModules ?? 'unavailable'}`,
  );
}

if (process.exitCode === undefined) {
  const require = createRequire(import.meta.url);
  let database;
  let betterSqlite3Version;

  try {
    const Database = require('better-sqlite3');
    betterSqlite3Version = require('better-sqlite3/package.json').version;
    database = new Database(':memory:');
  } catch (error) {
    fail(
      'NATIVE_LOAD_FAILED',
      error instanceof Error ? error.message : String(error),
    );
  }

  if (process.exitCode === undefined) {
    try {
      const row = database.prepare('SELECT sqlite_version() AS version').get();
      if (!row || typeof row.version !== 'string') {
        throw new Error('sqlite_version() did not return a version string');
      }

      console.log(
        JSON.stringify({
          node: process.version,
          modules: actualModules,
          napi: process.versions.napi,
          platform: process.platform,
          arch: process.arch,
          betterSqlite3: betterSqlite3Version,
          sqlite: row.version,
        }),
      );
    } catch (error) {
      fail(
        'SQLITE_QUERY_FAILED',
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      database?.close();
    }
  }
}
