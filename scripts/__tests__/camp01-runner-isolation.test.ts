import { spawnSync } from 'node:child_process';
import * as path from 'node:path';

import { invoke } from './support/camp01-runner-isolation.fixture';

describe('CAMP-01 runner isolation', () => {
  it.each([
    'scripts/playwright/run-playwright.mjs',
    'scripts/qc/run-ux-walkthrough.mjs',
  ])('wires fail-closed context admission into %s', (runner) => {
    const environment = { ...process.env };
    for (const key of [
      'CAMP01_RUN_ID',
      'CAMP01_ARTIFACT_DIR',
      'CAMP01_INVOCATION_ID',
      'CAMP01_EXECUTION_ID',
    ])
      delete environment[key];
    environment.CAMP01_RUN_ID = `camp01-${'1'.repeat(32)}`;
    const result = spawnSync(process.execPath, [path.resolve(runner)], {
      env: environment,
      encoding: 'utf8',
    });
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(
      /CAMP01_RUNNER_ISOLATION_INVALID: partial CAMP context/,
    );
  });

  it('is a provably inert no-op when all CAMP identities are absent', () => {
    expect(invoke({ action: 'absent' })).toEqual({
      ok: true,
      value: {
        active: false,
        runtimeRoot: null,
        paths: {},
        createdPaths: [],
        environment: {},
      },
    });
  });

  it('rejects caller-selected runtime routing without writer identities', () => {
    expect(
      invoke({
        action: 'absent',
        environment: { CAMP01_RUNTIME_LEASE: '8'.repeat(64) },
      }),
    ).toMatchObject({
      ok: false,
      error: 'CAMP01_RUNNER_ISOLATION_INVALID: caller-selected runtime context',
    });
  });

  it.each([
    ['partial', { omit: 'CAMP01_EXECUTION_ID' }],
    ['malformed run', { environment: { CAMP01_RUN_ID: 'camp01-caller' } }],
    [
      'malformed artifact binding',
      { environment: { CAMP01_ARTIFACT_DIR: '.' } },
    ],
    [
      'caller-selected invocation',
      { environment: { CAMP01_INVOCATION_ID: 'camp-01e-command-99' } },
    ],
    [
      'caller-selected execution',
      { environment: { CAMP01_EXECUTION_ID: `ev-${'9'.repeat(32)}` } },
    ],
  ])('fails closed with the typed error for %s context', (_name, request) => {
    expect(invoke(request)).toMatchObject({
      ok: false,
      name: 'Camp01RunnerIsolationError',
      error: expect.stringMatching(/^CAMP01_RUNNER_ISOLATION_INVALID:/),
    });
  });

  it('creates a fresh invocation-local directory set and routes every transient class below it', () => {
    const result = invoke(),
      value = result.value;
    expect(result.ok).toBe(true);
    expect(value?.active).toBe(true);
    expect(value?.createdPaths).toHaveLength(11);
    expect(Object.keys(value?.paths ?? {}).sort()).toEqual([
      'browserDownloads',
      'browserProfile',
      'browserStorage',
      'browserStorageState',
      'browserTemp',
      'databases',
      'next',
      'playwrightHtml',
      'playwrightResults',
      'playwrightSnapshots',
      'uxWalkthrough',
    ]);
    for (const routed of Object.values(value?.paths ?? {}))
      expect(
        path.resolve(routed).startsWith(`${value?.runtimeRoot}${path.sep}`),
      ).toBe(true);
    expect(value?.environment).toMatchObject({
      TEMP: value?.paths?.browserTemp,
      TMP: value?.paths?.browserTemp,
      TMPDIR: value?.paths?.browserTemp,
      CAMP01_PLAYWRIGHT_OUTPUT_DIR: value?.paths?.playwrightResults,
      CAMP01_PLAYWRIGHT_HTML_DIR: value?.paths?.playwrightHtml,
      CAMP01_PLAYWRIGHT_SNAPSHOT_DIR: value?.paths?.playwrightSnapshots,
      PLAYWRIGHT_HTML_OPEN: 'never',
      PLAYWRIGHT_HTML_OUTPUT_DIR: value?.paths?.playwrightHtml,
      CAMP01_DATABASE_DIR: value?.paths?.databases,
      CAMP01_UX_WALKTHROUGH_DIR: value?.paths?.uxWalkthrough,
      CAMP01_BROWSER_STORAGE_STATE: value?.paths?.browserStorageState,
    });
    expect(value?.environment?.MEKSTATION_NEXT_DIST_DIR).toMatch(
      /^\.sisyphus\/evidence\/playtest\//,
    );
  });

  // prettier-ignore
  it.each([['a wrong stage basename',{stageBasename:`.stage-camp01-${'9'.repeat(32)}`}],['a mislocated stage directory',{rogueParent:true}]])('rejects %s as not writer-bound', (_name, request) => {
    expect(invoke(request)).toMatchObject({ok:false,error:'CAMP01_RUNNER_ISOLATION_INVALID: artifact directory is not writer-bound'});
  });

  it('routes playwright.config outputs under CAMP and keeps legacy literals without', () => {
    // prettier-ignore
    const script="const loaded=(await import('./playwright.config.ts')).default,config=loaded.default??loaded;process.stdout.write('@@'+JSON.stringify({outputDir:config.outputDir,snapshotDir:config.snapshotDir,html:config.reporter[1][1].outputFolder,reporters:config.reporter.map(([name])=>name),metadata:config.metadata??null,storageState:config.use.storageState??null,dbPath:config.webServer.env.MULTIPLAYER_DB_PATH}));";
    // prettier-ignore
    const load = (extra: Record<string, string>) => {
      const environment={...process.env,...extra}; delete environment.CI;
      const result=spawnSync(process.execPath,['--import','tsx','--input-type=module','--eval',script],{cwd:path.resolve('.'),env:environment,encoding:'utf8'});
      expect(result.status).toBe(0); return JSON.parse(result.stdout.slice(result.stdout.indexOf('@@')+2));
    };
    // prettier-ignore
    expect(load({})).toEqual({outputDir:'test-results',snapshotDir:'.sisyphus/evidence/screenshots',html:'playwright-report',reporters:['list','html'],metadata:null,storageState:null,dbPath:expect.stringContaining('.sisyphus/e2e-runtime/')});
    // prettier-ignore
    expect(load({CAMP01_RUNTIME_LEASE:'8'.repeat(64),CAMP01_RUN_ID:`camp01-${'1'.repeat(32)}`,CAMP01_ARTIFACT_DIR:'routed-artifacts',CAMP01_INVOCATION_ID:'proof-02-command-browser',CAMP01_EXECUTION_ID:`ev-${'2'.repeat(32)}`,CAMP01_PLAYWRIGHT_OUTPUT_DIR:'routed-results',CAMP01_PLAYWRIGHT_HTML_DIR:'routed-html',CAMP01_PLAYWRIGHT_SNAPSHOT_DIR:'routed-snaps',CAMP01_DATABASE_DIR:'routed-db',CAMP01_BROWSER_STORAGE_STATE:'routed-state.json',PLAYWRIGHT_JSON_OUTPUT_DIR:'routed-json',PLAYWRIGHT_JSON_OUTPUT_NAME:'playwright-report.json'})).toEqual({outputDir:'routed-results',snapshotDir:'routed-snaps',html:'routed-html',reporters:['list','html','json'],metadata:{camp01:{artifactDir:'routed-artifacts',executionId:`ev-${'2'.repeat(32)}`,invocationId:'proof-02-command-browser',runId:`camp01-${'1'.repeat(32)}`}},storageState:'routed-state.json',dbPath:'routed-db/multiplayer-matches.db'});
  });

  it('rejects a CAMP Next output directory outside the repository root', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        '--input-type=module',
        '--eval',
        "await import('./next.config.ts')",
      ],
      {
        cwd: path.resolve('.'),
        env: {
          ...process.env,
          CAMP01_RUNTIME_LEASE: '8'.repeat(64),
          MEKSTATION_NEXT_DIST_DIR: '..',
        },
        encoding: 'utf8',
      },
    );
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(
      /Next output directory escaped the repository root/,
    );
  });

  it('rejects a pre-existing invocation runtime without removing its content', () => {
    expect(invoke({ precreate: true })).toMatchObject({
      ok: false,
      error:
        'CAMP01_RUNNER_ISOLATION_INVALID: invocation runtime already exists',
      runtimeExists: true,
    });
  });

  it('lets a nested launcher adopt the exact lease without taking cleanup ownership', () => {
    const result = invoke({ action: 'adopt' });
    expect(result).toMatchObject({
      ok: true,
      value: { runtimeExists: false },
    });
    expect(result.value?.calls?.slice(0, 2)).toEqual([
      'nested-normalize',
      'nested-runtime:true',
    ]);
    expect(result.value?.calls).toHaveLength(13);
  });

  it('normalizes before removing exactly the creation-time runtime records', () => {
    const result = invoke({ action: 'finish' });
    expect(result).toMatchObject({
      ok: true,
      value: { runtimeExists: false, sentinelExists: true },
    });
    expect(result.value?.calls?.[0]).toBe('normalize');
    expect(result.value?.calls?.slice(1)).toHaveLength(11);
  });

  it('rejects cleanup path re-resolution outside the runtime and preserves both roots', () => {
    expect(invoke({ action: 'outside' })).toMatchObject({
      ok: false,
      error:
        'CAMP01_RUNNER_ISOLATION_INVALID: cleanup path escaped invocation runtime',
      calls: [],
      runtimeExists: true,
      outsideExists: true,
    });
  });

  it('removes no sibling under the playtest artifact parent', () => {
    const result = invoke({ action: 'cleanup' });
    expect(result).toMatchObject({
      ok: true,
      value: { runtimeExists: false, sentinelExists: true },
    });
    expect(result.value?.calls).toHaveLength(11);
    expect(result.value?.calls).not.toContain('cleanup:.sisyphus');
    expect(result.value?.calls).not.toContain('cleanup:playtest');
  });
});
