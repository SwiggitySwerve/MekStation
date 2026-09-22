#!/usr/bin/env node
/**
 * node_modules junction guard (U12b - R6.loop-harness).
 *
 * A program worktree gets its node_modules as a junction to the root
 * checkout's. That is cheap and it is a trap: npm resolves the link and
 * prunes the ROOT tree. U12 tried to stop it with an npm `preinstall`
 * script and was parked on FN-u12-root-preinstall-runs-after-reify - npm
 * 11.6.2 runs the root preinstall AFTER arb.reify, so the hook fires once
 * the damage is done (npm/cli#3669).
 *
 * So this is not a lifecycle hook. It is a CLI the loop calls BEFORE npm:
 * the worktree-setup step and every lane charter run it, and a refusal means
 * no npm command runs in that directory at all. It refuses when node_modules
 * under the working directory is a link, and when the manifest it was given
 * does not belong to the working directory's real path - the second rule is
 * what catches a command aimed at one checkout while standing in another.
 *
 * Nothing is swallowed. There is no `|| true`, no flag that skips a check,
 * and no allow-by-default: a manifest that cannot be read or parsed is a
 * refusal with its own reason word, an unknown argument is a refusal, and
 * anything unexpected lands in a fail-closed catch. What it does NOT do is
 * prevent npm from pruning; npm is unchanged. The protection is a caller who
 * runs this first.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * @typedef {{ verdict: 'ALLOW' } | {
 *   verdict: 'REFUSE',
 *   reason: 'node-modules-is-link' | 'manifest-root-mismatch' | 'manifest-unreadable',
 *   expectedPath: string,
 *   actualPath: string
 * }} InstallTargetVerdict
 */

/**
 * Where a link points. realpath is the answer for a live link; a dangling
 * one still has a readlink target, and that is worth printing rather than
 * throwing - the operator needs to see what the junction was aimed at.
 *
 * @param {string} linkPath
 * @returns {string}
 */
function resolveLinkTarget(linkPath) {
  try {
    return fs.realpathSync(linkPath);
  } catch {
    return fs.readlinkSync(linkPath);
  }
}

/**
 * Decides whether npm may run in `cwd` against `manifestPath`.
 *
 * The node_modules test is two-sided on purpose. lstat is the direct
 * question and it answers true for both a POSIX symlink and a Windows
 * junction; the real-path comparison behind it catches a reparse point that
 * redirects without lstat calling it a symbolic link. Comparing against
 * realpath(cwd) rather than cwd is what keeps a checkout that is itself
 * reached through a junction allowed - that alias is not the problem.
 *
 * @param {{ cwd: string, manifestPath: string }} target
 * @returns {InstallTargetVerdict}
 */
export function inspectInstallTarget({ cwd, manifestPath }) {
  const realCwd = fs.realpathSync(cwd);
  const modulesPath = path.join(cwd, 'node_modules');
  const expectedModules = path.join(realCwd, 'node_modules');

  // lstat rather than exists: a dangling link is absent to existsSync and is
  // exactly the case that must not be mistaken for a fresh checkout.
  const modulesStats = fs.lstatSync(modulesPath, { throwIfNoEntry: false });
  if (modulesStats) {
    if (modulesStats.isSymbolicLink())
      return {
        verdict: 'REFUSE',
        reason: 'node-modules-is-link',
        expectedPath: expectedModules,
        actualPath: resolveLinkTarget(modulesPath),
      };
    const actualModules = fs.realpathSync(modulesPath);
    if (actualModules !== expectedModules)
      return {
        verdict: 'REFUSE',
        reason: 'node-modules-is-link',
        expectedPath: expectedModules,
        actualPath: actualModules,
      };
  }

  let manifestDirectory;
  try {
    JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifestDirectory = path.dirname(fs.realpathSync(manifestPath));
  } catch {
    return {
      verdict: 'REFUSE',
      reason: 'manifest-unreadable',
      expectedPath: realCwd,
      actualPath: manifestPath,
    };
  }
  if (manifestDirectory !== realCwd)
    return {
      verdict: 'REFUSE',
      reason: 'manifest-root-mismatch',
      expectedPath: realCwd,
      actualPath: manifestDirectory,
    };

  return { verdict: 'ALLOW' };
}

/**
 * Prints one line and sets the exit code. The default manifest is the one
 * beside this module's own repository, so `npm run qc:guard-node-modules-link`
 * inside a checkout asks about that checkout; --manifest is for a caller
 * standing somewhere else.
 *
 * @param {string[]} args
 */
function main(args) {
  try {
    if (
      args.length !== 0 &&
      (args.length !== 2 || args[0] !== '--manifest' || !args[1])
    )
      throw new Error('expected only --manifest <path>');
    const manifestPath =
      args[1] ?? fileURLToPath(new URL('../../package.json', import.meta.url));
    const result = inspectInstallTarget({ cwd: process.cwd(), manifestPath });
    if (result.verdict === 'ALLOW') {
      console.log('INSTALL_ALLOWED');
      process.exitCode = 0;
      return;
    }
    const { expectedPath, actualPath } = result;
    console.log(
      `INSTALL_REFUSED ${result.reason} ${JSON.stringify({ expectedPath, actualPath })}`,
    );
    process.exitCode = 1;
  } catch (error) {
    console.log(`INSTALL_REFUSED inspection-error ${error.message}`);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main(process.argv.slice(2));
