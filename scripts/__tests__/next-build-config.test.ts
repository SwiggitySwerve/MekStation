import { spawnSync } from 'child_process';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../..');
// WSL config imports use tsx's nested esbuild, not hydration's root version.
const configTestEnv = {
  ...process.env,
  ESBUILD_BINARY_PATH:
    process.env.CONFIG_TEST_ESBUILD_BINARY_PATH ??
    process.env.ESBUILD_BINARY_PATH,
};

describe('production builder alias parity', () => {
  it.each([
    [false, false, false, true, false],
    [false, false, true, true, false],
    [true, false, false, true, false],
    [true, true, true, true, false],
    [true, false, true, false, false],
    [true, false, true, true, true],
  ])(
    'loads the analyzer only when used: dev=%s server=%s analyze=%s plugins=%s',
    (dev, server, analyze, plugins, expected) => {
      const result = spawnSync(
        process.execPath,
        [
          '--import',
          'tsx',
          '--input-type=module',
          '--eval',
          `
          import { createRequire } from 'node:module';
          const require = createRequire(process.cwd() + '/package.json');
          const loaded = (await import('./next.config.ts')).default;
          const configure = loaded.default ?? loaded;
          const dev = ${dev}, isServer = ${server};
          const config = configure(dev ? 'phase-development-server' : 'phase-production-build');
          const input = { ${plugins ? 'plugins: [],' : ''} resolve: { alias: {} } };
          const output = config.webpack(input, { dev, isServer, webpack: { ProgressPlugin: class {} } });
          console.log(JSON.stringify({
            analyzerLoaded: Object.keys(require.cache).some(file => file.replaceAll('\\\\', '/').includes('/webpack-bundle-analyzer/')),
            sameConfig: output === input,
            synchronous: typeof output.then !== 'function',
            analyzers: (output.plugins ?? []).filter(plugin => plugin.constructor.name === 'BundleAnalyzerPlugin').map(plugin => plugin.opts),
          }));
          `,
        ],
        {
          cwd: repoRoot,
          encoding: 'utf8',
          env: { ...configTestEnv, ANALYZE: String(analyze) },
        },
      );
      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      const output = JSON.parse(result.stdout);
      expect(output.analyzerLoaded).toBe(expected);
      expect(output.sameConfig).toBe(true);
      expect(output.synchronous).toBe(true);
      expect(output.analyzers).toEqual(
        expected
          ? [
              expect.objectContaining({
                analyzerMode: 'server',
                analyzerPort: 8888,
                openAnalyzer: false,
              }),
            ]
          : [],
      );
    },
  );

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
          const browser = config.webpack({ resolve: { alias: {} }, plugins: [], optimization: {}, module: { rules: [] } }, context);
          const server = config.webpack({ resolve: { alias: {} }, plugins: [] }, { ...context, isServer: true });
          console.log(JSON.stringify({
            turbo: config.turbopack.resolveAlias,
            browser: browser.resolve.alias,
            server: server.resolve.alias,
            output: config.output,
            tracingRoot: config.outputFileTracingRoot,
            skipTypes: config.typescript.ignoreBuildErrors,
            webpackSideEffects: browser.optimization.sideEffects,
            equipmentRules: browser.module.rules.map(rule => ({ test: rule.test.source, sideEffects: rule.sideEffects })),
            progressPlugins: browser.plugins.length,
            esmExternals: config.experimental.esmExternals,
          }));
        `,
        ],
        {
          cwd: repoRoot,
          encoding: 'utf8',
          env: {
            ...configTestEnv,
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
        webpackSideEffects?: boolean;
        equipmentRules: { test: string; sideEffects: boolean }[];
        progressPlugins: number;
        esmExternals: boolean;
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
      expect(config.skipTypes).toBe(true);
      const production = phase === 'phase-production-build';
      expect(config.webpackSideEffects).toBe(production ? false : undefined);
      expect(config.equipmentRules).toEqual(
        production
          ? [{ test: 'src\\/data\\/equipment.*\\.ts$', sideEffects: false }]
          : [],
      );
      expect(config.progressPlugins).toBe(production ? 1 : 0);
      expect(config.esmExternals).toBe(true);
    },
  );
});
