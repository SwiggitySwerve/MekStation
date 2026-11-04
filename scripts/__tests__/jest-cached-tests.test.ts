/* eslint-disable @typescript-eslint/no-require-imports */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

type Run = {
  exitCode: number;
  results: Map<string, 'passed' | 'failed'>;
};
type Keyed = {
  key?: string;
  unkeyable?: string;
  repoWide?: boolean;
  why?: string[];
};
interface Store {
  get: (key: string) => unknown;
  put: (key: string, entry: object) => void;
  touch: (key: string) => void;
  remove: (key: string) => void;
  prune: (days: number) => number;
}
interface Report {
  mode: string;
  files: number;
  hits: number;
  executed: number;
  verified: string[];
  stale: string[];
  exitCode: number;
}
const lib = require('../jest/cached-tests.js') as {
  buildFileIndex: (
    root: string,
    exclude?: string | null,
  ) => Map<string, string>;
  createKeyer: (opts: {
    root: string;
    index: Map<string, string>;
    env?: Record<string, string | undefined>;
    nodeVersion?: string;
    execOptions?: string[];
  }) => { keyFor: (file: string) => Keyed };
  createStore: (dir: string) => Store;
  runCached: (opts: {
    files: string[];
    keyer: { keyFor: (file: string) => Keyed };
    store: Store;
    execute: (files: string[]) => Promise<Run>;
    mode: 'use' | 'record' | 'off';
    verifyHits: number;
    seed: string;
  }) => Promise<Report>;
  resolveMode: (opts: {
    uncached: boolean;
    passthrough: string[];
    env: Record<string, string | undefined>;
  }) => string;
  verifyOrder: (files: string[], seed: string) => string[];
};

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

function makeRepo(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cached-tests-'));
  roots.push(root);
  write(root, files);
  return root;
}
function write(root: string, files: Record<string, string>): void {
  for (const [rel, text] of Object.entries(files)) {
    const abs = path.join(root, ...rel.split('/'));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text);
  }
}
function keyOf(
  root: string,
  file: string,
  env: Record<string, string | undefined> = {},
): Keyed {
  const index = lib.buildFileIndex(root);
  return lib.createKeyer({ root, index, env }).keyFor(file);
}

