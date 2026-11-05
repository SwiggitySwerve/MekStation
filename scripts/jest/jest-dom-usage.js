#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- a CommonJS CLI */
/**
 * Which test files need `@testing-library/jest-dom`?
 *
 * jest.setup.js used to import jest-dom for every test file; that import is
 * about 0.11 s of the roughly 0.30 s an empty test file costs, and most test
 * files never call one of its matchers. A test file needs jest-dom when any
 * file in its import closure names a jest-dom matcher (or imports jest-dom
 * itself), so the answer is computed over the same static import closure the
 * result cache keys on (scripts/jest/cached-tests.js).
 *
 * `config/jest/no-jest-dom-tests.json` lists the test files whose closure has no
 * such reference; jest.setup.js skips jest-dom for exactly those. The default is
 * to LOAD it, so a new test file is never affected, and a listed file that grows
 * a jest-dom matcher fails loudly (`... is not a function`) and in the guard test
 * (scripts/__tests__/jest-dom-usage.test.ts), never silently.
 *
 *   node scripts/jest/jest-dom-usage.js            # print summary
 *   node scripts/jest/jest-dom-usage.js --write    # rewrite config/jest/no-jest-dom-tests.json
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { JEST_DOM_MATCHERS } = require('../../config/jest/jest-dom-skip.js');
const { buildFileIndex, createKeyer } = require('./cached-tests.js');

const ROOT = path.resolve(__dirname, '..', '..');
const LIST_FILE = path.join(ROOT, 'config', 'jest', 'no-jest-dom-tests.json');
const SETUP_ROOTS = new Set(['jest.setup.js', 'jest.setup.a11y.ts']);
const SOURCE = /\.(?:[cm]?[jt]sx?)$/;
const TEST_FILE = /\.(?:test|spec)\.(?:js|ts|tsx)$/;

// A reference to any matcher jest-dom registers (the list the setup stubs out)
// anywhere in a closure, or an import of jest-dom itself, keeps it loaded.
const USES_JEST_DOM = new RegExp(
  `\\b(?:${JEST_DOM_MATCHERS.join('|')})\\b|@testing-library/jest-dom`,
);

/** Test files (relative, posix) in the repo's own index, excluding a11y tests. */
function listTestFiles(index) {
  return [...index.keys()]
    .filter(
      (file) =>
        TEST_FILE.test(file) &&
        !/\.a11y\.test\./.test(file) &&
        /^(?:src|scripts|openspec)\//.test(file),
    )
    .sort();
}

/** @returns {{ free: string[], needs: Map<string, string> }} needs: file -> first closure file naming jest-dom */
function classify(root = ROOT) {
  const index = buildFileIndex(root);
  const keyer = createKeyer({ root, index, env: {} });
  const textOf = new Map();
  const mentions = (file) => {
    if (!textOf.has(file)) {
      let text = '';
      try {
        text = fs.readFileSync(path.join(root, file), 'utf8');
      } catch {
        // an unreadable file cannot be shown to be free of jest-dom
        text = '@testing-library/jest-dom';
      }
      textOf.set(file, USES_JEST_DOM.test(text));
    }
    return textOf.get(file);
  };
  const free = [];
  const needs = new Map();
  for (const test of listTestFiles(index)) {
    let result;
    try {
      result = keyer.keyFor(test);
    } catch {
      needs.set(test, '(closure could not be computed)');
      continue;
    }
    if (!result.closure) {
      needs.set(test, `(unkeyable: ${result.unkeyable})`);
      continue;
    }
    // The setup roots and config/jest/ (which names every matcher to stub it)
    // are in every closure; they say nothing about this test.
    const culprit = result.closure.find(
      (file) =>
        SOURCE.test(file) &&
        !SETUP_ROOTS.has(file) &&
        !file.startsWith('config/jest/') &&
        mentions(file),
    );
    if (culprit) needs.set(test, culprit);
    else free.push(test);
  }
  return { free, needs };
}

module.exports = { classify, listTestFiles, LIST_FILE, JEST_DOM_MATCHERS };

if (require.main === module) {
  const { free, needs } = classify();
  console.log(
    JSON.stringify({
      testFiles: free.length + needs.size,
      free: free.length,
      needsJestDom: needs.size,
    }),
  );
  if (process.argv.includes('--write')) {
    fs.writeFileSync(LIST_FILE, JSON.stringify(free, null, 2) + '\n');
    console.log(`wrote ${path.relative(ROOT, LIST_FILE)}`);
  }
}
