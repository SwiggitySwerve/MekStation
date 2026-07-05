import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const repoRoot = path.resolve(__dirname, '..', '..');
const NODE = process.execPath;
const SCRIPT_PATH = path.resolve(
  repoRoot,
  'scripts/hydrate-next-standalone-multiplayer-server.mjs',
);

function mkdirp(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath: string, contents = ''): void {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, contents);
}

function makeTempRoot(): string {
  return fs.mkdtempSync(
    path.join(os.tmpdir(), 'mekstation-standalone-hydrate-'),
  );
}

function prepareStandaloneFixture(root: string): void {
  writeFile(
    path.join(root, '.next/standalone/server.js'),
    [
      'const nextConfig = {"output":"standalone"}',
      'process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig)',
      'startServer();',
    ].join('\n'),
  );
  writeFile(path.join(root, '.next/static/chunks/app.js'), 'self.__next=[];');
  writeFile(path.join(root, '.next/static/css/app.css'), 'body{}');
  writeFile(
    path.join(root, 'server.js'),
    [
      "server.on('upgrade', () => undefined);",
      "const socketPath = '/api/multiplayer/socket';",
    ].join('\n'),
  );
  writeFile(path.join(root, 'tsconfig.json'), '{}');
  writeFile(path.join(root, 'public/data/units/battlemechs/index.json'), '[]');
  writeFile(path.join(root, 'src/index.ts'), 'export {};');

  for (const runtimeDir of ['tsx', 'esbuild', 'ws', '@esbuild/win32-x64']) {
    writeFile(
      path.join(root, 'node_modules', runtimeDir, 'package.json'),
      '{}',
    );
  }
}

describe('hydrate-next-standalone-multiplayer-server', () => {
  it('copies Next static assets into the standalone server payload', () => {
    const tmpRoot = makeTempRoot();
    prepareStandaloneFixture(tmpRoot);

    const result = spawnSync(NODE, [SCRIPT_PATH], {
      cwd: tmpRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA: 'true',
        BROWSERSLIST_IGNORE_OLD_DATA: 'true',
      },
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(
      fs.existsSync(
        path.join(tmpRoot, '.next/standalone/.next/static/chunks/app.js'),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpRoot, '.next/standalone/.next/static/css/app.css'),
      ),
    ).toBe(true);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      nextStaticAssets: path.join('.next', 'standalone', '.next', 'static'),
    });
  });
});
