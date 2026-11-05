/* eslint-disable @typescript-eslint/no-require-imports */
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

const ROOT = path.resolve(__dirname, '..', '..');
const list = require('../../config/jest/no-jest-dom-tests.json') as string[];

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
