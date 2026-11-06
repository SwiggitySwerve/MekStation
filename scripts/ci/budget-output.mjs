import os from 'node:os';
import path from 'node:path';

/** Generated telemetry must not enter formatting, lint or source-cache inputs. */
export function budgetOutputDirectory() {
  const output = path.resolve(
    process.env.RUNNER_TEMP ?? os.tmpdir(),
    'budget-output',
  );
  const relative = path.relative(process.cwd(), output);
  if (
    relative === '' ||
    (!path.isAbsolute(relative) && !relative.startsWith(`..${path.sep}`))
  )
    throw new Error('Budget output must be outside the workspace');
  return output;
}
