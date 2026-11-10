import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import {
  PACKAGE_METRICS_SCHEMA,
  packageMetricValues,
} from './budget-config.mjs';

export function checkPackageMetrics(metrics) {
  if (
    metrics?.schema !== PACKAGE_METRICS_SCHEMA ||
    metrics.unit !== 'bytes' ||
    !Array.isArray(metrics.files) ||
    !metrics.files.length
  )
    throw new Error('Package census missing/unknown');
  packageMetricValues(metrics);
  return { metrics, violations: [] };
}

export function installerMetrics(root) {
  const directory = path.join(root, 'desktop/release-upload');
  const files = fs.readdirSync(directory).map((name) => {
    const stat = fs.lstatSync(path.join(directory, name));
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size <= 0)
      throw new Error(`Invalid installer output: ${name}`);
    if (
      !/\.(exe|msi|dmg|zip|AppImage|deb|rpm|tar\.gz|yml|blockmap)$/.test(name)
    )
      throw new Error(`Unknown installer member: ${name}`);
    const verification = name.endsWith('.tar.gz')
      ? JSON.parse(
          execFileSync(
            'python',
            [
              '-B',
              'scripts/ci/budget-installer.py',
              path.join(directory, name),
              path.join(root, 'desktop/release/linux-unpacked'),
              path.join(root, 'public'),
            ],
            {
              cwd: root,
              encoding: 'utf8',
              stdio: ['ignore', 'pipe', 'pipe'],
              timeout: 180000,
              windowsHide: true,
            },
          ),
        )
      : null;
    return {
      path: `desktop/release-upload/${name}`,
      bytes: stat.size,
      verification,
      sha256: createHash('sha256')
        .update(fs.readFileSync(path.join(directory, name)))
        .digest('hex'),
      installer: !/\.(yml|blockmap)$/.test(name),
    };
  });
  const installers = files.filter((f) => f.installer);
  if (!installers.length) throw new Error('Installer inventory missing');
  return {
    schema: PACKAGE_METRICS_SCHEMA,
    kind: 'installers',
    unit: 'bytes',
    installerBytes: Math.max(...installers.map((f) => f.bytes)),
    files,
  };
}

export function run(argv, root = process.cwd()) {
  const { values } = parseArgs({
    args: argv,
    options: { kind: { type: 'string' }, report: { type: 'string' } },
    strict: true,
    allowPositionals: false,
  });
  if (!['web', 'installers'].includes(values.kind) || !values.report)
    throw new Error('Required: --kind web|installers --report <file>');
  const report = path.resolve(root, values.report);
  let metrics;
  if (values.kind === 'web') {
    execFileSync(
      'python',
      [
        '-B',
        'scripts/ci/budget-package.py',
        '--root',
        root,
        '--archive',
        path.join(path.dirname(report), 'web-build.zip'),
        '--report',
        report,
      ],
      {
        cwd: root,
        stdio: ['ignore', 'inherit', 'inherit'],
        timeout: 180000,
        windowsHide: true,
      },
    );
    metrics = {
      ...JSON.parse(fs.readFileSync(report, 'utf8')),
      schema: PACKAGE_METRICS_SCHEMA,
    };
  } else metrics = installerMetrics(root);
  const result = checkPackageMetrics(metrics);
  fs.mkdirSync(path.dirname(report), { recursive: true });
  fs.writeFileSync(report, `${JSON.stringify(result, null, 2)}\n`);
  if (metrics.kind === 'installers')
    console.log(
      JSON.stringify({
        unit: metrics.unit,
        installerBytes: metrics.installerBytes,
        installers: metrics.files
          .filter((file) => file.installer)
          .map((file) => ({
            path: file.path,
            bytes: file.bytes,
            symlinks: file.verification?.symlinks ?? null,
          })),
      }),
    );
  for (const violation of result.violations)
    console.error(`${violation.code}: ${violation.message}`);
  return result.violations.length ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = run(process.argv.slice(2));
  } catch (error) {
    console.error(`Package inputs rejected: ${error.message}`);
    process.exitCode = 1;
  }
}
