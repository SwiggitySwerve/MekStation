#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const ALLOWLIST = [
  'src/utils/gameplay/diceTypes.ts',
  'src/utils/gameplay/aerospace/criticalHits.ts',
  'src/utils/gameplay/terrainGenerator.ts',
  'src/simulation/QuickResolveService.ts',
];

const SEARCH_PATHS = [
  'src/utils/gameplay/**',
  'src/simulation/**',
  ...ALLOWLIST.map((file) => `:(exclude)${file}`),
];

function parseArgs(argv) {
  let gitBin = 'git';
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--git-bin') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--git-bin requires a path or executable name');
      }
      gitBin = value;
      index += 1;
    } else if (argv[index].startsWith('--')) {
      throw new Error(`Unknown option: ${argv[index]}`);
    }
  }
  return { gitBin };
}

function isCommentOnlyMatch(match) {
  const source = match.match(/^[^:]+:\d+:(.*)$/)?.[1] ?? match;
  return /^[\t ]*(?:\/\/|\/\*|\*)/.test(source);
}

function runAudit({ gitBin }) {
  const result = spawnSync(
    gitBin,
    ['grep', '-n', '-E', 'Math\\.random\\(\\)', '--', ...SEARCH_PATHS],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );

  if (result.error) {
    console.error(
      `ERROR: Determinism audit could not invoke git (${gitBin}): ${result.error.message}`,
    );
    return 2;
  }

  if (result.status !== 0 && result.status !== 1) {
    const details = result.stderr?.trim();
    if (details) console.error(details);
    console.error(
      `ERROR: Determinism scanner failed with status ${result.status ?? 'unknown'}.`,
    );
    return result.status ?? 2;
  }

  const matches = (result.stdout ?? '')
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((match) => !isCommentOnlyMatch(match));

  if (matches.length > 0) {
    console.error(matches.join('\n'));
    console.error(
      '\nERROR: Math.random() found in src/utils/gameplay/ or src/simulation/ outside the defaultD6Roller seam.',
    );
    console.error(
      'Inject a D6Roller (use SeededD6Roller in tests) or add an explicit allowlist entry to .github/workflows/pr-checks.yml if this is non-dice entropy.',
    );
    return 1;
  }

  console.log('Determinism audit passed: no unseeded dice in combat pipeline.');
  return 0;
}

try {
  process.exitCode = runAudit(parseArgs(process.argv.slice(2)));
} catch (error) {
  console.error(
    `ERROR: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 2;
}
