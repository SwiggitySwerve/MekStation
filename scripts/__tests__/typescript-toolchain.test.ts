import * as fs from 'node:fs';
import * as path from 'node:path';

const root = path.resolve(__dirname, '../..');
const read = (file: string): string =>
  fs.readFileSync(path.join(root, file), 'utf8');
const manifest = (): {
  scripts: Record<string, string>;
  'lint-staged': Record<string, string[]>;
} => JSON.parse(read('package.json'));
const compiler = 'node node_modules/typescript7/bin/tsc';

describe('TypeScript compiler gates', () => {
  it('installs TypeScript 7 for the explicit compiler entry point', () => {
    expect(
      JSON.parse(read('node_modules/typescript7/package.json')).version,
    ).toMatch(/^7\./);
  });

  it('checks both root and scripts projects with the explicit compiler', () => {
    expect(manifest().scripts.typecheck).toBe(
      `${compiler} --noEmit --skipLibCheck && ${compiler} -p scripts/tsconfig.json --noEmit`,
    );
  });

  it('routes root gates without the ambiguous TypeScript 6 binary', () => {
    const pkg = manifest();
    const workflow = read('.github/workflows/pr-checks.yml');
    const typeCheckJob = workflow.match(
      /\n  typecheck:\r?\n[\s\S]*?(?=\n  [\w-]+:)/,
    )?.[0];
    const typeCheck = typeCheckJob?.match(
      /- name: Run type check\r?\n(?:\s+if:[^\r\n]+\r?\n)?\s+run: ([^\r\n]+)/,
    );
    expect(typeCheck).toBeTruthy();
    expect(typeCheck?.[1]).toBe('npm run typecheck');
    expect(pkg['lint-staged']['*.{ts,tsx}'].at(-1)).toBe(
      "bash -c 'npm run typecheck'",
    );
    const roadmap = read('scripts/qc/roadmap-main-proof.mjs');
    expect(roadmap).toContain(
      "argv: ['node', 'node_modules/typescript7/bin/tsc', '--noEmit']",
    );
    const metrics = read('scripts/metrics/validate-refactoring-metrics.js');
    expect(metrics).toContain("execSync('npm run typecheck'");
    for (const gate of [
      pkg.scripts.typecheck,
      ...Object.values(pkg['lint-staged']).flat(),
      typeCheck?.[1] ?? '',
      ...Array.from(
        roadmap.matchAll(/argv:\s*(\[[^\]]+\])/g),
        (match) => match[1],
      ),
      metrics,
    ]) {
      expect(gate).not.toMatch(
        /(?:^|[\s;&'"`])(?:npx\s+)?tsc\b|node_modules[/\\]typescript[/\\]bin[/\\]tsc/,
      );
    }
  });

  it('keeps the desktop compiler unaliased on TypeScript 7', () => {
    const desktop = JSON.parse(read('desktop/package.json'));
    expect(desktop.devDependencies.typescript).toMatch(/^\^7\./);
    expect(desktop.devDependencies.typescript).not.toContain('npm:');
  });
});
