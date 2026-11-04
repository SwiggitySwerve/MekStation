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
 *     the Jest setup files),
 *   - the "data inputs" it can read: if any closure file uses fs read APIs,
 *     the digest of every repo directory the closure names (public/data/,
 *     openspec/, docs/, ...; narrowed to the directory of a literal like
 *     'scripts/data-migration/x.json' only when every mention of the top-level
 *     name in that file is such a literal), or of the WHOLE repo when it names
 *     none; a file
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
 * except build output and dependency directories; a symlink inside a data
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
]);

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
    walk(root, '', index);
  }
  // The result cache lives in the tree; it must never feed its own keys.
  if (excludePrefix) {
    for (const file of [...index.keys()])
      if (file.startsWith(excludePrefix)) index.delete(file);
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

/**
 * Narrow a top-level directory token to the directories the file's string
 * literals actually name. Only when EVERY mention of `name` in the code is a
 * plain `'name/...'` literal (no `..`/`.` segment, no `${}`, no backslash): any
 * other mention (`'name'`, `path.join(x, 'name', ...)`, `'../name/..'`) could
 * reach anywhere under it, so the caller keeps the whole directory. A literal
 * that names a file contributes the file's directory (siblings stay inputs); one
 * that names a partial file name contributes the directory it starts in.
 * @returns {Set<string> | null} directory prefixes ending in '/', or null.
 */
function refineNamedDir(code, name, matcher, isDir) {
  const literal = new RegExp(
    `(['"\`])${escapeRegex(name)}/([^'"\`\\\\\\n$]*)\\1`,
    'g',
  );
  const starts = new Set();
  const dirs = new Set();
  for (const match of code.matchAll(literal)) {
    const rest = match[2];
    if (rest.split('/').some((segment) => segment === '.' || segment === '..'))
      return null;
    starts.add(match.index);
    const full = `${name}/${rest}`;
    const asDir = full.endsWith('/') ? full : `${full}/`;
    dirs.add(isDir(asDir) ? asDir : full.slice(0, full.lastIndexOf('/') + 1));
  }
  const mentions = new RegExp(matcher.source, 'g');
  for (const match of code.matchAll(mentions)) {
    if (!starts.has(match.index)) return null;
  }
  return dirs.size > 0 ? dirs : null;
}

function analyzeSource(text, rel, nameMatchers, isDir) {
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
  const envNames = new Set();
  for (const match of text.matchAll(ENV_DOT)) envNames.add(match[1]);
  const usesFs = FS_READ.test(code);
  const tokens = new Set();
  if (usesFs || FS_EXISTS.test(code)) {
    // Named directories come from code, not comments: a JSDoc line that mentions
    // `src/utils/...` is not a read of `src/`, and counting it made every such
    // file re-run on any change to that directory.
    for (const [matcher, prefix] of nameMatchers) {
      if (!matcher.test(code)) continue;
      const refined = prefix.endsWith('/')
        ? refineNamedDir(code, prefix.slice(0, -1), matcher, isDir)
        : null;
      for (const token of refined ?? [prefix]) tokens.add(token);
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
  const dirPrefixes = new Set();
  for (const file of index.keys()) {
    for (let at = file.indexOf('/'); at !== -1; at = file.indexOf('/', at + 1))
      dirPrefixes.add(file.slice(0, at + 1));
  }
  const isDir = (prefix) => dirPrefixes.has(prefix);
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
          isDir,
        );
      }
      analysisCache.set(rel, info);
    }
    return analysisCache.get(rel);
  }

  function resolveSpec(spec, fromRel) {
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
    const hits = [
      ...new Set([
        base,
        ...RESOLVE_EXTENSIONS.map((ext) => base + ext),
        ...RESOLVE_EXTENSIONS.map((ext) => `${stem}${ext}`),
        ...RESOLVE_EXTENSIONS.map((ext) => `${base}/index${ext}`),
      ]),
    ].filter(isFile);
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
  const entryPath = (key) => path.join(dir, key.slice(0, 2), `${key}.json`);
  return {
    get(key) {
      try {
        const entry = JSON.parse(fs.readFileSync(entryPath(key), 'utf8'));
        return entry && entry.key === key ? entry : null;
      } catch {
        return null; // missing or corrupt: not a hit
      }
    },
    put(key, entry) {
      fs.mkdirSync(path.dirname(entryPath(key)), { recursive: true });
      fs.writeFileSync(
        entryPath(key),
        JSON.stringify({ ...entry, key, version: KEY_VERSION }),
      );
    },
    touch(key) {
      const now = new Date();
      try {
        fs.utimesSync(entryPath(key), now, now);
      } catch {
        // best effort
      }
    },
    remove(key) {
      fs.rmSync(entryPath(key), { force: true });
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

function createJestExecutor({ root, baseArgs }) {
  const jestBin = path.join(root, 'node_modules', 'jest', 'bin', 'jest.js');
  const withoutShard = baseArgs.filter((a) => !a.startsWith('--shard'));
  return async (files) => {
    const tmp = fs.mkdtempSync(
      path.join(require('node:os').tmpdir(), 'cached-tests-'),
    );
    const out = path.join(tmp, 'report.json');
    const result = spawnSync(
      process.execPath,
      [
        jestBin,
        '--json',
        `--outputFile=${out}`,
        ...withoutShard,
        '--runTestsByPath',
        ...files,
      ],
      { cwd: root, stdio: 'inherit' },
    );
    const results = new Map();
    try {
      const report = JSON.parse(fs.readFileSync(out, 'utf8'));
      for (const test of report.testResults) {
        results.set(
          toPosix(path.relative(root, test.name)),
          test.status === 'passed' ? 'passed' : 'failed',
        );
      }
    } catch {
      // no readable report: nothing is recorded, exit code still decides
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
    return { exitCode: result.status ?? 1, results };
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
  let report;
  try {
    const cacheRel =
      toPosix(path.relative(root, path.resolve(root, values['cache-dir']))) +
      '/';
    const keyer = createKeyer({
      root,
      index: buildFileIndex(root, cacheRel),
      execOptions: [
        ...values.project.map((project) => `project=${project}`),
        ...passthrough.filter((arg) => KEYED_JEST_OPTIONS.test(arg)),
      ],
    });
    report = await runCached({
      files,
      keyer,
      store,
      execute: createJestExecutor({ root, baseArgs }),
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
  buildFileIndex,
  createKeyer,
  createStore,
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
