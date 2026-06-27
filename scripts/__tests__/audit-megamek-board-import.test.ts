import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  auditBoard,
  collectBoardFiles,
  parseArgs,
  summarize,
} from '../audit-megamek-board-import';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mekstation-board-audit-'));
}

function writeBoard(
  root: string,
  relativePath: string,
  content: string,
): string {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return filePath;
}

describe('MegaMek board import audit script', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it('parses CLI options through table-driven handlers', () => {
    const options = parseArgs([
      '--megamek',
      'E:/Games/MegaMek',
      '--boards',
      'fixtures/boards',
      '--filter',
      'fort',
      '--limit',
      '12',
      '--require-cliff',
      '--json',
      '-h',
    ]);

    expect(options).toEqual({
      megamekRoot: path.resolve('E:/Games/MegaMek'),
      boardsRoot: path.resolve('fixtures/boards'),
      filter: 'fort',
      limit: 12,
      requireCliff: true,
      json: true,
      help: true,
    });
  });

  it('rejects unknown or valueless CLI options', () => {
    expect(() => parseArgs(['--unknown'])).toThrow(
      'Unknown argument: --unknown',
    );
    expect(() => parseArgs(['--boards'])).toThrow('--boards requires a value');
  });

  it('collects board files recursively in stable order', () => {
    writeBoard(tempDir, 'zeta.board', 'size 1 1\nend');
    writeBoard(tempDir, 'nested/alpha.board', 'size 1 1\nend');
    fs.writeFileSync(path.join(tempDir, 'ignore.txt'), 'not a board');

    expect(
      collectBoardFiles(tempDir).map((filePath) =>
        path.relative(tempDir, filePath),
      ),
    ).toEqual([path.join('nested', 'alpha.board'), 'zeta.board']);
  });

  it('audits boards with large coordinates and cliff metadata', () => {
    const boardPath = writeBoard(
      tempDir,
      'fort.board',
      `size 170 120
hex 9916 3 "" ""
hex 10015 3 "" ""
hex 10016 4 "cliff_top:1:33;pavement:1" ""
hex 104120 0 "" ""
end`,
    );

    const result = auditBoard(boardPath, tempDir);
    const summary = summarize(tempDir, [result]);

    expect(result.error).toBeUndefined();
    expect(result.hexRows).toBe(4);
    expect(result.parsedHexes).toBe(4);
    expect(result.largeCoordinateRows).toBe(3);
    expect(result.cliffTopRows).toBe(1);
    expect(summary).toEqual(
      expect.objectContaining({
        scannedBoards: 1,
        parsedBoards: 1,
        failedBoards: 0,
        largeCoordinateBoards: 1,
        largeCoordinateRows: 3,
        cliffTopBoards: 1,
        cliffTopRows: 1,
      }),
    );
  });

  it('records parser failures in the audit summary', () => {
    const boardPath = writeBoard(
      tempDir,
      'broken.board',
      `hex 0101 0 "" ""
end`,
    );

    const result = auditBoard(boardPath, tempDir);
    const summary = summarize(tempDir, [result]);

    expect(result.error).toContain('Missing size declaration');
    expect(summary.failedBoards).toBe(1);
    expect(summary.failures).toEqual([result]);
  });
});
