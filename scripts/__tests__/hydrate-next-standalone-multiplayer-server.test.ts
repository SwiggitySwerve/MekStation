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
const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function mkdirp(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath: string, contents = ''): void {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, contents);
}

function makeTempRoot(): string {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'mekstation-standalone-hydrate-'),
  );
  tempRoots.push(root);
  return root;
}

function writePackage(
  root: string,
  directory: string,
  manifest: Record<string, unknown>,
  files: Record<string, string> = {},
): void {
  writeFile(
    path.join(root, directory, 'package.json'),
    JSON.stringify(manifest),
  );
  for (const [name, content] of Object.entries(files)) {
    writeFile(path.join(root, directory, name), content);
  }
}

function runHydrator(root: string) {
  return spawnSync(NODE, [SCRIPT_PATH], { cwd: root, encoding: 'utf8' });
}

function addRuntimeImport(root: string, source: string): void {
  fs.appendFileSync(
    path.join(root, 'server.js'),
    "\nrequire('./src/runtime.ts');",
  );
  writeFile(path.join(root, 'src/runtime.ts'), source);
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
  writeFile(
    path.join(root, 'scripts/data-migration/megamek-bv-cache.json'),
    JSON.stringify({
      entries: {
        'atlas-as7-d': { megamekBV: 1897 },
      },
    }),
  );
  writeFile(path.join(root, 'src/index.ts'), 'export {};');

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
}

describe('hydrate-next-standalone-multiplayer-server', () => {
  it('copies runtime assets and the authoritative BV cache into the standalone payload', () => {
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
    expect(
      JSON.parse(
        fs.readFileSync(
          path.join(
            tmpRoot,
            '.next/standalone/scripts/data-migration/megamek-bv-cache.json',
          ),
          'utf8',
        ),
      ),
    ).toEqual({
      entries: {
        'atlas-as7-d': { megamekBV: 1897 },
      },
    });
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      nextStaticAssets: path.join('.next', 'standalone', '.next', 'static'),
      megaMekBVCache: path.join(
        '.next',
        'standalone',
        'scripts',
        'data-migration',
        'megamek-bv-cache.json',
      ),
    });
  });

  it('rejects a require entry that falls back to the ancestor checkout', () => {
    const root = makeTempRoot();
    prepareStandaloneFixture(root);
    addRuntimeImport(root, "export { default } from 'next';");
    writePackage(
      root,
      'node_modules/next',
      { main: 'index.cjs' },
      { 'index.cjs': 'module.exports = {};' },
    );

    const result = runHydrator(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'Runtime package next resolved outside standalone output',
    );
  });

  it('does not ask electron-builder to package duplicated static assets', () => {
    const builderConfig = fs.readFileSync(
      path.join(repoRoot, 'electron-builder.yml'),
      'utf8',
    );

    expect(builderConfig).toContain("from: '.tmp/next-standalone-electron'");
    expect(builderConfig).not.toContain("from: '../.next/static'");
    expect(builderConfig).not.toContain("to: 'next-standalone/.next/static'");
  });

  it('repairs an ESM-only trace and preserves nested package versions in an isolated image', () => {
    const root = makeTempRoot();
    prepareStandaloneFixture(root);
    addRuntimeImport(
      root,
      "import type { T } from 'types-only'; import dual from 'dual'; import other from 'other'; export { dual, other };",
    );
    const dual = {
      name: 'dual',
      exports: { import: './esm.js', require: './cjs.cjs' },
      dependencies: { child: '*' },
      peerDependencies: { '@fixture/peer': '*', 'optional-peer': '*' },
      peerDependenciesMeta: { 'optional-peer': { optional: true } },
      optionalDependencies: { 'native-fixture': '*', 'other-platform': '*' },
    };
    writePackage(root, 'node_modules/dual', dual, {
      'esm.js': 'export default 99;',
      'cjs.cjs':
        "module.exports = [require('child'), require('@fixture/peer')];",
    });
    writePackage(root, '.next/standalone/node_modules/dual', dual, {
      'esm.js': 'export default 99;',
    });
    writePackage(
      root,
      'node_modules/other',
      { main: 'index.cjs', dependencies: { child: '*' } },
      {
        'index.cjs': "module.exports = require('child');",
      },
    );
    writePackage(
      root,
      'node_modules/child',
      { main: 'index.cjs' },
      { 'index.cjs': 'module.exports = 1;' },
    );
    writePackage(
      root,
      'node_modules/other/node_modules/child',
      { main: 'index.cjs' },
      { 'index.cjs': 'module.exports = 2;' },
    );
    writePackage(
      root,
      'node_modules/@fixture/peer',
      { main: 'index.cjs' },
      { 'index.cjs': 'module.exports = 3;' },
    );
    writePackage(
      root,
      'node_modules/native-fixture',
      {},
      { 'binding.node': 'native-binary-fixture' },
    );

    const result = runHydrator(root);
    expect(result.status).toBe(0);
    expect(
      fs.existsSync(
        path.join(root, '.next/standalone/node_modules/types-only'),
      ),
    ).toBe(false);
    const isolated = makeTempRoot();
    fs.cpSync(path.join(root, '.next/standalone'), isolated, {
      recursive: true,
    });
    const resolved = spawnSync(
      NODE,
      [
        '-e',
        "console.log(JSON.stringify([require('dual'), require('other')]))",
      ],
      {
        cwd: isolated,
        encoding: 'utf8',
      },
    );
    expect(resolved.status).toBe(0);
    expect(JSON.parse(resolved.stdout)).toEqual([[1, 3], 2]);
    expect(
      fs.readFileSync(
        path.join(isolated, 'node_modules/native-fixture/binding.node'),
        'utf8',
      ),
    ).toBe('native-binary-fixture');
  });

  it('fails on a missing required dependency before changing the image', () => {
    const root = makeTempRoot();
    prepareStandaloneFixture(root);
    addRuntimeImport(root, "export { default } from 'incomplete';");
    writePackage(root, 'node_modules/incomplete', {
      dependencies: { 'missing-required': '*' },
    });
    const before = fs.readFileSync(
      path.join(root, '.next/standalone/server.js'),
      'utf8',
    );

    const result = runHydrator(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Missing runtime package missing-required');
    expect(
      fs.readFileSync(path.join(root, '.next/standalone/server.js'), 'utf8'),
    ).toBe(before);
  });

  it('preflights newly discovered package destinations before any image write', () => {
    const root = makeTempRoot();
    const outside = makeTempRoot();
    prepareStandaloneFixture(root);
    addRuntimeImport(root, "export { default } from 'linked';");
    writePackage(
      root,
      'node_modules/linked',
      { main: 'index.cjs' },
      { 'index.cjs': 'module.exports = 1;' },
    );
    writeFile(path.join(outside, 'sentinel'), 'preserve');
    fs.mkdirSync(path.join(root, '.next/standalone/node_modules'), {
      recursive: true,
    });
    fs.symlinkSync(
      outside,
      path.join(root, '.next/standalone/node_modules/linked'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const before = fs.readFileSync(
      path.join(root, '.next/standalone/server.js'),
      'utf8',
    );

    const result = runHydrator(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('symlink or junction');
    expect(fs.readFileSync(path.join(outside, 'sentinel'), 'utf8')).toBe(
      'preserve',
    );
    expect(
      fs.readFileSync(path.join(root, '.next/standalone/server.js'), 'utf8'),
    ).toBe(before);
  });
});
