import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

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
  it.each(['runtime', 'external'])(
    'refuses escaping descendant links in a %s package before any write',
    (kind) => {
      const root = makeTempRoot();
      const outside = makeTempRoot();
      try {
        prepareFixture(root);
        const installed = path.join(root, 'node_modules/linked-content');
        writeFile(
          path.join(installed, 'package.json'),
          JSON.stringify({
            name: 'linked-content',
            version: '1.0.0',
            main: 'index.js',
          }),
        );
        writeFile(path.join(installed, 'index.js'), 'module.exports = {};');
        writeFile(path.join(outside, 'secret.txt'), 'outside sentinel');
        makeDirectoryLink(outside, path.join(installed, 'external-assets'));
        if (kind === 'runtime') {
          writeFile(
            path.join(root, 'src/runtime.ts'),
            "export { default } from 'linked-content';",
          );
          fs.appendFileSync(
            path.join(root, 'server.js'),
            "\nrequire('./src/runtime.ts');",
          );
        }
        const alias = path.join(
          root,
          '.next/standalone/.next/node_modules/linked-content-0123456789abcdef',
        );
        fs.mkdirSync(path.dirname(alias), { recursive: true });
        makeDirectoryLink(installed, alias);
        const server = fs.readFileSync(
          path.join(root, '.next/standalone/server.js'),
          'utf8',
        );
        const result = runHydrator(root);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain(
          'Runtime package source escapes checkout',
        );
        expect(
          fs.readFileSync(
            path.join(root, '.next/standalone/server.js'),
            'utf8',
          ),
        ).toBe(server);
        expect(
          fs.readFileSync(
            path.join(root, '.next/standalone/server.next-config.json'),
            'utf8',
          ),
        ).toBe('preserve-before-preflight');
        expect(fs.lstatSync(alias).isSymbolicLink()).toBe(true);
        expect(fs.readFileSync(path.join(outside, 'secret.txt'), 'utf8')).toBe(
          'outside sentinel',
        );
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
        fs.rmSync(outside, { recursive: true, force: true });
      }
    },
  );

  // Windows without Developer Mode refuses file symlinks; exercise these on Linux.
  (process.platform === 'win32' ? it.skip : it).each(['runtime', 'external'])(
    'refuses an escaping package.json file link in a %s package before reading it',
    (kind) => {
      const root = makeTempRoot();
      const outside = makeTempRoot();
      try {
        prepareFixture(root);
        const installed = path.join(root, 'node_modules/linked-manifest');
        writeFile(path.join(installed, 'index.js'), 'module.exports = {};');
        // Invalid JSON proves that source validation runs before manifest parsing.
        writeFile(
          path.join(outside, 'package.json'),
          'not JSON; must never be read',
        );
        fs.symlinkSync(
          path.join(outside, 'package.json'),
          path.join(installed, 'package.json'),
          'file',
        );
        if (kind === 'runtime') {
          writeFile(
            path.join(root, 'src/runtime.ts'),
            "export { default } from 'linked-manifest';",
          );
          fs.appendFileSync(
            path.join(root, 'server.js'),
            "\nrequire('./src/runtime.ts');",
          );
        }
        const alias = path.join(
          root,
          '.next/standalone/.next/node_modules/linked-manifest-0123456789abcdef',
        );
        fs.mkdirSync(path.dirname(alias), { recursive: true });
        makeDirectoryLink(installed, alias);
        const server = fs.readFileSync(
          path.join(root, '.next/standalone/server.js'),
          'utf8',
        );
        const result = runHydrator(root);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain(
          'Runtime package source escapes checkout',
        );
        expect(
          fs.readFileSync(
            path.join(root, '.next/standalone/server.js'),
            'utf8',
          ),
        ).toBe(server);
        expect(
          fs.readFileSync(
            path.join(root, '.next/standalone/server.next-config.json'),
            'utf8',
          ),
        ).toBe('preserve-before-preflight');
        expect(fs.lstatSync(alias).isSymbolicLink()).toBe(true);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
        fs.rmSync(outside, { recursive: true, force: true });
      }
    },
  );

  it.each(['name', 'version', 'missing-version'])(
    'refuses a relative alias with a traced %s mismatch before any write',
    (kind) => {
      const root = makeTempRoot();
      try {
        prepareFixture(root);
        const manifest = {
          name: 'native-library',
          version: kind === 'missing-version' ? undefined : '2.0.0',
          main: 'index.cjs',
        };
        const installed = path.join(root, 'node_modules/native-library');
        writeFile(
          path.join(installed, 'package.json'),
          JSON.stringify(manifest),
        );
        writeFile(
          path.join(installed, 'index.cjs'),
          "module.exports = { version: '2.0.0' };",
        );
        writeFile(path.join(installed, 'binding.gyp'), '{}');
        writeFile(
          path.join(root, 'src/runtime.ts'),
          "export { default } from 'native-library';",
        );
        fs.appendFileSync(
          path.join(root, 'server.js'),
          "\nrequire('./src/runtime.ts');",
        );
        const traced = path.join(
          root,
          '.next/standalone/node_modules/native-library',
        );
        writeFile(
          path.join(traced, 'package.json'),
          JSON.stringify({
            ...manifest,
            name: kind === 'name' ? 'other-library' : manifest.name,
            version: kind === 'version' ? '1.0.0' : manifest.version,
          }),
        );
        const alias = path.join(
          root,
          '.next/standalone/.next/node_modules/native-library-0123456789abcdef',
        );
        fs.mkdirSync(path.dirname(alias), { recursive: true });
        fs.symlinkSync(
          path.relative(path.dirname(alias), traced),
          alias,
          process.platform === 'win32' ? 'junction' : 'dir',
        );
        const server = fs.readFileSync(
          path.join(root, '.next/standalone/server.js'),
          'utf8',
        );
        const result = runHydrator(root);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain(
          'Turbopack external package identity mismatch',
        );
        expect(
          fs.readFileSync(
            path.join(root, '.next/standalone/server.js'),
            'utf8',
          ),
        ).toBe(server);
        expect(
          fs.readFileSync(
            path.join(root, '.next/standalone/server.next-config.json'),
            'utf8',
          ),
        ).toBe('preserve-before-preflight');
        expect(fs.lstatSync(alias).isSymbolicLink()).toBe(true);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    },
  );

  it('refuses cyclic package sources during collection', () => {
    const root = makeTempRoot();
    try {
      prepareFixture(root);
      const installed = path.join(root, 'node_modules/cyclic-package');
      writeFile(
        path.join(installed, 'package.json'),
        JSON.stringify({ name: 'cyclic-package', version: '1.0.0' }),
      );
      makeDirectoryLink(installed, path.join(installed, 'again'));
      const aliasRoot = path.join(root, '.next/standalone/.next/node_modules');
      fs.mkdirSync(aliasRoot, { recursive: true });
      makeDirectoryLink(
        installed,
        path.join(aliasRoot, 'cyclic-package-0123456789abcdef'),
      );
      const moduleUrl = pathToFileURL(
        path.join(repoRoot, 'scripts/next/runtime-packages.mjs'),
      ).href;
      const result = spawnSync(
        NODE,
        [
          '--input-type=module',
          '-e',
          `import { collectTurbopackExternals } from ${JSON.stringify(moduleUrl)}; collectTurbopackExternals(${JSON.stringify(root)}, ${JSON.stringify(aliasRoot)}, ${JSON.stringify(path.join(root, '.next/standalone'))});`,
        ],
        { encoding: 'utf8' },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Cyclic runtime package source');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses a relative alias when its canonical installed package is linked', () => {
    const root = makeTempRoot();
    try {
      prepareFixture(root);
      const manifest = JSON.stringify({ name: 'native-library' });
      const installedSource = path.join(root, 'vendor/native-library');
      writeFile(path.join(installedSource, 'package.json'), manifest);
      makeDirectoryLink(
        installedSource,
        path.join(root, 'node_modules/native-library'),
      );
      const tracedPackage = path.join(
        root,
        '.next/standalone/node_modules/native-library',
      );
      writeFile(path.join(tracedPackage, 'package.json'), manifest);
      const alias = path.join(
        root,
        '.next/standalone/.next/node_modules/native-library-0123456789abcdef',
      );
      fs.mkdirSync(path.dirname(alias), { recursive: true });
      makeDirectoryLink(tracedPackage, alias);

      const result = runHydrator(root);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        'Linked runtime package native-library is not supported',
      );
      expect(
        fs.readFileSync(
          path.join(root, '.next/standalone/server.next-config.json'),
          'utf8',
        ),
      ).toBe('preserve-before-preflight');
      expect(fs.lstatSync(alias).isSymbolicLink()).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses an alias to a noncanonical package directory inside the checkout', () => {
    const root = makeTempRoot();
    try {
      prepareFixture(root);
      const manifest = JSON.stringify({ name: 'native-library' });
      writeFile(
        path.join(root, 'node_modules/native-library/package.json'),
        manifest,
      );
      writeFile(
        path.join(root, 'node_modules/renamed-package/package.json'),
        manifest,
      );
      const tracedPackage = path.join(
        root,
        '.next/standalone/node_modules/renamed-package',
      );
      writeFile(path.join(tracedPackage, 'package.json'), manifest);
      const alias = path.join(
        root,
        '.next/standalone/.next/node_modules/native-library-0123456789abcdef',
      );
      fs.mkdirSync(path.dirname(alias), { recursive: true });
      makeDirectoryLink(tracedPackage, alias);

      const result = runHydrator(root);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('does not match installed package');
      expect(
        fs.readFileSync(
          path.join(root, '.next/standalone/server.next-config.json'),
          'utf8',
        ),
      ).toBe('preserve-before-preflight');
      expect(fs.lstatSync(alias).isSymbolicLink()).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses a Turbopack external outside installed packages before writing output', () => {
    const root = makeTempRoot();
    const outside = makeTempRoot();
    try {
      prepareFixture(root);
      writeFile(path.join(outside, 'package.json'), '{"name":"outside"}');
      const alias = path.join(
        root,
        '.next/standalone/.next/node_modules/outside-0123456789abcdef',
      );
      fs.mkdirSync(path.dirname(alias), { recursive: true });
      makeDirectoryLink(outside, alias);

      const result = runHydrator(root);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        'Turbopack external source is outside installed packages',
      );
      expect(
        fs.readFileSync(
          path.join(root, '.next/standalone/server.next-config.json'),
          'utf8',
        ),
      ).toBe('preserve-before-preflight');
      expect(fs.lstatSync(alias).isSymbolicLink()).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

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
