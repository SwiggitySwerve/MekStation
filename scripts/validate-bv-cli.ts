import * as path from 'path';

export const VALIDATE_BV_USAGE =
  'Usage: npx tsx scripts/validate-bv.ts [--output path] [--filter pat] [--limit n] [--reference-dir path] [--min-coverage n] [--verbose]';

export interface ValidateBvCliOptions {
  outputPath: string;
  referenceDir: string;
  minimumCoverageFloor: number;
  minimumCoverageFloorWasExplicit: boolean;
  filter?: string;
  limit?: number;
  verbose: boolean;
  help: boolean;
}

interface ValidateBvCliConfig {
  cwd: string;
  env: NodeJS.ProcessEnv;
  defaultReferenceDir: string;
  defaultMinimumCoverageFloor: number;
}

type ValidateBvArgHandler = (
  options: ValidateBvCliOptions,
  args: readonly string[],
  index: number,
) => number;

function readArgValue(
  args: readonly string[],
  index: number,
  fallback: string,
): string {
  return args[index + 1] || fallback;
}

function createDefaultOptions(
  config: ValidateBvCliConfig,
): ValidateBvCliOptions {
  let minimumCoverageFloor = Number.parseInt(
    config.env.MEKSTATION_BV_MIN_COVERAGE || '',
    10,
  );
  if (!Number.isFinite(minimumCoverageFloor) || minimumCoverageFloor <= 0) {
    minimumCoverageFloor = config.defaultMinimumCoverageFloor;
  }

  return {
    outputPath: path.resolve(config.cwd, './validation-output'),
    referenceDir: path.resolve(
      config.cwd,
      config.env.MEKSTATION_BV_REFERENCE_DIR || config.defaultReferenceDir,
    ),
    minimumCoverageFloor,
    minimumCoverageFloorWasExplicit: Boolean(
      config.env.MEKSTATION_BV_MIN_COVERAGE,
    ),
    verbose: false,
    help: false,
  };
}

export function parseValidateBvArgs(
  args: readonly string[],
  config: ValidateBvCliConfig,
): ValidateBvCliOptions {
  const options = createDefaultOptions(config);
  const aliases: Readonly<Record<string, string>> = {
    '-h': '--help',
    '-v': '--verbose',
  };
  const handlers: Readonly<Record<string, ValidateBvArgHandler>> = {
    '--output': (current, values, index) => {
      current.outputPath = path.resolve(
        config.cwd,
        readArgValue(values, index, './validation-output'),
      );
      return index + 1;
    },
    '--filter': (current, values, index) => {
      current.filter = values[index + 1];
      return index + 1;
    },
    '--limit': (current, values, index) => {
      current.limit = Number.parseInt(readArgValue(values, index, '0'), 10);
      return index + 1;
    },
    '--reference-dir': (current, values, index) => {
      current.referenceDir = path.resolve(
        config.cwd,
        readArgValue(values, index, config.defaultReferenceDir),
      );
      return index + 1;
    },
    '--min-coverage': (current, values, index) => {
      current.minimumCoverageFloor = Number.parseInt(
        readArgValue(values, index, '0'),
        10,
      );
      current.minimumCoverageFloorWasExplicit = true;
      return index + 1;
    },
    '--verbose': (current, _values, index) => {
      current.verbose = true;
      return index;
    },
    '--help': (current, _values, index) => {
      current.help = true;
      return index;
    },
  };

  for (let index = 0; index < args.length; index++) {
    const handler = handlers[aliases[args[index]] ?? args[index]];
    if (handler) index = handler(options, args, index);
  }

  return options;
}
