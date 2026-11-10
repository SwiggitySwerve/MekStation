#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- a CommonJS CLI */
/**
 * Per-test-file result cache for Jest (`npm run test:cached`), after T3 Code's
 * `test:cached`: skip a test file when an earlier run already passed with the
 * same inputs, re-run a sample of those skips to prove the cache is honest, and
 * run everything whenever there is any doubt.
 *
 * KEY. A file's key hashes (all through git blob ids, so it costs no reads):
 *   - the file and its static import closure (relative, `@/` and in-repo
 *     bare imports; jest.mock/requireActual targets; its __snapshots__ file;
 *     the Jest setup files). Type-only edges are not followed, because
 *     @swc/jest erases them without loading the module: `import type`,
 *     `export type {...} from` and the `import('x')` type, as @swc/core's AST
 *     classifies them (not by text), and only when no other occurrence of the
 *     same specifier exists in the file. Everything else still counts: a mixed
 *     `import { type A, b }`, an `import { type A }` with no value part, every
 *     import() in an expression, a mention in a string or comment. Without
 *     @swc/core, or if a file does not parse, nothing is dropped,
 *   - the "data inputs" it can read: if any closure file uses fs read APIs,
 *     the digest of every repo directory the closure names (public/data/,
 *     openspec/, docs/, ...), or of the WHOLE repo when it names none; a file
 *     using __dirname adds its own directory, widened to the ancestor reached by
 *     the `..` segments in the file,
 *   - the whole repo when the closure spawns child processes or has a dynamic
 *     require/import or an unresolvable relative import,
 *   - the env vars it reads: process.env.NAME; process.env[X] where X is a
 *     single-binding same-file `const X = 'NAME'` (optionally `as const`); or
 *     process.env[param] inside a non-exported helper `readEnv(param)` that is
 *     only ever called, in the same file, with string literals. Plus NODE_ENV, TZ,
 *     JEST_*,
 *   - package*.json, tsconfig.json, jest.config.js, config/jest/, .env*,
 *     every __mocks__ file, the full Node version and platform,
 *   - the selected projects and the Jest options that are keyed (--ci), in the
 *     order given. Only --ci and a few neutral options (--maxWorkers=N,
 *     --cacheDirectory=..., --json, --outputFile=..., --silent, --coverage, ...)
 *     may be passed through; any other option puts the run in 'off' mode.
 * Files ignored by git (.env.local, fetched or generated data) are hashed too,
 * except build output, dependency directories and the files a test run itself
 * writes (GENERATED_OUTPUTS: data/, __pycache__, ...); a symlink inside a data
 * domain makes the file unkeyable.
 *
 * FAIL OPEN. An exception while keying, a bare `process.env`, a computed
 * process.env[...] whose name is not a lone string literal or a single-binding
 * same-file string const, an unreadable cache: the file runs. Every existing
 * resolution candidate (.js and .ts) of an import joins the closure. Reads that
 * the scan cannot see (a path built from a variable in a closure that also names
 * a directory) are the one residual gap; --verify-hits and the always-uncached
 * main/nightly runs are the backstops for it.
 *
 * MODES. `use` (PR default) skips hits. `record` runs every file and still
 * records passes; it is forced on main pushes, scheduled runs and --coverage,
 * so main/nightly are always uncached and keep the cache seeded. `off` (any
 * pass-through option that can change a result or pull in extra files, such as
 * --testTimeout or --setupFilesAfterEnv) runs everything and neither reads nor
 * writes the cache. Passes are recorded only from a jest run that exited 0.
 *
 *   node scripts/jest/cached-tests.js [--project unit]... [--shard 2/6]
 *     [--verify-hits 3] [--cache-dir .jest-result-cache] [--uncached]
 *     [--filter <regex on repo path>] [--report file.json]
 *     [-- extra --flag=value jest options]
 */
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const KEY_VERSION = 1;
const SOURCE_EXTENSIONS = /\.(?:[cm]?[jt]sx?)$/;
const RESOLVE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
];
const SETUP_ROOTS = ['jest.setup.js', 'jest.setup.a11y.ts'];
const GLOBAL_FILES = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'jest.config.js',
  'next.config.ts',
];
const GLOBAL_PREFIXES = ['config/jest/'];
// Written by createStore into every result-store directory.
const STORE_MARKER = '.cached-tests-store';
const FIXED_ENV = ['NODE_ENV', 'TZ'];
// Ignored directories (any path segment) that are build output, dependencies or
// tool state: never test inputs, and large. Every other ignored file is hashed.
const IGNORED_NOISE_SEGMENTS = new Set([
  'node_modules',
  '.next',
  'coverage',
  '.jest-result-cache',
  'playwright-report',
  'test-results',
  'storybook-static',
  'dist',
  'out',
  'release',
  '.claude',
]);
// Jest options. Only these can be passed through with the cache on:
//  - KEYED ones change results (--ci changes missing-snapshot behaviour); they
//    go into the key in the order given;
//  - NEUTRAL ones cannot change what a test file reports.
// Any other option (--testTimeout, -t, --setupFilesAfterEnv=..., --injectGlobals,
// ...) can change a result through inputs the key cannot follow (extra files,
// order-sensitive flags), so a run that passes one is not cached at all.
const KEYED_JEST_OPTIONS = /^--ci$/;
const NEUTRAL_JEST_OPTIONS =
  /^(?:--coverage(?:=true)?|--no-coverage|--silent|--verbose|--runInBand|-i|--colors|--no-colors|--maxWorkers=\d+|--cacheDirectory=.*|--json|--outputFile=.*)$/;
const isUnsupportedJestOption = (arg) =>
  !KEYED_JEST_OPTIONS.test(arg) && !NEUTRAL_JEST_OPTIONS.test(arg);
// Source files whose fs reads are known not to touch repo inputs, so they do
// not force a whole-repo key. Add to this list only with the reason.
const HERMETIC_FS_READERS = new Set([
  // reads E2E fault sentinels from the runtime-created data/.e2e-fault dir
  'src/lib/multiplayer/server/DurableMatchStore.ts',
  // False positive, not a hermetic reader: FS_READ matches
  // `IElectronAPI.readFile`, an interface method declaration. The module
  // imports only react and performs no filesystem read.
  'src/components/settings/useElectron.ts',
]);

// Git-ignored files that a test run writes into the tree: the app's SQLite database
// and E2E sentinels (`data/`), the equipment validation report, Python bytecode, and
// scenario-pack recapture output. Outputs, never inputs: see buildFileIndex.
const GENERATED_OUTPUTS = [
  /^data\//,
  /^equipment-validation-report\.json$/,
  /(?:^|\/)__pycache__\//,
  /^\.sisyphus\/scenario-pack-recapture\//,
  /\.tsbuildinfo$/, // `npm run typecheck` is incremental and writes tsconfig.tsbuildinfo
];

const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const toPosix = (p) => p.split(path.sep).join('/');
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------------------------------------------------------------------------
// Repo file index: repo path -> content digest
// ---------------------------------------------------------------------------

