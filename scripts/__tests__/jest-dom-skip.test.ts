/* eslint-disable @typescript-eslint/no-require-imports */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const skip = require('../../config/jest/jest-dom-skip.js') as {
  JEST_DOM_MATCHERS: string[];
  jestDomStubs: (testPath: string) => Record<string, () => never>;
  relativeTestPath: (testPath: unknown) => string | null;
  setUpJestDom: (
    expectApi: { extend: (matchers: object) => void },
    testPath: string,
    load: () => void,
  ) => void;
  skipsJestDom: (testPath: string) => boolean;
};
const usage = require('../jest/jest-dom-usage.js') as {
  classify: (root: string) => { free: string[]; needs: Map<string, string> };
};

const cache = require('../jest/cached-tests.js') as {
  buildFileIndex: (root: string) => Map<string, string>;
  createKeyer: (opts: {
    root: string;
    index: Map<string, string>;
    env: Record<string, string>;
  }) => { keyFor: (file: string) => { repoWide?: boolean; why?: string[] } };
};

const ROOT = path.resolve(__dirname, '..', '..');
const list = require('../../config/jest/no-jest-dom-tests.json') as string[];

describe('the shared setup closure and the result cache', () => {
  // Every test file's closure includes jest.setup.js and what it imports. A dynamic
  // `require(<expression>)` anywhere in it makes the keyer key every test file on the
  // WHOLE repo, so no PR with any edit ever hits the cache (this happened once).
  it('keys narrowly: nothing in the setup closure forces a repo-wide key', () => {
    const keyed = cache
      .createKeyer({ root: ROOT, index: cache.buildFileIndex(ROOT), env: {} })
      .keyFor('jest.setup.js');
    expect({ repoWide: keyed.repoWide, why: keyed.why }).toEqual({
      repoWide: false,
      why: [],
    });
  });
});

describe('jest-dom skip list', () => {
  it('stubs every matcher the installed @testing-library/jest-dom registers', () => {
    const registered = Object.keys(
      require('@testing-library/jest-dom/matchers'),
    );
    expect(registered.length).toBeGreaterThan(20);
    expect(
      registered.filter((m) => !skip.JEST_DOM_MATCHERS.includes(m)),
    ).toEqual([]);
  });

  it('is sorted, unique, and names only existing unit-project test files', () => {
    expect(list.length).toBeGreaterThan(1000);
    expect(list).toEqual([...new Set(list)].sort());
    const bad = list.filter(
      (file) =>
        !/\.(?:test|spec)\.(?:js|ts|tsx)$/.test(file) ||
        /\.a11y\.test\./.test(file) ||
        !/^(?:src|scripts|openspec)\//.test(file) ||
        !fs.existsSync(path.join(ROOT, file)),
    );
    expect(bad).toEqual([]);
  });
});

describe('skipsJestDom / setUpJestDom', () => {
  const listed = list[0];

  it('matches a listed file by its repo-relative path, however the OS writes it', () => {
    expect(skip.skipsJestDom(path.join(ROOT, ...listed.split('/')))).toBe(true);
  });

  it('loads jest-dom for a file that is not listed, is outside the repo, or is not a path', () => {
    expect(
      skip.skipsJestDom(path.join(ROOT, 'src', 'not-listed.test.ts')),
    ).toBe(false);
    expect(skip.skipsJestDom(path.join(os.tmpdir(), listed))).toBe(false);
    expect(skip.relativeTestPath(undefined)).toBeNull();
    expect(skip.relativeTestPath(ROOT)).toBeNull();
  });

  it('extends expect with throwing stubs for a listed file and does not load jest-dom', () => {
    const extended: Record<string, () => never>[] = [];
    const load = jest.fn();
    skip.setUpJestDom(
      { extend: (m) => extended.push(m as Record<string, () => never>) },
      path.join(ROOT, ...listed.split('/')),
      load,
    );
    expect(load).not.toHaveBeenCalled();
    expect(Object.keys(extended[0])).toEqual(skip.JEST_DOM_MATCHERS);
    expect(() => extended[0].toBeInTheDocument()).toThrow(
      /toBeInTheDocument is a @testing-library\/jest-dom matcher.*no-jest-dom-tests\.json/,
    );
  });

  it('still installs window.CSS.escape (jest-dom pulls the css.escape polyfill) for a listed file', () => {
    // user-event calls window.CSS.escape for radio-group keyboard navigation.
    const css = (window as unknown as { CSS: { escape?: unknown } }).CSS;
    const original = css.escape;
    delete css.escape;
    try {
      jest.isolateModules(() => {
        skip.setUpJestDom(
          { extend: jest.fn() },
          path.join(ROOT, ...listed.split('/')),
          jest.fn(),
        );
      });
      expect(typeof css.escape).toBe('function');
    } finally {
      css.escape = original;
    }
  });

  it('loads jest-dom, and extends nothing, for any other file', () => {
    const extend = jest.fn();
    const load = jest.fn();
    skip.setUpJestDom(
      { extend },
      path.join(ROOT, 'src', 'not-listed.test.ts'),
      load,
    );
    expect(load).toHaveBeenCalledTimes(1);
    expect(extend).not.toHaveBeenCalled();
  });
});