describe('test result cache key', () => {
  const base = {
    'src/lib/b.ts': 'export const b = 1;\n',
    'src/lib/deep.ts': 'export const deep = 1;\n',
    'src/lib/c.ts': "import { deep } from './deep';\nexport const c = deep;\n",
    'src/lib/dir/index.ts': "export { c } from '../c';\n",
    'src/unrelated.ts': 'export const u = 1;\n',
    'src/a.test.ts':
      "import { b } from '@/lib/b';\nimport { c } from './lib/dir';\ntest('x', () => expect(b + c).toBe(2));\n",
  };

  it('is stable for identical inputs', () => {
    const root = makeRepo(base);
    expect(keyOf(root, 'src/a.test.ts').key).toBe(
      keyOf(root, 'src/a.test.ts').key,
    );
  });

  it('changes when the test, a direct import or a transitive import changes', () => {
    const root = makeRepo(base);
    const before = keyOf(root, 'src/a.test.ts').key;
    for (const [file, text] of [
      ['src/a.test.ts', base['src/a.test.ts'] + '// edit\n'],
      ['src/lib/b.ts', 'export const b = 2;\n'],
      // via ./lib/dir (index.ts) -> ../c -> ./deep
      ['src/lib/deep.ts', 'export const deep = 2;\n'],
    ] as const) {
      write(root, { [file]: text });
      expect(keyOf(root, 'src/a.test.ts').key).not.toBe(before);
      write(root, { [file]: base[file] }); // restore
      expect(keyOf(root, 'src/a.test.ts').key).toBe(before);
    }
  });

  it('ignores files outside the closure', () => {
    const root = makeRepo(base);
    const before = keyOf(root, 'src/a.test.ts');
    write(root, { 'src/unrelated.ts': 'export const u = 99;\n' });
    expect(keyOf(root, 'src/a.test.ts').key).toBe(before.key);
    expect(before.repoWide).toBe(false);
  });

  it('includes the test file’s snapshot', () => {
    const root = makeRepo({
      ...base,
      'src/__snapshots__/a.test.ts.snap': 'exports[`x 1`] = `1`;\n',
    });
    const before = keyOf(root, 'src/a.test.ts').key;
    write(root, {
      'src/__snapshots__/a.test.ts.snap': 'exports[`x 1`] = `2`;\n',
    });
    expect(keyOf(root, 'src/a.test.ts').key).not.toBe(before);
  });

  it('keys a data read on the directory it names, and only that one', () => {
    const root = makeRepo({
      'public/data/units/a.json': '{"mass":50}',
      'docs/readme.md': 'hi',
      'src/reader.test.ts': [
        "import * as fs from 'node:fs';",
        "import * as path from 'node:path';",
        "const file = path.join(process.cwd(), 'public', 'data', 'units', 'a.json');",
        "test('reads', () => { expect(fs.readFileSync(file, 'utf8')).toContain('mass'); });",
      ].join('\n'),
    });
    const before = keyOf(root, 'src/reader.test.ts');
    expect(before.repoWide).toBe(false);
    write(root, { 'docs/readme.md': 'changed' });
    expect(keyOf(root, 'src/reader.test.ts').key).toBe(before.key);
    write(root, { 'public/data/units/a.json': '{"mass":55}' });
    expect(keyOf(root, 'src/reader.test.ts').key).not.toBe(before.key);
    // a new file in the data directory is an input too
    write(root, { 'public/data/units/a.json': '{"mass":50}' });
    expect(keyOf(root, 'src/reader.test.ts').key).toBe(before.key);
    write(root, { 'public/data/units/b.json': '{}' });
    expect(keyOf(root, 'src/reader.test.ts').key).not.toBe(before.key);
  });

  it('fails open to a whole-repo key when it reads files from a path it cannot name', () => {
    const root = makeRepo({
      'other.txt': 'x',
      'src/blind.test.ts': [
        "import * as fs from 'node:fs';",
        "test('reads', () => { fs.readFileSync(process.argv[2], 'utf8'); });",
      ].join('\n'),
    });
    const before = keyOf(root, 'src/blind.test.ts');
    expect(before.repoWide).toBe(true);
    write(root, { 'other.txt': 'y' });
    expect(keyOf(root, 'src/blind.test.ts').key).not.toBe(before.key);
  });

  it.each([
    ['dynamic require', 'const m = require(process.argv[2]);'],
    [
      'child process',
      "import { execSync } from 'node:child_process'; execSync('x');",
    ],
    ['unresolved relative import', "import './does-not-exist';"],
  ])('uses a whole-repo key for %s', (_name, body) => {
    const root = makeRepo({
      'other.txt': 'x',
      'src/t.test.ts': `${body}\ntest('x', () => {});\n`,
    });
    const before = keyOf(root, 'src/t.test.ts');
    expect(before.repoWide).toBe(true);
    write(root, { 'other.txt': 'y' });
    expect(keyOf(root, 'src/t.test.ts').key).not.toBe(before.key);
  });

  it('does not treat words in comments as loads or reads', () => {
    const root = makeRepo({
      'other.txt': 'x',
      'src/t.test.ts': [
        '/**',
        ' * legacy import (task 1.3) and readFile of nothing',
        " * import { x } from './missing';",
        ' */',
        "test('x', () => {});",
      ].join('\n'),
    });
    const before = keyOf(root, 'src/t.test.ts');
    expect(before.repoWide).toBe(false);
  });

  it('names a data directory from code, not from a comment that mentions it', () => {
    const root = makeRepo({
      'src/lib/noted.ts': [
        '/**',
        ' * Mirrors what `src/utils/other` does with the cache.',
        ' */',
        "import * as fs from 'node:fs';",
        "export const read = () => fs.readFileSync(process.cwd() + '/public/a.json', 'utf8');",
      ].join('\n'),
      'public/a.json': '{}',
      'src/utils/other.ts': 'export const v = 1;\n',
      'src/t.test.ts':
        "import { read } from './lib/noted';\ntest('x', () => read());\n",
    });
    const before = keyOf(root, 'src/t.test.ts');
    expect(before.repoWide).toBe(false);
    expect(before.domains).toEqual(['public/']);
    // a change under src/ outside the closure no longer moves the key...
    write(root, { 'src/utils/other.ts': 'export const v = 2;\n' });
    expect(keyOf(root, 'src/t.test.ts').key).toBe(before.key);
    // ...but the directory the code does read still does
    write(root, { 'public/a.json': '{"x":1}' });
    expect(keyOf(root, 'src/t.test.ts').key).not.toBe(before.key);
  });

  it('keys on the env vars the closure reads, and refuses a bare process.env', () => {
    const root = makeRepo({
      'src/lib/flag.ts': 'export const on = process.env.FEATURE_X === "1";\n',
      'src/t.test.ts':
        "import { on } from './lib/flag';\ntest('x', () => on);\n",
      'src/bare.test.ts':
        'const env = { ...process.env };\ntest("x", () => env);\n',
    });
    const off = keyOf(root, 'src/t.test.ts', { FEATURE_X: '0' }).key;
    expect(keyOf(root, 'src/t.test.ts', { FEATURE_X: '0' }).key).toBe(off);
    expect(keyOf(root, 'src/t.test.ts', { FEATURE_X: '1' }).key).not.toBe(off);
    expect(
      keyOf(root, 'src/t.test.ts', { FEATURE_X: '0', UNRELATED: 'zzz' }).key,
    ).toBe(off);
    expect(keyOf(root, 'src/bare.test.ts').unkeyable).toMatch(/process\.env/);
  });

  it('changes when the lockfile or jest config changes', () => {
    const root = makeRepo({
      ...base,
      'package-lock.json': '{"a":1}',
      'jest.config.js': 'module.exports = {};\n',
    });
    const before = keyOf(root, 'src/a.test.ts').key;
    write(root, { 'package-lock.json': '{"a":2}' });
    const afterLock = keyOf(root, 'src/a.test.ts').key;
    expect(afterLock).not.toBe(before);
    write(root, { 'jest.config.js': 'module.exports = { x: 1 };\n' });
    expect(keyOf(root, 'src/a.test.ts').key).not.toBe(afterLock);
  });
});

