import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createProductionDependencies } from './camp01-durable-facts.mjs';
import { runController } from './run-camp01-authority-receipt.mjs';

export async function runProduction(argv, options = {}, dependencies = {}) {
  return runController(
    argv,
    await createProductionDependencies(options, dependencies),
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  runProduction(process.argv.slice(2))
    .then(() => process.stdout.write('CAMP01 production controller complete\n'))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
