import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, '../next/copy-directory.mjs'),
).href;
const roots: string[] = [];
function fixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mek-copy-directory-'));
  roots.push(root);
  fs.mkdirSync(path.join(root, 'input/nested/empty'), { recursive: true });
  fs.writeFileSync(path.join(root, 'input/.hidden'), 'hidden');
  fs.writeFileSync(path.join(root, 'input/nested/unicode-λ.txt'), 'λ');
  fs.writeFileSync(path.join(root, 'input/run.sh'), '#!/bin/sh\nexit 0\n');
  fs.chmodSync(path.join(root, 'input/run.sh'), 0o755);
  fs.writeFileSync(
    path.join(root, 'input/readonly.bin'),
    Buffer.from([0, 255]),
  );
  fs.chmodSync(path.join(root, 'input/readonly.bin'), 0o444);
  return root;
}
function run(root: string, setup = '') {
  return spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import fs from 'node:fs'; import path from 'node:path';
       import { copyDirectory } from ${JSON.stringify(moduleUrl)};
       const root = ${JSON.stringify(root)};
       ${setup}
       fs.cpSync(path.join(root, 'input'), path.join(root, 'expected'), { recursive: true, force: true });
       await copyDirectory(path.join(root, 'input'), path.join(root, 'actual'));
       function snapshot(directory, relative = '', rows = []) {
         for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
           const file = path.join(directory, entry.name), name = path.posix.join(relative, entry.name);
           const stats = fs.lstatSync(file);
           if (stats.isSymbolicLink()) rows.push({ name, link: fs.readlinkSync(file) });
           else if (stats.isDirectory()) { rows.push({ name, directory: true, mode: stats.mode }); snapshot(file, name, rows); }
           else rows.push({ name, mode: stats.mode, data: fs.readFileSync(file).toString('hex') });
         }
         return rows;
       }
       console.log(JSON.stringify({ actual: snapshot(path.join(root, 'actual')), expected: snapshot(path.join(root, 'expected')) }));`,
    ],
    { cwd: root, encoding: 'utf8' },
  );
}
afterEach(() => {
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

describe('standalone complete directory copying', () => {
  it('bounds parallel file copying and drains in-flight work before rejecting', () => {
    const root = fixture();
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import fs from 'node:fs'; import path from 'node:path';
         import { copyDirectory } from ${JSON.stringify(moduleUrl)};
         const root = ${JSON.stringify(root)};
         const original = fs.promises.copyFile;
         let active = 0, peak = 0, error = null;
         fs.promises.copyFile = async (source, target) => {
           active++; peak = Math.max(peak, active);
           try {
             await new Promise(resolve => setTimeout(resolve, 10));
             if (path.basename(source) === '.hidden') throw new Error('fixture-copy-failure');
             await original(source, target);
           } finally { active--; }
         };
         try { await copyDirectory(path.join(root, 'input'), path.join(root, 'actual')); }
         catch (failure) { error = failure.message; }
         console.log(JSON.stringify({ active, peak, error }));`,
      ],
      { cwd: root, encoding: 'utf8' },
    );
    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.error).toBe('fixture-copy-failure');
    expect(output.active).toBe(0);
    expect(output.peak).toBeGreaterThan(1);
    expect(output.peak).toBeLessThanOrEqual(8);
  });

  it('refuses a target that has not been cleared by the hydration owner', () => {
    const root = fixture();
    fs.mkdirSync(path.join(root, 'actual'));
    fs.writeFileSync(path.join(root, 'actual/sentinel'), 'preserve');
    const result = run(root);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Directory copy target must be absent');
    expect(fs.readFileSync(path.join(root, 'actual/sentinel'), 'utf8')).toBe(
      'preserve',
    );
    expect(fs.readdirSync(path.join(root, 'actual'))).toEqual(['sentinel']);
  });

  it('preserves fresh-file permissions under a restrictive umask', () => {
    const root = fixture();
    const result = run(root, 'process.umask(0o077);');
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    const output = JSON.parse(result.stdout);
    expect(output.actual).toEqual(output.expected);
  });

  it('preserves bytes, modes, hidden files and empty directories like fs.cpSync', () => {
    const root = fixture();
    const result = run(root);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.actual).toEqual(output.expected);
  });

  it('preserves directory-link behavior like fs.cpSync', () => {
    const root = fixture();
    const result = run(
      root,
      `fs.symlinkSync(path.join(root, 'input/nested'), path.join(root, 'input/linked'), process.platform === 'win32' ? 'junction' : 'dir');`,
    );
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.actual).toEqual(output.expected);
  });

  (process.platform === 'win32' ? it.skip : it)(
    'preserves file links and permissions despite a restrictive umask',
    () => {
      const root = fixture();
      const result = run(
        root,
        `process.umask(0o077); fs.symlinkSync(path.join(root, 'input/run.sh'), path.join(root, 'input/linked-file'));`,
      );
      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      const output = JSON.parse(result.stdout);
      expect(output.actual).toEqual(output.expected);
    },
  );
});
