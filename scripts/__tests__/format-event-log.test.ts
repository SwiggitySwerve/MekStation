import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const repoRoot = process.cwd();
const PYTHON = process.platform === 'win32' ? 'python' : 'python3';

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeJsonLines(filePath: string, events: unknown[]): void {
  fs.writeFileSync(
    filePath,
    `${events.map((event) => JSON.stringify(event)).join('\n')}\n`,
  );
}

describe('format-event-log.py', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir('mekstation-event-log-');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it('formats an NDJSON combat log into stable readable columns', () => {
    const sourcePath = path.join(tempDir, 'sample-game.jsonl');
    writeJsonLines(sourcePath, [
      {
        sequence: 1,
        turn: 1,
        phase: 'movement',
        actorId: 'player-atlas-1',
        type: 'movement_declared',
        payload: {
          from: { q: 0, r: 0 },
          to: { q: 1, r: 1 },
          mpUsed: 4,
          straightHexes: 3,
          turningMpCost: 1,
          netDisplacement: 2,
          steps: [{ kind: 'forward' }, { kind: 'turn-right' }],
        },
      },
      {
        sequence: 2,
        turn: 1,
        phase: 'weapon',
        side: 'opponent',
        actorId: 'opponent-locust-1',
        type: 'attack_resolved',
        payload: {
          targetId: 'player-atlas-1',
          roll: 9,
          toHitNumber: 8,
          hit: true,
          hitLocation: 'RT',
          damage: 5,
        },
      },
      {
        sequence: 3,
        turn: 2,
        phase: 'end',
        type: 'heat_generated',
        payload: {
          amount: 6,
          newTotal: 8,
          breakdown: { weapons: 4, movement: 2, terrain: 0 },
        },
      },
    ]);

    const result = spawnSync(
      PYTHON,
      [path.join(repoRoot, 'scripts/format-event-log.py'), sourcePath],
      {
        cwd: repoRoot,
        encoding: 'utf-8',
      },
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');

    const readablePath = sourcePath.replace('.jsonl', '.readable.txt');
    expect(result.stdout).toContain(`Written: ${readablePath}`);

    const output = fs.readFileSync(readablePath, 'utf-8');
    expect(output).toContain('=== sample-game.jsonl - 3 events, turns 1-2 ===');
    expect(output).toContain('----- TURN 1 -----');
    expect(output).toContain(
      's00001 t01 movement player    player-atlas-1 movement_declared',
    );
    expect(output).toContain(
      '0101->0202 mp=4(s3+t1) disp=2 [forward,turn-right]',
    );
    expect(output).toContain(
      's00002 t01 weapon   opponent  opponent-locus attack_resolved',
    );
    expect(output).toContain('->player-atlas-1 roll=9/8 HIT loc=RT dmg=5');
    expect(output).toContain('----- TURN 2 -----');
    expect(output).toContain(
      's00003 t02 end      system                 - heat_generated',
    );
    expect(output).toContain('gen=+6 total=8 (w=4 m=2 t=0)');
  });

  it('fails loudly for an empty log', () => {
    const sourcePath = path.join(tempDir, 'empty.jsonl');
    fs.writeFileSync(sourcePath, '');

    const result = spawnSync(
      PYTHON,
      [path.join(repoRoot, 'scripts/format-event-log.py'), sourcePath],
      {
        cwd: repoRoot,
        encoding: 'utf-8',
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`No events found in ${sourcePath}`);
  });
});
