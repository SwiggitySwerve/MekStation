/** One isolated family's conversion and calculation, inside the parent's queue ticket. */
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { serialize } from 'node:v8';

import { calculateSources, readJsonLines } from './vehicle-aero-bv-delta';

export function runCommand(
  executable: string,
  args: string[],
  timeoutMs = 600000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      stdio: ['ignore', 'inherit', 'inherit'],
      windowsHide: true,
    });
    const timer = setTimeout(() => {
      // Only this command's process tree belongs to us.
      if (process.platform === 'win32' && child.pid) {
        spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
          windowsHide: true,
        });
      } else child.kill('SIGTERM');
      reject(new Error(`Command timed out: ${executable}`));
    }, timeoutMs);
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('exit', (code, signal) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else
        reject(new Error(`Command failed (${code ?? signal}): ${executable}`));
    });
  });
}

export async function familyWorker(
  family: string,
  mekfiles: string,
  out: string,
  python: string,
): Promise<void> {
  await runCommand(python, [
    '-B',
    'scripts/megameklab-conversion/export_vehicle_aero_json.py',
    mekfiles,
    out,
    '--strict',
    '--family',
    family,
  ]);
  const rows = calculateSources(
    readJsonLines(path.join(out, 'sources.ndjson')),
    mekfiles,
  );
  // V8 retains NaN, undefined and insertion order in failed as well as successful rows.
  fs.writeFileSync(path.join(out, 'computed.bin'), serialize(rows));
}

if (require.main === module) {
  const [family, mekfiles, out, python] = process.argv.slice(2);
  familyWorker(family, mekfiles, out, python).catch((error: unknown) => {
    process.stderr.write(String(error) + '\n');
    process.exitCode = 1;
  });
}