describe('classify (which test files need jest-dom)', () => {
  const make = (files: Record<string, string>) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jest-dom-usage-'));
    for (const [rel, text] of Object.entries(files)) {
      const abs = path.join(root, ...rel.split('/'));
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, text);
    }
    return root;
  };

  it('keeps jest-dom for a matcher named in the test, in a helper, or imported directly, and frees the rest', () => {
    const root = make({
      'jest.setup.js': "import '@testing-library/jest-dom';\n",
      'src/helpers/render.ts':
        'export const check = (el: unknown) => expect(el).toBeVisible();\n',
      'src/helpers/plain.ts': 'export const double = (n: number) => n * 2;\n',
      'src/a.test.ts': "it('a', () => { expect(1).toBe(1); });\n",
      'src/b.test.ts':
        "it('b', () => { expect(document.body).not.toBeInTheDocument(); });\n",
      'src/c.test.ts':
        "import { check } from './helpers/render';\nit('c', () => check(null));\n",
      'src/d.test.ts':
        "import { double } from './helpers/plain';\nit('d', () => expect(double(2)).toBe(4));\n",
      'src/e.test.tsx':
        "import '@testing-library/jest-dom';\nit('e', () => {});\n",
      'src/f.a11y.test.tsx': "it('f', () => {});\n",
    });
    const { free, needs } = usage.classify(root);
    expect(free).toEqual(['src/a.test.ts', 'src/d.test.ts']);
    expect([...needs.keys()].sort()).toEqual([
      'src/b.test.ts',
      'src/c.test.ts',
      'src/e.test.tsx',
    ]);
    expect(needs.get('src/c.test.ts')).toBe('src/helpers/render.ts');
  });

  it('treats a matcher that appears only in a comment-free string or name as a use (conservative)', () => {
    const root = make({
      'jest.setup.js': '',
      'src/g.test.ts':
        "it('g', () => { const toHaveClass = 1; expect(toHaveClass).toBe(1); });\n",
    });
    const { free, needs } = usage.classify(root);
    expect(free).toEqual([]);
    expect([...needs.keys()]).toEqual(['src/g.test.ts']);
  });
});

describe('jest-dom usage --check', () => {
  let root: string;
  let listFile: string;

  const write = (relative: string, text: string) => {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  };
  const check = (listed: string[]) => {
    const original = JSON.stringify(listed);
    fs.writeFileSync(listFile, original);
    const result = spawnSync(
      process.execPath,
      [
        '-e',
        'process.exitCode = require(process.argv[1]).run(["--check"], process.argv[2]);',
        path.join(ROOT, 'scripts/jest/jest-dom-usage.js'),
        root,
      ],
      { cwd: root, encoding: 'utf8' },
    );
    expect(result.error).toBeUndefined();
    expect(fs.readFileSync(listFile, 'utf8')).toBe(original);
    return result;
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'jest-dom-check-'));
    listFile = path.join(root, 'config/jest/no-jest-dom-tests.json');
    write('jest.setup.js', "import '@testing-library/jest-dom';\n");
    write('config/jest/no-jest-dom-tests.json', '[]');
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('fails and names a deleted listed file', () => {
    write('src/deleted.test.ts', 'expect(1).toBe(1);');
    fs.unlinkSync(path.join(root, 'src/deleted.test.ts'));
    const result = check(['src/deleted.test.ts']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'src/deleted.test.ts: file no longer exists',
    );
  });

  it.each([
    'src/renamed.ts',
    'src/access.a11y.test.tsx',
    'e2e/browser.test.ts',
  ])(
    'fails when a listed file is no longer a unit-project test: %s',
    (file) => {
      write(file, 'expect(1).toBe(1);');
      const result = check([file]);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`${file}: not a unit-project test file`);
    },
  );

  it('fails when a listed test gains a matcher through its import closure', () => {
    write('src/plain.test.ts', "import './helper';");
    write('src/helper.ts', 'expect(1).toBe(1);');
    expect(check(['src/plain.test.ts']).status).toBe(0);
    write('src/helper.ts', 'expect(document.body).toBeVisible();');
    const result = check(['src/plain.test.ts']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'src/plain.test.ts: needs jest-dom (src/helper.ts)',
    );
  });

  it('reports every unsafe listed entry', () => {
    write('src/matcher.test.ts', 'expect(document.body).toBeVisible();');
    const result = check(['src/deleted.test.ts', 'src/matcher.test.ts']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'src/deleted.test.ts: file no longer exists',
    );
    expect(result.stderr).toContain('src/matcher.test.ts: needs jest-dom');
  });

  it('succeeds with an advisory for an unlisted free test', () => {
    write('src/plain.test.ts', 'expect(1).toBe(1);');
    const result = check([]);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout.trim()).toBe(
      '1 unlisted test files could skip jest-dom (run --write)',
    );
  });

  it('succeeds with count zero for a clean list', () => {
    write('src/plain.test.ts', 'expect(1).toBe(1);');
    write('src/matcher.test.ts', 'expect(document.body).toBeVisible();');
    const result = check(['src/plain.test.ts']);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout.trim()).toBe(
      '0 unlisted test files could skip jest-dom (run --write)',
    );
  });
});
