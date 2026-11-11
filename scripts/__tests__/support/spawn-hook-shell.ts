import {
  spawnSync,
  type SpawnSyncOptionsWithStringEncoding,
  type SpawnSyncReturns,
} from 'node:child_process';

export const SH_NOT_FOUND =
  'sh not found on PATH: run these tests from Git Bash (a shell with POSIX sh and bash on PATH).';

/**
 * Runs `sh` for the pre-commit hook tests. When `sh` is not on PATH (for
 * example Jest started from PowerShell on Windows, where Git's usr/bin is not
 * on PATH), spawnSync returns a null status with an ENOENT error and the hook
 * never runs; the tests then failed with unrelated symptoms (a missing trace
 * log, a null exit status). This fails with a plain message instead.
 */
export function spawnHookShell(
  args: string[],
  options: SpawnSyncOptionsWithStringEncoding,
): SpawnSyncReturns<string> {
  const result = spawnSync('sh', args, options);
  if ((result.error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT') {
    throw new Error(SH_NOT_FOUND);
  }
  return result;
}
