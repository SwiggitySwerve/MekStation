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

function writeFile(filePath: string, contents = ''): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mekstation-hydration-safety-'));
}

function prepareFixture(root: string): void {
  writeFile(
    path.join(root, '.next/standalone/server.js'),
    [
      'const nextConfig = {"output":"standalone"}',
      'process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig)',
      'startServer();',
    ].join('\n'),
  );
  writeFile(path.join(root, '.next/static/chunks/app.js'), 'static');
  writeFile(
    path.join(root, 'server.js'),
    "server.on('upgrade', () => undefined); const socketPath = '/api/multiplayer/socket';",
  );
  writeFile(path.join(root, 'tsconfig.json'), '{}');
  writeFile(path.join(root, 'src/index.ts'), 'export {};');
  writeFile(path.join(root, 'public/data/units/battlemechs/index.json'), '[]');
  writeFile(
    path.join(root, 'scripts/data-migration/megamek-bv-cache.json'),
    '{}',
  );
  writeFile(
    path.join(root, '.next/standalone/server.next-config.json'),
    'preserve-before-preflight',
  );

  for (const runtimeDir of ['tsx', 'esbuild', 'ws', '@esbuild/win32-x64']) {
    writeFile(
      path.join(root, 'node_modules', runtimeDir, 'package.json'),
      '{}',
    );
    writeFile(
      path.join(root, 'node_modules', runtimeDir, 'index.js'),
      'module.exports = {};',
    );
  }
  writeFile(path.join(root, 'node_modules/tsx/sentinel.txt'), 'preserve-me');
}

function makeDirectoryLink(source: string, target: string): void {
  fs.symlinkSync(
    source,
    target,
    process.platform === 'win32' ? 'junction' : 'dir',
  );
}

function runHydrator(cwd: string) {
  return spawnSync(NODE, [SCRIPT_PATH], {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA: 'true',
      BROWSERSLIST_IGNORE_OLD_DATA: 'true',
    },
  });
}

describe('standalone hydration path safety', () => {
  it('refuses a linked runtime package source before writing output', () => {
    const root = makeTempRoot();
    const outside = makeTempRoot();
    try {
      prepareFixture(root);
      writeFile(path.join(outside, 'package.json'), '{}');
      writeFile(path.join(outside, 'index.js'), 'module.exports = {};');
      makeDirectoryLink(outside, path.join(root, 'node_modules/linked'));
      writeFile(
        path.join(root, 'src/runtime.ts'),
        "export { default } from 'linked';",
      );
      fs.appendFileSync(
        path.join(root, 'server.js'),
        "\nrequire('./src/runtime.ts');",
      );

      const result = runHydrator(root);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Linked runtime package linked');
      expect(
        fs.readFileSync(
          path.join(root, '.next/standalone/server.next-config.json'),
          'utf8',
        ),
      ).toBe('preserve-before-preflight');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  it('ignores packages installed only above the checkout', () => {
    const parent = makeTempRoot();
    const root = path.join(parent, 'checkout');
    try {
      prepareFixture(root);
      writeFile(
        path.join(parent, 'node_modules/opt-elsewhere/package.json'),
        '{}',
      );
      writeFile(
        path.join(root, 'node_modules/pkg/package.json'),
        JSON.stringify({ optionalDependencies: { 'opt-elsewhere': '*' } }),
      );
      writeFile(
        path.join(root, 'node_modules/pkg/index.js'),
        'module.exports = {};',
      );
      writeFile(
        path.join(root, 'src/runtime.ts'),
        "export { default } from 'pkg';",
      );
      fs.appendFileSync(
        path.join(root, 'server.js'),
        "\nrequire('./src/runtime.ts');",
      );

      const result = runHydrator(root);

      expect(result.status).toBe(0);
      expect(
        fs.existsSync(
          path.join(root, '.next/standalone/node_modules/opt-elsewhere'),
        ),
      ).toBe(false);
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  });

  it('refuses a platform directory link before removing the source or writing output', () => {
    const tmpRoot = makeTempRoot();
    try {
      prepareFixture(tmpRoot);
      const source = path.join(tmpRoot, 'node_modules');
      const target = path.join(tmpRoot, '.next/standalone/node_modules');
      makeDirectoryLink(source, target);

      const result = runHydrator(tmpRoot);

      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain('Unsafe hydration destination');
      expect(result.stderr).toContain('symlink or junction');
      expect(
        fs.readFileSync(path.join(source, 'tsx/sentinel.txt'), 'utf8'),
      ).toBe('preserve-me');
      expect(
        fs.readFileSync(
          path.join(tmpRoot, '.next/standalone/server.next-config.json'),
          'utf8',
        ),
      ).toBe('preserve-before-preflight');
      expect(fs.lstatSync(target).isSymbolicLink()).toBe(true);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('supports ordinary physical standalone output directories', () => {
    const tmpRoot = makeTempRoot();
    try {
      prepareFixture(tmpRoot);

      const result = runHydrator(tmpRoot);

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      expect(JSON.parse(result.stdout)).toMatchObject({ ok: true });
      expect(
        fs.readFileSync(
          path.join(tmpRoot, '.next/standalone/node_modules/tsx/sentinel.txt'),
          'utf8',
        ),
      ).toBe('preserve-me');
      expect(
        fs.readFileSync(
          path.join(tmpRoot, 'node_modules/tsx/sentinel.txt'),
          'utf8',
        ),
      ).toBe('preserve-me');
      expect(
        fs
          .lstatSync(path.join(tmpRoot, '.next/standalone/node_modules'))
          .isSymbolicLink(),
      ).toBe(false);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});
