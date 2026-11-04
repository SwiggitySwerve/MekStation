#!/usr/bin/env node
// Decides which PR Checks gates a change needs. Detect Changes runs it and
// passes each gate to the jobs as an output ('true' or 'false').
//
// - code, desktop, e2e: path globs.
// - equipment, combat, storybook: a changed file triggers the gate when it is
//   in the import closure of that check's entry files, or matches one of the
//   check's data rules (files the check reads at runtime, not by import).
//
// It fails open. Every gate is 'true' when the event is not a pull request
// (pushes to main, the nightly schedule and manual runs check everything),
// when the diff cannot be read, or when a change touches a file that can
// change every check (dependencies, compiler and test config, CI itself).
//
// Usage: node scripts/ci/ci-changes.mjs [<base> [<head>]]
// Defaults: base HEAD^1, head HEAD. On a pull_request run actions/checkout
// checks out the merge commit, so HEAD^1 is the base branch tip.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const GATES = [
  'code',
  'combat',
  'desktop',
  'e2e',
  'equipment',
  'statistical',
  'storybook',
];

const CODE = [
  /^(src|public|desktop|scripts|config)\//,
  /^\.storybook\//,
  /^\.github\/(workflows|actions)\//,
  /^(package(-lock)?\.json|tsconfig\.json|server\.js|electron-builder\.yml)$/,
  /^(next|jest|tailwind|postcss)\.config\.[^/]+$/,
  /^jest\.setup\.[^/]+$/,
  /^\.babelrc[^/]*$/,
];

// A change here can alter what every check does, so it turns every gate on.
const GLOBAL = [
  /^package(-lock)?\.json$/,
  /^desktop\/package(-lock)?\.json$/,
  /^tsconfig[^/]*\.json$/,
  /^(next|jest)\.config\.[^/]+$/,
  /^jest\.setup\.[^/]+$/,
  /^\.babelrc[^/]*$/,
  /^\.github\/workflows\/pr-checks\.yml$/,
  /^\.github\/actions\//,
  /^scripts\/ci\//,
];

const DESKTOP = [
  /^desktop\//,
  /^(electron-builder\.yml|package(-lock)?\.json|server\.js)$/,
  /^next\.config\.[^/]+$/,
  /^scripts\/next\//,
  /^scripts\/hydrate-next-standalone-multiplayer-server\.mjs$/,
  /^\.github\/workflows\/pr-checks\.yml$/,
  /^\.github\/actions\//,
];

const E2E = [/^e2e\//, /^playwright\.config\.[^/]+$/];

const COMBAT_SCRIPT = 'scripts/validate-combat-suite.mjs';

/**
 * Closure-gated checks. `entries` returns the files the check starts from;
 * `data` lists files it reads at runtime rather than by import.
 */
export const CLOSURE_GATES = {
  // Schema Bridge: node --test scripts/equipment-catalog/*.test.mjs. The tests
  // load src modules through tsx by 'src/...' path strings, so those strings
  // are entries too.
  equipment: {
    entries(root) {
      const dir = 'scripts/equipment-catalog';
      const scripts = listFiles(root, dir, /\.mjs$/);
      return [...scripts, ...srcPathLiterals(root, scripts)];
    },
    data: [
      /^scripts\/equipment-catalog\//,
      /^scripts\/equipment-availability\//,
      /^public\/data\/(equipment|units)\//,
    ],
  },
  // Validate Combat Suite: the Jest files listed in validate-combat-suite.mjs,
  // the gap printer, and OpenSpec strict validation of the combat change/spec.
  combat: {
    entries(root) {
      const source = fs.readFileSync(path.join(root, COMBAT_SCRIPT), 'utf8');
      const tests = [...source.matchAll(/^\s*'(src\/[^']+)',?$/gm)].map(
        (m) => m[1],
      );
      return [
        COMBAT_SCRIPT,
        'scripts/print-combat-validation-gaps.ts',
        ...tests,
      ];
    },
    data: [
      // combatValidationScope/combatEventCatalog read runner sources by path.
      /^src\/simulation\//,
      /^public\/data\//,
      /^openspec\/(specs|changes)\//,
      /^scripts\/lib\//,
    ],
  },
  // Statistical Proof PR: the 100-game combat proof. simulation-system
  // "Statistical Validation" requires it before a combat-affecting PR
  // merges, so it runs whenever a PR touches its import closure.
  // Its import closure does not reach every combat rule (session actions in
  // src/engine are dispatched, not imported), so the combat domain trees
  // count as inputs too.
  statistical: {
    entries() {
      return ['src/simulation/__tests__/integration.test.ts'];
    },
    data: [
      /^public\/data\//,
      /^src\/(engine|simulation|utils\/gameplay|types\/gameplay)\//,
    ],
  },
  // Build Storybook: every story, the .storybook config, and the CSS and
  // static files it bundles.
  storybook: {
    entries(root) {
      return [
        ...listFiles(root, '.storybook', /\.(ts|tsx|js|mjs)$/),
        ...gitFiles(root, ['*.stories.ts', '*.stories.tsx', '*.mdx']),
      ];
    },
    data: [
      /^\.storybook\//,
      /\.stories\.[^/]+$/,
      /\.mdx$/,
      /\.css$/,
      /^(tailwind|postcss)\.config\.[^/]+$/,
      // staticDirs: ['../public']; public/data is copied, never compiled.
      /^public\/(?!data\/)/,
    ],
  },
};

