import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '..', '..');
const scriptPath = path.join(
  projectRoot,
  'scripts',
  'mm-data',
  'sync-browser-config.mjs',
);
const packagePath = path.join(projectRoot, 'package.json');
const temporaryRoots: string[] = [];

type SyncResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

function createFixture(): string {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'mm-data-browser-config-'),
  );
  temporaryRoots.push(root);
  return root;
}

function writeSource(root: string, content = '{"version":"fixture"}\n') {
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  fs.writeFileSync(path.join(root, 'config', 'mm-data-assets.json'), content);
}

function targetPath(root: string): string {
  return path.join(root, 'public', 'config', 'mm-data-assets.json');
}

function invoke(root: string, ...args: string[]): SyncResult {
  const result = spawnSync(
    process.execPath,
    [scriptPath, '--root', root, ...args],
    {
      cwd: projectRoot,
      encoding: 'utf8',
    },
  );
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function parseOutput(result: SyncResult): Record<string, unknown> {
  return JSON.parse(result.stdout) as Record<string, unknown>;
}

function sha256(content: Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('mm-data browser manifest synchronization', () => {
  it('writes stale output, passes check, and skips an unchanged write', () => {
    const root = createFixture();
    const sourceContent =
      '{\n  "version": "fixture",\n  "patterns": {\n    "templates_us": ["vehicle_turret_standard.svg"]\n  }\n}\n';
    writeSource(root, sourceContent);
    fs.mkdirSync(path.dirname(targetPath(root)), { recursive: true });
    fs.writeFileSync(targetPath(root), '{"version":"stale"}\n');

    const written = invoke(root);
    expect(written.status).toBe(0);
    expect(parseOutput(written)).toEqual(
      expect.objectContaining({ action: 'written', status: 'ok' }),
    );
    const source = Buffer.from(sourceContent);
    expect(fs.readFileSync(targetPath(root)).equals(source)).toBe(true);
    expect(parseOutput(written).sourceSha256).toBe(sha256(source));

    const before = fs.statSync(targetPath(root)).mtimeNs;
    const checked = invoke(root, '--check');
    expect(checked.status).toBe(0);
    expect(parseOutput(checked)).toEqual(
      expect.objectContaining({ action: 'unchanged', status: 'ok' }),
    );

    const unchanged = invoke(root);
    expect(unchanged.status).toBe(0);
    expect(parseOutput(unchanged)).toEqual(
      expect.objectContaining({ action: 'unchanged', status: 'ok' }),
    );
    expect(fs.statSync(targetPath(root)).mtimeNs).toBe(before);

    fs.writeFileSync(targetPath(root), '{"version":"drift"}\n');
    const drift = invoke(root, '--check');
    expect(drift.status).toBe(1);
    expect(JSON.parse(drift.stderr)).toEqual(
      expect.objectContaining({
        status: 'error',
        error: expect.stringContaining('Browser manifest drift'),
      }),
    );
  });

  it('creates a missing target and refuses missing output in check mode', () => {
    const root = createFixture();
    writeSource(root);

    const missing = invoke(root, '--check');
    expect(missing.status).toBe(1);
    expect(JSON.parse(missing.stderr)).toEqual(
      expect.objectContaining({
        status: 'error',
        error: expect.stringContaining('Missing browser manifest'),
      }),
    );

    const synced = invoke(root);
    expect(synced.status).toBe(0);
    expect(fs.readFileSync(targetPath(root), 'utf8')).toBe(
      fs.readFileSync(path.join(root, 'config', 'mm-data-assets.json'), 'utf8'),
    );
  });

  it('fails clearly when the tracked source manifest is missing', () => {
    const root = createFixture();
    const result = invoke(root);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stderr)).toEqual(
      expect.objectContaining({
        status: 'error',
        error: expect.stringContaining('Missing source manifest'),
      }),
    );
  });

  it('wires sync before every development and build entrypoint', () => {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8')) as {
      scripts: Record<string, string>;
    };
    const syncCommand = 'npm run sync:mm-data-config';
    expect(packageJson.scripts['sync:mm-data-config']).toBe(
      'node scripts/mm-data/sync-browser-config.mjs',
    );

    const entrypoints: Record<
      string,
      { beforeSync?: string[]; afterSync: string[] }
    > = {
      dev: {
        beforeSync: ['npx kill-port 3600 --silent'],
        afterSync: ['node server.js'],
      },
      'dev:e2e': {
        beforeSync: ['npx kill-port 3600 --silent'],
        afterSync: ['next dev --webpack --port 3600'],
      },
      build: {
        afterSync: [
          'node scripts/next/run-next.mjs build --webpack',
          'node scripts/hydrate-next-standalone-multiplayer-server.mjs',
        ],
      },
      'build:analyze': { afterSync: ['ANALYZE=true next build --webpack'] },
      'build:profile': { afterSync: ['next build --webpack --profile'] },
      'build:debug': { afterSync: ['next build --webpack --debug'] },
    };

    for (const [name, contract] of Object.entries(entrypoints)) {
      const command = packageJson.scripts[name];
      expect(command).toBeDefined();
      const syncIndex = command.indexOf(syncCommand);
      expect(syncIndex).toBeGreaterThanOrEqual(0);
      for (const prerequisite of contract.beforeSync ?? []) {
        expect(command).toContain(prerequisite);
        expect(command.indexOf(prerequisite)).toBeLessThan(syncIndex);
      }
      for (const downstreamCommand of contract.afterSync) {
        expect(command).toContain(downstreamCommand);
        expect(syncIndex).toBeLessThan(command.indexOf(downstreamCommand));
      }
    }
  });
});
