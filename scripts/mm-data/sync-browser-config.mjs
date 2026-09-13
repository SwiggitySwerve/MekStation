#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const SOURCE_RELATIVE_PATH = path.join('config', 'mm-data-assets.json');
const TARGET_RELATIVE_PATH = path.join(
  'public',
  'config',
  'mm-data-assets.json',
);

function usage() {
  return [
    'Usage: node scripts/mm-data/sync-browser-config.mjs [--check] [--root <path>]',
    '',
    'Copies the tracked mm-data manifest into the browser public config path.',
    '--check fails when the source is missing, the target is missing, or bytes drift.',
  ].join('\n');
}

function parseArgs(argv) {
  let check = false;
  let root = process.cwd();

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--check') {
      check = true;
      continue;
    }
    if (argument === '--root') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--root requires a path.');
      }
      root = value;
      index += 1;
      continue;
    }
    if (argument.startsWith('--root=')) {
      const value = argument.slice('--root='.length);
      if (!value) {
        throw new Error('--root requires a path.');
      }
      root = value;
      continue;
    }
    if (argument === '--help' || argument === '-h') {
      console.log(usage());
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  return { check, root: path.resolve(root) };
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function displayPath(root, filePath) {
  const relative = path.relative(root, filePath);
  return relative || '.';
}

function readFileOrNull(filePath) {
  try {
    return fs.readFileSync(filePath);
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function main() {
  const { check, root } = parseArgs(process.argv.slice(2));
  const sourcePath = path.join(root, SOURCE_RELATIVE_PATH);
  const targetPath = path.join(root, TARGET_RELATIVE_PATH);
  const source = readFileOrNull(sourcePath);

  if (source === null) {
    throw new Error(
      `Missing source manifest: ${displayPath(root, sourcePath)}`,
    );
  }

  const sourceHash = sha256(source);
  const target = readFileOrNull(targetPath);
  const targetHash = target === null ? null : sha256(target);
  const matches = target !== null && source.equals(target);

  if (check) {
    if (!matches) {
      throw new Error(
        target === null
          ? `Missing browser manifest: ${displayPath(root, targetPath)}`
          : `Browser manifest drift: ${displayPath(root, targetPath)} does not match ${displayPath(root, sourcePath)}`,
      );
    }
    console.log(
      JSON.stringify(
        {
          mode: 'check',
          status: 'ok',
          action: 'unchanged',
          source: displayPath(root, sourcePath),
          target: displayPath(root, targetPath),
          sourceSha256: sourceHash,
          targetSha256: targetHash,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (!matches) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, source);
  }

  console.log(
    JSON.stringify(
      {
        mode: 'sync',
        status: 'ok',
        action: matches ? 'unchanged' : 'written',
        source: displayPath(root, sourcePath),
        target: displayPath(root, targetPath),
        sourceSha256: sourceHash,
        targetSha256: sourceHash,
      },
      null,
      2,
    ),
  );
}

try {
  main();
} catch (error) {
  console.error(
    JSON.stringify(
      {
        mode: 'sync-browser-config',
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
