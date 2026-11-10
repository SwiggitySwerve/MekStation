import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { checkPackageMetrics, installerMetrics } from './budget-artifacts.mjs';
import { loadBudgets, serializeBudgets } from './budget-config.mjs';

const source = process.cwd();
test('former package byte breaches remain exact advisory measurements', () => {
  for (const metrics of [
    { standaloneStaticBytes: 400_000_001, webZipBytes: 100_000_001 },
    { kind: 'installers', installerBytes: 200_000_001 },
  ]) {
    const observation = {
      schema: 'mekstation/ci-package-metrics/v1',
      unit: 'bytes',
      files: [{ path: 'complete-output', bytes: 400_000_001 }],
      ...metrics,
    };
    const result = checkPackageMetrics(observation);
    assert.deepEqual(result.violations, []);
    assert.deepEqual(result.metrics, observation);
  }
});

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
    for (const file of ['budget_files.py', 'budget-installer.py'])
      write(`scripts/ci/${file}`, fs.readFileSync(`scripts/ci/${file}`));
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

test('Linux installer must include every unpacked member and identical public bytes', () =>
  fixture((root, write) => {
    const unpacked = path.join(root, 'desktop/release/linux-unpacked');
    write(
      'desktop/release/linux-unpacked/resources/next-standalone/server.js',
      'server',
    );
    write(
      'desktop/release/linux-unpacked/resources/next-standalone/public/record-sheets/sheet.svg',
      'sheet',
    );
    write('desktop/release/linux-unpacked/MekStation', 'complete runtime');
    write('desktop/release-upload/MekStation.tar.gz', 'placeholder');
    const archive = path.join(root, 'desktop/release-upload/MekStation.tar.gz');
    const create = () => {
      const result = spawnSync(
        'python',
        [
          '-B',
          '-c',
          'import sys,tarfile;t=tarfile.open(sys.argv[1],"w:gz");t.add(sys.argv[2],arcname="MekStation");t.close()',
          archive,
          unpacked,
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
      assert.equal(result.status, 0);
    };
    create();
    const complete = run(root, ['--kind', 'installers', '--report', 'r.json']);
    assert.equal(complete.status, 0, complete.stderr);
    assert.equal(
      JSON.parse(complete.stdout).installers[0].symlinks.escapingCount,
      0,
    );
    write(
      'desktop/release/linux-unpacked/MekStation',
      'omitted changed runtime',
    );
    assert.equal(
      run(root, ['--kind', 'installers', '--report', 'r.json']).status,
      1,
    );
    create();
    write(
      'desktop/release/linux-unpacked/resources/next-standalone/public/record-sheets/sheet.svg',
      'wrong public',
    );
    create();
    assert.equal(
      run(root, ['--kind', 'installers', '--report', 'r.json']).status,
      1,
    );
  }));

test('real web CLI reports complete hidden artifact bytes without configured size caps', () =>
  fixture((root) => {
    let result = run(root, ['--kind', 'web', '--report', 'report.json']);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(fs.readFileSync(path.join(root, 'report.json')));
    assert.ok(
      report.metrics.files.some(
        (f) => f.path === '.next/standalone/.next/BUILD_ID',
      ),
    );
    assert.equal(report.metrics.standaloneStaticBytes, 22); // server+build+static+public sheet
    fs.unlinkSync(path.join(root, 'config/ci/budgets.json'));
    result = run(root, ['--kind', 'web', '--report', 'report.json']);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(root, 'report.json'))).violations,
      [],
    );
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
    fs.writeFileSync(path.join(root, 'web-build.zip'), 'not a zip');
    const verify = spawnSync(
      'python',
      [
        '-B',
        path.join(source, 'scripts/ci/budget-package.py'),
        '--root',
        root,
        '--archive',
        path.join(root, 'web-build.zip'),
        '--report',
        path.join(root, 'verify.json'),
        '--verify-existing',
      ],
      { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    assert.notEqual(verify.status, 0);
  }));

test('web census distinguishes present and dangling npm links and rejects real escapes', (context) =>
  fixture((root, write) => {
    const relative = '.next/standalone/node_modules/.bin/x';
    const link = path.join(root, relative);
    const target = '../pkg/bin/x.js';
    write('.next/standalone/node_modules/pkg/bin/x.js', 'semver runtime');
    fs.mkdirSync(path.dirname(link), { recursive: true });
    try {
      fs.symlinkSync(target, link, 'file');
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EPERM') throw error;
      context.skip(
        'Windows account lacks file-symlink privilege; Linux Static Checks must run the real-link contract',
      );
      return;
    }
    const result = run(root, ['--kind', 'web', '--report', 'r.json']);
    assert.equal(result.status, 0, result.stderr);
    const { metrics } = JSON.parse(fs.readFileSync(path.join(root, 'r.json')));
    assert.deepEqual(metrics.symlinks.paths, [relative]);
    assert.equal(metrics.symlinks.count, 1);
    assert.equal(metrics.symlinks.danglingCount, 0);
    assert.equal(metrics.symlinks.escapingCount, 0);
    assert.equal(
      metrics.files.find((entry) => entry.path === relative).targetStatus,
      'present',
    );
    assert.equal(
      metrics.files.find((entry) => entry.path === relative).bytes,
      Buffer.byteLength(target),
    );
    assert.equal(
      metrics.standaloneStaticBytes,
      22 + Buffer.byteLength('semver runtime') + Buffer.byteLength(target),
    );
    fs.unlinkSync(
      path.join(root, '.next/standalone/node_modules/pkg/bin/x.js'),
    );
    const missing = run(root, ['--kind', 'web', '--report', 'missing.json']);
    assert.equal(missing.status, 0, missing.stderr);
    const dangling = JSON.parse(
      fs.readFileSync(path.join(root, 'missing.json')),
    ).metrics;
    assert.deepEqual(dangling.symlinks.danglingPaths, [relative]);
    assert.equal(dangling.symlinks.danglingCount, 1);
    assert.equal(dangling.symlinks.escapingCount, 0);
    assert.equal(
      dangling.files.find((entry) => entry.path === relative).target,
      target,
    );
    assert.equal(
      dangling.files.find((entry) => entry.path === relative).targetStatus,
      'dangling-in-root',
    );
    fs.unlinkSync(link);
    write('outside.js', 'outside artifact root');
    fs.symlinkSync(path.join(root, 'outside.js'), link, 'file');
    const escaping = run(root, ['--kind', 'web', '--report', 'r.json']);
    assert.equal(escaping.status, 1);
    assert.match(escaping.stderr, /Escaping artifact link/);
    assert.match(escaping.stderr, /target=.*outside\.js/);
    assert.match(escaping.stderr, /resolved=.*outside\.js/);
    assert.match(escaping.stderr, /artifactRoot=/);
    fs.unlinkSync(path.join(root, 'outside.js'));
    assert.equal(run(root, ['--kind', 'web', '--report', 'r.json']).status, 1);
  }));

test('web measurement keeps both its report and exact ZIP beside the requested external output', () =>
  fixture((root) => {
    const output = fs.mkdtempSync(path.join(os.tmpdir(), 'budget-external-'));
    try {
      const report = path.join(output, 'web.json');
      const result = run(root, ['--kind', 'web', '--report', report]);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(
        JSON.parse(fs.readFileSync(report)).metrics.archive.path,
        path.join(output, 'web-build.zip'),
      );
      assert.ok(fs.existsSync(path.join(output, 'web-build.zip')));
      assert.ok(!fs.existsSync(path.join(root, 'budget-output')));
      assert.ok(!fs.existsSync(path.join(root, 'web-build.zip')));
    } finally {
      fs.rmSync(output, { recursive: true, force: true });
    }
  }));

test('installer CLI counts every installer, rejects missing inventory and cannot accept subsets', () =>
  fixture((root, write) => {
    assert.equal(
      run(root, ['--kind', 'installers', '--report', 'r.json']).status,
      1,
    );
    write('desktop/release-upload/MekStation.exe', 'small');
    write('desktop/release-upload/MekStation-portable.exe', 'larger installer');
    const result = run(root, ['--kind', 'installers', '--report', 'r.json']);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(fs.readFileSync(path.join(root, 'r.json')));
    assert.equal(
      report.metrics.installerBytes,
      Buffer.byteLength('larger installer'),
    );
    assert.deepEqual(report.violations, []);
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
      checkPackageMetrics({
        schema: 'unknown',
        unit: 'bytes',
        files: [],
      }),
    );
  }));
