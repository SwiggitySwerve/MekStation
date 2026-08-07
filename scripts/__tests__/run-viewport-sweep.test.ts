import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.cwd();
const sweepUrl = pathToFileURL(
  path.join(repoRoot, 'scripts/qc/run-viewport-sweep.mjs'),
).href;
const contractUrl = pathToFileURL(
  path.join(repoRoot, 'scripts/qc/camp01-authority-receipt.contract.mjs'),
).href;
const environmentUrl = pathToFileURL(
  path.join(repoRoot, 'scripts/qc/camp01-proof-environment.mjs'),
).href;

const harness = `
import * as fs from 'node:fs';
const request=JSON.parse(fs.readFileSync(0,'utf8'));
try {
  const sweep=await import(${JSON.stringify(sweepUrl)}), contract=await import(${JSON.stringify(contractUrl)}), environment=await import(${JSON.stringify(environmentUrl)});
  if(request.action==='snapshot') {
    const logical=sweep.VIEWPORT_SWEEP_LOGICAL_COMMANDS, contractCommands=contract.WAVE_CONTRACTS['camp-01h'].commandSequence.slice(-3), expanded=sweep.expandedViewportSweepCommands();
    process.stdout.write(JSON.stringify({ok:true,value:{logical,contractCommands,logicalBytes:JSON.stringify(logical),contractBytes:JSON.stringify(contractCommands),expanded}}));
  } else if(request.action==='resolve-invalid') {
    environment.resolveVerifiedLogicalCommand(request.argv);
  } else {
    const calls=[], outcomes=request.outcomes;
    const exitCode=await sweep.runViewportSweep({listOnly:request.listOnly===true,runCommand:async(executable,args,options)=>{
      calls.push({executable,args,options}); const outcome=outcomes[calls.length-1];
      if(outcome?.error) throw new Error(outcome.error); return outcome;
    }});
    process.stdout.write(JSON.stringify({ok:true,value:{exitCode,calls}}));
  }
} catch(error) {
  process.stdout.write(JSON.stringify({ok:false,error:error instanceof Error?error.message:String(error),name:error instanceof Error?error.name:null}));
  process.exitCode=1;
}`;

type CommandCall = {
  readonly executable: string;
  readonly args: readonly string[];
  readonly options: {
    readonly cwd: string;
    readonly shell: boolean;
    readonly stdio: string;
  };
};
type HarnessResult = {
  readonly ok: boolean;
  readonly error?: string;
  readonly name?: string;
  readonly value?: {
    readonly logical?: readonly (readonly string[])[];
    readonly contractCommands?: readonly (readonly string[])[];
    readonly logicalBytes?: string;
    readonly contractBytes?: string;
    readonly expanded?: readonly (readonly string[])[];
    readonly exitCode?: number;
    readonly calls?: readonly CommandCall[];
  };
};

function invoke(request: Readonly<Record<string, unknown>>): HarnessResult {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', harness],
    { input: JSON.stringify(request), encoding: 'utf8' },
  );
  return result.stdout
    ? (JSON.parse(result.stdout) as HarnessResult)
    : { ok: false, error: result.stderr };
}

// prettier-ignore
const expectedLogicalCommands = [
  ['@node','scripts/playwright/run-playwright.mjs','test','--project=chromium','e2e/layout-sweep/screenInventory.guard.spec.ts','--workers=1'],
  ['@node','scripts/playwright/run-playwright.mjs','test','--project=chromium','e2e/layout-sweep/layout-helpers.selftest.spec.ts','--workers=1'],
  ['@node','scripts/playwright/run-playwright.mjs','test','--project=chromium','e2e/layout-sweep/viewport-layout-sweep.spec.ts','--workers=1'],
] as const;

// prettier-ignore
const camp01TestFiles = [
  'scripts/__tests__/camp01-authority-receipt-qc.test.ts',
  'scripts/__tests__/camp01-authority-receipt-validator.test.ts',
  'scripts/__tests__/camp01-authority-receipt-writer.test.ts',
  'scripts/__tests__/camp01-capture-transaction.test.ts',
  'scripts/__tests__/camp01-cleanup-authority.test.ts',
  'scripts/__tests__/camp01-durable-export.test.ts',
  'scripts/__tests__/camp01-durable-facts.test.ts',
  'scripts/__tests__/camp01-github-provenance.test.ts',
  'scripts/__tests__/camp01-git-trust.test.ts',
  'scripts/__tests__/camp01-h-report-normalizer.test.ts',
  'scripts/__tests__/camp01-playwright-normalizer.test.ts',
  'scripts/__tests__/camp01-proof-environment.test.ts',
  'scripts/__tests__/camp01-runner-isolation.test.ts',
  'scripts/__tests__/camp01-target-authority.test.ts',
  'scripts/__tests__/run-camp01-authority-receipt.test.ts',
  'scripts/__tests__/run-viewport-sweep.test.ts',
  'scripts/__tests__/ux-walkthrough-recorder-privacy.test.ts',
] as const;