const RESOLVE_SUFFIXES = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '/index.ts',
  '/index.tsx',
  '/index.js',
  '/index.mjs',
];

const IMPORT_RE =
  /(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)|jest\.(?:mock|requireActual)\(\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm;

function listFiles(root, dir, pattern) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((name) => pattern.test(name))
    .map((name) => `${dir}/${name}`);
}

function gitFiles(root, patterns) {
  return execFileSync('git', ['ls-files', '--', ...patterns], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);
}

function srcPathLiterals(root, files) {
  const found = new Set();
  for (const file of files) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    for (const m of text.matchAll(/['"](src\/[A-Za-z0-9_./-]+)['"]/g)) {
      const resolved = resolveBase(root, path.join(root, m[1]));
      if (resolved) found.add(toRel(root, resolved));
    }
  }
  return [...found];
}

function toRel(root, abs) {
  return path.relative(root, abs).split(path.sep).join('/');
}

function resolveBase(root, base) {
  for (const suffix of RESOLVE_SUFFIXES) {
    const candidate = base + suffix;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  // A '.js' specifier that names a TypeScript source.
  const stripped = base.replace(/\.(c|m)?js$/, '');
  for (const suffix of ['.ts', '.tsx']) {
    if (fs.existsSync(stripped + suffix)) return stripped + suffix;
  }
  return null;
}

function resolveImport(root, fromFile, specifier) {
  let base;
  if (specifier.startsWith('@/')) {
    base = path.join(root, 'src', specifier.slice(2));
  } else if (specifier.startsWith('.')) {
    base = path.resolve(path.dirname(fromFile), specifier);
  } else {
    return null; // a package: covered by the package-lock.json global rule
  }
  return resolveBase(root, base);
}

/** Repo-relative paths of every local file the entries import, transitively. */
export function importClosure(root, entries) {
  const seen = new Set();
  const stack = entries.map((entry) => path.resolve(root, entry));
  while (stack.length > 0) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(IMPORT_RE)) {
      const specifier = m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5];
      const resolved = resolveImport(root, file, specifier);
      if (resolved && !seen.has(resolved)) stack.push(resolved);
    }
  }
  return new Set([...seen].map((file) => toRel(root, file)));
}

// One process decides once, but the tests call decide() many times.
const closureCache = new Map();

// Repo files a closure file names by path in its text, e.g. catalog source
// references ('src/x.ts#L10-L20') that tests read to check line anchors.
const SRC_PATH_RE = /src\/[A-Za-z0-9_.\/-]+?\.(?:tsx?|mjs|cjs|js|json)\b/g;

function referencedFiles(root, files) {
  const found = new Set();
  for (const file of files) {
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)) continue;
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    for (const m of text.matchAll(SRC_PATH_RE)) {
      if (fs.existsSync(path.join(root, m[0]))) found.add(m[0]);
    }
  }
  return found;
}

function gateClosure(root, name, gate) {
  const key = `${root}|${name}`;
  if (!closureCache.has(key)) {
    const closure = importClosure(root, gate.entries(root));
    for (const file of referencedFiles(root, closure)) closure.add(file);
    closureCache.set(key, closure);
  }
  return closureCache.get(key);
}

function allGates(value, reason) {
  return {
    gates: Object.fromEntries(GATES.map((gate) => [gate, value])),
    reason,
  };
}

const matchesAny = (file, rules) => rules.some((rule) => rule.test(file));

/** Gate decisions for a list of changed repo-relative paths. */
export function decide(root, changed) {
  const global = changed.filter((file) => matchesAny(file, GLOBAL));
  if (global.length > 0) {
    return allGates(
      true,
      `global input changed: ${global.slice(0, 5).join(', ')}`,
    );
  }
  const code = changed.some((file) => matchesAny(file, CODE));
  const gates = {
    code,
    desktop: code && changed.some((file) => matchesAny(file, DESKTOP)),
    e2e: changed.some((file) => matchesAny(file, E2E)),
  };
  for (const [name, gate] of Object.entries(CLOSURE_GATES)) {
    // Runtime data rules apply whether or not code changed (an OpenSpec-only
    // change to the combat spec still runs Validate Combat Suite).
    const closure = gateClosure(root, name, gate);
    gates[name] = changed.some(
      (file) => closure.has(file) || matchesAny(file, gate.data),
    );
  }
  return { gates, reason: `${changed.length} changed file(s)` };
}

function changedFiles(root, base, head) {
  return execFileSync(
    'git',
    ['diff', '--name-only', '--no-renames', base, head],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  )
    .split('\n')
    .filter(Boolean);
}

export function detect(root, env, base = 'HEAD^1', head = 'HEAD') {
  if (env.GITHUB_EVENT_NAME && env.GITHUB_EVENT_NAME !== 'pull_request') {
    return allGates(true, `event ${env.GITHUB_EVENT_NAME} checks everything`);
  }
  let changed;
  try {
    changed = changedFiles(root, base, head);
  } catch (error) {
    return allGates(true, `diff failed, failing open: ${error.message}`);
  }
  try {
    return decide(root, changed);
  } catch (error) {
    return allGates(true, `detection failed, failing open: ${error.message}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.cwd();
  const [base, head] = process.argv.slice(2);
  const { gates, reason } = detect(root, process.env, base, head);
  const lines = GATES.map(
    (gate) => `${gate}=${gates[gate] ? 'true' : 'false'}`,
  );
  console.log(`ci-changes: ${reason}`);
  for (const line of lines) console.log(`  ${line}`);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
  }
}
