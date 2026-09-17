#!/usr/bin/env node
/**
 * Log preservation before worktree removal (U13 - R6.loop-harness).
 *
 * DELIVERY.md ("Owned cleanup") already says the rule: export and reopen
 * durable evidence before removing a proof worktree, and verify the canonical
 * non-reparse target, the recorded worktree identity, the expected HEAD and a
 * clean state before any removal. Council 1 section D item 3 asked for
 * enforcement rather than more prose, because U3 shows the cost: its
 * verification logs lived inside the worktree, the worktree was removed, and
 * evidence/u3-local-20260916.json now carries nineteen sha256 lines with no
 * preimage.
 *
 * So this module does two things and refuses in between. preserveRunLogs
 * copies a run directory out to a location OUTSIDE every worktree, hashing
 * both sides, and writes the manifest the ledger commits.
 * removeWorktreeAfterPreservation removes the worktree only when that
 * manifest still verifies against the preserved copies AND the worktree is
 * the one that was recorded, at the head that was recorded, with nothing
 * uncommitted in it.
 *
 * Everything fails closed. There is no flag that skips a check, an empty run
 * directory is a refusal rather than an empty manifest, and a link is never
 * followed: the walk skips symlinks and junctions, a run directory that is
 * itself a reparse point is refused, and the node_modules junction inside a
 * worktree is deleted as a reparse point (never recursively - on Windows a
 * recursive delete that resolved the link first would take the real
 * node_modules with it).
 *
 * The callers are U17's (council 2 section D item 3: the closure, fold,
 * main-proof and park generators still live in the parent's scratchpad).
 * Until U17 lands, the parent runs this CLI by hand before each removal.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const DEFAULT_PRESERVED_ROOT = path.join(
  REPO_ROOT,
  '.sisyphus/roadmap-completion-20260912/preserved-runs',
);
const DEFAULT_EVIDENCE_DIR = path.join(
  REPO_ROOT,
  'openspec/planning/2026-09-12-roadmap-completion/evidence',
);

const UNIT = /^[A-Za-z][A-Za-z0-9]*$/;
const DATE = /^\d{8}$/;
const SHA = /^[0-9a-f]{40}$/;

/** A preservation refusal. `code` is what the CLI prints; the message names the file. */
export class PreserveRunLogsError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PreserveRunLogsError';
    this.code = code;
  }
}

/** A removal refusal. Nothing has been deleted when this is thrown. */
export class WorktreeRemovalError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WorktreeRemovalError';
    this.code = code;
  }
}

const posix = (value) => value.split(path.sep).join('/');
const hashFile = (file) =>
  createHash('sha256').update(fs.readFileSync(file)).digest('hex');

/** lstat without throwing, so an absent path and a dangling link are both answerable. */
function linkStat(target) {
  try {
    return fs.lstatSync(target);
  } catch {
    return null;
  }
}

/**
 * A ledger path is repo-root-relative and never absolute. A target on another
 * drive cannot be expressed that way, so it is a refusal rather than an
 * absolute machine path written into evidence.
 */
function relativeToRoot(repoRoot, target, code) {
  const relative = path.relative(path.resolve(repoRoot), target);
  if (!relative || path.isAbsolute(relative))
    throw new PreserveRunLogsError(
      code,
      `${target} cannot be expressed relative to ${repoRoot}`,
    );
  return posix(relative);
}

