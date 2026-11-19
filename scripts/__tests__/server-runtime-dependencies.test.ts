import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '..', '..');

// The packages server.js and the raw-TS graph it loads through tsx import at
// runtime, discovered by the same collector the standalone hydrate uses.
function runtimePackageNames(): string[] {
  const moduleUrl = new URL(
    `file:///${path.join(repoRoot, 'scripts/next/runtime-packages.mjs').replace(/\\/g, '/')}`,
  ).href;
  const script = [
    `const m = await import(${JSON.stringify(moduleUrl)});`,
    `const requests = await m.discoverRuntimeRequests(${JSON.stringify(repoRoot)}, m.runtimeLoaders);`,
    'console.log(JSON.stringify(requests));',
  ].join('\n');
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', script],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  if (result.status !== 0) throw new Error(result.stderr);
  const requests = JSON.parse(result.stdout) as string[];
  return [
    ...new Set(
      requests.map((request) =>
        request.startsWith('@')
          ? request.split('/').slice(0, 2).join('/')
          : request.split('/')[0],
      ),
    ),
  ].sort();
}

describe('server runtime dependencies', () => {
  it('declares every package the production server loads in dependencies', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
    ) as { dependencies?: Record<string, string> };
    const names = runtimePackageNames();
    expect(names).toEqual(expect.arrayContaining(['tsx', 'ws']));
    const notInDependencies = names.filter(
      (name) => !Object.hasOwn(manifest.dependencies ?? {}, name),
    );
    // An install that omits devDependencies must still run `node server.js`.
    expect(notInDependencies).toEqual([]);
  });
});