describe('PROOF-4E viewport sweep orchestrator', () => {
  it('imports byte-equal logical commands from the final three CAMP-01H rows', () => {
    const result = invoke({ action: 'snapshot' });
    expect(result.ok).toBe(true);
    expect(result.value?.logical).toEqual(expectedLogicalCommands);
    expect(result.value?.logical).toEqual(result.value?.contractCommands);
    expect(result.value?.logicalBytes).toBe(result.value?.contractBytes);
  });

  it('expands every logical command through the verified Node executable', () => {
    const result = invoke({ action: 'snapshot' });
    expect(result.value?.expanded).toEqual(
      expectedLogicalCommands.map((command) => [
        process.execPath,
        ...command.slice(1),
      ]),
    );
  });

  it('spawns sequentially without a shell and stops at the first non-zero exit', () => {
    const result = invoke({
      action: 'run',
      outcomes: [
        { code: 0, signal: null },
        { code: 7, signal: null },
        { code: 0, signal: null },
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.value?.exitCode).toBe(7);
    expect(result.value?.calls).toHaveLength(2);
    expect(result.value?.calls?.map(({ args }) => args.at(-1))).toEqual([
      '--workers=1',
      '--workers=1',
    ]);
    expect(
      result.value?.calls?.map(({ executable, options }) => ({
        executable,
        options,
      })),
    ).toEqual([
      {
        executable: process.execPath,
        options: { cwd: repoRoot, shell: false, stdio: 'inherit' },
      },
      {
        executable: process.execPath,
        options: { cwd: repoRoot, shell: false, stdio: 'inherit' },
      },
    ]);
  });

  it('treats a signal exit as failure and does not run later commands', () => {
    const result = invoke({
      action: 'run',
      outcomes: [
        { code: null, signal: 'SIGTERM' },
        { code: 0, signal: null },
      ],
    });
    expect(result.value?.exitCode).toBe(1);
    expect(result.value?.calls).toHaveLength(1);
  });

  it('adds only the Playwright list flag for the bounded sweep gate', () => {
    const result = invoke({
      action: 'run',
      listOnly: true,
      outcomes: expectedLogicalCommands.map(() => ({ code: 0, signal: null })),
    });
    expect(result.value?.exitCode).toBe(0);
    expect(result.value?.calls?.map(({ args }) => args.at(-1))).toEqual([
      '--list',
      '--list',
      '--list',
    ]);
  });

  it('fails closed on unknown tokens and wraps spawn failures in a typed error', () => {
    expect(
      invoke({ action: 'resolve-invalid', argv: ['node', '--version'] }),
    ).toMatchObject({
      ok: false,
      error: 'CAMP01_ENVIRONMENT_INVALID: unsupported logical executable token',
      name: 'Camp01EnvironmentError',
    });
    expect(
      invoke({ action: 'run', outcomes: [{ error: 'spawn denied' }] }),
    ).toMatchObject({
      ok: false,
      error: 'CAMP01_VIEWPORT_SWEEP_FAILED: process spawn failed',
      name: 'Camp01ViewportSweepError',
    });
    expect(
      invoke({ action: 'run', outcomes: [{ code: null, signal: null }] }),
    ).toMatchObject({
      ok: false,
      error: 'CAMP01_VIEWPORT_SWEEP_FAILED: invalid process exit',
      name: 'Camp01ViewportSweepError',
    });
  });

  it('pins the package controller, writer, validator, test, and sweep surfaces', () => {
    const scripts = JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
    ).scripts as Record<string, string>;
    expect(scripts['qc:camp01-authority-receipt:controller']).toBe(
      'node scripts/qc/run-camp01-production.mjs',
    );
    expect(scripts['qc:camp01-authority-receipt:write']).toBe(
      'node scripts/qc/camp01-authority-receipt.mjs write',
    );
    expect(scripts['qc:camp01-authority-receipt:validate']).toBe(
      'node scripts/qc/validate-camp01-authority-receipt.mjs',
    );
    expect(scripts['qc:camp01-authority-receipt:test']).toBe(
      `jest --watchAll=false --runTestsByPath ${camp01TestFiles.join(' ')} --runInBand`,
    );
    expect(scripts['verify:qc:viewport-sweep']).toBe(
      'node scripts/qc/run-viewport-sweep.mjs',
    );
  });
});