/** Regular files only, relative POSIX paths. Links are skipped, never followed. */
function walkFiles(root, prefix = '') {
  const files = [];
  for (const entry of fs.readdirSync(path.join(root, prefix), {
    withFileTypes: true,
  })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) files.push(...walkFiles(root, relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}

/** Where the manifest for this unit and date lives. Exported so the CLI and its callers agree. */
export function manifestPathFor({
  evidenceDir = DEFAULT_EVIDENCE_DIR,
  unit,
  date,
} = {}) {
  return path.join(
    path.resolve(evidenceDir),
    `${String(unit).toLowerCase()}-logs-${date}.json`,
  );
}

/**
 * Copy a run's logs out of the worktree and record what landed.
 *
 * `onCopied` runs between the copy and its verification and exists only so
 * the pin can corrupt a copy; it has no CLI flag and its default does
 * nothing. `repoRoot` is what the manifest's paths are relative to.
 */
export function preserveRunLogs({
  runDir,
  unit,
  date,
  repoRoot = REPO_ROOT,
  preservedRoot = DEFAULT_PRESERVED_ROOT,
  evidenceDir = DEFAULT_EVIDENCE_DIR,
  onCopied = () => {},
  now = () => new Date(),
} = {}) {
  if (!UNIT.test(unit ?? ''))
    throw new PreserveRunLogsError('INVALID_ARGUMENT', `--unit ${unit}`);
  if (!DATE.test(date ?? ''))
    throw new PreserveRunLogsError('INVALID_ARGUMENT', `--date ${date}`);
  const source = path.resolve(runDir ?? '');
  const sourceStat = linkStat(source);
  if (sourceStat?.isSymbolicLink())
    throw new PreserveRunLogsError(
      'RUN_DIR_REPARSE',
      `${source} is a reparse point; pass the canonical path`,
    );
  if (!sourceStat?.isDirectory())
    throw new PreserveRunLogsError(
      'RUN_DIR_MISSING',
      `${source} is not a directory`,
    );
  const files = walkFiles(source).sort();
  if (!files.length)
    throw new PreserveRunLogsError(
      'EMPTY_RUN_DIR',
      `no regular file under ${source}`,
    );

  const preservedDir = path.join(
    path.resolve(preservedRoot),
    `${unit}-${date}`,
  );
  const entries = [];
  for (const file of files) {
    const from = path.join(source, file);
    const to = path.join(preservedDir, file);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    onCopied({ file, source: from, target: to });
    // Hash the source AFTER the copy: a run directory still being written to
    // is a copy that cannot be proven, and this is where that shows up.
    const sha256 = hashFile(from);
    if (hashFile(to) !== sha256)
      throw new PreserveRunLogsError(
        'COPY_HASH_MISMATCH',
        `${file} did not survive the copy into ${preservedDir}`,
      );
    entries.push({ file, bytes: fs.statSync(to).size, sha256 });
  }

  const manifest = {
    unit,
    date,
    at: now().toISOString(),
    runDir: relativeToRoot(repoRoot, source, 'RUN_DIR_OUTSIDE_ROOT'),
    preservedDir: relativeToRoot(
      repoRoot,
      preservedDir,
      'PRESERVED_DIR_OUTSIDE_ROOT',
    ),
    files: entries,
    bytes: entries.reduce((total, entry) => total + entry.bytes, 0),
  };
  const manifestPath = manifestPathFor({ evidenceDir, unit, date });
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

/** The default git runner. A non-zero exit is a refusal, never an empty answer. */
function defaultGit(args, { cwd } = {}) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0)
    throw new WorktreeRemovalError(
      'GIT_FAILED',
      `git ${args.join(' ')}: ${(result.stderr ?? '').trim()}`,
    );
  return result.stdout;
}

/** Compare paths by their on-disk identity, case-insensitively on Windows. */
function canonical(value) {
  const resolved = path.resolve(value.trim());
  let real = resolved;
  try {
    real = fs.realpathSync.native(resolved);
  } catch {
    real = resolved;
  }
  return process.platform === 'win32' ? posix(real).toLowerCase() : posix(real);
}

/**
 * Delete a reparse point and nothing behind it. rmdirSync without `recursive`
 * cannot walk into the target, and refuses outright on a real directory with
 * contents - which is the behaviour wanted if node_modules is ever a real
 * directory rather than the expected junction.
 */
function removeReparsePoint(link) {
  try {
    fs.unlinkSync(link);
  } catch (error) {
    if (!['EPERM', 'EISDIR', 'EACCES'].includes(error.code)) throw error;
    fs.rmdirSync(link);
  }
}

/**
 * Remove a proof worktree, but only after the preserved logs verify and the
 * worktree is provably the recorded one, at the recorded head, clean.
 *
 * `git` is injectable so the pin can reach the "not a worktree of this
 * repository" branch; its default runs real git and there is no flag that
 * replaces it.
 */
export function removeWorktreeAfterPreservation({
  repoRoot = REPO_ROOT,
  worktreePath,
  expectedHead,
  manifest,
  git = defaultGit,
} = {}) {
  if (!SHA.test(expectedHead ?? ''))
    throw new WorktreeRemovalError(
      'INVALID_ARGUMENT',
      `--expected-head ${expectedHead}`,
    );
  const root = path.resolve(repoRoot);
  const manifestFile = path.resolve(manifest ?? '');
  if (!linkStat(manifestFile)?.isFile())
    throw new WorktreeRemovalError(
      'MANIFEST_MISSING',
      `${manifestFile} does not exist; preserve the run logs first`,
    );
  const record = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  if (
    typeof record.preservedDir !== 'string' ||
    !Array.isArray(record.files) ||
    !record.files.length
  )
    throw new WorktreeRemovalError(
      'MANIFEST_UNREADABLE',
      `${manifestFile} lists no preserved file`,
    );
  for (const entry of record.files) {
    const preserved = path.resolve(root, record.preservedDir, entry.file);
    if (!linkStat(preserved)?.isFile() || hashFile(preserved) !== entry.sha256)
      throw new WorktreeRemovalError(
        'PRESERVED_HASH_MISMATCH',
        `${entry.file} is missing or no longer matches under ${record.preservedDir}`,
      );
  }

  const target = path.resolve(worktreePath ?? '');
  const targetStat = linkStat(target);
  if (targetStat?.isSymbolicLink())
    throw new WorktreeRemovalError(
      'WORKTREE_REPARSE',
      `${target} is a reparse point; pass the canonical path`,
    );
  if (!targetStat?.isDirectory())
    throw new WorktreeRemovalError(
      'WORKTREE_MISSING',
      `${target} is not a directory`,
    );
  const head = git(['rev-parse', 'HEAD'], { cwd: target }).trim();
  if (head !== expectedHead)
    throw new WorktreeRemovalError(
      'HEAD_MISMATCH',
      `${target} is at ${head}, expected ${expectedHead}`,
    );
  const status = git(['status', '--porcelain'], { cwd: target }).trim();
  if (status)
    throw new WorktreeRemovalError(
      'WORKTREE_DIRTY',
      `${target} has ${status.split(/\r?\n/).length} uncommitted entries`,
    );
  const listed = git(['worktree', 'list', '--porcelain'], { cwd: root })
    .split(/\r?\n/)
    .filter((line) => line.startsWith('worktree '))
    .map((line) => canonical(line.slice('worktree '.length)));
  if (!listed.includes(canonical(target)))
    throw new WorktreeRemovalError(
      'WORKTREE_NOT_LISTED',
      `${target} is not a worktree of ${root}`,
    );

  // The junction goes first: git would otherwise walk into the real
  // node_modules while removing the tree.
  const modules = path.join(target, 'node_modules');
  const junctionRemoved = Boolean(linkStat(modules)?.isSymbolicLink());
  if (junctionRemoved) removeReparsePoint(modules);
  git(['worktree', 'remove', '--force', target], { cwd: root });
  git(['worktree', 'prune'], { cwd: root });
  return {
    worktreePath: posix(target),
    head,
    junctionRemoved,
    manifest: posix(manifestFile),
  };
}

const FLAGS = {
  '--run-dir': 'runDir',
  '--unit': 'unit',
  '--date': 'date',
  '--preserved-root': 'preservedRoot',
  '--evidence-dir': 'evidenceDir',
  '--remove-worktree': 'worktreePath',
  '--expected-head': 'expectedHead',
};

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!FLAGS[flag] || value === undefined)
      throw new PreserveRunLogsError('INVALID_ARGUMENT', `${flag}`);
    options[FLAGS[flag]] = value;
  }
  if (Boolean(options.worktreePath) !== Boolean(options.expectedHead))
    throw new PreserveRunLogsError(
      'INVALID_ARGUMENT',
      '--remove-worktree and --expected-head are used together',
    );
  return options;
}

/** Repo-root-relative when the path is inside the repository; never invented otherwise. */
const printable = (target) => {
  const relative = path.relative(REPO_ROOT, target);
  return !relative || path.isAbsolute(relative)
    ? posix(target)
    : posix(relative);
};

function main(args) {
  let options;
  try {
    options = parseArguments(args);
    const manifest = preserveRunLogs(options);
    console.log(
      `RUN_LOGS_PRESERVED ${printable(manifestPathFor(options))} ${manifest.files.length} files ${manifest.bytes} bytes`,
    );
  } catch (error) {
    console.log(`RUN_LOGS_REFUSED ${error.code ?? 'RUN_LOGS_ERROR'}`);
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  if (!options.worktreePath) return;
  try {
    const removed = removeWorktreeAfterPreservation({
      ...options,
      manifest: manifestPathFor(options),
    });
    console.log(`WORKTREE_REMOVED ${removed.worktreePath}`);
  } catch (error) {
    console.log(`WORKTREE_REFUSED ${error.code ?? 'WORKTREE_ERROR'}`);
    console.error(error.message);
    process.exitCode = 2;
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main(process.argv.slice(2));
