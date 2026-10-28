import { spawnSync } from 'child_process';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../..');

describe('production builder alias parity', () => {
  it.each([
    ['phase-development-server', 'false', false],
    ['phase-development-server', 'true', false],
    ['phase-production-build', 'false', true],
    ['phase-production-build', 'true', false],
  ])(
    'preserves harness opt-in for %s with E2E mode %s',
    (phase, e2e, excluded) => {
      const result = spawnSync(
        process.execPath,
        [
          '--import',
          'tsx',
          '--input-type=module',
          '--eval',
          `
          const loaded = (await import('./next.config.ts')).default;
          const configure = loaded.default ?? loaded;
          const phase = process.env.CONFIG_TEST_PHASE;
          const config = configure(phase);
          const context = {
            dev: phase === 'phase-development-server',
            isServer: false,
            webpack: { ProgressPlugin: class {} },
          };
          const browser = config.webpack({ resolve: { alias: {} }, plugins: [] }, context);
          const server = config.webpack({ resolve: { alias: {} }, plugins: [] }, { ...context, isServer: true });
          console.log(JSON.stringify({
            turbo: config.turbopack.resolveAlias,
            browser: browser.resolve.alias,
            server: server.resolve.alias,
            output: config.output,
            tracingRoot: config.outputFileTracingRoot,
            skipTypes: config.typescript.ignoreBuildErrors,
          }));
        `,
        ],
        {
          cwd: repoRoot,
          encoding: 'utf8',
          env: {
            ...process.env,
            CONFIG_TEST_PHASE: phase,
            NEXT_PUBLIC_E2E_MODE: e2e,
            MEKSTATION_SKIP_NEXT_TYPECHECK: 'false',
            ANALYZE: 'false',
          },
        },
      );
      expect(result.status).toBe(0);
      const config = JSON.parse(result.stdout) as {
        turbo: Record<string, string | { browser: string }>;
        browser: Record<string, string>;
        server: Record<string, string>;
        output: string;
        tracingRoot: string;
        skipTypes: boolean;
      };
      const harness = '@/testing/TacticalMapE2EHarness';
      const target = './src/testing/emptyTacticalMapE2EHarness.tsx';
      expect(config.turbo[harness]).toBe(excluded ? target : undefined);
      expect(config.browser[harness]).toBe(
        excluded ? path.resolve(repoRoot, target) : undefined,
      );
      expect(config.server[harness]).toBe(config.browser[harness]);
      for (const name of ['fs', 'path']) {
        expect(config.turbo[name]).toEqual({
          browser: './src/utils/construction/emptyModule.ts',
        });
        expect(config.browser[name]).toBe(
          path.resolve(repoRoot, 'src/utils/construction/emptyModule.ts'),
        );
        expect(config.server[name]).toBeUndefined();
      }
      expect(config.output).toBe('standalone');
      expect(config.tracingRoot).toBe(repoRoot);
      expect(config.skipTypes).toBe(false);
    },
  );
});
