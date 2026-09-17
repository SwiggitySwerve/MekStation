#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * @typedef {{ verdict: 'ALLOW' } | {
 *   verdict: 'REFUSE',
 *   reason: 'node-modules-is-link' | 'manifest-outside-cwd',
 *   expectedPath: string,
 *   actualPath: string
 * }} InstallTargetVerdict
 */

/**
 * @param {{ cwd: string, manifestPath: string }} target
 * @returns {InstallTargetVerdict}
 */
export function inspectInstallTarget({ cwd, manifestPath }) {
  const realCwd = fs.realpathSync(cwd);
  const modulesPath = path.join(cwd, 'node_modules');
  if (!fs.existsSync(modulesPath)) return { verdict: 'ALLOW' };

  const expectedPath = path.join(realCwd, 'node_modules');
  const actualPath = fs.realpathSync(modulesPath);
  if (actualPath !== expectedPath) {
    return {
      verdict: 'REFUSE',
      reason: 'node-modules-is-link',
      expectedPath,
      actualPath,
    };
  }

  const manifestDirectory = path.dirname(fs.realpathSync(manifestPath));
  if (manifestDirectory !== realCwd) {
    return {
      verdict: 'REFUSE',
      reason: 'manifest-outside-cwd',
      expectedPath: realCwd,
      actualPath: manifestDirectory,
    };
  }
  return { verdict: 'ALLOW' };
}

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
    } else {
      const { expectedPath, actualPath } = result;
      console.log(
        `INSTALL_REFUSED ${result.reason} ${JSON.stringify({ expectedPath, actualPath })}`,
      );
      process.exitCode = 1;
    }
  } catch (error) {
    console.log(`INSTALL_REFUSED inspection-error ${error.message}`);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main(process.argv.slice(2));
}