function hashFile(root, rel) {
  try {
    return sha(fs.readFileSync(path.join(root, rel)));
  } catch {
    return null;
  }
}

function walk(root, dir, out) {
  for (const entry of fs.readdirSync(path.join(root, dir), {
    withFileTypes: true,
  })) {
    if (['node_modules', '.git', '.next'].includes(entry.name)) continue;
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) out.symlinks.add(rel);
    else if (entry.isDirectory()) walk(root, rel, out);
    else if (entry.isFile()) out.set(rel, hashFile(root, rel));
  }
}

/** Record `rel` as a symlink when it is one (its target is not followed or keyed). */
function noteSymlink(root, rel, index) {
  try {
    if (fs.lstatSync(path.join(root, rel)).isSymbolicLink())
      index.symlinks.add(rel);
  } catch {
    // vanished between listing and lstat: nothing to note
  }
}

/** git blob ids for tracked files (no reads), content hashes for dirty ones. */
function buildFileIndex(root, excludePrefix = null) {
  const index = new Map();
  // Symlinks are inputs whose targets this index does not follow; a key whose
  // data domain contains one is refused (see keyFor).
  index.symlinks = new Set();
  const tracked = new Set();
  let gitKnown = true;
  try {
    const git = (args) =>
      execFileSync('git', args, {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    for (const row of git(['ls-files', '-s', '-z']).split('\0')) {
      const match = /^(\d+) ([0-9a-f]+) \d+\t([\s\S]*)$/.exec(row);
      if (!match) continue;
      index.set(match[3], `git:${match[2]}`);
      tracked.add(match[3]);
      if (match[1] === '120000') index.symlinks.add(match[3]);
    }
    // modified, deleted and untracked-but-not-ignored files
    for (const rel of git([
      'ls-files',
      '-m',
      '-o',
      '--exclude-standard',
      '-z',
    ]).split('\0')) {
      if (!rel) continue;
      noteSymlink(root, rel, index);
      const digest = hashFile(root, rel);
      if (digest) index.set(rel, digest);
      else index.delete(rel);
    }
    // Ignored files are still inputs (.env.local, fetched or generated data).
    // Hash their contents too, except directories that are build output or
    // dependencies and are never test data.
    for (const entry of git([
      'ls-files',
      '-o',
      '-i',
      '--exclude-standard',
      '--directory',
      '-z',
    ]).split('\0')) {
      if (!entry) continue;
      if (!entry.endsWith('/')) {
        noteSymlink(root, entry, index);
        const digest = hashFile(root, entry);
        if (digest) index.set(entry, digest);
      } else if (
        !entry.split('/').some((segment) => IGNORED_NOISE_SEGMENTS.has(segment))
      ) {
        walk(root, entry.replace(/\/$/, ''), index);
      }
    }
    if (index.size === 0) throw new Error('empty git index');
  } catch {
    index.clear();
    index.symlinks.clear();
    tracked.clear();
    gitKnown = false;
    walk(root, '', index);
  }
  // Files a test run (or the app it starts) writes into the tree are outputs, not
  // inputs, and a fresh checkout, which CI keys, has none: left in, every local run
  // changed the next run's keys. Tracked files stay, edited or not (the repo tracks a
  // few .pyc files), and so does anything that could not be read (null digest). Without
  // git, tracking is unknown, so nothing is dropped.
  if (gitKnown) {
    for (const file of [...index.keys()]) {
      if (!tracked.has(file) && GENERATED_OUTPUTS.some((p) => p.test(file)))
        index.delete(file);
    }
  }
  // Result caches live in the tree and must never feed keys: this
  // invocation's own (`excludePrefix`) and any other store, which createStore
  // marks with STORE_MARKER (CI runs the unit and corpus invocations, each
  // with its own --cache-dir, in one checkout).
  const excluded = excludePrefix ? [excludePrefix] : [];
  for (const file of index.keys()) {
    const slash = file.lastIndexOf('/');
    if (slash > 0 && file.slice(slash + 1) === STORE_MARKER)
      excluded.push(file.slice(0, slash + 1));
  }
  if (excluded.length > 0) {
    for (const file of [...index.keys()])
      if (excluded.some((prefix) => file.startsWith(prefix)))
        index.delete(file);
  }
  return index;
}

function createDigests(index) {
  const sorted = [...index.entries()].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  const memo = new Map();
  return {
    /** digest of every file whose repo path starts with `prefix` ('' = whole repo). */
    prefix(prefix) {
      if (!memo.has(prefix)) {
        const hash = crypto.createHash('sha256');
        for (const [file, digest] of sorted) {
          if (file.startsWith(prefix)) hash.update(`${file}\0${digest}\n`);
        }
        memo.set(prefix, hash.digest('hex'));
      }
      return memo.get(prefix);
    },
    sorted,
  };
}

// ---------------------------------------------------------------------------
// Static analysis of one source file
// ---------------------------------------------------------------------------

const IMPORT_PATTERNS = [
  // any `from '<spec>'` (import/export ... from), whatever sits before it, so a
  // comment with parentheses inside the braces cannot hide the import
  /\bfrom\s*['"]([^'"\n]+)['"]/g,
  /\bimport\s*['"]([^'"\n]+)['"]/g,
  /\b(?:import|require(?:\.resolve)?|jest\.(?:mock|doMock|unmock|dontMock|requireActual|requireMock|createMockFromModule|setMock))\s*\(\s*['"]([^'"\n]+)['"]/g,
];
// Type-only edges. Jest runs @swc/jest, which erases `import type`, `export type
// ... from` and the `import('x')` TYPE (TsImportType) without loading the module,
// so they cannot change a test result (Static Checks still type-checks every PR).
// Which occurrences are type-only is decided by the same parser, not by text:
// @swc/core's AST. A specifier is dropped from a file's dependencies only when
// (a) the string literal equal to it occurs nowhere in the AST except as the
// module string of those type-only nodes, so no loader call of any shape (`jest.
// requireActual<T>('x')`, `new URL('x', ...)`, `jest.mock(`x`)`, a plain
// `require('x')`) can refer to it, and (b) every import-like occurrence of it in
// the text (IMPORT_PATTERNS, over the raw text and the comment-stripped
// variants) is one of those nodes. A value import, a mixed `import { type A, b
// }`, an `import { type A }` with no value part, a dynamic import() in an
// expression (`void import('x').Foo`, `{ k: typeof import('x') }`), a mention in
// a string or comment, and a second import of the same module all leave the
// specifier in. A module may also be loaded under another spelling than its
// type edge (`jest.requireActual<typeof import('@/x')>('./x')`), so in a parsed
// file every string literal passed to any call or `new` is resolved as an extra
// dependency (extraSpecs), and a loader whose argument is not a literal keeps
// every type-only edge of the file. If @swc/core is missing, the file does not
// parse, or the walk throws, nothing is dropped.
let swcParseSync; // undefined: not tried yet; null: unavailable
// Files worth parsing: type-only syntax, an import(), or a loader called with
// type arguments (`jest.requireActual<T>('x')`), which IMPORT_PATTERNS cannot see.
const TYPE_CANDIDATE =
  /\b(?:import|export)\s+type\b|\bimport\s*\(|\b(?:require(?:\.resolve)?|jest\s*\.\s*\w+)\s*</;
const JEST_LOADERS = new Set([
  'mock',
  'doMock',
  'unmock',
  'dontMock',
  'requireActual',
  'requireMock',
  'createMockFromModule',
  'setMock',
]);
/**
 * Is `callee` a direct loader: `require`, `require.resolve`, `jest.<loader>`,
 * `<anything>.require` (`module.require`) or `import`?
 */
function isLoaderCallee(callee, nameOf) {
  if (callee?.type === 'Import') return true;
  if (callee?.type === 'Identifier') return callee.value === 'require';
  if (callee?.type !== 'MemberExpression') return false;
  const name = nameOf(callee);
  if (name === 'require') return true;
  if (callee.object?.type !== 'Identifier') return false;
  return callee.object.value === 'require'
    ? name === 'resolve'
    : callee.object.value === 'jest' && JEST_LOADERS.has(name);
}
// Names through which code can reach a loader without calling it directly:
// `const load = require`, `[...].map(require)`, `createRequire(url)(p)`, `eval`,
// `const { requireActual } = jest`. Any reference outside a recognised direct
// call keeps every type-only edge of the file (see looseLoader).
const LOADER_NAMES = new Set(['require', 'createRequire', 'eval', 'jest']);
// Ts* nodes that carry a runtime expression; every other Ts* node is only a type.
const TS_VALUE_NODES = new Set([
  'TsAsExpression',
  'TsNonNullExpression',
  'TsTypeAssertion',
  'TsSatisfiesExpression',
  'TsConstAssertion',
  'TsInstantiation',
  'TsParameterProperty',
  'TsEnumDeclaration',
  'TsEnumMember',
  'TsModuleDeclaration',
  'TsModuleBlock',
  'TsNamespaceDeclaration',
  'TsImportEqualsDeclaration',
  'TsExportAssignment',
  'TsExternalModuleReference',
]);

/**
 * For `text` (or null when it is not parsed): `counts` maps a specifier to its
 * number of type-only AST occurrences; `literals` maps every string literal
 * value in the file to how often it occurs, in any position; `callLiterals` is
 * every string literal passed as an argument to any call or `new`, whatever the
 * callee (these join the closure as extra dependencies); `looseLoader` says a
 * loader may be reached in a way this scan cannot follow: a direct loader call
 * whose argument is not a plain literal, or a reference to `require`,
 * `createRequire`, `eval` or `jest` that is not a recognised direct call
 * (outside type positions).
 */
function typeOnlySpecCounts(text) {
  if (!TYPE_CANDIDATE.test(text)) return null;
  if (swcParseSync === undefined) {
    try {
      swcParseSync = require('@swc/core').parseSync;
    } catch {
      swcParseSync = null;
    }
  }
  if (!swcParseSync) return null;
  let ast;
  try {
    ast = swcParseSync(text, {
      syntax: 'typescript',
      tsx: true,
      decorators: false,
    });
  } catch {
    return null;
  }
  const counts = new Map();
  const literals = new Map(); // every string (or plain template) literal, anywhere
  const callLiterals = new Set();
  const recognised = new Set(); // identifier nodes that are a direct, understood use
  let looseLoader = false;
  const bump = (map, value) => map.set(value, (map.get(value) ?? 0) + 1);
  const add = (literal) => {
    if (literal && typeof literal.value === 'string')
      bump(counts, literal.value);
  };
  /** The value of a string literal or an expression-less template, else undefined. */
  const literalValue = (expr) =>
    expr?.type === 'StringLiteral' && typeof expr.value === 'string'
      ? expr.value
      : expr?.type === 'TemplateLiteral' &&
          expr.expressions?.length === 0 &&
          expr.quasis?.length === 1
        ? (expr.quasis[0].cooked ?? expr.quasis[0].raw)
        : undefined;
  /** `x.name` or `x['name']`: the member's name when it is a plain identifier or literal. */
  const memberName = (member) =>
    member.property?.type === 'Identifier'
      ? member.property.value
      : member.property?.type === 'Computed'
        ? literalValue(member.property.expression)
        : undefined;
  const directMembers = new Set(); // `x.require('literal')` callee nodes
  const visit = (node, inType) => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item, inType);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const type =
      inType ||
      (typeof node.type === 'string' &&
        node.type.startsWith('Ts') &&
        !TS_VALUE_NODES.has(node.type));
    const own = literalValue(node);
    if (own !== undefined) bump(literals, own);
    if (node.type === 'CallExpression' || node.type === 'NewExpression') {
      const args = (node.arguments ?? []).map((arg) => arg.expression);
      for (const arg of args) {
        const value = literalValue(arg);
        if (value !== undefined) callLiterals.add(value);
      }
      if (
        node.type === 'CallExpression' &&
        isLoaderCallee(node.callee, memberName) &&
        literalValue(args[0]) === undefined
      )
        looseLoader = true;
      const callee = node.callee;
      if (node.type === 'CallExpression') {
        if (
          callee?.type === 'MemberExpression' &&
          memberName(callee) === 'require' &&
          literalValue(args[0]) !== undefined
        )
          directMembers.add(callee);
        if (callee?.type === 'Identifier' && callee.value === 'require')
          recognised.add(callee);
        if (
          callee?.type === 'MemberExpression' &&
          callee.object?.type === 'Identifier' &&
          callee.property?.type === 'Identifier' &&
          ((callee.object.value === 'require' &&
            callee.property.value === 'resolve') ||
            (callee.object.value === 'jest' &&
              JEST_LOADERS.has(callee.property.value)))
        )
          recognised.add(callee.object);
      }
    }
    if (node.type === 'MemberExpression' && !type) {
      // `module.require.bind(module)`, `module['require'](p)`, `globalThis.require`:
      // a `require` member is a loader unless it is called with a literal path
      const name = memberName(node);
      if (name === 'createRequire') looseLoader = true;
      if (name === 'require' && !directMembers.has(node)) looseLoader = true;
    }
    if (
      node.type === 'MemberExpression' &&
      node.property?.type === 'Identifier'
    ) {
      recognised.add(node.property); // a property name, not a reference
      // jest.fn, jest.spyOn, ...: not a loader
      if (
        node.object?.type === 'Identifier' &&
        node.object.value === 'jest' &&
        !JEST_LOADERS.has(node.property.value)
      )
        recognised.add(node.object);
    }
    if (
      node.type === 'Identifier' &&
      !type &&
      LOADER_NAMES.has(node.value) &&
      !recognised.has(node)
    )
      looseLoader = true;
    switch (node.type) {
      case 'ImportDeclaration':
      case 'ExportAllDeclaration':
      case 'ExportNamedDeclaration':
        if (node.typeOnly) add(node.source);
        break;
      case 'TsImportEqualsDeclaration':
        if (
          node.isTypeOnly &&
          node.moduleRef?.type === 'TsExternalModuleReference'
        )
          add(node.moduleRef.expression);
        break;
      case 'TsImportType':
        add(node.argument);
        break;
    }
    for (const value of Object.values(node)) visit(value, type);
  };
  try {
    visit(ast, false);
  } catch {
    return null; // e.g. a RangeError on a pathologically deep tree: drop nothing
  }
  return { counts, literals, callLiterals, looseLoader };
}

/** Textual import-like occurrences of each specifier in `source`. */
function countSpecs(source) {
  const counts = new Map();
  for (const pattern of IMPORT_PATTERNS) {
    for (const match of source.matchAll(pattern))
      counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  }
  return counts;
}
// A require()/import() whose argument is not a string literal. Not preceded by
// `.` (method call) and not a typed parameter (`import(content: string)` is an
// interface method, not a load).
const DYNAMIC_LOAD = /(?<![.\w$])(?:require|import)\s*\(\s*(?!['"]|\w+\s*[:?])/;
// Comments hold example imports and prose like "legacy import (task 1.3)";
// neither may taint a file. Only comments that START a line are stripped, so
// a `/*` inside a string literal on a code line cannot hide real code. The
// specs found in raw text still join the closure either way.
const stripComments = (text) =>
  text.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, '').replace(/^[ \t]*\/\/.*$/gm, '');
// Content reads: with no named directory in the closure these force a
// whole-repo key. Existence checks (existsSync & co) only add named
// directories when present; a bare existsSync(dir) is how code guards a
// directory it is about to create, not a data input.
const FS_READ =
  /\b(?:readFile|readFileSync|readdir|readdirSync|createReadStream|opendir|opendirSync|globSync)\b/;
const FS_EXISTS = /\b(?:statSync|lstatSync|existsSync|accessSync)\b/;
const CHILD_PROCESS = /child_process|\b(?:execSync|execFileSync|spawnSync)\b/;
const OWN_DIR = /\b(?:__dirname|__filename)\b/;
const ENV_DOT = /process\.env\??\.([A-Za-z_][A-Za-z0-9_]*)/g;
const ENV_BRACKET_OPEN = /process\.env(?:\?\.)?\[/g;
const ENV_BARE = /process\.env(?![.\[\w?])/;
// `..` as a path segment, in a quoted or template-literal string
const PARENT_SEGMENT = /\.\.(?=[\/\\'"`])/g;

/** Text between the `[` that ends at `open` and its matching `]`, or null. */
function bracketContent(code, open) {
  let depth = 1;
  for (let i = open; i < code.length; i += 1) {
    const ch = code[i];
    if (ch === '[') depth += 1;
    else if (ch === ']' && --depth === 0) return code.slice(open, i);
  }
  return null;
}

/**
 * The string a `const <id> = '<literal>'` binds, only when that is the single
 * binding of <id> in the file (no let/var/function/class/import of the same
 * name) and the literal is the whole initializer (`'a' + 'b'` is refused).
 * Shadowing by a function parameter is not detected.
 */
function resolveStringConst(code, id) {
  const esc = escapeRegex(id);
  const bindings =
    code.match(
      new RegExp(`\\b(?:const|let|var|function|class)\\s+${esc}\\b`, 'g'),
    ) || [];
  const imported = new RegExp(
    `\\bimport\\b[^;]*?\\b${esc}\\b[^;]*?\\bfrom\\b`,
  ).test(code);
  if (bindings.length !== 1 || imported) return null;
  const decl = new RegExp(
    `\\bconst\\s+${esc}\\s*(?::[^=;]+)?=\\s*(['"])([^'"\\\\\\n]*)\\1\\s*(?:as\\s+const\\s*)?(?=[;\\n,)}]|$)`,
  ).exec(code);
  return decl ? decl[2] : null;
}

/** Index of the bracket that closes the one at `open` (naive depth count), or -1. */
function matchingClose(code, open) {
  const opener = code[open];
  const closer = { '(': ')', '{': '}' }[opener];
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === opener) depth += 1;
    else if (code[i] === closer && --depth === 0) return i;
  }
  return -1;
}

// A simple TypeScript type annotation: `string`, `string | undefined`, `Foo<Bar>[]`.
const SIMPLE_TYPE = String.raw`[A-Za-z_$][\w$.<>\[\]| ]*`;

/**
 * Every function in `code` shaped `function H(param...) {...}`,
 * `const H = (param...) => ...` or `const H = function (param...) {...}` whose
 * FIRST parameter is exactly the plain identifier `param` (no default, rest or
 * destructuring), with the source range of its body.
 */
function helpersTakingParam(code, param) {
  const found = [];
  const declaration =
    /(?:\bfunction\s+([A-Za-z_$][\w$]*)\s*|\bconst\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:async\s+)?(function\s*)?)\(/g;
  const firstParam = new RegExp(
    `^\\s*${escapeRegex(param)}\\s*\\??\\s*(?::\\s*${SIMPLE_TYPE})?\\s*(?:,|$)`,
  );
  const typed = `^\\s*(?::\\s*${SIMPLE_TYPE})?\\s*`;
  for (const match of code.matchAll(declaration)) {
    const open = match.index + match[0].length - 1;
    const close = matchingClose(code, open);
    if (close < 0 || !firstParam.test(code.slice(open + 1, close))) continue;
    const afterParams = code.slice(close + 1);
    const block = new RegExp(`${typed}\\{`).exec(afterParams);
    const arrow = new RegExp(`${typed}=>\\s*`).exec(afterParams);
    let bodyStart;
    let bodyEnd;
    if (block && (match[1] || match[3])) {
      // function declaration, or `const H = function (...) {`
      bodyStart = close + 1 + block[0].length - 1;
      bodyEnd = matchingClose(code, bodyStart);
    } else if (arrow && match[2] && !match[3]) {
      bodyStart = close + 1 + arrow[0].length;
      if (code[bodyStart] === '{') {
        bodyEnd = matchingClose(code, bodyStart);
      } else {
        // expression body: up to the end of the statement on that line
        const stop = code.slice(bodyStart).search(/[;\n]/);
        bodyEnd = stop < 0 ? code.length : bodyStart + stop;
      }
    } else continue;
    if (bodyEnd < 0) continue;
    const name = match[1] ?? match[2];
    found.push({
      name,
      nameAt: match.index + match[0].indexOf(name),
      bodyStart,
      bodyEnd,
    });
  }
  return found;
}

/**
 * The names a small env-reading helper is called with: the read
 * `process.env[param]` at `accessIndex` must sit inside the BODY of
 * `function readEnv(param) {...}` (or `const readEnv = (param) => ...`), and is
 * resolved to the string literals of every `readEnv('LITERAL')` call in the same
 * file. Everything else is refused (null), because another file, another
 * function, a rewritten parameter or a non-literal argument could name a
 * variable this scan cannot see:
 *  - the read must be inside that helper's body (a later method or closure with
 *    its own `param` is a different read and stays unkeyable);
 *  - `param` must occur exactly once in the body, as that read's key (so no
 *    reassignment, destructuring, shadowing or other use of the parameter);
 *  - the helper has a single binding and is not exported;
 *  - every other mention of the helper is a call whose first argument is a lone
 *    string literal (passing it as a value, aliasing it, `readEnv(x)` refuse).
 */
function resolveAccessorLiterals(code, param, accessIndex) {
  const owner = helpersTakingParam(code, param).find(
    (candidate) =>
      accessIndex >= candidate.bodyStart && accessIndex < candidate.bodyEnd,
  );
  if (!owner) return null;
  const body = code.slice(owner.bodyStart, owner.bodyEnd);
  const uses = body.match(new RegExp(`\\b${escapeRegex(param)}\\b`, 'g')) || [];
  if (uses.length !== 1) return null;
  const h = escapeRegex(owner.name);
  const exported =
    new RegExp(
      `\\bexport\\s+(?:default\\s+)?(?:async\\s+)?(?:function|const|let|var)\\s+${h}\\b`,
    ).test(code) ||
    new RegExp(`\\bexport\\s+default\\s+${h}\\b`).test(code) ||
    new RegExp(`\\bexport\\s*\\{[^}]*\\b${h}\\b`).test(code);
  const bindings =
    code.match(
      new RegExp(`\\b(?:const|let|var|function|class)\\s+${h}\\b`, 'g'),
    ) || [];
  if (exported || bindings.length !== 1) return null;
  const names = [];
  const call = new RegExp(`^${h}\\s*\\(\\s*(['"])([^'"\\\\\\n]+)\\1\\s*[,)]`);
  for (const mention of code.matchAll(new RegExp(`\\b${h}\\b`, 'g'))) {
    if (mention.index === owner.nameAt) continue;
    const literal = call.exec(code.slice(mention.index));
    if (!literal) return null;
    names.push(literal[2]);
  }
  return names;
}

/** One matcher per repo top-level name: [regex, prefix to digest]. */
function buildNameMatchers(index) {
  const names = new Map(); // name -> isDirectory
  for (const file of index.keys()) {
    const slash = file.indexOf('/');
    if (slash === -1) names.set(file, names.get(file) ?? false);
    else names.set(file.slice(0, slash), true);
  }
  return [...names].map(([name, isDir]) => [
    new RegExp(`(?:['"\`]|[\\\\/])${escapeRegex(name)}(?:['"\`]|[\\\\/])`),
    isDir ? `${name}/` : name,
  ]);
}

function analyzeSource(text, rel, nameMatchers) {
  const specs = new Set();
  // raw text and text with every block comment removed: the union can only add
  // specs, so neither a comment nor over-stripping can hide an import
  const noBlocks = text.replace(/\/\*[\s\S]*?\*\//g, ' ');
  // ... and with line comments removed too, so `from // note \n './dep'` is seen
  const noComments = noBlocks.replace(/\/\/[^\n]*/g, ' ');
  for (const source of [text, noBlocks, noComments]) {
    for (const pattern of IMPORT_PATTERNS) {
      for (const match of source.matchAll(pattern)) specs.add(match[1]);
    }
  }
  const codeSpecs = new Set();
  const code = stripComments(text);
  for (const pattern of IMPORT_PATTERNS) {
    for (const match of code.matchAll(pattern)) codeSpecs.add(match[1]);
  }
  // Type-only edges are not dependencies (see typeOnlySpecCounts): drop a
  // specifier only when the AST accounts for every textual occurrence of it.
  const typeOnly = typeOnlySpecCounts(text);
  // A loader this scan cannot follow (computed argument, or require / jest
  // used as a value) may load anything, including a module named only in a
  // type: keep every type-only edge of such a file.
  if (typeOnly && !typeOnly.looseLoader) {
    const seen = [text, noBlocks, noComments].map(countSpecs);
    for (const [spec, nodes] of typeOnly.counts) {
      if (
        typeOnly.literals.get(spec) === nodes &&
        seen[0].get(spec) === nodes &&
        seen.every((counts) => (counts.get(spec) ?? 0) <= nodes)
      ) {
        specs.delete(spec);
        codeSpecs.delete(spec);
      }
    }
  }
  const envNames = new Set();
  for (const match of text.matchAll(ENV_DOT)) envNames.add(match[1]);
  const usesFs = FS_READ.test(code);
  const tokens = new Set();
  if (usesFs || FS_EXISTS.test(code)) {
    for (const [matcher, prefix] of nameMatchers) {
      if (matcher.test(text)) tokens.add(prefix);
    }
    if (OWN_DIR.test(code)) {
      // A path built from __dirname can climb out of the directory: widen to the
      // ancestor reached by the file's `..` segments ('' = the whole repo).
      const up = (code.match(PARENT_SEGMENT) || []).length;
      const parts = path.posix
        .dirname(rel)
        .split('/')
        .filter((p) => p !== '.');
      const kept = parts.slice(0, Math.max(0, parts.length - up));
      tokens.add(kept.length === 0 ? '' : `${kept.join('/')}/`);
    }
  }
  // Every process.env[<expr>] read must name its variable unambiguously: a lone
  // string literal, or an identifier bound once to a lone string literal.
  let envUnresolved = false;
  for (const match of code.matchAll(ENV_BRACKET_OPEN)) {
    const arg = (
      bracketContent(code, match.index + match[0].length) ?? ''
    ).trim();
    const literal = /^(['"])([^'"\\\n]+)\1$/.exec(arg);
    const identifier = /^[A-Za-z_$][\w$]*$/.test(arg);
    const name = literal
      ? literal[2]
      : identifier
        ? resolveStringConst(code, arg)
        : null;
    const viaHelper =
      !name && identifier
        ? resolveAccessorLiterals(code, arg, match.index)
        : null;
    if (name) envNames.add(name);
    else if (viaHelper) viaHelper.forEach((helped) => envNames.add(helped));
    else envUnresolved = true;
  }
  return {
    specs: [...specs],
    // string arguments of any call that the text patterns may not have seen
    // (`jest.requireActual<T>('./x')`, an aliased loader); resolved like specs
    // but never reported as unresolved imports
    extraSpecs: typeOnly ? [...typeOnly.callLiterals] : [],
    codeSpecs,
    envNames,
    envUnresolved,
    usesFs,
    tokens,
    dynamicLoad: DYNAMIC_LOAD.test(code),
    childProcess: CHILD_PROCESS.test(code),
    envBare: ENV_BARE.test(code),
  };
}

// ---------------------------------------------------------------------------
// Keyer
// ---------------------------------------------------------------------------

function createKeyer({
  root,
  index,
  env = process.env,
  nodeVersion = process.versions.node,
  execOptions = [],
}) {
  const digests = createDigests(index);
  // Repo top-level names count as "named data" evidence for fs-reading code.
  const nameMatchers = buildNameMatchers(index);
  const namedDirs = new Set(
    nameMatchers.map(([, prefix]) => prefix.replace(/\/$/, '')),
  );
  const analysisCache = new Map();
  const candidatePlans = new Map();
  const isFile = (rel) => index.has(rel);
  const digestOf = (rel) => index.get(rel) ?? hashFile(root, rel);

  function analyze(rel) {
    if (!analysisCache.has(rel)) {
      let info = null;
      if (SOURCE_EXTENSIONS.test(rel)) {
        info = analyzeSource(
          fs.readFileSync(path.join(root, rel), 'utf8'),
          rel,
          nameMatchers,
        );
      }
      analysisCache.set(rel, info);
    }
    return analysisCache.get(rel);
  }

  function planCandidates(spec, fromRel) {
    let base;
    if (spec.startsWith('.'))
      base = path.posix.join(path.posix.dirname(fromRel), spec);
    else if (spec.startsWith('@/')) base = `src/${spec.slice(2)}`;
    else if (namedDirs.has(spec.split('/')[0]) && spec.includes('/'))
      base = spec;
    else return 'external';
    const stem = base.replace(/\.(?:[cm]?js|jsx)$/, '');
    // Every existing candidate joins the closure, whichever extension Jest's
    // moduleFileExtensions order would pick first (a .js and a .ts can coexist).
    return [
      ...new Set([
        base,
        ...RESOLVE_EXTENSIONS.map((ext) => base + ext),
        ...RESOLVE_EXTENSIONS.map((ext) => `${stem}${ext}`),
        ...RESOLVE_EXTENSIONS.map((ext) => `${base}/index${ext}`),
      ]),
    ];
  }

  function resolveSpec(spec, fromRel) {
    let plans = candidatePlans.get(fromRel);
    if (!plans) candidatePlans.set(fromRel, (plans = new Map()));
    let candidates = plans.get(spec);
    if (!candidates) {
      candidates = planCandidates(spec, fromRel);
      plans.set(spec, candidates);
    }
    if (candidates === 'external') return 'external';
    // Reuse only path arithmetic across test closures. Membership is checked
    // each time so an added/removed competing extension or missing import is
    // never hidden by a cached hit or miss. Plans live only in this keyer.
    const hits = candidates.filter(isFile);
    if (hits.length > 0) return hits;
    // bare spec that is not an in-repo path (e.g. 'scripts' package-like name)
    return spec.startsWith('.') || spec.startsWith('@/') ? null : 'external';
  }

  const globalDigest = sha(
    JSON.stringify({
      v: KEY_VERSION,
      node: nodeVersion, // full version: a patch update can change results
      platform: `${process.platform}-${process.arch}`,
      execOptions, // order is significant for some Jest flags
      files: GLOBAL_FILES.map((f) => [f, index.get(f) ?? null]),
      env: [...index.keys()]
        .filter((f) => f.startsWith('.env'))
        .map((f) => [f, index.get(f)]),
      prefixes: GLOBAL_PREFIXES.map((p) => [p, digests.prefix(p)]),
      mocks: digests.sorted.filter(([f]) => /(?:^|\/)__mocks__\//.test(f)),
    }),
  );

  return {
    /** @returns {{ key: string } | { unkeyable: string }} */
    keyFor(testRel) {
      const closure = new Set();
      const queue = [testRel, ...SETUP_ROOTS.filter(isFile)];
      const snapshot = `${path.posix.dirname(testRel)}/__snapshots__/${path.posix.basename(testRel)}.snap`;
      if (isFile(snapshot)) queue.push(snapshot);
      const domains = new Set();
      const envNames = new Set(FIXED_ENV);
      const why = [];
      const fsFiles = [];

      while (queue.length > 0) {
        const rel = queue.pop();
        if (closure.has(rel)) continue;
        closure.add(rel);
        const info = analyze(rel);
        if (!info) continue;
        if (info.envBare)
          return { unkeyable: `${rel}: uses process.env as a whole object` };
        if (info.envUnresolved)
          return {
            unkeyable: `${rel}: reads process.env[...] with a name that is not a same-file string const`,
          };
        info.envNames.forEach((name) => envNames.add(name));
        if (info.dynamicLoad) why.push(`dynamic require/import in ${rel}`);
        if (info.childProcess) why.push(`child process in ${rel}`);
        if (info.usesFs && !HERMETIC_FS_READERS.has(rel)) fsFiles.push(rel);
        info.tokens.forEach((token) => domains.add(token));
        for (const spec of info.specs) {
          const target = resolveSpec(spec, rel);
          if (target === null) {
            if (info.codeSpecs.has(spec))
              why.push(`unresolved import '${spec}' in ${rel}`);
          } else if (target !== 'external') queue.push(...[target].flat());
        }
        for (const spec of info.extraSpecs) {
          const target = resolveSpec(spec, rel);
          if (target && target !== 'external') queue.push(...[target].flat());
        }
      }
      if (fsFiles.length > 0 && domains.size === 0) {
        why.push(`fs reads but no named directory in ${fsFiles[0]}`);
      }
      const repoWide = why.length > 0;
      // A symlink inside a data domain points somewhere this key does not follow.
      const domainPrefixes = repoWide ? [''] : [...domains];
      for (const link of index.symlinks ?? []) {
        if (domainPrefixes.some((prefix) => link.startsWith(prefix)))
          return { unkeyable: `symlink ${link} inside a data domain` };
      }

      const envEntries = [
        ...envNames,
        ...Object.keys(env).filter((n) => n.startsWith('JEST_')),
      ]
        .filter((name, i, all) => all.indexOf(name) === i)
        .sort()
        .map((name) => [name, env[name] ?? null]);
      return {
        key: sha(
          JSON.stringify({
            global: globalDigest,
            test: testRel,
            closure: [...closure].sort().map((f) => [f, digestOf(f)]),
            domains: [...domains].sort().map((d) => [d, digests.prefix(d)]),
            repo: repoWide ? digests.prefix('') : null,
            env: envEntries,
          }),
        ),
        repoWide,
        why,
        closure: [...closure].sort(),
        domains: [...domains].sort(),
        closureSize: closure.size,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Result store
// ---------------------------------------------------------------------------

function createStore(dir) {
  // Mark the directory as a result store before any key is computed, so every
  // invocation's file index leaves it out (buildFileIndex), whatever its name.
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, STORE_MARKER),
      'cached-tests result store\n',
    );
  } catch {
    // unwritable: put() fails open later, and the dir holds no entries
  }
  const entryPath = (key) => path.join(dir, key.slice(0, 2), `${key}.json`);
  const writeEntry = (key, entry, flag = 'w') => {
    fs.mkdirSync(path.dirname(entryPath(key)), { recursive: true });
    fs.writeFileSync(
      entryPath(key),
      JSON.stringify({ ...entry, key, version: KEY_VERSION }),
      { flag },
    );
  };
  return {
    get(key) {
      try {
        const entry = JSON.parse(fs.readFileSync(entryPath(key), 'utf8'));
        return entry && entry.key === key && !entry.rejected ? entry : null;
      } catch {
        return null; // missing or corrupt: not a hit
      }
    },
    put(key, entry) {
      writeEntry(key, entry);
    },
    /** Seed imports cannot overwrite local results, including rejections. */
    putIfAbsent(key, entry) {
      try {
        writeEntry(key, entry, 'wx');
        return true;
      } catch (error) {
        if (error.code === 'EEXIST') return false;
        throw error;
      }
    },
    touch(key) {
      const now = new Date();
      try {
        fs.utimesSync(entryPath(key), now, now);
      } catch {
        // best effort
      }
    },
    /**
     * Reject an entry by overwriting it, not deleting it: CI restores main's
     * seed and then a PR's own entries into one directory, and a deletion
     * would let main's pass come back. A later pass on the same key records over it.
     */
    remove(key) {
      this.put(key, { rejected: true });
    },
    /** Drop entries not used for `days`; keeps the Actions cache from growing forever. */
    prune(days) {
      const cutoff = Date.now() - days * 86400000;
      let removed = 0;
      if (!fs.existsSync(dir)) return removed;
      for (const sub of fs.readdirSync(dir)) {
        const subDir = path.join(dir, sub);
        if (!fs.statSync(subDir).isDirectory()) continue;
        for (const name of fs.readdirSync(subDir)) {
          const file = path.join(subDir, name);
          if (fs.statSync(file).mtimeMs < cutoff) {
            fs.rmSync(file, { force: true });
            removed += 1;
          }
        }
      }
      return removed;
    },
  };
}

// ---------------------------------------------------------------------------
// Run orchestration (jest is injected so tests can plant results)
// ---------------------------------------------------------------------------

/** Deterministic pseudo-random order so each run/attempt verifies a different sample. */
function verifyOrder(files, seed) {
  return [...files].sort((a, b) => {
    const ra = sha(`${seed}:${a}`);
    const rb = sha(`${seed}:${b}`);
    return ra < rb ? -1 : ra > rb ? 1 : 0;
  });
}

/**
 * @param execute async (files) => ({ exitCode, results: Map<repoPath, 'passed'|'failed'> })
 * @param mode 'use' skips hits; 'record' runs everything but still records passes
 */
async function runCached({
  files,
  keyer,
  store,
  execute,
  mode,
  verifyHits,
  seed,
  log = () => {},
}) {
  const keyed = files.map((file) => {
    try {
      return { file, ...keyer.keyFor(file) };
    } catch (error) {
      return { file, unkeyable: `key error: ${error && error.message}` }; // fail open
    }
  });
  const hits =
    mode === 'use' ? keyed.filter((k) => k.key && store.get(k.key)) : [];
  const hitSet = new Set(hits.map((k) => k.file));
  const misses = keyed.filter((k) => !hitSet.has(k.file));
  for (const k of keyed.filter((x) => x.unkeyable))
    log(`not cacheable (${k.unkeyable}): ${k.file}`);
  hits.forEach((k) => store.touch(k.key));

  const report = {
    mode,
    files: files.length,
    hits: hits.length,
    executed: misses.length,
    unkeyable: keyed.filter((k) => k.unkeyable).length,
    verified: [],
    stale: [],
    exitCode: 0,
  };

  if (misses.length > 0) {
    const run = await execute(misses.map((k) => k.file));
    report.exitCode = run.exitCode;
    // Record passes only from a run that exited 0: Jest can report a suite as
    // passed and still exit 1 (obsolete snapshot under --ci, coverage threshold,
    // open handles), and a pass from such a run must never be reused.
    if (run.exitCode === 0 && mode !== 'off') {
      for (const k of misses) {
        if (k.key && run.results.get(k.file) === 'passed')
          store.put(k.key, {
            file: k.file,
            passedAt: new Date().toISOString(),
          });
      }
    }
    if (run.exitCode !== 0) return report; // a real failure: do not spend time verifying
  }

  const sample = verifyOrder(
    hits.map((k) => k.file),
    seed,
  ).slice(0, verifyHits);
  if (sample.length > 0) {
    log(
      `verifying ${sample.length} cached result(s) without the cache: ${sample.join(', ')}`,
    );
    const rerun = await execute(sample);
    for (const file of sample) {
      report.verified.push(file);
      // A suite reported as passed by a run that exited non-zero is not a pass.
      if (rerun.exitCode !== 0 || rerun.results.get(file) !== 'passed') {
        report.stale.push(file);
        store.remove(hits.find((k) => k.file === file).key);
      }
    }
    if (report.stale.length > 0 || rerun.exitCode !== 0)
      report.exitCode = rerun.exitCode || 1;
  }
  return report;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

/**
 * 'use' skips hits; 'record' runs everything but still records passes; 'off'
 * runs everything and neither reads nor writes the cache.
 */
function resolveMode({ uncached, passthrough, env }) {
  if (passthrough.some(isUnsupportedJestOption)) return 'off';
  if (uncached) return 'record';
  if (env.GITHUB_EVENT_NAME === 'schedule') return 'record';
  if (env.GITHUB_EVENT_NAME === 'push' && env.GITHUB_REF === 'refs/heads/main')
    return 'record';
  if (
    passthrough.some((arg) => arg === '--coverage' || arg === '--coverage=true')
  )
    return 'record';
  return 'use';
}

function jestArgs({ projects, shard, passthrough }) {
  return [
    ...projects.flatMap((p) => ['--selectProjects', p]),
    ...(shard ? [`--shard=${shard}`] : []),
    ...passthrough,
  ];
}

/** The result-affecting options, shared by native runs and local seed import. */
function cacheExecOptions({ projects, passthrough }) {
  return [
    ...projects.map((project) => `project=${project}`),
    ...passthrough.filter((arg) => KEYED_JEST_OPTIONS.test(arg)),
  ];
}

// Windows refuses a command line over 32,767 characters, and every file to run is
// an argument: a run of more than ~450 files failed to spawn (ENAMETOOLONG) and
// reported only exit 1, so the cache could not be used locally. There the files
// go in batches under the limit; elsewhere one Jest run, as before.
const ARGV_LIMIT = process.platform === 'win32' ? 28000 : Infinity;

/** Split `files` into consecutive batches whose command line stays under `limit`. */
function batchFiles(files, fixedArgs, limit = ARGV_LIMIT) {
  const budget = limit - fixedArgs.reduce((sum, a) => sum + a.length + 3, 0);
  const batches = [];
  let current = [];
  let used = 0;
  for (const file of files) {
    const cost = file.length + 3; // separator and possible quotes
    if (current.length > 0 && used + cost > budget) {
      batches.push(current);
      current = [];
      used = 0;
    }
    current.push(file);
    used += cost;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

function createJestExecutor({
  root,
  baseArgs,
  spawn = spawnSync,
  limit = ARGV_LIMIT,
  onReport,
}) {
  const jestBin = path.join(root, 'node_modules', 'jest', 'bin', 'jest.js');
  const withoutShard = baseArgs.filter((a) => !a.startsWith('--shard'));
  return async (files) => {
    const tmp = fs.mkdtempSync(
      path.join(require('node:os').tmpdir(), 'cached-tests-'),
    );
    const out = path.join(tmp, 'report.json');
    const fixed = [
      process.execPath,
      jestBin,
      '--json',
      `--outputFile=${out}`,
      ...withoutShard,
      '--runTestsByPath',
    ];
    const results = new Map();
    let exitCode = 0;
    try {
      // A failing batch does not stop the rest: one Jest run reports every file too.
      for (const batch of batchFiles(files, fixed, limit)) {
        const result = spawn(process.execPath, fixed.slice(1).concat(batch), {
          cwd: root,
          stdio: 'inherit',
        });
        if (result.error)
          console.error(
            `[test:cached] could not start jest: ${result.error.message}`,
          );
        exitCode = exitCode || (result.status ?? 1);
        try {
          const report = JSON.parse(fs.readFileSync(out, 'utf8'));
          for (const test of report.testResults) {
            results.set(
              toPosix(path.relative(root, test.name)),
              test.status === 'passed' ? 'passed' : 'failed',
            );
          }
          // Advisory timing collection cannot change test/cache results.
          try {
            onReport?.(report);
          } catch {
            /* reporting stays soft */
          }
        } catch {
          // no readable report: nothing is recorded, exit code still decides
        }
        fs.rmSync(out, { force: true }); // a stale report must not stand in for the next batch
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
    return { exitCode, results };
  };
}

function listTests({ root, baseArgs }) {
  const jestBin = path.join(root, 'node_modules', 'jest', 'bin', 'jest.js');
  const stdout = execFileSync(
    process.execPath,
    [jestBin, '--listTests', '--json', ...baseArgs],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'inherit'],
    },
  );
  const line = stdout
    .split('\n')
    .reverse()
    .find((l) => l.startsWith('['));
  if (!line) throw new Error('jest --listTests --json printed no list');
  return JSON.parse(line).map((abs) => toPosix(path.relative(root, abs)));
}

async function main(argv) {
  const { parseArgs } = require('node:util');
  const split = argv.indexOf('--');
  const own = split === -1 ? argv : argv.slice(0, split);
  const passthrough = split === -1 ? [] : argv.slice(split + 1);
  if (passthrough.some((arg) => !arg.startsWith('-'))) {
    console.error(
      'test:cached: pass jest options as --flag=value after --; test paths are not supported',
    );
    return 2;
  }
  const { values } = parseArgs({
    args: own,
    options: {
      project: { type: 'string', multiple: true, default: [] },
      shard: { type: 'string' },
      'verify-hits': { type: 'string', default: '0' },
      'cache-dir': { type: 'string', default: '.jest-result-cache' },
      uncached: { type: 'boolean', default: false },
      filter: { type: 'string' },
      report: { type: 'string' },
      'prune-days': { type: 'string', default: '14' },
    },
  });
  const verifyHits = Number(values['verify-hits']);
  if (!Number.isSafeInteger(verifyHits) || verifyHits < 0) {
    console.error('test:cached: --verify-hits must be a non-negative integer');
    return 2;
  }
  const root = process.cwd();
  const mode = resolveMode({
    uncached: values.uncached,
    passthrough,
    env: process.env,
  });
  const baseArgs = jestArgs({
    projects: values.project,
    shard: values.shard,
    passthrough,
  });
  const filter = values.filter ? new RegExp(values.filter) : null;
  const files = listTests({ root, baseArgs }).filter(
    (file) => !filter || filter.test(file),
  );
  const store = createStore(path.resolve(root, values['cache-dir']));
  const started = Date.now();
  const timingFiles = {};
  // This CommonJS CLI consumes G2's ESM extractor only at runtime; no cycle.
  let onReport;
  try {
    const { measureJestFiles, mergeFileDurations } =
      await import('./test-file-durations.mjs');
    onReport = (raw) =>
      mergeFileDurations(timingFiles, measureJestFiles(raw, root).durations);
  } catch (error) {
    console.error(
      `[test:cached] advisory timing unavailable: ${error.message}`,
    );
  }
  let report;
  try {
    const cacheRel =
      toPosix(path.relative(root, path.resolve(root, values['cache-dir']))) +
      '/';
    const keyer = createKeyer({
      root,
      index: buildFileIndex(root, cacheRel),
      execOptions: cacheExecOptions({ projects: values.project, passthrough }),
    });
    report = await runCached({
      files,
      keyer,
      store,
      execute: createJestExecutor({ root, baseArgs, onReport }),
      mode,
      verifyHits,
      seed: `${process.env.GITHUB_RUN_ID || 'local'}:${process.env.GITHUB_RUN_ATTEMPT || '1'}`,
      log: (line) => console.log(`[test:cached] ${line}`),
    });
  } catch (error) {
    // Keying infrastructure broke: run everything (fail open).
    console.error(
      `[test:cached] cache unavailable (${error && error.message}); running all ${files.length} files`,
    );
    const run = await createJestExecutor({ root, baseArgs })(files);
    return run.exitCode;
  }
  store.prune(Number(values['prune-days']));
  report.elapsedMs = Date.now() - started;
  report.testFiles = files;
  report.timingFiles = timingFiles;
  console.log(
    `[test:cached] mode=${report.mode} files=${report.files} cache-hits=${report.hits} executed=${report.executed} ` +
      `verified=${report.verified.length} stale=${report.stale.length} exit=${report.exitCode}`,
  );
  for (const file of report.stale)
    console.error(
      `[test:cached] STALE cached pass (fails when re-run): ${file}`,
    );
  if (values.report) {
    fs.mkdirSync(path.dirname(path.resolve(values.report)), {
      recursive: true,
    });
    fs.writeFileSync(
      values.report,
      `${JSON.stringify({ ...report, shard: values.shard ?? null }, null, 2)}\n`,
    );
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `### Jest result cache (${values.shard ?? 'unsharded'}, ${report.mode})\n\n` +
        `${report.files} files: ${report.hits} skipped from cache, ${report.executed} executed ` +
        `(${report.unkeyable} not cacheable); ${report.verified.length} cached results re-run, ${report.stale.length} stale.\n`,
    );
  }
  return report.exitCode;
}

module.exports = {
  analyzeSource,
  batchFiles,
  buildFileIndex,
  cacheExecOptions,
  createJestExecutor,
  createKeyer,
  createStore,
  jestArgs,
  listTests,
  runCached,
  resolveMode,
  verifyOrder,
};

if (require.main === module) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(error);
      process.exit(1);
    },
  );
}
