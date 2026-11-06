import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { checkPackageMetrics, installerMetrics } from './budget-artifacts.mjs';
import { loadBudgets, serializeBudgets } from './budget-config.mjs';

const source = process.cwd();
function fixture(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'budget-package-'));
  const write = (file, contents) => {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  };
  try {
    write('config/ci/budgets.json', serializeBudgets(loadBudgets()));
    write(
      'scripts/ci/budget-package.py',
      fs.readFileSync('scripts/ci/budget-package.py'),
    );
    write('.next/standalone/server.js', 'server');
    write('.next/standalone/.next/BUILD_ID', 'build');
    write('.next/static/hidden.js', 'static');
    write('desktop/dist/electron/main.js', 'desktop');
    write('public/record-sheets/sheet.svg', 'sheet');
    write('.next/standalone/public/record-sheets/sheet.svg', 'sheet');
    return fn(root, write);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
function run(root, args = []) {
  return spawnSync(
    process.execPath,
    [path.join(source, 'scripts/ci/budget-artifacts.mjs'), ...args],
    {
      cwd: root,
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
}

test('real web CLI counts complete hidden artifact and proves standalone and ZIP red paths', () =>
  fixture((root, write) => {
    let result = run(root, ['--kind', 'web', '--report', 'report.json']);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(fs.readFileSync(path.join(root, 'report.json')));
    assert.ok(
      report.metrics.files.some(
        (f) => f.path === '.next/standalone/.next/BUILD_ID',
      ),
    );
    assert.equal(report.metrics.standaloneStaticBytes, 22); // server+build+static+public sheet
    for (const cap of ['standaloneStaticBytes', 'webZipBytes']) {
      const config = loadBudgets();
      config.limits[cap] = 1;
      write('config/ci/budgets.json', serializeBudgets(config));
      result = run(root, ['--kind', 'web', '--report', 'report.json']);
      assert.equal(result.status, 1);
      assert.match(result.stderr, new RegExp(cap));
    }
  }));

test('web boundary rejects missing/unknown inputs, omitted hidden output and mismatched public bytes', () =>
  fixture((root, write) => {
    assert.equal(
      run(root, ['--kind', 'unknown', '--report', 'r.json']).status,
      1,
    );
    assert.equal(
      run(root, ['--kind', 'web', '--report', 'r.json', '--omit', '.next'])
        .status,
      1,
    );
    fs.unlinkSync(path.join(root, '.next/standalone/.next/BUILD_ID'));
    assert.equal(run(root, ['--kind', 'web', '--report', 'r.json']).status, 1);
    write('.next/standalone/.next/BUILD_ID', 'build');
    write('.next/standalone/public/record-sheets/sheet.svg', 'wrong');
    assert.equal(run(root, ['--kind', 'web', '--report', 'r.json']).status, 1);
  }));

test('existing ZIP omission/tampering cannot count as the same complete artifact', () =>
  fixture((root) => {
    const result = run(root, ['--kind', 'web', '--report', 'r.json']);
    assert.equal(result.status, 0, result.stderr);
    fs.writeFileSync(
      path.join(root, 'budget-output/web-build.zip'),
      'not a zip',
    );
    const verify = spawnSync(
      'python',
      [
        '-B',
        path.join(source, 'scripts/ci/budget-package.py'),
        '--root',
        root,
        '--archive',
        path.join(root, 'budget-output/web-build.zip'),
        '--report',
        path.join(root, 'verify.json'),
        '--verify-existing',
      ],
      { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    assert.notEqual(verify.status, 0);
  }));

test('installer CLI counts every installer, rejects missing inventory and cannot accept subsets', () =>
  fixture((root, write) => {
    assert.equal(
      run(root, ['--kind', 'installers', '--report', 'r.json']).status,
      1,
    );
    write('desktop/release-upload/MekStation.exe', 'small');
    write('desktop/release-upload/MekStation-portable.exe', 'larger installer');
    const config = loadBudgets();
    config.limits.installerBytes = 10;
    write('config/ci/budgets.json', serializeBudgets(config));
    const result = run(root, ['--kind', 'installers', '--report', 'r.json']);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /installerBytes/);
    assert.equal(installerMetrics(root).files.length, 2);
    assert.equal(
      run(root, [
        '--kind',
        'installers',
        '--report',
        'r.json',
        '--file',
        'MekStation.exe',
      ]).status,
      1,
    );
    assert.throws(() =>
      checkPackageMetrics(config, {
        schema: 'unknown',
        unit: 'bytes',
        files: [],
      }),
    );
  }));
