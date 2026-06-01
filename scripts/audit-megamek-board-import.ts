#!/usr/bin/env npx tsx

import * as fs from 'fs';
import * as path from 'path';

import { parseMegaMekBoard } from '../src/lib/parsers/megaMekBoard';

const DEFAULT_MEGAMEK_ROOT = 'E:/Projects/megamek/megamek';

interface AuditOptions {
  readonly megamekRoot: string;
  readonly boardsRoot?: string;
  readonly filter?: string;
  readonly limit?: number;
  readonly requireCliff: boolean;
  readonly json: boolean;
  readonly help: boolean;
}

interface BoardAuditResult {
  readonly filePath: string;
  readonly relativePath: string;
  readonly hexRows: number;
  readonly parsedHexes: number;
  readonly largeCoordinateRows: number;
  readonly cliffTopRows: number;
  readonly width?: number;
  readonly height?: number;
  readonly error?: string;
}

interface AuditSummary {
  readonly boardsRoot: string;
  readonly scannedBoards: number;
  readonly parsedBoards: number;
  readonly failedBoards: number;
  readonly totalHexRows: number;
  readonly parsedHexes: number;
  readonly largeCoordinateBoards: number;
  readonly largeCoordinateRows: number;
  readonly cliffTopBoards: number;
  readonly cliffTopRows: number;
  readonly failures: readonly BoardAuditResult[];
}

function parseArgs(argv: readonly string[]): AuditOptions {
  const options: AuditOptions = {
    megamekRoot: process.env.MEGAMEK_ROOT ?? DEFAULT_MEGAMEK_ROOT,
    requireCliff: false,
    json: false,
    help: false,
  };

  let current: AuditOptions = options;

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    switch (arg) {
      case '--megamek':
        current = {
          ...current,
          megamekRoot: path.resolve(argv[++index] ?? ''),
        };
        break;
      case '--boards':
        current = {
          ...current,
          boardsRoot: path.resolve(argv[++index] ?? ''),
        };
        break;
      case '--filter':
        current = { ...current, filter: argv[++index] ?? '' };
        break;
      case '--limit':
        current = { ...current, limit: Number(argv[++index] ?? '') };
        break;
      case '--require-cliff':
        current = { ...current, requireCliff: true };
        break;
      case '--json':
        current = { ...current, json: true };
        break;
      case '--help':
      case '-h':
        current = { ...current, help: true };
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return current;
}

function showHelp(): void {
  console.log(`
MegaMek board import audit

Usage:
  npx tsx scripts/audit-megamek-board-import.ts [options]

Options:
  --megamek <path>       MegaMek repo root. Defaults to MEGAMEK_ROOT or ${DEFAULT_MEGAMEK_ROOT}
  --boards <path>        Board corpus root. Defaults to <megamek>/data/boards
  --filter <text>        Only audit board paths containing this text
  --limit <number>       Stop after auditing this many selected board files
  --require-cliff        Fail if selected boards contain no cliff_top metadata
  --json                 Emit machine-readable JSON summary
  --help, -h             Show this help
`);
}

function collectBoardFiles(root: string): string[] {
  const files: string[] = [];
  const entries = fs
    .readdirSync(root, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectBoardFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.board')) {
      files.push(fullPath);
    }
  }

  return files;
}

function countMatches(content: string, pattern: RegExp): number {
  return content.match(pattern)?.length ?? 0;
}

