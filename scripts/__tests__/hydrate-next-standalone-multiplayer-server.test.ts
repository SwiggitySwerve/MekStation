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

function prepareNativeAlias(root: string, inClosure: boolean): string {
  prepareStandaloneFixture(root);
  if (inClosure)
    addRuntimeImport(root, "export { default } from 'native-library';");
  writePackage(
    root,
    'node_modules/native-library',
    { name: 'native-library', version: '1.0.0', main: 'index.cjs' },
    {
      'binding.gyp': '{}',
      'build/Release/fixture.node': 'node-abi-fixture',
      'index.cjs': 'module.exports = { answer: 42 };',
    },
  );
  const alias = path.join(
    root,
    '.next/standalone/.next/node_modules/native-library-0123456789abcdef',
  );
  mkdirp(path.dirname(alias));
  fs.symlinkSync(
    path.join(root, 'node_modules/native-library'),
    alias,
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  return alias;
}

describe('hydrate-next-standalone-multiplayer-server', () => {
  (process.platform === 'win32' ? it : it.skip)(
    'forwards a native alias with a lowercased cwd drive letter',
    () => {
      const root = makeTempRoot();
      const alias = prepareNativeAlias(root, true);
      const result = runHydrator(root[0].toLowerCase() + root.slice(1));
      expect(result.status).toBe(0);
      expect(
        fs.existsSync(path.join(alias, 'build/Release/fixture.node')),
      ).toBe(false);
      expect(fs.existsSync(path.join(alias, 'index.cjs'))).toBe(true);
    },
  );

  it('refuses a native alias outside the runtime closure before writing', () => {
    const root = makeTempRoot();
    const alias = prepareNativeAlias(root, false);
    const server = path.join(root, '.next/standalone/server.js');
    const before = fs.readFileSync(server, 'utf8');
    const result = runHydrator(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('has no canonical runtime package');
    expect(fs.readFileSync(server, 'utf8')).toBe(before);
    expect(
      fs.existsSync(
        path.join(root, '.next/standalone/server.next-config.json'),
      ),
    ).toBe(false);
    expect(fs.lstatSync(alias).isSymbolicLink()).toBe(true);
  });

  it('hydrates a relative Turbopack alias copied into the standalone package tree', () => {
    const root = makeTempRoot();
    prepareStandaloneFixture(root);
    addRuntimeImport(root, "export { default } from 'native-library';");
    writePackage(
      root,
      'node_modules/native-library',
      { name: 'native-library', version: '1.0.0', main: 'index.cjs' },
      { 'binding.gyp': '{}', 'index.cjs': 'module.exports = { answer: 42 };' },
    );
    const standalone = path.join(root, '.next/standalone');
    const tracedPackage = path.join(standalone, 'node_modules/native-library');
    fs.cpSync(path.join(root, 'node_modules/native-library'), tracedPackage, {
      recursive: true,
    });
    const alias = path.join(
      standalone,
      '.next/node_modules/native-library-0123456789abcdef',
    );
    mkdirp(path.dirname(alias));
    // Next preserves ../../node_modules/native-library on Linux. A Windows
    // junction resolves the same target inside the standalone package tree.
    fs.symlinkSync(
      path.relative(path.dirname(alias), tracedPackage),
      alias,
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    writeFile(
      path.join(standalone, '.next/server/probe.cjs'),
      "const direct = require('native-library'); const alias = require('native-library-0123456789abcdef'); console.log(JSON.stringify({ same: direct === alias, answer: alias.answer }));",
    );

    const result = runHydrator(root);
    expect(result.status).toBe(0);
    expect(fs.lstatSync(alias).isSymbolicLink()).toBe(false);
    const isolated = makeTempRoot();
    fs.cpSync(standalone, isolated, { recursive: true });
    const probe = spawnSync(
      NODE,
      [path.join(isolated, '.next/server/probe.cjs')],
      { cwd: isolated, encoding: 'utf8' },
    );
    expect(probe.status).toBe(0);
    expect(JSON.parse(probe.stdout)).toEqual({ same: true, answer: 42 });
  });

  it('forwards a native CommonJS alias to the single canonical package after relocation', () => {
    const root = makeTempRoot();
    prepareStandaloneFixture(root);
    addRuntimeImport(root, "export { default } from 'native-library';");
    writePackage(
      root,
      'node_modules/native-library',
      {
        name: 'native-library',
        main: 'index.cjs',
      },
      {
        'binding.gyp': '{}',
        'build/Release/fixture.node': 'node-abi-fixture',
        'index.cjs':
          "module.exports = { binding: require.resolve('./build/Release/fixture.node') };",
      },
    );
    const alias = path.join(
      root,
      '.next/standalone/.next/node_modules/native-library-0123456789abcdef',
    );
    mkdirp(path.dirname(alias));
    fs.symlinkSync(
      path.join(root, 'node_modules/native-library'),
      alias,
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    writeFile(
      path.join(root, '.next/standalone/.next/server/probe.cjs'),
      "const direct = require('native-library'); const alias = require('native-library-0123456789abcdef'); console.log(JSON.stringify({ same: direct === alias, binding: alias.binding }));",
    );

    const result = runHydrator(root);
    expect(result.status).toBe(0);
    expect(fs.lstatSync(alias).isSymbolicLink()).toBe(false);
    expect(fs.existsSync(path.join(alias, 'build/Release/fixture.node'))).toBe(
      false,
    );
    const isolated = makeTempRoot();
    fs.cpSync(path.join(root, '.next/standalone'), isolated, {
      recursive: true,
    });
    const probe = spawnSync(
      NODE,
      [path.join(isolated, '.next/server/probe.cjs')],
      {
        cwd: isolated,
        encoding: 'utf8',
      },
    );
    expect(probe.status).toBe(0);
    expect(JSON.parse(probe.stdout)).toEqual({
      same: true,
      binding: path.join(
        isolated,
        'node_modules/native-library/build/Release/fixture.node',
      ),
    });
  });

  it('materializes Turbopack external aliases for an isolated image', () => {
    const root = makeTempRoot();
    prepareStandaloneFixture(root);
    addRuntimeImport(root, "export { default } from 'dual';");
    writePackage(
      root,
      'node_modules/dual',
      {
        name: 'dual',
        exports: { import: './esm.js', require: './index.cjs' },
        dependencies: { child: '*' },
      },
      {
        'index.cjs': "module.exports = require('child');",
        'esm.js': 'export default 99;',
        'binding.gyp': '{}',
      },
    );
    writePackage(
      root,
      'node_modules/child',
      { name: 'child', main: 'index.cjs' },
      {
        'index.cjs': 'module.exports = 7;',
      },
    );
    const alias = path.join(
      root,
      '.next/standalone/.next/node_modules/dual-0123456789abcdef',
    );
    mkdirp(path.dirname(alias));
    fs.symlinkSync(
      path.join(root, 'node_modules/dual'),
      alias,
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    writeFile(
      path.join(root, '.next/standalone/.next/server/probe.cjs'),
      "console.log(require('dual-0123456789abcdef'));",
    );

    const result = runHydrator(root);
    expect(result.status).toBe(0);
    expect(fs.lstatSync(alias).isSymbolicLink()).toBe(false);
    expect(fs.existsSync(path.join(alias, 'esm.js'))).toBe(true);
    const isolated = makeTempRoot();
    fs.cpSync(path.join(root, '.next/standalone'), isolated, {
      recursive: true,
    });
    const probe = spawnSync(
      NODE,
      [path.join(isolated, '.next/server/probe.cjs')],
      {
        cwd: isolated,
        encoding: 'utf8',
      },
    );
    expect(probe.status).toBe(0);
    expect(probe.stdout.trim()).toBe('7');
  });

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

  it('copies every file src imports from outside src, transitively, into the standalone tree', () => {
    // The multiplayer runtime loads src through tsx inside .next/standalone, so
    // a src import into scripts/ must exist there too. #2655's catalogLoader
    // import of scripts/equipment-catalog/capital-bv.json was missing and every
    // socket failed with runtime-unavailable (2026-11-04 nightly, 58 E2E failures).
    const tmpRoot = makeTempRoot();
    prepareStandaloneFixture(tmpRoot);
    writeFile(
      path.join(tmpRoot, 'src/utils/loader.ts'),
      [
        "import facts from '../../scripts/equipment-catalog/capital-bv.json';",
        "import { helper } from '../../scripts/helpers/setup';",
        "import catalog from '../../public/data/units/battlemechs/index.json';",
        "import { z } from 'zod';",
        'export { facts, helper, catalog, z };',
      ].join('\n'),
    );
    writeFile(
      path.join(tmpRoot, 'src/utils/__tests__/loader.test.ts'),
      "import fixture from '../../../scripts/test-only/fixture.json';",
    );
    writeFile(
      path.join(tmpRoot, 'src/components/Bar.stories.tsx'),
      "import mock from '../../.storybook/mocks/device.tsx';",
    );
    writeFile(path.join(tmpRoot, '.storybook/mocks/device.tsx'), '');
    writeFile(
      path.join(tmpRoot, 'scripts/equipment-catalog/capital-bv.json'),
      '{"rows":[1]}',
    );
    writeFile(
      path.join(tmpRoot, 'scripts/helpers/setup.ts'),
      "export { default as helper } from './nested.json';",
    );
    writeFile(path.join(tmpRoot, 'scripts/helpers/nested.json'), '{"n":2}');
    writeFile(path.join(tmpRoot, 'scripts/test-only/fixture.json'), '{}');

    const result = runHydrator(tmpRoot);

    expect(result.status).toBe(0);
    const standalone = path.join(tmpRoot, '.next/standalone');
    for (const file of [
      'scripts/equipment-catalog/capital-bv.json',
      'scripts/helpers/setup.ts',
      'scripts/helpers/nested.json',
    ])
      expect(fs.readFileSync(path.join(standalone, file), 'utf8')).toBe(
        fs.readFileSync(path.join(tmpRoot, file), 'utf8'),
      );
    // Test and story imports are not runtime closure.
    expect(
      fs.existsSync(path.join(standalone, 'scripts/test-only/fixture.json')),
    ).toBe(false);
    expect(
      fs.existsSync(path.join(standalone, '.storybook/mocks/device.tsx')),
    ).toBe(false);
  });

  it('fails before writing when a src import outside src does not exist', () => {
    const tmpRoot = makeTempRoot();
    prepareStandaloneFixture(tmpRoot);
    writeFile(
      path.join(tmpRoot, 'src/utils/loader.ts'),
      "import facts from '../../scripts/missing.json';\nexport { facts };",
    );

    const result = runHydrator(tmpRoot);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('scripts/missing.json');
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

describe('repository-local runtime inputs', () => {
  it('preflights imported file destinations before changing the image', () => {
    const root = makeTempRoot();
    const outside = makeTempRoot();
    prepareStandaloneFixture(root);
    writeFile(path.join(root, 'runtime-inputs/facts.json'), '{"value":42}');
    addRuntimeImport(
      root,
      "export { default } from '../runtime-inputs/facts.json';",
    );
    const image = path.join(root, '.next/standalone');
    const before = fs.readFileSync(path.join(image, 'server.js'));
    writeFile(path.join(outside, 'sentinel'), 'preserve');
    fs.symlinkSync(
      outside,
      path.join(image, 'runtime-inputs'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );

    const result = runHydrator(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('symlink or junction');
    expect(fs.readFileSync(path.join(image, 'server.js'))).toEqual(before);
    expect(fs.readdirSync(outside)).toEqual(['sentinel']);
  });

  it('copies repository-local runtime JSON outside src into the isolated image', () => {
    const root = makeTempRoot();
    prepareStandaloneFixture(root);
    const relative = 'scripts/runtime-facts.json';
    const contents = '{"value":42,"source":"repository runtime input"}\r\n';
    writeFile(path.join(root, relative), contents);
    addRuntimeImport(
      root,
      "export { default } from '../scripts/runtime-facts.json';",
    );

    const result = runHydrator(root);
    expect(result.status).toBe(0);
    const image = path.join(root, '.next/standalone');
    expect(fs.existsSync(path.join(image, relative))).toBe(true);
    expect(fs.readFileSync(path.join(image, relative))).toEqual(
      fs.readFileSync(path.join(root, relative)),
    );
    const probe = spawnSync(
      NODE,
      ['-e', "console.log(require('./scripts/runtime-facts.json').value)"],
      {
        cwd: image,
        encoding: 'utf8',
      },
    );
    expect(probe.status).toBe(0);
    expect(probe.stdout.trim()).toBe('42');
  });
});

describe('standalone deployment contents', () => {
  it('omits Storybook MDX docs while retaining their sources and public assets', () => {
    const root = makeTempRoot();
    prepareStandaloneFixture(root);
    const image = path.join(root, '.next/standalone');
    const docs = ['Colors', 'Introduction', 'Spacing', 'Typography'].map(
      (name) => `src/docs/${name}.mdx`,
    );
    const contents = '# Storybook documentation';
    for (const file of docs) writeFile(path.join(root, file), contents);
    const publicDoc = 'public/docs/Colors.mdx';
    const runtimeSource = 'src/docs/runtime.ts';
    writeFile(path.join(root, publicDoc), contents);
    writeFile(path.join(root, runtimeSource), 'export {};');

    const result = runHydrator(root);
    expect(result.status).toBe(0);
    for (const file of docs) {
      expect(fs.existsSync(path.join(image, file))).toBe(false);
      expect(fs.readFileSync(path.join(root, file), 'utf8')).toBe(contents);
    }
    expect(fs.readFileSync(path.join(image, publicDoc), 'utf8')).toBe(contents);
    expect(fs.readFileSync(path.join(image, runtimeSource), 'utf8')).toBe(
      'export {};',
    );
  });

  it('keeps public bytes and native runtime files while dropping build inputs', () => {
    const root = makeTempRoot();
    prepareStandaloneFixture(root);
    const image = path.join(root, '.next/standalone');
    const catalog = 'public/data/units/vehicles/Büffel.test.json';
    const contents = '{"chassis":"Büffel","weight":50}\r\n';
    writeFile(path.join(root, catalog), contents);
    writeFile(path.join(root, 'public/source.js.map'), 'public asset');
    writeFile(path.join(root, 'src/__tests__/fixture.json'), '{}');
    writeFile(path.join(root, 'src/component.stories.tsx'), 'export {};');
    writeFile(path.join(root, '.next/static/chunks/app.js.map'), '{}');
    const trace = '.next/server/pages/probe.js.nft.json';
    writeFile(path.join(root, trace), '{"files":[]}');
    writeFile(path.join(image, trace), '{"files":[]}');
    addRuntimeImport(root, "export { default } from 'better-sqlite3';");
    writePackage(
      root,
      'node_modules/better-sqlite3',
      {
        name: 'better-sqlite3',
        main: 'lib/index.cjs',
      },
      {
        'lib/index.cjs': 'module.exports = 42;',
        'build/Release/better_sqlite3.node': 'native binding',
        'deps/sqlite3.c': 'native build source',
        'src/database.cc': 'native build source',
        'README.md': 'development documentation',
      },
    );

    const result = runHydrator(root);
    expect(result.status).toBe(0);
    for (const file of [
      trace,
      'src/__tests__/fixture.json',
      'src/component.stories.tsx',
      '.next/static/chunks/app.js.map',
      'node_modules/better-sqlite3/deps/sqlite3.c',
      'node_modules/better-sqlite3/src/database.cc',
    ])
      expect(fs.existsSync(path.join(image, file))).toBe(false);
    expect(fs.readFileSync(path.join(image, catalog))).toEqual(
      fs.readFileSync(path.join(root, catalog)),
    );
    expect(
      fs.readFileSync(path.join(image, 'public/source.js.map'), 'utf8'),
    ).toBe('public asset');
    expect(
      fs.readFileSync(
        path.join(image, 'node_modules/better-sqlite3/README.md'),
        'utf8',
      ),
    ).toBe('development documentation');
    expect(fs.existsSync(path.join(root, trace))).toBe(true);
    expect(fs.existsSync(path.join(image, 'src/index.ts'))).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          image,
          'node_modules/better-sqlite3/build/Release/better_sqlite3.node',
        ),
      ),
    ).toBe(true);
    const probe = spawnSync(
      NODE,
      ['-e', "console.log(require('better-sqlite3'))"],
      {
        cwd: image,
        encoding: 'utf8',
      },
    );
    expect(probe.status).toBe(0);
    expect(probe.stdout.trim()).toBe('42');
  });
});

describe('standalone loader closure', () => {
  it.each([false, true])(
    'keeps nested loader tools and preserves Next-traced root tools (traced: %s)',
    (traced) => {
      const root = makeTempRoot();
      prepareStandaloneFixture(root);
      writePackage(
        root,
        'node_modules/tsx',
        {
          name: 'tsx',
          main: 'index.js',
          dependencies: { esbuild: '1.0.0' },
        },
        { 'index.js': "module.exports = require('esbuild');" },
      );
      writePackage(
        root,
        'node_modules/tsx/node_modules/esbuild',
        {
          name: 'esbuild',
          main: 'index.js',
          dependencies: { '@esbuild/test-platform': '1.0.0' },
        },
        { 'index.js': "module.exports = require('@esbuild/test-platform');" },
      );
      writePackage(
        root,
        'node_modules/tsx/node_modules/@esbuild/test-platform',
        {
          name: '@esbuild/test-platform',
          main: 'index.js',
        },
        { 'index.js': 'module.exports = 42;' },
      );
      const image = path.join(root, '.next/standalone');
      if (traced)
        writePackage(
          root,
          '.next/standalone/node_modules/esbuild',
          {
            name: 'esbuild',
            main: 'index.js',
          },
          { 'index.js': 'module.exports = 99;' },
        );

      const result = runHydrator(root);
      expect(result.stderr).toBe('');
      expect(result.status).toBe(0);
      expect(fs.existsSync(path.join(image, 'node_modules/esbuild'))).toBe(
        traced,
      );
      expect(fs.existsSync(path.join(image, 'node_modules/@esbuild'))).toBe(
        false,
      );
      expect(
        fs.existsSync(
          path.join(image, 'node_modules/tsx/node_modules/esbuild/index.js'),
        ),
      ).toBe(true);
      if (traced)
        expect(
          fs.readFileSync(
            path.join(image, 'node_modules/esbuild/index.js'),
            'utf8',
          ),
        ).toBe('module.exports = 99;');
      const probe = spawnSync(NODE, ['-e', "console.log(require('tsx'))"], {
        cwd: image,
        encoding: 'utf8',
      });
      expect(probe.stderr).toBe('');
      expect(probe.status).toBe(0);
      expect(probe.stdout.trim()).toBe('42');
    },
  );
});

describe('generated desktop outputs', () => {
  it('prunes previous build products while preserving canonical public paths', () => {
    const root = makeTempRoot();
    prepareStandaloneFixture(root);
    const image = path.join(root, '.next/standalone');
    const outputs = [
      'dist',
      'release',
      'release-test',
      '.tmp',
      '.electron-cache',
      '.electron-native-cache',
    ];
    for (const directory of outputs)
      writeFile(
        path.join(image, 'desktop', directory, 'old/manifest.json'),
        '{}',
      );
    const publicPath = 'public/desktop/release/retained.json';
    writeFile(path.join(root, publicPath), '{"retain":"public bytes"}\r\n');
    const result = runHydrator(root);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    for (const directory of outputs)
      expect(fs.existsSync(path.join(image, 'desktop', directory))).toBe(false);
    expect(fs.readFileSync(path.join(image, publicPath))).toEqual(
      fs.readFileSync(path.join(root, publicPath)),
    );
    expect(
      fs.existsSync(
        path.join(image, 'public/data/units/battlemechs/index.json'),
      ),
    ).toBe(true);
  });

  it('refuses required runtime imports from generated outputs before changing the image', () => {
    const root = makeTempRoot();
    prepareStandaloneFixture(root);
    writeFile(path.join(root, 'desktop/release/facts.json'), '{"value":42}');
    addRuntimeImport(
      root,
      "export { default } from '../desktop/release/facts.json';",
    );
    const server = path.join(root, '.next/standalone/server.js');
    const before = fs.readFileSync(server);
    const result = runHydrator(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'Required runtime input excluded by deployment policy',
    );
    expect(fs.readFileSync(server)).toEqual(before);
  });
});