// Each case below was a way for a stale pass to be reused (code review of the
// first version); every one must now change the key or make the file unkeyable.
describe('test result cache key: false-hit regressions', () => {
  const git = (root: string, ...args: string[]) =>
    execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  const gitRepo = (tracked: Record<string, string>, ignore: string): string => {
    const root = makeRepo({ ...tracked, '.gitignore': ignore });
    git(root, 'init', '-q');
    git(root, 'add', '-A');
    return root;
  };

  it('hashes git-ignored data and .env files, which are inputs too', () => {
    const root = gitRepo(
      {
        'src/gen.test.ts': [
          "import * as fs from 'node:fs';",
          "import * as path from 'node:path';",
          "test('x', () => fs.readFileSync(path.join(process.cwd(), 'gen', 'data.json')));",
        ].join('\n'),
      },
      'gen/\n.env.local\n',
    );
    write(root, { 'gen/data.json': '{"a":1}', '.env.local': 'A=1' });
    const before = keyOf(root, 'src/gen.test.ts');
    expect(before.repoWide).toBe(false); // gen/ is a named directory
    write(root, { 'gen/data.json': '{"a":2}' });
    const afterData = keyOf(root, 'src/gen.test.ts').key;
    expect(afterData).not.toBe(before.key);
    write(root, { '.env.local': 'A=2' });
    expect(keyOf(root, 'src/gen.test.ts').key).not.toBe(afterData);
  });

  it('keys process.env[NAME] on a same-file string const and refuses any other computed name', () => {
    const root = makeRepo({
      'src/lib/local.ts':
        "const NAME = 'FEATURE_Z';\nexport const on = process.env[NAME] === '1';\n",
      'src/lib/consts.ts': "export const NAME = 'FEATURE_Z';\n",
      'src/lib/imported.ts':
        "import { NAME } from './consts';\nexport const on = process.env[NAME];\n",
      'src/local.test.ts':
        "import { on } from './lib/local';\ntest('x', () => on);\n",
      'src/imported.test.ts':
        "import { on } from './lib/imported';\ntest('x', () => on);\n",
    });
    const off = keyOf(root, 'src/local.test.ts', { FEATURE_Z: '0' }).key;
    expect(keyOf(root, 'src/local.test.ts', { FEATURE_Z: '1' }).key).not.toBe(
      off,
    );
    expect(keyOf(root, 'src/imported.test.ts').unkeyable).toMatch(
      /process\.env\[/,
    );
  });

  it('puts the Jest options that can change a result, and the projects, in the key', () => {
    const root = makeRepo({ 'src/a.test.ts': "test('x', () => {});\n" });
    const index = lib.buildFileIndex(root);
    const keyWith = (execOptions: string[]) =>
      lib
        .createKeyer({ root, index, env: {}, execOptions })
        .keyFor('src/a.test.ts').key;
    expect(keyWith(['--testTimeout=1'])).not.toBe(keyWith([]));
    expect(keyWith(['-t', 'only this'])).not.toBe(keyWith([]));
    expect(keyWith(['project=unit'])).not.toBe(keyWith(['project=a11y']));
  });

  it('includes every existing candidate when an import resolves to both .js and .ts', () => {
    const root = makeRepo({
      'src/lib/x.js': 'exports.x = 1;\n',
      'src/lib/x.ts': 'export const x = 1;\n',
      'src/a.test.ts': "import { x } from './lib/x';\ntest('x', () => x);\n",
    });
    const before = keyOf(root, 'src/a.test.ts').key;
    write(root, { 'src/lib/x.js': 'exports.x = 2;\n' });
    expect(keyOf(root, 'src/a.test.ts').key).not.toBe(before);
    write(root, { 'src/lib/x.js': 'exports.x = 1;\n' });
    write(root, { 'src/lib/x.ts': 'export const x = 2;\n' });
    expect(keyOf(root, 'src/a.test.ts').key).not.toBe(before);
  });

  it('still finds an import whose braces hold a comment with parentheses', () => {
    const root = makeRepo({
      'src/dep.ts': 'export const x = 1;\n',
      'src/a.test.ts':
        "import {\n  /* comment (units) */ x,\n} from './dep';\ntest('x', () => x);\n",
    });
    const before = keyOf(root, 'src/a.test.ts').key;
    write(root, { 'src/dep.ts': 'export const x = 2;\n' });
    expect(keyOf(root, 'src/a.test.ts').key).not.toBe(before);
  });

  it('widens a __dirname read to the ancestor its parent segments reach', () => {
    const root = makeRepo({
      'src/value.txt': '1',
      'other.txt': 'x',
      'src/__tests__/read.test.ts': [
        "import * as fs from 'node:fs';",
        "import * as path from 'node:path';",
        "test('x', () => fs.readFileSync(path.join(__dirname, '../value.txt')));",
      ].join('\n'),
    });
    const before = keyOf(root, 'src/__tests__/read.test.ts');
    expect(before.repoWide).toBe(false);
    write(root, { 'other.txt': 'y' });
    expect(keyOf(root, 'src/__tests__/read.test.ts').key).toBe(before.key);
    write(root, { 'src/value.txt': '2' });
    expect(keyOf(root, 'src/__tests__/read.test.ts').key).not.toBe(before.key);
  });

  it('refuses a key when a symlink sits inside a data domain it would follow', () => {
    const root = gitRepo(
      {
        'fixtures/value.txt': '1',
        'src/link.test.ts': [
          "import * as fs from 'node:fs';",
          "import * as path from 'node:path';",
          "test('x', () => fs.readFileSync(path.join(process.cwd(), 'gen', 'link', 'value.txt')));",
        ].join('\n'),
      },
      'gen/\n',
    );
    write(root, { 'gen/anchor.txt': 'a' });
    try {
      fs.symlinkSync(
        path.join(root, 'fixtures'),
        path.join(root, 'gen', 'link'),
        'junction',
      );
    } catch {
      return; // this platform/user cannot create links: nothing to assert
    }
    expect(keyOf(root, 'src/link.test.ts').unkeyable).toMatch(/symlink/);
  });

  it.each([
    ['a concatenated literal name', "process.env['FEATURE_' + 'Z']"],
    [
      'a const initialised by a concatenation',
      "const NAME = 'FEATURE_' + 'Z';\nconst v = process.env[NAME];",
    ],
    [
      'an identifier bound twice (shadowing)',
      "const NAME = 'FEATURE_Z';\nfunction f() { let NAME = 'OTHER'; return process.env[NAME]; }",
    ],
    ['a template literal name', 'process.env[`FEATURE_${suffix}`]'],
  ])('refuses to key process.env read through %s', (_label, body) => {
    const root = makeRepo({
      'src/t.test.ts': `${body}\ntest('x', () => {});\n`,
    });
    expect(keyOf(root, 'src/t.test.ts').unkeyable).toMatch(/process\.env/);
  });

  it('keeps Jest option order and the --ci flag in the key', () => {
    const root = makeRepo({ 'src/a.test.ts': "test('x', () => {});\n" });
    const index = lib.buildFileIndex(root);
    const keyWith = (execOptions: string[]) =>
      lib
        .createKeyer({ root, index, env: {}, execOptions })
        .keyFor('src/a.test.ts').key;
    expect(keyWith(['--a', '--b'])).not.toBe(keyWith(['--b', '--a']));
    expect(keyWith(['--ci'])).not.toBe(keyWith([]));
  });

  it('sees an import whose module string follows a line comment', () => {
    const root = makeRepo({
      'src/dep.ts': 'export const x = 1;\n',
      'src/a.test.ts':
        "import { x } from // note\n  './dep';\ntest('x', () => x);\n",
    });
    const before = keyOf(root, 'src/a.test.ts').key;
    write(root, { 'src/dep.ts': 'export const x = 2;\n' });
    expect(keyOf(root, 'src/a.test.ts').key).not.toBe(before);
  });

  it('counts template-literal parent segments when widening a __dirname read', () => {
    const root = makeRepo({
      'src/value.txt': '1',
      'src/__tests__/read.test.ts': [
        "import * as fs from 'node:fs';",
        "import * as path from 'node:path';",
        "test('x', () => fs.readFileSync(path.join(__dirname, `..`, 'value.txt')));",
      ].join('\n'),
    });
    const before = keyOf(root, 'src/__tests__/read.test.ts').key;
    write(root, { 'src/value.txt': '2' });
    expect(keyOf(root, 'src/__tests__/read.test.ts').key).not.toBe(before);
  });

  it('keys on the full Node version, not just the major', () => {
    const root = makeRepo({ 'src/a.test.ts': "test('x', () => {});\n" });
    const index = lib.buildFileIndex(root);
    const keyFor = (nodeVersion: string) =>
      lib
        .createKeyer({ root, index, env: {}, nodeVersion })
        .keyFor('src/a.test.ts').key;
    expect(keyFor('22.22.0')).not.toBe(keyFor('22.22.1'));
    expect(keyFor('22.22.0')).toBe(keyFor('22.22.0'));
  });
});

// The two env-read shapes behind ~700 of the repo's ~750 formerly uncacheable
// unit files: `process.env[CONST]` where CONST is `'LITERAL' as const`, and a
// small non-exported helper `readEnv(name)` that is only called with literals.
describe('test result cache key: env reads through constants and helpers', () => {
  const testFile = (importFrom: string) =>
    `import { value } from '${importFrom}';\ntest('x', () => value);\n`;
  const keyWithEnv = (
    root: string,
    env: Record<string, string | undefined>,
    file = 'src/a.test.ts',
  ) => keyOf(root, file, env);

  it("keys process.env[X] where X is a `'LITERAL' as const` export", () => {
    const root = makeRepo({
      'src/lib/flag.ts': [
        'export const KEY =',
        "  'FEATURE_A' as const;",
        "export const value = process.env[KEY] === '1';",
      ].join('\n'),
      'src/a.test.ts': testFile('./lib/flag'),
    });
    const off = keyWithEnv(root, { FEATURE_A: '0' });
    expect(off.unkeyable).toBeUndefined();
    expect(keyWithEnv(root, { FEATURE_A: '1' }).key).not.toBe(off.key);
    expect(keyWithEnv(root, { FEATURE_A: '0', OTHER: 'x' }).key).toBe(off.key);
  });

  it.each([
    [
      'a function declaration',
      "function readEnv(name: string) { return process.env[name]; }\nexport const value = readEnv('APP_A') ?? readEnv('APP_B') ?? '0';",
    ],
    [
      'an arrow const',
      "const readEnv = (name: string): string | undefined => process.env[name];\nexport const value = readEnv('APP_A') ?? readEnv('APP_B') ?? '0';",
    ],
  ])(
    'keys a helper that reads process.env[param] (%s) on every literal it is called with',
    (_label, source) => {
      const root = makeRepo({
        'src/lib/v.ts': source,
        'src/a.test.ts': testFile('./lib/v'),
      });
      const base = keyWithEnv(root, { APP_A: '1', APP_B: '2' });
      expect(base.unkeyable).toBeUndefined();
      expect(keyWithEnv(root, { APP_A: '9', APP_B: '2' }).key).not.toBe(
        base.key,
      );
      expect(keyWithEnv(root, { APP_A: '1', APP_B: '9' }).key).not.toBe(
        base.key,
      );
      expect(
        keyWithEnv(root, { APP_A: '1', APP_B: '2', UNRELATED: 'z' }).key,
      ).toBe(base.key);
    },
  );

  it.each([
    [
      'an exported helper (another file may call it with other names)',
      "export function readEnv(name: string) { return process.env[name]; }\nexport const value = readEnv('APP_A');",
    ],
    [
      'a call with a non-literal argument',
      'function readEnv(name: string) { return process.env[name]; }\nconst which = String(Math.random());\nexport const value = readEnv(which);',
    ],
    [
      'the helper passed as a value',
      "function readEnv(name: string) { return process.env[name]; }\nexport const value = ['APP_A'].map(readEnv)[0];",
    ],
    [
      'a reassigned parameter',
      "function readEnv(name: string) { name = name + '_X'; return process.env[name]; }\nexport const value = readEnv('APP_A');",
    ],
    [
      'a helper bound twice',
      "function readEnv(name: string) { return process.env[name]; }\nconst readEnv2 = readEnv;\nfunction readEnv(other: string) { return other; }\nexport const value = readEnv('APP_A');",
    ],
    [
      'a call through a template literal',
      'function readEnv(name: string) { return process.env[name]; }\nexport const value = readEnv(`APP_${1}`);',
    ],
    // review of this change (Sol, round 1)
    [
      'a later method with its own parameter of the same name',
      "function readEnv(name: string) { return process.env[name]; }\nexport const value = readEnv('APP_A');\nexport const api = { read(name: string) { return process.env[name]; } };",
    ],
    [
      'a destructuring write to the parameter',
      "function readEnv(name: string) { [name] = name.split(':'); return process.env[name]; }\nexport const value = readEnv('APP_B:optional');",
    ],
    [
      'an inner function that shadows the parameter',
      "function readEnv(name: string) { const inner = (name: string) => process.env[name]; return inner('X'); }\nexport const value = readEnv('APP_A');",
    ],
    [
      'a default value on the parameter',
      "function readEnv(name: string = 'APP_X') { return process.env[name]; }\nexport const value = readEnv('APP_A');",
    ],
    [
      'a destructured first parameter',
      "function readEnv({ name }: { name: string }) { return process.env[name]; }\nexport const value = readEnv({ name: 'APP_A' });",
    ],
    [
      'the parameter used for something else as well',
      "function readEnv(name: string) { console.log(name); return process.env[name]; }\nexport const value = readEnv('APP_A');",
    ],
  ])('refuses a helper read it cannot follow: %s', (_label, source) => {
    const root = makeRepo({
      'src/lib/v.ts': source,
      'src/a.test.ts': testFile('./lib/v'),
    });
    expect(keyWithEnv(root, {}).unkeyable).toMatch(/process\.env\[/);
  });

  it('keys the real appVersion.ts helper on all five names it is called with', () => {
    const root = makeRepo({
      'src/constants/appVersion.ts': [
        "const FALLBACK_APP_VERSION = '0.0.0';",
        '',
        'function readEnv(name: string): string | undefined {',
        '  const value = process.env[name];',
        "  if (typeof value !== 'string') {",
        '    return undefined;',
        '  }',
        '',
        '  const trimmed = value.trim();',
        '  return trimmed.length > 0 ? trimmed : undefined;',
        '}',
        '',
        'export const APP_VERSION =',
        "  readEnv('NEXT_PUBLIC_APP_VERSION') ??",
        "  readEnv('APP_VERSION') ??",
        "  readEnv('npm_package_version') ??",
        '  FALLBACK_APP_VERSION;',
        '',
        'export const BUILD_VERSION =',
        "  readEnv('NEXT_PUBLIC_BUILD_VERSION') ??",
        "  readEnv('BUILD_VERSION') ??",
        '  APP_VERSION;',
      ].join('\n'),
      'src/a.test.ts': testFile('./constants/appVersion').replace(
        '{ value }',
        '{ APP_VERSION as value }',
      ),
    });
    const base = keyWithEnv(root, {});
    expect(base.unkeyable).toBeUndefined();
    for (const name of [
      'NEXT_PUBLIC_APP_VERSION',
      'APP_VERSION',
      'npm_package_version',
      'NEXT_PUBLIC_BUILD_VERSION',
      'BUILD_VERSION',
    ]) {
      expect(keyWithEnv(root, { [name]: '9.9.9' }).key).not.toBe(base.key);
    }
    expect(keyWithEnv(root, { UNRELATED: 'z' }).key).toBe(base.key);
  });

  it('a changed env value turns a cache hit into a miss, and an unchanged one stays a hit', async () => {
    const root = makeRepo({
      'src/lib/flag.ts':
        "export const KEY = 'FEATURE_A' as const;\nexport const value = process.env[KEY];\n",
      'src/a.test.ts': testFile('./lib/flag'),
    });
    const store = lib.createStore(path.join(root, '.cache'));
    const executed: string[][] = [];
    const execute = async (files: string[]): Promise<Run> => {
      executed.push(files);
      return {
        exitCode: 0,
        results: new Map(files.map((f) => [f, 'passed' as const])),
      };
    };
    const go = (env: Record<string, string | undefined>, verifyHits = 0) =>
      lib.runCached({
        files: ['src/a.test.ts'],
        keyer: lib.createKeyer({
          root,
          index: lib.buildFileIndex(root, '.cache/'),
          env,
        }),
        store,
        execute,
        mode: 'use',
        verifyHits,
        seed: 's',
      });
    expect(await go({ FEATURE_A: '0' })).toMatchObject({
      hits: 0,
      executed: 1,
    });
    expect(await go({ FEATURE_A: '0' })).toMatchObject({
      hits: 1,
      executed: 0,
    });
    // the variable this file reads changed: the recorded pass must not be reused
    expect(await go({ FEATURE_A: '1' })).toMatchObject({
      hits: 0,
      executed: 1,
    });
    // an unrelated variable changed: still a hit
    expect(await go({ FEATURE_A: '1', UNRELATED: 'z' })).toMatchObject({
      hits: 1,
      executed: 0,
    });
  });

  it('--verify-hits still catches a planted wrong result for a file that used to be uncacheable', async () => {
    const root = makeRepo({
      'src/lib/v.ts':
        "function readEnv(name: string) { return process.env[name]; }\nexport const value = readEnv('APP_A');\n",
      'src/a.test.ts': testFile('./lib/v'),
    });
    const store = lib.createStore(path.join(root, '.cache'));
    let outcome: 'passed' | 'failed' = 'passed';
    const execute = async (files: string[]): Promise<Run> => ({
      exitCode: outcome === 'passed' ? 0 : 1,
      results: new Map(files.map((f) => [f, outcome])),
    });
    const go = (verifyHits: number) =>
      lib.runCached({
        files: ['src/a.test.ts'],
        keyer: lib.createKeyer({
          root,
          index: lib.buildFileIndex(root, '.cache/'),
          env: { APP_A: '1' },
        }),
        store,
        execute,
        mode: 'use',
        verifyHits,
        seed: 's',
      });
    expect(await go(0)).toMatchObject({ hits: 0, executed: 1 }); // recorded
    outcome = 'failed'; // an input the key cannot see now makes it fail
    const report = await go(1);
    expect(report).toMatchObject({ hits: 1, executed: 0 });
    expect(report.stale).toEqual(['src/a.test.ts']);
    expect(report.exitCode).not.toBe(0);
    // evicted: the next run executes it instead of trusting the stale pass
    outcome = 'passed';
    expect(await go(0)).toMatchObject({ hits: 0, executed: 1 });
  });
});

describe('runCached', () => {
  const files = ['src/a.test.ts', 'src/b.test.ts', 'src/c.test.ts'];
  const repo = {
    'src/lib/shared.ts': 'export const s = 1;\n',
    'src/lib/solo.ts': 'export const o = 1;\n',
    'src/a.test.ts': "import { s } from './lib/shared';\ntest('a', () => s);\n",
    'src/b.test.ts': "import { s } from './lib/shared';\ntest('b', () => s);\n",
    'src/c.test.ts': "import { o } from './lib/solo';\ntest('c', () => o);\n",
  };

  function setup() {
    const root = makeRepo(repo);
    const storeDir = path.join(root, '.cache');
    const calls: string[][] = [];
    const outcome = new Map<string, 'passed' | 'failed'>();
    // Jest can report every suite as passed and still exit non-zero (obsolete
    // snapshot under --ci, coverage threshold); `forceExit` simulates that.
    const knobs = { forceExit: null as number | null };
    const execute = async (run: string[]): Promise<Run> => {
      calls.push(run);
      const results = new Map<string, 'passed' | 'failed'>();
      for (const file of run) results.set(file, outcome.get(file) ?? 'passed');
      const failed = [...results.values()].includes('failed');
      return { exitCode: knobs.forceExit ?? (failed ? 1 : 0), results };
    };
    const go = (
      overrides: Partial<{
        mode: 'use' | 'record' | 'off';
        verifyHits: number;
        seed: string;
        keyer: { keyFor: (file: string) => Keyed };
      }> = {},
    ) =>
      lib.runCached({
        files,
        keyer:
          overrides.keyer ??
          lib.createKeyer({
            root,
            index: lib.buildFileIndex(root, '.cache/'),
            env: {},
          }),
        store: lib.createStore(storeDir),
        execute,
        mode: overrides.mode ?? 'use',
        verifyHits: overrides.verifyHits ?? 0,
        seed: overrides.seed ?? 's',
      });
    return { root, calls, outcome, knobs, go };
  }

  it('skips every file on a second identical run', async () => {
    const { calls, go } = setup();
    const first = await go();
    expect(first.hits).toBe(0);
    expect(calls).toEqual([files]);
    const second = await go();
    expect(second).toMatchObject({ hits: 3, executed: 0, exitCode: 0 });
    expect(calls).toHaveLength(1); // jest not invoked again
  });

  it('re-runs exactly the files whose inputs changed', async () => {
    const { root, calls, go } = setup();
    await go();
    write(root, { 'src/lib/shared.ts': 'export const s = 2;\n' });
    const report = await go();
    expect(report).toMatchObject({ hits: 1, executed: 2 });
    expect(calls[1].sort()).toEqual(['src/a.test.ts', 'src/b.test.ts']);
  });

  it('never records or skips a file that failed, and records nothing from a failing run', async () => {
    const { outcome, calls, go } = setup();
    outcome.set('src/b.test.ts', 'failed');
    const first = await go();
    expect(first.exitCode).toBe(1);
    outcome.delete('src/b.test.ts');
    // The failing run exited non-zero, so even its passing files were not
    // recorded (Jest cannot tell us which of them the non-zero exit concerns).
    const second = await go();
    expect(second).toMatchObject({ hits: 0, executed: 3, exitCode: 0 });
    expect(calls[1]).toEqual(files);
    // the clean run did record them
    expect(await go()).toMatchObject({ hits: 3, executed: 0 });
  });

  it('record mode runs everything even with hits, and keeps recording', async () => {
    const { calls, go } = setup();
    await go();
    const recorded = await go({ mode: 'record' });
    expect(recorded).toMatchObject({ hits: 0, executed: 3 });
    expect(calls).toHaveLength(2);
    expect(await go()).toMatchObject({ hits: 3, executed: 0 });
  });

  it('verify-hits re-runs a sample of hits and passes when they still pass', async () => {
    const { calls, go } = setup();
    await go();
    const report = await go({ verifyHits: 2 });
    expect(report.verified).toHaveLength(2);
    expect(report.stale).toEqual([]);
    expect(report.exitCode).toBe(0);
    expect(calls[1]).toEqual(report.verified); // sampled files really re-ran
  });

  it('verify-hits catches a planted wrong cached result and evicts it', async () => {
    const { outcome, go } = setup();
    await go(); // everything recorded as a pass
    // The inputs did not change, so the key still hits; but the file now fails
    // (a hidden input the key cannot see). Sampling must notice.
    outcome.set('src/c.test.ts', 'failed');
    const report = await go({ verifyHits: 3 });
    expect(report.stale).toContain('src/c.test.ts');
    expect(report.exitCode).not.toBe(0);
    // The verification run exited non-zero, so every sampled entry is evicted
    // (not only the failing file): the next run executes them all again.
    outcome.delete('src/c.test.ts');
    const next = await go();
    expect(next).toMatchObject({ hits: 0, executed: 3, exitCode: 0 });
  });

  it('records nothing from a run that exited non-zero, even if every suite reported passed', async () => {
    const { knobs, go, calls } = setup();
    knobs.forceExit = 1; // e.g. an obsolete snapshot under --ci
    const first = await go();
    expect(first.exitCode).toBe(1);
    knobs.forceExit = null;
    const second = await go();
    expect(second).toMatchObject({ hits: 0, executed: 3, exitCode: 0 });
    expect(calls).toHaveLength(2);
  });

  it('treats a verification run that exits non-zero as stale and evicts the sampled entries', async () => {
    const { knobs, go } = setup();
    await go(); // recorded
    knobs.forceExit = 1; // every suite "passes" but the run fails
    const report = await go({ verifyHits: 2 });
    expect(report.stale).toHaveLength(2);
    expect(report.exitCode).not.toBe(0);
    knobs.forceExit = null;
    const next = await go();
    expect(next).toMatchObject({ hits: 1, executed: 2 });
  });

  it("mode 'off' neither reads nor writes the cache", async () => {
    const { go } = setup();
    const off = await go({ mode: 'off' });
    expect(off).toMatchObject({ hits: 0, executed: 3, exitCode: 0 });
    // nothing was recorded: a 'use' run now executes everything
    expect(await go()).toMatchObject({ hits: 0, executed: 3 });
    // and 'off' ignores entries that exist
    expect(await go({ mode: 'off' })).toMatchObject({ hits: 0, executed: 3 });
  });

  it('fails open: a keying error means the file runs', async () => {
    const { go, calls } = setup();
    const exploding = {
      keyFor: (file: string): Keyed => {
        if (file === 'src/b.test.ts') throw new Error('boom');
        return { key: `k-${file}` };
      },
    };
    await go({ keyer: exploding });
    const report = await go({ keyer: exploding });
    expect(report.executed).toBe(1);
    expect(calls[1]).toEqual(['src/b.test.ts']);
  });

  it('runs unkeyable files every time', async () => {
    const { go, calls } = setup();
    const keyer = {
      keyFor: (file: string): Keyed =>
        file === 'src/a.test.ts'
          ? { unkeyable: 'reads process.env' }
          : { key: `k-${file}` },
    };
    await go({ keyer });
    await go({ keyer });
    expect(calls[1]).toEqual(['src/a.test.ts']);
  });
});

describe('cache mode and sampling', () => {
  it.each([
    [{ uncached: true, passthrough: [], env: {} }, 'record'],
    [{ uncached: false, passthrough: ['--coverage'], env: {} }, 'record'],
    [
      {
        uncached: false,
        passthrough: [],
        env: { GITHUB_EVENT_NAME: 'schedule' },
      },
      'record',
    ],
    [
      {
        uncached: false,
        passthrough: [],
        env: { GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/main' },
      },
      'record',
    ],
    [
      {
        uncached: false,
        passthrough: [],
        env: { GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/feature' },
      },
      'use',
    ],
    [
      {
        uncached: false,
        passthrough: ['--ci'],
        env: { GITHUB_EVENT_NAME: 'pull_request' },
      },
      'use',
    ],
    [
      {
        uncached: false,
        passthrough: ['--ci', '--maxWorkers=4'],
        env: { GITHUB_EVENT_NAME: 'pull_request' },
      },
      'use',
    ],
    // options that select extra inputs or change results: not cached at all
    [
      {
        uncached: false,
        passthrough: ['--setupFilesAfterEnv=./extra.js'],
        env: {},
      },
      'off',
    ],
    [{ uncached: false, passthrough: ['--testTimeout=1'], env: {} }, 'off'],
    [{ uncached: true, passthrough: ['--injectGlobals'], env: {} }, 'off'],
  ])('resolveMode %#', (input, expected) => {
    expect(lib.resolveMode(input)).toBe(expected);
  });

  it('samples deterministically per seed and differently across seeds', () => {
    const files = Array.from({ length: 30 }, (_, i) => `f${i}`);
    expect(lib.verifyOrder(files, 'run1:1')).toEqual(
      lib.verifyOrder(files, 'run1:1'),
    );
    expect(lib.verifyOrder(files, 'run1:1')).not.toEqual(
      lib.verifyOrder(files, 'run2:1'),
    );
    expect([...lib.verifyOrder(files, 'run1:1')].sort()).toEqual(
      [...files].sort(),
    );
  });
});

describe('result store', () => {
  it('returns null for a missing or corrupt entry and prunes by age', () => {
    const root = makeRepo({});
    const store = lib.createStore(path.join(root, 'store'));
    expect(store.get('ab12')).toBeNull();
    store.put('abcdef', { file: 'x' });
    expect(store.get('abcdef')).toMatchObject({ file: 'x', key: 'abcdef' });
    fs.writeFileSync(path.join(root, 'store', 'ab', 'abcdef.json'), '{corrupt');
    expect(store.get('abcdef')).toBeNull();
    store.put('abcdef', { file: 'x' });
    const old = new Date(Date.now() - 30 * 86400000);
    fs.utimesSync(path.join(root, 'store', 'ab', 'abcdef.json'), old, old);
    expect(store.prune(14)).toBe(1);
    expect(store.get('abcdef')).toBeNull();
  });
});