function auditBoard(filePath: string, boardsRoot: string): BoardAuditResult {
  const relativePath = path.relative(boardsRoot, filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  const hexRows = countMatches(content, /^hex\s+\S+/gm);
  const largeCoordinateRows = countMatches(content, /^hex\s+\d{5,}\s/gm);
  const cliffTopRows = countMatches(
    content,
    /^hex\s+\S+\s+[-\d]+\s+"[^"]*cliff_top:/gm,
  );

  try {
    const board = parseMegaMekBoard(content);
    if (board.hexes.length !== hexRows) {
      return {
        filePath,
        relativePath,
        hexRows,
        parsedHexes: board.hexes.length,
        largeCoordinateRows,
        cliffTopRows,
        width: board.width,
        height: board.height,
        error: `Parsed ${board.hexes.length} hexes from ${hexRows} hex rows`,
      };
    }

    return {
      filePath,
      relativePath,
      hexRows,
      parsedHexes: board.hexes.length,
      largeCoordinateRows,
      cliffTopRows,
      width: board.width,
      height: board.height,
    };
  } catch (error) {
    return {
      filePath,
      relativePath,
      hexRows,
      parsedHexes: 0,
      largeCoordinateRows,
      cliffTopRows,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function summarize(
  boardsRoot: string,
  results: readonly BoardAuditResult[],
): AuditSummary {
  const failures = results.filter((result) => result.error);

  return {
    boardsRoot,
    scannedBoards: results.length,
    parsedBoards: results.length - failures.length,
    failedBoards: failures.length,
    totalHexRows: results.reduce((sum, result) => sum + result.hexRows, 0),
    parsedHexes: results.reduce((sum, result) => sum + result.parsedHexes, 0),
    largeCoordinateBoards: results.filter(
      (result) => result.largeCoordinateRows > 0,
    ).length,
    largeCoordinateRows: results.reduce(
      (sum, result) => sum + result.largeCoordinateRows,
      0,
    ),
    cliffTopBoards: results.filter((result) => result.cliffTopRows > 0).length,
    cliffTopRows: results.reduce((sum, result) => sum + result.cliffTopRows, 0),
    failures,
  };
}

function printSummary(summary: AuditSummary): void {
  console.log('MegaMek board import audit');
  console.log(`Boards root: ${summary.boardsRoot}`);
  console.log(`Scanned boards: ${summary.scannedBoards}`);
  console.log(`Parsed boards: ${summary.parsedBoards}`);
  console.log(`Failed boards: ${summary.failedBoards}`);
  console.log(`Hex rows: ${summary.totalHexRows}`);
  console.log(`Parsed hexes: ${summary.parsedHexes}`);
  console.log(
    `Large-coordinate coverage: ${summary.largeCoordinateBoards} boards, ${summary.largeCoordinateRows} hex rows`,
  );
  console.log(
    `cliff_top coverage: ${summary.cliffTopBoards} boards, ${summary.cliffTopRows} hex rows`,
  );

  if (summary.failures.length > 0) {
    console.log('\nFailures:');
    for (const failure of summary.failures.slice(0, 20)) {
      console.log(`- ${failure.relativePath}: ${failure.error}`);
    }
    if (summary.failures.length > 20) {
      console.log(`- ... ${summary.failures.length - 20} more`);
    }
  }
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    showHelp();
    return;
  }

  const boardsRoot = path.resolve(
    options.boardsRoot ?? path.join(options.megamekRoot, 'data', 'boards'),
  );

  if (!fs.existsSync(boardsRoot) || !fs.statSync(boardsRoot).isDirectory()) {
    throw new Error(`MegaMek boards directory not found: ${boardsRoot}`);
  }

  let boardFiles = collectBoardFiles(boardsRoot);
  if (options.filter) {
    const normalizedFilter = options.filter.toLowerCase();
    boardFiles = boardFiles.filter((filePath) =>
      path
        .relative(boardsRoot, filePath)
        .toLowerCase()
        .includes(normalizedFilter),
    );
  }
  if (options.limit !== undefined) {
    if (!Number.isInteger(options.limit) || options.limit < 1) {
      throw new Error('--limit must be a positive integer');
    }
    boardFiles = boardFiles.slice(0, options.limit);
  }

  const results = boardFiles.map((filePath) =>
    auditBoard(filePath, boardsRoot),
  );
  let summary = summarize(boardsRoot, results);

  if (options.requireCliff && summary.cliffTopRows === 0) {
    summary = {
      ...summary,
      failedBoards: summary.failedBoards + 1,
      failures: [
        ...summary.failures,
        {
          filePath: boardsRoot,
          relativePath: '.',
          hexRows: 0,
          parsedHexes: 0,
          largeCoordinateRows: 0,
          cliffTopRows: 0,
          error: 'Selected board corpus did not contain any cliff_top metadata',
        },
      ],
    };
  }

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    printSummary(summary);
  }

  if (summary.failures.length > 0) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
